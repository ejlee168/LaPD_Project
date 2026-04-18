-- Auto-delete a lobby once its last player leaves.
-- Called by (a) the caller themselves (explicit "Leave"), (b) the caller's
-- beforeunload beacon, and (c) any surviving peer when they observe a presence
-- leave event. All three paths are safe and idempotent.

create or replace function cr_remove_from_lobby(
  p_code text,
  p_player_token text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_lobby_id uuid;
  v_remaining int;
begin
  select id into v_lobby_id from cr_lobbies where code = p_code;
  if v_lobby_id is null then
    return;
  end if;

  delete from cr_players
    where lobby_id = v_lobby_id and player_token = p_player_token;

  select count(*) into v_remaining from cr_players where lobby_id = v_lobby_id;
  if v_remaining = 0 then
    delete from cr_lobbies where id = v_lobby_id;
  end if;
end $$;
