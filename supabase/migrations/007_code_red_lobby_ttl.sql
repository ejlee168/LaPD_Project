-- Lobby lifecycle safety net:
--   1. Every game action bumps the actor's last_seen (trigger)
--   2. Hourly pg_cron sweeper deletes lobbies with no recent player activity

create extension if not exists pg_cron;

create or replace function cr_touch_last_seen() returns trigger
language plpgsql as $$
begin
  if new.player_id is not null then
    update cr_players set last_seen = now() where id = new.player_id;
  end if;
  return new;
end $$;

drop trigger if exists cr_actions_touch_last_seen on cr_actions;
create trigger cr_actions_touch_last_seen
  after insert on cr_actions
  for each row execute function cr_touch_last_seen();

select cron.unschedule('cr-cleanup-stale-lobbies')
  where exists (select 1 from cron.job where jobname = 'cr-cleanup-stale-lobbies');

select cron.schedule(
  'cr-cleanup-stale-lobbies',
  '0 * * * *',
  $$
    delete from cr_lobbies l
    where not exists (
      select 1 from cr_players
      where lobby_id = l.id
        and last_seen > now() - interval '2 hours'
    );
  $$
);
