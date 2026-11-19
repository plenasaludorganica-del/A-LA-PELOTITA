-- A la Pelotita · Partido EN VIVO: 1 contra 1 o 2 contra 2, todos al mismo tiempo, cada uno desde su celular.
-- Cómo se sincroniza: solo viajan los GOLPES (desde dónde, hacia dónde y en qué momento). Cada celular calcula la pelota
-- con la misma física, así todos la ven igual. Las posiciones de los jugadores se mandan varias veces por segundo.
-- El "anfitrión" (el primer jugador conectado) decide los puntos y mueve a los jugadores de la máquina si faltan personas.
-- Se puede jugar con o sin cuenta (pid = número anónimo del navegador). Pegar todo en el SQL Editor → Run (idempotente).

create table if not exists live_rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  size int not null check (size in (2, 4)),
  is_open boolean not null default true,              -- partida rápida con cualquiera (false = sala con código para amigos)
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'done')),
  rally int not null default 0,                       -- número del último golpe (evita golpes duplicados)
  score1 int not null default 0, score2 int not null default 0, to_win int not null default 5,
  created_by text not null,
  created_at timestamptz not null default now(), started_at timestamptz, updated_at timestamptz not null default now()
);
create table if not exists live_players (
  room_id uuid not null references live_rooms on delete cascade,
  slot int not null check (slot between 0 and 3),     -- 2 jugadores: 0 = equipo 1, 1 = equipo 2 · 4 jugadores: 0-1 equipo 1, 2-3 equipo 2
  pid text not null check (pid ~ '^[a-z0-9]{8,32}$'),
  user_id uuid references auth.users on delete set null,
  name text not null,
  is_bot boolean not null default false,
  x real not null default 0, z real not null default 0,
  last_seen timestamptz not null default now(),
  primary key (room_id, slot)
);
create unique index if not exists live_players_pid on live_players (room_id, pid);
create table if not exists live_events (
  id bigserial primary key,
  room_id uuid not null references live_rooms on delete cascade,
  kind text not null, payload jsonb not null default '{}',
  created_at timestamptz not null default clock_timestamp()
);
create index if not exists live_events_room on live_events (room_id, id);
create index if not exists live_rooms_open on live_rooms (status, is_open, size, created_at);
alter table live_rooms enable row level security;
alter table live_players enable row level security;
alter table live_events enable row level security;
revoke all on live_rooms, live_players, live_events from anon, authenticated;

drop function if exists live_view(uuid, bigint);

create or replace function live_team(p_size int, p_slot int) returns int language sql immutable as $$
  select case when p_size = 2 then p_slot + 1 else case when p_slot < 2 then 1 else 2 end end;
$$;

-- Anfitrión: el jugador humano de menor número que siga conectado
create or replace function live_host(p_room uuid) returns int language sql stable security definer set search_path = public as $$
  select slot from live_players where room_id = p_room and not is_bot and last_seen > now() - interval '6 seconds' order by slot limit 1;
$$;

-- Estado de la sala para el celular: jugadores, eventos nuevos y la hora del servidor (para sincronizar relojes)
create or replace function live_view(p_room uuid, p_since bigint) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'now', extract(epoch from clock_timestamp()) * 1000,
    'room', (select json_build_object('id', r.id, 'code', r.code, 'size', r.size, 'is_open', r.is_open, 'status', r.status, 'rally', r.rally,
        'score1', r.score1, 'score2', r.score2, 'to_win', r.to_win, 'host', live_host(r.id)) from live_rooms r where r.id = p_room),
    'players', coalesce((select json_agg(json_build_object('slot', p.slot, 'name', p.name, 'bot', p.is_bot, 'x', p.x, 'z', p.z, 'pid_me', false,
        'online', p.is_bot or p.last_seen > now() - interval '6 seconds') order by p.slot) from live_players p where p.room_id = p_room), '[]'::json),
    'events', coalesce((select json_agg(json_build_object('id', e.id, 'kind', e.kind, 'p', e.payload, 'at', extract(epoch from e.created_at) * 1000) order by e.id)
        from live_events e where e.room_id = p_room and e.id > coalesce(p_since, 0)), '[]'::json));
$$;

create or replace function live_code() returns text language plpgsql volatile set search_path = public, extensions as $$
declare c text; abc constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  loop
    c := ''; for i in 1..5 loop c := c || substr(abc, 1 + get_byte(gen_random_bytes(1), 0) % 32, 1); end loop;
    exit when not exists (select 1 from live_rooms where code = c);
  end loop;
  return c;
end $$;

