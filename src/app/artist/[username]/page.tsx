import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";

export default async function ArtistRedirectPage({
  params,
}: {
  params: { username: string };
}) {
  const supabase = createClient();

  // Check profiles table first (modern accounts like kasra)
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("username", params.username)
    .single();

  if (profile) {
    redirect(`/profile/${params.username}`);
  }

  // Check legacy artists table (old accounts like lenamora)
  const { data: artist } = await supabase
    .from("artists")
    .select("username")
    .eq("username", params.username)
    .single();

  if (artist) {
    redirect(`/explore`);
  }

  notFound();
}
```
