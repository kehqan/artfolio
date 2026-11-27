-- Admin → Home page: the "Meanwhile, your art is out there." section is
-- edited by hand. Safe to run more than once.
--
-- 1. site_content: one row per editable section, the words as JSON.
--    Everyone may read it (it is what the home page shows); only admins write.
-- 2. campaign_slides.caption: the small label on each photo ("You, Saturday 9 pm").
--    The old text/quote position columns stay but nothing reads them any more.

create table if not exists public.site_content (
  key         text primary key check (key ~ '^[a-z0-9_]{1,40}$'),
  value       jsonb not null default '{}'::jsonb check (pg_column_size(value) < 20000),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null
);

alter table public.site_content enable row level security;

drop policy if exists "Site content is public" on public.site_content;
create policy "Site content is public" on public.site_content
  for select using (true);

drop policy if exists "Admins edit site content" on public.site_content;
create policy "Admins edit site content" on public.site_content
  for all using (public.is_admin()) with check (public.is_admin());

revoke all on public.site_content from anon, authenticated;
grant select on public.site_content to anon, authenticated;
grant insert, update, delete on public.site_content to authenticated;

-- Stamp who saved and when, whatever the browser sends.
create or replace function public.site_content_stamp() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

drop trigger if exists site_content_stamp on public.site_content;
create trigger site_content_stamp before insert or update on public.site_content
  for each row execute function public.site_content_stamp();

-- Start from what the home page shows today, so nothing changes until edited.
insert into public.site_content (key, value) values ('home_meanwhile', jsonb_build_object(
  'headline', 'Meanwhile, your art is out there.',
  'text', '',
  'cards', jsonb_build_array(
    jsonb_build_object('image_url', '/demo/window-seat.jpg', 'text', '**Window Seat** is on the wall at a café in Žižkov'),
    jsonb_build_object('badge', '12', 'text', 'people scanned its wall label this week'),
    jsonb_build_object('image_url', '/demo/tram-22.jpg', 'text', 'Someone tapped **Buy** on **Tram 22**')
  )
)) on conflict (key) do nothing;

alter table public.campaign_slides add column if not exists caption text
  check (caption is null or char_length(caption) <= 40);

-- Photos already up keep the label they show today.
update public.campaign_slides set caption = 'You, Saturday 9 pm' where caption is null;
