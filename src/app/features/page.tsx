import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import {
  Image,
  FolderOpen,
  Globe,
  MessageSquare,
  LayoutGrid,
  Users,
  BarChart3,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const phases = [
  {
    icon: Image,
    status: "live" as const,
    title: "Artwork Inventory",
    tagline: "Your complete artwork database",
    description:
      "Catalog every piece you create or manage. Track title, dimensions, medium, year, price, status, location, and more. Upload multiple images. Add private notes. Know exactly what you have and where it is.",
    highlights: [
      "Full artwork details & metadata",
      "Multiple image uploads",
      "Status tracking (Available, Sold, Not for Sale)",
      "Private notes & location",
    ],
  },
  {
    icon: FolderOpen,
    status: "live" as const,
    title: "Collections",
    tagline: "Organize your body of work",
    description:
      "Group artworks into meaningful collections — exhibition sets, thematic series, chronological bodies of work, or curated selections for specific clients.",
    highlights: [
      "Flexible grouping system",
      "Use for exhibitions & portfolios",
      "Artwork series organization",
      "Drag & drop ordering",
    ],
  },
  {
    icon: Globe,
    status: "live" as const,
    title: "Public Portfolio",
    tagline: "Your gallery-quality web presence",
    description:
      "A beautiful, professional portfolio page at artfolio.com/your-name. Show your artwork grid, collections, bio, and contact information. Looks stunning on every device.",
    highlights: [
      "Custom portfolio URL",
      "Responsive artwork grid",
      "Collection showcases",
      "Contact information",
    ],
  },
  {
    icon: MessageSquare,
    status: "live" as const,
    title: "Social Feed",
    tagline: "Connect with the art community",
    description:
      "Share updates, studio shots, works in progress, exhibition announcements, and more. Follow artists and galleries. Build your network in the art world.",
    highlights: [
      "Image & text posts",
      "Community timeline",
      "Profile discovery",
      "Creative updates",
    ],
  },
  {
    icon: LayoutGrid,
    status: "coming" as const,
    title: "Exhibition Management",
    tagline: "Plan and manage shows",
    description:
      "Organize exhibitions with timelines, selected artworks, venue details, and opening dates. Perfect for galleries managing multiple shows and artists tracking their exhibition history.",
    highlights: [
      "Exhibition timelines",
      "Artwork selection per show",
      "Venue & date management",
      "Exhibition archive",
    ],
  },
  {
    icon: BarChart3,
    status: "coming" as const,
    title: "Sales Tracking",
    tagline: "Know your business",
    description:
      "Track sales, commissions, and revenue. See which artworks sold, when, and for how much. Generate reports for tax season and business planning.",
    highlights: [
      "Sales history",
      "Revenue tracking",
      "Commission management",
      "Exportable reports",
    ],
  },
  {
    icon: Users,
    status: "coming" as const,
    title: "Follow & Discover",
    tagline: "Build your network",
    description:
      "Follow artists and galleries whose work inspires you. Get updates in your feed. Discover new talent through the community.",
    highlights: [
      "Follow system",
      "Discovery feed",
      "Artist recommendations",
      "Gallery networks",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <Navbar />
      <main className="pt-32 pb-24">
        {/* Header */}
        <div className="max-w-7xl mx-auto px-6 mb-20">
          <span className="section-label">Features</span>
          <h1 className="heading-xl mt-4">
            Everything You Need
            <br />
            <span className="text-brand-600">to Thrive</span>
          </h1>
          <p className="body-lg mt-6 max-w-xl">
            A complete toolkit built specifically for artists and galleries.
            Here&apos;s what you get.
          </p>
        </div>

        {/* Feature List */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col gap-px bg-slate-100/30">
            {phases.map((feature, index) => (
              <div
                key={feature.title}
                className="bg-white grid md:grid-cols-2 gap-8 md:gap-16 p-8 md:p-14 group hover:bg-slate-50 transition-colors duration-500"
              >
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <feature.icon
                      size={22}
                      className="text-brand-600"
                      strokeWidth={1.5}
                    />
                    {feature.status === "coming" && (
                      <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 border border-slate-200 px-2.5 py-1">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <h2 className="heading-md">{feature.title}</h2>
                  <p className="text-brand-600/70 text-sm mt-1">
                    {feature.tagline}
                  </p>
                  <p className="text-slate-400 mt-5 leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                <div className="flex flex-col justify-center">
                  <div className="flex flex-col gap-3.5">
                    {feature.highlights.map((h) => (
                      <div
                        key={h}
                        className="flex items-center gap-3 text-sm"
                      >
                        <CheckCircle2
                          size={16}
                          className="text-brand-600 shrink-0"
                          strokeWidth={1.5}
                        />
                        <span className="text-slate-600">{h}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="max-w-7xl mx-auto px-6 mt-24 text-center">
          <h2 className="heading-lg">Ready to Start?</h2>
          <p className="body-lg mt-4 max-w-md mx-auto">
            Join Artfolio free and start building your art career today.
          </p>
          <Link href="/register" className="btn-primary mt-8 inline-flex">
            Create Your Account
            <ArrowRight size={16} />
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
