-- Artomango: keep private artwork details private.
-- Run once in the Supabase SQL editor, after the PR that adds
-- src/lib/artwork-private.ts is live. Safe to run again.
--
-- The artworks table is public (it has to be, for public pages, Explore and
-- /available), so every column could be read by anyone, including private
-- notes, materials cost, hours spent and the link to a digital original.
-- This moves those four into their own table that only the owner can read.

-- 1. The private table.
create table if not exists public.artwork_private (
  artwork_id uuid primary key references public.artworks (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  notes text check (char_length(notes) <= 10000),
  materials_cost numeric,
  time_spent numeric,
  digital_file_url text check (char_length(digital_file_url) <= 2000),
  updated_at timestamptz not null default now()
);

alter table public.artwork_private enable row level security;

drop policy if exists "Owners manage their private artwork details" on public.artwork_private;
create policy "Owners manage their private artwork details" on public.artwork_private
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.artworks a where a.id = artwork_id and a.user_id = auth.uid())
  );

-- 2. Copy what's there today (only runs while the old columns still exist).
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'artworks' and column_name = 'materials_cost') then
    insert into public.artwork_private (artwork_id, user_id, notes, materials_cost, time_spent, digital_file_url)
    select id, user_id, notes, materials_cost, time_spent, digital_file_url
    from public.artworks
    where user_id is not null
      and (notes is not null or materials_cost is not null or time_spent is not null or digital_file_url is not null)
    on conflict (artwork_id) do nothing;
  end if;
end $$;

-- 3. Remove them from the public table.
alter table public.artworks
  drop column if exists notes,
  drop column if exists materials_cost,
  drop column if exists time_spent,
  drop column if exists digital_file_url;

-- Check: should show 0.
select count(*) as private_columns_left_on_artworks
from information_schema.columns
where table_schema = 'public' and table_name = 'artworks'
  and column_name in ('notes', 'materials_cost', 'time_spent', 'digital_file_url');
