import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import ArtworkForm from "@/components/artworks/ArtworkForm";

interface Props {
  params: { id: string };
}

export default async function EditArtworkPage({ params }: Props) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: artwork } = await supabase
    .from("artworks")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!artwork) notFound();

  const formData = {
    id: artwork.id,
    title: artwork.title || "",
    description: artwork.description || "",
    year: artwork.year?.toString() || "",
    medium: artwork.medium || "",
    width_cm: artwork.width_cm?.toString() || "",
    height_cm: artwork.height_cm?.toString() || "",
    depth_cm: artwork.depth_cm?.toString() || "",
    price: artwork.price?.toString() || "",
    currency: artwork.currency || "USD",
    status: artwork.status || "available",
    location: artwork.location || "",
    notes: artwork.notes || "",
    images: artwork.images || [],
  };

  return (
    <div className="max-w-3xl">
      <ArtworkForm artwork={formData} isEditing />
    </div>
  );
}
