"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { Search, LayoutGrid, List } from "lucide-react";

interface FiltersProps {
  currentStatus: string;
  currentSearch: string;
  currentView: string;
  counts: Record<string, number>;
}

const tabs = [
  { value: "all", label: "All" },
  { value: "available", label: "Available" },
  { value: "sold", label: "Sold" },
  { value: "not_for_sale", label: "Not for Sale" },
  { value: "reserved", label: "Reserved" },
];

export default function ArtworkFilters({
  currentStatus,
  currentSearch,
  currentView,
  counts,
}: FiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(currentSearch);

  function updateParams(key: string, value: string) {
    const params = new URLSearchParams();
    if (key === "status") {
      if (value !== "all") params.set("status", value);
      if (currentSearch) params.set("search", currentSearch);
    } else if (key === "search") {
      if (currentStatus !== "all") params.set("status", currentStatus);
      if (value) params.set("search", value);
    } else if (key === "view") {
      if (currentStatus !== "all") params.set("status", currentStatus);
      if (currentSearch) params.set("search", currentSearch);
      if (value !== "grid") params.set("view", value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => updateParams("status", tab.value)}
            className={`px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              currentStatus === tab.value
                ? "bg-accent-500/10 text-accent-400 border border-accent-500/30"
                : "text-canvas-500 border border-canvas-800/40 hover:border-canvas-600 hover:text-canvas-300"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-[10px] opacity-60">
              {counts[tab.value] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Search & View Toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-canvas-600"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") updateParams("search", search);
            }}
            onBlur={() => updateParams("search", search)}
            placeholder="Search artworks..."
            className="w-full pl-9 pr-4 py-2 bg-canvas-900/50 border border-canvas-800/60 text-canvas-200 placeholder:text-canvas-600 text-sm focus:outline-none focus:border-accent-500/50 transition-all"
          />
        </div>
        <div className="flex border border-canvas-800/40">
          <button
            onClick={() => updateParams("view", "grid")}
            className={`p-2 transition-colors ${
              currentView === "grid"
                ? "bg-accent-500/10 text-accent-400"
                : "text-canvas-600 hover:text-canvas-300"
            }`}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => updateParams("view", "list")}
            className={`p-2 border-l border-canvas-800/40 transition-colors ${
              currentView === "list"
                ? "bg-accent-500/10 text-accent-400"
                : "text-canvas-600 hover:text-canvas-300"
            }`}
          >
            <List size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
