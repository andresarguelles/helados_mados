create or replace function public.scan_coupon(p_coupon_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_coupon  public.coupons;
  v_dynamic public.dynamics;
  v_profile public.profiles;
begin
  if not public.is_admin() then
    return jsonb_build_object('success', false, 'reason', 'forbidden');
  end if;

  select * into v_coupon from public.coupons where id = p_coupon_id for update;
  if not found then
    return jsonb_build_object('success', false, 'reason', 'not_found');
  end if;
  if v_coupon.status = 'redeemed' or v_coupon.physical_awarded then
    return jsonb_build_object('success', false, 'reason', 'already_used');
  end if;

  select * into v_dynamic from public.dynamics where id = v_coupon.dynamic_id for update;
  if not found then
    return jsonb_build_object('success', false, 'reason', 'not_found');
  end if;

  if v_dynamic.ends_at < now() then
    update public.coupons set status = 'expired' where id = p_coupon_id;
    return jsonb_build_object('success', false, 'reason', 'expired');
  end if;
  if v_dynamic.physical_redeemed >= v_dynamic.physical_stock then
    return jsonb_build_object('success', false, 'reason', 'stock_empty');
  end if;

  update public.coupons
    set status = 'redeemed', physical_awarded = true, redeemed_at = now()
    where id = p_coupon_id;
  update public.dynamics set physical_redeemed = physical_redeemed + 1
    where id = v_dynamic.id returning * into v_dynamic;
  update public.profiles set total_points = total_points + 10
    where id = v_coupon.user_id returning * into v_profile;

  return jsonb_build_object('success', true, 'user', to_jsonb(v_profile), 'dynamic', to_jsonb(v_dynamic));
end;
$$;

revoke all on function public.scan_coupon(uuid) from public;
grant execute on function public.scan_coupon(uuid) to authenticated;
