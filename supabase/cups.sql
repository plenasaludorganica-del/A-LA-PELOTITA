-- A la Pelotita · Copa de la Cancha
-- Pegar TODO en Supabase → SQL Editor → Run. Se puede volver a ejecutar sin romper nada (idempotente).
-- Necesita que antes esté cargado supabase/schema.sql (usa la tabla profiles para el nombre del jugador).
--
-- Seguridad: ninguna tabla se lee ni se escribe directo desde el juego. Todo pasa por funciones
-- (security definer) que validan quién llama, el estado de la Copa y el puntaje.
-- Administradores: los mails de la tabla `admins` (se cargan a mano, ver el final del archivo).

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------
create table if not exists admins (
  email text primary key check (email = lower(email))
);

-- Juegos que suman a la Copa. Tiene que coincidir con PP.GAMES de js/data.js:
-- para sumar un juego nuevo, agregarlo allá y acá (una línea en el insert de abajo).
create table if not exists cup_games (
  id text primary key check (id ~ '^[a-z0-9_-]{1,32}$'),
  name text not null
);

create table if not exists cups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 80),
  venue text not null default '' check (char_length(venue) <= 80),
  prize text not null default '' check (char_length(prize) <= 120),
  start_at timestamptz not null,
  end_at timestamptz not null,
  price_ars numeric(12, 2) not null default 0 check (price_ars >= 0),
  pay_info text not null default '' check (char_length(pay_info) <= 600),
  max_points int not null default 100 check (max_points between 1 and 100000),
  closed_at timestamptz,                                   -- cierre anticipado
  winner_user uuid references auth.users on delete set null,
  winner_code text,
  redeemed_at timestamptz,                                 -- premio canjeado
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);

create table if not exists cup_entries (
  cup_id uuid not null references cups on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  total int not null default 0,
  last_improved_at timestamptz,                            -- desempate: gana quien llegó primero al total
  last_submit_at timestamptz,                              -- para el mínimo de segundos entre envíos
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  primary key (cup_id, user_id)
);
create index if not exists cup_entries_rank on cup_entries (cup_id, status, total desc, last_improved_at);

create table if not exists cup_scores (
  cup_id uuid not null,
  user_id uuid not null,
  game_id text not null references cup_games on update cascade,
  best int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (cup_id, user_id, game_id),
  foreign key (cup_id, user_id) references cup_entries on delete cascade
);

alter table admins enable row level security;
alter table cup_games enable row level security;
alter table cups enable row level security;
alter table cup_entries enable row level security;
alter table cup_scores enable row level security;
-- Sin políticas: nadie lee ni escribe estas tablas directo. Solo las funciones de abajo.
revoke all on admins, cup_games, cups, cup_entries, cup_scores from anon, authenticated;

-- Los 40 niveles y los 4 ejercicios del Gimnasio mental
insert into cup_games (id, name)
  select 'lv' || n, 'Nivel ' || n from generate_series(1, 40) n
  on conflict (id) do update set name = excluded.name;
insert into cup_games (id, name) values
  ('read', 'Leé la jugada'), ('antic', 'Anticipación'), ('lights', 'Tablero de luces'), ('ghost', 'Pelota fantasma')
  on conflict (id) do update set name = excluded.name;

-- ---------------------------------------------------------------------
-- Funciones internas
-- ---------------------------------------------------------------------
-- Las funciones que cambian de forma se borran antes para poder volver a crearlas.
drop function if exists cup_ranking(uuid);
drop function if exists cup_admin_list();
drop function if exists cup_admin_entries(uuid);

