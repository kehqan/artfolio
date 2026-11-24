import { redirect } from "next/navigation";

// Moodboards now live on your public page settings.
export default function Page() {
  redirect("/dashboard/mystore?tab=moodboards");
}