-- Sentarse en el primer lugar libre de una sala
create or replace function live_sit(p_room uuid, p_pid text, p_name text) returns int
language plpgsql security definer set search_path = public as $$
declare r live_rooms; s int; nm text := left(coalesce(nullif(trim(p_name), ''), 'Jugador'), 24);
begin
  select * into r from live_rooms where id = p_room for update;
  select slot into s from live_players where room_id = p_room and pid = p_pid;
  if s is not null then update live_players set last_seen = now(), name = nm where room_id = p_room and slot = s; return s; end if;
  if r.status <> 'lobby' then raise exception 'Ese partido ya empezó.'; end if;
  -- Libera lugares de los que se fueron del lobby
  delete from live_players where room_id = p_room and not is_bot and last_seen < now() - interval '12 seconds';
  -- Orden 0, 2, 1, 3: las dos primeras personas quedan en equipos distintos (juegan una contra la otra)
  select g into s from unnest(case when r.size = 4 then array[0, 2, 1, 3] else array[0, 1] end) with ordinality as o(g, k)
   where not exists (select 1 from live_players p where p.room_id = p_room and p.slot = o.g) order by o.k limit 1;
  if s is null then raise exception 'La sala está completa.'; end if;
  insert into live_players (room_id, slot, pid, user_id, name, x, z) values (p_room, s, p_pid, auth.uid(), nm, 0, case when live_team(r.size, s) = 1 then 7 else -7 end);
  update live_rooms set updated_at = now() where id = p_room;
  return s;
end $$;

-- Crear sala (con amigos: privada con código · rápida: abierta a cualquiera)
create or replace function live_create(p_pid text, p_name text, p_size int, p_open boolean) returns json
language plpgsql security definer set search_path = public as $$
declare rid uuid; s int;
begin
  if p_pid is null or p_pid !~ '^[a-z0-9]{8,32}$' then raise exception 'Datos inválidos.'; end if;
  if p_size not in (2, 4) then raise exception 'Elegí 1 contra 1 o 2 contra 2.'; end if;
  if (select count(*) from live_rooms where created_by = p_pid and created_at > now() - interval '1 hour') >= 30 then raise exception 'Creaste muchas salas seguidas. Esperá un rato.'; end if;
  delete from live_rooms where updated_at < now() - interval '1 day';
  insert into live_rooms (code, size, is_open, created_by) values (live_code(), p_size, coalesce(p_open, true), p_pid) returning id into rid;
  s := live_sit(rid, p_pid, p_name);
  return json_build_object('room', rid, 'slot', s);
end $$;

-- Jugar ahora con cualquiera: entra a una sala abierta esperando jugadores, o crea una
create or replace function live_quick(p_pid text, p_name text, p_size int) returns json
language plpgsql security definer set search_path = public as $$
declare rid uuid;
begin
  if p_pid is null or p_pid !~ '^[a-z0-9]{8,32}$' then raise exception 'Datos inválidos.'; end if;
  select r.id into rid from live_rooms r
   where r.status = 'lobby' and r.is_open and r.size = p_size and r.updated_at > now() - interval '20 seconds'
     and (select count(*) from live_players p where p.room_id = r.id and (p.is_bot or p.last_seen > now() - interval '12 seconds')) < r.size
     and not exists (select 1 from live_players p where p.room_id = r.id and p.pid = p_pid)
   order by r.created_at limit 1;
  if rid is null then return live_create(p_pid, p_name, p_size, true); end if;
  return json_build_object('room', rid, 'slot', live_sit(rid, p_pid, p_name));
end $$;

-- Entrar con el código que te pasaron
create or replace function live_join(p_pid text, p_name text, p_code text) returns json
language plpgsql security definer set search_path = public as $$
declare rid uuid;
begin
  if p_pid is null or p_pid !~ '^[a-z0-9]{8,32}$' then raise exception 'Datos inválidos.'; end if;
  select id into rid from live_rooms where code = upper(trim(p_code)) and updated_at > now() - interval '1 day';
  if rid is null then raise exception 'No encontramos esa sala. Revisá el código.'; end if;
  return json_build_object('room', rid, 'slot', live_sit(rid, p_pid, p_name));
end $$;

-- Latido: mando mi posición (y la de los jugadores de la máquina si soy el anfitrión) y recibo lo nuevo
create or replace function live_tick(p_room uuid, p_pid text, p_pos jsonb, p_since bigint) returns json
language plpgsql security definer set search_path = public as $$
declare me int; host int; k text; v jsonb;
begin
  select slot into me from live_players where room_id = p_room and pid = p_pid;
  if me is null then raise exception 'No estás en esta sala.'; end if;
  update live_players set last_seen = now() where room_id = p_room and slot = me;
  host := live_host(p_room);
  if p_pos is not null and jsonb_typeof(p_pos) = 'object' then
    for k, v in select * from jsonb_each(p_pos) loop
      if k ~ '^[0-3]$' and jsonb_typeof(v) = 'array' and (k::int = me or (host = me and exists (select 1 from live_players where room_id = p_room and slot = k::int and is_bot))) then
        update live_players set x = greatest(-6, least(6, (v->>0)::real)), z = greatest(-11, least(11, (v->>1)::real)) where room_id = p_room and slot = k::int;
      end if;
    end loop;
  end if;
  update live_rooms set updated_at = now() where id = p_room and updated_at < now() - interval '5 seconds';
  return live_view(p_room, p_since);
