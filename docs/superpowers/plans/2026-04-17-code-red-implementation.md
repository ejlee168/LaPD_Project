# Code Red Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a self-contained multiplayer Codenames clone at `/code-red` backed by Supabase (Postgres + Realtime), drawing its 25-card board from a new `signs` table.

**Architecture:** Normalized `cr_*` tables with RLS-locked writes; all mutations go through `security definer` RPCs. Browsers subscribe to `postgres_changes` Realtime for game state and a `presence` channel for online dots. Anonymous identity via a per-browser `player_token` in `localStorage`.

**Tech Stack:** Next.js 16 (app router, React 19, React Compiler), Tailwind v4, shadcn `base-nova`, `@supabase/ssr` + `@supabase/supabase-js` (Realtime), `sonner` for toasts, `motion` for transitions.

---

## File Structure

**New migrations (Supabase CLI applies these in order):**
- Create: `supabase/migrations/003_signs.sql` — `signs` table + RLS.
- Create: `supabase/migrations/004_code_red.sql` — `cr_*` tables, indexes, RLS, Realtime publication.
- Create: `supabase/migrations/005_code_red_rpcs.sql` — all `security definer` RPCs.

**Library code (client-only, lives under `lib/code-red/`):**
- Create: `lib/code-red/types.ts` — Lobby, Player, Game, Card, Action TypeScript types.
- Create: `lib/code-red/player-token.ts` — get-or-create the `localStorage` player token.
- Create: `lib/code-red/client.ts` — typed RPC wrappers around `supabase.rpc(...)`.
- Create: `lib/code-red/realtime.ts` — per-table subscription helpers.
- Create: `lib/code-red/rules.ts` — pure helpers for UI gating (canStart, canClaim, etc.).

**Routes:**
- Create: `app/code-red/page.tsx` — landing page: nickname + create/join card.
- Create: `app/code-red/[code]/page.tsx` — server component; hydrates lobby + latest game.
- Create: `app/code-red/[code]/lobby-room.tsx` — client root that flips between Lobby and Game views.

**Components (all client-side, under `components/code-red/`):**
- Create: `components/code-red/lobby-header.tsx` — code display + copy + leave-lobby.
- Create: `components/code-red/team-panel.tsx` — one team's roster + join/spymaster controls.
- Create: `components/code-red/spectator-list.tsx` — the null-team roster.
- Create: `components/code-red/game-board.tsx` — 5×5 grid (renders `GameCard`s).
- Create: `components/code-red/game-card.tsx` — single card; hidden/revealed + spymaster tint.
- Create: `components/code-red/clue-form.tsx` — current spymaster's clue input.
- Create: `components/code-red/turn-banner.tsx` — current team + active clue + guesses.
- Create: `components/code-red/action-log.tsx` — chronological clues/reveals/turn-changes.

**Navigation:**
- Modify: `components/nav-header.tsx` — add a "code red" link next to "cases" / "anki".

---

## Conventions followed

- File paths use TS path alias `@/…` (resolves to repo root per `tsconfig.json`).
- Supabase clients come from `@/lib/supabase/client` (browser) and `@/lib/supabase/server` (RSC).
- UI uses shadcn `base-nova` components from `@/components/ui/*`. Don't hand-roll buttons or cards.
- `FadeIn` wraps route-level transitions.
- Toast errors via `sonner` (`import { toast } from "sonner"`).
- Filenames are kebab-case. Components are named exports (`export function X`).
- **There is no test framework installed.** Verification is manual in the browser; each task ends with a "Verify" step that specifies what to click and what to see. Do NOT add jest/vitest.
- **Read `node_modules/next/dist/docs/01-app/...` before writing new route conventions** (per `AGENTS.md` — this is Next 16 and APIs may differ from training data). Specifically: `params` is a `Promise<…>` that must be awaited.

---

## Task 1: Migration — `signs` table

**Files:**
- Create: `supabase/migrations/003_signs.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/003_signs.sql
create table signs (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

alter table signs enable row level security;

create policy "Anyone can read signs"
  on signs for select using (true);
```

- [ ] **Step 2: Apply the migration**

Run: `npx supabase db push` (or paste the file contents into the Supabase SQL editor — whichever the project already uses; check how 001/002 were applied).

Expected: no errors. `\d signs` in psql shows two columns.

- [ ] **Step 3: Verify from the app**

