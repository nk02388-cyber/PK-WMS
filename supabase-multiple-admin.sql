-- Allow additional Admin accounts without changing existing users or passwords.
-- Apply after supabase-user-login.sql on fresh installations.
drop index if exists public.app_users_one_admin;
