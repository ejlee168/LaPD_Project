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

  insert into cr_players (lobby_id, player_token, nickname)
  values (v_lobby_id, p_player_token, p_nickname)
  on conflict (lobby_id, player_token) do update
    set nickname = excluded.nickname,
        last_seen = now()
  returning id into v_player_id;

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
