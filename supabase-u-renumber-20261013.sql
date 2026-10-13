-- One-time Zone U removal and physical-row renumber. Backup before changes.
begin;
set local lock_timeout='5s';
lock table public.pallet_slots, public.pallet_audit_log, public.incoming_pallets, public.incoming_locations in share row exclusive mode;
do $migration$
declare
 mapping jsonb := '{"U-01":"U-01","U-02":"U-02","U-03":"U-03","U-04":"U-04","U-05":"U-05","U-06":"U-06","U-07":"U-07","U-08":"U-08","U-09":"U-09","U-10":"U-10","U-11":"U-11","U-25":"U-12","U-12":"U-13","U-13":"U-14","U-14":"U-15","U-15":"U-16","U-16":"U-17","U-17":"U-18","U-18":"U-19","U-20":"U-20","U-26":"U-21","U-21":"U-22","U-23":"U-23","U-22":"U-24","U-24":"U-25"}'::jsonb;
 payload jsonb;
 target_version bigint;
begin
 if exists(select 1 from wms_legacy_archive.snapshots where source_project='pk-wms-u-renumber-20261013-v1') then raise exception 'U renumber already applied'; end if;
 if exists(select 1 from pallet_slots where zone='U' and slot_code='U-19' and (occupied or items<>'[]'::jsonb))
   or exists(select 1 from pallet_audit_log where zone='U' and slot_code='U-19')
   or exists(select 1 from incoming_pallets where zone='U' and slot_code='U-19') then
  raise exception 'U-19 is not empty or has references; removal needs review';
 end if;
 if exists(select 1 from pallet_slots where zone='U' and slot_code<>'U-19' and not mapping ? slot_code)
   or exists(select 1 from pallet_audit_log where zone='U' and not mapping ? slot_code)
   or exists(select 1 from incoming_pallets where zone='U' and not mapping ? slot_code) then
  raise exception 'Unexpected Zone U identity; review mapping';
 end if;
 select jsonb_build_object(
  'slots',coalesce((select jsonb_agg(to_jsonb(s) order by slot_code) from pallet_slots s where zone='U'),'[]'::jsonb),
  'audit',coalesce((select jsonb_agg(to_jsonb(a) order by id) from pallet_audit_log a where zone='U'),'[]'::jsonb),
  'incoming',coalesce((select jsonb_agg(to_jsonb(p) order by id) from incoming_pallets p where zone='U'),'[]'::jsonb),
  'locations',coalesce((select jsonb_agg(to_jsonb(l) order by slot_code) from incoming_locations l where zone='U'),'[]'::jsonb),
  'mapping',mapping,'removed','U-19'
 ) into payload;
 insert into wms_legacy_archive.snapshots(source_project,snapshot,checksum)
 values('pk-wms-u-renumber-20261013-v1',payload,encode(sha256(convert_to(payload::text,'UTF8')),'hex'));
 select coalesce(max(version),0)+1 into target_version from pallet_slots where zone='U';
 delete from pallet_slots where zone='U' and slot_code='U-19';
 -- Temporary identities avoid collisions in this non-monotonic renumbering.
 update pallet_slots set slot_code='__u_renumber__'||(mapping->>slot_code),version=target_version,updated_at=clock_timestamp() where zone='U';
 update pallet_slots set slot_code=substring(slot_code from 15) where zone='U';
 update pallet_audit_log set slot_code=mapping->>slot_code where zone='U';
 update incoming_pallets set slot_code=mapping->>slot_code where zone='U';
 delete from incoming_locations where zone='U';
 insert into incoming_locations(zone,slot_code) select 'U','U-'||lpad(n::text,2,'0') from generate_series(1,25)n;
 if (select count(*) from pallet_slots where zone='U')<>(select count(*) from jsonb_array_elements(payload->'slots') s where s->>'slot_code'<>'U-19')
  or exists(select 1 from jsonb_array_elements(payload->'slots') old left join pallet_slots s on s.zone='U' and s.slot_code=mapping->>(old->>'slot_code')
    where old->>'slot_code'<>'U-19' and (s.slot_code is null or (to_jsonb(s)-'slot_code'-'version'-'updated_at') is distinct from (old-'slot_code'-'version'-'updated_at')))
  or (select count(*) from pallet_audit_log where zone='U')<>jsonb_array_length(payload->'audit')
  or exists(select 1 from jsonb_array_elements(payload->'audit') old left join pallet_audit_log a on a.id::text=old->>'id'
    where (to_jsonb(a)-'slot_code') is distinct from (old-'slot_code') or a.slot_code is distinct from mapping->>(old->>'slot_code'))
  or (select count(*) from incoming_pallets where zone='U')<>jsonb_array_length(payload->'incoming')
  or exists(select 1 from jsonb_array_elements(payload->'incoming') old left join incoming_pallets p on p.id::text=old->>'id'
    where (to_jsonb(p)-'slot_code') is distinct from (old-'slot_code') or p.slot_code is distinct from mapping->>(old->>'slot_code'))
 then raise exception 'U inventory/history invariant failed'; end if;
end;
$migration$;
commit;
