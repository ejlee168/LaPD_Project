-- Storage bucket for clue images
insert into storage.buckets (id, name, public)
values ('clue-images', 'clue-images', true)
on conflict (id) do nothing;

create policy "Anyone can read clue images"
  on storage.objects for select
  using (bucket_id = 'clue-images');

create policy "Anyone can upload clue images"
  on storage.objects for insert
  with check (bucket_id = 'clue-images');
