-- Schema rollback only. Export pk_recipes, pk_recipe_lines and pk_recipe_versions first.
-- Do not run against a populated database without authorizing loss of recipe history.
begin;
drop function if exists public.get_pk_recipe_versions(text);
drop function if exists public.save_pk_recipe(jsonb,integer);
drop function if exists public.get_pk_recipes();
drop table if exists public.pk_recipe_versions;
drop table if exists public.pk_recipe_lines;
drop table if exists public.pk_recipes;
notify pgrst, 'reload schema';
commit;
