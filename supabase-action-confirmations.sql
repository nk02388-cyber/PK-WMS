begin;
create table if not exists public.action_confirmations (
 id uuid primary key default gen_random_uuid(),
 confirmed_at timestamptz not null default now(),
 actor_id uuid not null,
 actor_name text not null,
 action_label text not null,
 target_description text not null,
 reason text not null check (length(btrim(reason)) between 1 and 1000)
);
alter table public.action_confirmations enable row level security;
revoke all on public.action_confirmations from anon,authenticated;
grant select on public.action_confirmations to authenticated;
drop policy if exists action_confirmations_read on public.action_confirmations;
create policy action_confirmations_read on public.action_confirmations for select to authenticated
using (exists(select 1 from public.app_users p where p.id=auth.uid() and p.active and (p.role='admin' or actor_id=p.id)));
create or replace function public.record_action_confirmation(p_action text,p_target text,p_reason text)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor public.app_users; confirmation_id uuid;
begin
 select * into actor from public.app_users where id=auth.uid() and active;
 if actor.id is null then raise exception 'กรุณาเข้าสู่ระบบ' using errcode='42501'; end if;
 if length(btrim(coalesce(p_action,''))) not between 1 and 200
 or length(btrim(coalesce(p_reason,''))) not between 1 and 1000
 or length(coalesce(p_target,''))>1000 then raise exception 'กรุณาระบุการดำเนินการและหมายเหตุ' using errcode='22023'; end if;
 insert into public.action_confirmations(actor_id,actor_name,action_label,target_description,reason)
 values(actor.id,actor.username,btrim(p_action),coalesce(p_target,''),btrim(p_reason)) returning id into confirmation_id;
 return confirmation_id;
end $$;
revoke all on function public.record_action_confirmation(text,text,text) from public,anon;
grant execute on function public.record_action_confirmation(text,text,text) to authenticated;
commit;
