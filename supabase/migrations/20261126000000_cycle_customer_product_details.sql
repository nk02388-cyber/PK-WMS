-- Retain product descriptions from the customer SKU workbook so products
-- without a current pallet location can still be listed for handwritten counts.
alter table private.pk_customer_skus
  add column if not exists product_name text not null default '',
  add column if not exists unit text not null default '';

create or replace function public.get_cycle_customer_skus()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null
    or not coalesce(public.has_menu_access('print-labels'), false) then
    raise exception 'ไม่มีสิทธิ์เข้าถึงกลุ่มลูกค้าสำหรับพิมพ์ Cycle Count'
      using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'customer_name', groups.customer_name,
        'product_codes', groups.product_codes,
        'product_details', groups.product_details
      ) order by groups.customer_name
    )
    from (
      select customer_name,
        jsonb_agg(product_code order by product_code) as product_codes,
        jsonb_agg(jsonb_build_object(
          'product_code', product_code,
          'product_name', product_name,
          'unit', unit
        ) order by product_code) as product_details
      from private.pk_customer_skus
      group by customer_name
    ) as groups
  ), '[]'::jsonb);
end;
$function$;

revoke all on function public.get_cycle_customer_skus() from public, anon, authenticated;
grant execute on function public.get_cycle_customer_skus() to authenticated;
