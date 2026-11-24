import { redirect } from "next/navigation";

// Shows now open and edit from the Scene feed.
export default function Page() {
  redirect("/dashboard/scene?show=show");
}
