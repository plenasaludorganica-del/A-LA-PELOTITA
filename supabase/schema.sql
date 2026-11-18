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

-- Panel de usuarios de la administración: busca por nombre o mail (máximo 100 resultados).
create or replace function admin_users(q text default '') returns table (id uuid, email text, name text, vip_until timestamptz, is_admin boolean, videos int, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Solo la administración puede ver los usuarios.'; end if;
  return query
    select u.id, u.email::text, p.name, p.vip_until, coalesce(p.is_admin, false),
           (select count(*)::int from videos v where v.user_id = u.id), u.created_at
    from auth.users u left join profiles p on p.id = u.id
    where coalesce(q, '') = '' or p.name ilike '%' || q || '%' or u.email ilike '%' || q || '%'
    order by u.created_at desc limit 100;
end $$;
revoke all on function admin_users(text) from public, anon;
grant execute on function admin_users(text) to authenticated;