Run the dev server (`npm run dev`), open any page, and check the browser console. Expected: no errors. (Nothing calls `signs` yet — this is a sanity check that the migration didn't break reads.)

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/003_signs.sql
git commit -m "feat(code-red): add signs table"
```

---

## Task 2: Migration — Code Red schema

**Files:**
- Create: `supabase/migrations/004_code_red.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/004_code_red.sql
create table cr_lobbies (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  status text not null default 'lobby',
  created_at timestamptz not null default now()
);

create table cr_players (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references cr_lobbies(id) on delete cascade,
  player_token text not null,
  nickname text not null,
  team text,
  is_spymaster boolean not null default false,
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  unique(lobby_id, player_token)
);

create table cr_games (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references cr_lobbies(id) on delete cascade,
  starting_team text not null,
  current_team text not null,
  status text not null default 'in_progress',
  current_clue_word text,
  current_clue_count integer,
  guesses_remaining integer,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create table cr_cards (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references cr_games(id) on delete cascade,
  position integer not null,
  sign_id uuid not null references signs(id),
  card_type text not null,
  revealed boolean not null default false,
  unique(game_id, position)
);

create table cr_actions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references cr_games(id) on delete cascade,
  player_id uuid references cr_players(id),
  action_type text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index idx_cr_players_lobby on cr_players(lobby_id);
create index idx_cr_games_lobby on cr_games(lobby_id, created_at desc);
create index idx_cr_cards_game on cr_cards(game_id);
create index idx_cr_actions_game on cr_actions(game_id, created_at);

alter table cr_lobbies enable row level security;
alter table cr_players enable row level security;
alter table cr_games enable row level security;
alter table cr_cards enable row level security;
alter table cr_actions enable row level security;

create policy "Anyone can read cr_lobbies" on cr_lobbies for select using (true);
create policy "Anyone can read cr_players" on cr_players for select using (true);
create policy "Anyone can read cr_games"   on cr_games   for select using (true);
create policy "Anyone can read cr_cards"   on cr_cards   for select using (true);
create policy "Anyone can read cr_actions" on cr_actions for select using (true);

alter publication supabase_realtime
  add table cr_lobbies, cr_players, cr_games, cr_cards, cr_actions;
```

- [ ] **Step 2: Apply the migration**

Run: `npx supabase db push` (or paste into Supabase SQL editor).

Expected: no errors. `select tablename from pg_tables where tablename like 'cr_%';` returns 5 rows.

- [ ] **Step 3: Verify Realtime publication**

Run in SQL editor:
```sql
select tablename from pg_publication_tables where pubname = 'supabase_realtime' and tablename like 'cr_%';
```
Expected: 5 rows (one per `cr_*` table).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/004_code_red.sql
git commit -m "feat(code-red): add cr_* tables, RLS, realtime publication"
```

---

## Task 3: Migration — Lobby & roster RPCs

**Files:**
- Create: `supabase/migrations/005_code_red_rpcs.sql`

This migration grows in tasks 3–5. Start by writing just the lobby/roster RPCs in step 1.

- [ ] **Step 1: Write the lobby + roster RPCs**

```sql
-- supabase/migrations/005_code_red_rpcs.sql
-- Helper: generate a 6-character short code.
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
```

- [ ] **Step 2: Apply the migration**

Run: `npx supabase db push` (or paste in SQL editor).

Expected: `select proname from pg_proc where proname like 'cr\_%' escape '\';` returns all 7 functions (including `cr_gen_code`).

- [ ] **Step 3: Smoke test from SQL editor**

Run:
```sql
select cr_create_lobby('test', 'token-a') as code;
```
Expected: returns a 6-character code. Then:
```sql
select id, code, status from cr_lobbies;
select nickname, team, is_spymaster from cr_players;
```
Expected: one lobby, one player with `team = null`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/005_code_red_rpcs.sql
git commit -m "feat(code-red): add lobby & roster RPCs"
```

---

## Task 4: Migration — Game lifecycle RPCs

**Files:**
- Modify: `supabase/migrations/005_code_red_rpcs.sql` — append `cr_start_game` and `cr_play_again`.

- [ ] **Step 1: Append the RPCs**

Append to `005_code_red_rpcs.sql`:

```sql
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
  v_positions int[];
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
    count(*) filter (where team='red' and is_spymaster),
    count(*) filter (where team='red' and not is_spymaster),
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
  v_other_team := case when v_starting_team = 'red' then 'blue' else 'red' end;

  insert into cr_games (lobby_id, starting_team, current_team)
  values (v_lobby_id, v_starting_team, v_starting_team)
  returning id into v_game_id;

  -- Build a shuffled 25-element type array: 9 starting, 8 other, 7 neutral, 1 assassin.
  v_types := array(
    select t from (
      select v_starting_team as t from generate_series(1,9)
      union all
      select v_other_team from generate_series(1,8)
      union all
      select 'neutral' from generate_series(1,7)
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
```

- [ ] **Step 2: Apply the migration**

Run: `npx supabase db push` (or re-run the full file in SQL editor — all functions are `create or replace`).

Expected: no errors.

- [ ] **Step 3: Seed some signs for smoke-testing**

In SQL editor (one-time; user can replace later):
```sql
insert into signs (name)
select 'sign-' || g from generate_series(1, 30) g
on conflict do nothing;
```

- [ ] **Step 4: Smoke test `cr_start_game`**

Using a lobby from Task 3 (or make a new one) and adding enough players manually:
```sql
-- Set up minimal viable game in one lobby. Replace :code with an actual 6-char code.
select cr_pick_team(:'code', 'token-a', 'red');
select cr_claim_spymaster(:'code', 'token-a');
select cr_join_lobby(:'code', 'r-op', 'token-b');
select cr_pick_team(:'code', 'token-b', 'red');
select cr_join_lobby(:'code', 'b-spy', 'token-c');
select cr_pick_team(:'code', 'token-c', 'blue');
select cr_claim_spymaster(:'code', 'token-c');
select cr_join_lobby(:'code', 'b-op', 'token-d');
select cr_pick_team(:'code', 'token-d', 'blue');
select cr_start_game(:'code', 'token-a') as game_id;
```
Expected: a game_id UUID. Then:
```sql
select count(*), card_type from cr_cards where game_id = :'game_id' group by card_type;
```
Expected: 4 rows — 9 of the starting team, 8 of the other, 7 neutral, 1 assassin.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/005_code_red_rpcs.sql
git commit -m "feat(code-red): add start-game & play-again RPCs"
```

---

## Task 5: Migration — Turn action RPCs

**Files:**
- Modify: `supabase/migrations/005_code_red_rpcs.sql` — append clue/reveal/end-turn.

- [ ] **Step 1: Append the RPCs**

Append to `005_code_red_rpcs.sql`:

```sql
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
```

- [ ] **Step 2: Apply the migration**

Run: `npx supabase db push` (or re-run the full file).

Expected: no errors.

- [ ] **Step 3: Smoke test a full turn cycle**

Using the game from Task 4's smoke test:
```sql
select cr_submit_clue(:'code', 'token-a', 'first-clue', 2);
-- Find a red-colored card's position:
select position, card_type from cr_cards where game_id = :'game_id' and card_type = 'red' limit 1;
-- Then:
select cr_reveal_card(:'code', 'token-b', <that_position>);
select current_team, current_clue_word, guesses_remaining from cr_games where id = :'game_id';
```
Expected after reveal: `current_clue_word` still set, `guesses_remaining` = 2.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/005_code_red_rpcs.sql
git commit -m "feat(code-red): add turn action RPCs (clue, reveal, end-turn)"
```

---

## Task 6: Types + player token

**Files:**
- Create: `lib/code-red/types.ts`
- Create: `lib/code-red/player-token.ts`

- [ ] **Step 1: Write `types.ts`**

```ts
// lib/code-red/types.ts
export type Team = 'red' | 'blue';
export type LobbyStatus = 'lobby' | 'in_game' | 'finished';
export type GameStatus = 'in_progress' | 'red_win' | 'blue_win';
export type CardType = Team | 'neutral' | 'assassin';
export type ActionType = 'clue' | 'reveal' | 'end_turn' | 'game_end';

export interface CrLobby {
  id: string;
  code: string;
  status: LobbyStatus;
  created_at: string;
}

export interface CrPlayer {
  id: string;
  lobby_id: string;
  player_token: string;
  nickname: string;
  team: Team | null;
  is_spymaster: boolean;
  joined_at: string;
  last_seen: string;
}

export interface CrGame {
  id: string;
  lobby_id: string;
  starting_team: Team;
  current_team: Team;
  status: GameStatus;
  current_clue_word: string | null;
  current_clue_count: number | null;
  guesses_remaining: number | null;
  created_at: string;
  ended_at: string | null;
}

export interface CrCard {
  id: string;
  game_id: string;
  position: number;
  sign_id: string;
  card_type: CardType;
  revealed: boolean;
  sign_name?: string;
}

export interface CrAction {
  id: string;
  game_id: string;
  player_id: string | null;
  action_type: ActionType;
  payload: Record<string, unknown> | null;
  created_at: string;
}
```

- [ ] **Step 2: Write `player-token.ts`**

```ts
// lib/code-red/player-token.ts
const KEY = 'code-red:player-token';

export function getOrCreatePlayerToken(): string {
  if (typeof window === 'undefined') return '';
  const existing = window.localStorage.getItem(KEY);
  if (existing) return existing;
  const token = crypto.randomUUID();
  window.localStorage.setItem(KEY, token);
  return token;
}
```

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors (types and file are referenced nowhere yet, so this just checks TS validity).

- [ ] **Step 4: Commit**

```bash
git add lib/code-red/types.ts lib/code-red/player-token.ts
git commit -m "feat(code-red): add types and player-token helper"
```

---

## Task 7: Typed RPC wrappers

**Files:**
- Create: `lib/code-red/client.ts`

- [ ] **Step 1: Write the client**

```ts
// lib/code-red/client.ts
"use client";

import { createClient } from "@/lib/supabase/client";
import type { Team } from "@/lib/code-red/types";

function db() {
  return createClient();
}

function unwrap<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export async function createLobby(nickname: string, token: string): Promise<string> {
  return unwrap(await db().rpc('cr_create_lobby', {
    p_nickname: nickname, p_player_token: token,
  }));
}

export async function joinLobby(code: string, nickname: string, token: string): Promise<string> {
  return unwrap(await db().rpc('cr_join_lobby', {
    p_code: code, p_nickname: nickname, p_player_token: token,
  }));
}

export async function pickTeam(code: string, token: string, team: Team | null): Promise<void> {
  const { error } = await db().rpc('cr_pick_team', {
    p_code: code, p_player_token: token, p_team: team,
  });
  if (error) throw new Error(error.message);
}

export async function claimSpymaster(code: string, token: string): Promise<void> {
  const { error } = await db().rpc('cr_claim_spymaster', {
    p_code: code, p_player_token: token,
  });
  if (error) throw new Error(error.message);
}

export async function relinquishSpymaster(code: string, token: string): Promise<void> {
  const { error } = await db().rpc('cr_relinquish_spymaster', {
    p_code: code, p_player_token: token,
  });
  if (error) throw new Error(error.message);
}

export async function kickPlayer(code: string, token: string, targetId: string): Promise<void> {
  const { error } = await db().rpc('cr_kick_player', {
    p_code: code, p_actor_token: token, p_target_player_id: targetId,
  });
  if (error) throw new Error(error.message);
}

export async function startGame(code: string, token: string): Promise<string> {
  return unwrap(await db().rpc('cr_start_game', {
    p_code: code, p_player_token: token,
  }));
}

export async function playAgain(code: string, token: string): Promise<void> {
  const { error } = await db().rpc('cr_play_again', {
    p_code: code, p_player_token: token,
  });
  if (error) throw new Error(error.message);
}

export async function submitClue(code: string, token: string, word: string, count: number): Promise<void> {
  const { error } = await db().rpc('cr_submit_clue', {
    p_code: code, p_player_token: token, p_word: word, p_count: count,
  });
  if (error) throw new Error(error.message);
}

export async function revealCard(code: string, token: string, position: number): Promise<void> {
  const { error } = await db().rpc('cr_reveal_card', {
    p_code: code, p_player_token: token, p_position: position,
  });
  if (error) throw new Error(error.message);
}

export async function endTurn(code: string, token: string): Promise<void> {
  const { error } = await db().rpc('cr_end_turn', {
    p_code: code, p_player_token: token,
  });
  if (error) throw new Error(error.message);
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/code-red/client.ts
git commit -m "feat(code-red): add typed RPC wrappers"
```

---

## Task 8: Realtime helpers

**Files:**
- Create: `lib/code-red/realtime.ts`

- [ ] **Step 1: Write the helpers**

```ts
// lib/code-red/realtime.ts
"use client";

import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

export type Unsub = () => void;

export function subscribeToLobby(
  lobbyId: string,
  onChange: () => void,
): Unsub {
  const supabase = createClient();
  const channel: RealtimeChannel = supabase
    .channel(`cr-lobby-${lobbyId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'cr_lobbies', filter: `id=eq.${lobbyId}` },
      onChange)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'cr_players', filter: `lobby_id=eq.${lobbyId}` },
      onChange)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'cr_games', filter: `lobby_id=eq.${lobbyId}` },
      onChange)
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

export function subscribeToGame(
  gameId: string,
  onChange: () => void,
): Unsub {
  const supabase = createClient();
  const channel: RealtimeChannel = supabase
    .channel(`cr-game-${gameId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'cr_cards', filter: `game_id=eq.${gameId}` },
      onChange)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'cr_actions', filter: `game_id=eq.${gameId}` },
      onChange)
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

export function subscribeToPresence(
  code: string,
  token: string,
  nickname: string,
  onSync: (onlineTokens: Set<string>) => void,
): Unsub {
  const supabase: SupabaseClient = createClient();
  const channel = supabase.channel(`cr-presence-${code}`, {
    config: { presence: { key: token } },
  });

  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    const online = new Set(Object.keys(state));
    onSync(online);
  });

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ token, nickname });
    }
  });

  return () => { supabase.removeChannel(channel); };
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/code-red/realtime.ts
git commit -m "feat(code-red): add realtime subscription helpers"
```

---

## Task 9: Rules helpers

**Files:**
- Create: `lib/code-red/rules.ts`

- [ ] **Step 1: Write the helpers**

```ts
// lib/code-red/rules.ts
import type { CrGame, CrPlayer, Team } from "@/lib/code-red/types";