create or replace function cup_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null
     and exists (select 1 from admins a where a.email = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

-- Hora real de cierre (la programada o la del cierre anticipado, la que llegue primero)
create or replace function cup_end(c cups) returns timestamptz
language sql immutable as $$ select least(c.end_at, coalesce(c.closed_at, c.end_at)); $$;

-- Al terminar la Copa elige al ganador (más puntos; si empatan, el que llegó primero) y le da un código de 6 caracteres
create or replace function cup_finalize(p_cup uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  c cups; w uuid; code text := ''; abc constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  select * into c from cups where id = p_cup for update;
  if not found or c.winner_code is not null or now() < cup_end(c) then return; end if;
  select e.user_id into w from cup_entries e
   where e.cup_id = p_cup and e.status = 'approved' and e.total > 0
   order by e.total desc, e.last_improved_at asc limit 1;
  if w is null then return; end if;
  for i in 1..6 loop
    code := code || substr(abc, 1 + get_byte(gen_random_bytes(1), 0) % 32, 1);
  end loop;
  update cups set winner_user = w, winner_code = code where id = p_cup;
end $$;

-- ---------------------------------------------------------------------
-- Funciones para el jugador
-- ---------------------------------------------------------------------
-- Copa para mostrar: la próxima o en curso; si no hay, la última que terminó (para ver al ganador)
create or replace function cup_current() returns json
language plpgsql security definer set search_path = public as $$
declare
  c cups; e cup_entries; adm boolean := cup_is_admin(); fin timestamptz; st text; rk int; wname text; wtotal int;
begin
  select * into c from cups x where cup_end(x) > now() order by x.start_at limit 1;
  if not found then select * into c from cups x order by cup_end(x) desc limit 1; end if;
  if not found then return json_build_object('admin', adm, 'cup', null); end if;
  perform cup_finalize(c.id);
  select * into c from cups where id = c.id;
  fin := cup_end(c);
  st := case when now() < c.start_at then 'soon' when now() < fin then 'live' else 'done' end;
  if auth.uid() is not null then select * into e from cup_entries where cup_id = c.id and user_id = auth.uid(); end if;
  if e.status = 'approved' then
    select count(*) + 1 into rk from cup_entries x
     where x.cup_id = c.id and x.status = 'approved'
       and (x.total > e.total or (x.total = e.total and e.total > 0 and x.last_improved_at < e.last_improved_at));
  end if;
  select name, total into wname, wtotal from cup_entries where cup_id = c.id and user_id = c.winner_user;
  return json_build_object(
    'admin', adm, 'status', st, 'now', now(),
    'cup', json_build_object('id', c.id, 'name', c.name, 'venue', c.venue, 'prize', c.prize, 'start_at', c.start_at,
      'end_at', fin, 'price_ars', c.price_ars, 'pay_info', c.pay_info, 'max_points', c.max_points,
      'winner_name', wname, 'winner_total', wtotal, 'redeemed', c.redeemed_at is not null),
    'me', case when e.user_id is null then null else json_build_object(
      'status', e.status, 'total', e.total, 'rank', rk,
      'winner', c.winner_user = auth.uid(),
      'code', case when c.winner_user = auth.uid() then c.winner_code end) end);
end $$;

-- Inscribirse. Gratis = aprobada al instante; con precio = pendiente hasta que la administración confirme el pago.
create or replace function cup_join(p_cup uuid) returns text
language plpgsql security definer set search_path = public as $$
declare c cups; nm text; st text; cur text;
begin
  if auth.uid() is null then raise exception 'Necesitás una cuenta para participar.'; end if;
  select * into c from cups where id = p_cup;
  if not found then raise exception 'No encontramos esa Copa.'; end if;
  if now() >= cup_end(c) then raise exception 'La Copa ya terminó.'; end if;
  select coalesce(p.name, 'Jugador') into nm from profiles p where p.id = auth.uid();
  st := case when c.price_ars = 0 then 'approved' else 'pending' end;
  select status into cur from cup_entries where cup_id = p_cup and user_id = auth.uid();
  if cur is null then
    insert into cup_entries (cup_id, user_id, name, status, decided_at)
    values (p_cup, auth.uid(), coalesce(nm, 'Jugador'), st, case when st = 'approved' then now() end);
    return st;
  elsif cur = 'rejected' then   -- si la rechazaron (por ejemplo, no llegó el pago) puede volver a pedirla
    update cup_entries set status = st, decided_at = case when st = 'approved' then now() end where cup_id = p_cup and user_id = auth.uid();
    return st;
  end if;
  return cur;
end $$;

-- Puntaje: entra solo por acá. Valida jugador aprobado, Copa en curso, juego válido, 0..tope,
-- que mejore la marca anterior y un mínimo de 15 segundos entre envíos.
create or replace function cup_submit(p_cup uuid, p_game text, p_score int) returns json
language plpgsql security definer set search_path = public as $$
declare c cups; e cup_entries; old int; t int; gap constant int := 15; waited numeric;
begin
  if auth.uid() is null then raise exception 'Necesitás una cuenta.'; end if;
  select * into c from cups where id = p_cup;
  if not found then raise exception 'No encontramos esa Copa.'; end if;
  if now() < c.start_at or now() >= cup_end(c) then return json_build_object('ok', false, 'reason', 'not_live'); end if;
  if not exists (select 1 from cup_games where id = p_game) then raise exception 'Ese juego no cuenta para la Copa.'; end if;
  if p_score is null or p_score < 0 or p_score > c.max_points then raise exception 'Puntaje fuera de rango.'; end if;
  select * into e from cup_entries where cup_id = p_cup and user_id = auth.uid() for update;
  if not found or e.status <> 'approved' then return json_build_object('ok', false, 'reason', 'not_approved'); end if;
  if e.last_submit_at is not null then
    waited := extract(epoch from now() - e.last_submit_at);
    if waited < gap then return json_build_object('ok', false, 'reason', 'too_fast', 'wait', ceil(gap - waited)); end if;
  end if;
  update cup_entries set last_submit_at = now() where cup_id = p_cup and user_id = auth.uid();
  select best into old from cup_scores where cup_id = p_cup and user_id = auth.uid() and game_id = p_game;
  if old is not null and p_score <= old then
    return json_build_object('ok', true, 'improved', false, 'best', old, 'total', e.total);
  end if;
  insert into cup_scores (cup_id, user_id, game_id, best, updated_at) values (p_cup, auth.uid(), p_game, p_score, now())
    on conflict (cup_id, user_id, game_id) do update set best = excluded.best, updated_at = now();
  update cup_entries set total = (select coalesce(sum(best), 0) from cup_scores where cup_id = p_cup and user_id = auth.uid()),
         last_improved_at = now()
   where cup_id = p_cup and user_id = auth.uid() returning total into t;
  return json_build_object('ok', true, 'improved', true, 'best', p_score, 'total', t);
end $$;

-- Ranking de la Copa: top 100 de los aprobados
create or replace function cup_ranking(p_cup uuid)
returns table (user_id uuid, name text, total int, last_improved_at timestamptz)
language sql stable security definer set search_path = public as $$
  select e.user_id, e.name, e.total, e.last_improved_at from cup_entries e
   where e.cup_id = p_cup and e.status = 'approved'
   order by e.total desc, e.last_improved_at asc nulls last, e.created_at asc
   limit 100;
$$;

-- Mis mejores marcas por juego en la Copa
create or replace function cup_my_scores(p_cup uuid) returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_object_agg(s.game_id, s.best), '{}'::json) from cup_scores s
   where s.cup_id = p_cup and s.user_id = auth.uid();
$$;

-- ---------------------------------------------------------------------
-- Funciones de administración (rechazan a quien no está en `admins`)
-- ---------------------------------------------------------------------
create or replace function cup_admin_check() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not cup_is_admin() then raise exception 'Solo la administración puede hacer esto.'; end if;
end $$;

create or replace function cup_admin_list()
returns table (id uuid, name text, venue text, prize text, start_at timestamptz, end_at timestamptz, closed_at timestamptz,
  price_ars numeric, pay_info text, max_points int, winner_name text, winner_code text, redeemed_at timestamptz,
  pending int, approved int)
language plpgsql security definer set search_path = public as $$
begin
  perform cup_admin_check();
  perform cup_finalize(x.id) from cups x where x.winner_code is null and cup_end(x) <= now();
  return query
    select c.id, c.name, c.venue, c.prize, c.start_at, c.end_at, c.closed_at, c.price_ars, c.pay_info, c.max_points,
           (select e.name from cup_entries e where e.cup_id = c.id and e.user_id = c.winner_user), c.winner_code, c.redeemed_at,
           (select count(*)::int from cup_entries e where e.cup_id = c.id and e.status = 'pending'),
           (select count(*)::int from cup_entries e where e.cup_id = c.id and e.status = 'approved')
      from cups c order by c.start_at desc limit 50;
end $$;

-- Crear (p_id vacío) o editar una Copa. Devuelve su id.
create or replace function cup_admin_save(p_id uuid, p_name text, p_venue text, p_prize text, p_start timestamptz, p_end timestamptz,
  p_price numeric, p_pay text, p_max int) returns uuid
language plpgsql security definer set search_path = public as $$
declare r uuid;
begin
  perform cup_admin_check();
  if p_end <= p_start then raise exception 'El cierre tiene que ser después del inicio.'; end if;
  if p_id is null then
    insert into cups (name, venue, prize, start_at, end_at, price_ars, pay_info, max_points)
    values (trim(p_name), trim(coalesce(p_venue, '')), trim(coalesce(p_prize, '')), p_start, p_end, coalesce(p_price, 0), trim(coalesce(p_pay, '')), coalesce(p_max, 100))
    returning id into r;
  else
    update cups set name = trim(p_name), venue = trim(coalesce(p_venue, '')), prize = trim(coalesce(p_prize, '')), start_at = p_start, end_at = p_end,
      price_ars = coalesce(p_price, 0), pay_info = trim(coalesce(p_pay, '')), max_points = coalesce(p_max, 100)
     where id = p_id returning id into r;
    if r is null then raise exception 'No encontramos esa Copa.'; end if;
  end if;
  return r;
end $$;

create or replace function cup_admin_entries(p_cup uuid)
returns table (user_id uuid, name text, email text, status text, total int, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  perform cup_admin_check();
  return query
    select e.user_id, e.name, u.email::text, e.status, e.total, e.created_at
      from cup_entries e left join auth.users u on u.id = e.user_id
     where e.cup_id = p_cup
     order by case e.status when 'pending' then 0 when 'approved' then 1 else 2 end, e.total desc, e.created_at;
end $$;

-- Aprobar (pagó) o rechazar (no pagó) una inscripción
create or replace function cup_admin_decide(p_cup uuid, p_user uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform cup_admin_check();
  if p_status not in ('pending', 'approved', 'rejected') then raise exception 'Estado inválido.'; end if;
  update cup_entries set status = p_status, decided_at = now() where cup_id = p_cup and user_id = p_user;
end $$;

-- Cerrar la Copa antes de tiempo (elige al ganador en el momento)
create or replace function cup_admin_close(p_cup uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform cup_admin_check();
  update cups set closed_at = now() where id = p_cup and closed_at is null and now() < end_at;
  perform cup_finalize(p_cup);
end $$;

-- Marcar (o desmarcar) el premio como canjeado
create or replace function cup_admin_redeem(p_cup uuid, p_done boolean default true) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform cup_admin_check();
  update cups set redeemed_at = case when p_done then now() end where id = p_cup;
end $$;

-- Permisos: las funciones internas no se llaman desde afuera
revoke all on function cup_finalize(uuid), cup_end(cups), cup_admin_check() from public, anon, authenticated;
revoke all on function cup_is_admin(), cup_current(), cup_join(uuid), cup_submit(uuid, text, int), cup_ranking(uuid), cup_my_scores(uuid),
  cup_admin_list(), cup_admin_save(uuid, text, text, text, timestamptz, timestamptz, numeric, text, int), cup_admin_entries(uuid),
  cup_admin_decide(uuid, uuid, text), cup_admin_close(uuid), cup_admin_redeem(uuid, boolean) from public, anon;
grant execute on function cup_current(), cup_ranking(uuid) to anon, authenticated;
grant execute on function cup_is_admin(), cup_join(uuid), cup_submit(uuid, text, int), cup_my_scores(uuid),
  cup_admin_list(), cup_admin_save(uuid, text, text, text, timestamptz, timestamptz, numeric, text, int), cup_admin_entries(uuid),
  cup_admin_decide(uuid, uuid, text), cup_admin_close(uuid), cup_admin_redeem(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- Marcarte como administradora: cambiá el mail y ejecutá esta línea (también se puede desde Table Editor → admins).
-- insert into admins (email) values ('tu-mail@ejemplo.com') on conflict do nothing;
-- ---------------------------------------------------------------------
