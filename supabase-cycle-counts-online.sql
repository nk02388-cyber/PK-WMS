begin;
create table if not exists public.pk_cycle_count_state (
 id boolean primary key default true check(id),
 data jsonb not null default '{"frequency":{},"history":[],"draft":null}',
 version bigint not null default 0,
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id), updated_username text
);
create table if not exists public.pk_cycle_count_audit (
 version bigint primary key, saved_at timestamptz not null default now(),
 saved_by uuid not null references auth.users(id), saved_username text not null,
 completed_count integer not null, draft_zone text
);
alter table public.pk_cycle_count_state enable row level security;
alter table public.pk_cycle_count_audit enable row level security;
revoke all on public.pk_cycle_count_state, public.pk_cycle_count_audit from public,anon,authenticated;
insert into public.pk_cycle_count_state(id) values(true) on conflict do nothing;
create or replace function public.get_pk_cycle_counts() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not coalesce(public.has_menu_access('cycle-counts'),false) then raise exception 'ไม่มีสิทธิ์ตรวจนับ' using errcode='42501'; end if;
 return (select to_jsonb(s) from public.pk_cycle_count_state s where id);
end;$$;
create or replace function public.save_pk_cycle_counts(p_state jsonb,p_expected_version bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare old public.pk_cycle_count_state; actor text; entry record; run jsonb; line jsonb; completed boolean;
begin
 select username into actor from public.app_users where id=auth.uid() and active and role in ('admin','user');
 if actor is null or not coalesce(public.has_menu_access('cycle-counts'),false) then raise exception 'ไม่มีสิทธิ์บันทึกตรวจนับ' using errcode='42501'; end if;
 select * into old from public.pk_cycle_count_state where id for update;
 if p_expected_version is null or p_expected_version<>old.version then raise exception 'ข้อมูลตรวจนับเปลี่ยนจากเครื่องอื่น กรุณาโหลดข้อมูลออนไลน์ล่าสุดก่อนบันทึก' using errcode='40001'; end if;
 if p_state is null or jsonb_typeof(p_state)<>'object' or p_state-array['frequency','history','draft']<>'{}'::jsonb
 or jsonb_typeof(p_state->'frequency') is distinct from 'object' or jsonb_typeof(p_state->'history') is distinct from 'array'
 or not(p_state ? 'draft') or jsonb_typeof(p_state->'draft') not in ('null','object') or octet_length(p_state::text)>8388608 then raise exception 'รูปแบบข้อมูลตรวจนับไม่ถูกต้องหรือมีขนาดเกิน 8 MB'; end if;
 for entry in select key,value from jsonb_each(p_state->'frequency') loop
  if not exists(select 1 from public.incoming_locations where zone=entry.key) or jsonb_typeof(entry.value)<>'number' or (entry.value::text)::numeric not between 0 and 3650 or (entry.value::text)::numeric<>trunc((entry.value::text)::numeric) then raise exception 'รอบนับหรือโซนไม่ถูกต้อง'; end if;
 end loop;
 if not ((p_state->'history') @> (old.data->'history')) then raise exception 'ห้ามลบหรือแก้ไขผลตรวจนับที่บันทึกแล้ว'; end if;
 if exists(select 1 from jsonb_array_elements(p_state->'history') r group by r->>'zone',r->>'startedAt',r->>'completedAt' having count(*)>1) then raise exception 'มีผลตรวจนับซ้ำ'; end if;
 for run in select value from jsonb_array_elements((p_state->'history') || case when jsonb_typeof(p_state->'draft')='object' then jsonb_build_array(p_state->'draft') else '[]'::jsonb end) loop
  completed := run ? 'completedAt';
  if jsonb_typeof(run)<>'object' or not exists(select 1 from public.incoming_locations where zone=run->>'zone')
  or jsonb_typeof(run->'rows') is distinct from 'array' or jsonb_array_length(run->'rows')>10000
  or coalesce(length(run->>'countedBy'),0)>80 or coalesce(length(run->>'note'),0)>500
  or coalesce(run->>'startedAt','')='' then raise exception 'งานตรวจนับไม่ถูกต้อง'; end if;
  perform (run->>'startedAt')::timestamptz;
  if completed then
   if coalesce(btrim(run->>'countedBy'),'')='' or coalesce(run->>'completedAt','')='' then raise exception 'กรุณาระบุผู้ตรวจนับและวันที่บันทึกผล'; end if;
   perform (run->>'completedAt')::timestamptz;
  elsif jsonb_array_length(run->'rows')=0 and coalesce((run->>'confirmEmpty')::boolean,false)=false then null;
  end if;
  for line in select value from jsonb_array_elements(run->'rows') loop
   if jsonb_typeof(line)<>'object' or not exists(select 1 from public.incoming_locations where zone=run->>'zone' and slot_code=line->>'slot')
   or coalesce(line->>'type','') not in ('item','occupied') or coalesce(length(line->>'code'),0)>200 or coalesce(length(line->>'name'),0)>2000
   or jsonb_typeof(line->'expected') not in ('number','null') or not(line ? 'expected') then raise exception 'รายการตำแหน่งหรือยอดตั้งต้นไม่ถูกต้อง'; end if;
   if completed or coalesce(line->>'counted','')<>'' then
    if coalesce(line->>'counted','')='' or (line->>'counted')::numeric<0 or (line->>'counted') in ('NaN','Infinity','-Infinity') then raise exception 'จำนวนตรวจนับไม่ถูกต้อง'; end if;
    if line->>'type'='occupied' and (line->>'counted')::numeric not in (0,1) then raise exception 'สถานะพาเลทต้องเป็น 0 หรือ 1'; end if;
   end if;
  end loop;
 end loop;
 update public.pk_cycle_count_state set data=p_state,version=old.version+1,updated_at=now(),updated_by=auth.uid(),updated_username=actor where id;
 insert into public.pk_cycle_count_audit(version,saved_by,saved_username,completed_count,draft_zone)
 values(old.version+1,auth.uid(),actor,jsonb_array_length(p_state->'history'),p_state->'draft'->>'zone');
 return (select to_jsonb(s) from public.pk_cycle_count_state s where id);
end;$$;
revoke all on function public.get_pk_cycle_counts(),public.save_pk_cycle_counts(jsonb,bigint) from public,anon,authenticated;
grant execute on function public.get_pk_cycle_counts(),public.save_pk_cycle_counts(jsonb,bigint) to authenticated;
notify pgrst,'reload schema';
commit;
