-- A la Pelotita · tablas de la comunidad para Supabase.
-- Pegar todo en SQL Editor → Run. Se puede volver a ejecutar sin romper nada.

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null check (char_length(name) between 2 and 40),
  cat text default '8va',
  side text default 'Drive',
  stars int not null default 0,
  level int not null default 1,
  iq int not null default 70,
  picks int not null default 0,
  updated_at timestamptz default now()
);

create table if not exists sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  type text not null check (type in ('Cancha o club', 'Tienda de insumos de pádel')),
  descr text check (char_length(descr) <= 300),
  contact text check (char_length(contact) <= 200),
  approved boolean not null default false,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz default now()
);

create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null check (char_length(name) between 3 and 60),
  kind text not null check (kind in ('peloteo', 'mental')),
  mode text not null default 'individual' check (mode in ('individual', 'parejas')),
  start_at timestamptz not null,
  hours int not null check (hours between 1 and 168),
  host text,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz default now()
);

create table if not exists tournament_players (
  tournament_id uuid references tournaments on delete cascade,
  user_id uuid references auth.users on delete cascade,
  name text not null,
  score int not null default 0,
  primary key (tournament_id, user_id)
);

create table if not exists bets (
  tournament_id uuid references tournaments on delete cascade,
  user_id uuid references auth.users on delete cascade,
  pick uuid not null,
  created_at timestamptz default now(),
  primary key (tournament_id, user_id)
);

alter table profiles enable row level security;
alter table sponsors enable row level security;
alter table tournaments enable row level security;
alter table tournament_players enable row level security;
alter table bets enable row level security;

-- Perfiles: todos los ven (ranking); cada uno edita el suyo.
drop policy if exists p_read on profiles;   create policy p_read on profiles for select using (true);
drop policy if exists p_ins on profiles;    create policy p_ins on profiles for insert with check (auth.uid() = id);
drop policy if exists p_upd on profiles;    create policy p_upd on profiles for update using (auth.uid() = id);

-- Sponsors: solo se muestran los aprobados (y los propios). Aprobar = poner approved en true desde el panel.
drop policy if exists s_read on sponsors;   create policy s_read on sponsors for select using (approved or auth.uid() = created_by);
drop policy if exists s_ins on sponsors;    create policy s_ins on sponsors for insert with check (auth.uid() = created_by and approved = false);

-- Torneos: todos los ven; crea cualquier usuario con cuenta.
drop policy if exists t_read on tournaments; create policy t_read on tournaments for select using (true);
drop policy if exists t_ins on tournaments;  create policy t_ins on tournaments for insert with check (auth.uid() = created_by and start_at > now());

-- Inscripción hasta el inicio; el puntaje solo se actualiza mientras el torneo está en juego.
drop policy if exists tp_read on tournament_players; create policy tp_read on tournament_players for select using (true);
drop policy if exists tp_ins on tournament_players;  create policy tp_ins on tournament_players for insert with check (
  auth.uid() = user_id and score = 0 and exists (select 1 from tournaments t where t.id = tournament_id and now() < t.start_at));
drop policy if exists tp_upd on tournament_players;  create policy tp_upd on tournament_players for update using (
  auth.uid() = user_id and exists (select 1 from tournaments t where t.id = tournament_id and now() >= t.start_at and now() < t.start_at + make_interval(hours => t.hours)));

-- Pronósticos gratis: se pueden hacer o cambiar hasta 5 minutos antes del inicio.
drop policy if exists b_read on bets; create policy b_read on bets for select using (true);
drop policy if exists b_ins on bets;  create policy b_ins on bets for insert with check (
  auth.uid() = user_id and exists (select 1 from tournaments t where t.id = tournament_id and now() < t.start_at - interval '5 minutes'));
drop policy if exists b_upd on bets;  create policy b_upd on bets for update using (
  auth.uid() = user_id and exists (select 1 from tournaments t where t.id = tournament_id and now() < t.start_at - interval '5 minutes'));

