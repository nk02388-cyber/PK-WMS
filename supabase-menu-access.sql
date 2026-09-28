-- Apply after supabase-user-login.sql. Existing staff retain their current access;
-- newly created staff receive only the menus explicitly assigned by Admin.
begin;

alter table public.app_users add column if not exists menu_access text[] not null default array[
  'stock','incoming','floorplan','product-history','reorder','bompk','bom-plan',
  'reconcile','cycle-counts','scrap','print-labels','daily-receive','daily-issue',
  'receipt-plan','audit']::text[];

create or replace function public.has_menu_access(p_menu text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.app_users p
    where p.id = (select auth.uid()) and p.active
      and (p.role = 'admin' or (p.role = 'user' and p_menu = any(p.menu_access)))
  );
$$;
revoke all on function public.has_menu_access(text) from public, anon, authenticated;
grant execute on function public.has_menu_access(text) to authenticated;

drop policy if exists pallet_read on public.pallet_slots;
create policy pallet_read on public.pallet_slots for select to authenticated using (
  public.has_menu_access('stock') or public.has_menu_access('floorplan') or public.has_menu_access('product-history')
  or public.has_menu_access('reconcile') or public.has_menu_access('cycle-counts')
  or public.has_menu_access('scrap') or public.has_menu_access('print-labels')
  or public.has_menu_access('daily-receive') or public.has_menu_access('daily-issue')
  or public.has_menu_access('audit'));
drop policy if exists incoming_pallets_read on public.incoming_pallets;
create policy incoming_pallets_read on public.incoming_pallets for select to authenticated using (
  public.has_menu_access('incoming') or public.has_menu_access('daily-receive'));
drop policy if exists pallet_audit_read on public.pallet_audit_log;
create policy pallet_audit_read on public.pallet_audit_log for select to authenticated using (
  public.has_menu_access('audit') or public.has_menu_access('product-history'));
drop policy if exists receive_read on public.receive_dates;
create policy receive_read on public.receive_dates for select to authenticated using (
  public.has_menu_access('stock') or public.has_menu_access('floorplan') or public.has_menu_access('product-history')
  or public.has_menu_access('reconcile') or public.has_menu_access('cycle-counts')
  or public.has_menu_access('scrap'));

-- Replace the existing active-account checks without changing the transaction logic.
do $$
declare routine record; original text; guarded text; definition text; allowed text;
begin
  for routine in
    select p.oid, p.proname, p.prosrc from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'save_pallet_changes', 'create_incoming_pallet', 'create_incoming_batch',
      'putaway_incoming_pallet', 'replace_stock_inventory')
  loop
    allowed := case routine.proname
      when 'save_pallet_changes' then
        '(public.has_menu_access(''floorplan'') or public.has_menu_access(''scrap''))'
      when 'replace_stock_inventory' then 'public.has_menu_access(''stock'')'
      else 'public.has_menu_access(''incoming'')' end;
    original := routine.prosrc;
    guarded := replace(original, 'if not public.is_app_user() then',
      'if not ' || allowed || ' then');
    if guarded = original then raise exception 'Menu guard not found in %', routine.proname; end if;
    definition := pg_get_functiondef(routine.oid);
    if strpos(definition, original) = 0 then raise exception 'Could not rebuild %', routine.proname; end if;
    execute replace(definition, original, guarded);
  end loop;
end $$;

create or replace function public.get_latest_stock_inventory()
returns jsonb language sql stable security definer set search_path = '' as $$
  select stock_data || jsonb_build_object('snapshot_saved_at', created_at)
  from public.stock_inventory_snapshots
  where public.has_menu_access('stock') or public.has_menu_access('reorder')
     or public.has_menu_access('bompk') or public.has_menu_access('bom-plan')
     or public.has_menu_access('reconcile')
  order by id desc limit 1;
$$;
revoke all on function public.get_latest_stock_inventory() from public, anon;
grant execute on function public.get_latest_stock_inventory() to authenticated;
notify pgrst, 'reload schema';
commit;
