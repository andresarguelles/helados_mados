-- 0045 — Metricas para el superadmin.
--
-- El panel /admin/metricas: cifras agregadas para entender la promocion y a los clientes, y
-- listas de clientes para ofrecerles promociones. Lo ve solo el superadmin, y el aviso de
-- privacidad 4.1.0 declara las dos finalidades.
--
-- Todo se calcula aqui y no en el navegador: el cliente recibe numeros y listas cortas, nunca
-- la tabla de perfiles ni la de cupones completas. Todas las funciones publicas empiezan
-- revisando is_superadmin() y reciben los mismos filtros:
--
--   p_desde, p_hasta   rango [desde, hasta)
--   p_dinamicas        uuid[] o null (= todas). Afecta lo que sale de cupones, no las altas.
--   p_segmento         'todos' | 'whatsapp' (dio permiso) | 'nuevos' (cuenta creada en el
--                      rango) | 'recurrentes' (2 o mas cupones antes del fin del rango)
--
-- Solo cuentan clientes (role = 'cliente'): el personal no es cliente. Dias y horas, en
-- America/Mexico_City. Un punto cuenta cuando se gana, como en el ranking (0039): el +1 al
-- canjear (created_at), el +10 al escanear (redeemed_at).

-- ─── Quien no quiere figurar en las listas ───────────────────────────────────
-- La finalidad "identificar clientes para ofrecerles promociones" es voluntaria: quien lo pide
-- por correo queda fuera de las listas (no de las cifras agregadas, que no identifican a nadie).
alter table public.profiles
  add column if not exists excluir_de_listas boolean not null default false;

comment on column public.profiles.excluir_de_listas is
  'Pidio no figurar en las listas de clientes del panel de metricas (finalidad voluntaria del aviso 4.1.0). Lo marca el superadmin con marcar_excluir_de_listas.';

create or replace function public.marcar_excluir_de_listas(p_usuario uuid, p_excluir boolean)
returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_superadmin() then
    return jsonb_build_object('success', false, 'reason', 'forbidden');
  end if;
  update public.profiles set excluir_de_listas = coalesce(p_excluir, false) where id = p_usuario;
  if not found then
    return jsonb_build_object('success', false, 'reason', 'not_found');
  end if;
  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.marcar_excluir_de_listas(uuid, boolean) from public, anon;
grant execute on function public.marcar_excluir_de_listas(uuid, boolean) to authenticated;

-- ─── Piezas internas (nadie de fuera las puede llamar) ───────────────────────
create or replace function public._metricas_segmento(p_desde timestamptz, p_hasta timestamptz, p_segmento text)
returns table(user_id uuid)
language sql stable set search_path = public
as $$
  select p.id
  from public.profiles p
  where p.role = 'cliente'
    and case coalesce(p_segmento, 'todos')
      when 'todos' then true
      when 'whatsapp' then p.whatsapp_opt_in
      when 'nuevos' then p.created_at >= p_desde and p.created_at < p_hasta
      when 'recurrentes' then
        (select count(*) from public.coupons c where c.user_id = p.id and c.created_at < p_hasta) >= 2
      else false
    end
$$;

create or replace function public._metricas_puntos(
  p_desde timestamptz, p_hasta timestamptz, p_dinamicas uuid[], p_segmento text
)
returns table(user_id uuid, dynamic_id uuid, tipo text, pts int, t timestamptz)
language sql stable set search_path = public
as $$
  with seg as (select s.user_id from public._metricas_segmento(p_desde, p_hasta, p_segmento) s)
  select c.user_id, c.dynamic_id, 'canje', 1, c.created_at
  from public.coupons c join seg on seg.user_id = c.user_id
  where c.digital_awarded and c.created_at >= p_desde and c.created_at < p_hasta
    and (p_dinamicas is null or c.dynamic_id = any(p_dinamicas))
  union all
  select c.user_id, c.dynamic_id, 'escaneo', 10, c.redeemed_at
  from public.coupons c join seg on seg.user_id = c.user_id
  where c.physical_awarded and c.redeemed_at >= p_desde and c.redeemed_at < p_hasta
    and (p_dinamicas is null or c.dynamic_id = any(p_dinamicas))
$$;

