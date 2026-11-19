-- A la Pelotita · Desafíos con amigos (por turnos): 1 contra 1 o 2 contra 2.
-- Cada jugador juega un solo turno en su celular cuando puede, antes del cierre; gana el equipo que suma más.
-- Termina cuando jugaron todos o al llegar el cierre. Se juega con amigos (invitación), abierto a cualquiera o con un código.
-- Pegar todo en Supabase → SQL Editor → Run. Se puede volver a ejecutar sin romper nada.
-- Necesita supabase/schema.sql (profiles y follows).

create table if not exists duels (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  created_by uuid not null references auth.users on delete cascade,
  host_name text not null,
  size int not null check (size in (2, 4)),                       -- 2 = 1 contra 1 · 4 = 2 contra 2
  game text not null check (game in ('peloteo', 'read', 'lights')),
  is_open boolean not null default false,                         -- abierto a cualquiera
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);
create table if not exists duel_players (
  duel_id uuid not null references duels on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  team int not null check (team in (1, 2)),
  best int,                                                       -- mejor marca (vacío = todavía no jugó)
  plays int not null default 0,
  last_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key (duel_id, user_id)
);
create table if not exists duel_invites (
  duel_id uuid not null references duels on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  invited_by uuid not null references auth.users on delete cascade,
  team int not null check (team in (1, 2)),
  created_at timestamptz not null default now(),
  primary key (duel_id, user_id)
);
create index if not exists duels_open on duels (is_open, ends_at);
alter table duels enable row level security;
alter table duel_players enable row level security;
alter table duel_invites enable row level security;
-- Sin políticas: nadie lee ni escribe directo. Todo pasa por las funciones de abajo.
revoke all on duels, duel_players, duel_invites from anon, authenticated;

drop function if exists duel_list_mine();
drop function if exists duel_list_open();

-- Detalle de un desafío (por id o por código): equipos, marcas, si terminó y quién ganó
create or replace function duel_view(d duels) returns json
language plpgsql stable security definer set search_path = public as $$
declare t1 int; t2 int; done boolean := now() >= d.ends_at; isfull boolean; allp boolean;
begin
  select coalesce(sum(best) filter (where team = 1), 0), coalesce(sum(best) filter (where team = 2), 0),
         count(*) = d.size, count(*) = d.size and bool_and(best is not null)
    into t1, t2, isfull, allp from duel_players where duel_id = d.id;
  done := done or coalesce(allp, false);
  return json_build_object(
    'id', d.id, 'code', d.code, 'host', d.host_name, 'size', d.size, 'game', d.game, 'is_open', d.is_open,
    'ends_at', d.ends_at, 'created_at', d.created_at, 'mine', d.created_by = auth.uid(),
    'full', coalesce(isfull, false), 'done', done, 'total1', t1, 'total2', t2,
    'winner', case when done and t1 > t2 then 1 when done and t2 > t1 then 2 when done then 0 end,
    'players', coalesce((select json_agg(json_build_object('user_id', p.user_id, 'name', p.name, 'team', p.team, 'best', p.best, 'plays', p.plays,
       'me', p.user_id = auth.uid()) order by p.team, p.joined_at) from duel_players p where p.duel_id = d.id), '[]'::json),
    'invited', coalesce((select json_agg(json_build_object('user_id', i.user_id, 'team', i.team, 'name', coalesce(pr.name, 'Jugador')))
       from duel_invites i left join profiles pr on pr.id = i.user_id
       where i.duel_id = d.id and not exists (select 1 from duel_players x where x.duel_id = d.id and x.user_id = i.user_id)), '[]'::json),
    'my_team', (select team from duel_players where duel_id = d.id and user_id = auth.uid()),
    'my_invite', (select team from duel_invites where duel_id = d.id and user_id = auth.uid()));
end $$;

