-- Code Red RPCs. All security definer; browsers never write to cr_* tables directly.
-- Every RPC takes a player_token (and usually a code) and resolves it internally.

-- Helper: generate a 6-character short code using an alphabet that excludes
-- look-alike characters (0/O/I/1/L).
create or replace function cr_gen_code() returns text
language plpgsql as $$
declare
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return result;
end $$;

create or replace function cr_create_lobby(p_nickname text, p_player_token text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
  v_lobby_id uuid;
  v_attempt int := 0;
begin
  loop
    v_attempt := v_attempt + 1;
    if v_attempt > 5 then
      raise exception 'Could not generate a unique lobby code';
    end if;
    v_code := cr_gen_code();
    begin
      insert into cr_lobbies (code) values (v_code) returning id into v_lobby_id;
      exit;
    exception when unique_violation then
      -- try again
    end;
  end loop;

  insert into cr_players (lobby_id, player_token, nickname)
  values (v_lobby_id, p_player_token, p_nickname);

  return v_code;
end $$;

create or replace function cr_join_lobby(p_code text, p_nickname text, p_player_token text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_lobby_id uuid;
  v_player_id uuid;
begin
  select id into v_lobby_id from cr_lobbies where code = p_code;
  if v_lobby_id is null then
    raise exception 'Lobby not found';
  end if;

  begin
    insert into cr_players (lobby_id, player_token, nickname)
    values (v_lobby_id, p_player_token, p_nickname)
    on conflict (lobby_id, player_token) do update
      set nickname = excluded.nickname,
          last_seen = now()
    returning id into v_player_id;
  exception when unique_violation then
    raise exception 'Nickname already taken in this lobby';
  end;

  return v_player_id;
end $$;

create or replace function cr_pick_team(p_code text, p_player_token text, p_team text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_lobby_id uuid;
begin
  if p_team is not null and p_team not in ('red', 'blue') then
    raise exception 'Invalid team';
  end if;

  select id into v_lobby_id from cr_lobbies where code = p_code;
  if v_lobby_id is null then
    raise exception 'Lobby not found';
  end if;

  update cr_players
    set team = p_team,
        is_spymaster = case when p_team is null then false else is_spymaster end,
        last_seen = now()
    where lobby_id = v_lobby_id and player_token = p_player_token;
end $$;

create or replace function cr_claim_spymaster(p_code text, p_player_token text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_lobby_id uuid;
  v_team text;
  v_team_size int;
  v_allowed int;
  v_current int;
begin
  select id into v_lobby_id from cr_lobbies where code = p_code;
  if v_lobby_id is null then
    raise exception 'Lobby not found';
  end if;

  select team into v_team from cr_players
    where lobby_id = v_lobby_id and player_token = p_player_token;
  if v_team is null then
    raise exception 'You must join a team first';
  end if;

  select count(*) into v_team_size from cr_players
    where lobby_id = v_lobby_id and team = v_team;
  v_allowed := case when v_team_size >= 5 then 2 else 1 end;

  select count(*) into v_current from cr_players
    where lobby_id = v_lobby_id and team = v_team and is_spymaster = true;
  if v_current >= v_allowed then
    raise exception 'Spymaster cap reached for this team';
  end if;

  update cr_players set is_spymaster = true
    where lobby_id = v_lobby_id and player_token = p_player_token;
end $$;

create or replace function cr_relinquish_spymaster(p_code text, p_player_token text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_lobby_id uuid;
begin
  select id into v_lobby_id from cr_lobbies where code = p_code;
  if v_lobby_id is null then
    raise exception 'Lobby not found';
  end if;

  update cr_players set is_spymaster = false
    where lobby_id = v_lobby_id and player_token = p_player_token;
end $$;

create or replace function cr_kick_player(p_code text, p_actor_token text, p_target_player_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_lobby_id uuid;
  v_actor_exists boolean;
begin
  select id into v_lobby_id from cr_lobbies where code = p_code;
  if v_lobby_id is null then
    raise exception 'Lobby not found';
  end if;

  select exists(
    select 1 from cr_players where lobby_id = v_lobby_id and player_token = p_actor_token
  ) into v_actor_exists;
  if not v_actor_exists then
    raise exception 'You are not in this lobby';
  end if;

  delete from cr_players where id = p_target_player_id and lobby_id = v_lobby_id;
end $$;

-- ---------------------------------------------------------------------------
-- Game lifecycle
-- ---------------------------------------------------------------------------

create or replace function cr_start_game(p_code text, p_player_token text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_lobby_id uuid;
  v_caller_exists boolean;
  v_red_spy int;
  v_red_op int;
  v_blue_spy int;
  v_blue_op int;
  v_sign_count int;
  v_starting_team text;
  v_other_team text;
  v_game_id uuid;
  v_types text[];
  v_signs uuid[];
  i int;
begin
  select id into v_lobby_id from cr_lobbies where code = p_code;
  if v_lobby_id is null then
    raise exception 'Lobby not found';
  end if;

  select exists(
    select 1 from cr_players where lobby_id = v_lobby_id and player_token = p_player_token
  ) into v_caller_exists;
  if not v_caller_exists then
    raise exception 'You are not in this lobby';
  end if;

  select
    count(*) filter (where team='red'  and is_spymaster),
    count(*) filter (where team='red'  and not is_spymaster),
    count(*) filter (where team='blue' and is_spymaster),
    count(*) filter (where team='blue' and not is_spymaster)
  into v_red_spy, v_red_op, v_blue_spy, v_blue_op
  from cr_players where lobby_id = v_lobby_id;

  if v_red_spy < 1 or v_red_op < 1 or v_blue_spy < 1 or v_blue_op < 1 then
    raise exception 'Each team needs at least one spymaster and one operative';
  end if;

  select count(*) into v_sign_count from signs;
  if v_sign_count < 25 then
    raise exception 'Need at least 25 signs to start a game';
  end if;

  v_starting_team := case when random() < 0.5 then 'red' else 'blue' end;
  v_other_team    := case when v_starting_team = 'red' then 'blue' else 'red' end;

  insert into cr_games (lobby_id, starting_team, current_team)
  values (v_lobby_id, v_starting_team, v_starting_team)
  returning id into v_game_id;

  -- Build a shuffled 25-element type array: 9 starting, 8 other, 7 neutral, 1 assassin.
  v_types := array(
    select t from (
      select v_starting_team as t from generate_series(1,9)
      union all
      select v_other_team     from generate_series(1,8)
      union all
      select 'neutral'        from generate_series(1,7)
      union all
      select 'assassin'
    ) s order by random()
  );

  select array_agg(id order by random()) into v_signs
    from (select id from signs order by random() limit 25) s;

  for i in 0..24 loop
    insert into cr_cards (game_id, position, sign_id, card_type)
    values (v_game_id, i, v_signs[i+1], v_types[i+1]);
  end loop;

  update cr_lobbies set status = 'in_game' where id = v_lobby_id;

  return v_game_id;
end $$;

create or replace function cr_play_again(p_code text, p_player_token text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_lobby_id uuid;
  v_caller_exists boolean;
  v_latest_status text;
begin
  select id into v_lobby_id from cr_lobbies where code = p_code;
  if v_lobby_id is null then
    raise exception 'Lobby not found';
  end if;

  select exists(
    select 1 from cr_players where lobby_id = v_lobby_id and player_token = p_player_token
  ) into v_caller_exists;
  if not v_caller_exists then
    raise exception 'You are not in this lobby';
  end if;

  select status into v_latest_status from cr_games
    where lobby_id = v_lobby_id order by created_at desc limit 1;
  if v_latest_status = 'in_progress' then
    raise exception 'Current game still in progress';
  end if;

  update cr_lobbies set status = 'lobby' where id = v_lobby_id;
  update cr_players set is_spymaster = false where lobby_id = v_lobby_id;
end $$;

-- ---------------------------------------------------------------------------
-- Turn actions
-- ---------------------------------------------------------------------------

create or replace function cr_submit_clue(
  p_code text, p_player_token text, p_word text, p_count int
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_lobby_id uuid;
  v_player_id uuid;
  v_player_team text;
  v_is_spy boolean;
  v_game_id uuid;
  v_current_team text;
  v_current_clue text;
begin
  if p_count < 1 then
    raise exception 'Clue count must be >= 1';
  end if;

  select id into v_lobby_id from cr_lobbies where code = p_code;
  if v_lobby_id is null then raise exception 'Lobby not found'; end if;

  select id, team, is_spymaster into v_player_id, v_player_team, v_is_spy
    from cr_players where lobby_id = v_lobby_id and player_token = p_player_token;
  if v_player_id is null then raise exception 'You are not in this lobby'; end if;

  select id, current_team, current_clue_word into v_game_id, v_current_team, v_current_clue
    from cr_games where lobby_id = v_lobby_id and status = 'in_progress'
    order by created_at desc limit 1;
  if v_game_id is null then raise exception 'No active game'; end if;
  if v_current_clue is not null then raise exception 'A clue is already active'; end if;
  if not v_is_spy or v_player_team <> v_current_team then
    raise exception 'Only the current team''s spymaster can submit a clue';
  end if;

  update cr_games
    set current_clue_word = p_word,
        current_clue_count = p_count,
        guesses_remaining = p_count + 1
    where id = v_game_id;

  insert into cr_actions (game_id, player_id, action_type, payload)
  values (v_game_id, v_player_id, 'clue', jsonb_build_object('word', p_word, 'count', p_count));
end $$;

create or replace function cr_end_turn(p_code text, p_player_token text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_lobby_id uuid;
  v_player_id uuid;
  v_player_team text;
  v_is_spy boolean;
  v_game_id uuid;
  v_current_team text;
  v_next_team text;
begin
  select id into v_lobby_id from cr_lobbies where code = p_code;
  if v_lobby_id is null then raise exception 'Lobby not found'; end if;

  select id, team, is_spymaster into v_player_id, v_player_team, v_is_spy
    from cr_players where lobby_id = v_lobby_id and player_token = p_player_token;
  if v_player_id is null then raise exception 'You are not in this lobby'; end if;

  select id, current_team into v_game_id, v_current_team
    from cr_games where lobby_id = v_lobby_id and status = 'in_progress'
    order by created_at desc limit 1;
  if v_game_id is null then raise exception 'No active game'; end if;
  if v_is_spy or v_player_team <> v_current_team then
    raise exception 'Only an operative on the current team may end the turn';
  end if;

  v_next_team := case when v_current_team = 'red' then 'blue' else 'red' end;
  update cr_games
    set current_team = v_next_team,
        current_clue_word = null,
        current_clue_count = null,
        guesses_remaining = null
    where id = v_game_id;

  insert into cr_actions (game_id, player_id, action_type)
  values (v_game_id, v_player_id, 'end_turn');
end $$;

create or replace function cr_reveal_card(
  p_code text, p_player_token text, p_position int
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_lobby_id uuid;
  v_player_id uuid;
  v_player_team text;
  v_is_spy boolean;
  v_game_id uuid;
  v_current_team text;
  v_starting_team text;
  v_other_team text;
  v_clue text;
  v_guesses int;
  v_card_id uuid;
  v_card_type text;
  v_already_revealed boolean;
  v_revealed_own int;
  v_own_total int;
  v_next_team text;
begin
  select id into v_lobby_id from cr_lobbies where code = p_code;
  if v_lobby_id is null then raise exception 'Lobby not found'; end if;

  select id, team, is_spymaster into v_player_id, v_player_team, v_is_spy
    from cr_players where lobby_id = v_lobby_id and player_token = p_player_token;
  if v_player_id is null then raise exception 'You are not in this lobby'; end if;

  select id, current_team, starting_team, current_clue_word, guesses_remaining
    into v_game_id, v_current_team, v_starting_team, v_clue, v_guesses
    from cr_games where lobby_id = v_lobby_id and status = 'in_progress'
    order by created_at desc limit 1;
  if v_game_id is null then raise exception 'No active game'; end if;
  if v_clue is null then raise exception 'No active clue'; end if;
  if v_is_spy or v_player_team <> v_current_team then
    raise exception 'Only an operative on the current team may reveal';
  end if;

  select id, card_type, revealed into v_card_id, v_card_type, v_already_revealed
    from cr_cards where game_id = v_game_id and position = p_position;
  if v_card_id is null then raise exception 'Invalid card position'; end if;
  if v_already_revealed then raise exception 'Card already revealed'; end if;

  update cr_cards set revealed = true where id = v_card_id;
  insert into cr_actions (game_id, player_id, action_type, payload)
  values (v_game_id, v_player_id, 'reveal',
          jsonb_build_object('position', p_position, 'card_type', v_card_type));

  v_other_team := case when v_current_team = 'red' then 'blue' else 'red' end;

  if v_card_type = 'assassin' then
    update cr_games set status = v_other_team || '_win', ended_at = now(),
      current_clue_word = null, current_clue_count = null, guesses_remaining = null
      where id = v_game_id;
    update cr_lobbies set status = 'finished' where id = v_lobby_id;
    insert into cr_actions (game_id, action_type, payload)
    values (v_game_id, 'game_end', jsonb_build_object('reason', 'assassin', 'winner', v_other_team));
    return;
  end if;

  if v_card_type = 'neutral' or v_card_type = v_other_team then
    v_next_team := v_other_team;
    update cr_games
      set current_team = v_next_team,
          current_clue_word = null,
          current_clue_count = null,
          guesses_remaining = null
      where id = v_game_id;
    return;
  end if;

  -- Own-color branch.
  v_own_total := case when v_current_team = v_starting_team then 9 else 8 end;
  select count(*) into v_revealed_own
    from cr_cards where game_id = v_game_id and card_type = v_current_team and revealed;

  if v_revealed_own >= v_own_total then
    update cr_games set status = v_current_team || '_win', ended_at = now(),
      current_clue_word = null, current_clue_count = null, guesses_remaining = null
      where id = v_game_id;
    update cr_lobbies set status = 'finished' where id = v_lobby_id;
    insert into cr_actions (game_id, action_type, payload)
    values (v_game_id, 'game_end', jsonb_build_object('reason', 'cleared', 'winner', v_current_team));
    return;
  end if;

  update cr_games set guesses_remaining = v_guesses - 1 where id = v_game_id;
  if v_guesses - 1 <= 0 then
    update cr_games
      set current_team = v_other_team,
          current_clue_word = null,
          current_clue_count = null,
          guesses_remaining = null
      where id = v_game_id;
  end if;
end $$;
