-- A la Pelotita · Estadísticas anónimas para el panel de administración.
-- Cada navegador tiene un número al azar (vid) guardado en el dispositivo: no se guarda IP, nombre ni mail
-- (si la persona tiene cuenta, se anota su id para separar registrados de anónimos).
-- Pegar todo en Supabase → SQL Editor → Run. Se puede volver a ejecutar sin romper nada.

create table if not exists an_visitors (
  vid text primary key check (vid ~ '^[a-z0-9]{8,32}$'),
  user_id uuid references auth.users on delete set null,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  screen text, device text,
  visits int not null default 1,                 -- días distintos en que entró
  last_day date not null default ((now() at time zone 'America/Argentina/Buenos_Aires')::date)
);
create table if not exists an_days (
  day date not null, vid text not null, user_id uuid,
  primary key (day, vid)
);
create table if not exists an_plays (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  vid text not null, user_id uuid,
  game text not null, result text not null, secs int not null default 0
);
create index if not exists an_visitors_seen on an_visitors (last_seen desc);
create index if not exists an_plays_time on an_plays (created_at desc);
alter table an_visitors enable row level security;
alter table an_days enable row level security;
alter table an_plays enable row level security;
-- Sin políticas: nadie lee ni escribe directo. Los avisos entran por las funciones de abajo; solo la administración lee.
revoke all on an_visitors, an_days, an_plays from anon, authenticated;

create or replace function an_today() returns date language sql stable set search_path = public as $$ select (now() at time zone 'America/Argentina/Buenos_Aires')::date; $$;

-- "Sigo acá": se llama al abrir el juego y cada 45 segundos mientras está abierto
create or replace function track_ping(p_vid text, p_screen text, p_device text) returns void
language plpgsql security definer set search_path = public as $$
declare d date := an_today();
begin
  if p_vid is null or p_vid !~ '^[a-z0-9]{8,32}$' then return; end if;
  insert into an_visitors (vid, user_id, screen, device, last_day)
  values (p_vid, auth.uid(), left(coalesce(p_screen, ''), 20), left(coalesce(p_device, ''), 12), d)
  on conflict (vid) do update set last_seen = now(), screen = excluded.screen, device = excluded.device,
    user_id = coalesce(auth.uid(), an_visitors.user_id),
    visits = an_visitors.visits + case when an_visitors.last_day < d then 1 else 0 end, last_day = d;
  insert into an_days (day, vid, user_id) values (d, p_vid, auth.uid())
  on conflict (day, vid) do update set user_id = coalesce(excluded.user_id, an_days.user_id);
end $$;

-- Una partida terminada (o abandonada). Máximo 120 por hora por visitante, para que nadie llene la base.
create or replace function track_play(p_vid text, p_game text, p_result text, p_secs int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_vid is null or p_vid !~ '^[a-z0-9]{8,32}$' or p_game is null or p_game !~ '^[a-z0-9_-]{1,24}$' then return; end if;
  if p_result not in ('gano', 'perdio', 'salio', 'fin') then return; end if;
  if (select count(*) from an_plays where vid = p_vid and created_at > now() - interval '1 hour') >= 120 then return; end if;
  insert into an_plays (vid, user_id, game, result, secs) values (p_vid, auth.uid(), p_game, p_result, greatest(0, least(coalesce(p_secs, 0), 7200)));
end $$;

-- Todo lo que ve la administración, en un solo pedido
create or replace function admin_analytics() returns json
language plpgsql stable security definer set search_path = public as $$
declare t date := an_today();
begin
  if not public.is_admin() then raise exception 'Solo la administración puede ver esto.'; end if;
  return json_build_object(
    'live', (select json_build_object('total', count(*), 'registered', count(*) filter (where user_id is not null),
        'screens', coalesce((select json_agg(x) from (select coalesce(nullif(screen, ''), 'inicio') screen, count(*) n from an_visitors
          where last_seen > now() - interval '2 minutes' group by 1 order by 2 desc) x), '[]'::json))
      from an_visitors where last_seen > now() - interval '2 minutes'),
    'today', (select json_build_object('visitors', count(*), 'registered', count(*) filter (where user_id is not null),
        'new', (select count(*) from an_visitors where (first_seen at time zone 'America/Argentina/Buenos_Aires')::date = t))
      from an_days where day = t),
    'week', (select count(distinct vid) from an_days where day > t - 7),
    'month', (select count(distinct vid) from an_days where day > t - 30),
    'returning', (select count(*) from an_visitors where visits > 1 and last_seen > now() - interval '30 days'),
    'daily', coalesce((select json_agg(x order by x.day) from (select g.day::date as day, count(a.vid) visitors, count(a.user_id) registered
        from generate_series(t - 13, t, interval '1 day') g(day) left join an_days a on a.day = g.day::date group by 1) x), '[]'::json),
    'games', coalesce((select json_agg(x order by x.plays desc) from (select game, count(*) plays, count(distinct vid) players,
        round(avg(secs)) avg_secs, round(100.0 * count(*) filter (where result = 'gano') / count(*)) win_pct,
        round(100.0 * count(*) filter (where result = 'salio') / count(*)) quit_pct
        from an_plays where created_at > now() - interval '30 days' group by game) x), '[]'::json),
    'plays_today', (select count(*) from an_plays where (created_at at time zone 'America/Argentina/Buenos_Aires')::date = t),
    'devices', coalesce((select json_agg(x order by x.n desc) from (select coalesce(nullif(device, ''), 'otro') device, count(*) n
        from an_visitors where last_seen > now() - interval '30 days' group by 1) x), '[]'::json),
    'anon_month', (select count(*) from an_visitors where last_seen > now() - interval '30 days' and user_id is null),
    'reg_month', (select count(*) from an_visitors where last_seen > now() - interval '30 days' and user_id is not null));
end $$;

revoke all on function an_today() from public, anon, authenticated;
revoke all on function track_ping(text, text, text), track_play(text, text, text, int), admin_analytics() from public;
grant execute on function track_ping(text, text, text), track_play(text, text, text, int) to anon, authenticated;
grant execute on function admin_analytics() to authenticated;
