-- Import/export confirmation uses the same server-held PIN hash as Update Stock.
create or replace function public.verify_pallet_transfer_pin(p_pin text) returns boolean
language plpgsql security definer set search_path='' as $$
declare configured_hash text;
begin
 if not public.has_menu_access('floorplan') then
  raise exception 'ไม่มีสิทธิ์ Import/Export พาเลท' using errcode='42501';
 end if;
 if p_pin is null or length(p_pin) not between 1 and 128 then
  raise exception 'รหัสยืนยันไม่ถูกต้อง' using errcode='22023';
 end if;
 select pin_hash into configured_hash from public.stock_inventory_settings where singleton;
 if configured_hash is null then raise exception 'ยังไม่ได้ตั้งรหัส Update Stock'; end if;
 if extensions.crypt(p_pin,configured_hash) is distinct from configured_hash then
  raise exception 'รหัสยืนยันไม่ถูกต้อง' using errcode='22023';
 end if;
 return true;
end;
$$;
revoke all on function public.verify_pallet_transfer_pin(text) from public,anon,authenticated;
grant execute on function public.verify_pallet_transfer_pin(text) to authenticated;

create or replace function public.import_pallet_changes(p_pin text,p_slots jsonb,p_dates jsonb default '[]') returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform public.verify_pallet_transfer_pin(p_pin);
 -- Existing permission, validation, optimistic versions and audit remain authoritative.
 return public.save_pallet_changes(p_slots,p_dates);
end;
$$;
revoke all on function public.import_pallet_changes(text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.import_pallet_changes(text,jsonb,jsonb) to authenticated;
