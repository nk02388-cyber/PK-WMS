-- One-time location identity migration: keep each pallet at the same coordinates.
begin;
set local lock_timeout='5s';
lock table public.pallet_slots,public.pallet_audit_log,public.incoming_pallets,public.incoming_locations in share row exclusive mode;
do $migration$
declare
 payload jsonb;
 target_version bigint;
 i integer;
begin
 if exists(select 1 from wms_legacy_archive.snapshots where source_project='pk-wms-t1-renumber-20261013-v1') then
  raise exception 'T1 renumber already applied';
 end if;
 if (select count(*) from public.pallet_slots where zone='T-1')<>17
    or exists(select 1 from public.pallet_slots where zone='T-1' and slot_code !~ '^T1-(0[1-9]|1[0-8])$') then
  raise exception 'T1 state changed; review mapping before migration';
 end if;
 select jsonb_build_object(
  'slots',coalesce((select jsonb_agg(to_jsonb(s) order by slot_code) from public.pallet_slots s where zone='T-1'),'[]'::jsonb),
  'audit',coalesce((select jsonb_agg(to_jsonb(a) order by id) from public.pallet_audit_log a where zone='T-1'),'[]'::jsonb),
  'incoming',coalesce((select jsonb_agg(to_jsonb(p) order by id) from public.incoming_pallets p where zone='T-1'),'[]'::jsonb),
  'locations',coalesce((select jsonb_agg(to_jsonb(l) order by slot_code) from public.incoming_locations l where zone='T-1'),'[]'::jsonb),
  'mapping','Old T1-01..18 -> new T1-03..20; new top row T1-01/02 is empty'
 ) into payload;
 insert into wms_legacy_archive.snapshots(source_project,snapshot,checksum)
 values('pk-wms-t1-renumber-20261013-v1',payload,encode(sha256(convert_to(payload::text,'UTF8')),'hex'));
 select max(version)+1 into target_version from public.pallet_slots where zone='T-1';
 -- Descending updates avoid primary-key collisions without temporary slot names.
 for i in reverse 18..1 loop
  update public.pallet_slots set slot_code='T1-'||lpad((i+2)::text,2,'0'),version=target_version,updated_at=clock_timestamp()
   where zone='T-1' and slot_code='T1-'||lpad(i::text,2,'0');
 end loop;
 -- Existing audit content/time/actor stays intact and follows the same location.
 update public.pallet_audit_log set slot_code='T1-'||lpad((substring(slot_code from 4)::integer+2)::text,2,'0')
  where zone='T-1' and slot_code ~ '^T1-(0[1-9]|1[0-8])$';
 update public.incoming_pallets set slot_code='T1-'||lpad((substring(slot_code from 4)::integer+2)::text,2,'0')
  where zone='T-1' and slot_code ~ '^T1-(0[1-9]|1[0-8])$';
 delete from public.incoming_locations where zone='T-1';
 insert into public.incoming_locations(zone,slot_code)
 select 'T-1','T1-'||lpad(n::text,2,'0') from generate_series(1,20) n;
 if (select count(*) from public.pallet_slots where zone='T-1')<>jsonb_array_length(payload->'slots')
    or exists(select 1 from jsonb_array_elements(payload->'slots') old
      left join public.pallet_slots s on s.zone='T-1' and s.slot_code='T1-'||lpad(((substring(old->>'slot_code' from 4))::integer+2)::text,2,'0')
      where s.slot_code is null or s.items is distinct from old->'items' or s.occupied is distinct from (old->>'occupied')::boolean)
    or (select count(*) from public.pallet_audit_log where zone='T-1')<>jsonb_array_length(payload->'audit') then
  raise exception 'T1 inventory/history invariant failed';
 end if;
end;
$migration$;
commit;
