-- signs table (Code Red uses random rows from here to build its 25-card board)
create table signs (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

alter table signs enable row level security;

create policy "Anyone can read signs"
  on signs for select using (true);
