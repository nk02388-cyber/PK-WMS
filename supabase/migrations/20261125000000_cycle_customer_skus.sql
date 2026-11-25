-- Keep customer-to-SKU mapping outside exposed schemas. Access is through an
-- authenticated RPC that checks the existing PK WMS menu permission.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated, service_role;

create table if not exists private.pk_customer_skus (
  customer_name text not null check (btrim(customer_name) <> ''),
  product_code text not null check (btrim(product_code) <> ''),
  primary key (customer_name, product_code)
);

alter table private.pk_customer_skus enable row level security;
revoke all on table private.pk_customer_skus from public, anon, authenticated, service_role;
create policy pk_customer_skus_deny_direct_access
  on private.pk_customer_skus for all to anon, authenticated
  using (false) with check (false);

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
      jsonb_build_object('customer_name', groups.customer_name, 'product_codes', groups.product_codes)
      order by groups.customer_name
    )
    from (
      select customer_name, jsonb_agg(product_code order by product_code) as product_codes
      from private.pk_customer_skus
      group by customer_name
    ) as groups
  ), '[]'::jsonb);
end;
$function$;

revoke all on function public.get_cycle_customer_skus() from public, anon, authenticated;
grant execute on function public.get_cycle_customer_skus() to authenticated;
