-- Diagnoses table (autocomplete list)
create table diagnoses (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

-- Games table
create table games (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  answer_id uuid not null references diagnoses(id),
  clues jsonb not null,
  created_at timestamptz not null default now()
);

-- Anki packs table
create table anki_packs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  file_path text not null,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_games_created_at on games(created_at desc);
create index idx_diagnoses_name on diagnoses(name);

-- RLS policies
alter table diagnoses enable row level security;
alter table games enable row level security;
alter table anki_packs enable row level security;

create policy "Anyone can read diagnoses"
  on diagnoses for select using (true);

create policy "Anyone can read games"
  on games for select using (true);

create policy "Anyone can insert games"
  on games for insert with check (true);

create policy "Anyone can read anki_packs"
  on anki_packs for select using (true);

-- Storage bucket for Anki packs
insert into storage.buckets (id, name, public)
values ('anki-packs', 'anki-packs', true)
on conflict (id) do nothing;

create policy "Anyone can read anki files"
  on storage.objects for select
  using (bucket_id = 'anki-packs');

-- Seed some diagnoses for autocomplete
insert into diagnoses (name) values
  ('Acute Myocardial Infarction'),
  ('Pulmonary Embolism'),
  ('Pneumonia'),
  ('Congestive Heart Failure'),
  ('Aortic Dissection'),
  ('Pneumothorax'),
  ('Pericarditis'),
  ('GERD'),
  ('Costochondritis'),
  ('Panic Disorder'),
  ('Asthma Exacerbation'),
  ('COPD Exacerbation'),
  ('Acute Appendicitis'),
  ('Cholecystitis'),
  ('Pancreatitis'),
  ('Meningitis'),
  ('Stroke'),
  ('Diabetic Ketoacidosis'),
  ('Sepsis'),
  ('Anaphylaxis');
