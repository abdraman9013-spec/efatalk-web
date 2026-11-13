-- Full row payloads so DELETE of a student is visible to the live auth listener.
alter table public.efaa_practice_students replica identity full;
alter table public.efaa_active_students replica identity full;
alter table public.efaa_user_gamification replica identity full;

grant execute on function public.efaa_award_match_points(text, integer) to anon, authenticated;
grant execute on function public.efaa_sync_broken_streak(text) to anon, authenticated;
grant execute on function public.efaa_leaderboard_for(text) to anon, authenticated;
