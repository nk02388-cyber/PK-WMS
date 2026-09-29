-- Narrow public catalog for the separate Withdrawal Skill Matrix app.
-- Exposes codes, names, units and snapshot freshness; never quantities or values.
create or replace function public.get_withdrawal_stock_catalog()
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'snapshot_id', snapshot.id,
    'report_date', snapshot.report_date,
    'snapshot_saved_at', snapshot.created_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', item.code, 'name', item.name, 'unit', item.unit,
        'unit_conflict', item.unit_count > 1
      ) order by item.code)
      from (
        select upper(trim(row.code)) as code,
          min(trim(row.name)) as name,
          min(trim(row.unit)) as unit,
          count(distinct trim(row.unit)) as unit_count
        from jsonb_to_recordset(snapshot.stock_data->'items')
          as row(code text, name text, unit text)
        where trim(coalesce(row.code,'')) <> ''
          and trim(coalesce(row.name,'')) <> ''
          and trim(coalesce(row.unit,'')) <> ''
        group by upper(trim(row.code))
      ) item
    ), '[]'::jsonb)
  )
  from (
    select id, report_date, created_at, stock_data
    from public.stock_inventory_snapshots order by id desc limit 1
  ) snapshot;
$$;
revoke all on function public.get_withdrawal_stock_catalog() from public, anon, authenticated;
grant execute on function public.get_withdrawal_stock_catalog() to anon, authenticated;
notify pgrst, 'reload schema';
