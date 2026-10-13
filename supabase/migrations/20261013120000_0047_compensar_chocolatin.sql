-- 0047 — Compensacion del incidente CHOCOLATIN (2026-10-12).
--
-- Al editar una dinamica, el panel web precargaba las fechas con la hora UTC como si fuera
-- de Mexico, y cada guardado las recorria 6 h hacia adelante. A las 6:08 pm (hora de Mexico)
-- se edito CHOCOLATIN para subirle el stock: su inicio quedo en el futuro y, hasta que el
-- dueno la cerro a las 8:07 pm, la palabra dejo de aceptarse ("Palabra incorrecta o
-- vencida"). El escaner siguio canjeando porque scan_coupon no mira starts_at.
--
-- Estos seis clientes lo intentaron en ese lapso, con sesion y sin cupon de CHOCOLATIN
-- (identificados en los registros de Supabase). En tienda si se les entrego el premio, asi
-- que reciben lo que les habria dado el flujo normal: el cupon, ya canjeado, y los 11 puntos
-- (+1 por generarlo, +10 por canjearlo). Las fechas son las de su primer intento, para que
-- los rankings por periodo, el desempate (0043) y Metricas lo cuenten como si hubiera
-- funcionado. physical_redeemed sube porque el premio fisico si salio del mostrador.
--
-- Va por apodo y no por UUID para no dejar ids internos en el repo; el apodo es unico y no
-- se puede cambiar. Es idempotente y en una base sin estas cuentas o sin CHOCOLATIN no hace
-- nada: los puntos solo se suman a los cupones que de verdad se insertan.

with afectados (username, intento) as (
  values
    ('Cosa08',     timestamptz '2026-10-13 00:13:31+00'),
    ('Gabriel',    timestamptz '2026-10-13 00:16:48+00'),
    ('yando',      timestamptz '2026-10-13 00:17:24+00'),
    ('Pati',       timestamptz '2026-10-13 00:17:26+00'),
    ('kendradura', timestamptz '2026-10-13 01:05:37+00'),
    ('Iker12',     timestamptz '2026-10-13 01:57:47+00')
),
insertados as (
  insert into public.coupons
    (user_id, dynamic_id, status, digital_awarded, physical_awarded, created_at, redeemed_at)
  select p.id, d.id, 'redeemed', true, true, a.intento, a.intento
  from afectados a
  join public.profiles p on p.username = a.username and p.role = 'cliente'
  join public.dynamics d on d.id = '94b59153-4a45-43cc-bac5-1504e7e17315'
  on conflict (user_id, dynamic_id) do nothing
  returning user_id
),
puntos as (
  update public.profiles p
    set total_points = p.total_points + 11
    from insertados i
    where p.id = i.user_id
  returning p.id
)
update public.dynamics
  set physical_redeemed = physical_redeemed + (select count(*) from insertados)
  where id = '94b59153-4a45-43cc-bac5-1504e7e17315';
