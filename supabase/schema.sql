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
