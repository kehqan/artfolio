import { redirect } from "next/navigation";

// The totals that lived here now sit at the top of Sales.
export default function Page() {
  redirect("/dashboard/sales");
}
