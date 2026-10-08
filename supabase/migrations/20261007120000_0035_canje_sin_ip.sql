-- 0035 — El canje deja de mirar la IP (parte A: la RPC nueva).
--
-- El tope de 3 canjes por IP por dinamica (0007/0008) existia para frenar cuentas en masa
-- cuando una cuenta costaba un apodo y una contrasena. Desde el 2026-09-30 una cuenta cuesta
-- un Gmail y un telefono unico e inmutable (0021), y el cupon sigue siendo uno por cuenta y
-- dinamica: el tope ya no protegia nada que no estuviera cubierto. Ademas nunca fue un candado
-- real: redeem_keyword se concede a authenticated, asi que cualquiera con sesion podia llamarla
-- sin pasar por la edge function y mandar un hash distinto cada vez. Y bajo CGNAT castigaba a
-- gente legitima que compartia la IP del carrier.
--
-- Se hace en dos migraciones para que ningun canje falle a mitad de un Live:
--   0035 (esta) crea redeem_keyword(p_keyword) junto a la vieja. Nada cambia todavia.
--   Se despliega redeem-keyword llamando a la nueva.
--   0036 borra la vieja y la tabla ip_redemption_logs con sus datos.
--
-- Fuera de la IP, el cuerpo es identico al de la 0017: mismas razones, mismo +1 punto.

create function public.redeem_keyword(p_keyword text)
returns jsonb
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_dynamic public.dynamics;
  v_coupon  public.coupons;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'reason', 'not_authenticated');
  end if;

  if not exists (select 1 from public.profiles where id = v_user_id and username is not null) then
    return jsonb_build_object('success', false, 'reason', 'no_username');
  end if;

  select * into v_dynamic from public.dynamics
    where keyword = p_keyword::citext and starts_at <= now() and ends_at > now()
    limit 1;
  if not found then
    return jsonb_build_object('success', false, 'reason', 'invalid');
  end if;

  if exists (select 1 from public.coupons where user_id = v_user_id and dynamic_id = v_dynamic.id) then
    return jsonb_build_object('success', false, 'reason', 'already_redeemed');
  end if;

  begin
    insert into public.coupons (user_id, dynamic_id, status, digital_awarded, physical_awarded)
      values (v_user_id, v_dynamic.id, 'active', true, false)
      returning * into v_coupon;
  exception when unique_violation then
    return jsonb_build_object('success', false, 'reason', 'already_redeemed');
  end;

  update public.profiles set total_points = total_points + 1 where id = v_user_id;

  return jsonb_build_object('success', true, 'coupon', to_jsonb(v_coupon));
end;
$$;

revoke all on function public.redeem_keyword(text) from public, anon;
grant execute on function public.redeem_keyword(text) to authenticated;
