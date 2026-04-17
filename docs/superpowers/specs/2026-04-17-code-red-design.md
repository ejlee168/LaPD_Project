# Code Red — Codenames clone, design spec

**Date:** 2026-04-17
**Route:** `/code-red`
**Inspiration:** [bcspragu/Codenames](https://github.com/bcspragu/Codenames) (no AI player)

## Goal

A self-contained multiplayer Codenames clone living at `/code-red`, drawing its 25-card board from a new `signs` table. Players create or join a lobby by short code, pick a team, optionally claim spymaster, and play standard Codenames rules. No accounts; no AI player.

## Decisions (from brainstorming)

| # | Decision |
|---|---|
| 1 | **Identity:** nickname only. A random `player_token` is generated per browser and stored in `localStorage`. No Supabase auth. |
| 2 | **`signs` schema:** `id uuid`, `name text`. (Seeded by user.) |
| 3 | **Realtime sync:** Supabase Realtime `postgres_changes` on game tables + a `presence` channel for online dots. |
| 4 | **Lobby code:** 6-character short code (URL = `/code-red/<CODE>`). |
| 5 | **Clue entry:** required. Spymaster types `word + count`; operatives get `count + 1` guesses or end early. |
| 6 | **Game lifecycle:** manual `Start game` button. `Play again` resets lobby to lobby state, **clearing spymaster roles**, and another `Start game` press is required. |
| 7 | **Presence:** sticky roster + presence dots. Players stay in the roster across disconnects; can `Leave team` or be kicked. |
| 8 | **Devices:** responsive — works equally well on desktop and mobile. |
| 9 | **Spectators:** yes — anyone with the code can watch the operative view. |
| 10 | **Architecture:** normalized tables + `security definer` RPCs for every mutation. |
| 11 | **Spymaster secrecy:** `cr_cards.card_type` is publicly readable; UI hides colors from non-spymasters. Cheating via dev tools is accepted for v1. |
| 12 | **Mid-game spymaster re-election:** allowed (so play can continue if a spymaster disconnects). |
| 13 | **Kicking:** anyone in the lobby can kick anyone else (no host concept in v1). |

## Architecture

- **Stack:** existing Next.js 16 app, React 19, Tailwind v4, shadcn (`base-nova` style), Supabase JS + SSR, Supabase Realtime.
- **State authority:** Postgres. Browsers never write to game tables directly; they call RPCs.
- **Validation:** every game rule is enforced inside the RPC. The client UI mirrors the rules to gray out impossible actions.

## Database schema

All Code Red tables are prefixed `cr_` to avoid colliding with the existing `games` table from migration 001.

```sql
-- Provided by user (seeded later)
create table signs (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

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
  team text,                              -- null | 'red' | 'blue'
  is_spymaster boolean not null default false,
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  unique(lobby_id, player_token)
);

create table cr_games (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references cr_lobbies(id) on delete cascade,
  starting_team text not null,            -- 'red' | 'blue'
  current_team text not null,             -- 'red' | 'blue'
  status text not null default 'in_progress', -- 'in_progress' | 'red_win' | 'blue_win'
  current_clue_word text,
  current_clue_count integer,
  guesses_remaining integer,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create table cr_cards (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references cr_games(id) on delete cascade,
  position integer not null,              -- 0..24
  sign_id uuid not null references signs(id),
  card_type text not null,                -- 'red' | 'blue' | 'neutral' | 'assassin'
  revealed boolean not null default false,
  unique(game_id, position)
);

create table cr_actions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references cr_games(id) on delete cascade,
  player_id uuid references cr_players(id),
  action_type text not null,              -- 'clue' | 'reveal' | 'end_turn' | 'game_end'
  payload jsonb,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_cr_players_lobby on cr_players(lobby_id);
create index idx_cr_games_lobby on cr_games(lobby_id, created_at desc);
create index idx_cr_cards_game on cr_cards(game_id);
create index idx_cr_actions_game on cr_actions(game_id, created_at);
```

### RLS

Every table has RLS enabled. `signs`, `cr_lobbies`, `cr_players`, `cr_games`, `cr_cards`, `cr_actions` all have a single policy: `select` allowed for `anon`. **No insert/update/delete policies** — all mutations route through `security definer` RPCs.

### Realtime publication

```sql
alter publication supabase_realtime
  add table cr_lobbies, cr_players, cr_games, cr_cards, cr_actions;
```

## RPC functions (`security definer`, schema `public`)

Every RPC takes a `player_token` (and usually a `code`) and resolves them to the `cr_players` row internally. All raise sql exceptions on rule violations; the client surfaces them via `sonner` toasts.

### Lobby & roster

| Function | Behavior |
|---|---|
| `cr_create_lobby(p_nickname text, p_player_token text) → text` | Generates unique 6-char code from the alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (excludes `0/O/I/1/L` to avoid misreads); retry on uniqueness collision (cap at 5 attempts then raise). Inserts `cr_lobbies` row with status `lobby`. Inserts creator into `cr_players` as a spectator (team `null`). Returns the code. |
| `cr_join_lobby(p_code text, p_nickname text, p_player_token text) → uuid` | Idempotent. If `(lobby_id, player_token)` exists, updates nickname + `last_seen`. Otherwise inserts new spectator. Returns `cr_players.id`. Errors if lobby missing. |
| `cr_pick_team(p_code text, p_player_token text, p_team text)` | Sets `team` to `'red'`, `'blue'`, or `null`. Clears `is_spymaster` if leaving a team. Allowed in any lobby state. |
| `cr_claim_spymaster(p_code text, p_player_token text)` | Caller must be on a team. `team_size = count(players on team)`. `allowed = team_size >= 5 ? 2 : 1`. Errors if `current_spymasters >= allowed`. Allowed mid-game. |
| `cr_relinquish_spymaster(p_code text, p_player_token text)` | Sets `is_spymaster = false` for caller. |
| `cr_kick_player(p_code text, p_actor_token text, p_target_player_id uuid)` | Actor must be in the lobby. Deletes target's `cr_players` row. |

### Game lifecycle

| Function | Behavior |
|---|---|
| `cr_start_game(p_code text, p_player_token text) → uuid` | Caller must be in lobby. Validate: each team has ≥1 spymaster and ≥1 non-spymaster operative, and `signs` has ≥25 rows. Choose `starting_team` randomly. Insert `cr_games` row (`current_team = starting_team`). Pick 25 random signs (`order by random() limit 25`). Build a 25-element type array with the right counts (9 starting, 8 other, 7 neutral, 1 assassin), shuffle, insert into `cr_cards`. Update lobby status to `in_game`. Returns `game_id`. |
| `cr_play_again(p_code text, p_player_token text)` | Requires latest game's `status != 'in_progress'` (or no game). Sets lobby `status = 'lobby'`. Sets `is_spymaster = false` for all players in the lobby. (Team assignments are preserved.) |

### Turn actions

| Function | Behavior |
|---|---|
| `cr_submit_clue(p_code text, p_player_token text, p_word text, p_count int)` | Caller must be the spymaster of `current_team`. No clue may be currently active. `p_count >= 1`. Sets `current_clue_word`, `current_clue_count`, `guesses_remaining = p_count + 1`. Inserts `cr_actions` row with `action_type = 'clue'`. |
| `cr_reveal_card(p_code text, p_player_token text, p_position int)` | Caller must be a non-spymaster operative on `current_team`. Active clue required. Card not already revealed. Mark revealed; insert `cr_actions` row with `action_type = 'reveal'`. Branch on `card_type` (see "Reveal resolution" below). |
| `cr_end_turn(p_code text, p_player_token text)` | Caller must be a non-spymaster operative on `current_team`. Switch turn (flip `current_team`, clear clue + guesses). Insert `cr_actions` row. |

### Reveal resolution (inside `cr_reveal_card`)

1. **Assassin** → other team wins. Set `cr_games.status = '<other>_win'`, `ended_at = now()`. Insert `cr_actions(action_type='game_end', payload={reason:'assassin'})`. Set lobby `status = 'finished'`.
2. **Other team's color** → switch turn (flip `current_team`, clear clue + guesses).
3. **Neutral** → switch turn.
4. **Own color** →
   - If all cards of own color now revealed (count = 9 if own = starting, else 8): own team wins. Set status, `ended_at`, lobby `finished`, log `game_end`.
   - Else `guesses_remaining -= 1`. If `guesses_remaining = 0` → switch turn.

## Routes & components

```
app/code-red/
  page.tsx                       — landing: nickname + create/join card
  [code]/
    page.tsx                     — server component, hydrates lobby + (if any) latest game
    lobby-room.tsx               — client root, picks Lobby vs Game view by status

components/code-red/
  team-panel.tsx                 — one team's roster + join/spymaster controls
  spectator-list.tsx
  game-board.tsx                 — 5×5 grid; spymaster vs operative view
  game-card.tsx                  — single card; renders revealed/hidden, color tint for spymaster
  clue-form.tsx                  — current spymaster's clue input
  turn-banner.tsx                — current team, active clue, guesses remaining
  action-log.tsx                 — list of clues/reveals/end-turn
  lobby-header.tsx               — code + copy/share + leave-lobby

lib/code-red/
  client.ts                      — typed RPC wrappers (calls supabase.rpc)
  player-token.ts                — get-or-create the localStorage token
  realtime.ts                    — subscribe helpers (per-table)
  types.ts                       — Lobby, Player, Game, Card, Action
  rules.ts                       — pure helpers (canStart, canClaimSpymaster, etc.) for UI gating
```

### Page state machine

`/code-red/[code]` renders one of two views based on `cr_lobbies.status`:

- **`lobby` or `finished`** → Lobby room (red panel, blue panel, spectator list, optional "previous game result" banner if `finished`, "Start game" button).
- **`in_game`** → Game board (5×5 grid + clue form/turn banner + action log + roster sidebar with leave/kick).

A Realtime subscription on `cr_lobbies` triggers the transition between views without a page reload.

## Realtime subscriptions

Every page mount opens one Supabase Realtime client and subscribes:

| Channel / table | Filter | Client reaction |
|---|---|---|
| `cr_lobbies` (postgres_changes) | `id=eq.<lobby_id>` | Update lobby status; toggle Lobby ↔ Game view. |
| `cr_players` (postgres_changes) | `lobby_id=eq.<lobby_id>` | Re-render team rosters + spectator list. |
| `cr_games` (postgres_changes) | `lobby_id=eq.<lobby_id>` | On insert: fetch full board (cards). On update: refresh turn/clue/guesses; if `status` changed → end-game UI. |
| `cr_cards` (postgres_changes) | `game_id=eq.<game_id>` | Flip individual cards as they're revealed. |
| `cr_actions` (postgres_changes) | `game_id=eq.<game_id>` | Append to action log. |
| `presence` channel `lobby:<code>` | — | Track `{player_token, nickname}`; render online dot in roster. |

Initial board fetch: when the client sees a new `cr_games` row (or on first load when `status='in_game'`), it does one `select` on `cr_cards` for that `game_id` to populate the grid. Subsequent reveals come via `cr_cards` postgres_changes.

## UI specifics

- **Visual style:** shadcn `base-nova`, neutral base, dark/light via `next-themes` (already wired). Red team = red-500/600 family; blue team = blue-500/600 family. Cards use `Card` component; team panels use `Card` headers. `FadeIn` for view transitions.
- **Mobile:** 5×5 grid uses CSS grid with `aspect-ratio: 4/3` cards and `clamp()` for font size; on `<sm` the action log + roster collapse into a `Drawer`.
- **Toasts:** `sonner` for RPC errors and big events ("Red team wins!", "Player kicked").
- **Copy lobby code:** click the code in the header to copy to clipboard (toast: "Code copied").
- **Spymaster view:** unrevealed cards show a faint colored border + filled background tint. Operative view: unrevealed cards are neutral. Revealed cards (any view): tinted background + the sign name struck through.
- **Card click affordance:** disabled state is grayscale + `cursor-not-allowed`. Active operatives see hover lift.

## Pure helpers (`lib/code-red/rules.ts`)

These mirror the server rules so the UI can disable buttons before sending an RPC:

```ts
canPickTeam(state, playerId, team)
canClaimSpymaster(state, playerId)         // checks team membership + cap
canStartGame(state)                        // ≥1 spymaster + ≥1 operative on each team
isYourTurnToClue(state, playerId)
isYourTurnToGuess(state, playerId)
guessesRemaining(state)
```

## Migrations

- `003_signs.sql` — create `signs` table (no seed; user seeds separately).
- `004_code_red.sql` — all `cr_*` tables, indexes, RLS, realtime publication.
- `005_code_red_rpcs.sql` — all RPC functions.

## Scope (v1) — what we are NOT doing

- No Supabase auth (anonymous nickname only).
- No "host" / kick-protection (anyone can kick).
- No clue-word validation against the board.
- No timer / time pressure.
- No chat (Discord assumption).
- No persistent player profiles or stats across lobbies.
- No mobile app — responsive web only.
- No category filters on `signs` (random 25 from the whole table).

## Risks & open follow-ups

- **`order by random() limit 25` on `signs`** is fine while `signs` is small. If it grows past ~10k rows, swap to a `tablesample` strategy.
- **Cheating via dev tools** is accepted for v1 (per Decision 11). Mitigation if it becomes a problem: hide `card_type` server-side and require an RPC to fetch the spymaster view.
- **Cleanup of stale lobbies** is out of scope. Add a cron job later if the table grows.
