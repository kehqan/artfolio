import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-150 bg-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8">
          <div>
            <Link href="/" className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center"><span className="font-display text-white text-xs font-semibold">A</span></div>
              <span className="font-display text-lg text-slate-900 font-medium">Artfolio</span>
            </Link>
            <p className="text-sm text-slate-500 leading-relaxed">The platform for artists and galleries to manage, showcase, and connect.</p>
          </div>
          <div><h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400 mb-3">Platform</h4>
            <div className="flex flex-col gap-2">
              <Link href="/features" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">Features</Link>
              <Link href="/about" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">About</Link>
              <Link href="/register" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">Get Started</Link>
            </div></div>
          <div><h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400 mb-3">For Artists</h4>
            <div className="flex flex-col gap-2"><span className="text-sm text-slate-500">Portfolio Builder</span><span className="text-sm text-slate-500">Artwork Inventory</span><span className="text-sm text-slate-500">Sales Tracking</span></div></div>
          <div><h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400 mb-3">For Galleries</h4>
            <div className="flex flex-col gap-2"><span className="text-sm text-slate-500">Exhibition Management</span><span className="text-sm text-slate-500">Artist Roster</span><span className="text-sm text-slate-500">Commission Tracking</span></div></div>
        </div>
        <div className="mt-12 pt-6 border-t border-slate-150 flex justify-between items-center">
          <p className="text-xs text-slate-400">&copy; {new Date().getFullYear()} Artfolio. All rights reserved.</p>
          <div className="flex gap-6"><span className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">Privacy</span><span className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">Terms</span></div>
        </div>
      </div>
    </footer>
  );
}