create or replace function public._metricas_kpis(
  p_desde timestamptz, p_hasta timestamptz, p_dinamicas uuid[], p_segmento text
)
returns jsonb
language sql stable set search_path = public
as $$
  with seg as (select s.user_id from public._metricas_segmento(p_desde, p_hasta, p_segmento) s),
  puntos as (select * from public._metricas_puntos(p_desde, p_hasta, p_dinamicas, p_segmento)),
  -- Cupones canjeados en el rango: la base de la conversion canje -> escaneo.
  cup as (
    select c.physical_awarded
    from public.coupons c join seg on seg.user_id = c.user_id
    where c.digital_awarded and c.created_at >= p_desde and c.created_at < p_hasta
      and (p_dinamicas is null or c.dynamic_id = any(p_dinamicas))
  )
  select jsonb_build_object(
    'altas', (select count(*) from public.profiles p join seg on seg.user_id = p.id
              where p.username is not null and p.created_at >= p_desde and p.created_at < p_hasta),
    'activos', (select count(distinct x.user_id) from puntos x),
    'canjes', (select count(*) from puntos x where x.tipo = 'canje'),
    'escaneos', (select count(*) from puntos x where x.tipo = 'escaneo'),
    'puntos', (select coalesce(sum(x.pts), 0) from puntos x),
    'conversion', (select case when count(*) = 0 then null
                          else round(100.0 * count(*) filter (where cup.physical_awarded) / count(*), 1) end
                   from cup),
    'mediana_horas', (
      select round((percentile_cont(0.5) within group (
               order by extract(epoch from c.redeemed_at - c.created_at) / 3600))::numeric, 1)
      from public.coupons c join seg on seg.user_id = c.user_id
      where c.physical_awarded and c.redeemed_at >= p_desde and c.redeemed_at < p_hasta
        and (p_dinamicas is null or c.dynamic_id = any(p_dinamicas))
    )
  )
$$;

revoke all on function public._metricas_segmento(timestamptz, timestamptz, text) from public, anon, authenticated;
revoke all on function public._metricas_puntos(timestamptz, timestamptz, uuid[], text) from public, anon, authenticated;
revoke all on function public._metricas_kpis(timestamptz, timestamptz, uuid[], text) from public, anon, authenticated;

-- ─── Resumen: KPIs del rango y del periodo anterior de igual duracion ───────
create or replace function public.metricas_resumen(
  p_desde timestamptz, p_hasta timestamptz, p_dinamicas uuid[] default null, p_segmento text default 'todos'
)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_dur interval;
begin
  if not public.is_superadmin() then
    return jsonb_build_object('success', false, 'reason', 'forbidden');
  end if;
  if p_desde is null or p_hasta is null or p_desde >= p_hasta then
    return jsonb_build_object('success', false, 'reason', 'invalid');
  end if;
  v_dur := p_hasta - p_desde;

  return jsonb_build_object(
    'success', true,
    'actual', public._metricas_kpis(p_desde, p_hasta, p_dinamicas, p_segmento),
    'anterior', public._metricas_kpis(p_desde - v_dur, p_desde, p_dinamicas, p_segmento),
    -- Foto de hoy del segmento: que datos opcionales nos han dado.
    'perfil', (
      select jsonb_build_object(
        'clientes', count(*),
        'con_whatsapp', count(*) filter (where p.whatsapp_opt_in),
        'con_telefono', count(*) filter (where p.phone is not null),
        'con_cumple', count(*) filter (where p.birthday_month is not null),
        'con_nombre', count(*) filter (where p.first_name is not null)
      )
      from public.profiles p
      join public._metricas_segmento(p_desde, p_hasta, p_segmento) s on s.user_id = p.id
      where p.username is not null
    )
  );
end;
$$;

-- ─── Serie: altas, canjes, escaneos y activos por dia, semana o mes ─────────
create or replace function public.metricas_serie(
  p_desde timestamptz, p_hasta timestamptz, p_dinamicas uuid[] default null,
  p_segmento text default 'todos', p_granularidad text default 'day'
)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_tz constant text := 'America/Mexico_City';
  v_paso interval;