-- Permisos de la API: las reglas de arriba deciden qué fila puede tocar cada uno.
grant usage on schema public to anon, authenticated;
grant select on profiles, sponsors, tournaments, tournament_players, bets to anon, authenticated;
grant insert, update on tournament_players, bets to authenticated;
grant insert on sponsors, tournaments to authenticated;

-- =====================================================================
-- Jugadas PRO: suscripción, videos de hasta 20 segundos y me gusta.
-- =====================================================================
alter table profiles add column if not exists vip_until timestamptz;
alter table profiles add column if not exists is_admin boolean not null default false;

-- Cada uno edita solo sus datos de juego: ni el alta Pro ni el permiso de administración se tocan desde el juego.
revoke insert, update on profiles from authenticated;
grant insert (id, name, cat, side) on profiles to authenticated;
grant update (id, name, cat, side, stars, level, iq, picks, updated_at) on profiles to authenticated;

create or replace function is_admin() returns boolean language sql stable security definer set search_path = public as
  $$ select coalesce((select is_admin from profiles where id = auth.uid()), false) $$;
create or replace function is_vip() returns boolean language sql stable security definer set search_path = public as
  $$ select coalesce((select is_admin or vip_until > now() from profiles where id = auth.uid()), false) $$;

create table if not exists videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  challenge int not null check (challenge between 1 and 200),
  path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);
create index if not exists videos_challenge on videos (challenge, status);
create table if not exists video_likes (
  video_id uuid references videos on delete cascade,
  user_id uuid references auth.users on delete cascade,
  created_at timestamptz default now(),
  primary key (video_id, user_id)
);
alter table videos enable row level security;
alter table video_likes enable row level security;

-- Cuántos videos subió este usuario en el mes en curso (tope: 12).
create or replace function videos_this_month() returns int language sql stable security definer set search_path = public as
  $$ select count(*)::int from videos where user_id = auth.uid() and created_at >= date_trunc('month', now()) $$;

-- Ver: los Pro ven los aprobados; cada uno ve los suyos; la administración ve todos.
drop policy if exists v_read on videos; create policy v_read on videos for select using ((status = 'approved' and is_vip()) or auth.uid() = user_id or is_admin());
-- Subir: solo Pro, siempre "en revisión", ruta dentro de su carpeta y hasta 12 por mes.
drop policy if exists v_ins on videos;  create policy v_ins on videos for insert with check (
  auth.uid() = user_id and status = 'pending' and is_vip() and videos_this_month() < 12 and path like auth.uid()::text || '/%');
-- Aprobar o rechazar: solo la administración. Borrar: el dueño o la administración.
drop policy if exists v_upd on videos;  create policy v_upd on videos for update using (is_admin());
drop policy if exists v_del on videos;  create policy v_del on videos for delete using (auth.uid() = user_id or is_admin());

drop policy if exists vl_read on video_likes; create policy vl_read on video_likes for select using (is_vip());
drop policy if exists vl_ins on video_likes;  create policy vl_ins on video_likes for insert with check (auth.uid() = user_id and is_vip());
drop policy if exists vl_del on video_likes;  create policy vl_del on video_likes for delete using (auth.uid() = user_id);

grant select, insert, delete on videos, video_likes to authenticated;
grant update (status) on videos to authenticated;

