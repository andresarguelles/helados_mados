-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │  NO APLICAR TODAVIA. Esta migracion ROMPE a los clientes desplegados.     │
-- │                                                                          │
-- │  Se aplica en el mismo momento en que se despliegan la web y el APK que   │
-- │  ya llaman a la firma nueva. Aplicarla antes deja las altas caidas.       │
-- └──────────────────────────────────────────────────────────────────────────┘

-- 0024 — El marcador deja de publicar el UUID de cada usuario.
--
-- get_leaderboard() tiene `grant execute to anon` (0010) porque el Top 5 se pinta en la
-- pagina de inicio publica. Hasta aqui devolvia tambien `user_id`, asi que CUALQUIERA sin
-- sesion podia leer el identificador interno de todas las cuentas, no solo el apodo y los
-- puntos. El aviso de privacidad anterior afirmaba justo lo contrario.
--
-- Los tres clientes que usaban ese UUID lo usaban para lo mismo: saber cual fila es la
-- tuya (`soyYo` en RankingScreen, la posicion propia en RankingViewModel e InicioViewModel,
-- y el `isMe` de LeaderboardTabs). Eso lo resuelve un booleano calculado en el servidor
-- contra auth.uid(), sin exponer nada. Como clave de lista queda el apodo, que ya es unico
-- (citext unique) y ya es publico por definicion.
--
-- Para `anon` no hay sesion, asi que es_tu_fila es false en todas: correcto.
--
-- Hay que DROP y no `create or replace`: cambia el tipo de retorno.

drop function if exists public.get_leaderboard(text);

create or replace function public.get_leaderboard(p_period text default 'all')
returns table(username citext, points integer, es_tu_fila boolean)
language plpgsql stable security definer set search_path = public, extensions
as $$
declare
  v_tz constant text := 'America/Mexico_City';
  v_me uuid := auth.uid();
  v_local_date date;
  v_start timestamptz;
  v_end timestamptz;
  v_dow int;
  v_days_since_saturday int;
begin
  if p_period = 'all' then
    return query
      select p.username, p.total_points, (p.id = v_me)
      from public.profiles p
      where p.is_admin = false and p.username is not null
      order by p.total_points desc;
  else
    v_local_date := (now() at time zone v_tz)::date;

    if p_period = 'day' then
      v_start := (v_local_date::timestamp) at time zone v_tz;
      v_end := v_start + interval '1 day';
    elsif p_period = 'week' then
      v_dow := extract(dow from v_local_date)::int; -- 0=sun .. 6=sat
      v_days_since_saturday := (v_dow + 1) % 7; -- sat=0, sun=1, ..., fri=6
      v_start := ((v_local_date - v_days_since_saturday)::timestamp) at time zone v_tz;
      v_end := v_start + interval '7 days';
    else
      v_start := (date_trunc('month', v_local_date)::timestamp) at time zone v_tz;
      v_end := v_start + interval '1 month';
    end if;

    return query
      select p.username,
        sum((case when c.digital_awarded then 1 else 0 end) + (case when c.physical_awarded then 10 else 0 end))::int,
        (p.id = v_me)
      from public.coupons c join public.profiles p on p.id = c.user_id
      where c.created_at >= v_start and c.created_at < v_end
        and p.is_admin = false and p.username is not null
      group by p.id, p.username
      having sum((case when c.digital_awarded then 1 else 0 end) + (case when c.physical_awarded then 10 else 0 end)) > 0
      order by 2 desc;
  end if;
end;
$$;

comment on function public.get_leaderboard(text) is
  'Marcador publico. NO devuelve el id del usuario a proposito: es_tu_fila se calcula contra auth.uid() para que anon no pueda leer identificadores.';

-- Sigue siendo publica: el Top 5 se pinta en la home sin sesion.
revoke all on function public.get_leaderboard(text) from public;
grant execute on function public.get_leaderboard(text) to anon, authenticated;