begin
  if not public.is_superadmin() then
    return jsonb_build_object('success', false, 'reason', 'forbidden');
  end if;
  if p_desde is null or p_hasta is null or p_desde >= p_hasta
     or p_granularidad is null or p_granularidad not in ('day', 'week', 'month') then
    return jsonb_build_object('success', false, 'reason', 'invalid');
  end if;
  -- Un rango de anios por dia seria una grafica ilegible y una consulta inutil.
  if p_granularidad = 'day' and p_hasta - p_desde > interval '400 days' then
    return jsonb_build_object('success', false, 'reason', 'rango_grande');
  end if;
  v_paso := case p_granularidad when 'day' then interval '1 day' when 'week' then interval '1 week' else interval '1 month' end;

  return jsonb_build_object('success', true, 'serie', coalesce((
    with seg as (select s.user_id from public._metricas_segmento(p_desde, p_hasta, p_segmento) s),
    puntos as (select * from public._metricas_puntos(p_desde, p_hasta, p_dinamicas, p_segmento)),
    cubetas as (
      select generate_series(
        date_trunc(p_granularidad, p_desde at time zone v_tz),
        (p_hasta - interval '1 microsecond') at time zone v_tz,
        v_paso
      ) as cubeta
    ),
    altas as (
      select date_trunc(p_granularidad, p.created_at at time zone v_tz) as cubeta, count(*) as n
      from public.profiles p join seg on seg.user_id = p.id
      where p.username is not null and p.created_at >= p_desde and p.created_at < p_hasta
      group by 1
    ),
    act as (
      select date_trunc(p_granularidad, x.t at time zone v_tz) as cubeta,
             count(*) filter (where x.tipo = 'canje') as canjes,
             count(*) filter (where x.tipo = 'escaneo') as escaneos,
             count(distinct x.user_id) as activos
      from puntos x
      group by 1
    )
    select jsonb_agg(jsonb_build_object(
             'cubeta', to_char(c.cubeta, 'YYYY-MM-DD'),
             'altas', coalesce(a.n, 0),
             'canjes', coalesce(x.canjes, 0),
             'escaneos', coalesce(x.escaneos, 0),
             'activos', coalesce(x.activos, 0)
           ) order by c.cubeta)
    from cubetas c
    left join altas a on a.cubeta = c.cubeta
    left join act x on x.cubeta = c.cubeta
  ), '[]'::jsonb));
end;
$$;

-- ─── Horarios: dia de la semana x hora ──────────────────────────────────────
create or replace function public.metricas_horarios(
  p_desde timestamptz, p_hasta timestamptz, p_dinamicas uuid[] default null, p_segmento text default 'todos'
)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_tz constant text := 'America/Mexico_City';
begin
  if not public.is_superadmin() then
    return jsonb_build_object('success', false, 'reason', 'forbidden');
  end if;
  if p_desde is null or p_hasta is null or p_desde >= p_hasta then
    return jsonb_build_object('success', false, 'reason', 'invalid');
  end if;

  return jsonb_build_object('success', true, 'celdas', coalesce((
    select jsonb_agg(jsonb_build_object('dia', h.dia, 'hora', h.hora, 'canjes', h.canjes, 'escaneos', h.escaneos))
    from (
      -- dia: 1 = lunes ... 7 = domingo (isodow).
      select extract(isodow from x.t at time zone v_tz)::int as dia,
             extract(hour from x.t at time zone v_tz)::int as hora,
             count(*) filter (where x.tipo = 'canje') as canjes,
             count(*) filter (where x.tipo = 'escaneo') as escaneos
      from public._metricas_puntos(p_desde, p_hasta, p_dinamicas, p_segmento) x
      group by 1, 2
    ) h
  ), '[]'::jsonb));
end;
$$;