-- Dar o quitar el alta Pro por mail (solo administración). dias = 0 la quita.
create or replace function set_vip(mail text, dias int) returns text language plpgsql security definer set search_path = public as $$
declare uid uuid; hasta timestamptz;
begin
  if not is_admin() then raise exception 'Solo la administración puede dar el alta Pro.'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(mail));
  if uid is null then raise exception 'No hay ninguna cuenta con ese mail.'; end if;
  if dias <= 0 then update profiles set vip_until = null where id = uid; return 'Alta Pro quitada.'; end if;
  update profiles set vip_until = greatest(coalesce(vip_until, now()), now()) + make_interval(days => dias) where id = uid returning vip_until into hasta;
  if hasta is null then raise exception 'Esa cuenta todavía no tiene perfil en el juego.'; end if;
  return 'Pro hasta el ' || to_char(hasta at time zone 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY');
end $$;
revoke all on function set_vip(text, int) from public, anon;
grant execute on function set_vip(text, int), is_admin(), is_vip(), videos_this_month() to authenticated;

-- Archivos de video: depósito privado, 15 MB por archivo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('jugadas', 'jugadas', false, 15728640, array['video/mp4', 'video/quicktime', 'video/webm'])
  on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types, public = false;
drop policy if exists jugadas_read on storage.objects; create policy jugadas_read on storage.objects for select to authenticated using (
  bucket_id = 'jugadas' and (public.is_vip() or (storage.foldername(name))[1] = auth.uid()::text));
drop policy if exists jugadas_ins on storage.objects;  create policy jugadas_ins on storage.objects for insert to authenticated with check (
  bucket_id = 'jugadas' and public.is_vip() and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists jugadas_del on storage.objects;  create policy jugadas_del on storage.objects for delete to authenticated using (
  bucket_id = 'jugadas' and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text));

-- =====================================================================
-- Panel de administración: opiniones, usuarios, pagos y estadísticas.
-- Todo se lee con funciones que solo responden a cuentas con is_admin.
-- =====================================================================
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users on delete set null default auth.uid(),
  name text check (char_length(name) <= 60),
  rating int check (rating between 0 and 5),
  message text check (char_length(message) <= 1500),
  level int, control text check (char_length(control) <= 10), device text check (char_length(device) <= 60), version text check (char_length(version) <= 20),
  read boolean not null default false
);
alter table feedback enable row level security;
-- Cualquiera (con o sin cuenta) puede dejar su opinión; nadie la puede leer salvo la administración.
drop policy if exists f_ins on feedback; create policy f_ins on feedback for insert to anon, authenticated with check (
  read = false and (user_id is null or user_id = auth.uid()) and (coalesce(rating, 0) > 0 or char_length(coalesce(message, '')) > 0));
revoke all on feedback from anon, authenticated;
grant insert (name, rating, message, level, control, device, version) on feedback to anon, authenticated;

