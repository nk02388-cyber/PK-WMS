-- Applied through Supabase migration add_profile_avatars.
alter table public.app_users add column if not exists avatar_url text;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('profile-avatars','profile-avatars',true,98304,ARRAY['image/jpeg']) on conflict (id) do nothing;
-- Writes go through authenticated pk-user-access, which checks self or active Admin.
