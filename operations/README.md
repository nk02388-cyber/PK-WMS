# ใบเบิกบรรจุภัณฑ์ PK

Module at /operations/, opened by the Admin-only PK WMS menu. Uses the PK Supabase project and PK Supabase Auth session. Business data is isolated in warehouse_ops.

Only public.warehouse_ops_rpc(text,jsonb) is exposed. It checks the active Admin in public.app_users for every action, rejects legacy account changes, normalizes the actor username and role, and forwards allowed business operations. Direct table and schema access is revoked from API roles. Legacy login forms are disabled.

The original 15 tables, 67 functions, 6 triggers and 3 indexes were migrated and all 270 original records matched exactly after source cutover. Original portraits are served from a private database table through the Admin gateway. Historical profile IDs stay as historical records; authentication is owned by PK WMS.

Private backups and the migration report are stored outside this repository at C:/Users/ADMIN/Documents/Codex/2026-09-29/new-chat/work/warehouse-migration-20261002. SQL source in ../supabase-warehouse-operations.sql contains schema only.