export function teamCounts(players: CrPlayer[], team: Team) {
  let total = 0;
  let spymasters = 0;
  for (const p of players) {
    if (p.team !== team) continue;
    total += 1;
    if (p.is_spymaster) spymasters += 1;
  }
  return { total, spymasters, operatives: total - spymasters };
}

export function canClaimSpymaster(players: CrPlayer[], me: CrPlayer | null): boolean {
  if (!me || !me.team || me.is_spymaster) return false;
  const { total, spymasters } = teamCounts(players, me.team);
  const allowed = total >= 5 ? 2 : 1;
  return spymasters < allowed;
}

export function canStartGame(players: CrPlayer[]): boolean {
  const red = teamCounts(players, 'red');
  const blue = teamCounts(players, 'blue');
  return red.spymasters >= 1 && red.operatives >= 1
      && blue.spymasters >= 1 && blue.operatives >= 1;
}

export function isYourTurnToClue(game: CrGame | null, me: CrPlayer | null): boolean {
  if (!game || !me) return false;
  return game.status === 'in_progress'
      && me.is_spymaster
      && me.team === game.current_team
      && !game.current_clue_word;
}

export function isYourTurnToGuess(game: CrGame | null, me: CrPlayer | null): boolean {
  if (!game || !me) return false;
  return game.status === 'in_progress'
      && !me.is_spymaster
      && me.team === game.current_team
      && !!game.current_clue_word
      && (game.guesses_remaining ?? 0) > 0;
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/code-red/rules.ts
git commit -m "feat(code-red): add UI-gating rule helpers"
```

---

## Task 10: Landing page (`/code-red`)

**Files:**
- Create: `app/code-red/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
// app/code-red/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FadeIn } from "@/components/fade-in";
import { createLobby, joinLobby } from "@/lib/code-red/client";
import { getOrCreatePlayerToken } from "@/lib/code-red/player-token";

export default function CodeRedLandingPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    const name = nickname.trim();
    if (!name) return toast.error("Enter a nickname");
    setBusy(true);
    try {
      const token = getOrCreatePlayerToken();
      const code = await createLobby(name, token);
      router.push(`/code-red/${code}`);
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  }

  async function handleJoin() {
    const name = nickname.trim();
    const code = joinCode.trim().toUpperCase();
    if (!name) return toast.error("Enter a nickname");
    if (code.length !== 6) return toast.error("Code must be 6 characters");
    setBusy(true);
    try {
      const token = getOrCreatePlayerToken();
      await joinLobby(code, name, token);
      router.push(`/code-red/${code}`);
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <FadeIn className="max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">🕵️ Code Red</h1>
        <p className="text-muted-foreground">Codenames with your friends</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Nickname</CardTitle></CardHeader>
        <CardContent>
          <Input
            placeholder="Pick a nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={24}
            autoFocus
          />
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Create lobby</CardTitle></CardHeader>
          <CardContent>
            <Button disabled={busy} onClick={handleCreate} className="w-full">
              New lobby
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Join lobby</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Input
              placeholder="6-char code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
            />
            <Button disabled={busy} onClick={handleJoin} className="w-full">
              Join
            </Button>
          </CardContent>
        </Card>
      </div>
    </FadeIn>
  );
}
```

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`
Navigate to `http://localhost:3000/code-red`. Expected: page renders with nickname field + two cards (Create / Join). Type a nickname and click "New lobby". Expected: URL changes to `/code-red/<CODE>` (page will 404 until Task 11 — that's fine). Go back and try join with an invalid code; expected: red toast "Lobby not found".

- [ ] **Step 3: Commit**

```bash
git add app/code-red/page.tsx
git commit -m "feat(code-red): add landing page with create/join"
```

---

## Task 11: Lobby route shell

**Files:**
- Create: `app/code-red/[code]/page.tsx`
- Create: `app/code-red/[code]/lobby-room.tsx`

This task sets up the route skeleton. Later tasks fill in the Lobby and Game subviews.

- [ ] **Step 1: Write the server component**

```tsx
// app/code-red/[code]/page.tsx
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LobbyRoom } from "./lobby-room";
import type { CrLobby, CrPlayer, CrGame, CrCard } from "@/lib/code-red/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return { title: `🕵️ Code Red | ${code}` };
}

export default async function CodeRedLobbyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const upper = code.toUpperCase();
  const supabase = await createClient();

  const { data: lobby } = await supabase
    .from("cr_lobbies")
    .select("id, code, status, created_at")
    .eq("code", upper)
    .single<CrLobby>();
  if (!lobby) notFound();

  const { data: players } = await supabase
    .from("cr_players")
    .select("id, lobby_id, player_token, nickname, team, is_spymaster, joined_at, last_seen")
    .eq("lobby_id", lobby.id);

  const { data: latestGame } = await supabase
    .from("cr_games")
    .select("id, lobby_id, starting_team, current_team, status, current_clue_word, current_clue_count, guesses_remaining, created_at, ended_at")
    .eq("lobby_id", lobby.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<CrGame>();

  let cards: CrCard[] = [];
  if (latestGame) {
    const { data } = await supabase
      .from("cr_cards")
      .select("id, game_id, position, sign_id, card_type, revealed, signs(name)")
      .eq("game_id", latestGame.id)
      .order("position");
    cards = (data ?? []).map((row: {
      id: string; game_id: string; position: number; sign_id: string;
      card_type: CrCard['card_type']; revealed: boolean;
      signs: { name: string } | { name: string }[] | null;
    }) => {
      const s = Array.isArray(row.signs) ? row.signs[0] : row.signs;
      return { ...row, sign_name: s?.name } as CrCard;
    });
  }

  return (
    <LobbyRoom
      initialLobby={lobby}
      initialPlayers={(players ?? []) as CrPlayer[]}
      initialGame={latestGame ?? null}
      initialCards={cards}
    />
  );
}
```

- [ ] **Step 2: Write the lobby-room client root**

```tsx
// app/code-red/[code]/lobby-room.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { subscribeToLobby, subscribeToGame, subscribeToPresence } from "@/lib/code-red/realtime";
import { getOrCreatePlayerToken } from "@/lib/code-red/player-token";
import { joinLobby } from "@/lib/code-red/client";
import type { CrLobby, CrPlayer, CrGame, CrCard } from "@/lib/code-red/types";

interface Props {
  initialLobby: CrLobby;
  initialPlayers: CrPlayer[];
  initialGame: CrGame | null;
  initialCards: CrCard[];
}

export function LobbyRoom({ initialLobby, initialPlayers, initialGame, initialCards }: Props) {
  const router = useRouter();
  const [lobby, setLobby] = useState(initialLobby);
  const [players, setPlayers] = useState(initialPlayers);
  const [game, setGame] = useState(initialGame);
  const [cards, setCards] = useState(initialCards);
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [token, setToken] = useState<string>("");

  useEffect(() => { setToken(getOrCreatePlayerToken()); }, []);

  const me = players.find((p) => p.player_token === token) ?? null;

  const refetchLobbyState = useCallback(async () => {
    const supabase = createClient();
    const [{ data: l }, { data: ps }, { data: g }] = await Promise.all([
      supabase.from("cr_lobbies").select("id, code, status, created_at").eq("id", lobby.id).single<CrLobby>(),
      supabase.from("cr_players").select("id, lobby_id, player_token, nickname, team, is_spymaster, joined_at, last_seen").eq("lobby_id", lobby.id),
      supabase.from("cr_games").select("id, lobby_id, starting_team, current_team, status, current_clue_word, current_clue_count, guesses_remaining, created_at, ended_at").eq("lobby_id", lobby.id).order("created_at", { ascending: false }).limit(1).maybeSingle<CrGame>(),
    ]);
    if (l) setLobby(l);
    if (ps) setPlayers(ps as CrPlayer[]);
    setGame(g ?? null);
  }, [lobby.id]);

  const refetchCards = useCallback(async (gameId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("cr_cards")
      .select("id, game_id, position, sign_id, card_type, revealed, signs(name)")
      .eq("game_id", gameId)
      .order("position");
    const rows = (data ?? []).map((row: {
      id: string; game_id: string; position: number; sign_id: string;
      card_type: CrCard['card_type']; revealed: boolean;
      signs: { name: string } | { name: string }[] | null;
    }) => {
      const s = Array.isArray(row.signs) ? row.signs[0] : row.signs;
      return { ...row, sign_name: s?.name } as CrCard;
    });
    setCards(rows);
  }, []);

  useEffect(() => {
    const unsub = subscribeToLobby(lobby.id, () => { void refetchLobbyState(); });
    return unsub;
  }, [lobby.id, refetchLobbyState]);

  useEffect(() => {
    if (!game) return;
    void refetchCards(game.id);
    const unsub = subscribeToGame(game.id, () => { void refetchCards(game.id); });
    return unsub;
  }, [game, refetchCards]);

  useEffect(() => {
    if (!token || !me) return;
    const unsub = subscribeToPresence(lobby.code, token, me.nickname, setOnline);
    return unsub;
  }, [lobby.code, token, me]);

  // If the current browser has a token but isn't in the roster (e.g. deep-linked),
  // prompt for a nickname and join.
  useEffect(() => {
    if (!token) return;
    if (me) return;
    const nickname = window.prompt("Nickname for this lobby?");
    if (!nickname) {
      router.push("/code-red");
      return;
    }
    joinLobby(lobby.code, nickname.trim().slice(0, 24), token)
      .then(() => refetchLobbyState())
      .catch((e) => {
        toast.error((e as Error).message);
        router.push("/code-red");
      });
  }, [token, me, lobby.code, router, refetchLobbyState]);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="font-mono text-3xl tracking-widest">{lobby.code}</p>
        <p className="text-xs text-muted-foreground">
          status: {lobby.status} · online: {online.size} · players: {players.length}
        </p>
      </div>
      <p className="text-center text-muted-foreground text-sm">
        Lobby / Game UI coming in next tasks. {game ? `Latest game: ${game.status}` : "No game yet."}
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`. From the landing page, create a lobby. Expected:
- URL becomes `/code-red/<CODE>`.
- The code displays in monospace at the top.
- Status shows `lobby` and players `1`.

Open the same URL in a second browser/incognito window. Expected:
- Prompt for nickname.
- After entering one, the other window's player count updates to `2` via Realtime.

- [ ] **Step 4: Commit**

```bash
git add app/code-red/
git commit -m "feat(code-red): lobby route shell with realtime sync"
```

---

## Task 12: Lobby header (code + copy + leave)

**Files:**
- Create: `components/code-red/lobby-header.tsx`
- Modify: `app/code-red/[code]/lobby-room.tsx` — render the header, remove the inline code display.

- [ ] **Step 1: Write the header**

```tsx
// components/code-red/lobby-header.tsx
"use client";

import { useRouter } from "next/navigation";
import { LuCopy, LuLogOut } from "react-icons/lu";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { kickPlayer } from "@/lib/code-red/client";
import type { CrPlayer } from "@/lib/code-red/types";

interface Props {
  code: string;
  me: CrPlayer | null;
  token: string;
}

export function LobbyHeader({ code, me, token }: Props) {
  const router = useRouter();

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code copied");
    } catch {
      toast.error("Could not copy");
    }
  }

  async function leave() {
    if (!me) { router.push("/code-red"); return; }
    try {
      await kickPlayer(code, token, me.id);
    } catch (e) {
      toast.error((e as Error).message);
      return;
    }
    router.push("/code-red");
  }

  return (
    <div className="flex items-center justify-between rounded-xl border px-4 py-3">
      <div className="flex items-center gap-2">
        <button
          onClick={copy}
          className="font-mono text-2xl tracking-widest cursor-pointer hover:text-primary transition-colors"
          aria-label="Copy lobby code"
        >
          {code}
        </button>
        <Button variant="ghost" size="icon-sm" onClick={copy} aria-label="Copy">
          <LuCopy />
        </Button>
      </div>
      <Button variant="ghost" size="sm" onClick={leave}>
        <LuLogOut /> Leave
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `lobby-room.tsx`**

Replace the `<div className="text-center">...</div>` block at the bottom `return` of `lobby-room.tsx` with:

```tsx
<LobbyHeader code={lobby.code} me={me} token={token} />
<p className="text-xs text-muted-foreground text-center">
  status: {lobby.status} · online: {online.size} · players: {players.length}
</p>
<p className="text-center text-muted-foreground text-sm">
  Lobby / Game UI coming in next tasks. {game ? `Latest game: ${game.status}` : "No game yet."}
</p>
```

And add the import at the top:
```tsx
import { LobbyHeader } from "@/components/code-red/lobby-header";
```

- [ ] **Step 3: Verify in browser**

Reload the lobby page. Expected:
- Header shows the code with a copy icon. Clicking either the code or the icon shows a "Code copied" toast.
- "Leave" button returns you to `/code-red` and removes you from the roster (the other browser's player count drops).

- [ ] **Step 4: Commit**

```bash
git add components/code-red/lobby-header.tsx app/code-red/[code]/lobby-room.tsx
git commit -m "feat(code-red): lobby header with copy & leave"
```

---

## Task 13: Team panels + spectator list

**Files:**
- Create: `components/code-red/team-panel.tsx`
- Create: `components/code-red/spectator-list.tsx`
- Modify: `app/code-red/[code]/lobby-room.tsx` — render lobby view (two panels + spectators + start button).

- [ ] **Step 1: Write `team-panel.tsx`**

```tsx
// components/code-red/team-panel.tsx
"use client";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  pickTeam,
  claimSpymaster,
  relinquishSpymaster,
  kickPlayer,
} from "@/lib/code-red/client";
import { canClaimSpymaster } from "@/lib/code-red/rules";
import type { CrPlayer, Team } from "@/lib/code-red/types";

interface Props {
  code: string;
  token: string;
  team: Team;
  players: CrPlayer[];
  me: CrPlayer | null;
  online: Set<string>;
}

export function TeamPanel({ code, token, team, players, me, online }: Props) {
  const onTeam = players.filter((p) => p.team === team);
  const iAmOnThisTeam = me?.team === team;

  async function run(fn: () => Promise<unknown>) {
    try { await fn(); } catch (e) { toast.error((e as Error).message); }
  }

  const accent = team === "red"
    ? "ring-red-500/40 bg-red-500/5"
    : "ring-blue-500/40 bg-blue-500/5";
  const label = team === "red" ? "Red team" : "Blue team";

  return (
    <Card className={cn("ring-2", accent)}>
      <CardHeader><CardTitle>{label} ({onTeam.length})</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-1">
          {onTeam.length === 0 && (
            <li className="text-muted-foreground text-sm">No one here yet</li>
          )}
          {onTeam.map((p) => (
            <li key={p.id} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-block size-2 rounded-full",
                    online.has(p.player_token) ? "bg-emerald-500" : "bg-muted-foreground/40",
                  )}
                />
                <span>{p.nickname}</span>
                {p.is_spymaster && (
                  <span className="text-xs rounded bg-foreground/10 px-1.5 py-0.5">spy</span>
                )}
              </span>
              {me && p.id !== me.id && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => run(() => kickPlayer(code, token, p.id))}
                >
                  kick
                </Button>
              )}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          {!iAmOnThisTeam && (
            <Button size="sm" onClick={() => run(() => pickTeam(code, token, team))}>
              Join {team}
            </Button>
          )}
          {iAmOnThisTeam && (
            <Button size="sm" variant="outline" onClick={() => run(() => pickTeam(code, token, null))}>
              Leave team
            </Button>
          )}
          {iAmOnThisTeam && !me?.is_spymaster && (
            <Button
              size="sm"
              variant="secondary"
              disabled={!canClaimSpymaster(players, me)}
              onClick={() => run(() => claimSpymaster(code, token))}
            >
              Be spymaster
            </Button>
          )}
          {iAmOnThisTeam && me?.is_spymaster && (
            <Button size="sm" variant="secondary"
              onClick={() => run(() => relinquishSpymaster(code, token))}>
              Step down
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Write `spectator-list.tsx`**

```tsx
// components/code-red/spectator-list.tsx
"use client";

import { cn } from "@/lib/utils";
import type { CrPlayer } from "@/lib/code-red/types";

interface Props {
  players: CrPlayer[];
  online: Set<string>;
}

export function SpectatorList({ players, online }: Props) {
  const spectators = players.filter((p) => p.team === null);
  if (spectators.length === 0) return null;
  return (
    <div className="rounded-lg border px-4 py-2">
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
        Spectators ({spectators.length})
      </p>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
        {spectators.map((p) => (
          <li key={p.id} className="flex items-center gap-1.5">
            <span className={cn(
              "inline-block size-2 rounded-full",
              online.has(p.player_token) ? "bg-emerald-500" : "bg-muted-foreground/40",
            )} />
            {p.nickname}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Build a `LobbyView` subsection in `lobby-room.tsx`**

Replace the "Lobby / Game UI coming in next tasks" paragraph with a `LobbyView` that's rendered when `lobby.status !== 'in_game'`. Add imports for `TeamPanel`, `SpectatorList`, `startGame`, `playAgain`, and `canStartGame`.

At the top of `lobby-room.tsx`:
```tsx
import { TeamPanel } from "@/components/code-red/team-panel";
import { SpectatorList } from "@/components/code-red/spectator-list";
import { startGame, playAgain } from "@/lib/code-red/client";
import { canStartGame } from "@/lib/code-red/rules";
```

Replace the `<p>Lobby / Game UI coming...</p>` and status line with:
```tsx
{lobby.status !== 'in_game' ? (
  <>
    {lobby.status === 'finished' && game && (
      <div className="rounded-lg border px-4 py-2 text-sm text-center">
        Last game: <span className="font-medium">{game.status.replace('_', ' ')}</span>
      </div>
    )}
    <div className="grid gap-4 sm:grid-cols-2">
      <TeamPanel code={lobby.code} token={token} team="red"  players={players} me={me} online={online} />
      <TeamPanel code={lobby.code} token={token} team="blue" players={players} me={me} online={online} />
    </div>
    <SpectatorList players={players} online={online} />
    <div className="flex justify-center gap-2">
      {lobby.status === 'lobby' && (
        <Button
          disabled={!canStartGame(players)}
          onClick={async () => {
            try { await startGame(lobby.code, token); }
            catch (e) { toast.error((e as Error).message); }
          }}
        >
          Start game
        </Button>
      )}
      {lobby.status === 'finished' && (
        <Button
          onClick={async () => {
            try { await playAgain(lobby.code, token); }
            catch (e) { toast.error((e as Error).message); }
          }}
        >
          Play again
        </Button>
      )}
    </div>
  </>
) : (
  <p className="text-center text-muted-foreground text-sm">Game board coming in Task 14.</p>
)}
```

Also import `Button` and `toast` in `lobby-room.tsx` if not already:
```tsx
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
```

- [ ] **Step 4: Verify in browser**

Open the lobby in two windows. Expected:
- Both windows show red + blue panels and the spectator list with both players listed as spectators.
- Click "Join red" in window 1. Both windows update (realtime).
- Click "Be spymaster" in window 1. Badge appears.
- Add 2 more players (incognito windows) to cover: red spy, red op, blue spy, blue op.
- "Start game" button is disabled until all four are in place, then becomes enabled.
- Clicking "Start game" updates `lobby.status` to `in_game`; view flips to the placeholder "Game board coming in Task 14."

- [ ] **Step 5: Commit**

```bash
git add components/code-red/team-panel.tsx components/code-red/spectator-list.tsx app/code-red/[code]/lobby-room.tsx
git commit -m "feat(code-red): team panels, spectator list, start/play-again controls"
```

---

## Task 14: Game card + game board

**Files:**
- Create: `components/code-red/game-card.tsx`
- Create: `components/code-red/game-board.tsx`

- [ ] **Step 1: Write `game-card.tsx`**

```tsx
// components/code-red/game-card.tsx
"use client";

import { cn } from "@/lib/utils";
import type { CrCard, CardType } from "@/lib/code-red/types";

interface Props {
  card: CrCard;
  spymasterView: boolean;
  canClick: boolean;
  onClick?: () => void;
}

function bgForType(t: CardType): string {
  switch (t) {
    case "red": return "bg-red-500/25 border-red-500/60";
    case "blue": return "bg-blue-500/25 border-blue-500/60";
    case "neutral": return "bg-stone-400/30 border-stone-500/60";
    case "assassin": return "bg-neutral-900 text-white border-neutral-700";
  }
}

export function GameCard({ card, spymasterView, canClick, onClick }: Props) {
  const revealed = card.revealed;
  const showColor = revealed || spymasterView;
  return (
    <button
      type="button"
      onClick={canClick && !revealed ? onClick : undefined}
      disabled={!canClick || revealed}
      className={cn(
        "aspect-4/3 rounded-lg border px-2 py-1.5 text-center text-sm font-medium transition-all",
        "flex items-center justify-center leading-tight",
        showColor ? bgForType(card.card_type) : "bg-card border-border",
        revealed && "opacity-70 line-through",
        canClick && !revealed && "hover:-translate-y-0.5 hover:shadow cursor-pointer",
        !canClick && !revealed && "cursor-default",
      )}
      aria-label={`card ${card.position + 1}${revealed ? " revealed" : ""}`}
    >
      <span className="truncate">{card.sign_name ?? `#${card.position}`}</span>
    </button>
  );
}
```

- [ ] **Step 2: Write `game-board.tsx`**

```tsx
// components/code-red/game-board.tsx
"use client";

import { toast } from "sonner";
import { GameCard } from "@/components/code-red/game-card";
import { revealCard } from "@/lib/code-red/client";
import { isYourTurnToGuess } from "@/lib/code-red/rules";
import type { CrCard, CrGame, CrPlayer } from "@/lib/code-red/types";

interface Props {
  code: string;
  token: string;
  me: CrPlayer | null;
  game: CrGame | null;
  cards: CrCard[];
}

export function GameBoard({ code, token, me, game, cards }: Props) {
  const spymasterView = !!me?.is_spymaster;
  const canGuess = isYourTurnToGuess(game, me);

  async function click(position: number) {
    try { await revealCard(code, token, position); }
    catch (e) { toast.error((e as Error).message); }
  }

  const sorted = [...cards].sort((a, b) => a.position - b.position);

  return (
    <div className="grid grid-cols-5 gap-2 sm:gap-3">
      {sorted.map((c) => (
        <GameCard
          key={c.id}
          card={c}
          spymasterView={spymasterView}
          canClick={canGuess}
          onClick={() => click(c.position)}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Wire the board into `lobby-room.tsx`**

Replace the `in_game` branch placeholder:
```tsx
) : (
  <p className="text-center text-muted-foreground text-sm">Game board coming in Task 14.</p>
)}
```
with:
```tsx
) : (
  <GameBoard code={lobby.code} token={token} me={me} game={game} cards={cards} />
)}
```
And add the import:
```tsx
import { GameBoard } from "@/components/code-red/game-board";
```

- [ ] **Step 4: Verify in browser**

In the started game from Task 13:
- Spymaster window: grid shows 25 cards with team-colored tints.
- Operative windows: grid shows 25 neutral cards.
- Reveal cards in an operative window after you've submitted a clue (next task) — for now, clicking cards should toast "No active clue".

- [ ] **Step 5: Commit**

```bash
git add components/code-red/game-card.tsx components/code-red/game-board.tsx app/code-red/[code]/lobby-room.tsx
git commit -m "feat(code-red): 5x5 game board with spymaster/operative views"
```

---

## Task 15: Clue form + turn banner

**Files:**
- Create: `components/code-red/clue-form.tsx`
- Create: `components/code-red/turn-banner.tsx`
- Modify: `app/code-red/[code]/lobby-room.tsx` — render both above the board.

- [ ] **Step 1: Write `turn-banner.tsx`**

```tsx
// components/code-red/turn-banner.tsx
"use client";

import { cn } from "@/lib/utils";
import type { CrGame } from "@/lib/code-red/types";

export function TurnBanner({ game }: { game: CrGame | null }) {
  if (!game) return null;

  if (game.status !== "in_progress") {
    const winner = game.status === "red_win" ? "Red" : "Blue";
    return (
      <div className="rounded-lg border px-4 py-2 text-center text-base font-semibold">
        {winner} team wins!
      </div>
    );
  }

  const accent = game.current_team === "red"
    ? "bg-red-500/10 border-red-500/40"
    : "bg-blue-500/10 border-blue-500/40";

  return (
    <div className={cn("rounded-lg border px-4 py-2 text-center space-y-0.5", accent)}>
      <p className="text-sm font-medium">
        <span className="capitalize">{game.current_team}</span> team's turn
      </p>
      {game.current_clue_word ? (
        <p className="text-xs text-muted-foreground">
          Clue: <span className="font-mono font-semibold">{game.current_clue_word}</span>
          {" · "}
          {game.current_clue_count} · guesses left: {game.guesses_remaining}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Waiting for spymaster clue</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write `clue-form.tsx`**

```tsx
// components/code-red/clue-form.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitClue, endTurn } from "@/lib/code-red/client";
import { isYourTurnToClue, isYourTurnToGuess } from "@/lib/code-red/rules";
import type { CrGame, CrPlayer } from "@/lib/code-red/types";

interface Props {
  code: string;
  token: string;
  me: CrPlayer | null;
  game: CrGame | null;
}

export function ClueForm({ code, token, me, game }: Props) {
  const [word, setWord] = useState("");
  const [count, setCount] = useState("1");
  const canClue = isYourTurnToClue(game, me);
  const canEndTurn = isYourTurnToGuess(game, me);

  async function handleSubmit() {
    const w = word.trim();
    const n = parseInt(count, 10);
    if (!w) return toast.error("Enter a clue word");
    if (!Number.isFinite(n) || n < 1) return toast.error("Count must be >= 1");
    try {
      await submitClue(code, token, w, n);
      setWord("");
      setCount("1");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleEnd() {
    try { await endTurn(code, token); }
    catch (e) { toast.error((e as Error).message); }
  }

  if (canClue) {
    return (
      <div className="flex gap-2">
        <Input
          className="flex-1"
          placeholder="Clue word"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          maxLength={40}
        />
        <Input
          className="w-20"
          type="number"
          min={1}
          max={25}
          value={count}
          onChange={(e) => setCount(e.target.value)}
        />
        <Button onClick={handleSubmit}>Send clue</Button>
      </div>
    );
  }

  if (canEndTurn) {
    return (
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleEnd}>End turn</Button>
      </div>
    );
  }

  return null;
}
```

- [ ] **Step 3: Render in `lobby-room.tsx`**

Update the `in_game` branch:
```tsx
) : (
  <div className="space-y-3">
    <TurnBanner game={game} />
    <GameBoard code={lobby.code} token={token} me={me} game={game} cards={cards} />
    <ClueForm code={lobby.code} token={token} me={me} game={game} />
  </div>
)}
```
And add imports:
```tsx
import { TurnBanner } from "@/components/code-red/turn-banner";
import { ClueForm } from "@/components/code-red/clue-form";
```

- [ ] **Step 4: Verify in browser**

With four browser windows (one per role) in a started game:
- Current-team spymaster sees the clue form; types "foo" / 2 and submits.
- Turn banner updates with the clue + guesses-left count in all windows.
- Current-team operative can click cards. Clicking one of their own colors keeps the turn. Clicking a neutral/other/assassin flips `current_team` (or ends the game).
- End-of-game: banner says "Red team wins!" or similar; `cr_lobbies.status` becomes `finished`.
- From finished state, "Play again" returns to lobby view; team assignments persist; spymasters are cleared (re-elect them).

- [ ] **Step 5: Commit**

```bash
git add components/code-red/clue-form.tsx components/code-red/turn-banner.tsx app/code-red/[code]/lobby-room.tsx
git commit -m "feat(code-red): clue form and turn banner"
```

---

## Task 16: Action log

**Files:**
- Create: `components/code-red/action-log.tsx`
- Modify: `app/code-red/[code]/lobby-room.tsx` — fetch & subscribe to `cr_actions`, render the log.

- [ ] **Step 1: Write `action-log.tsx`**

```tsx
// components/code-red/action-log.tsx
"use client";

import type { CrAction } from "@/lib/code-red/types";

interface Props {
  actions: CrAction[];
  nicknameByPlayerId: Record<string, string | undefined>;
}

function describe(a: CrAction, who?: string): string {
  const w = who ?? "Someone";
  switch (a.action_type) {
    case "clue": {
      const p = a.payload as { word?: string; count?: number } | null;
      return `${w} gave clue "${p?.word}" (${p?.count})`;
    }
    case "reveal": {
      const p = a.payload as { position?: number; card_type?: string } | null;
      return `${w} revealed #${(p?.position ?? 0) + 1} → ${p?.card_type}`;
    }
    case "end_turn": return `${w} ended the turn`;
    case "game_end": {
      const p = a.payload as { winner?: string; reason?: string } | null;
      return `Game over — ${p?.winner} wins (${p?.reason})`;
    }
  }
}

export function ActionLog({ actions, nicknameByPlayerId }: Props) {
  if (actions.length === 0) return null;
  return (
    <div className="rounded-lg border px-4 py-2 max-h-48 overflow-y-auto">
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Log</p>
      <ul className="space-y-0.5 text-xs font-mono">
        {actions.map((a) => (
          <li key={a.id}>
            {describe(a, a.player_id ? nicknameByPlayerId[a.player_id] : undefined)}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Fetch & subscribe to actions in `lobby-room.tsx`**

Add state + imports near the existing state:
```tsx
import { ActionLog } from "@/components/code-red/action-log";
import type { CrAction } from "@/lib/code-red/types";

// inside LobbyRoom, alongside cards state:
const [actions, setActions] = useState<CrAction[]>([]);
```

Add a refetch function next to `refetchCards`:
```tsx
const refetchActions = useCallback(async (gameId: string) => {
  const supabase = createClient();
  const { data } = await supabase
    .from("cr_actions")
    .select("id, game_id, player_id, action_type, payload, created_at")
    .eq("game_id", gameId)
    .order("created_at", { ascending: true });
  setActions((data ?? []) as CrAction[]);
}, []);
```

Extend the game-subscription effect to also refetch actions when the channel fires:
```tsx
useEffect(() => {
  if (!game) { setActions([]); return; }
  void refetchCards(game.id);
  void refetchActions(game.id);
  const unsub = subscribeToGame(game.id, () => {
    void refetchCards(game.id);
    void refetchActions(game.id);
  });
  return unsub;
}, [game, refetchCards, refetchActions]);
```

Render the log at the bottom of the `in_game` branch:
```tsx
<ActionLog
  actions={actions}
  nicknameByPlayerId={Object.fromEntries(players.map((p) => [p.id, p.nickname]))}
/>
```

- [ ] **Step 3: Verify in browser**

Replay a short game. Expected: log grows as clues/reveals/turn-ends happen, all synced across windows.

- [ ] **Step 4: Commit**

```bash
git add components/code-red/action-log.tsx app/code-red/[code]/lobby-room.tsx
git commit -m "feat(code-red): action log"
```

---

## Task 17: Nav link + mobile drawer polish

**Files:**
- Modify: `components/nav-header.tsx` — add a "code red" link between "cases" and "anki".
- Modify: `app/code-red/[code]/lobby-room.tsx` — put `ActionLog` + spectator list into a `Drawer` on `<sm` to keep the board dominant on phones.

- [ ] **Step 1: Add the nav link**

In `components/nav-header.tsx`, inside the `<nav>` element, between the `cases` and `anki` links:
```tsx
<Link data-no-click-sound href="/code-red" className="text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">code red</Link>
```

- [ ] **Step 2: Mobile drawer polish (optional but in spec)**

Simplest approach: wrap `<ActionLog />` in a `hidden sm:block` container and expose it in a `Drawer` on small screens:

Add imports to `lobby-room.tsx`:
```tsx
import {
  Drawer, DrawerContent, DrawerTrigger, DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer";
```

Replace the direct `<ActionLog .../>` render with:
```tsx
<div className="hidden sm:block">
  <ActionLog actions={actions} nicknameByPlayerId={nicknameByPlayerId} />
</div>
<div className="sm:hidden">
  <Drawer>
    <DrawerTrigger asChild>
      <Button variant="outline" size="sm" className="w-full">Show log ({actions.length})</Button>
    </DrawerTrigger>
    <DrawerContent>
      <DrawerHeader><DrawerTitle>Action log</DrawerTitle></DrawerHeader>
      <div className="p-4">
        <ActionLog actions={actions} nicknameByPlayerId={nicknameByPlayerId} />
      </div>
    </DrawerContent>
  </Drawer>
</div>
```
Where `nicknameByPlayerId` is hoisted to a local `const` above the return:
```tsx
const nicknameByPlayerId = Object.fromEntries(players.map((p) => [p.id, p.nickname]));
```

- [ ] **Step 3: Verify in browser**

- Click "code red" in the nav from any page — lands on `/code-red`.
- Shrink the browser to mobile width (DevTools). Expected: board fills the width; action log collapses into a drawer trigger.

- [ ] **Step 4: Commit**

```bash
git add components/nav-header.tsx app/code-red/[code]/lobby-room.tsx
git commit -m "feat(code-red): nav link and mobile drawer for action log"
```

---

## Task 18: End-to-end smoke test

**Files:** none.

- [ ] **Step 1: Run the full happy path across four browser windows**

1. Window A: `http://localhost:3000/code-red` → create lobby as "alice". Copy code.
2. Windows B/C/D: paste code → join as "bob", "carol", "dave".
3. A joins red, claims spy. B joins red. C joins blue, claims spy. D joins blue.
4. A clicks "Start game" — all four views flip to the game board.
5. A sends clue "animals" / 2.
6. B reveals a red card, then another red card.
7. Play proceeds until all 9 (or 8) cards of one color are revealed — banner reads "Red team wins!" and lobby status becomes `finished`.
8. Anyone clicks "Play again" — returns to lobby view, teams preserved, spymasters cleared.

Expected: every action syncs across all four windows within ~1s. No console errors.

- [ ] **Step 2: Run `npm run build`**

Run: `npm run build`
Expected: a successful build with no type errors.

- [ ] **Step 3: Run `npm run lint`**

Run: `npm run lint`
Expected: no errors (warnings acceptable if consistent with the rest of the repo).

- [ ] **Step 4: Final commit (only if any cleanup was needed)**

```bash
git status
# If any cleanup changes:
git add .
git commit -m "chore(code-red): e2e smoke pass fixes"
```

---

## Out of scope (not in this plan, per spec)

- Supabase auth
- "Host" / kick protection
- Clue-word validation against the board
- Turn timer
- In-app chat
- Persistent stats across lobbies
- Mobile-native app
- Sign categories / filters
- Lobby TTL / cleanup cron

## Risks (flagged in spec; no mitigation in v1)

- Cheating via dev tools: `cr_cards.card_type` is publicly readable; operatives can inspect to see colors.
- `order by random() limit 25` on `signs` is fine while the table is small. Revisit with `tablesample` if it grows past ~10k rows.
- Stale lobbies accumulate forever until someone adds a cleanup job.
