import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Image, FolderOpen, Globe, MessageSquare, Calendar, DollarSign, Users, ArrowRight, Palette, Building2, Sparkles, Shield, Zap, CheckCircle2 } from "lucide-react";

function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center bg-gradient-to-b from-slate-50 to-white overflow-hidden">
      <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-brand-50 rounded-full blur-3xl opacity-50" />
      <div className="relative max-w-7xl mx-auto px-6 pt-32 pb-20 w-full">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-50 border border-brand-200 rounded-full text-xs font-medium text-brand-700 mb-6">
            <Sparkles size={12} /> For Artists & Galleries
          </span>
          <h1 className="heading-xl">The professional way to <span className="text-brand-600">manage your art</span></h1>
          <p className="text-lg text-slate-500 mt-6 max-w-xl leading-relaxed">
            Inventory management, portfolio builder, exhibition planning, sales tracking, and community — all in one platform designed for the art world.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Link href="/register" className="btn-primary !py-3 !px-6"><Palette size={18} /> Join as Artist</Link>
            <Link href="/register" className="btn-secondary !py-3 !px-6"><Building2 size={18} /> Join as Gallery</Link>
          </div>
          <p className="text-xs text-slate-400 mt-4">Free to start · No credit card required</p>
        </div>
      </div>
    </section>
  );
}

const features = [
  { icon: Image, title: "Artwork Inventory", desc: "Professional catalog with images, dimensions, medium, price, status tracking — like Airtable for art." },
  { icon: FolderOpen, title: "Collections", desc: "Group artworks for exhibitions, series, or portfolios with flexible organization." },
  { icon: Globe, title: "Public Portfolio", desc: "Gallery-quality web presence with your own shareable URL." },
  { icon: Calendar, title: "Exhibition Management", desc: "Plan shows with timelines, artwork selection, and venue details." },
  { icon: DollarSign, title: "Sales Tracking", desc: "Revenue, commissions, and buyer history with exportable reports." },
  { icon: Users, title: "Community", desc: "Follow artists and galleries, share updates, discover new talent." },
];

function FeaturesGrid() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="section-label">Features</span>
          <h2 className="heading-lg mt-3">Everything you need to <span className="text-brand-600">thrive</span></h2>
          <p className="text-slate-500 mt-4">Every feature designed specifically for artists and galleries.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="card p-6 hover:shadow-card-hover transition-shadow group">
              <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center mb-4">
                <f.icon size={20} className="text-brand-600" strokeWidth={1.5} />
              </div>
              <h3 className="font-display text-lg text-slate-800 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-24 bg-slate-900">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="font-display text-3xl md:text-4xl text-white leading-tight">Your art career <span className="text-brand-400">starts here</span></h2>
        <p className="text-slate-400 mt-4">Join Artfolio today and give your artwork the professional home it deserves.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link href="/register" className="btn-brand !py-3 !px-6">Create Your Account <ArrowRight size={16} /></Link>
          <Link href="/features" className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-slate-700 text-slate-300 font-medium text-sm rounded-md hover:bg-slate-800 transition-all">Explore Features</Link>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (<><Navbar /><main><Hero /><FeaturesGrid /><CTA /></main><Footer /></>);
}