create or replace function duel_detail(p_ref text) returns json
language plpgsql stable security definer set search_path = public as $$
declare d duels;
begin
  if auth.uid() is null then raise exception 'Entrá con tu cuenta para ver el desafío.'; end if;
  select * into d from duels where code = upper(trim(p_ref)) or id::text = p_ref limit 1;
  if not found then raise exception 'No encontramos ese desafío. Revisá el código.'; end if;
  return duel_view(d);
end $$;

-- Crear: el creador queda en el equipo 1. Dura entre 1 hora y 7 días.
create or replace function duel_create(p_size int, p_game text, p_open boolean, p_hours int) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare d duels; nm text; c text; abc constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if auth.uid() is null then raise exception 'Entrá con tu cuenta para crear un desafío.'; end if;
  if p_size not in (2, 4) then raise exception 'Elegí 1 contra 1 o 2 contra 2.'; end if;
  if p_game not in ('peloteo', 'read', 'lights') then raise exception 'Elegí un juego.'; end if;
  if p_hours is null or p_hours < 1 or p_hours > 168 then raise exception 'La duración tiene que ser de 1 hora a 7 días.'; end if;
  if (select count(*) from duels where created_by = auth.uid() and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Creaste muchos desafíos seguidos. Esperá un rato.'; end if;
  select coalesce(name, 'Jugador') into nm from profiles where id = auth.uid();
  loop
    c := ''; for i in 1..6 loop c := c || substr(abc, 1 + get_byte(gen_random_bytes(1), 0) % 32, 1); end loop;
    exit when not exists (select 1 from duels where code = c);
  end loop;
  insert into duels (code, created_by, host_name, size, game, is_open, ends_at)
  values (c, auth.uid(), coalesce(nm, 'Jugador'), p_size, p_game, coalesce(p_open, false), now() + make_interval(hours => p_hours)) returning * into d;
  insert into duel_players (duel_id, user_id, name, team) values (d.id, auth.uid(), coalesce(nm, 'Jugador'), 1);
  return duel_view(d);
end $$;

-- Sumarse (con el código, una invitación o porque está abierto). p_team = equipo elegido (o el de la invitación).
create or replace function duel_join(p_ref text, p_team int) returns json
language plpgsql security definer set search_path = public as $$
declare d duels; nm text; tm int; inv int; per int;
begin
  if auth.uid() is null then raise exception 'Entrá con tu cuenta para sumarte.'; end if;
  select * into d from duels where code = upper(trim(p_ref)) or id::text = p_ref limit 1 for update;
  if not found then raise exception 'No encontramos ese desafío. Revisá el código.'; end if;
  if now() >= d.ends_at then raise exception 'Ese desafío ya terminó.'; end if;
  if exists (select 1 from duel_players where duel_id = d.id and user_id = auth.uid()) then return duel_view(d); end if;
  per := d.size / 2;
  select team into inv from duel_invites where duel_id = d.id and user_id = auth.uid();
  tm := coalesce(inv, p_team);
  if tm is null or tm not in (1, 2) or (select count(*) from duel_players where duel_id = d.id and team = tm) >= per then
    -- Si el equipo pedido está lleno, va al que tenga lugar
    select x.t into tm from (values (1), (2)) as x(t)
     where (select count(*) from duel_players where duel_id = d.id and team = x.t) < per order by x.t limit 1;
  end if;
  if tm is null then raise exception 'El desafío ya está completo.'; end if;
  select coalesce(name, 'Jugador') into nm from profiles where id = auth.uid();
  insert into duel_players (duel_id, user_id, name, team) values (d.id, auth.uid(), coalesce(nm, 'Jugador'), tm);
  delete from duel_invites where duel_id = d.id and user_id = auth.uid();
  return duel_view(d);
end $$;

-- Invitar a alguien (solo quien ya juega en el desafío) a un equipo con lugar
create or replace function duel_invite(p_duel uuid, p_user uuid, p_team int) returns void
language plpgsql security definer set search_path = public as $$
declare d duels;
begin
  select * into d from duels where id = p_duel;
  if not found then raise exception 'No encontramos ese desafío.'; end if;
  if not exists (select 1 from duel_players where duel_id = p_duel and user_id = auth.uid()) then raise exception 'Para invitar tenés que estar en el desafío.'; end if;
  if now() >= d.ends_at then raise exception 'Ese desafío ya terminó.'; end if;
  if p_team not in (1, 2) then raise exception 'Equipo inválido.'; end if;
  if exists (select 1 from duel_players where duel_id = p_duel and user_id = p_user) then return; end if;
  if (select count(*) from duel_players where duel_id = p_duel and team = p_team) + (select count(*) from duel_invites where duel_id = p_duel and team = p_team) >= d.size / 2 then
    raise exception 'Ese equipo ya está completo.'; end if;
  insert into duel_invites (duel_id, user_id, invited_by, team) values (p_duel, p_user, auth.uid(), p_team)
    on conflict (duel_id, user_id) do update set team = excluded.team, invited_by = excluded.invited_by;
end $$;

-- Rechazar una invitación (el invitado) o cancelarla (quien invitó)
create or replace function duel_uninvite(p_duel uuid, p_user uuid) returns void
language sql security definer set search_path = public as $$
  delete from duel_invites where duel_id = p_duel and user_id = coalesce(p_user, auth.uid())
    and (user_id = auth.uid() or invited_by = auth.uid());
$$;

-- Guardar el turno: cada jugador tiene un solo turno. Termina cuando jugaron todos o al cierre.
create or replace function duel_submit(p_duel uuid, p_score int) returns json
language plpgsql security definer set search_path = public as $$
declare d duels; p duel_players;
begin
  select * into d from duels where id = p_duel;
  if not found then raise exception 'No encontramos ese desafío.'; end if;
  if now() >= d.ends_at then raise exception 'Ese desafío ya terminó.'; end if;
  if p_score is null or p_score < 0 or p_score > 5000000 then raise exception 'Puntaje fuera de rango.'; end if;
  select * into p from duel_players where duel_id = p_duel and user_id = auth.uid() for update;
  if not found then raise exception 'No estás en este desafío.'; end if;
  if p.best is not null then raise exception 'Ya jugaste tu turno en este desafío.'; end if;
  update duel_players set best = p_score, plays = plays + 1, last_at = now()
   where duel_id = p_duel and user_id = auth.uid() returning * into p;
  return json_build_object('best', p.best, 'duel', duel_view(d));
end $$;

-- Mis desafíos (donde juego o me invitaron), de los últimos 14 días
create or replace function duel_list_mine() returns setof json
language sql stable security definer set search_path = public as $$
  select duel_view(d) from duels d
   where d.ends_at > now() - interval '14 days'
     and (exists (select 1 from duel_players p where p.duel_id = d.id and p.user_id = auth.uid())
       or exists (select 1 from duel_invites i where i.duel_id = d.id and i.user_id = auth.uid()))
   order by d.ends_at > now() desc, d.created_at desc limit 40;
$$;

-- Desafíos abiertos a cualquiera, con lugar y sin terminar
create or replace function duel_list_open() returns setof json
language sql stable security definer set search_path = public as $$
  select duel_view(d) from duels d
   where auth.uid() is not null and d.is_open and d.ends_at > now()
     and (select count(*) from duel_players p where p.duel_id = d.id) < d.size
     and not exists (select 1 from duel_players p where p.duel_id = d.id and p.user_id = auth.uid())
   order by d.created_at desc limit 30;
$$;

revoke all on function duel_view(duels) from public, anon, authenticated;
revoke all on function duel_detail(text), duel_create(int, text, boolean, int), duel_join(text, int), duel_invite(uuid, uuid, int),
  duel_uninvite(uuid, uuid), duel_submit(uuid, int), duel_list_mine(), duel_list_open() from public, anon;
grant execute on function duel_detail(text), duel_create(int, text, boolean, int), duel_join(text, int), duel_invite(uuid, uuid, int),
  duel_uninvite(uuid, uuid), duel_submit(uuid, int), duel_list_mine(), duel_list_open() to authenticated;
