import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Leaf, ArrowLeft } from "lucide-react";

export default function Terms() {
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
            Terms of Service
          </h1>
          
          <p className="text-stone-500 mb-8">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>

          <h2>Agreement to Terms</h2>
          <p>
            By accessing or using Bramble, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
          </p>

          <h2>Description of Service</h2>
          <p>
            Bramble provides a platform for homeschool co-ops to manage memberships, classes, events, communications, and payments. We act as a service provider to co-ops, not as the co-op itself.
          </p>

          <h2>User Accounts</h2>
          <p>
            You are responsible for maintaining the security of your account and password. You must notify us immediately of any unauthorized access to your account.
          </p>

          <h2>Co-op Administrators</h2>
          <p>
            Co-op administrators are responsible for:
          </p>
          <ul>
            <li>Accurate representation of their co-op</li>
            <li>Compliance with applicable laws and regulations</li>
            <li>Managing their co-op's members and content</li>
            <li>Ensuring appropriate use of the platform by their members</li>
          </ul>

          <h2>Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Violate any applicable laws or regulations</li>
            <li>Infringe on the rights of others</li>
            <li>Submit false or misleading information</li>
            <li>Interfere with the proper functioning of the platform</li>
            <li>Attempt to gain unauthorized access to any part of the service</li>
          </ul>

          <h2>Payments and Refunds</h2>
          <p>
            Payment processing is handled through Stripe. Co-op administrators set their own pricing and refund policies. Bramble facilitates payments but is not responsible for disputes between co-ops and their members.
          </p>

          <h2>Intellectual Property</h2>
          <p>
            The Bramble platform, including its design, features, and content (excluding user-generated content), is owned by Bramble. Co-ops retain ownership of their branding, content, and materials.
          </p>

          <h2>Limitation of Liability</h2>
          <p>
            Bramble is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the platform.
          </p>

          <h2>Termination</h2>
          <p>
            We may terminate or suspend access to our service at any time, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.
          </p>

          <h2>Changes to Terms</h2>
          <p>
            We may modify these terms at any time. We will notify users of significant changes. Continued use of the platform after changes constitutes acceptance of the new terms.
          </p>

          <h2>Contact</h2>
          <p>
            For questions about these Terms, please contact us at legal@bramble.co.
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
