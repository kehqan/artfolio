-- Artomango: clean usernames for new accounts.
-- Run once in the Supabase SQL editor. Safe to run again.
--
-- New accounts got a username made from their name with only the spaces
-- removed, so "Café Lounge" became "cafélounge1234" and "Kika's Gallery"
-- became "kika'sgallery3612". Those addresses break or look odd in links.
-- Now a username is only a-z, 0-9 and _, with accents turned into letters.

create or replace function public.username_from(p_text text)
returns text language sql immutable as $$
  select coalesce(nullif(left(regexp_replace(
    translate(lower(coalesce(p_text, '')),
      'áàâäãåāăąçćčďéèêëēėęěíìîïīįłñńňóòôöõøōőřšśťúùûüūůűųýÿžźż',
      'aaaaaaaaacccdeeeeeeeeiiiiiilnnnoooooooorsstuuuuuuuuyyzzz'),
    '[^a-z0-9]+', '', 'g'), 24), ''), 'artist');
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  requested text := new.raw_user_meta_data->>'role';
  base text := public.username_from(coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)));
  candidate text;
  tries int := 0;
begin
  loop
    candidate := base || floor(random() * 10000)::text;
    exit when not exists (select 1 from public.profiles where username = candidate) or tries > 20;
    tries := tries + 1;
  end loop;

  insert into public.profiles (id, email, full_name, role, username)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case when requested in ('artist', 'gallery', 'venue') then requested else 'artist' end,
    candidate
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Optional: also clean the usernames that already have odd characters.
-- This changes those people's public address (artomango.com/<username>),
-- so old links to them stop working. Remove the two dashes to run it.
-- update public.profiles
--   set username = public.username_from(username) || floor(random() * 10000)::text
--   where username !~ '^[a-z0-9_]+$';
