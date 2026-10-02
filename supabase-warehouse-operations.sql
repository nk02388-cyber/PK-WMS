-- One-time schema migration. Private data imports are kept outside Git.
-- Only public.warehouse_ops_rpc is callable, with PK Admin Auth checks.
begin;
create schema warehouse_ops;
revoke all on schema warehouse_ops from public, anon, authenticated;
set local search_path=warehouse_ops,public,extensions;
create table warehouse_ops.tickets ("id" uuid not null default gen_random_uuid(),"ticket_no" text not null,"job_type_id" uuid not null,"assignee_id" uuid not null,"description" text not null default ''::text,"status" text not null default 'queued'::text,"started_at" timestamp with time zone,"ended_at" timestamp with time zone,"created_by" uuid,"created_at" timestamp with time zone not null default now(),"fg_code" text,"fg_name" text,"requested_qty" numeric(14,3),"bom_version" text,"materials" jsonb,"status_reason" text,"deleted_at" timestamp with time zone,"pause_intervals" jsonb not null default '[]'::jsonb,"documents" jsonb not null default '[]'::jsonb,"planned_date" date,"due_at" timestamp with time zone,"priority" text not null default 'normal'::text,"excluded_wip_materials" jsonb not null default '[]'::jsonb,"excluded_wip_cases" jsonb not null default '[]'::jsonb);
create table warehouse_ops.ticket_events ("id" uuid not null default gen_random_uuid(),"ticket_id" uuid not null,"event_type" text not null,"actor_role" text not null,"actor_username" text not null,"reason" text,"before_state" jsonb,"after_state" jsonb not null,"created_at" timestamp with time zone not null default clock_timestamp(),"actor_staff_id" uuid,"actor_display_name" text);
create table warehouse_ops.staff ("id" uuid not null default gen_random_uuid(),"display_name" text not null,"active" boolean not null default true,"created_at" timestamp with time zone not null default now(),"photo_data" text,"position" text not null default ''::text);
create table warehouse_ops.profiles ("id" uuid not null,"email" text not null,"display_name" text not null,"role" text not null default 'worker'::text,"active" boolean not null default false,"created_at" timestamp with time zone not null default now());
create table warehouse_ops.job_types ("id" uuid not null default gen_random_uuid(),"name" text not null,"active" boolean not null default true,"created_at" timestamp with time zone not null default now());
create table warehouse_ops.skill_ratings ("profile_id" uuid not null,"job_type_id" uuid not null,"level" smallint not null,"assessed_by" uuid,"updated_at" timestamp with time zone not null default now());
create table warehouse_ops.withdrawal_document_numbers ("document_key" text not null,"ticket_id" uuid not null);
create table warehouse_ops.app_settings ("key" text not null,"value" text not null);
create table warehouse_ops.work_standards ("job_type_id" uuid not null,"fg_code" text not null default ''::text,"setup_minutes" numeric not null,"minutes_per_line" numeric not null,"minutes_per_1000_fg" numeric not null,"updated_at" timestamp with time zone not null default now(),"updated_by" text not null);
create table warehouse_ops.work_management_settings ("id" boolean not null default true,"settings" jsonb not null,"updated_at" timestamp with time zone not null default now());
create table warehouse_ops.material_cases ("ticket_id" uuid not null,"line_index" integer not null,"fingerprint" text not null,"status" text not null,"note" text not null,"updated_at" timestamp with time zone not null default clock_timestamp(),"updated_by" text not null);
create table warehouse_ops.management_events ("id" uuid not null default gen_random_uuid(),"ticket_no" text,"event_type" text not null,"actor_username" text not null,"actor_role" text not null,"reason" text,"before_state" jsonb,"after_state" jsonb,"created_at" timestamp with time zone not null default clock_timestamp());
create table warehouse_ops.competency_catalog ("id" uuid not null default gen_random_uuid(),"category" text not null,"name" text not null,"sort_order" integer not null,"target_foreman" integer not null default 5,"target_admin" integer not null default 5);
create table warehouse_ops.competency_ratings ("staff_id" uuid not null,"competency_id" uuid not null,"level" integer not null);
create table warehouse_ops.saved_production_formulas ("fg_code" text not null,"fg_name" text not null,"base_qty" numeric not null,"lines" jsonb not null,"source_sha256" text not null,"created_at" timestamp with time zone not null default now(),"created_by" text not null,"excluded_wip_lines" jsonb not null default '[]'::jsonb);
CREATE OR REPLACE FUNCTION warehouse_ops.has_wip_materials(p_lines jsonb)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
  select exists(select 1 from jsonb_array_elements(coalesce(p_lines,'[]')) l
    where trim(coalesce(l->>'pk_code','')) like '5%');
$function$
;
alter table warehouse_ops.tickets add constraint "tickets_description_check" CHECK ((length(description) <= 1000));
alter table warehouse_ops.tickets add constraint "tickets_materials_array" CHECK (((materials IS NULL) OR (jsonb_typeof(materials) = 'array'::text)));
alter table warehouse_ops.tickets add constraint "tickets_no_wip_materials" CHECK ((NOT has_wip_materials(materials)));
alter table warehouse_ops.tickets add constraint "tickets_pkey" PRIMARY KEY (id);
alter table warehouse_ops.tickets add constraint "tickets_priority_check" CHECK ((priority = ANY (ARRAY['normal'::text, 'high'::text, 'urgent'::text])));
alter table warehouse_ops.tickets add constraint "tickets_requested_qty_positive" CHECK (((requested_qty IS NULL) OR (requested_qty > (0)::numeric)));
alter table warehouse_ops.tickets add constraint "tickets_status_check" CHECK ((status = ANY (ARRAY['queued'::text, 'active'::text, 'paused'::text, 'done'::text, 'partial'::text, 'cancelled'::text])));
alter table warehouse_ops.tickets add constraint "tickets_status_reason_check" CHECK (((status_reason IS NULL) OR (length(status_reason) <= 1000)));
alter table warehouse_ops.tickets add constraint "tickets_ticket_no_check" CHECK (((length(TRIM(BOTH FROM ticket_no)) >= 1) AND (length(TRIM(BOTH FROM ticket_no)) <= 80)));
alter table warehouse_ops.tickets add constraint "tickets_ticket_no_key" UNIQUE (ticket_no);
alter table warehouse_ops.tickets add constraint "valid_times" CHECK ((((status = 'queued'::text) AND (started_at IS NULL) AND (ended_at IS NULL)) OR ((status = ANY (ARRAY['active'::text, 'paused'::text])) AND (started_at IS NOT NULL) AND (ended_at IS NULL)) OR ((status = ANY (ARRAY['done'::text, 'partial'::text])) AND (started_at IS NOT NULL) AND (ended_at IS NOT NULL) AND (ended_at >= started_at)) OR ((status = 'cancelled'::text) AND (ended_at IS NOT NULL) AND ((started_at IS NULL) OR (ended_at >= started_at)))));
alter table warehouse_ops.ticket_events add constraint "ticket_events_event_type_check" CHECK ((event_type = ANY (ARRAY['created'::text, 'imported'::text, 'started'::text, 'paused'::text, 'resumed'::text, 'completed'::text, 'partial'::text, 'cancelled'::text, 'edited'::text, 'deleted'::text, 'restored'::text])));
alter table warehouse_ops.ticket_events add constraint "ticket_events_pkey" PRIMARY KEY (id);
alter table warehouse_ops.staff add constraint "staff_display_name_check" CHECK (((length(TRIM(BOTH FROM display_name)) >= 1) AND (length(TRIM(BOTH FROM display_name)) <= 100)));
alter table warehouse_ops.staff add constraint "staff_pkey" PRIMARY KEY (id);
alter table warehouse_ops.staff add constraint "staff_position_check" CHECK ((length("position") <= 100));
alter table warehouse_ops.profiles add constraint "profiles_pkey" PRIMARY KEY (id);
alter table warehouse_ops.profiles add constraint "profiles_role_check" CHECK ((role = ANY (ARRAY['worker'::text, 'admin'::text])));
alter table warehouse_ops.job_types add constraint "job_types_name_check" CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 80)));
alter table warehouse_ops.job_types add constraint "job_types_name_key" UNIQUE (name);
alter table warehouse_ops.job_types add constraint "job_types_pkey" PRIMARY KEY (id);
alter table warehouse_ops.skill_ratings add constraint "skill_ratings_level_check" CHECK (((level >= 0) AND (level <= 4)));
alter table warehouse_ops.skill_ratings add constraint "skill_ratings_pkey" PRIMARY KEY (profile_id, job_type_id);
alter table warehouse_ops.withdrawal_document_numbers add constraint "withdrawal_document_numbers_pkey" PRIMARY KEY (document_key);
alter table warehouse_ops.app_settings add constraint "app_settings_pkey" PRIMARY KEY (key);
alter table warehouse_ops.work_standards add constraint "work_standards_check" CHECK ((((setup_minutes + minutes_per_line) + minutes_per_1000_fg) > (0)::numeric));
alter table warehouse_ops.work_standards add constraint "work_standards_minutes_per_1000_fg_check" CHECK (((minutes_per_1000_fg >= (0)::numeric) AND (minutes_per_1000_fg <= (100000)::numeric)));
alter table warehouse_ops.work_standards add constraint "work_standards_minutes_per_line_check" CHECK (((minutes_per_line >= (0)::numeric) AND (minutes_per_line <= (100000)::numeric)));
alter table warehouse_ops.work_standards add constraint "work_standards_pkey" PRIMARY KEY (job_type_id, fg_code);
alter table warehouse_ops.work_standards add constraint "work_standards_setup_minutes_check" CHECK (((setup_minutes >= (0)::numeric) AND (setup_minutes <= (100000)::numeric)));
alter table warehouse_ops.work_management_settings add constraint "work_management_settings_id_check" CHECK (id);
alter table warehouse_ops.work_management_settings add constraint "work_management_settings_pkey" PRIMARY KEY (id);
alter table warehouse_ops.material_cases add constraint "material_cases_line_index_check" CHECK ((line_index >= 0));
alter table warehouse_ops.material_cases add constraint "material_cases_note_check" CHECK (((length(note) >= 1) AND (length(note) <= 1000)));
alter table warehouse_ops.material_cases add constraint "material_cases_pkey" PRIMARY KEY (ticket_id, line_index);
alter table warehouse_ops.material_cases add constraint "material_cases_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'following'::text, 'resolved'::text])));
alter table warehouse_ops.management_events add constraint "management_events_pkey" PRIMARY KEY (id);
alter table warehouse_ops.competency_catalog add constraint "competency_catalog_name_key" UNIQUE (name);
alter table warehouse_ops.competency_catalog add constraint "competency_catalog_pkey" PRIMARY KEY (id);
alter table warehouse_ops.competency_ratings add constraint "competency_ratings_level_check" CHECK (((level >= 1) AND (level <= 5)));
alter table warehouse_ops.competency_ratings add constraint "competency_ratings_pkey" PRIMARY KEY (staff_id, competency_id);
alter table warehouse_ops.saved_production_formulas add constraint "saved_formulas_no_wip_materials" CHECK ((NOT has_wip_materials(lines)));
alter table warehouse_ops.saved_production_formulas add constraint "saved_production_formulas_pkey" PRIMARY KEY (fg_code);
alter table warehouse_ops.tickets add constraint "tickets_assignee_id_fkey" FOREIGN KEY (assignee_id) REFERENCES warehouse_ops.staff(id);
alter table warehouse_ops.tickets add constraint "tickets_created_by_fkey" FOREIGN KEY (created_by) REFERENCES warehouse_ops.profiles(id);
alter table warehouse_ops.tickets add constraint "tickets_job_type_id_fkey" FOREIGN KEY (job_type_id) REFERENCES warehouse_ops.job_types(id);
alter table warehouse_ops.ticket_events add constraint "ticket_events_actor_staff_id_fkey" FOREIGN KEY (actor_staff_id) REFERENCES warehouse_ops.staff(id);
alter table warehouse_ops.ticket_events add constraint "ticket_events_ticket_id_fkey" FOREIGN KEY (ticket_id) REFERENCES warehouse_ops.tickets(id);
alter table warehouse_ops.skill_ratings add constraint "skill_ratings_assessed_by_fkey" FOREIGN KEY (assessed_by) REFERENCES warehouse_ops.profiles(id);
alter table warehouse_ops.skill_ratings add constraint "skill_ratings_job_type_id_fkey" FOREIGN KEY (job_type_id) REFERENCES warehouse_ops.job_types(id) ON DELETE CASCADE;
alter table warehouse_ops.skill_ratings add constraint "skill_ratings_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES warehouse_ops.staff(id) ON DELETE CASCADE;
alter table warehouse_ops.withdrawal_document_numbers add constraint "withdrawal_document_numbers_ticket_id_fkey" FOREIGN KEY (ticket_id) REFERENCES warehouse_ops.tickets(id) ON DELETE CASCADE;
alter table warehouse_ops.work_standards add constraint "work_standards_job_type_id_fkey" FOREIGN KEY (job_type_id) REFERENCES warehouse_ops.job_types(id);
alter table warehouse_ops.material_cases add constraint "material_cases_ticket_id_fkey" FOREIGN KEY (ticket_id) REFERENCES warehouse_ops.tickets(id) ON DELETE CASCADE;
alter table warehouse_ops.competency_ratings add constraint "competency_ratings_competency_id_fkey" FOREIGN KEY (competency_id) REFERENCES warehouse_ops.competency_catalog(id);
alter table warehouse_ops.competency_ratings add constraint "competency_ratings_staff_id_fkey" FOREIGN KEY (staff_id) REFERENCES warehouse_ops.staff(id);
set local check_function_bodies=off;
CREATE OR REPLACE FUNCTION warehouse_ops.add_job(p_code text, p_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
begin
  if not warehouse_ops.check_edit_code(p_code) then raise exception 'Invalid edit code'; end if;
  insert into warehouse_ops.job_types(name) values(trim(p_name));
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
begin
  insert into warehouse_ops.profiles(id,email,display_name)
  values(new.id,new.email,coalesce(nullif(new.raw_user_meta_data->>'display_name',''),split_part(new.email,'@',1)));
  return new;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.check_edit_code(p_code text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
  select coalesce((select value = extensions.crypt(p_code, value) from warehouse_ops.app_settings where key='edit_code'), false);
$function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.is_active()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
  select exists(select 1 from warehouse_ops.profiles where id=auth.uid() and active);
$function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
  select exists(select 1 from warehouse_ops.profiles where id=auth.uid() and active and role='admin');
$function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.get_dashboard_state()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
 select jsonb_build_object('people',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'display_name',s.display_name,'active',s.active,'photo_data',s.photo_data,'position',s.position)) from warehouse_ops.staff s),'[]'),'jobs',coalesce((select jsonb_agg(to_jsonb(j)) from warehouse_ops.job_types j),'[]'),'tickets',coalesce((select jsonb_agg(to_jsonb(t)-'created_by' order by t.created_at desc) from warehouse_ops.tickets t where deleted_at is null),'[]'),'skills',coalesce((select jsonb_agg(jsonb_build_object('profile_id',profile_id,'job_type_id',job_type_id,'level',level)) from warehouse_ops.skill_ratings),'[]'),'standards',coalesce((select jsonb_agg(to_jsonb(s)) from warehouse_ops.work_standards s),'[]'));
