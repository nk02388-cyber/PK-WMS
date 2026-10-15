-- One-time renumber of all 17 Zone S1 positions; no removal. Backup before changes.
begin;
set local lock_timeout='5s';
lock table public.pallet_slots, public.pallet_audit_log, public.incoming_pallets, public.incoming_locations in share row exclusive mode;
do $migration$
declare
 mapping jsonb := '{"S1-01":"S1-01","S1-02":"S1-02","S1-15":"S1-03","S1-16":"S1-04","S1-17":"S1-05","S1-03":"S1-06","S1-04":"S1-07","S1-05":"S1-08","S1-06":"S1-09","S1-07":"S1-10","S1-08":"S1-11","S1-09":"S1-12","S1-10":"S1-13","S1-11":"S1-14","S1-12":"S1-15","S1-13":"S1-16","S1-14":"S1-17"}'::jsonb;
 payload jsonb;
 target_version bigint;
begin
 if exists(select 1 from wms_legacy_archive.snapshots where source_project='pk-wms-s1-renumber-20261015-v1') then raise exception 'S1 renumber already applied'; end if;
 if exists(select 1 from pallet_slots where zone='S-1' and not mapping ? slot_code)
   or exists(select 1 from pallet_audit_log where zone='S-1' and not mapping ? slot_code)
   or exists(select 1 from incoming_pallets where zone='S-1' and not mapping ? slot_code) then
  raise exception 'Unexpected Zone S1 identity; review mapping';
 end if;
 select jsonb_build_object(
  'slots',coalesce((select jsonb_agg(to_jsonb(s) order by slot_code) from pallet_slots s where zone='S-1'),'[]'::jsonb),
  'audit',coalesce((select jsonb_agg(to_jsonb(a) order by id) from pallet_audit_log a where zone='S-1'),'[]'::jsonb),
  'incoming',coalesce((select jsonb_agg(to_jsonb(p) order by id) from incoming_pallets p where zone='S-1'),'[]'::jsonb),
  'locations',coalesce((select jsonb_agg(to_jsonb(l) order by slot_code) from incoming_locations l where zone='S-1'),'[]'::jsonb),
  'mapping',mapping
 ) into payload;
 insert into wms_legacy_archive.snapshots(source_project,snapshot,checksum)
 values('pk-wms-s1-renumber-20261015-v1',payload,encode(sha256(convert_to(payload::text,'UTF8')),'hex'));
 select coalesce(max(version),0)+1 into target_version from pallet_slots where zone='S-1';
 -- Temporary identities avoid collisions in this non-monotonic renumbering.
 update pallet_slots set slot_code='__s1_renumber__'||(mapping->>slot_code),version=target_version,updated_at=clock_timestamp() where zone='S-1';
 update pallet_slots set slot_code=replace(slot_code,'__s1_renumber__','') where zone='S-1';
 update pallet_audit_log set slot_code=mapping->>slot_code where zone='S-1';
 update incoming_pallets set slot_code=mapping->>slot_code where zone='S-1';
 delete from incoming_locations where zone='S-1';
 insert into incoming_locations(zone,slot_code) select 'S-1','S1-'||lpad(n::text,2,'0') from generate_series(1,17)n;
 if (select count(*) from pallet_slots where zone='S-1')<>jsonb_array_length(payload->'slots')
  or exists(select 1 from jsonb_array_elements(payload->'slots') old left join pallet_slots s on s.zone='S-1' and s.slot_code=mapping->>(old->>'slot_code')
    where (s.slot_code is null or (to_jsonb(s)-'slot_code'-'version'-'updated_at') is distinct from (old-'slot_code'-'version'-'updated_at')))
  or (select count(*) from pallet_audit_log where zone='S-1')<>jsonb_array_length(payload->'audit')
  or exists(select 1 from jsonb_array_elements(payload->'audit') old left join pallet_audit_log a on a.id::text=old->>'id'
    where (to_jsonb(a)-'slot_code') is distinct from (old-'slot_code') or a.slot_code is distinct from mapping->>(old->>'slot_code'))
  or (select count(*) from incoming_pallets where zone='S-1')<>jsonb_array_length(payload->'incoming')
  or exists(select 1 from jsonb_array_elements(payload->'incoming') old left join incoming_pallets p on p.id::text=old->>'id'
    where (to_jsonb(p)-'slot_code') is distinct from (old-'slot_code') or p.slot_code is distinct from mapping->>(old->>'slot_code'))
 then raise exception 'S1 inventory/history invariant failed'; end if;
end;
$migration$;
commit;