-- ─── Dinamicas: desempeno de cada una en el rango ───────────────────────────
create or replace function public.metricas_dinamicas(
  p_desde timestamptz, p_hasta timestamptz, p_dinamicas uuid[] default null, p_segmento text default 'todos'
)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_superadmin() then
    return jsonb_build_object('success', false, 'reason', 'forbidden');
  end if;
  if p_desde is null or p_hasta is null or p_desde >= p_hasta then
    return jsonb_build_object('success', false, 'reason', 'invalid');
  end if;

  return jsonb_build_object('success', true, 'dinamicas', coalesce((
    with seg as (select s.user_id from public._metricas_segmento(p_desde, p_hasta, p_segmento) s),
    -- El primer cupon de cada cliente: para saber cuantos llegaron por esta dinamica.
    primeros as (
      select distinct on (c.user_id) c.id
      from public.coupons c
      order by c.user_id, c.created_at, c.id
    ),
    d as (
      select * from public.dynamics
      where (p_dinamicas is null or id = any(p_dinamicas))
        and starts_at < p_hasta and ends_at > p_desde
    )
    select jsonb_agg(jsonb_build_object(
      'id', d.id,
      'keyword', d.keyword,
      'premio', d.prize_label,
      'inicia', d.starts_at,
      'termina', d.ends_at,
      'existencias', d.physical_stock,
      'entregados', d.physical_redeemed,
      'canjes', k.canjes,
      'escaneos', k.escaneos,
      'conversion', case when k.canjes = 0 then null
                         else round(100.0 * k.canjes_escaneados / k.canjes, 1) end,
      'pct_nuevos', case when k.canjes = 0 then null
                         else round(100.0 * k.canjes_nuevos / k.canjes, 1) end,
      'mediana_horas', k.mediana_horas,
      -- El escaneo que se llevo la ultima pieza, si ya se agotaron.
      'agotado_en', case when d.physical_stock > 0 and d.physical_redeemed >= d.physical_stock then (
        select c.redeemed_at from public.coupons c
        where c.dynamic_id = d.id and c.physical_awarded
        order by c.redeemed_at offset d.physical_stock - 1 limit 1
      ) end
    ) order by d.starts_at desc)
    from d
    cross join lateral (
      select
        count(*) filter (where c.digital_awarded and c.created_at >= p_desde and c.created_at < p_hasta) as canjes,
        count(*) filter (where c.digital_awarded and c.created_at >= p_desde and c.created_at < p_hasta
                           and c.physical_awarded) as canjes_escaneados,
        count(*) filter (where c.digital_awarded and c.created_at >= p_desde and c.created_at < p_hasta
                           and c.id in (select id from primeros)) as canjes_nuevos,
        count(*) filter (where c.physical_awarded and c.redeemed_at >= p_desde and c.redeemed_at < p_hasta) as escaneos,
        round((percentile_cont(0.5) within group (order by extract(epoch from c.redeemed_at - c.created_at) / 3600)
               filter (where c.physical_awarded and c.redeemed_at >= p_desde and c.redeemed_at < p_hasta))::numeric, 1)
          as mediana_horas
      from public.coupons c join seg on seg.user_id = c.user_id
      where c.dynamic_id = d.id
    ) k
  ), '[]'::jsonb));
end;
$$;

