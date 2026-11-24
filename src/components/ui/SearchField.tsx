"use client";

import { Search, X } from "lucide-react";
import { cn } from "./cn";

export interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

export function SearchField({ value, onChange, placeholder = "Search…", label, className }: SearchFieldProps) {
  return (
    <div
      className={cn(
        "flex h-10 items-center gap-2 rounded-control border-hair border-line-strong bg-surface px-3",
        "transition-[border-color,box-shadow] duration-fast hover:border-n-400 focus-within:border-ink focus-within:shadow-hard-1",
        className,
      )}
    >
      <Search size={16} aria-hidden className="shrink-0 text-fg-3" />
      <input
        type="search"
        aria-label={label ?? placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent font-ui text-control text-fg outline-none placeholder:text-fg-3 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => onChange("")} className="grid place-items-center text-fg-3 hover:text-fg">
          <X size={15} aria-hidden />
        </button>
      )}
    </div>
  );
}
