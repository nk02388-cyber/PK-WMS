-- Applied through Supabase MCP as audit_rls_initplan_and_foreign_key_indexes.
-- No business rows, grants, roles or credentials are changed.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '30s';
alter policy action_confirmations_read on public.action_confirmations
using (exists(select 1 from public.app_users p where p.id=(select auth.uid())
  and p.active and (p.role='admin' or actor_id=p.id)));
create index if not exists competency_ratings_competency_id_idx on warehouse_ops.competency_ratings(competency_id);
create index if not exists skill_ratings_assessed_by_idx on warehouse_ops.skill_ratings(assessed_by);
create index if not exists skill_ratings_job_type_id_idx on warehouse_ops.skill_ratings(job_type_id);
create index if not exists ticket_events_actor_staff_id_idx on warehouse_ops.ticket_events(actor_staff_id);
create index if not exists tickets_created_by_idx on warehouse_ops.tickets(created_by);
create index if not exists tickets_job_type_id_idx on warehouse_ops.tickets(job_type_id);
create index if not exists withdrawal_document_numbers_ticket_id_idx on warehouse_ops.withdrawal_document_numbers(ticket_id);
commit;