end $$;

-- Eventos del partido: empezar, golpe (con número de golpe para que no haya dos a la vez), punto y salir
create or replace function live_event(p_room uuid, p_pid text, p_kind text, p_payload jsonb) returns json
language plpgsql security definer set search_path = public as $$
declare r live_rooms; me int; host int; n int; by_slot int; w int; s1 int; s2 int; t int; nm text;
begin
  select slot into me from live_players where room_id = p_room and pid = p_pid;
  if me is null then raise exception 'No estás en esta sala.'; end if;
  select * into r from live_rooms where id = p_room for update;
  host := live_host(p_room);
  if p_kind = 'start' then
    if me <> host then raise exception 'Solo el anfitrión empieza el partido.'; end if;
    if r.status <> 'lobby' then return live_view(p_room, null); end if;
    delete from live_players where room_id = p_room and not is_bot and last_seen < now() - interval '12 seconds';
    for t in 0 .. r.size - 1 loop
      if not exists (select 1 from live_players where room_id = p_room and slot = t) then
        nm := (array['Máquina Lupe', 'Máquina Tito', 'Máquina Coco', 'Máquina Rulo'])[t + 1];
        insert into live_players (room_id, slot, pid, name, is_bot, x, z) values (p_room, t, 'bot' || t || substr(md5(p_room::text), 1, 8), nm, true, 0, case when live_team(r.size, t) = 1 then 7 else -7 end);
      end if;
    end loop;
    update live_rooms set status = 'playing', started_at = now(), rally = 0, score1 = 0, score2 = 0, updated_at = now() where id = p_room;
    insert into live_events (room_id, kind, payload) values (p_room, 'start', '{}'::jsonb);
  elsif p_kind = 'hit' then
    if r.status <> 'playing' then return live_view(p_room, null); end if;
    n := (p_payload->>'n')::int; by_slot := (p_payload->>'by')::int;
    if n is null or n <> r.rally + 1 then return live_view(p_room, null); end if;          -- golpe viejo o repetido: se ignora
    if not (by_slot = me or (me = host and (coalesce((p_payload->>'serve')::boolean, false) or exists (select 1 from live_players where room_id = p_room and slot = by_slot and is_bot)))) then
      raise exception 'Golpe no permitido.'; end if;
    update live_rooms set rally = n, updated_at = now() where id = p_room;
    insert into live_events (room_id, kind, payload) values (p_room, 'hit', p_payload);
  elsif p_kind = 'point' then
    if me <> host or r.status <> 'playing' then return live_view(p_room, null); end if;
    if (p_payload->>'n')::int is distinct from r.rally then return live_view(p_room, null); end if;  -- el punto es del golpe actual
    w := (p_payload->>'winner')::int; if w not in (1, 2) then raise exception 'Punto inválido.'; end if;
    s1 := r.score1 + case when w = 1 then 1 else 0 end; s2 := r.score2 + case when w = 2 then 1 else 0 end;
    update live_rooms set score1 = s1, score2 = s2, rally = r.rally + 1, status = case when greatest(s1, s2) >= r.to_win then 'done' else 'playing' end, updated_at = now() where id = p_room;
    insert into live_events (room_id, kind, payload) values (p_room, 'point', p_payload || jsonb_build_object('s1', s1, 's2', s2, 'n', r.rally + 1, 'done', greatest(s1, s2) >= r.to_win));
  elsif p_kind = 'leave' then
    update live_players set last_seen = now() - interval '1 minute' where room_id = p_room and slot = me;
    if r.status = 'lobby' then delete from live_players where room_id = p_room and slot = me; end if;
    insert into live_events (room_id, kind, payload) values (p_room, 'leave', jsonb_build_object('slot', me));
  else
    raise exception 'Evento desconocido.';
  end if;
  return live_view(p_room, null);
end $$;

revoke all on function live_team(int, int), live_host(uuid), live_view(uuid, bigint), live_code(), live_sit(uuid, text, text) from public, anon, authenticated;
revoke all on function live_create(text, text, int, boolean), live_quick(text, text, int), live_join(text, text, text), live_tick(uuid, text, jsonb, bigint), live_event(uuid, text, text, jsonb) from public;
grant execute on function live_create(text, text, int, boolean), live_quick(text, text, int), live_join(text, text, text), live_tick(uuid, text, jsonb, bigint), live_event(uuid, text, text, jsonb) to anon, authenticated;
