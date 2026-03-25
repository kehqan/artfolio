import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-canvas-800/40 bg-canvas-950">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 bg-accent-500 flex items-center justify-center">
                <span className="font-display text-canvas-950 text-base leading-none">
                  A
                </span>
              </div>
              <span className="font-display text-lg text-canvas-50">
                Artfolio
              </span>
            </Link>
            <p className="text-sm text-canvas-500 leading-relaxed">
              The platform where artists and galleries manage, showcase, and
              connect.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-canvas-400 mb-4">
              Platform
            </h4>
            <div className="flex flex-col gap-2.5">
              <Link
                href="/features"
                className="text-sm text-canvas-500 hover:text-canvas-200 transition-colors"
              >
                Features
              </Link>
              <Link
                href="/about"
                className="text-sm text-canvas-500 hover:text-canvas-200 transition-colors"
              >
                About
              </Link>
              <Link
                href="/register"
                className="text-sm text-canvas-500 hover:text-canvas-200 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>

          {/* For Artists */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-canvas-400 mb-4">
              For Artists
            </h4>
            <div className="flex flex-col gap-2.5">
              <span className="text-sm text-canvas-500">
                Portfolio Builder
              </span>
              <span className="text-sm text-canvas-500">
                Artwork Inventory
              </span>
              <span className="text-sm text-canvas-500">Collections</span>
            </div>
          </div>

          {/* For Galleries */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-canvas-400 mb-4">
              For Galleries
            </h4>
            <div className="flex flex-col gap-2.5">
              <span className="text-sm text-canvas-500">
                Exhibition Management
              </span>
              <span className="text-sm text-canvas-500">Artist Roster</span>
              <span className="text-sm text-canvas-500">Sales Tracking</span>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-canvas-800/40 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-canvas-600">
            &copy; {new Date().getFullYear()} Artfolio. All rights reserved.
          </p>
          <div className="flex gap-6">
            <span className="text-xs text-canvas-600 hover:text-canvas-400 cursor-pointer transition-colors">
              Privacy
            </span>
            <span className="text-xs text-canvas-600 hover:text-canvas-400 cursor-pointer transition-colors">
              Terms
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
