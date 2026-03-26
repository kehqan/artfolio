"use client";
import { Search, LayoutGrid, List, Table2 } from "lucide-react";

interface FiltersProps {
  currentStatus: string;
  currentSearch: string;
  currentView: string;
  counts: Record<string, number>;
  onStatusChange: (status: string) => void;
  onSearchChange: (search: string) => void;
  onViewChange: (view: string) => void;
}

const tabs = [
  { value: "all", label: "All" },
  { value: "available", label: "Available" },
  { value: "sold", label: "Sold" },
  { value: "not_for_sale", label: "Not for Sale" },
  { value: "reserved", label: "Reserved" },
];

export default function ArtworkFilters({ currentStatus, currentSearch, currentView, counts, onStatusChange, onSearchChange, onViewChange }: FiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex flex-wrap gap-1.5">
        {tabs.map((tab) => (
          <button key={tab.value} onClick={() => onStatusChange(tab.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              currentStatus === tab.value ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            }`}>
            {tab.label} <span className="ml-1 opacity-60">{counts[tab.value] || 0}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={currentSearch} onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search artworks..." className="input-field pl-9 pr-4 w-56 !py-1.5" />
        </div>
        <div className="flex bg-white border border-slate-200 rounded-md overflow-hidden">
          {[
            { v: "table", icon: Table2 },
            { v: "grid", icon: LayoutGrid },
            { v: "list", icon: List },
          ].map(({ v, icon: Icon }) => (
            <button key={v} onClick={() => onViewChange(v)}
              className={`p-1.5 transition-colors ${currentView === v ? "bg-slate-100 text-slate-700" : "text-slate-400 hover:text-slate-600"}`}>
              <Icon size={15} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
