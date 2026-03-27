import { createClient } from "@/lib/supabase/server";
import { ShieldCheck, Users, Image, BarChart3 } from "lucide-react";

export default async function AdminPage() {
  const supabase = createClient();
  const [
    { count: userCount },
    { count: artworkCount },
    { count: postCount },
    { count: saleCount },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("artworks").select("*", { count: "exact", head: true }),
    supabase.from("posts").select("*", { count: "exact", head: true }),
    supabase.from("sales").select("*", { count: "exact", head: true }),
  ]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="page-title">Admin Panel</h1>
          <p className="page-subtitle">Platform overview and management</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Users", value: userCount ?? 0, icon: Users },
          { label: "Total Artworks", value: artworkCount ?? 0, icon: Image },
          { label: "Total Posts", value: postCount ?? 0, icon: BarChart3 },
          { label: "Total Sales", value: saleCount ?? 0, icon: BarChart3 },
        ].map((s) => (
          <div key={s.label} className="card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center">
              <s.icon className="w-5 h-5 text-stone-600" />
            </div>
            <div>
              <p className="text-2xl font-display font-semibold">{s.value}</p>
              <p className="text-xs text-stone-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-6 max-w-lg">
        <h2 className="heading-sm mb-3">Platform Status</h2>
        <div className="space-y-2">
          {[
            { label: "Authentication", status: "Active" },
            { label: "Image Storage", status: "Active" },
            { label: "Database", status: "Active" },
            { label: "Social Feed", status: "Active" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
              <span className="text-sm text-stone-600">{item.label}</span>
              <span className="badge-available">{item.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
