-- Register the added empty location without creating or changing inventory/history.
insert into public.incoming_locations(zone,slot_code) values('U','U-30')
on conflict(zone,slot_code) do nothing;
