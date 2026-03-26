import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { ArrowRight, Heart } from "lucide-react";

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="pt-32 pb-24">
        {/* Header */}
        <div className="max-w-7xl mx-auto px-6">
          <span className="section-label">About</span>
          <h1 className="heading-xl mt-4">
            Built for the
            <br />
            <span className="text-brand-600">Art World</span>
          </h1>
        </div>

        {/* Story */}
        <div className="max-w-7xl mx-auto px-6 mt-16">
          <div className="grid md:grid-cols-2 gap-16">
            <div>
              <h2 className="heading-md">Our Story</h2>
              <div className="mt-6 flex flex-col gap-5 text-slate-400 leading-relaxed">
                <p>
                  Artists and galleries have been underserved by technology for
                  too long. Most end up juggling spreadsheets for inventory,
                  generic website builders for portfolios, and social media
                  platforms that weren&apos;t designed with art in mind.
                </p>
                <p>
                  Artfolio was born from a simple idea: what if there was one
                  platform that understood the unique needs of the art world? A
                  place where an artist could catalog their life&apos;s work,
                  build a stunning portfolio, organize exhibitions, track sales,
                  and connect with fellow creatives — all without needing a
                  degree in computer science.
                </p>
                <p>
                  That&apos;s what we&apos;re building. A platform by art people,
                  for art people.
                </p>
              </div>
            </div>

            <div>
              <h2 className="heading-md">Our Values</h2>
              <div className="mt-6 flex flex-col gap-6">
                {[
                  {
                    title: "Art First",
                    text: "Every decision we make starts with one question: does this help artists and galleries do their best work?",
                  },
                  {
                    title: "Simplicity",
                    text: "Powerful tools shouldn't be complicated. We obsess over making things intuitive and beautiful.",
                  },
                  {
                    title: "Ownership",
                    text: "Your art, your data, your career. We're a tool in your hands, not the other way around.",
                  },
                  {
                    title: "Community",
                    text: "The art world thrives on connection. We build features that bring people together.",
                  },
                ].map((value) => (
                  <div key={value.title}>
                    <h3 className="font-display text-lg text-slate-900">
                      {value.title}
                    </h3>
                    <p className="text-sm text-slate-9000 mt-1 leading-relaxed">
                      {value.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Mission */}
        <div className="max-w-7xl mx-auto px-6 mt-24">
          <div className="bg-slate-50 border border-slate-150 p-10 md:p-16 text-center">
            <Heart
              size={28}
              className="text-brand-600 mx-auto mb-6"
              strokeWidth={1.5}
            />
            <h2 className="heading-md max-w-lg mx-auto">
              Our mission is to empower every artist and gallery with
              professional-grade tools.
            </h2>
            <p className="body-lg mt-5 max-w-md mx-auto">
              We believe that when artists have the right tools, the art world
              becomes a better place for everyone.
            </p>
            <Link href="/register" className="btn-primary mt-10 inline-flex">
              Join the Movement
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
