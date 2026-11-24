import { redirect } from "next/navigation";

// The calendar is now the Month view of the Planner.
export default function Page() {
  redirect("/dashboard/tasks?view=month");
}
