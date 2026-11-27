// The old campaign editor. Its photos now live in Admin → Home page.
import { redirect } from "next/navigation";

export default function CampaignAdminPage() {
  redirect("/admin/home");
}
