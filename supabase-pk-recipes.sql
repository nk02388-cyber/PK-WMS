-- Packaging recipes: apply after supabase-menu-access.sql.
-- Existing embedded BOMs remain a fallback; this migration does not import or alter them.
begin;
create table if not exists public.pk_recipes (
  fg_code text primary key check (length(fg_code) between 1 and 120 and fg_code = upper(btrim(fg_code))),
  fg_name text not null check (length(btrim(fg_name)) between 1 and 500),
  base_qty numeric(24,9) not null check (base_qty >= 0.000000001 and base_qty < 1000000000000),
  fg_unit text not null check (length(btrim(fg_unit)) between 1 and 40),
  version integer not null check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  updated_username text not null
);
create index if not exists pk_recipes_updated_by_idx on public.pk_recipes(updated_by);
create table if not exists public.pk_recipe_lines (
  fg_code text not null references public.pk_recipes(fg_code) on delete cascade,
  line_no integer not null check (line_no between 1 and 500),
  pk_code text not null check (length(pk_code) between 1 and 120 and pk_code = upper(btrim(pk_code))),
  pk_name text not null check (length(btrim(pk_name)) between 1 and 500),
  qty numeric(24,9) not null check (qty >= 0.000000001 and qty < 1000000000000),
  unit text not null check (length(btrim(unit)) between 1 and 40),
  primary key(fg_code, line_no),
  unique(fg_code, pk_code)
);
create table if not exists public.pk_recipe_versions (
  fg_code text not null references public.pk_recipes(fg_code) on delete restrict,
  version integer not null,
  recipe jsonb not null,
  saved_at timestamptz not null default now(),
  saved_by uuid references auth.users(id) on delete set null,
  saved_username text not null,
  primary key(fg_code, version)
);
create index if not exists pk_recipe_versions_saved_by_idx on public.pk_recipe_versions(saved_by);
alter table public.pk_recipes enable row level security;
alter table public.pk_recipe_lines enable row level security;
alter table public.pk_recipe_versions enable row level security;
revoke all on public.pk_recipes, public.pk_recipe_lines, public.pk_recipe_versions from anon, authenticated;

create or replace function public.get_pk_recipes() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.has_menu_access('bompk') or public.has_menu_access('bom-plan')) then
    raise exception 'ไม่มีสิทธิ์ดูสูตรบรรจุภัณฑ์' using errcode = '42501';
  end if;
  return coalesce((select jsonb_agg(to_jsonb(r) || jsonb_build_object('lines',
    (select jsonb_agg(to_jsonb(l) order by l.line_no) from public.pk_recipe_lines l where l.fg_code=r.fg_code))
    order by r.fg_code) from public.pk_recipes r), '[]'::jsonb);
end;
$$;
create or replace function public.save_pk_recipe(p_recipe jsonb, p_expected_version integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor text; code text; old_version integer; new_version integer;
  header public.pk_recipes; line jsonb; n integer := 0; result jsonb;
begin
  select username into actor from public.app_users
    where id=(select auth.uid()) and active and role='admin';
  if actor is null then raise exception 'เฉพาะ Admin ที่บันทึกสูตรได้' using errcode='42501'; end if;
  if p_expected_version is null or p_expected_version < 0 then raise exception 'เวอร์ชันไม่ถูกต้อง'; end if;
  if p_recipe is null or jsonb_typeof(p_recipe) <> 'object'
    or jsonb_typeof(p_recipe->'lines') is distinct from 'array' then raise exception 'รูปแบบสูตรไม่ถูกต้อง'; end if;
  if jsonb_array_length(p_recipe->'lines') not between 1 and 500 then raise exception 'สูตรต้องมี 1–500 ส่วนประกอบ'; end if;
  if (p_recipe->>'base_qty')::numeric <> trunc((p_recipe->>'base_qty')::numeric,9) then raise exception 'จำนวน FG มีทศนิยมได้ไม่เกิน 9 ตำแหน่ง'; end if;
  code := upper(btrim(p_recipe->>'fg_code'));
  if code is null or length(code) not between 1 and 120 then raise exception 'กรุณาระบุรหัส FG'; end if;
  perform pg_advisory_xact_lock(hashtextextended('pk_recipe:' || code, 0));
  select version into old_version from public.pk_recipes where fg_code=code;
  if coalesce(old_version,0) <> p_expected_version then
    raise exception 'สูตรมีเวอร์ชันใหม่ กรุณาโหลดสูตรล่าสุดก่อนบันทึก' using errcode='40001';
  end if;
  new_version := coalesce(old_version,0)+1;
  insert into public.pk_recipes(fg_code,fg_name,base_qty,fg_unit,version,updated_by,updated_username)
  values(code,btrim(p_recipe->>'fg_name'),(p_recipe->>'base_qty')::numeric,btrim(p_recipe->>'fg_unit'),new_version,auth.uid(),actor)
  on conflict(fg_code) do update set fg_name=excluded.fg_name,base_qty=excluded.base_qty,
    fg_unit=excluded.fg_unit,version=excluded.version,updated_at=now(),updated_by=excluded.updated_by,updated_username=excluded.updated_username;
  delete from public.pk_recipe_lines where fg_code=code;
  for line in select value from jsonb_array_elements(p_recipe->'lines') loop
    if jsonb_typeof(line) <> 'object' then raise exception 'ส่วนประกอบไม่ถูกต้อง'; end if;
    if (line->>'qty')::numeric <> trunc((line->>'qty')::numeric,9) then raise exception 'จำนวนใช้มีทศนิยมได้ไม่เกิน 9 ตำแหน่ง'; end if;
    n := n+1;
    insert into public.pk_recipe_lines(fg_code,line_no,pk_code,pk_name,qty,unit)
    values(code,n,upper(btrim(line->>'pk_code')),btrim(line->>'pk_name'),(line->>'qty')::numeric,btrim(line->>'unit'));
  end loop;
  select * into header from public.pk_recipes where fg_code=code;
  result := to_jsonb(header) || jsonb_build_object('lines',
    (select jsonb_agg(to_jsonb(l) order by l.line_no) from public.pk_recipe_lines l where l.fg_code=code));
  insert into public.pk_recipe_versions(fg_code,version,recipe,saved_by,saved_username)
    values(code,new_version,result,auth.uid(),actor);
  return result;
end;
$$;
create or replace function public.get_pk_recipe_versions(p_fg_code text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.app_users where id=auth.uid() and active and role='admin') then
    raise exception 'เฉพาะ Admin ที่ดูประวัติสูตรได้' using errcode='42501';
  end if;
  return coalesce((select jsonb_agg(to_jsonb(v) order by v.version desc)
    from public.pk_recipe_versions v where fg_code=upper(btrim(p_fg_code))), '[]'::jsonb);
end;
$$;
revoke all on function public.get_pk_recipes(), public.save_pk_recipe(jsonb,integer), public.get_pk_recipe_versions(text) from public, anon, authenticated;
grant execute on function public.get_pk_recipes(), public.save_pk_recipe(jsonb,integer), public.get_pk_recipe_versions(text) to authenticated;
notify pgrst, 'reload schema';
commit;
