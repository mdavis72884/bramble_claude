import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Leaf, ArrowLeft, Heart, Eye, Shield } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Leaf className="w-6 h-6 text-[#7C9082]" />
            <span className="text-xl font-serif font-semibold text-stone-800">Bramble</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/directory" className="text-stone-600 hover:text-stone-800 transition-colors">
              Browse Co-ops
            </Link>
            <Link href="/login">
              <Button variant="outline" size="sm">Log In</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center text-stone-600 hover:text-stone-800 mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <article className="prose prose-stone max-w-none">
          <h1 className="text-4xl font-serif font-bold text-stone-800 mb-6">
            About Bramble
          </h1>
          
          <p className="text-xl text-stone-600 mb-8 leading-relaxed">
            Bramble isn't a marketplace or a social network. It's quiet, intentional infrastructure built for homeschool communities.
          </p>

          <div className="grid md:grid-cols-3 gap-6 my-12">
            <div className="text-center p-6 bg-white rounded-lg border border-stone-200">
              <div className="w-12 h-12 bg-[#7C9082]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Eye className="w-6 h-6 text-[#7C9082]" />
              </div>
              <h3 className="font-semibold text-stone-800 mb-2">Invisible</h3>
              <p className="text-sm text-stone-600">
                Your co-op's brand stays front and center. Bramble powers things quietly in the background.
              </p>
            </div>

            <div className="text-center p-6 bg-white rounded-lg border border-stone-200">
              <div className="w-12 h-12 bg-[#7C9082]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-6 h-6 text-[#7C9082]" />
              </div>
              <h3 className="font-semibold text-stone-800 mb-2">Intentional</h3>
              <p className="text-sm text-stone-600">
                Built with care for the unique needs of homeschool communities. No bloat, no noise.
              </p>
            </div>

            <div className="text-center p-6 bg-white rounded-lg border border-stone-200">
              <div className="w-12 h-12 bg-[#7C9082]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-[#7C9082]" />
              </div>
              <h3 className="font-semibold text-stone-800 mb-2">Trustworthy</h3>
              <p className="text-sm text-stone-600">
                Simple, reliable tools that respect your time and your community's privacy.
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-serif font-bold text-stone-800 mt-12 mb-4">
            Our Philosophy
          </h2>
          
          <p className="text-stone-600 mb-4">
            Homeschool co-ops are deeply personal. They're built on trust, shared values, and a commitment to giving children a thoughtful education. The last thing they need is software that tries to be the star of the show.
          </p>
          
          <p className="text-stone-600 mb-4">
            Bramble is designed to disappear. When families join your co-op, they're joining <em>your</em> community — not signing up for another platform. When instructors propose a class, they see your branding, not ours.
          </p>
          
          <p className="text-stone-600 mb-4">
            We believe the best tools are the ones you don't think about. They just work. They don't send unnecessary notifications. They don't try to "engage" you. They help you do what you need to do and then get out of the way.
          </p>

          <h2 className="text-2xl font-serif font-bold text-stone-800 mt-12 mb-4">
            Who We Serve
          </h2>
          
          <p className="text-stone-600 mb-4">
            Bramble is for co-op organizers who are tired of cobbling together spreadsheets, Facebook groups, and payment apps. It's for instructors who want a simple way to manage their classes. It's for families who want one place to see their schedule and stay connected.
          </p>
          
          <p className="text-stone-600 mb-8">
            If you're building or running a homeschool co-op and want tools that respect your time and your community's culture, Bramble might be right for you.
          </p>

          <div className="bg-[#7C9082]/10 p-8 rounded-lg text-center mt-12">
            <h3 className="text-xl font-serif font-bold text-stone-800 mb-3">
              Ready to get started?
            </h3>
            <p className="text-stone-600 mb-4">
              Apply to create your co-op and we'll help you set everything up.
            </p>
            <Link href="/start">
              <Button className="bg-[#7C9082] hover:bg-[#6a7d70]">
                Start a Co-op
              </Button>
            </Link>
          </div>
        </article>
      </div>

      {/* Footer */}
      <footer className="bg-stone-800 text-stone-400 py-12 px-6 mt-16">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Leaf className="w-5 h-5 text-[#7C9082]" />
              <span className="text-white font-serif">Bramble</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/about" className="hover:text-white transition-colors">About</Link>
              <Link href="/directory" className="hover:text-white transition-colors">Directory</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            </div>
          </div>
          <div className="text-center text-sm mt-8 text-stone-500">
            © {new Date().getFullYear()} Bramble. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
