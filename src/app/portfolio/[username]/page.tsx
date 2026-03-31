import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";

export default async function PortfolioRedirectPage({
  params,
}: {
  params: { username: string };
}) {
  const supabase = createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("username", params.username)
    .single();

  if (!profile) notFound();

  redirect(`/profile/${params.username}`);
}
