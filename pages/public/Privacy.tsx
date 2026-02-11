import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Leaf, ArrowLeft } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Leaf className="w-6 h-6 text-[#7C9082]" />
            <span className="text-xl font-serif font-semibold text-stone-800">Bramble</span>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="sm">Log In</Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center text-stone-600 hover:text-stone-800 mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <article className="prose prose-stone max-w-none">
          <h1 className="text-4xl font-serif font-bold text-stone-800 mb-6">
            Privacy Policy
          </h1>
          
          <p className="text-stone-500 mb-8">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>

          <h2>Overview</h2>
          <p>
            Bramble is committed to protecting the privacy of homeschool co-ops, families, and instructors who use our platform. This policy explains how we collect, use, and protect your information.
          </p>

          <h2>Information We Collect</h2>
          <p>We collect information you provide directly to us, including:</p>
          <ul>
            <li>Account information (name, email, phone number)</li>
            <li>Co-op information (name, location, description)</li>
            <li>Child information (name, age) for enrollment purposes</li>
            <li>Payment information (processed securely through Stripe)</li>
            <li>Communications and messages within the platform</li>
          </ul>

          <h2>How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul>
            <li>Provide and maintain our services</li>
            <li>Process enrollments and payments</li>
            <li>Send important updates about your co-op</li>
            <li>Improve our platform and user experience</li>
            <li>Respond to your requests and support needs</li>
          </ul>

          <h2>Information Sharing</h2>
          <p>
            We do not sell your personal information. We share information only:
          </p>
          <ul>
            <li>With your co-op's administrators as necessary for co-op operations</li>
            <li>With instructors for classes you or your children are enrolled in</li>
            <li>With service providers who help us operate the platform (e.g., payment processors)</li>
            <li>When required by law or to protect rights and safety</li>
          </ul>

          <h2>Data Security</h2>
          <p>
            We implement appropriate security measures to protect your information. However, no method of transmission over the Internet is 100% secure.
          </p>

          <h2>Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal information</li>
            <li>Correct inaccurate information</li>
            <li>Request deletion of your information</li>
            <li>Opt out of non-essential communications</li>
          </ul>

          <h2>Children's Privacy</h2>
          <p>
            Child information is collected only as necessary for co-op enrollment and class management. Parents maintain control over their children's information and can request deletion at any time.
          </p>

          <h2>Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us at privacy@bramble.co.
          </p>
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
