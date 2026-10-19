-- Receipt plans are reference data, separate from actual receipts and stock.
begin;
create table if not exists public.pk_receipt_plan_snapshots (
  id bigint generated always as identity primary key,
  rows jsonb not null check (jsonb_typeof(rows) = 'array'),
  source_url text not null,
  source_note text not null,
  source_sha256 text not null unique check (source_sha256 ~ '^[0-9a-f]{64}$'),
  imported_at timestamptz not null default now()
);
alter table public.pk_receipt_plan_snapshots enable row level security;
revoke all on public.pk_receipt_plan_snapshots from public, anon, authenticated;
create or replace function public.get_pk_receipt_plan() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_menu_access('receipt-plan') then
    raise exception 'ไม่มีสิทธิ์ดูแผนรับเข้า' using errcode = '42501';
  end if;
  return (select jsonb_build_object('rows',rows,'source_url',source_url,
    'source_note',source_note,'source_sha256',source_sha256,'imported_at',imported_at)
    from public.pk_receipt_plan_snapshots order by id desc limit 1);
end;
$$;
revoke all on function public.get_pk_receipt_plan() from public, anon, authenticated;
grant execute on function public.get_pk_receipt_plan() to authenticated;
notify pgrst, 'reload schema';
commit;