-- ─── Clientes: embudo, frecuencia, cohortes y cumpleanios ───────────────────
create or replace function public.metricas_clientes(
  p_desde timestamptz, p_hasta timestamptz, p_dinamicas uuid[] default null, p_segmento text default 'todos'
)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_tz constant text := 'America/Mexico_City';
begin
  if not public.is_superadmin() then
    return jsonb_build_object('success', false, 'reason', 'forbidden');
  end if;
  if p_desde is null or p_hasta is null or p_desde >= p_hasta then
    return jsonb_build_object('success', false, 'reason', 'invalid');
  end if;

  return jsonb_build_object(
    'success', true,

    -- Embudo de las cuentas creadas en el rango: cuantas llegaron a cada paso (hasta hoy).
    'embudo', (
      with cohorte as (
        select p.id, p.username
        from public.profiles p
        join public._metricas_segmento(p_desde, p_hasta, p_segmento) s on s.user_id = p.id
        where p.created_at >= p_desde and p.created_at < p_hasta
      ),
      uso as (
        select co.id, co.username,
               (select count(*) from public.coupons c where c.user_id = co.id) as cupones,
               (select count(*) from public.coupons c where c.user_id = co.id and c.physical_awarded) as escaneos
        from cohorte co
      )
      select jsonb_build_object(
        'cuentas', count(*),
        'con_alta', count(*) filter (where u.username is not null),
        'con_canje', count(*) filter (where u.cupones > 0),
        'con_escaneo', count(*) filter (where u.escaneos > 0),
        'recurrentes', count(*) filter (where u.escaneos >= 2)
      )
      from uso u
    ),

    -- Cuantas palabras canjeo cada cliente activo en el rango.
    'frecuencia', coalesce((
      select jsonb_agg(jsonb_build_object('rango', f.rango, 'clientes', f.n) order by f.orden)
      from (
        select case when k = 1 then '1' when k = 2 then '2' when k <= 5 then '3-5'
                    when k <= 10 then '6-10' else '11+' end as rango,
               case when k = 1 then 1 when k = 2 then 2 when k <= 5 then 3 when k <= 10 then 4 else 5 end as orden,
               count(*) as n
        from (
          select x.user_id, count(*) as k
          from public._metricas_puntos(p_desde, p_hasta, p_dinamicas, p_segmento) x
          where x.tipo = 'canje'
          group by x.user_id
        ) u
        group by 1, 2
      ) f
    ), '[]'::jsonb),

    -- Retencion por semana de alta (lunes): de los que se dieron de alta esa semana, que
    -- porcentaje gano algun punto 0, 1, 2... 8 semanas despues. Las 12 cohortes mas recientes.
    'cohortes', coalesce((
      with coh as (
        select p.id, date_trunc('week', p.created_at at time zone v_tz) as semana
        from public.profiles p
        join public._metricas_segmento(p_desde, p_hasta, p_segmento) s on s.user_id = p.id
        where p.username is not null and p.created_at >= p_desde and p.created_at < p_hasta
      ),
      act as (
        select distinct c.user_id, date_trunc('week', c.created_at at time zone v_tz) as semana
        from public.coupons c join coh on coh.id = c.user_id where c.digital_awarded
        union
        select distinct c.user_id, date_trunc('week', c.redeemed_at at time zone v_tz)
        from public.coupons c join coh on coh.id = c.user_id where c.physical_awarded
      ),
      tam as (
        select semana, count(*) as n from coh group by semana order by semana desc limit 12
      )
      select jsonb_agg(jsonb_build_object(
        'semana', to_char(t.semana, 'YYYY-MM-DD'),
        'clientes', t.n,
        'retencion', (
          select jsonb_agg(round(100.0 * (
                   select count(distinct coh.id) from coh join act a on a.user_id = coh.id
                   where coh.semana = t.semana and a.semana = t.semana + make_interval(weeks => k)
                 ) / t.n, 1) order by k)
          from generate_series(0, 8) k
          where t.semana + make_interval(weeks => k) <= date_trunc('week', now() at time zone v_tz)
        )
      ) order by t.semana)
      from tam t
    ), '[]'::jsonb),

    -- Cuantos clientes cumplen anios cada mes (de quienes nos lo dieron).
    'cumpleanos_por_mes', coalesce((
      select jsonb_agg(jsonb_build_object('mes', m.mes, 'clientes', m.n) order by m.mes)
      from (
        select p.birthday_month as mes, count(*) as n
        from public.profiles p
        join public._metricas_segmento(p_desde, p_hasta, p_segmento) s on s.user_id = p.id
        where p.username is not null and p.birthday_month is not null
        group by 1
      ) m
    ), '[]'::jsonb)
  );
end;
$$;

-- ─── Listas: quienes son, para ofrecerles promociones ───────────────────────
-- Finalidad voluntaria del aviso 4.1.0: quien pidio no figurar (`excluir_de_listas`) no sale.
-- El telefono solo se entrega si el cliente dio permiso de WhatsApp.
create or replace function public.metricas_lista(
  p_lista text, p_desde timestamptz, p_hasta timestamptz, p_dinamicas uuid[] default null,
  p_segmento text default 'todos', p_limite int default 50
)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_tz constant text := 'America/Mexico_City';
  v_hoy date := (now() at time zone v_tz)::date;
  v_limite int := least(greatest(coalesce(p_limite, 50), 1), 200);
