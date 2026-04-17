-- Code Red tables. All prefixed cr_ to avoid colliding with existing tables.

create table cr_lobbies (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  status text not null default 'lobby',  -- 'lobby' | 'in_game' | 'finished'
  created_at timestamptz not null default now()
);

create table cr_players (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references cr_lobbies(id) on delete cascade,
  player_token text not null,
  nickname text not null,
  team text,                                 -- null | 'red' | 'blue'
  is_spymaster boolean not null default false,
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  unique(lobby_id, player_token)
);

create table cr_games (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references cr_lobbies(id) on delete cascade,
  starting_team text not null,               -- 'red' | 'blue'
  current_team text not null,                -- 'red' | 'blue'
  status text not null default 'in_progress',-- 'in_progress' | 'red_win' | 'blue_win'
  current_clue_word text,
  current_clue_count integer,
  guesses_remaining integer,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create table cr_cards (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references cr_games(id) on delete cascade,
  position integer not null,                 -- 0..24
  sign_id uuid not null references signs(id),
  card_type text not null,                   -- 'red' | 'blue' | 'neutral' | 'assassin'
  revealed boolean not null default false,
  unique(game_id, position)
);

create table cr_actions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references cr_games(id) on delete cascade,
  player_id uuid references cr_players(id) on delete set null,
  action_type text not null,                 -- 'clue' | 'reveal' | 'end_turn' | 'game_end'
  payload jsonb,
  created_at timestamptz not null default now()
);

create index idx_cr_players_lobby on cr_players(lobby_id);
create index idx_cr_games_lobby on cr_games(lobby_id, created_at desc);
create index idx_cr_cards_game on cr_cards(game_id);
create index idx_cr_actions_game on cr_actions(game_id, created_at);

alter table cr_lobbies enable row level security;
alter table cr_players enable row level security;
alter table cr_games   enable row level security;
alter table cr_cards   enable row level security;
alter table cr_actions enable row level security;

create policy "Anyone can read cr_lobbies" on cr_lobbies for select using (true);
create policy "Anyone can read cr_players" on cr_players for select using (true);
create policy "Anyone can read cr_games"   on cr_games   for select using (true);
create policy "Anyone can read cr_cards"   on cr_cards   for select using (true);
create policy "Anyone can read cr_actions" on cr_actions for select using (true);

alter publication supabase_realtime
  add table cr_lobbies, cr_players, cr_games, cr_cards, cr_actions;
