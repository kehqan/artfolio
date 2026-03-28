import { ArrowRight } from "lucide-react";
import { Button } from "./components/ui/button";

export default function App() {
  return (
    <div className="min-h-screen bg-[#FFD400] relative overflow-hidden">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-6 flex items-center justify-between">
        <div className="text-2xl font-bold text-black">Artfolio</div>
        <div className="hidden md:flex items-center gap-8">
          <a href="#about" className="text-black hover:opacity-70 transition-opacity">
            About
          </a>
          <a href="#explore" className="text-black hover:opacity-70 transition-opacity">
            Explore
          </a>
          <a href="#features" className="text-black hover:opacity-70 transition-opacity">
            Features
          </a>
          <a href="#contact" className="text-black hover:opacity-70 transition-opacity">
            Contact
          </a>
        </div>
        <Button className="bg-black text-[#FFD400] hover:bg-black/90 px-6">
          Dashboard
        </Button>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-6 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            {/* Eyebrow */}
            <div className="flex items-center gap-2 text-black/70 tracking-wider text-sm font-medium">
              <span>ART</span>
              <span>·</span>
              <span>COMMUNITY</span>
              <span>·</span>
              <span>DISCOVERY</span>
            </div>

            {/* Main Headline */}
            <div className="space-y-4">
              <div className="inline-block border-4 border-black bg-white px-8 py-4">
                <h1 className="text-6xl lg:text-7xl font-bold text-black tracking-tight">
                  artist
                </h1>
              </div>
              <div className="inline-block border-4 border-black bg-white px-8 py-4">
                <h1 className="text-6xl lg:text-7xl font-bold text-black tracking-tight">
                  + venue
                </h1>
              </div>
            </div>

            {/* Description */}
            <p className="text-black text-lg lg:text-xl max-w-md leading-relaxed">
              A platform where local artists meet venues. Showcase work. Fill
              walls. Build community.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button className="bg-black text-[#FFD400] hover:bg-black/90 px-8 py-6 text-lg group">
                Get started – it's free
                <ArrowRight className="ml-2 size-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>

            <div>
              <a
                href="#explore"
                className="text-black hover:opacity-70 transition-opacity inline-flex items-center gap-2 group"
              >
                Or explore without signing up
                <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>

          {/* Right Content - Visual Elements */}
          <div className="hidden lg:block relative">
            <div className="space-y-6">
              {/* Large Rectangle */}
              <div className="ml-auto w-3/4 h-48 border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" />
              
              {/* Medium Rectangle */}
              <div className="w-2/3 h-40 border-4 border-black bg-[#FFF9E6] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" />
              
              {/* Small Rectangle */}
              <div className="ml-auto w-1/2 h-32 border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" />
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-1/2 right-0 w-32 h-32 border-4 border-black/10 rounded-full -translate-y-1/2 translate-x-16" />
      <div className="absolute bottom-10 left-10 w-24 h-24 border-4 border-black/10" />
    </div>
  );
}