$function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.verify_edit_code(p_code text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
  select warehouse_ops.check_edit_code(p_code);
$function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.start_ticket(p_ticket_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
begin
  if not warehouse_ops.is_active() then raise exception 'Account is not active'; end if;
  update warehouse_ops.tickets set status='active',started_at=clock_timestamp()
  where id=p_ticket_id and status='queued' and (assignee_id=auth.uid() or warehouse_ops.is_admin());
  if not found then raise exception 'Ticket is unavailable or already started'; end if;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.finish_ticket(p_ticket_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
begin
  if not warehouse_ops.is_active() then raise exception 'Account is not active'; end if;
  update warehouse_ops.tickets set status='done',ended_at=clock_timestamp()
  where id=p_ticket_id and status='active' and (assignee_id=auth.uid() or warehouse_ops.is_admin());
  if not found then raise exception 'Ticket is unavailable or already finished'; end if;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.create_bom_ticket_as_supervisor(p_username text, p_code text, p_ticket_no text, p_job_type_id uuid, p_assignee_id uuid, p_description text, p_fg_code text, p_fg_name text, p_requested_qty numeric, p_bom_version text, p_materials jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
declare line jsonb;
begin
  if not warehouse_ops.check_role_code('supervisor',p_username,p_code) then raise exception 'Supervisor access required'; end if;
  if not exists(select 1 from warehouse_ops.staff where id=p_assignee_id and active) then raise exception 'Staff is inactive'; end if;
  if not exists(select 1 from warehouse_ops.job_types where id=p_job_type_id and active) then raise exception 'Job is inactive'; end if;
  if length(trim(p_ticket_no)) not between 1 and 80 then raise exception 'Invalid ticket number'; end if;
  if length(coalesce(p_description,'')) > 1000 then raise exception 'Description too long'; end if;
  if length(trim(coalesce(p_fg_code,''))) not between 1 and 80 or length(trim(coalesce(p_fg_name,''))) not between 1 and 300 then raise exception 'Invalid FG'; end if;
  if p_requested_qty is null or p_requested_qty <= 0 or p_requested_qty > 1000000 then raise exception 'Invalid requested quantity'; end if;
  if p_bom_version !~ '^[0-9a-f]{64}$' then raise exception 'Invalid BOM version'; end if;
  if jsonb_typeof(p_materials) is distinct from 'array' or jsonb_array_length(p_materials) not between 1 and 30 then raise exception 'Invalid BOM lines'; end if;
  for line in select value from jsonb_array_elements(p_materials) loop
    if length(trim(coalesce(line->>'pk_code',''))) not between 1 and 80
       or length(trim(coalesce(line->>'pk_name',''))) not between 1 and 300
       or length(trim(coalesce(line->>'unit',''))) not between 1 and 30
       or (line->>'qty_per_unit')::numeric <= 0
       or (line->>'required_qty')::numeric <> round((line->>'qty_per_unit')::numeric * p_requested_qty, 4)
    then raise exception 'Invalid BOM line'; end if;
  end loop;
  perform set_config('app.ticket_actor_role','supervisor',true);
  perform set_config('app.ticket_actor_username',p_username,true);
  perform set_config('app.ticket_event_type','created',true);
  insert into warehouse_ops.tickets(ticket_no,job_type_id,assignee_id,description,fg_code,fg_name,requested_qty,bom_version,materials)
  values(trim(p_ticket_no),p_job_type_id,p_assignee_id,coalesce(trim(p_description),''),trim(p_fg_code),trim(p_fg_name),p_requested_qty,p_bom_version,p_materials);
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.add_staff_as_supervisor(p_username text, p_code text, p_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
begin
  if not warehouse_ops.check_role_code('supervisor',p_username,p_code) then raise exception 'Supervisor access required'; end if;
  insert into warehouse_ops.staff(display_name) values(trim(p_name));
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.set_staff_active_as_supervisor(p_username text, p_code text, p_staff_id uuid, p_active boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
begin
  if not warehouse_ops.check_role_code('supervisor',p_username,p_code) then raise exception 'Supervisor access required'; end if;
  update warehouse_ops.staff set active=p_active where id=p_staff_id;
  if not found then raise exception 'Staff not found'; end if;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.add_job_as_supervisor(p_username text, p_code text, p_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
begin
  if not warehouse_ops.check_role_code('supervisor',p_username,p_code) then raise exception 'Supervisor access required'; end if;
  insert into warehouse_ops.job_types(name) values(trim(p_name));
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.activate_role_codes(p_legacy_code text, p_supervisor_code text, p_operator_code text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
begin
  if exists(select 1 from warehouse_ops.app_settings where key in ('supervisor_code','operator_code'))
     or not warehouse_ops.check_edit_code(p_legacy_code) then raise exception 'Role setup unavailable'; end if;
  if length(p_supervisor_code) not between 8 and 128 or length(p_operator_code) not between 8 and 128
     or p_supervisor_code = p_operator_code then raise exception 'Invalid role codes'; end if;
  insert into warehouse_ops.app_settings(key,value) values
    ('supervisor_code',extensions.crypt(p_supervisor_code,extensions.gen_salt('bf'))),
    ('operator_code',extensions.crypt(p_operator_code,extensions.gen_salt('bf')));
  delete from warehouse_ops.app_settings where key='edit_code';
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.verify_role_code(p_role text, p_username text, p_code text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
  select warehouse_ops.check_role_code(p_role,p_username,p_code);
$function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.check_role_code(p_role text, p_username text, p_code text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
  select case p_role
    when 'supervisor' then coalesce(
      (select p_username = (select value from warehouse_ops.app_settings where key='supervisor_username')
        and value = extensions.crypt(p_code,value)
       from warehouse_ops.app_settings where key='supervisor_code'),false)
    when 'operator' then coalesce(
      (select p_username = (select value from warehouse_ops.app_settings where key='operator_username')
        and value = extensions.crypt(p_code,value)
       from warehouse_ops.app_settings where key='operator_code'),false)
    when 'clerk' then coalesce((select p_username=(select value from warehouse_ops.app_settings where key='clerk_username') and value=extensions.crypt(p_code,value) from warehouse_ops.app_settings where key='clerk_code'),false) else false end;
$function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.add_staff(p_code text, p_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
begin
  if not warehouse_ops.check_edit_code(p_code) then raise exception 'Invalid edit code'; end if;
  insert into warehouse_ops.staff(display_name) values(trim(p_name));
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.set_staff_active(p_code text, p_staff_id uuid, p_active boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
begin
  if not warehouse_ops.check_edit_code(p_code) then raise exception 'Invalid edit code'; end if;
  update warehouse_ops.staff set active=p_active where id=p_staff_id;
  if not found then raise exception 'Staff not found'; end if;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.set_job_active(p_code text, p_job_id uuid, p_active boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
begin
  if not warehouse_ops.check_edit_code(p_code) then raise exception 'Invalid edit code'; end if;
  update warehouse_ops.job_types set active=p_active where id=p_job_id;
  if not found then raise exception 'Job not found'; end if;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.set_skill_rating(p_code text, p_staff_id uuid, p_job_id uuid, p_level smallint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
begin
  if not warehouse_ops.check_edit_code(p_code) then raise exception 'Invalid edit code'; end if;
  insert into warehouse_ops.skill_ratings(profile_id,job_type_id,level,updated_at)
  values(p_staff_id,p_job_id,p_level,clock_timestamp())
  on conflict(profile_id,job_type_id) do update set level=excluded.level,updated_at=excluded.updated_at;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.create_ticket_with_code(p_code text, p_ticket_no text, p_job_type_id uuid, p_assignee_id uuid, p_description text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
begin
  if not warehouse_ops.check_edit_code(p_code) then raise exception 'Invalid edit code'; end if;
  if not exists(select 1 from warehouse_ops.staff where id=p_assignee_id and active) then raise exception 'Staff is inactive'; end if;
  if not exists(select 1 from warehouse_ops.job_types where id=p_job_type_id and active) then raise exception 'Job is inactive'; end if;
  insert into warehouse_ops.tickets(ticket_no,job_type_id,assignee_id,description)
  values(trim(p_ticket_no),p_job_type_id,p_assignee_id,coalesce(trim(p_description),''));
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.create_bom_ticket_with_code(p_code text, p_ticket_no text, p_job_type_id uuid, p_assignee_id uuid, p_description text, p_fg_code text, p_fg_name text, p_requested_qty numeric, p_bom_version text, p_materials jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
declare line jsonb;
begin
if not warehouse_ops.check_edit_code(p_code) then raise exception 'Invalid edit code'; end if;
if not exists(select 1 from warehouse_ops.staff where id=p_assignee_id and active) then raise exception 'Staff is inactive'; end if;
if not exists(select 1 from warehouse_ops.job_types where id=p_job_type_id and active) then raise exception 'Job is inactive'; end if;
if length(trim(p_ticket_no)) not between 1 and 80 then raise exception 'Invalid ticket number'; end if;
if length(coalesce(p_description,'')) > 1000 then raise exception 'Description too long'; end if;
if length(trim(coalesce(p_fg_code,''))) not between 1 and 80 or length(trim(coalesce(p_fg_name,''))) not between 1 and 300 then raise exception 'Invalid FG'; end if;
if p_requested_qty is null or p_requested_qty <= 0 or p_requested_qty > 1000000 then raise exception 'Invalid requested quantity'; end if;
if p_bom_version !~ '^[0-9a-f]{64}$' then raise exception 'Invalid BOM version'; end if;
if jsonb_typeof(p_materials) is distinct from 'array' or jsonb_array_length(p_materials) not between 1 and 30 then raise exception 'Invalid BOM lines'; end if;
for line in select value from jsonb_array_elements(p_materials) loop
if length(trim(coalesce(line->>'pk_code',''))) not between 1 and 80 or length(trim(coalesce(line->>'pk_name',''))) not between 1 and 300 or length(trim(coalesce(line->>'unit',''))) not between 1 and 30 or (line->>'qty_per_unit')::numeric <= 0 or (line->>'required_qty')::numeric <> round((line->>'qty_per_unit')::numeric * p_requested_qty, 4) then raise exception 'Invalid BOM line'; end if;
end loop;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.start_ticket_with_code(p_code text, p_ticket_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
begin
  if not warehouse_ops.check_edit_code(p_code) then raise exception 'Invalid edit code'; end if;
  update warehouse_ops.tickets set status='active',started_at=clock_timestamp() where id=p_ticket_id and status='queued';
  if not found then raise exception 'Ticket is unavailable or already started'; end if;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.finish_ticket_with_code(p_code text, p_ticket_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
begin
  if not warehouse_ops.check_edit_code(p_code) then raise exception 'Invalid edit code'; end if;
  update warehouse_ops.tickets set status='done',ended_at=clock_timestamp() where id=p_ticket_id and status='active';
  if not found then raise exception 'Ticket is unavailable or already finished'; end if;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.guard_deleted_ticket()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
begin
 if old.deleted_at is not null and (new.deleted_at is not null or current_setting('app.ticket_event_type',true) is distinct from 'restored') then raise exception 'ใบเบิกถูกลบแล้ว กรุณากู้คืนก่อนแก้ไข'; end if;
 return new;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.start_ticket_as_operator(p_username text, p_code text, p_ticket_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
begin
  if not warehouse_ops.check_role_code('operator',p_username,p_code) then raise exception 'Operator access required'; end if;
  perform set_config('app.ticket_actor_role','operator',true);
  perform set_config('app.ticket_actor_username',p_username,true);
  perform set_config('app.ticket_event_type','started',true);
  update warehouse_ops.tickets set status='active',started_at=clock_timestamp(),status_reason=null
  where id=p_ticket_id and status='queued';
  if not found then raise exception 'Ticket is unavailable or already started'; end if;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.finish_ticket_as_operator(p_username text, p_code text, p_ticket_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
begin
  if not warehouse_ops.check_role_code('operator',p_username,p_code) then raise exception 'Operator access required'; end if;
  perform set_config('app.ticket_actor_role','operator',true);
  perform set_config('app.ticket_actor_username',p_username,true);
  perform set_config('app.ticket_event_type','completed',true);
  update warehouse_ops.tickets set status='done',ended_at=clock_timestamp(),status_reason=null
  where id=p_ticket_id and status='active';
  if not found then raise exception 'Ticket is unavailable or already finished'; end if;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.get_deleted_tickets_as_supervisor(p_username text, p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
begin
 if not warehouse_ops.check_role_code('supervisor',p_username,p_code) then raise exception 'Supervisor access required'; end if;
 return coalesce((select jsonb_agg(to_jsonb(t)-'created_by' order by deleted_at desc) from warehouse_ops.tickets t where deleted_at is not null),'[]'::jsonb);
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.get_ticket_history(p_ticket_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
 select coalesce(jsonb_agg(to_jsonb(e) order by created_at desc),'[]') from warehouse_ops.ticket_events e where ticket_id=p_ticket_id;
$function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.capture_ticket_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
declare event_name text; actor uuid; actor_name text;
begin
 event_name:=nullif(current_setting('app.ticket_event_type',true),'');
 actor:=nullif(current_setting('app.work_actor_id',true),'')::uuid;
 if actor is not null then select display_name into actor_name from warehouse_ops.staff where id=actor; end if;
 insert into warehouse_ops.ticket_events(ticket_id,event_type,actor_role,actor_username,actor_staff_id,actor_display_name,reason,before_state,after_state)
 values(new.id,coalesce(event_name,case when tg_op='INSERT' then 'created' else 'edited' end),coalesce(nullif(current_setting('app.ticket_actor_role',true),''),'system'),coalesce(nullif(current_setting('app.ticket_actor_username',true),''),'system'),actor,actor_name,nullif(current_setting('app.ticket_reason',true),''),case when tg_op='INSERT' then null else to_jsonb(old)-'created_by' end,to_jsonb(new)-'created_by');
 return new;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.add_staff_with_photo_as_supervisor(p_username text, p_code text, p_name text, p_photo text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
declare staff_id uuid;
begin
 if not warehouse_ops.check_role_code('supervisor',p_username,p_code) then raise exception 'Supervisor access required'; end if;
 if length(trim(coalesce(p_name,''))) not between 1 and 100 then raise exception 'กรุณาระบุชื่อพนักงานไม่เกิน 100 ตัวอักษร'; end if;
 perform warehouse_ops.validate_staff_photo(p_photo);
 insert into warehouse_ops.staff(display_name,photo_data) values(trim(p_name),p_photo) returning id into staff_id;
 return staff_id;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.set_staff_photo_as_supervisor(p_username text, p_code text, p_staff_id uuid, p_photo text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
begin
 if not warehouse_ops.check_role_code('supervisor',p_username,p_code) then raise exception 'Supervisor access required'; end if;
 if p_photo is null then raise exception 'กรุณาเลือกรูปภาพ'; end if;
 perform warehouse_ops.validate_staff_photo(p_photo);
 update warehouse_ops.staff set photo_data=p_photo where id=p_staff_id;
 if not found then raise exception 'ไม่พบพนักงาน'; end if;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.pause_ticket_as_operator(p_username text, p_code text, p_ticket_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
begin
  if not warehouse_ops.check_role_code('operator',p_username,p_code) then raise exception 'Operator access required'; end if;
  if length(trim(coalesce(p_reason,''))) not between 1 and 1000 then raise exception 'Reason required'; end if;
  perform set_config('app.ticket_actor_role','operator',true);
  perform set_config('app.ticket_actor_username',p_username,true);
  perform set_config('app.ticket_event_type','paused',true);
  perform set_config('app.ticket_reason',trim(p_reason),true);
  update warehouse_ops.tickets set status='paused',status_reason=trim(p_reason)
  where id=p_ticket_id and status='active';
  if not found then raise exception 'Only active tickets can be paused'; end if;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.resume_ticket_as_operator(p_username text, p_code text, p_ticket_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
begin
  if not warehouse_ops.check_role_code('operator',p_username,p_code) then raise exception 'Operator access required'; end if;
  if length(coalesce(p_reason,'')) > 1000 then raise exception 'Reason too long'; end if;
  perform set_config('app.ticket_actor_role','operator',true);
  perform set_config('app.ticket_actor_username',p_username,true);
  perform set_config('app.ticket_event_type','resumed',true);
  perform set_config('app.ticket_reason',coalesce(trim(p_reason),''),true);
  update warehouse_ops.tickets set status='active',status_reason=null
  where id=p_ticket_id and status='paused';
  if not found then raise exception 'Only paused tickets can resume'; end if;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.mark_ticket_partial_as_operator(p_username text, p_code text, p_ticket_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
begin
  if not warehouse_ops.check_role_code('operator',p_username,p_code) then raise exception 'Operator access required'; end if;
  if length(trim(coalesce(p_reason,''))) not between 1 and 1000 then raise exception 'Reason required'; end if;
  perform set_config('app.ticket_actor_role','operator',true);
  perform set_config('app.ticket_actor_username',p_username,true);
  perform set_config('app.ticket_event_type','partial',true);
  perform set_config('app.ticket_reason',trim(p_reason),true);
  update warehouse_ops.tickets set status='partial',ended_at=clock_timestamp(),status_reason=trim(p_reason)
  where id=p_ticket_id and status in ('active','paused');
  if not found then raise exception 'Only started tickets can be marked partial'; end if;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.cancel_ticket_as_supervisor(p_username text, p_code text, p_ticket_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
begin
  if not warehouse_ops.check_role_code('supervisor',p_username,p_code) then raise exception 'Supervisor access required'; end if;
  if length(trim(coalesce(p_reason,''))) not between 1 and 1000 then raise exception 'Reason required'; end if;
  perform set_config('app.ticket_actor_role','supervisor',true);
  perform set_config('app.ticket_actor_username',p_username,true);
  perform set_config('app.ticket_event_type','cancelled',true);
  perform set_config('app.ticket_reason',trim(p_reason),true);
  update warehouse_ops.tickets set status='cancelled',ended_at=clock_timestamp(),status_reason=trim(p_reason)
  where id=p_ticket_id and status in ('queued','active','paused');
  if not found then raise exception 'Only open tickets can be cancelled'; end if;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.set_competency_as_supervisor(p_username text, p_code text, p_staff_id uuid, p_competency_id uuid, p_level integer, p_expected integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
declare old_level integer;s staff%rowtype;c competency_catalog%rowtype;
begin
 if not check_role_code('supervisor',p_username,p_code) then raise exception 'Supervisor access required';end if;
 if p_level is null or p_level not between 0 and 5 then raise exception 'คะแนนต้องอยู่ระหว่าง 1–5 หรือ 0 เพื่อล้างคะแนน';end if;
 select * into s from staff where id=p_staff_id for update;if not found then raise exception 'ไม่พบพนักงาน';end if;
 select * into c from competency_catalog where id=p_competency_id;if not found then raise exception 'ไม่พบทักษะ';end if;
 select level into old_level from competency_ratings where staff_id=p_staff_id and competency_id=p_competency_id;
 if old_level is distinct from p_expected then raise exception 'คะแนนเปลี่ยนแล้ว กรุณาโหลดข้อมูลใหม่';end if;
 if p_level=0 then delete from competency_ratings where staff_id=p_staff_id and competency_id=p_competency_id;
 else insert into competency_ratings values(p_staff_id,p_competency_id,p_level) on conflict(staff_id,competency_id) do update set level=excluded.level;end if;
 insert into management_events(event_type,actor_username,actor_role,before_state,after_state) values('competency_assessed',p_username,'supervisor',jsonb_build_object('employee',s.display_name,'competency',c.name,'level',old_level),jsonb_build_object('employee',s.display_name,'competency',c.name,'level',nullif(p_level,0)));
end;$function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.create_withdrawal_ticket_as_supervisor(p_username text, p_code text, p_ticket_no text, p_job_type_id uuid, p_assignee_id uuid, p_description text, p_fg_code text, p_fg_name text, p_requested_qty numeric, p_bom_version text, p_bom_materials jsonb, p_stock_lines jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
declare line jsonb; has_bom boolean; seen_codes text[] := '{}'; line_code text;
begin
  if not warehouse_ops.check_role_code('supervisor',p_username,p_code) then raise exception 'Supervisor access required'; end if;
  if not exists(select 1 from warehouse_ops.staff where id=p_assignee_id and active) then raise exception 'Staff is inactive'; end if;
  if not exists(select 1 from warehouse_ops.job_types where id=p_job_type_id and active) then raise exception 'Job is inactive'; end if;
  if length(trim(coalesce(p_ticket_no,''))) not between 1 and 80 then raise exception 'Invalid ticket number'; end if;
  if length(coalesce(p_description,'')) > 1000 then raise exception 'Description too long'; end if;
  if jsonb_typeof(p_bom_materials) is distinct from 'array' then raise exception 'Invalid BOM lines'; end if;
  if jsonb_typeof(p_stock_lines) is distinct from 'array' then raise exception 'Invalid stock lines'; end if;
  if jsonb_array_length(p_bom_materials) > 30 or jsonb_array_length(p_stock_lines) > 30
    or jsonb_array_length(p_bom_materials)+jsonb_array_length(p_stock_lines) > 40
  then raise exception 'Too many material lines'; end if;
  has_bom := nullif(trim(coalesce(p_fg_code,'')),'') is not null;
  if has_bom then
    if length(trim(p_fg_code)) > 80 or length(trim(coalesce(p_fg_name,''))) not between 1 and 300
       or p_requested_qty is null or p_requested_qty <= 0 or p_requested_qty > 1000000
       or p_requested_qty <> round(p_requested_qty,3)
       or coalesce(p_bom_version,'') !~ '^[0-9a-f]{64}$'
       or jsonb_array_length(p_bom_materials)=0 then raise exception 'Invalid BOM selection'; end if;
  elsif jsonb_array_length(p_stock_lines)=0 or jsonb_array_length(p_bom_materials)<>0
     or p_requested_qty is not null or nullif(trim(coalesce(p_fg_name,'')),'') is not null
     or nullif(trim(coalesce(p_bom_version,'')),'') is not null
  then raise exception 'A BOM or a stock line is required'; end if;

  for line in select value from jsonb_array_elements(p_bom_materials) loop
    line_code := upper(trim(coalesce(line->>'pk_code','')));
    if line_code !~ '^[A-Z0-9/._-]{1,80}$'
       or length(trim(coalesce(line->>'pk_name',''))) not between 1 and 300
       or length(trim(coalesce(line->>'unit',''))) not between 1 and 30
       or (line->>'qty_per_unit')::numeric <= 0
       or (line->>'required_qty')::numeric <> round((line->>'qty_per_unit')::numeric*p_requested_qty,4)
    then raise exception 'Invalid BOM line'; end if;
    if not line_code=any(seen_codes) then seen_codes := array_append(seen_codes,line_code); end if;
  end loop;
  for line in select value from jsonb_array_elements(p_stock_lines) loop
    line_code := upper(trim(coalesce(line->>'pk_code','')));
    if line->>'source' is distinct from 'stock'
       or line_code !~ '^[A-Z0-9/._-]{1,80}$'
       or length(trim(coalesce(line->>'pk_name',''))) not between 1 and 300
       or length(trim(coalesce(line->>'unit',''))) not between 1 and 30
       or coalesce((line->>'required_qty')::numeric,0) <= 0
       or (line->>'required_qty')::numeric > 1000000000
       or (line->>'required_qty')::numeric <> round((line->>'required_qty')::numeric,4)
       or coalesce((line->>'stock_snapshot_id')::bigint,0) <= 0
       or length(trim(coalesce(line->>'stock_report_date',''))) not between 1 and 120
       or nullif(line->>'stock_snapshot_saved_at','') is null
       or line_code=any(seen_codes) then raise exception 'Invalid or duplicate stock line'; end if;
    seen_codes := array_append(seen_codes,line_code);
  end loop;
  perform set_config('app.ticket_actor_role','supervisor',true);
  perform set_config('app.ticket_actor_username',p_username,true);
  perform set_config('app.ticket_event_type','created',true);
  insert into warehouse_ops.tickets(ticket_no,job_type_id,assignee_id,description,fg_code,fg_name,requested_qty,bom_version,materials)
  values(trim(p_ticket_no),p_job_type_id,p_assignee_id,coalesce(trim(p_description),''),
    case when has_bom then trim(p_fg_code) else null end,
    case when has_bom then trim(p_fg_name) else null end,
    case when has_bom then p_requested_qty else null end,
    case when has_bom then p_bom_version else null end,
    p_bom_materials || p_stock_lines);
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.edit_ticket_as_supervisor(p_username text, p_code text, p_ticket_id uuid, p_ticket_no text, p_job_type_id uuid, p_assignee_id uuid, p_description text, p_requested_qty numeric, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
declare old_ticket warehouse_ops.tickets%rowtype; new_materials jsonb;
begin
  if not warehouse_ops.check_role_code('supervisor',p_username,p_code) then raise exception 'Supervisor access required'; end if;
  if length(trim(coalesce(p_reason,''))) not between 1 and 1000 then raise exception 'Reason required'; end if;
  if length(trim(coalesce(p_ticket_no,''))) not between 1 and 80 then raise exception 'Invalid ticket number'; end if;
  if length(coalesce(p_description,'')) > 1000 then raise exception 'Description too long'; end if;
  select * into old_ticket from warehouse_ops.tickets where id=p_ticket_id for update;
  if not found then raise exception 'Ticket not found'; end if;
  if p_assignee_id is distinct from old_ticket.assignee_id
     and not exists(select 1 from warehouse_ops.staff where id=p_assignee_id and active) then raise exception 'Staff is inactive'; end if;
  if p_job_type_id is distinct from old_ticket.job_type_id
     and not exists(select 1 from warehouse_ops.job_types where id=p_job_type_id and active) then raise exception 'Job is inactive'; end if;
  new_materials := old_ticket.materials;
  if old_ticket.fg_code is not null then
    if p_requested_qty is null or p_requested_qty <= 0 or p_requested_qty > 1000000
       or p_requested_qty <> round(p_requested_qty,3) then raise exception 'Invalid requested quantity'; end if;
    select jsonb_agg(case when line->>'source'='stock' then line
      else jsonb_set(line,'{required_qty}',to_jsonb(round((line->>'qty_per_unit')::numeric*p_requested_qty,4)))
      end order by ordinality) into new_materials
    from jsonb_array_elements(old_ticket.materials) with ordinality as x(line,ordinality);
  elsif p_requested_qty is not null then raise exception 'This ticket has no FG quantity'; end if;
  if trim(p_ticket_no)=old_ticket.ticket_no and p_job_type_id=old_ticket.job_type_id
     and p_assignee_id=old_ticket.assignee_id and coalesce(trim(p_description),'')=old_ticket.description
     and (old_ticket.fg_code is null or p_requested_qty=old_ticket.requested_qty)
  then raise exception 'No changes to save'; end if;
  perform set_config('app.ticket_actor_role','supervisor',true);
  perform set_config('app.ticket_actor_username',p_username,true);
  perform set_config('app.ticket_event_type','edited',true);
  perform set_config('app.ticket_reason',trim(p_reason),true);
  update warehouse_ops.tickets set ticket_no=trim(p_ticket_no),job_type_id=p_job_type_id,
    assignee_id=p_assignee_id,description=coalesce(trim(p_description),''),
    requested_qty=case when old_ticket.fg_code is null then null else p_requested_qty end,
    materials=new_materials
  where id=p_ticket_id;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.confirm_ticket_picks_as_operator(p_username text, p_code text, p_ticket_id uuid, p_expected_materials jsonb, p_expected_status text, p_picks jsonb, p_close_status text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
declare t warehouse_ops.tickets%rowtype; line jsonb; pick jsonb; result jsonb := '[]'; actual numeric; required numeric; reason text; shorts integer := 0; i integer;
begin
  if not warehouse_ops.check_role_code('operator',p_username,p_code) then raise exception 'Operator access required'; end if;
  select * into t from warehouse_ops.tickets where id=p_ticket_id for update;
  if not found or t.status not in ('active','paused') then raise exception 'บันทึกได้เฉพาะงานที่เริ่มแล้วหรือพักอยู่'; end if;
  if t.materials is distinct from p_expected_materials or t.status is distinct from p_expected_status then raise exception 'ใบเบิกถูกแก้ไขจากเครื่องอื่น กรุณาปิดฟอร์มแล้วเปิดใหม่'; end if;
  if p_close_status is not null and p_close_status not in ('done','partial') then raise exception 'Invalid close status'; end if;
  if p_close_status='done' and t.status<>'active' then raise exception 'กรุณากลับมาทำงานต่อก่อนจบงาน'; end if;
  if jsonb_typeof(p_picks) is distinct from 'array' or jsonb_array_length(p_picks)<>jsonb_array_length(t.materials) or jsonb_array_length(t.materials)=0 then raise exception 'กรุณายืนยันให้ครบทุกรายการ'; end if;
  for i in 0..jsonb_array_length(t.materials)-1 loop
    line:=t.materials->i; pick:=p_picks->i; required:=(line->>'required_qty')::numeric;
    if jsonb_typeof(pick->'actual_qty') is distinct from 'number' then raise exception 'กรุณาใส่จำนวนเบิกจริง'; end if;
    actual:=(pick->>'actual_qty')::numeric; reason:=trim(coalesce(pick->>'short_reason',''));
    if actual<0 or actual>1000000000 or actual<>round(actual,4) then raise exception 'จำนวนเบิกจริงต้องอยู่ระหว่าง 0 ถึง 1,000,000,000 (ทศนิยมไม่เกิน 4 ตำแหน่ง)'; end if;
    if length(reason)>1000 or (abs(actual-required)>=1 and length(reason)=0) then raise exception 'กรุณาระบุเหตุผลของรายการที่เบิกขาดหรือเกิน'; end if;
    if required-actual>1 then shorts:=shorts+1; end if;
    result:=result || jsonb_build_array(line || jsonb_build_object('actual_qty',actual,'short_reason',case when actual<>required then reason else '' end,'confirmed_at',clock_timestamp(),'reason_code',pick->>'reason_code'));
  end loop;
  if p_close_status='done' and shorts>0 then raise exception 'มีรายการขาด กรุณาปิดเป็นเบิกไม่ครบ'; end if;
  if p_close_status='partial' and shorts=0 then raise exception 'ไม่มีรายการขาด กรุณาปิดเป็นเสร็จแล้ว'; end if;
  perform set_config('app.ticket_actor_role','operator',true);
  perform set_config('app.ticket_actor_username',p_username,true);
  perform set_config('app.ticket_event_type',case p_close_status when 'done' then 'completed' when 'partial' then 'partial' else 'edited' end,true);
  perform set_config('app.ticket_reason','ยืนยันจำนวนเบิกจริง '||jsonb_array_length(result)||' รายการ · ขาด '||shorts||' รายการ',true);
  update warehouse_ops.tickets set materials=result,status=coalesce(p_close_status,status),
    ended_at=case when p_close_status is not null then clock_timestamp() else ended_at end,
    status_reason=case when p_close_status='partial' then 'เบิกขาด '||shorts||' รายการ — ดูเหตุผลในรายการวัสดุ' when p_close_status='done' then null else status_reason end where id=t.id;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.guard_ticket_picks()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
declare old_plan jsonb; new_plan jsonb; missing_count integer; short_count integer;
begin
  select jsonb_agg(x - 'actual_qty' - 'short_reason' - 'confirmed_at' - 'reason_code') into old_plan from jsonb_array_elements(coalesce(old.materials,'[]')) x;
  select jsonb_agg(x - 'actual_qty' - 'short_reason' - 'confirmed_at' - 'reason_code') into new_plan from jsonb_array_elements(coalesce(new.materials,'[]')) x;
  if old_plan is distinct from new_plan then
    if old.status in ('done','partial') and exists(select 1 from jsonb_array_elements(coalesce(old.materials,'[]')) x where x ? 'confirmed_at') then
      raise exception 'ใบที่ยืนยันเบิกจริงและปิดแล้วไม่สามารถเปลี่ยนจำนวนวัสดุได้';
    end if;
    new.materials := coalesce(new_plan,'[]');
  end if;
  if new.status in ('done','partial') and old.status is distinct from new.status then
    select count(*) filter(where not (x ? 'confirmed_at') or jsonb_typeof(x->'actual_qty') is distinct from 'number'),
      count(*) filter(where (x->>'required_qty')::numeric - (x->>'actual_qty')::numeric > 1)
      into missing_count,short_count from jsonb_array_elements(coalesce(new.materials,'[]')) x;
    if missing_count > 0 then raise exception 'กรุณายืนยันจำนวนเบิกจริงทุกรายการก่อนปิดงาน'; end if;
    if new.status='done' and short_count > 0 then raise exception 'มีรายการขาด กรุณาปิดเป็นเบิกไม่ครบ'; end if;
    if new.status='partial' and jsonb_array_length(coalesce(new.materials,'[]')) > 0 and short_count=0 then raise exception 'ไม่มีรายการขาด กรุณาปิดเป็นเสร็จแล้ว'; end if;
  end if;
  return new;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.validate_staff_photo(p_photo text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
declare image_bytes bytea;
begin
 if p_photo is null then return; end if;
 if length(p_photo)>100000 or p_photo !~ '^data:image/jpeg;base64,[A-Za-z0-9+/]+={0,2}$' then raise exception 'รูปภาพไม่ถูกต้องหรือมีขนาดใหญ่เกินไป'; end if;
 image_bytes:=decode(substr(p_photo,24),'base64');
 if octet_length(image_bytes)<4 or substring(image_bytes from 1 for 3)<>decode('ffd8ff','hex') or substring(image_bytes from octet_length(image_bytes)-1 for 2)<>decode('ffd9','hex') then raise exception 'รูปภาพต้องเป็น JPEG'; end if;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.set_ticket_deleted_as_supervisor(p_username text, p_code text, p_ticket_id uuid, p_reason text, p_deleted boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
begin
 if not warehouse_ops.check_role_code('supervisor',p_username,p_code) then raise exception 'Supervisor access required'; end if;
 if length(trim(coalesce(p_reason,''))) not between 1 and 1000 then raise exception 'Reason required'; end if;
 perform set_config('app.ticket_actor_role','supervisor',true);
 perform set_config('app.ticket_actor_username',p_username,true);
 perform set_config('app.ticket_event_type',case when p_deleted then 'deleted' else 'restored' end,true);
 perform set_config('app.ticket_reason',trim(p_reason),true);
 update warehouse_ops.tickets set deleted_at=case when p_deleted then clock_timestamp() else null end
 where id=p_ticket_id and (deleted_at is not null) is distinct from p_deleted;
 if not found then raise exception 'ใบเบิกถูกลบหรือกู้คืนแล้ว กรุณาโหลดข้อมูลใหม่'; end if;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.finish_ticket_as_supervisor(p_username text, p_code text, p_ticket_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
begin
  if not warehouse_ops.check_role_code('supervisor',p_username,p_code) then raise exception 'Supervisor access required'; end if;
  perform set_config('app.ticket_actor_role','supervisor',true);
  perform set_config('app.ticket_actor_username',p_username,true);
  perform set_config('app.ticket_event_type','completed',true);
  update warehouse_ops.tickets set status='done',ended_at=clock_timestamp(),status_reason=null
  where id=p_ticket_id and status='active' and deleted_at is null;
  if not found then raise exception 'Ticket is unavailable or already finished'; end if;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.withdrawal_document_refs(p_number text, p_fg text)
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
declare refs text[];
begin
  select array_agg(ref order by position) into refs
  from regexp_split_to_table(trim(p_number),'[,，[:space:]]+') with ordinality as parts(ref,position)
  where ref<>'';
  if p_fg is null and p_number !~ '[,，]' and exists(select 1 from unnest(refs) ref where ref !~ '[0-9]') then
    return array[trim(p_number)];
  end if;
  return coalesce(refs,array[]::text[]);
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.reserve_withdrawal_document_numbers()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
declare refs text[];
begin
  refs:=warehouse_ops.withdrawal_document_refs(new.ticket_no,new.fg_code);
  if cardinality(refs)=0 then raise exception 'กรุณาระบุเลขที่ใบเบิก'; end if;
  if cardinality(refs)<>(select count(distinct lower(ref)) from unnest(refs) ref) then
    raise exception 'มีเลขที่ใบเบิกซ้ำในช่องนี้ กรุณาตรวจสอบ';
  end if;
  delete from warehouse_ops.withdrawal_document_numbers where ticket_id=new.id;
  begin
    insert into warehouse_ops.withdrawal_document_numbers(document_key,ticket_id)
    select lower(ref),new.id from unnest(refs) ref;
  exception when unique_violation then
    raise exception 'เลขที่ใบเบิกบางใบมีอยู่แล้ว กรุณาตรวจสอบแต่ละเลขที่' using errcode='23505',constraint='tickets_ticket_no_key';
  end;
  return new;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.resume_ticket_as_supervisor(p_username text, p_code text, p_ticket_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
begin
  if not warehouse_ops.check_role_code('supervisor',p_username,p_code) then raise exception 'Supervisor access required'; end if;
  if length(coalesce(p_reason,'')) > 1000 then raise exception 'Reason too long'; end if;
  perform set_config('app.ticket_actor_role','supervisor',true);
  perform set_config('app.ticket_actor_username',p_username,true);
  perform set_config('app.ticket_event_type','resumed',true);
  perform set_config('app.ticket_reason',coalesce(trim(p_reason),''),true);
  update warehouse_ops.tickets set status='active',status_reason=null
  where id=p_ticket_id and status='paused' and deleted_at is null;
  if not found then raise exception 'Only paused tickets can resume'; end if;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.confirm_ticket_picks_as_supervisor(p_username text, p_code text, p_ticket_id uuid, p_expected_materials jsonb, p_expected_status text, p_picks jsonb, p_close_status text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
declare t warehouse_ops.tickets%rowtype; line jsonb; pick jsonb; result jsonb := '[]'; actual numeric; required numeric; reason text; shorts integer := 0; i integer;
begin
  if not warehouse_ops.check_role_code('supervisor',p_username,p_code) then raise exception 'Supervisor access required'; end if;
  select * into t from warehouse_ops.tickets where id=p_ticket_id for update;
  if not found or t.deleted_at is not null or t.status not in ('active','paused') then raise exception 'บันทึกได้เฉพาะงานที่เริ่มแล้วหรือพักอยู่'; end if;
  if t.materials is distinct from p_expected_materials or t.status is distinct from p_expected_status then raise exception 'ใบเบิกถูกแก้ไขจากเครื่องอื่น กรุณาปิดฟอร์มแล้วเปิดใหม่'; end if;
  if p_close_status is not null and p_close_status not in ('done','partial') then raise exception 'Invalid close status'; end if;
  if p_close_status='done' and t.status<>'active' then raise exception 'กรุณากลับมาทำงานต่อก่อนจบงาน'; end if;
  if jsonb_typeof(p_picks) is distinct from 'array' or jsonb_array_length(p_picks)<>jsonb_array_length(t.materials) or jsonb_array_length(t.materials)=0 then raise exception 'กรุณายืนยันให้ครบทุกรายการ'; end if;
  for i in 0..jsonb_array_length(t.materials)-1 loop
    line:=t.materials->i; pick:=p_picks->i; required:=(line->>'required_qty')::numeric;
    if jsonb_typeof(pick->'actual_qty') is distinct from 'number' then raise exception 'กรุณาใส่จำนวนเบิกจริง'; end if;
    actual:=(pick->>'actual_qty')::numeric; reason:=trim(coalesce(pick->>'short_reason',''));
    if actual<0 or actual>1000000000 or actual<>round(actual,4) then raise exception 'จำนวนเบิกจริงต้องอยู่ระหว่าง 0 ถึง 1,000,000,000 (ทศนิยมไม่เกิน 4 ตำแหน่ง)'; end if;
    if length(reason)>1000 or (abs(actual-required)>=1 and length(reason)=0) then raise exception 'กรุณาระบุเหตุผลของรายการที่เบิกขาดหรือเกิน'; end if;
    if required-actual>1 then shorts:=shorts+1; end if;
    result:=result || jsonb_build_array(line || jsonb_build_object('actual_qty',actual,'short_reason',case when actual<>required then reason else '' end,'confirmed_at',clock_timestamp(),'reason_code',pick->>'reason_code'));
  end loop;
  if p_close_status='done' and shorts>0 then raise exception 'มีรายการขาด กรุณาปิดเป็นเบิกไม่ครบ'; end if;
  if p_close_status='partial' and shorts=0 then raise exception 'ไม่มีรายการขาด กรุณาปิดเป็นเสร็จแล้ว'; end if;
  perform set_config('app.ticket_actor_role','supervisor',true);
  perform set_config('app.ticket_actor_username',p_username,true);
  perform set_config('app.ticket_event_type',case p_close_status when 'done' then 'completed' when 'partial' then 'partial' else 'edited' end,true);
  perform set_config('app.ticket_reason','ยืนยันจำนวนเบิกจริง '||jsonb_array_length(result)||' รายการ · ขาด '||shorts||' รายการ',true);
  update warehouse_ops.tickets set materials=result,status=coalesce(p_close_status,status),
    ended_at=case when p_close_status is not null then clock_timestamp() else ended_at end,
    status_reason=case when p_close_status='partial' then 'เบิกขาด '||shorts||' รายการ — ดูเหตุผลในรายการวัสดุ' when p_close_status='done' then null else status_reason end where id=t.id;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.rename_staff_as_supervisor(p_username text, p_code text, p_staff_id uuid, p_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
begin
 if not warehouse_ops.check_role_code('supervisor',p_username,p_code) then raise exception 'Supervisor access required'; end if;
 if length(trim(coalesce(p_name,''))) not between 1 and 100 then raise exception 'กรุณาระบุชื่อพนักงานไม่เกิน 100 ตัวอักษร'; end if;
 update warehouse_ops.staff set display_name=trim(p_name) where id=p_staff_id;
 if not found then raise exception 'ไม่พบพนักงาน'; end if;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.track_work_intervals()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
declare supplied jsonb; refs text[]; row jsonb; total numeric:=0; actor uuid;
begin
 if tg_op='UPDATE' then
   if new.requested_qty is distinct from old.requested_qty then
     select jsonb_agg(case when line->>'source'='stock' then line else line-'actual_qty'-'confirmed_at'-'short_reason'-'reason_code' end order by ordinal) into new.materials from jsonb_array_elements(new.materials) with ordinality as x(line,ordinal);
   end if;
   new.pause_intervals:=old.pause_intervals;
   if old.status<>'paused' and new.status='paused' then
     new.pause_intervals:=new.pause_intervals||jsonb_build_array(jsonb_build_object('start',clock_timestamp(),'end',null));
   elsif old.status='paused' and new.status<>'paused' then
     select coalesce(jsonb_agg(case when p->>'end' is null then p||jsonb_build_object('end',coalesce(new.ended_at,clock_timestamp())) else p end),'[]') into new.pause_intervals from jsonb_array_elements(new.pause_intervals) p;
   end if;
 end if;
 supplied:=nullif(current_setting('app.work_documents',true),'')::jsonb;
 refs:=warehouse_ops.withdrawal_document_refs(new.ticket_no,new.fg_code);
 if supplied is not null then
   if jsonb_typeof(supplied)<>'array' or jsonb_array_length(supplied)<>cardinality(refs) then raise exception 'จำนวนใบในรายละเอียดไม่ตรงกับเลขที่ใบเบิก'; end if;
   if (select count(distinct upper(trim(p->>'number'))) from jsonb_array_elements(supplied) p)<>cardinality(refs) then raise exception 'เลขที่ใบเบิกว่างหรือซ้ำกัน'; end if;
   for row in select value from jsonb_array_elements(supplied) loop
     if not exists(select 1 from unnest(refs) r where upper(r)=upper(trim(row->>'number'))) then raise exception 'เลขที่ในรายละเอียดไม่ตรงกับใบเบิก'; end if;
     if new.fg_code is not null then
       if jsonb_typeof(row->'quantity') is distinct from 'number' or (row->>'quantity')::numeric<=0 or (row->>'quantity')::numeric>1000000 or (row->>'quantity')::numeric<>round((row->>'quantity')::numeric,3) then raise exception 'กรุณากรอกจำนวนผลิตรายใบให้ครบ'; end if;
       total:=total+(row->>'quantity')::numeric;
     end if;
   end loop;
   if new.fg_code is not null and total is distinct from new.requested_qty then raise exception 'ยอดรวมจำนวนผลิตไม่ตรงกับรายใบ'; end if;
   new.documents:=supplied;
 elsif tg_op='UPDATE' and (new.ticket_no is distinct from old.ticket_no or new.requested_qty is distinct from old.requested_qty) then
   select jsonb_agg(jsonb_build_object('number',r,'quantity',case when cardinality(refs)=1 then new.requested_qty else null end)) into new.documents from unnest(refs) r;
 end if;
 return new;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.set_job_active_as_supervisor(p_username text, p_code text, p_job_id uuid, p_active boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
begin
  if not warehouse_ops.check_role_code('supervisor',p_username,p_code) then raise exception 'Supervisor access required'; end if;
  update warehouse_ops.job_types set active=p_active where id=p_job_id;
  if not found then raise exception 'Job not found'; end if;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.set_skill_rating_as_supervisor(p_username text, p_code text, p_staff_id uuid, p_job_id uuid, p_level smallint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
begin
  if not warehouse_ops.check_role_code('supervisor',p_username,p_code) then raise exception 'Supervisor access required'; end if;
  insert into warehouse_ops.skill_ratings(profile_id,job_type_id,level,updated_at)
  values(p_staff_id,p_job_id,p_level,clock_timestamp())
  on conflict(profile_id,job_type_id) do update set level=excluded.level,updated_at=excluded.updated_at;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.perform_work_action(p_username text, p_code text, p_role text, p_actor_id uuid, p_action text, p_args jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
declare allowed text[]:=array['add_staff_profile_as_supervisor','edit_staff_profile_as_supervisor','set_competency_as_supervisor','start_ticket_as_supervisor','finish_ticket_as_supervisor','resume_ticket_as_supervisor','confirm_ticket_picks_as_supervisor','start_ticket_as_operator','finish_ticket_as_operator','pause_ticket_as_operator','resume_ticket_as_operator','mark_ticket_partial_as_operator','confirm_ticket_picks_as_operator','create_withdrawal_ticket_as_supervisor','edit_ticket_with_times_as_supervisor','edit_ticket_picks_as_supervisor','cancel_ticket_as_supervisor','set_ticket_deleted_as_supervisor','add_staff_with_photo_as_supervisor','rename_staff_as_supervisor','set_staff_photo_as_supervisor','set_staff_active_as_supervisor','add_job_as_supervisor','set_job_active_as_supervisor','set_skill_rating_as_supervisor','set_work_standard_as_supervisor','purge_ticket_as_supervisor'];
 proc record; expressions text:=''; i integer; args jsonb; result jsonb; pick jsonb; t warehouse_ops.tickets%rowtype;
begin
 if not p_action=any(allowed) or p_role not in ('operator','supervisor') or right(p_action,length('_as_'||p_role))<>'_as_'||p_role then raise exception 'สิทธิ์ไม่ตรงกับการทำรายการ'; end if;
 if not warehouse_ops.check_role_code(p_role,p_username,p_code) then raise exception 'สิทธิ์ใช้งานไม่ถูกต้อง'; end if;
 if p_role='operator' and not exists(select 1 from warehouse_ops.staff where id=p_actor_id and active) then raise exception 'กรุณาระบุผู้ทำรายการที่เปิดใช้งาน'; end if;
 if jsonb_typeof(p_args) is distinct from 'object' then raise exception 'ข้อมูลไม่ถูกต้อง'; end if;
 if p_action='create_withdrawal_ticket_as_supervisor' then
    p_args:=jsonb_set(p_args,'{p_bom_materials}',coalesce((select jsonb_agg(line-'actual_qty'-'confirmed_at'-'short_reason'-'reason_code') from jsonb_array_elements(p_args->'p_bom_materials') line),'[]'));
    p_args:=jsonb_set(p_args,'{p_stock_lines}',coalesce((select jsonb_agg(line-'actual_qty'-'confirmed_at'-'short_reason'-'reason_code') from jsonb_array_elements(p_args->'p_stock_lines') line),'[]'));
  end if;
  args:=p_args||jsonb_build_object('p_username',p_username,'p_code',p_code);
 if p_args ? 'p_ticket_id' then
   select * into t from warehouse_ops.tickets where id=(p_args->>'p_ticket_id')::uuid for update;
   if not found then raise exception 'ไม่พบงาน'; end if;
 end if;
 if p_action in ('confirm_ticket_picks_as_operator','confirm_ticket_picks_as_supervisor','edit_ticket_picks_as_supervisor') then
   i:=0;
   for pick in select value from jsonb_array_elements(p_args->'p_picks') loop
     if abs((pick->>'actual_qty')::numeric - (t.materials->i->>'required_qty')::numeric)>=1 and coalesce(pick->>'reason_code','') not in ('stock_shortage','approved_extra','bom_difference','picking_error','other') then raise exception 'กรุณาเลือกประเภทเหตุผลของรายการขาดหรือเกิน'; end if;
     i:=i+1;
   end loop;
 end if;
 if p_action in ('finish_ticket_as_operator','finish_ticket_as_supervisor') and jsonb_array_length(coalesce(t.materials,'[]'))>0 then raise exception 'กรุณาบันทึกยอดเบิกจริงให้ครบผ่านปุ่มจบงาน'; end if;
 perform set_config('app.work_actor_id',coalesce(p_actor_id::text,''),true);
 perform set_config('app.work_documents',coalesce((p_args->'p_documents')::text,''),true);
 if p_action='create_withdrawal_ticket_as_supervisor' and nullif(p_args->>'p_fg_code','') is not null and not(p_args ? 'p_documents') then raise exception 'กรุณาระบุจำนวนผลิตรายใบ'; end if;
 select p.oid,p.proargnames,p.proargtypes,p.pronargs,p.prorettype into proc from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='warehouse_ops' and p.proname=p_action;
 for i in 1..proc.pronargs loop
   if i>1 then expressions:=expressions||','; end if;
   if proc.proargtypes[i-1]='jsonb'::regtype then expressions:=expressions||format('($1->%L)',proc.proargnames[i]);
   else expressions:=expressions||format('($1->>%L)::%s',proc.proargnames[i],format_type(proc.proargtypes[i-1],null)); end if;
 end loop;
 if proc.prorettype='void'::regtype then execute format('select warehouse_ops.%I(%s)',p_action,expressions) using args;result:='true';
 else execute format('select to_jsonb(warehouse_ops.%I(%s))',p_action,expressions) into result using args; end if;
 return result;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.edit_ticket_with_times_as_supervisor(p_username text, p_code text, p_ticket_id uuid, p_ticket_no text, p_job_type_id uuid, p_assignee_id uuid, p_description text, p_requested_qty numeric, p_started_at timestamp with time zone, p_ended_at timestamp with time zone, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
declare old_ticket warehouse_ops.tickets%rowtype; new_materials jsonb;
begin
  if not warehouse_ops.check_role_code('supervisor',p_username,p_code) then raise exception 'Supervisor access required'; end if;
  if length(trim(coalesce(p_reason,''))) not between 1 and 1000 then raise exception 'Reason required'; end if;
  if length(trim(coalesce(p_ticket_no,''))) not between 1 and 80 then raise exception 'Invalid ticket number'; end if;
  if length(coalesce(p_description,'')) > 1000 then raise exception 'Description too long'; end if;

  select * into old_ticket from warehouse_ops.tickets where id=p_ticket_id for update;
  if not found then raise exception 'Ticket not found'; end if;
  if p_assignee_id is distinct from old_ticket.assignee_id
     and not exists(select 1 from warehouse_ops.staff where id=p_assignee_id and active) then raise exception 'Staff is inactive'; end if;
  if p_job_type_id is distinct from old_ticket.job_type_id
     and not exists(select 1 from warehouse_ops.job_types where id=p_job_type_id and active) then raise exception 'Job is inactive'; end if;

  if (p_started_at is not null and p_started_at > clock_timestamp())
     or (p_ended_at is not null and p_ended_at > clock_timestamp())
  then raise exception 'Work time cannot be in the future'; end if;
  if old_ticket.status='queued' and (p_started_at is not null or p_ended_at is not null)
  then raise exception 'Queued ticket cannot have work times'; end if;
  if old_ticket.status in ('active','paused') and (p_started_at is null or p_ended_at is not null)
  then raise exception 'Open ticket needs a start time and no end time'; end if;
  if old_ticket.status in ('done','partial') and (p_started_at is null or p_ended_at is null)
  then raise exception 'Closed ticket needs start and end times'; end if;
  if old_ticket.status='cancelled' and (p_ended_at is null or (old_ticket.started_at is null) <> (p_started_at is null))
  then raise exception 'Cancelled ticket needs an end time; start presence cannot change'; end if;
  if p_started_at is not null and p_ended_at is not null and p_ended_at < p_started_at
  then raise exception 'End time cannot be before start time'; end if;

  new_materials := old_ticket.materials;
  if old_ticket.fg_code is not null then
    if p_requested_qty is null or p_requested_qty <= 0 or p_requested_qty > 1000000
       or p_requested_qty <> round(p_requested_qty,3) then raise exception 'Invalid requested quantity'; end if;
    select jsonb_agg(case when line->>'source'='stock' then line
      else jsonb_set(line,'{required_qty}',to_jsonb(round((line->>'qty_per_unit')::numeric*p_requested_qty,4)))
      end order by ordinality) into new_materials
    from jsonb_array_elements(old_ticket.materials) with ordinality as x(line,ordinality);
  elsif p_requested_qty is not null then raise exception 'This ticket has no FG quantity'; end if;

  if trim(p_ticket_no)=old_ticket.ticket_no and p_job_type_id=old_ticket.job_type_id
     and p_assignee_id=old_ticket.assignee_id and coalesce(trim(p_description),'')=old_ticket.description
     and (old_ticket.fg_code is null or p_requested_qty=old_ticket.requested_qty)
     and p_started_at is not distinct from old_ticket.started_at
     and p_ended_at is not distinct from old_ticket.ended_at
  then raise exception 'No changes to save'; end if;

  perform set_config('app.ticket_actor_role','supervisor',true);
  perform set_config('app.ticket_actor_username',p_username,true);
  perform set_config('app.ticket_event_type','edited',true);
  perform set_config('app.ticket_reason',trim(p_reason),true);
  update warehouse_ops.tickets set ticket_no=trim(p_ticket_no),job_type_id=p_job_type_id,
    assignee_id=p_assignee_id,description=coalesce(trim(p_description),''),
    requested_qty=case when old_ticket.fg_code is null then null else p_requested_qty end,
    materials=new_materials,started_at=p_started_at,ended_at=p_ended_at
  where id=p_ticket_id;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.set_work_standard_as_supervisor(p_username text, p_code text, p_job_id uuid, p_fg_code text, p_setup numeric, p_line numeric, p_fg numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
begin
 if not warehouse_ops.check_role_code('supervisor',p_username,p_code) then raise exception 'Supervisor access required'; end if;
 if not exists(select 1 from warehouse_ops.job_types where id=p_job_id and active) then raise exception 'กรุณาเลือกประเภทงานที่เปิดใช้งาน'; end if;
 if length(coalesce(p_fg_code,''))>80 then raise exception 'รหัสสินค้ายาวเกินกำหนด'; end if;
 insert into warehouse_ops.work_standards values(p_job_id,upper(trim(coalesce(p_fg_code,''))),p_setup,p_line,p_fg,clock_timestamp(),p_username)
 on conflict(job_type_id,fg_code) do update set setup_minutes=excluded.setup_minutes,minutes_per_line=excluded.minutes_per_line,minutes_per_1000_fg=excluded.minutes_per_1000_fg,updated_at=excluded.updated_at,updated_by=excluded.updated_by;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.get_management_state()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
 select jsonb_build_object('settings',(select settings from work_management_settings),'cases',coalesce((select jsonb_agg(to_jsonb(c)) from material_cases c join tickets t on t.id=c.ticket_id where t.deleted_at is null),'[]'));
$function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.purge_ticket_as_supervisor(p_username text, p_code text, p_ticket_id uuid, p_expected_deleted_at timestamp with time zone, p_confirm_number text, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
declare t warehouse_ops.tickets%rowtype;
begin
 if not warehouse_ops.check_role_code('supervisor',p_username,p_code) then raise exception 'Supervisor access required';end if;
 select * into t from warehouse_ops.tickets where id=p_ticket_id for update;
 if not found then raise exception 'ไม่พบใบเบิกในถังขยะ กรุณาโหลดข้อมูลใหม่';end if;
 if t.deleted_at is null then raise exception 'ลบถาวรได้เฉพาะใบเบิกในถังขยะ';end if;
 if p_expected_deleted_at is distinct from t.deleted_at then raise exception 'ข้อมูลถังขยะเปลี่ยนแล้ว กรุณาโหลดข้อมูลใหม่';end if;
 if trim(coalesce(p_confirm_number,''))<>t.ticket_no then raise exception 'พิมพ์เลขที่ใบเบิกให้ตรงเพื่อยืนยันลบถาวร';end if;
 if length(trim(coalesce(p_reason,'')))=0 or length(p_reason)>1000 then raise exception 'กรุณาระบุเหตุผลการลบถาวร ไม่เกิน 1000 ตัวอักษร';end if;
 perform set_config('app.ticket_actor_username',p_username,true);perform set_config('app.ticket_reason',p_reason,true);delete from warehouse_ops.ticket_events where ticket_id=t.id;
 delete from warehouse_ops.tickets where id=t.id;
 -- withdrawal_document_numbers is removed by its ON DELETE CASCADE FK.
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.manage_work(p_username text, p_code text, p_role text, p_action text, p_args jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
declare t warehouse_ops.tickets%rowtype;before_value jsonb;after_value jsonb;s jsonb;l jsonb;fingerprint text;h jsonb;idx integer;
begin
 if p_role not in ('supervisor','clerk') or not check_role_code(p_role,p_username,p_code) then raise exception 'สิทธิ์ใช้งานไม่ถูกต้อง';end if;
 if coalesce(p_action,'') not in ('plan','case','settings','clerk_account','history') then raise exception 'ไม่รองรับการทำรายการ';end if;
 if p_role='clerk' and p_action not in ('case','history') then raise exception 'ธุรการจัดการได้เฉพาะเรื่องของขาด–เบิกเกิน';end if;
 if p_action='history' then
  return (select coalesce(jsonb_agg(x order by x->>'created_at' desc),'[]') from (
   select jsonb_build_object('id',e.id,'ticket_no',wt.ticket_no,'event_type',e.event_type,'actor_username',e.actor_username,'actor_role',e.actor_role,'reason',e.reason,'before_state',e.before_state,'after_state',e.after_state,'created_at',e.created_at) x from ticket_events e join tickets wt on wt.id=e.ticket_id
   union all select to_jsonb(e) from management_events e) q);
 end if;
 if p_action in ('plan','case') then
  select * into t from tickets where id=(p_args->>'ticket_id')::uuid for update;
  if not found or t.deleted_at is not null then raise exception 'ไม่พบใบเบิกที่ใช้งาน กรุณาโหลดข้อมูลใหม่';end if;
 end if;
 if p_action='plan' then
  if t.status in ('done','partial','cancelled') then raise exception 'วางแผนได้เฉพาะงานที่ยังเปิด';end if;
  if coalesce(p_args->>'priority','') not in ('normal','high','urgent') or not exists(select 1 from staff where id=(p_args->>'assignee_id')::uuid and active) then raise exception 'เลือกความเร่งด่วนและพนักงานให้ครบ';end if;
  if (p_args->'expected') is distinct from jsonb_build_array(t.planned_date,t.due_at,t.priority,t.assignee_id) then raise exception 'แผนงานเปลี่ยนแล้ว กรุณาโหลดข้อมูลใหม่';end if;
  if nullif(p_args->>'planned_date','') is not null and nullif(p_args->>'due_at','') is not null and (p_args->>'due_at')::timestamptz < ((p_args->>'planned_date')::date::timestamp at time zone 'Asia/Bangkok') then raise exception 'กำหนดส่งต้องไม่ก่อนวันวางแผน';end if;
  before_value:=jsonb_build_object('planned_date',t.planned_date,'due_at',t.due_at,'priority',t.priority,'assignee_id',t.assignee_id);
  perform set_config('app.ticket_actor_role',p_role,true);perform set_config('app.ticket_actor_username',p_username,true);perform set_config('app.ticket_reason','ปรับแผนงาน',true);perform set_config('app.ticket_event_type','edited',true);
  update tickets set planned_date=nullif(p_args->>'planned_date','')::date,due_at=nullif(p_args->>'due_at','')::timestamptz,priority=p_args->>'priority',assignee_id=(p_args->>'assignee_id')::uuid where id=t.id;
  return 'true';
 elsif p_action='case' then
  idx:=(p_args->>'line_index')::integer;l:=t.materials->idx;
  if idx<0 or l is null or nullif(l->>'confirmed_at','') is null or jsonb_typeof(l->'actual_qty')<>'number' or (l->>'actual_qty')::numeric=(l->>'required_qty')::numeric then raise exception 'รายการนี้ไม่มีขาดหรือเกินที่ยืนยันแล้ว';end if;
  -- The browser supplies a canonical fingerprint. Validate every component on the server.
  s:=(p_args->>'fingerprint')::jsonb;
  if s->>0 is distinct from l->>'pk_code' or (s->>1)::numeric is distinct from (l->>'required_qty')::numeric or (s->>2)::numeric is distinct from (l->>'actual_qty')::numeric or s->>3 is distinct from l->>'confirmed_at' then raise exception 'ยอดเบิกเปลี่ยนแล้ว กรุณาโหลดข้อมูลใหม่';end if;
  if coalesce(p_args->>'status','') not in ('open','following','resolved') or length(trim(coalesce(p_args->>'note',''))) not between 1 and 1000 then raise exception 'เลือกสถานะและระบุผลติดตามไม่เกิน 1000 ตัวอักษร';end if;
  select to_jsonb(c) into before_value from material_cases c where ticket_id=t.id and line_index=idx for update;
  if coalesce(p_args->>'expected_updated_at','')<>coalesce(before_value->>'updated_at','') then raise exception 'ผลติดตามเปลี่ยนแล้ว กรุณาโหลดข้อมูลใหม่';end if;
  insert into material_cases values(t.id,idx,p_args->>'fingerprint',p_args->>'status',trim(p_args->>'note'),clock_timestamp(),p_username) on conflict(ticket_id,line_index) do update set fingerprint=excluded.fingerprint,status=excluded.status,note=excluded.note,updated_at=excluded.updated_at,updated_by=excluded.updated_by returning to_jsonb(material_cases.*) into after_value;
 elsif p_action='settings' then
  select settings into before_value from work_management_settings where id for update;s:=p_args->'settings';
  if before_value is distinct from p_args->'expected' then raise exception 'ตั้งค่าเปลี่ยนแล้ว กรุณาโหลดข้อมูลใหม่';end if;
  if not coalesce((s->>'start' ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and s->>'end' ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and s->>'lunchStart' ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and s->>'lunchEnd' ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') and (s->>'start'<s->>'lunchStart' and s->>'lunchStart'<s->>'lunchEnd' and s->>'lunchEnd'<s->>'end'),false) then raise exception 'เวลาทำงานไม่ถูกต้อง';end if;
  if s ? 'reasonNames' then
   if jsonb_typeof(s->'reasonNames') is distinct from 'object' then raise exception 'ประเภทเหตุผลไม่ถูกต้อง';end if;
   for h in select value from jsonb_each(s->'reasonNames') loop if jsonb_typeof(h)<>'string' or length(trim(h#>>'{}')) not between 1 and 80 then raise exception 'ชื่อเหตุผลต้องมี 1–80 ตัวอักษร';end if;end loop;
   if exists(select 1 from jsonb_object_keys(s->'reasonNames') k where k not in ('stock_shortage','approved_extra','bom_difference','picking_error','other')) then raise exception 'รหัสเหตุผลไม่ถูกต้อง';end if;
  end if;
  if jsonb_typeof(s->'holidays') is distinct from 'array' or jsonb_array_length(s->'holidays')>366 then raise exception 'วันหยุดไม่ถูกต้อง';end if;
  for h in select value from jsonb_array_elements(s->'holidays') loop perform (h#>>'{}')::date;end loop;
  if not exists(select 1 from staff where id=(s->>'exceptionOwnerId')::uuid and active) then raise exception 'เลือกผู้รับผิดชอบที่เปิดใช้งาน';end if;
  select s||jsonb_build_object('exceptionOwnerName',display_name) into s from staff where id=(s->>'exceptionOwnerId')::uuid;
  update work_management_settings set settings=s,updated_at=clock_timestamp() where id;after_value:=s;
 elsif p_action='clerk_account' then
  if length(trim(coalesce(p_args->>'username',''))) not between 1 and 80 or length(coalesce(p_args->>'password','')) not between 6 and 128 then raise exception 'ชื่อผู้ใช้ 1–80 ตัวอักษร รหัสผ่าน 6–128 ตัวอักษร';end if;
  if exists(select 1 from app_settings where key in ('supervisor_username','operator_username') and value=trim(p_args->>'username')) then raise exception 'ชื่อผู้ใช้ซ้ำกับบัญชีทีม';end if;
  insert into app_settings(key,value) values('clerk_username',trim(p_args->>'username')),('clerk_code',extensions.crypt(p_args->>'password',extensions.gen_salt('bf'))) on conflict(key) do update set value=excluded.value;
  after_value:=jsonb_build_object('username',trim(p_args->>'username')); -- Never log the password/hash.
 end if;
 insert into management_events(ticket_no,event_type,actor_username,actor_role,reason,before_state,after_state) values(t.ticket_no,p_action,p_username,p_role,p_args->>'note',before_value,after_value);
 return 'true';
end;$function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.capture_permanent_receipt()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
begin
 delete from management_events where ticket_no=old.ticket_no and event_type<>'purged';
 insert into management_events(ticket_no,event_type,actor_username,actor_role,reason) values(old.ticket_no,'purged',coalesce(nullif(current_setting('app.ticket_actor_username',true),''),'system'),'supervisor',nullif(current_setting('app.ticket_reason',true),''));return old;
end;$function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.add_staff_profile_as_supervisor(p_username text, p_code text, p_name text, p_position text, p_photo text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
declare staff_id uuid;
begin
 if not check_role_code('supervisor',p_username,p_code) then raise exception 'Supervisor access required';end if;
 if length(trim(coalesce(p_name,''))) not between 1 and 100 or length(coalesce(p_position,''))>100 then raise exception 'กรอกชื่อและตำแหน่งไม่เกิน 100 ตัวอักษร';end if;
 perform validate_staff_photo(p_photo);
 insert into staff(display_name,position,photo_data) values(trim(p_name),trim(coalesce(p_position,'')),p_photo) returning id into staff_id;
 insert into management_events(event_type,actor_username,actor_role,after_state) values('staff_added',p_username,'supervisor',jsonb_build_object('display_name',trim(p_name),'position',trim(coalesce(p_position,''))));
 return staff_id;
end;$function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.edit_staff_profile_as_supervisor(p_username text, p_code text, p_staff_id uuid, p_name text, p_position text, p_expected jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
declare s warehouse_ops.staff%rowtype;before_value jsonb;
begin
 if not check_role_code('supervisor',p_username,p_code) then raise exception 'Supervisor access required';end if;
 if length(trim(coalesce(p_name,''))) not between 1 and 100 or length(coalesce(p_position,''))>100 then raise exception 'กรอกชื่อและตำแหน่งไม่เกิน 100 ตัวอักษร';end if;
 select * into s from staff where id=p_staff_id for update;
 if not found then raise exception 'ไม่พบพนักงาน';end if;
 if p_expected is distinct from jsonb_build_array(s.display_name,s.position) then raise exception 'ข้อมูลพนักงานเปลี่ยนแล้ว กรุณาปิดหน้าต่างและโหลดใหม่';end if;
 before_value:=jsonb_build_object('display_name',s.display_name,'position',s.position);
 update staff set display_name=trim(p_name),position=trim(coalesce(p_position,'')) where id=p_staff_id;
 insert into management_events(event_type,actor_username,actor_role,before_state,after_state) values('staff_edited',p_username,'supervisor',before_value,jsonb_build_object('display_name',trim(p_name),'position',trim(coalesce(p_position,''))));
end;$function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.get_competency_state()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$ select jsonb_build_object('catalog',(select jsonb_agg(to_jsonb(c) order by sort_order) from competency_catalog c),'ratings',coalesce((select jsonb_agg(to_jsonb(r)) from competency_ratings r),'[]'::jsonb)); $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.start_ticket_as_supervisor(p_username text, p_code text, p_ticket_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
begin
  if not warehouse_ops.check_role_code('supervisor',p_username,p_code) then raise exception 'Supervisor access required'; end if;
  perform set_config('app.ticket_actor_role','supervisor',true);
  perform set_config('app.ticket_actor_username',p_username,true);
  perform set_config('app.ticket_event_type','started',true);
  update warehouse_ops.tickets set status='active',started_at=clock_timestamp(),status_reason=null
  where id=p_ticket_id and status='queued' and deleted_at is null;
  if not found then raise exception 'Ticket is unavailable or already started'; end if;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.save_production_formula_as_supervisor(p_username text, p_code text, p_fg_code text, p_fg_name text, p_base_qty numeric, p_lines jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
declare line jsonb; item_code text; seen text[]:='{}'; normalized jsonb:='[]';
  rate numeric; fg text:=upper(trim(coalesce(p_fg_code,''))); version text;
begin
  if not warehouse_ops.check_role_code('supervisor',p_username,p_code) then raise exception 'Supervisor access required'; end if;
  if fg !~ '^[A-Z0-9/._-]{1,80}$' or length(trim(coalesce(p_fg_name,''))) not between 1 and 300
    or p_base_qty is null or p_base_qty='NaN'::numeric or p_base_qty<=0 or p_base_qty>1000000
    or p_base_qty<>round(p_base_qty,3) then raise exception 'Invalid formula details'; end if;
  if jsonb_typeof(p_lines) is distinct from 'array' then raise exception 'Invalid formula materials'; end if;
  if jsonb_array_length(p_lines) not between 1 and 30 then raise exception 'Formula requires 1-30 materials'; end if;
  for line in select value from jsonb_array_elements(p_lines) loop
    item_code:=upper(trim(coalesce(line->>'pk_code','')));
    rate:=(line->>'qty_per_unit')::numeric;
    if item_code !~ '^[A-Z0-9/._-]{1,80}$' or item_code=any(seen)
      or length(trim(coalesce(line->>'pk_name',''))) not between 1 and 300
      or length(trim(coalesce(line->>'unit',''))) not between 1 and 30
      or rate is null or rate='NaN'::numeric or rate<=0 or rate>1000000000
      then raise exception 'Invalid or duplicate formula material'; end if;
    seen:=array_append(seen,item_code);
    normalized:=normalized||jsonb_build_array(jsonb_build_object('pk_code',item_code,
      'pk_name',trim(line->>'pk_name'),'unit',trim(line->>'unit'),'qty_per_unit',rate,'source','bom'));
  end loop;
  version:=encode(extensions.digest(convert_to(fg||trim(p_fg_name)||p_base_qty::text||normalized::text,'UTF8'),'sha256'),'hex');
  insert into warehouse_ops.saved_production_formulas(fg_code,fg_name,base_qty,lines,source_sha256,created_by)
  values(fg,trim(p_fg_name),p_base_qty,normalized,version,p_username);
  return jsonb_build_object('fg_code',fg,'fg_name',trim(p_fg_name),'base_qty',p_base_qty,
    'lines',normalized,'source_sha256',version);
exception when unique_violation then raise exception 'Formula code already saved';
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.edit_ticket_picks_as_supervisor(p_username text, p_code text, p_ticket_id uuid, p_expected_materials jsonb, p_expected_status text, p_picks jsonb, p_edit_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
declare t warehouse_ops.tickets%rowtype; line jsonb; pick jsonb; result jsonb := '[]'; actual numeric; required numeric; reason text; shorts integer := 0; i integer; target_status text;
begin
  if not warehouse_ops.check_role_code('supervisor',p_username,p_code) then raise exception 'Supervisor access required'; end if;
  select * into t from warehouse_ops.tickets where id=p_ticket_id for update;
  if not found or t.status not in ('active','paused','done','partial') then raise exception 'แก้ไขเบิกจริงได้เฉพาะงานที่เริ่มแล้วหรือปิดแล้ว'; end if;
  if t.materials is distinct from p_expected_materials or t.status is distinct from p_expected_status then raise exception 'ใบเบิกถูกแก้ไขจากเครื่องอื่น กรุณาปิดฟอร์มแล้วเปิดใหม่'; end if;
  if length(trim(coalesce(p_edit_reason,''))) not between 1 and 1000 then raise exception 'กรุณาระบุเหตุผลการแก้ไข'; end if;
  if jsonb_typeof(p_picks) is distinct from 'array' or jsonb_array_length(p_picks)<>jsonb_array_length(t.materials) or jsonb_array_length(t.materials)=0 then raise exception 'กรุณายืนยันให้ครบทุกรายการ'; end if;
  for i in 0..jsonb_array_length(t.materials)-1 loop
    line:=t.materials->i; pick:=p_picks->i; required:=(line->>'required_qty')::numeric;
    if jsonb_typeof(pick->'actual_qty') is distinct from 'number' then raise exception 'กรุณาใส่จำนวนเบิกจริง'; end if;
    actual:=(pick->>'actual_qty')::numeric; reason:=trim(coalesce(pick->>'short_reason',''));
    if actual<0 or actual>1000000000 or actual<>round(actual,4) then raise exception 'จำนวนเบิกจริงต้องอยู่ระหว่าง 0 ถึง 1,000,000,000 (ทศนิยมไม่เกิน 4 ตำแหน่ง)'; end if;
    if length(reason)>1000 or (abs(actual-required)>=1 and length(reason)=0) then raise exception 'กรุณาระบุเหตุผลของรายการที่เบิกขาดหรือเกิน'; end if;
    if required-actual>1 then shorts:=shorts+1; end if;
    result:=result || jsonb_build_array(line || jsonb_build_object('actual_qty',actual,'short_reason',case when actual<>required then reason else '' end,'confirmed_at',clock_timestamp(),'reason_code',pick->>'reason_code'));
  end loop;
  target_status:=case when t.status in ('done','partial') then case when shorts>0 then 'partial' else 'done' end else t.status end;
  perform set_config('app.ticket_actor_role','supervisor',true);
  perform set_config('app.ticket_actor_username',p_username,true);
  perform set_config('app.ticket_event_type','edited',true);
  perform set_config('app.ticket_reason',trim(p_edit_reason),true);
  update warehouse_ops.tickets set materials=result,status=target_status,
    status_reason=case when t.status in ('done','partial') then case when shorts>0 then 'เบิกขาด '||shorts||' รายการ — ดูเหตุผลในรายการวัสดุ' else null end else status_reason end where id=t.id;
end; $function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.get_saved_production_formulas()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
  select coalesce(jsonb_agg(jsonb_build_object('fg_code',fg_code,'fg_name',fg_name,
    'base_qty',base_qty,'lines',lines,'source_sha256',source_sha256,'created_at',created_at)
    order by fg_code),'[]'::jsonb) from warehouse_ops.saved_production_formulas;
$function$
;
CREATE OR REPLACE FUNCTION warehouse_ops.has_wip_materials(p_lines jsonb)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
  select exists(select 1 from jsonb_array_elements(coalesce(p_lines,'[]')) l
    where trim(coalesce(l->>'pk_code','')) like '5%');
$function$
;
create or replace function warehouse_ops.is_admin() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.app_users where id=auth.uid() and active and role='admin'); $$;
create or replace function warehouse_ops.is_active() returns boolean language sql stable security definer set search_path='' as $$ select warehouse_ops.is_admin(); $$;
create or replace function warehouse_ops.check_role_code(p_role text,p_username text,p_code text) returns boolean language sql stable security definer set search_path='' as $$ select warehouse_ops.is_admin(); $$;
create or replace function warehouse_ops.check_edit_code(p_code text) returns boolean language sql stable security definer set search_path='' as $$ select warehouse_ops.is_admin(); $$;
CREATE TRIGGER reserve_withdrawal_document_numbers AFTER INSERT OR UPDATE OF ticket_no, fg_code ON warehouse_ops.tickets FOR EACH ROW EXECUTE FUNCTION warehouse_ops.reserve_withdrawal_document_numbers();
CREATE TRIGGER ticket_deleted_before_update BEFORE UPDATE ON warehouse_ops.tickets FOR EACH ROW EXECUTE FUNCTION warehouse_ops.guard_deleted_ticket();
CREATE TRIGGER ticket_event_after_change AFTER INSERT OR UPDATE ON warehouse_ops.tickets FOR EACH ROW EXECUTE FUNCTION warehouse_ops.capture_ticket_event();
CREATE TRIGGER ticket_picks_before_update BEFORE UPDATE ON warehouse_ops.tickets FOR EACH ROW EXECUTE FUNCTION warehouse_ops.guard_ticket_picks();
CREATE TRIGGER track_work_intervals BEFORE INSERT OR UPDATE ON warehouse_ops.tickets FOR EACH ROW EXECUTE FUNCTION warehouse_ops.track_work_intervals();
CREATE TRIGGER capture_permanent_receipt BEFORE DELETE ON warehouse_ops.tickets FOR EACH ROW EXECUTE FUNCTION warehouse_ops.capture_permanent_receipt();
alter table warehouse_ops.tickets enable row level security;
alter table warehouse_ops.ticket_events enable row level security;
alter table warehouse_ops.staff enable row level security;
alter table warehouse_ops.profiles enable row level security;
alter table warehouse_ops.job_types enable row level security;
alter table warehouse_ops.skill_ratings enable row level security;
alter table warehouse_ops.withdrawal_document_numbers enable row level security;
alter table warehouse_ops.app_settings enable row level security;
alter table warehouse_ops.work_standards enable row level security;
alter table warehouse_ops.work_management_settings enable row level security;
alter table warehouse_ops.material_cases enable row level security;
alter table warehouse_ops.management_events enable row level security;
alter table warehouse_ops.competency_catalog enable row level security;
alter table warehouse_ops.competency_ratings enable row level security;
alter table warehouse_ops.saved_production_formulas enable row level security;
revoke all on all tables in schema warehouse_ops from public, anon, authenticated;
revoke all on all functions in schema warehouse_ops from public, anon, authenticated;
create function public.warehouse_ops_rpc(p_action text,p_args jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path='' as $gateway$
declare proc record; expressions text=''; args jsonb:=coalesce(p_args,'{}'); i integer; result jsonb; username text;
begin
 select u.username into username from public.app_users u where u.id=auth.uid() and u.active and u.role='admin';
 if username is null then raise exception 'เฉพาะ Admin ของ PK WMS' using errcode='42501'; end if;
 if not p_action=any(array['get_dashboard_state','get_management_state','get_ticket_history','get_deleted_tickets_as_supervisor','get_saved_production_formulas','get_competency_state','perform_work_action','manage_work','save_production_formula_as_supervisor']) then raise exception 'ไม่รองรับคำสั่งนี้' using errcode='42501'; end if;
 if jsonb_typeof(args)<>'object' then raise exception 'ข้อมูลไม่ถูกต้อง'; end if;
 if p_action='manage_work' and args->>'p_action'='clerk_account' then raise exception 'จัดการบัญชีใน PK WMS'; end if;
 args:=args||jsonb_build_object('p_username',username,'p_code','pk-auth','p_role','supervisor');
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
end; $gateway$;
revoke all on function public.warehouse_ops_rpc(text,jsonb) from public,anon;
grant execute on function public.warehouse_ops_rpc(text,jsonb) to authenticated;
notify pgrst,'reload schema';

create table warehouse_ops.portrait_assets(staff_id uuid primary key,data text not null);
alter table warehouse_ops.portrait_assets enable row level security;
revoke all on warehouse_ops.portrait_assets from public,anon,authenticated;
CREATE OR REPLACE FUNCTION warehouse_ops.get_dashboard_state()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'warehouse_ops', 'pg_temp'
AS $function$
 select jsonb_build_object('people',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'display_name',s.display_name,'active',s.active,'photo_data',coalesce(s.photo_data,(select data from warehouse_ops.portrait_assets where staff_id=s.id)),'position',s.position)) from warehouse_ops.staff s),'[]'),'jobs',coalesce((select jsonb_agg(to_jsonb(j)) from warehouse_ops.job_types j),'[]'),'tickets',coalesce((select jsonb_agg(to_jsonb(t)-'created_by' order by t.created_at desc) from warehouse_ops.tickets t where deleted_at is null),'[]'),'skills',coalesce((select jsonb_agg(jsonb_build_object('profile_id',profile_id,'job_type_id',job_type_id,'level',level)) from warehouse_ops.skill_ratings),'[]'),'standards',coalesce((select jsonb_agg(to_jsonb(s)) from warehouse_ops.work_standards s),'[]'));
$function$
;

CREATE INDEX tickets_created_at_idx ON warehouse_ops.tickets USING btree (created_at DESC);
CREATE INDEX tickets_assignee_status_idx ON warehouse_ops.tickets USING btree (assignee_id, status);
CREATE INDEX ticket_events_ticket_time_idx ON warehouse_ops.ticket_events USING btree (ticket_id, created_at DESC);
commit;
