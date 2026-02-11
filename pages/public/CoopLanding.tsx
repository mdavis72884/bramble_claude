import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Users, BookOpen, MapPin, Clock, ArrowLeft, LogIn, Leaf, Mail, Heart } from "lucide-react";

const STOCK_HEADER_IMAGES: Record<string, string> = {
  nature: "https://images.unsplash.com/photo-1518173946687-a4c036bc3b15?w=1400&h=600&fit=crop&q=80",
  forest: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1400&h=600&fit=crop&q=80",
  meadow: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1400&h=600&fit=crop&q=80",
  garden: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1400&h=600&fit=crop&q=80",
  community: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1400&h=600&fit=crop&q=80",
  learning: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1400&h=600&fit=crop&q=80",
  default: "https://images.unsplash.com/photo-1518173946687-a4c036bc3b15?w=1400&h=600&fit=crop&q=80",
};

function getDefaultHeaderImage(tenantName: string): string {
  const name = tenantName.toLowerCase();
  if (name.includes("forest") || name.includes("oak") || name.includes("pine")) return STOCK_HEADER_IMAGES.forest;
  if (name.includes("meadow") || name.includes("field") || name.includes("prairie")) return STOCK_HEADER_IMAGES.meadow;
  if (name.includes("garden") || name.includes("bloom") || name.includes("seed")) return STOCK_HEADER_IMAGES.garden;
  if (name.includes("nature") || name.includes("outdoor")) return STOCK_HEADER_IMAGES.nature;
  if (name.includes("community") || name.includes("village")) return STOCK_HEADER_IMAGES.community;
  return STOCK_HEADER_IMAGES.learning;
}

interface LandingPageData {
  layoutTemplate: "CLASSIC" | "MODERN" | "MINIMAL";
  headerImageUrl: string | null;
  headerImageTheme: string | null;
  aboutContent: string | null;
  pricingContent: string | null;
  showPublicClasses: boolean;
  showPublicEvents: boolean;
}

interface TenantData {
  id: string;
  name: string;
  slug: string;
  contactEmail: string;
  branding?: {
    primaryColor: string;
    logoUrl?: string;
    tagline?: string;
  };
  announcements: Array<{
    id: string;
    title: string;
    content: string;
    createdAt: string;
  }>;
  classes: Array<{
    id: string;
    title: string;
    description: string;
    price: number;
    capacity: number;
    instructor: { firstName: string; lastName: string };
    sessions: Array<{ date: string; startTime: string; endTime: string }>;
    _count: { registrations: number };
  }>;
  events: Array<{
    id: string;
    title: string;
    description: string;
    date: string;
    location: string;
    price: number;
  }>;
}

const calmPalette = {
  sage: "#7C9082",
  sageLight: "#A8B5AB",
  copper: "#AE8660",
  copperLight: "#C4A77D",
  cream: "#FAF8F5",
  warmWhite: "#FFFDFB",
  textPrimary: "#3D3D3D",
  textSecondary: "#6B6B6B",
  textMuted: "#8A8A8A",
  border: "#E8E4DF",
  olive: "#5C6B54",
  terracotta: "#C17F59",
};

