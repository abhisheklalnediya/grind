-- Advertise only the set types selected for the current client UI.
-- rest_pause remains valid in storage and command validation so existing rows
-- can still be loaded and edited without rewriting historical data.
begin;

create or replace function grind.get_supported_set_types()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists (
   select 1 from grind.app_accounts
   where user_id=auth.uid() and setup_completed_at is not null
 ) then
  raise exception 'FORBIDDEN: completed Grind setup required' using errcode='42501';
 end if;
 return jsonb_build_object('set_types',jsonb_build_array('warmup','working','drop','failure'));
end $$;

revoke all on function grind.get_supported_set_types() from public,anon,authenticated;
grant execute on function grind.get_supported_set_types() to authenticated;

commit;
