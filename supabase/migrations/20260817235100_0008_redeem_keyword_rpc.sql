create or replace function public.redeem_keyword(p_keyword text, p_ip_hash text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_dynamic public.dynamics;
  v_coupon  public.coupons;
  v_ip_count int;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'reason', 'not_authenticated');
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

  insert into public.ip_redemption_logs (ip_hash, dynamic_id, count, first_seen, last_seen)
    values (p_ip_hash, v_dynamic.id, 1, now(), now())
  on conflict (ip_hash, dynamic_id) do update
    set count = public.ip_redemption_logs.count + 1, last_seen = now()
    where public.ip_redemption_logs.count < 3
  returning count into v_ip_count;
  if not found then
    return jsonb_build_object('success', false, 'reason', 'ip_limit');
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

revoke all on function public.redeem_keyword(text, text) from public;
grant execute on function public.redeem_keyword(text, text) to authenticated;
