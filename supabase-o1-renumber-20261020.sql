-- O1: add six empty positions and renumber 24 existing positions; backup and invariant checks.
begin;
set local lock_timeout='5s';
lock table public.pallet_slots, public.pallet_audit_log, public.incoming_pallets, public.incoming_locations in share row exclusive mode;
do $migration$
declare
 mapping jsonb := '{"O1-01":"O1-01","O1-02":"O1-02","O1-03":"O1-03","O1-04":"O1-04","O1-05":"O1-06","O1-06":"O1-07","O1-07":"O1-08","O1-08":"O1-09","O1-09":"O1-11","O1-10":"O1-12","O1-11":"O1-13","O1-12":"O1-14","O1-13":"O1-16","O1-14":"O1-17","O1-15":"O1-18","O1-16":"O1-19","O1-17":"O1-21","O1-18":"O1-22","O1-19":"O1-23","O1-20":"O1-24","O1-21":"O1-26","O1-22":"O1-27","O1-23":"O1-28","O1-24":"O1-29"}'::jsonb;
 payload jsonb;
 target_version bigint;
begin
 if exists(select 1 from wms_legacy_archive.snapshots where source_project='pk-wms-o1-renumber-20261020-v1') then raise exception 'O1 renumber already applied'; end if;
 if exists(select 1 from pallet_slots where zone='O-1' and not mapping ? slot_code)
   or exists(select 1 from pallet_audit_log where zone='O-1' and not mapping ? slot_code)
   or exists(select 1 from incoming_pallets where zone='O-1' and not mapping ? slot_code)
   or exists(select 1 from incoming_locations where zone='O-1' and not mapping ? slot_code) then
  raise exception 'Unexpected Zone O1 identity; review mapping';
 end if;
 select jsonb_build_object(
  'slots',coalesce((select jsonb_agg(to_jsonb(s) order by slot_code) from pallet_slots s where zone='O-1'),'[]'::jsonb),
  'audit',coalesce((select jsonb_agg(to_jsonb(a) order by id) from pallet_audit_log a where zone='O-1'),'[]'::jsonb),
  'incoming',coalesce((select jsonb_agg(to_jsonb(p) order by id) from incoming_pallets p where zone='O-1'),'[]'::jsonb),
  'locations',coalesce((select jsonb_agg(to_jsonb(l) order by slot_code) from incoming_locations l where zone='O-1'),'[]'::jsonb),
  'mapping',mapping
 ) into payload;
 insert into wms_legacy_archive.snapshots(source_project,snapshot,checksum)
 values('pk-wms-o1-renumber-20261020-v1',payload,encode(sha256(convert_to(payload::text,'UTF8')),'hex'));
 select coalesce(max(version),0)+1 into target_version from pallet_slots where zone='O-1';
 -- Temporary identities avoid collisions in this non-monotonic renumbering.
 update pallet_slots set slot_code='__o1_renumber__'||(mapping->>slot_code),version=target_version,updated_at=clock_timestamp() where zone='O-1';
 update pallet_slots set slot_code=replace(slot_code,'__o1_renumber__','') where zone='O-1';
 update pallet_audit_log set slot_code=mapping->>slot_code where zone='O-1';
 update incoming_pallets set slot_code=mapping->>slot_code where zone='O-1';
 delete from incoming_locations where zone='O-1';
 insert into incoming_locations(zone,slot_code) select 'O-1','O1-'||lpad(n::text,2,'0') from generate_series(1,30)n;
 if (select count(*) from pallet_slots where zone='O-1')<>jsonb_array_length(payload->'slots')
  or exists(select 1 from jsonb_array_elements(payload->'slots') old left join pallet_slots s on s.zone='O-1' and s.slot_code=mapping->>(old->>'slot_code')
    where (s.slot_code is null or (to_jsonb(s)-'slot_code'-'version'-'updated_at') is distinct from (old-'slot_code'-'version'-'updated_at')))
  or (select count(*) from pallet_audit_log where zone='O-1')<>jsonb_array_length(payload->'audit')
  or exists(select 1 from jsonb_array_elements(payload->'audit') old left join pallet_audit_log a on a.id::text=old->>'id'
    where (to_jsonb(a)-'slot_code') is distinct from (old-'slot_code') or a.slot_code is distinct from mapping->>(old->>'slot_code'))
  or (select count(*) from incoming_pallets where zone='O-1')<>jsonb_array_length(payload->'incoming')
  or exists(select 1 from jsonb_array_elements(payload->'incoming') old left join incoming_pallets p on p.id::text=old->>'id'
    where (to_jsonb(p)-'slot_code') is distinct from (old-'slot_code') or p.slot_code is distinct from mapping->>(old->>'slot_code'))
 or exists(select 1 from pallet_slots where zone='O-1' and slot_code in ('O1-05','O1-10','O1-15','O1-20','O1-25','O1-30') and (occupied or jsonb_array_length(items)<>0))
 then raise exception 'O1 inventory/history invariant failed'; end if;
end;
$migration$;
commit;