begin
  if not public.is_superadmin() then
    return jsonb_build_object('success', false, 'reason', 'forbidden');
  end if;
  if p_desde is null or p_hasta is null or p_desde >= p_hasta
     or p_lista is null or p_lista not in ('top', 'en_riesgo', 'cumpleanos', 'nuevos') then
    return jsonb_build_object('success', false, 'reason', 'invalid');
  end if;

  return (
    with seg as (select s.user_id from public._metricas_segmento(p_desde, p_hasta, p_segmento) s),
    periodo as (
      select x.user_id, sum(x.pts) as pts
      from public._metricas_puntos(p_desde, p_hasta, p_dinamicas, p_segmento) x
      group by x.user_id
    ),
    base as (
      select p.id, p.username, p.total_points, p.created_at, p.whatsapp_opt_in,
             case when p.whatsapp_opt_in then p.phone end as telefono,
             p.birthday_month, p.birthday_day,
             coalesce(per.pts, 0) as puntos_periodo,
             (select count(*) from public.coupons c where c.user_id = p.id) as cupones,
             (select max(greatest(case when c.digital_awarded then c.created_at end,
                                  case when c.physical_awarded then c.redeemed_at end))
              from public.coupons c where c.user_id = p.id) as ultimo_punto,
             -- Dias hasta su proximo cumpleanios. Se calcula en el anio 2000, que es bisiesto,
             -- para que el 29 de febrero exista siempre.
             case when p.birthday_month is not null then
               ((make_date(2000, p.birthday_month, p.birthday_day)
                 - make_date(2000, extract(month from v_hoy)::int, extract(day from v_hoy)::int))
                + 366) % 366
             end as dias_para_cumple
      from public.profiles p
      join seg on seg.user_id = p.id
      left join periodo per on per.user_id = p.id
      where p.username is not null and not p.excluir_de_listas
    ),
    elegidos as (
      select * from base b
      where case p_lista
        when 'top' then b.puntos_periodo > 0
        when 'en_riesgo' then b.cupones >= 2 and b.ultimo_punto < now() - interval '21 days'
        when 'cumpleanos' then b.dias_para_cumple is not null and b.dias_para_cumple <= 30
        when 'nuevos' then b.created_at >= p_desde and b.created_at < p_hasta
      end
    ),
    ordenados as (
      select e.*, row_number() over (order by
        case when p_lista = 'top' then -e.puntos_periodo end,
        case when p_lista = 'top' then e.ultimo_punto end,
        case when p_lista = 'en_riesgo' then -e.total_points end,
        case when p_lista = 'cumpleanos' then e.dias_para_cumple end,
        case when p_lista = 'nuevos' then e.created_at end desc,
        e.username
      ) as rn
      from elegidos e
    )
    select jsonb_build_object(
      'success', true,
      'total', (select count(*) from elegidos),
      'filas', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', o.id,
          'username', o.username,
          'puntos_periodo', o.puntos_periodo,
          'total_points', o.total_points,
          'cupones', o.cupones,
          'ultimo_punto', o.ultimo_punto,
          'alta', o.created_at,
          'whatsapp', o.whatsapp_opt_in,
          'telefono', o.telefono,
          'cumple_mes', o.birthday_month,
          'cumple_dia', o.birthday_day,
          'dias_para_cumple', o.dias_para_cumple
        ) order by o.rn)
        from ordenados o
        where o.rn <= v_limite
      ), '[]'::jsonb)
    )
  );
end;
$$;

-- ─── Permisos: las publicas, solo con sesion (y adentro, solo el superadmin) ─
revoke all on function public.metricas_resumen(timestamptz, timestamptz, uuid[], text) from public, anon;
revoke all on function public.metricas_serie(timestamptz, timestamptz, uuid[], text, text) from public, anon;
revoke all on function public.metricas_horarios(timestamptz, timestamptz, uuid[], text) from public, anon;
revoke all on function public.metricas_dinamicas(timestamptz, timestamptz, uuid[], text) from public, anon;
revoke all on function public.metricas_clientes(timestamptz, timestamptz, uuid[], text) from public, anon;
revoke all on function public.metricas_lista(text, timestamptz, timestamptz, uuid[], text, int) from public, anon;
grant execute on function public.metricas_resumen(timestamptz, timestamptz, uuid[], text) to authenticated;
grant execute on function public.metricas_serie(timestamptz, timestamptz, uuid[], text, text) to authenticated;
grant execute on function public.metricas_horarios(timestamptz, timestamptz, uuid[], text) to authenticated;
grant execute on function public.metricas_dinamicas(timestamptz, timestamptz, uuid[], text) to authenticated;
grant execute on function public.metricas_clientes(timestamptz, timestamptz, uuid[], text) to authenticated;
grant execute on function public.metricas_lista(text, timestamptz, timestamptz, uuid[], text, int) to authenticated;
