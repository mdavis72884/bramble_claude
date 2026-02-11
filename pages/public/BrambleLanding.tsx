import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, BookOpen, Calendar, MessageSquare, CreditCard, 
  Shield, ArrowRight, CheckCircle, Leaf
} from "lucide-react";

import heroImage from "@/assets/kid-playing-with-paper-plane_1768684719525.jpg";

export default function BrambleLanding() {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="w-6 h-6 text-[#7C9082]" />
            <span className="text-xl font-serif font-semibold text-stone-800">Bramble</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/directory" className="text-stone-600 hover:text-stone-800 transition-colors">
              Browse Co-ops
            </Link>
            <Link href="/about" className="text-stone-600 hover:text-stone-800 transition-colors">
              About
            </Link>
            <Link href="/login">
              <Button variant="outline" size="sm">Log In</Button>
            </Link>
          </div>
        </div>
      </nav>
      {/* Hero Section */}
      <section 
        className="relative py-24 px-6 min-h-[600px] flex items-center overflow-hidden"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-stone-900/40" />
        
        <div className="relative max-w-6xl mx-auto w-full">
          <div className="max-w-2xl text-left">
            <h1 className="text-5xl md:text-7xl font-serif font-bold text-white leading-tight mb-6 drop-shadow-sm">
              Organize Your <br />
              Homeschool Hub
            </h1>
            <p className="text-xl text-stone-50 mb-10 leading-relaxed drop-shadow-sm">
              Bramble brings structure and support to homeschooling hubs & groups — connecting families and educators into a thriving, organized community.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-start">
              <Link href="/start">
                <Button size="lg" className="bg-[#7C9082] hover:bg-[#6a7d70] text-white px-8 h-14 text-lg shadow-lg">
                  Start a Co-op
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/directory">
                <Button size="lg" variant="outline" className="px-8 h-14 text-lg bg-white/10 hover:bg-white/20 text-white border-white/40 backdrop-blur-md shadow-lg">
                  Browse Co-ops
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
      {/* How It Works */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-serif font-bold text-stone-800 text-center mb-4">
            How It Works
          </h2>
          <p className="text-stone-600 text-center mb-12 max-w-2xl mx-auto">
            Getting your co-op up and running is simple.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#7C9082]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-serif font-bold text-[#7C9082]">1</span>
              </div>
              <h3 className="text-lg font-semibold text-stone-800 mb-2">Apply</h3>
              <p className="text-stone-600">
                Tell us about your co-op. We'll review your application within a few days.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-[#7C9082]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-serif font-bold text-[#7C9082]">2</span>
              </div>
              <h3 className="text-lg font-semibold text-stone-800 mb-2">Set Up</h3>
              <p className="text-stone-600">
                Once approved, customize your co-op's branding, classes, and settings.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-[#7C9082]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-serif font-bold text-[#7C9082]">3</span>
              </div>
              <h3 className="text-lg font-semibold text-stone-800 mb-2">Launch</h3>
              <p className="text-stone-600">
                Invite families and instructors. Start teaching and growing together.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* Who It's For */}
      <section className="py-20 px-6 bg-stone-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-serif font-bold text-stone-800 text-center mb-12">
            Built for Everyone in Your Co-op
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-white border-stone-200">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-[#7C9082]/10 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-[#7C9082]" />
                </div>
                <h3 className="text-lg font-semibold text-stone-800 mb-2">Co-op Admins</h3>
                <p className="text-stone-600 text-sm">
                  Manage memberships, approve applications, handle payments, and keep everything organized in one place.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white border-stone-200">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-[#AE8660]/10 rounded-lg flex items-center justify-center mb-4">
                  <BookOpen className="w-6 h-6 text-[#AE8660]" />
                </div>
                <h3 className="text-lg font-semibold text-stone-800 mb-2">Instructors</h3>
                <p className="text-stone-600 text-sm">
                  Propose classes, manage rosters, track attendance, and communicate with enrolled families.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white border-stone-200">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-stone-800 mb-2">Families</h3>
                <p className="text-stone-600 text-sm">
                  Browse classes, enroll children, RSVP to events, and stay connected with your co-op community.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      {/* Features */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-serif font-bold text-stone-800 text-center mb-4">
            Everything You Need, Nothing You Don't
          </h2>
          <p className="text-stone-600 text-center mb-12 max-w-2xl mx-auto">
            Bramble handles the operations so you can focus on community.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: Users, title: "Member Approvals", desc: "Review and approve families and instructors who want to join." },
              { icon: BookOpen, title: "Class Management", desc: "Create classes, set schedules, manage enrollments and sessions." },
              { icon: Calendar, title: "Events & Calendar", desc: "Plan co-op events, track RSVPs, and keep everyone in sync." },
              { icon: MessageSquare, title: "Communications", desc: "Send announcements, newsletters, and class messages." },
              { icon: CreditCard, title: "Payments", desc: "Collect class fees, track payments, and manage instructor payouts." },
              { icon: CheckCircle, title: "White-Labeled", desc: "Your brand, your identity. Bramble stays invisible." },
            ].map((feature, i) => (
              <div key={i} className="flex gap-4 p-4 rounded-lg hover:bg-stone-50 transition-colors">
                <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-5 h-5 text-stone-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-stone-800 mb-1">{feature.title}</h3>
                  <p className="text-stone-600 text-sm">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* CTA Section */}
      <section className="py-20 px-6 bg-[#7C9082]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-serif font-bold text-white mb-4">
            Ready to simplify your co-op?
          </h2>
          <p className="text-white/80 mb-8">
            Apply today and we'll help you get started.
          </p>
          <Link href="/start">
            <Button size="lg" variant="secondary" className="px-8">
              Start a Co-op
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
      {/* Footer */}
      <footer className="bg-stone-800 text-stone-400 py-12 px-6">
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
