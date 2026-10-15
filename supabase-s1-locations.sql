-- Add the three user-requested S1 positions to the putaway location registry.
-- Existing pallet inventory, histories and locations retain their identities.
insert into public.incoming_locations(zone,slot_code)
values ('S-1','S1-15'),('S-1','S1-16'),('S-1','S1-17')
on conflict (zone,slot_code) do nothing;
