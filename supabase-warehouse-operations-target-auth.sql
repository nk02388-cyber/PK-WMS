-- Target-project Auth/Admin support for the existing PK WMS withdrawal module.
-- API roles receive no direct table access; all reads and writes pass through guarded RPCs.
create table if not exists public.app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  email text not null unique,
  role text not null default 'admin' check (role = 'admin'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.app_users enable row level security;
revoke all on table public.app_users from public, anon, authenticated;

create or replace function warehouse_ops.is_admin()
returns boolean language sql stable security definer set search_path=''
as $$
  select exists (
    select 1 from public.app_users u
    where u.id = auth.uid() and u.active and u.role = 'admin'
  );
$$;
create or replace function warehouse_ops.is_active()
returns boolean language sql stable security definer set search_path=''
as $$ select warehouse_ops.is_admin(); $$;
create or replace function warehouse_ops.check_role_code(p_role text,p_username text,p_code text)
returns boolean language sql stable security definer set search_path=''
as $$ select warehouse_ops.is_admin(); $$;
create or replace function warehouse_ops.check_edit_code(p_code text)
returns boolean language sql stable security definer set search_path=''
as $$ select warehouse_ops.is_admin(); $$;

revoke all on function public.warehouse_ops_rpc(text,jsonb) from public,anon,authenticated;
grant execute on function public.warehouse_ops_rpc(text,jsonb) to authenticated;

create or replace function public.pk_withdrawal_auth_state()
returns jsonb language sql stable security definer set search_path=''
as $$
  select jsonb_build_object('username',u.username,'role',u.role,'active',u.active)
  from public.app_users u where u.id=auth.uid();
$$;
revoke all on function public.pk_withdrawal_auth_state() from public,anon,authenticated;
grant execute on function public.pk_withdrawal_auth_state() to authenticated;

-- The copied database originally had a temporary public read-only endpoint.
-- Keep the same response shape but require an authenticated Admin.
create or replace function public.pk_withdrawal_read_state()
returns jsonb language plpgsql stable security definer set search_path=''
as $function$
begin
 if not warehouse_ops.is_admin() then raise exception 'เฉพาะ Admin ของใบเบิก' using errcode='42501'; end if;
 return jsonb_build_object(
  'refreshed_at', now(),
  'tickets', coalesce((
   select jsonb_agg(jsonb_build_object(
    'ticket_no',t.ticket_no,'status',t.status,'planned_date',t.planned_date,'created_at',t.created_at,
    'assignee_name',s.display_name,'job_type',j.name,'fg_code',t.fg_code,'fg_name',t.fg_name,
    'requested_qty',t.requested_qty,
    'materials',coalesce((select jsonb_agg(jsonb_build_object(
      'pk_code',m.value->'pk_code','pk_name',m.value->'pk_name','unit',m.value->'unit',
      'required_qty',m.value->'required_qty','actual_qty',m.value->'actual_qty'
    ) order by m.ordinality)
     from jsonb_array_elements(coalesce(t.materials,'[]'::jsonb)) with ordinality as m(value,ordinality)),'[]'::jsonb)
   ) order by t.created_at desc)
   from warehouse_ops.tickets t
   left join warehouse_ops.staff s on s.id=t.assignee_id
   left join warehouse_ops.job_types j on j.id=t.job_type_id
   where t.deleted_at is null
  ),'[]'::jsonb)
 );
end;
$function$;
revoke all on function public.pk_withdrawal_read_state() from public,anon,authenticated;
grant execute on function public.pk_withdrawal_read_state() to authenticated;
