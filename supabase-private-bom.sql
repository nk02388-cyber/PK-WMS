-- Legacy BOM is imported as an immutable baseline without guessing FG units or merging lines.
-- The import payload is kept in an ignored private archive, never in public SQL/static assets.
begin;
create table if not exists public.pk_bom_baselines (
 id uuid primary key default gen_random_uuid(),
 source_sha256 text not null unique check(source_sha256 ~ '^[0-9a-f]{64}$'),
 bom_data jsonb not null,
 ready boolean not null default false,
 created_at timestamptz not null default now()
);
alter table public.pk_bom_baselines enable row level security;
revoke all on public.pk_bom_baselines from public,anon,authenticated;
create or replace function public.get_pk_bom_baseline() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not (public.has_menu_access('bompk') or public.has_menu_access('bom-plan')
   or exists(select 1 from public.app_users where id=(select auth.uid()) and active and role='admin')) then
  raise exception 'ไม่มีสิทธิ์ดู BOM' using errcode='42501';
 end if;
 return (select bom_data || jsonb_build_object('source_sha256',source_sha256)
   from public.pk_bom_baselines where ready order by created_at desc limit 1);
end;
$$;
revoke all on function public.get_pk_bom_baseline() from public,anon,authenticated;
grant execute on function public.get_pk_bom_baseline() to authenticated;
notify pgrst,'reload schema';
commit;
