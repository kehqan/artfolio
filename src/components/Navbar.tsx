"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Features", href: "/features" },
  { label: "About", href: "/about" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-canvas-950/80 backdrop-blur-xl border-b border-canvas-800/40">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-accent-500 flex items-center justify-center">
            <span className="font-display text-canvas-950 text-lg leading-none">
              A
            </span>
          </div>
          <span className="font-display text-xl text-canvas-50 group-hover:text-accent-400 transition-colors">
            Artfolio
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-canvas-400 hover:text-canvas-50 transition-colors tracking-wide"
            >
              {link.label}
            </Link>
          ))}
          <div className="w-px h-5 bg-canvas-700" />
          <Link
            href="/login"
            className="text-sm text-canvas-300 hover:text-canvas-50 transition-colors tracking-wide"
          >
            Log in
          </Link>
          <Link href="/register" className="btn-primary !py-2.5 !px-5 text-xs">
            Join Free
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden text-canvas-300 hover:text-canvas-50"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden border-t border-canvas-800/40 bg-canvas-950/95 backdrop-blur-xl">
          <div className="px-6 py-6 flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-canvas-300 hover:text-canvas-50 transition-colors py-1"
              >
                {link.label}
              </Link>
            ))}
            <div className="h-px bg-canvas-800 my-2" />
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="text-canvas-300 hover:text-canvas-50 transition-colors py-1"
            >
              Log in
            </Link>
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              className="btn-primary text-center mt-2"
            >
              Join Free
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
