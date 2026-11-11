-- Withdrawal access is authenticated by PK WMS and verified by the edge gateway.
-- The target project's service key is held only by that gateway.
begin;

create or replace function warehouse_ops.is_admin()
returns boolean language sql stable security definer set search_path=''
as $$ select coalesce(auth.role()='service_role',false); $$;
create or replace function warehouse_ops.is_active()
returns boolean language sql stable security definer set search_path=''
as $$ select warehouse_ops.is_admin(); $$;
create or replace function warehouse_ops.check_role_code(p_role text,p_username text,p_code text)
returns boolean language sql stable security definer set search_path=''
as $$ select warehouse_ops.is_admin(); $$;
create or replace function warehouse_ops.check_edit_code(p_code text)
returns boolean language sql stable security definer set search_path=''
as $$ select warehouse_ops.is_admin(); $$;

create or replace function public.warehouse_ops_rpc(p_action text,p_args jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=''
as $gateway$
declare
 proc record; expressions text=''; args jsonb:=coalesce(p_args,'{}'); i integer; result jsonb;
 username text; caller_role text:=args->>'p_role';
begin
 if auth.role() is distinct from 'service_role' then raise exception 'กรุณาเข้าสู่ระบบ PK WMS' using errcode='42501'; end if;
 if caller_role not in ('supervisor','clerk') or nullif(args->>'p_username','') is null then raise exception 'สิทธิ์ใช้งานไม่ถูกต้อง' using errcode='42501'; end if;
 if not p_action=any(array['get_dashboard_state','get_management_state','get_ticket_history','get_deleted_tickets_as_supervisor','get_saved_production_formulas','get_competency_state','perform_work_action','manage_work','save_production_formula_as_supervisor']) then raise exception 'ไม่รองรับคำสั่งนี้' using errcode='42501'; end if;
 if jsonb_typeof(args)<>'object' then raise exception 'ข้อมูลไม่ถูกต้อง'; end if;
 if p_action='manage_work' and args->>'p_action'='clerk_account' then raise exception 'จัดการบัญชีใน PK WMS'; end if;
 if caller_role='clerk' and not (p_action=any(array['get_dashboard_state','get_management_state','get_ticket_history','get_saved_production_formulas','get_competency_state']) or p_action='manage_work' and args->>'p_action'=any(array['case','history'])) then raise exception 'ไม่มีสิทธิ์ทำรายการนี้' using errcode='42501'; end if;
 username:=args->>'p_username';
 args:=args||jsonb_build_object('p_username',username,'p_code','pk-auth','p_role',caller_role);
 select p.proargnames,p.proargtypes,p.pronargs,p.prorettype into strict proc from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='warehouse_ops' and p.proname=p_action;
 for i in 1..proc.pronargs loop
  if args ? proc.proargnames[i] then
   if expressions<>'' then expressions:=expressions||','; end if;
   expressions:=expressions||format('%I => ($1->>%L)::%s',proc.proargnames[i],proc.proargnames[i],pg_catalog.format_type(proc.proargtypes[i-1],null));
  end if;
 end loop;
 if proc.prorettype='void'::regtype then execute format('select warehouse_ops.%I(%s)',p_action,expressions) using args; result:='true';
 else execute format('select to_jsonb(warehouse_ops.%I(%s))',p_action,expressions) into result using args; end if;
 return result;
end;
$gateway$;
revoke all on function public.warehouse_ops_rpc(text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.warehouse_ops_rpc(text,jsonb) to service_role;

drop function if exists public.pk_withdrawal_auth_state();
drop function if exists public.pk_withdrawal_read_state();

do $remove_withdrawal_auth$
declare invited_id uuid;
begin
 select id into invited_id from auth.users where email='natthakan.jankana@gmail.com';
 if invited_id is not null then
  if exists(select 1 from warehouse_ops.tickets where created_by=invited_id)
     or exists(select 1 from warehouse_ops.skill_ratings where assessed_by=invited_id) then
   raise exception 'บัญชีเชิญมีประวัติใบเบิกหรือทักษะที่อ้างอิงอยู่ หยุดการลบเพื่อรักษาประวัติ';
  end if;
  delete from warehouse_ops.profiles where id=invited_id;
  delete from public.app_users where id=invited_id;
  delete from auth.users where id=invited_id;
 end if;
end;
$remove_withdrawal_auth$;
drop table if exists public.app_users;
notify pgrst,'reload schema';
commit;
