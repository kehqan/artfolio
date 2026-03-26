"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-150">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
            <span className="font-display text-white text-sm font-semibold leading-none">A</span>
          </div>
          <span className="font-display text-xl text-slate-900 font-medium">Artfolio</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          <Link href="/features" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Features</Link>
          <Link href="/about" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">About</Link>
          <div className="w-px h-5 bg-slate-200" />
          <Link href="/login" className="text-sm text-slate-700 hover:text-slate-900 transition-colors font-medium">Log in</Link>
          <Link href="/register" className="btn-primary text-xs !py-2 !px-4">Get Started</Link>
        </div>
        <button onClick={() => setOpen(!open)} className="md:hidden text-slate-500">{open ? <X size={22} /> : <Menu size={22} />}</button>
      </div>
      {open && (
        <div className="md:hidden border-t border-slate-150 bg-white p-6 flex flex-col gap-4">
          <Link href="/features" onClick={() => setOpen(false)} className="text-slate-600">Features</Link>
          <Link href="/about" onClick={() => setOpen(false)} className="text-slate-600">About</Link>
          <Link href="/login" onClick={() => setOpen(false)} className="text-slate-700 font-medium">Log in</Link>
          <Link href="/register" onClick={() => setOpen(false)} className="btn-primary text-center">Get Started</Link>
        </div>
      )}
    </nav>
  );
}
