import { redirect } from "next/navigation";

// This page is now part of the Scene feed.
export default function Page() {
  redirect("/dashboard/scene?show=show");
}