drop function if exists admin_users(text);
create or replace function admin_users(q text default '') returns table (id uuid, email text, name text, vip_until timestamptz, is_admin boolean, videos int, created_at timestamptz, last_sign_in timestamptz, pays int, paid numeric, stars int, iq int, cat text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Solo la administración puede ver los usuarios.'; end if;
  return query
    select u.id, u.email::text, p.name, p.vip_until, coalesce(p.is_admin, false),
           (select count(*)::int from videos v where v.user_id = u.id), u.created_at, u.last_sign_in_at,
           (select count(*)::int from payments x where x.user_id = u.id), (select coalesce(sum(x.amount), 0) from payments x where x.user_id = u.id),
           coalesce(p.stars, 0), coalesce(p.iq, 0), p.cat
    from auth.users u left join profiles p on p.id = u.id
    where coalesce(q, '') = '' or p.name ilike '%' || q || '%' or u.email ilike '%' || q || '%'
    order by u.created_at desc limit 1000;
end $$;

create or replace function admin_stats() returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Solo la administración puede ver las estadísticas.'; end if;
  return json_build_object(
    'users', (select count(*) from auth.users),
    'users_7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'users_30d', (select count(*) from auth.users where created_at > now() - interval '30 days'),
    'active_7d', (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
    'pro_active', (select count(*) from profiles where vip_until > now() and not is_admin),
    'pro_expired', (select count(*) from profiles where vip_until <= now() and not is_admin),
    'pro_expiring_7d', (select count(*) from profiles where vip_until > now() and vip_until <= now() + interval '7 days' and not is_admin),
    'payers', (select count(distinct user_id) from payments),
    'pays_month', (select count(*) from payments where created_at >= date_trunc('month', now())),
    'income_month', (select coalesce(sum(amount), 0) from payments where created_at >= date_trunc('month', now())),
    'income_total', (select coalesce(sum(amount), 0) from payments),
    'videos_pending', (select count(*) from videos where status = 'pending'),
    'videos_approved', (select count(*) from videos where status = 'approved'),
    'likes', (select count(*) from video_likes),
    'tournaments', (select count(*) from tournaments),
    'feedback_unread', (select count(*) from feedback where not read),
    'feedback_total', (select count(*) from feedback),
    'rating_avg', (select round(avg(rating)::numeric, 1) from feedback where rating > 0),
    'price', (select value from app_settings where key = 'pro_price_ars'),
    'signups_by_week', (select coalesce(json_agg(json_build_object('week', w, 'n', n) order by w), '[]'::json) from (
        select to_char(date_trunc('week', created_at), 'YYYY-MM-DD') w, count(*) n from auth.users where created_at > now() - interval '12 weeks' group by 1) s)
  );
end $$;

create or replace function admin_payments() returns table (created_at timestamptz, email text, name text, amount numeric, status text, mp_payment_id text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Solo la administración puede ver los pagos.'; end if;
  return query select x.created_at, u.email::text, p.name, x.amount, x.status, x.mp_payment_id
    from payments x left join auth.users u on u.id = x.user_id left join profiles p on p.id = x.user_id order by x.created_at desc limit 1000;
end $$;

create or replace function admin_feedback() returns table (id uuid, created_at timestamptz, email text, name text, rating int, message text, level int, control text, device text, read boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Solo la administración puede leer las opiniones.'; end if;
  return query select f.id, f.created_at, u.email::text, coalesce(nullif(f.name, ''), p.name), f.rating, f.message, f.level, f.control, f.device, f.read
    from feedback f left join auth.users u on u.id = f.user_id left join profiles p on p.id = f.user_id order by f.created_at desc limit 1000;
end $$;

create or replace function admin_feedback_set(fid uuid, is_read boolean, remove boolean default false) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Solo la administración puede modificar las opiniones.'; end if;
  if remove then delete from feedback where id = fid; else update feedback set read = is_read where id = fid; end if;
end $$;

revoke all on function admin_users(text), admin_stats(), admin_payments(), admin_feedback(), admin_feedback_set(uuid, boolean, boolean) from public, anon;
grant execute on function admin_users(text), admin_stats(), admin_payments(), admin_feedback(), admin_feedback_set(uuid, boolean, boolean) to authenticated;

-- =====================================================================
-- Seguridad (noviembre 2026): cada jugador lee solo sus propios datos.
-- El ranking, el buscador y los torneos se leen con funciones que devuelven
-- solo lo público (nunca el alta Pro, la administración ni los pronósticos ajenos).
-- =====================================================================
create or replace function public.tournament_member(p_tid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tournament_players where tournament_id = p_tid and user_id = auth.uid())
      or exists (select 1 from public.tournaments where id = p_tid and created_by = auth.uid());
$$;
-- Horarios del torneo para las reglas (los jugadores ya no leen la tabla de torneos directamente).
create or replace function public.tournament_window(p_tid uuid, p_what text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select case p_what
      when 'bet'  then now() < t.start_at - interval '5 minutes'
      when 'join' then now() < t.start_at
      when 'live' then now() >= t.start_at and now() < t.start_at + make_interval(hours => t.hours)
      else false end
    from public.tournaments t where t.id = p_tid), false);
$$;
revoke all on function public.tournament_member(uuid), public.tournament_window(uuid, text) from public, anon;
grant execute on function public.tournament_member(uuid), public.tournament_window(uuid, text) to authenticated;

drop policy if exists p_read on profiles;  create policy p_read on profiles for select to authenticated using (auth.uid() = id or public.is_admin());
drop policy if exists t_read on tournaments; create policy t_read on tournaments for select to authenticated using (created_by = auth.uid() or public.tournament_member(id) or public.is_admin());
drop policy if exists tp_read on tournament_players; create policy tp_read on tournament_players for select to authenticated using (auth.uid() = user_id or public.tournament_member(tournament_id) or public.is_admin());
drop policy if exists b_read on bets; create policy b_read on bets for select to authenticated using (auth.uid() = user_id or public.tournament_member(tournament_id) or public.is_admin());
drop policy if exists tp_ins on tournament_players; create policy tp_ins on tournament_players for insert with check (auth.uid() = user_id and score = 0 and public.tournament_window(tournament_id, 'join'));
drop policy if exists tp_upd on tournament_players; create policy tp_upd on tournament_players for update using (auth.uid() = user_id and public.tournament_window(tournament_id, 'live'));
drop policy if exists b_ins on bets; create policy b_ins on bets for insert with check (auth.uid() = user_id and public.tournament_window(tournament_id, 'bet'));
drop policy if exists b_upd on bets; create policy b_upd on bets for update using (auth.uid() = user_id and public.tournament_window(tournament_id, 'bet'));

create or replace function public.ranking_list(p_kind text)
returns table(id uuid, name text, cat text, side text, stars integer, level integer, iq integer, picks integer)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.cat, p.side, p.stars, p.level, p.iq, p.picks from public.profiles p
  where auth.uid() is not null
  order by case p_kind when 'level' then p.level when 'iq' then p.iq when 'picks' then p.picks else p.stars end desc
  limit 100;
$$;
create or replace function public.search_players(q text)
returns table(id uuid, name text, cat text, side text, stars integer, level integer, iq integer, picks integer)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.cat, p.side, p.stars, p.level, p.iq, p.picks from public.profiles p
  where auth.uid() is not null and char_length(coalesce(q, '')) >= 2 and p.name ilike '%' || q || '%'
  order by p.stars desc limit 50;
$$;
create or replace function public.tournaments_open()
returns table(id uuid, code text, name text, kind text, mode text, start_at timestamptz, hours integer, host text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select t.id, t.code, t.name, t.kind, t.mode, t.start_at, t.hours, t.host, t.created_at from public.tournaments t
  where auth.uid() is not null and (t.start_at + make_interval(hours => t.hours) > now() or public.tournament_member(t.id))
  order by t.start_at asc limit 60;
$$;
create or replace function public.tournament_find(p_ref text)
returns table(id uuid, code text, name text, kind text, mode text, start_at timestamptz, hours integer, host text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select t.id, t.code, t.name, t.kind, t.mode, t.start_at, t.hours, t.host, t.created_at from public.tournaments t
  where auth.uid() is not null and (t.code = upper(p_ref) or t.id::text = p_ref) limit 1;
$$;
-- Inscriptos y puntajes, cuántos pronósticos tiene cada uno y el pronóstico propio.
create or replace function public.tournament_detail(p_id uuid) returns json
language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null then null else json_build_object(
    'players', coalesce((select json_agg(json_build_object('user_id', tp.user_id, 'name', tp.name, 'score', tp.score) order by tp.score desc) from public.tournament_players tp where tp.tournament_id = p_id), '[]'::json),
    'picks', coalesce((select json_agg(json_build_object('pick', b.pick, 'n', b.n)) from (select pick, count(*) n from public.bets where tournament_id = p_id group by pick) b), '[]'::json),
    'my_pick', (select pick from public.bets where tournament_id = p_id and user_id = auth.uid())
  ) end;
$$;
revoke all on function public.ranking_list(text), public.search_players(text), public.tournaments_open(), public.tournament_find(text), public.tournament_detail(uuid) from public, anon;
grant execute on function public.ranking_list(text), public.search_players(text), public.tournaments_open(), public.tournament_find(text), public.tournament_detail(uuid) to authenticated;

-- =====================================================================
-- Cobro Pro con Mercado Pago (pago único de 30 días). El precio en pesos va en app_settings.
-- La función de servidor "mp-webhook" llama a apply_pro_payment con permisos de servidor.
-- =====================================================================
create table if not exists app_settings (key text primary key, value text);
alter table app_settings enable row level security;
drop policy if exists app_settings_public_read on app_settings; create policy app_settings_public_read on app_settings for select to anon, authenticated using (true);
revoke all on app_settings from anon, authenticated; grant select on app_settings to anon, authenticated;
insert into app_settings (key, value) values ('pro_price_ars', '') on conflict (key) do nothing;

create table if not exists payments (id uuid primary key default gen_random_uuid(), mp_payment_id text unique not null, user_id uuid, amount numeric, status text, created_at timestamptz default now());
alter table payments enable row level security;
revoke all on payments from anon, authenticated;

create or replace function public.apply_pro_payment(p_mp_payment_id text, p_user_id uuid, p_amount numeric, p_status text, p_currency text) returns boolean
language plpgsql security invoker set search_path = public as $$
declare configured_price text; price numeric; inserted_id uuid;
begin
  select value into configured_price from public.app_settings where key = 'pro_price_ars' for share;
  if configured_price is null or btrim(configured_price) = '' or configured_price !~ '^[0-9]+([.][0-9]+)?$' then return false; end if;
  price := configured_price::numeric;
  if price <= 0 or p_amount is null or p_amount < price or p_status is distinct from 'approved' or p_currency is distinct from 'ARS' or p_mp_payment_id is null or p_mp_payment_id !~ '^[0-9]+$' then return false; end if;
  perform id from public.profiles where id = p_user_id for update;
  if not found then return false; end if;
  insert into public.payments (mp_payment_id, user_id, amount, status) values (p_mp_payment_id, p_user_id, p_amount, p_status) on conflict (mp_payment_id) do nothing returning id into inserted_id;
  if inserted_id is null then return false; end if;
  update public.profiles set vip_until = greatest(coalesce(vip_until, now()), now()) + interval '30 days' where id = p_user_id;
  return true;
end $$;
revoke all on function public.apply_pro_payment(text, uuid, numeric, text, text) from public, anon, authenticated;
grant execute on function public.apply_pro_payment(text, uuid, numeric, text, text) to service_role;

-- =====================================================================
-- Seguir jugadores (como en Instagram) e invitaciones a torneos.
-- Ranking: solo los 20 mejores, más el puesto propio.
-- =====================================================================
create table if not exists follows (
  follower uuid not null references auth.users on delete cascade default auth.uid(),
  followed uuid not null references auth.users on delete cascade,
  created_at timestamptz default now(),
  primary key (follower, followed),
  check (follower <> followed)
);
alter table follows enable row level security;
drop policy if exists f_read on follows; create policy f_read on follows for select to authenticated using (follower = auth.uid() or followed = auth.uid());
drop policy if exists f_ins on follows;  create policy f_ins on follows for insert to authenticated with check (follower = auth.uid());
drop policy if exists f_del on follows;  create policy f_del on follows for delete to authenticated using (follower = auth.uid());
grant select, insert, delete on follows to authenticated;

create table if not exists tournament_invites (
  tournament_id uuid not null references tournaments on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  invited_by uuid not null references auth.users on delete cascade default auth.uid(),
  created_at timestamptz default now(),
  primary key (tournament_id, user_id)
);
alter table tournament_invites enable row level security;
-- Invita quien organiza o juega el torneo, solo antes de que empiece.
drop policy if exists ti_read on tournament_invites; create policy ti_read on tournament_invites for select to authenticated using (user_id = auth.uid() or invited_by = auth.uid());
drop policy if exists ti_ins on tournament_invites;  create policy ti_ins on tournament_invites for insert to authenticated with check (
  invited_by = auth.uid() and user_id <> auth.uid() and public.tournament_member(tournament_id) and public.tournament_window(tournament_id, 'join'));
drop policy if exists ti_del on tournament_invites;  create policy ti_del on tournament_invites for delete to authenticated using (user_id = auth.uid() or invited_by = auth.uid());
grant select, insert, delete on tournament_invites to authenticated;

create or replace function public.ranking_list(p_kind text)
returns table(id uuid, name text, cat text, side text, stars integer, level integer, iq integer, picks integer)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.cat, p.side, p.stars, p.level, p.iq, p.picks from public.profiles p
  where auth.uid() is not null
  order by case p_kind when 'level' then p.level when 'iq' then p.iq when 'picks' then p.picks else p.stars end desc, p.updated_at asc
  limit 20;
$$;
-- Puesto propio en el ranking (para mostrarlo aunque no esté entre los 20).
create or replace function public.my_rank(p_kind text) returns integer
language sql stable security definer set search_path = public as $$
  with v as (select id, case p_kind when 'level' then level when 'iq' then iq when 'picks' then picks else stars end val from public.profiles)
  select (select count(*) from v where v.val > me.val)::int + 1 from v me where me.id = auth.uid();
$$;
-- A quién sigo, con sus datos públicos y si me sigue de vuelta.
create or replace function public.following_list()
returns table(id uuid, name text, cat text, side text, stars integer, level integer, iq integer, picks integer, follows_me boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.cat, p.side, p.stars, p.level, p.iq, p.picks,
         exists (select 1 from public.follows b where b.follower = p.id and b.followed = auth.uid())
  from public.follows f join public.profiles p on p.id = f.followed
  where f.follower = auth.uid() order by p.name;
$$;
create or replace function public.follow_counts() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'following', (select count(*) from public.follows where follower = auth.uid()),
    'followers', (select count(*) from public.follows where followed = auth.uid()));
$$;
-- Torneos a los que me invitaron y que todavía no empezaron.
create or replace function public.my_invites()
returns table(tournament_id uuid, code text, name text, kind text, mode text, start_at timestamptz, hours integer, by_name text)
language sql stable security definer set search_path = public as $$
  select t.id, t.code, t.name, t.kind, t.mode, t.start_at, t.hours, coalesce(p.name, 'Alguien')
  from public.tournament_invites i join public.tournaments t on t.id = i.tournament_id
  left join public.profiles p on p.id = i.invited_by
  where i.user_id = auth.uid() and now() < t.start_at
    and not exists (select 1 from public.tournament_players tp where tp.tournament_id = t.id and tp.user_id = auth.uid())
  order by t.start_at;
$$;
revoke all on function public.my_rank(text), public.following_list(), public.follow_counts(), public.my_invites() from public, anon;
grant execute on function public.my_rank(text), public.following_list(), public.follow_counts(), public.my_invites() to authenticated;

-- =====================================================================
-- Contraseñas: la función admin-password busca la cuenta por mail. Solo la usa el servidor (service_role).
-- =====================================================================
create or replace function public.user_id_by_email(p_email text) returns uuid
language sql stable security definer set search_path = public as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;
revoke all on function public.user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.user_id_by_email(text) to service_role;

-- =====================================================================
-- Panel de un jugador: lo que se ve al tocar su nombre (datos de juego, seguidores y cuántos videos publicó).
-- Los videos se leen aparte con las reglas de siempre (solo PRO).
-- =====================================================================
create or replace function public.player_profile(p_id uuid) returns json
language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null then null else (
    select json_build_object(
      'id', p.id, 'name', p.name, 'cat', p.cat, 'side', p.side, 'stars', p.stars, 'level', p.level, 'iq', p.iq, 'picks', p.picks,
      'pro', p.is_admin or (p.vip_until is not null and p.vip_until > now()),
      'followers', (select count(*) from public.follows where followed = p.id),
      'following', (select count(*) from public.follows where follower = p.id),
      'i_follow', exists (select 1 from public.follows where follower = auth.uid() and followed = p.id),
      'follows_me', exists (select 1 from public.follows where follower = p.id and followed = auth.uid()),
      'videos', (select count(*) from public.videos v where v.user_id = p.id and v.status = 'approved'),
      'likes', (select count(*) from public.video_likes l join public.videos v on v.id = l.video_id where v.user_id = p.id and v.status = 'approved'),
      'me', p.id = auth.uid())
    from public.profiles p where p.id = p_id) end;
$$;
revoke all on function public.player_profile(uuid) from public, anon;
grant execute on function public.player_profile(uuid) to authenticated;

-- =====================================================================
-- Torneos solo para PRO: cualquiera los ve, pero anotarse y crear torneos es para jugadores PRO.
-- =====================================================================
drop policy if exists tp_ins on tournament_players;
create policy tp_ins on tournament_players for insert with check (auth.uid() = user_id and score = 0 and public.tournament_window(tournament_id, 'join') and public.is_vip());
drop policy if exists t_ins on tournaments;
create policy t_ins on tournaments for insert with check (auth.uid() = created_by and start_at > now() and public.is_vip());