export default function CoopLanding() {
  const { slug } = useParams();
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [landingPage, setLandingPage] = useState<LandingPageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/t/${slug}/landing`)
      .then(res => res.json())
      .then(data => {
        setTenant(data.tenant);
        setLandingPage(data.landingPage);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: calmPalette.cream }}>
        <div className="text-center">
          <Leaf className="w-8 h-8 mx-auto mb-4 animate-pulse" style={{ color: calmPalette.sage }} />
          <div style={{ color: calmPalette.textMuted }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: calmPalette.cream }}>
        <div className="text-center">
          <h1 className="text-2xl font-serif mb-4" style={{ color: calmPalette.textPrimary }}>Co-op Not Found</h1>
          <Link href="/directory">
            <Button variant="outline" className="rounded-full" style={{ borderColor: calmPalette.border, color: calmPalette.textSecondary }}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Directory
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const layout = landingPage?.layoutTemplate || "CLASSIC";
  const headerImage = landingPage?.headerImageUrl || 
    (landingPage?.headerImageTheme ? STOCK_HEADER_IMAGES[landingPage.headerImageTheme] : null) ||
    getDefaultHeaderImage(tenant.name);
  const aboutContent = landingPage?.aboutContent;
  const pricingContent = landingPage?.pricingContent;

  if (layout === "MODERN") {
    return <ModernLayout tenant={tenant} landingPage={landingPage} headerImage={headerImage} aboutContent={aboutContent} pricingContent={pricingContent} slug={slug || ""} />;
  }

  if (layout === "MINIMAL") {
    return <MinimalLayout tenant={tenant} landingPage={landingPage} aboutContent={aboutContent} pricingContent={pricingContent} slug={slug || ""} />;
  }

  return <ClassicLayout tenant={tenant} landingPage={landingPage} headerImage={headerImage} aboutContent={aboutContent} pricingContent={pricingContent} slug={slug || ""} />;
}

interface LayoutProps {
  tenant: TenantData;
  landingPage: LandingPageData | null;
  headerImage?: string;
  aboutContent: string | null | undefined;
  pricingContent: string | null | undefined;
  slug: string;
}

function ClassicLayout({ tenant, landingPage, headerImage, aboutContent, pricingContent, slug }: LayoutProps) {
  const showClasses = landingPage?.showPublicClasses !== false;
  const showEvents = landingPage?.showPublicEvents !== false;

  return (
    <div className="min-h-screen" style={{ backgroundColor: calmPalette.cream }}>
      {/* Hero Section with Warm Overlay */}
      <div 
        className="relative h-[70vh] min-h-[500px] bg-cover bg-center"
        style={{ backgroundImage: `url(${headerImage})` }}
      >
        <div 
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(92, 107, 84, 0.35) 0%, rgba(92, 107, 84, 0.55) 100%)" }}
        />
        
        {/* Navigation */}
        <nav className="absolute top-0 left-0 right-0 z-10">
          <div className="max-w-6xl mx-auto px-8 py-6 flex justify-between items-center">
            <div className="flex items-center gap-3">
              {tenant.branding?.logoUrl ? (
                <img src={tenant.branding.logoUrl} alt={tenant.name} className="h-10 drop-shadow-lg" />
              ) : (
                <Leaf className="w-8 h-8 text-white/90" />
              )}
            </div>
            <div className="flex gap-3">
              <Link href="/login">
                <Button 
                  variant="ghost" 
                  className="text-white/90 hover:text-white hover:bg-white/10 rounded-full px-6"
                  data-testid="button-login"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Log In
                </Button>
              </Link>
              <Link href={`/apply/${slug}/family`}>
                <Button 
                  className="rounded-full px-6 shadow-lg hover:shadow-xl transition-all"
                  style={{ backgroundColor: calmPalette.copper, color: "white" }}
                  data-testid="button-apply"
                >
                  Join Our Community
                </Button>
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-8 max-w-3xl">
            <h1 
              className="text-5xl md:text-6xl font-serif text-white mb-6 leading-tight drop-shadow-lg"
              style={{ textShadow: "0 2px 20px rgba(0,0,0,0.2)" }}
              data-testid="text-coop-name"
            >
              {tenant.name}
            </h1>
            {tenant.branding?.tagline && (
              <p className="text-xl md:text-2xl text-white/90 font-light tracking-wide">
                {tenant.branding.tagline}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-8">
        {/* About Section */}
        {aboutContent && (
          <section className="py-20">
            <div className="max-w-3xl mx-auto text-center">
              <h2 
                className="text-3xl md:text-4xl font-serif mb-8"
                style={{ color: calmPalette.textPrimary }}
              >
                Welcome to Our Community
              </h2>
              <p 
                className="text-lg md:text-xl leading-relaxed whitespace-pre-wrap"
                style={{ color: calmPalette.textSecondary, lineHeight: "1.8" }}
              >
                {aboutContent}
              </p>
            </div>
          </section>
        )}

        {/* Quote/Mission Section */}
        <section 
          className="py-16 px-12 rounded-2xl my-8 text-center"
          style={{ backgroundColor: calmPalette.sage, color: "white" }}
        >
          <Heart className="w-8 h-8 mx-auto mb-6 opacity-80" />
          <blockquote className="text-2xl md:text-3xl font-serif italic leading-relaxed max-w-3xl mx-auto">
            "Nurturing curiosity, building community, growing together."
          </blockquote>
        </section>

        {/* Pricing Section */}
        {pricingContent && (
          <section className="py-20">
            <div 
              className="rounded-2xl p-12 md:p-16"
              style={{ backgroundColor: calmPalette.warmWhite, border: `1px solid ${calmPalette.border}` }}
            >
              <h2 
                className="text-3xl font-serif mb-8 text-center"
                style={{ color: calmPalette.textPrimary }}
              >
                Membership & Pricing
              </h2>
              <div className="max-w-2xl mx-auto text-center">
                <p 
                  className="text-lg leading-relaxed whitespace-pre-wrap"
                  style={{ color: calmPalette.textSecondary, lineHeight: "1.8" }}
                >
                  {pricingContent}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Announcements */}
        {tenant.announcements.length > 0 && (
          <section className="py-16">
            <h2 
              className="text-3xl font-serif mb-10 text-center"
              style={{ color: calmPalette.textPrimary }}
            >
              Latest News
            </h2>
            <div className="space-y-6 max-w-3xl mx-auto">
              {tenant.announcements.map(announcement => (
                <Card 
                  key={announcement.id} 
                  className="border-0 shadow-sm rounded-xl overflow-hidden"
                  style={{ backgroundColor: calmPalette.warmWhite }}
                  data-testid={`card-announcement-${announcement.id}`}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl font-serif" style={{ color: calmPalette.textPrimary }}>
                      {announcement.title}
                    </CardTitle>
                    <CardDescription style={{ color: calmPalette.textMuted }}>
                      {new Date(announcement.createdAt).toLocaleDateString("en-US", { 
                        year: "numeric", month: "long", day: "numeric" 
                      })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p style={{ color: calmPalette.textSecondary }} className="leading-relaxed">
                      {announcement.content}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Classes Section */}
        {showClasses && tenant.classes.length > 0 && (
          <section className="py-16">
            <div className="text-center mb-12">
              <BookOpen className="w-10 h-10 mx-auto mb-4" style={{ color: calmPalette.sage }} />
              <h2 
                className="text-3xl font-serif"
                style={{ color: calmPalette.textPrimary }}
              >
                Our Classes
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              {tenant.classes.map(cls => (
                <Card 
                  key={cls.id} 
                  className="border-0 shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                  style={{ backgroundColor: calmPalette.warmWhite }}
                  data-testid={`card-class-${cls.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl font-serif" style={{ color: calmPalette.textPrimary }}>
                        {cls.title}
                      </CardTitle>
                      <Badge 
                        className="rounded-full px-3 font-normal"
                        style={{ backgroundColor: calmPalette.copperLight, color: "white" }}
                      >
                        ${cls.price}
                      </Badge>
                    </div>
                    <CardDescription style={{ color: calmPalette.copper }}>
                      with {cls.instructor.firstName} {cls.instructor.lastName}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p 
                      className="text-sm mb-4 line-clamp-2 leading-relaxed"
                      style={{ color: calmPalette.textSecondary }}
                    >
                      {cls.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm" style={{ color: calmPalette.textMuted }}>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {cls._count.registrations}/{cls.capacity}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {cls.sessions.length} sessions
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Events Section */}
        {showEvents && tenant.events.length > 0 && (
          <section className="py-16">
            <div className="text-center mb-12">
              <CalendarDays className="w-10 h-10 mx-auto mb-4" style={{ color: calmPalette.sage }} />
              <h2 
                className="text-3xl font-serif"
                style={{ color: calmPalette.textPrimary }}
              >
                Upcoming Events
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              {tenant.events.map(event => (
                <Card 
                  key={event.id} 
                  className="border-0 shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                  style={{ backgroundColor: calmPalette.warmWhite }}
                  data-testid={`card-event-${event.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl font-serif" style={{ color: calmPalette.textPrimary }}>
                        {event.title}
                      </CardTitle>
                      <Badge 
                        variant="secondary"
                        className="rounded-full px-3 font-normal"
                        style={{ backgroundColor: calmPalette.sageLight, color: "white" }}
                      >
                        {event.price === 0 ? "Free" : `$${event.price}`}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-2" style={{ color: calmPalette.copper }}>
                      <CalendarDays className="w-4 h-4" />
                      {new Date(event.date).toLocaleDateString("en-US", { 
                        weekday: "long", month: "long", day: "numeric" 
                      })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p 
                      className="text-sm mb-4 line-clamp-2 leading-relaxed"
                      style={{ color: calmPalette.textSecondary }}
                    >
                      {event.description}
                    </p>
                    {event.location && (
                      <div className="flex items-center gap-1 text-sm" style={{ color: calmPalette.textMuted }}>
                        <MapPin className="w-4 h-4" />
                        {event.location}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Call to Action */}
        <section 
          className="py-16 my-16 rounded-2xl text-center"
          style={{ backgroundColor: calmPalette.olive }}
        >
          <h2 className="text-3xl font-serif text-white mb-4">Ready to Join Our Community?</h2>
          <p className="text-white/80 mb-8 text-lg max-w-xl mx-auto">
            We'd love to welcome your family. Start your application today.
          </p>
          <Link href={`/apply/${slug}/family`}>
            <Button 
              size="lg" 
              className="rounded-full px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
              style={{ backgroundColor: calmPalette.copper, color: "white" }}
            >
              Apply Now
            </Button>
          </Link>
        </section>

        {/* Footer */}
        <footer className="py-16 text-center" style={{ borderTop: `1px solid ${calmPalette.border}` }}>
          <Leaf className="w-6 h-6 mx-auto mb-4" style={{ color: calmPalette.sage }} />
          <p className="mb-2" style={{ color: calmPalette.textSecondary }}>
            <Mail className="w-4 h-4 inline mr-2" />
            <a 
              href={`mailto:${tenant.contactEmail}`} 
              className="hover:underline"
              style={{ color: calmPalette.copper }}
            >
              {tenant.contactEmail}
            </a>
          </p>
          <p className="text-sm mt-6" style={{ color: calmPalette.textMuted }}>Powered by Bramble</p>
          <div className="flex justify-center gap-4 mt-2">
            <Link 
              href="/directory" 
              className="text-sm hover:underline"
              style={{ color: calmPalette.textMuted }}
            >
              Browse other co-ops
            </Link>
            <span style={{ color: calmPalette.textMuted }}>·</span>
            <Link 
              href={`/apply/${slug}/instructor`}
              className="text-sm hover:underline"
              style={{ color: calmPalette.copper }}
              data-testid="link-become-instructor"
            >
              Interested in teaching?
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}

function ModernLayout({ tenant, landingPage, headerImage, aboutContent, pricingContent, slug }: LayoutProps) {
  const showClasses = landingPage?.showPublicClasses !== false;
  const showEvents = landingPage?.showPublicEvents !== false;

  return (
    <div className="min-h-screen" style={{ backgroundColor: calmPalette.warmWhite }}>
      {/* Fixed Navigation */}
      <nav 
        className="fixed top-0 left-0 right-0 z-20 backdrop-blur-md"
        style={{ backgroundColor: "rgba(250, 248, 245, 0.95)", borderBottom: `1px solid ${calmPalette.border}` }}
      >
        <div className="max-w-6xl mx-auto px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {tenant.branding?.logoUrl ? (
              <img src={tenant.branding.logoUrl} alt={tenant.name} className="h-8" />
            ) : (
              <Leaf className="w-6 h-6" style={{ color: calmPalette.sage }} />
            )}
            <span className="font-serif text-xl" style={{ color: calmPalette.textPrimary }}>{tenant.name}</span>
          </div>
          <div className="flex gap-3">
            <Link href="/login">
              <Button 
                variant="ghost" 
                className="rounded-full"
                style={{ color: calmPalette.textSecondary }}
                data-testid="button-login"
              >
                Log In
              </Button>
            </Link>
            <Link href={`/apply/${slug}/family`}>
              <Button 
                className="rounded-full px-6"
                style={{ backgroundColor: calmPalette.copper, color: "white" }}
                data-testid="button-apply"
              >
                Join Us
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20">
        <div 
          className="h-[75vh] min-h-[600px] bg-cover bg-center relative"
          style={{ backgroundImage: `url(${headerImage})` }}
        >
          <div 
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, rgba(92, 107, 84, 0.7) 0%, rgba(92, 107, 84, 0.3) 50%, rgba(92, 107, 84, 0.2) 100%)" }}
          />
          <div className="absolute bottom-0 left-0 right-0 p-16">
            <div className="max-w-6xl mx-auto">
              <h1 
                className="text-6xl md:text-7xl font-serif text-white mb-6 leading-tight"
                data-testid="text-coop-name"
              >
                {tenant.name}
              </h1>
              <p className="text-2xl text-white/90 max-w-2xl font-light">
                {tenant.branding?.tagline || "A community of learners growing together"}
              </p>
              <div className="mt-10">
                <Link href={`/apply/${slug}/family`}>
                  <Button 
                    size="lg" 
                    className="rounded-full px-10 py-6 text-lg shadow-xl"
                    style={{ backgroundColor: calmPalette.copper, color: "white" }}
                  >
                    Begin Your Journey
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-8">
        {/* About Section */}
        {aboutContent && (
          <section className="py-24">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <h2 
                  className="text-4xl font-serif mb-8"
                  style={{ color: calmPalette.textPrimary }}
                >
                  About Our Community
                </h2>
                <p 
                  className="text-xl leading-relaxed whitespace-pre-wrap"
                  style={{ color: calmPalette.textSecondary, lineHeight: "1.9" }}
                >
                  {aboutContent}
                </p>
              </div>
              <div 
                className="rounded-2xl p-12 text-center"
                style={{ backgroundColor: calmPalette.sage }}
              >
                <h3 className="font-serif text-2xl text-white mb-6">Ready to Join?</h3>
                <p className="text-white/80 mb-8 text-lg">
                  Become part of our learning community today.
                </p>
                <Link href={`/apply/${slug}/family`}>
                  <Button 
                    size="lg" 
                    className="rounded-full px-8"
                    style={{ backgroundColor: calmPalette.copper, color: "white" }}
                  >
                    Apply Now
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Quote Section */}
        <section className="py-16">
          <blockquote 
            className="text-center py-16 px-8 rounded-2xl"
            style={{ backgroundColor: calmPalette.cream }}
          >
            <Heart className="w-8 h-8 mx-auto mb-6" style={{ color: calmPalette.copper }} />
            <p 
              className="text-3xl font-serif italic leading-relaxed max-w-3xl mx-auto"
              style={{ color: calmPalette.textPrimary }}
            >
              "The greatest gifts we can give our children are the roots of responsibility and the wings of independence."
            </p>
            <cite 
              className="block mt-6 text-lg not-italic"
              style={{ color: calmPalette.textMuted }}
            >
              — Maria Montessori
            </cite>
          </blockquote>
        </section>

        {/* Pricing Section */}
        {pricingContent && (
          <section className="py-24">
            <div 
              className="rounded-2xl p-16"
              style={{ backgroundColor: calmPalette.warmWhite, border: `1px solid ${calmPalette.border}` }}
            >
              <h2 
                className="text-4xl font-serif mb-10 text-center"
                style={{ color: calmPalette.textPrimary }}
              >
                Membership & Pricing
              </h2>
              <div className="max-w-2xl mx-auto text-center">
                <p 
                  className="text-xl leading-relaxed whitespace-pre-wrap"
                  style={{ color: calmPalette.textSecondary, lineHeight: "1.8" }}
                >
                  {pricingContent}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Classes */}
        {showClasses && tenant.classes.length > 0 && (
          <section className="py-20">
            <h2 
              className="text-4xl font-serif mb-12 text-center"
              style={{ color: calmPalette.textPrimary }}
            >
              Our Classes
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {tenant.classes.slice(0, 6).map(cls => (
                <Card 
                  key={cls.id} 
                  className="border-0 shadow-md rounded-2xl overflow-hidden hover:shadow-lg transition-all"
                  style={{ backgroundColor: calmPalette.warmWhite }}
                  data-testid={`card-class-${cls.id}`}
                >
                  <div className="h-2" style={{ backgroundColor: calmPalette.sage }} />
                  <CardHeader className="pt-6">
                    <CardTitle className="font-serif text-xl" style={{ color: calmPalette.textPrimary }}>
                      {cls.title}
                    </CardTitle>
                    <CardDescription style={{ color: calmPalette.copper }}>
                      {cls.instructor.firstName} {cls.instructor.lastName}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p 
                      className="text-sm line-clamp-2 mb-4 leading-relaxed"
                      style={{ color: calmPalette.textSecondary }}
                    >
                      {cls.description}
                    </p>
                    <Badge 
                      className="rounded-full"
                      style={{ backgroundColor: calmPalette.copper, color: "white" }}
                    >
                      ${cls.price}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Events */}
        {showEvents && tenant.events.length > 0 && (
          <section className="py-20">
            <h2 
              className="text-4xl font-serif mb-12 text-center"
              style={{ color: calmPalette.textPrimary }}
            >
              Upcoming Events
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {tenant.events.map(event => (
                <Card 
                  key={event.id} 
                  className="border-0 shadow-md rounded-2xl overflow-hidden flex hover:shadow-lg transition-all"
                  style={{ backgroundColor: calmPalette.warmWhite }}
                  data-testid={`card-event-${event.id}`}
                >
                  <div 
                    className="w-28 flex-shrink-0 flex flex-col items-center justify-center p-6"
                    style={{ backgroundColor: calmPalette.sage }}
                  >
                    <span className="text-3xl font-bold text-white">
                      {new Date(event.date).getDate()}
                    </span>
                    <span className="text-sm text-white/80 uppercase tracking-wider">
                      {new Date(event.date).toLocaleDateString("en-US", { month: "short" })}
                    </span>
                  </div>
                  <div className="p-6 flex-1">
                    <h3 className="font-serif text-xl mb-2" style={{ color: calmPalette.textPrimary }}>
                      {event.title}
                    </h3>
                    <p className="text-sm mb-2" style={{ color: calmPalette.textSecondary }}>
                      {event.description}
                    </p>
                    {event.location && (
                      <p className="text-sm flex items-center gap-1" style={{ color: calmPalette.textMuted }}>
                        <MapPin className="w-4 h-4" />
                        {event.location}
                      </p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="py-20 text-center" style={{ borderTop: `1px solid ${calmPalette.border}` }}>
          <Leaf className="w-6 h-6 mx-auto mb-4" style={{ color: calmPalette.sage }} />
          <p className="mb-3" style={{ color: calmPalette.textSecondary }}>{tenant.contactEmail}</p>
          <p className="text-sm" style={{ color: calmPalette.textMuted }}>Powered by Bramble</p>
          <Link 
            href={`/apply/${slug}/instructor`}
            className="text-sm hover:underline mt-3 inline-block"
            style={{ color: calmPalette.copper }}
            data-testid="link-become-instructor"
          >
            Interested in teaching?
          </Link>
        </footer>
      </main>
    </div>
  );
}

function MinimalLayout({ tenant, landingPage, aboutContent, pricingContent, slug }: LayoutProps) {
  const showClasses = landingPage?.showPublicClasses !== false;
  const showEvents = landingPage?.showPublicEvents !== false;

  return (
    <div className="min-h-screen" style={{ backgroundColor: calmPalette.cream }}>
      <div className="max-w-3xl mx-auto px-8 py-20">
        {/* Header */}
        <header className="text-center mb-20">
          {tenant.branding?.logoUrl ? (
            <img src={tenant.branding.logoUrl} alt={tenant.name} className="h-20 mx-auto mb-8" />
          ) : (
            <Leaf className="w-12 h-12 mx-auto mb-8" style={{ color: calmPalette.sage }} />
          )}
          <h1 
            className="text-5xl font-serif mb-6"
            style={{ color: calmPalette.textPrimary }}
            data-testid="text-coop-name"
          >
            {tenant.name}
          </h1>
          {tenant.branding?.tagline && (
            <p className="text-xl mb-10" style={{ color: calmPalette.textSecondary }}>
              {tenant.branding.tagline}
            </p>
          )}
          <div className="flex justify-center gap-4">
            <Link href={`/apply/${slug}/family`}>
              <Button 
                size="lg" 
                className="rounded-full px-8"
                style={{ backgroundColor: calmPalette.copper, color: "white" }}
                data-testid="button-apply"
              >
                Apply to Join
              </Button>
            </Link>
            <Link href="/login">
              <Button 
                size="lg" 
                variant="outline" 
                className="rounded-full px-8"
                style={{ borderColor: calmPalette.border, color: calmPalette.textSecondary }}
                data-testid="button-login"
              >
                Log In
              </Button>
            </Link>
          </div>
        </header>

        {/* About */}
        {aboutContent && (
          <section className="mb-16">
            <h2 
              className="text-2xl font-serif mb-6 pb-4"
              style={{ color: calmPalette.textPrimary, borderBottom: `1px solid ${calmPalette.border}` }}
            >
              About
            </h2>
            <p 
              className="text-lg leading-relaxed whitespace-pre-wrap"
              style={{ color: calmPalette.textSecondary, lineHeight: "1.9" }}
            >
              {aboutContent}
            </p>
          </section>
        )}

        {/* Quote */}
        <section 
          className="my-16 py-12 px-8 rounded-xl text-center"
          style={{ backgroundColor: calmPalette.sage }}
        >
          <p className="text-xl font-serif italic text-white leading-relaxed">
            "Every child is a unique flower in the garden of learning."
          </p>
        </section>

        {/* Pricing */}
        {pricingContent && (
          <section className="mb-16">
            <h2 
              className="text-2xl font-serif mb-6 pb-4"
              style={{ color: calmPalette.textPrimary, borderBottom: `1px solid ${calmPalette.border}` }}
            >
              Pricing
            </h2>
            <p 
              className="text-lg leading-relaxed whitespace-pre-wrap"
              style={{ color: calmPalette.textSecondary }}
            >
              {pricingContent}
            </p>
          </section>
        )}

        {/* Classes */}
        {showClasses && tenant.classes.length > 0 && (
          <section className="mb-16">
            <h2 
              className="text-2xl font-serif mb-6 pb-4"
              style={{ color: calmPalette.textPrimary, borderBottom: `1px solid ${calmPalette.border}` }}
            >
              Classes
            </h2>
            <ul className="divide-y" style={{ borderColor: calmPalette.border }}>
              {tenant.classes.map(cls => (
                <li key={cls.id} className="py-6" data-testid={`card-class-${cls.id}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-serif text-lg" style={{ color: calmPalette.textPrimary }}>
                      {cls.title}
                    </span>
                    <span 
                      className="rounded-full px-3 py-1 text-sm"
                      style={{ backgroundColor: calmPalette.copperLight, color: "white" }}
                    >
                      ${cls.price}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: calmPalette.copper }}>
                    {cls.instructor.firstName} {cls.instructor.lastName} • {cls.sessions.length} sessions
                  </p>
                  <p className="text-sm mt-2" style={{ color: calmPalette.textMuted }}>
                    {cls.description}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Events */}
        {showEvents && tenant.events.length > 0 && (
          <section className="mb-16">
            <h2 
              className="text-2xl font-serif mb-6 pb-4"
              style={{ color: calmPalette.textPrimary, borderBottom: `1px solid ${calmPalette.border}` }}
            >
              Events
            </h2>
            <ul className="divide-y" style={{ borderColor: calmPalette.border }}>
              {tenant.events.map(event => (
                <li key={event.id} className="py-6" data-testid={`card-event-${event.id}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-serif text-lg" style={{ color: calmPalette.textPrimary }}>
                      {event.title}
                    </span>
                    <span style={{ color: calmPalette.textMuted }}>
                      {new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  {event.location && (
                    <p className="text-sm flex items-center gap-1" style={{ color: calmPalette.textMuted }}>
                      <MapPin className="w-4 h-4" />
                      {event.location}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Footer */}
        <footer className="py-12 text-center mt-20" style={{ borderTop: `1px solid ${calmPalette.border}` }}>
          <Leaf className="w-5 h-5 mx-auto mb-4" style={{ color: calmPalette.sage }} />
          <p className="mb-2" style={{ color: calmPalette.textSecondary }}>{tenant.contactEmail}</p>
          <p className="text-sm" style={{ color: calmPalette.textMuted }}>Powered by Bramble</p>
          <Link 
            href={`/apply/${slug}/instructor`}
            className="text-sm hover:underline mt-3 inline-block"
            style={{ color: calmPalette.copper }}
            data-testid="link-become-instructor"
          >
            Interested in teaching?
          </Link>
        </footer>
      </div>
    </div>
  );
}
