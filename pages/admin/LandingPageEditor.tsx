import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ExternalLink, Save, Eye, Layout, Image, FileText, Settings2 } from "lucide-react";

const STOCK_HEADER_IMAGES = [
  { id: "nature", label: "Sunlit Nature", url: "https://images.unsplash.com/photo-1518173946687-a4c036bc3b15?w=400&h=200&fit=crop&q=80" },
  { id: "forest", label: "Peaceful Forest", url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=200&fit=crop&q=80" },
  { id: "meadow", label: "Golden Meadow", url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&h=200&fit=crop&q=80" },
  { id: "garden", label: "Growing Garden", url: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=200&fit=crop&q=80" },
  { id: "community", label: "Community", url: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=200&fit=crop&q=80" },
  { id: "learning", label: "Learning Together", url: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=200&fit=crop&q=80" },
];

interface LandingPageData {
  id: string;
  layoutTemplate: "CLASSIC" | "MODERN" | "MINIMAL";
  headerImageUrl: string | null;
  headerImageTheme: string | null;
  aboutContent: string | null;
  pricingContent: string | null;
  showPublicClasses: boolean;
  showPublicEvents: boolean;
}

export default function LandingPageEditor() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [landingPage, setLandingPage] = useState<LandingPageData | null>(null);
  const [tenantSlug, setTenantSlug] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [layoutTemplate, setLayoutTemplate] = useState<"CLASSIC" | "MODERN" | "MINIMAL">("CLASSIC");
  const [headerImageUrl, setHeaderImageUrl] = useState("");
  const [headerImageTheme, setHeaderImageTheme] = useState("default");
  const [aboutContent, setAboutContent] = useState("");
  const [pricingContent, setPricingContent] = useState("");
  const [showPublicClasses, setShowPublicClasses] = useState(true);
  const [showPublicEvents, setShowPublicEvents] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    fetch("/api/tenant/landing-page", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        setLandingPage(data.landingPage);
        setTenantSlug(data.tenantSlug || "");
        if (data.landingPage) {
          setLayoutTemplate(data.landingPage.layoutTemplate || "CLASSIC");
          setHeaderImageUrl(data.landingPage.headerImageUrl || "");
          setHeaderImageTheme(data.landingPage.headerImageTheme || "default");
          setAboutContent(data.landingPage.aboutContent || "");
          setPricingContent(data.landingPage.pricingContent || "");
          setShowPublicClasses(data.landingPage.showPublicClasses ?? true);
          setShowPublicEvents(data.landingPage.showPublicEvents ?? true);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch("/api/tenant/landing-page", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          layoutTemplate,
          headerImageUrl: headerImageUrl || null,
          headerImageTheme,
          aboutContent: aboutContent || null,
          pricingContent: pricingContent || null,
          showPublicClasses,
          showPublicEvents,
        }),
      });

      if (response.ok) {
        toast({
          title: "Saved",
          description: "Your landing page has been updated.",
        });
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save landing page settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-pulse text-stone-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <Separator orientation="vertical" className="h-6" />
            <h1 className="text-xl font-serif text-stone-800">Landing Page Editor</h1>
          </div>
          <div className="flex items-center gap-3">
            {tenantSlug && (
              <a href={`/coop/${tenantSlug}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" data-testid="button-preview">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                  <ExternalLink className="w-3 h-3 ml-2" />
                </Button>
              </a>
            )}
            <Button onClick={handleSave} disabled={saving} data-testid="button-save">
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layout className="w-5 h-5" />
                  Layout Template
                </CardTitle>
                <CardDescription>
                  Choose how your landing page is styled
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: "CLASSIC", label: "Classic", desc: "Warm, welcoming with full-width hero" },
                    { id: "MODERN", label: "Modern", desc: "Bold imagery with spacious layout" },
                    { id: "MINIMAL", label: "Minimal", desc: "Refined, text-focused simplicity" },
                  ].map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setLayoutTemplate(template.id as "CLASSIC" | "MODERN" | "MINIMAL")}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        layoutTemplate === template.id
                          ? "border-stone-800 bg-stone-50"
                          : "border-stone-200 hover:border-stone-300"
                      }`}
                      data-testid={`button-layout-${template.id.toLowerCase()}`}
                    >
                      <p className="font-medium text-stone-800">{template.label}</p>
                      <p className="text-xs text-stone-500 mt-1">{template.desc}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  Header Image
                </CardTitle>
                <CardDescription>
                  Choose a stock image or provide a custom URL
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Select a Theme Image</Label>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    {STOCK_HEADER_IMAGES.map((img) => (
                      <button
                        key={img.id}
                        onClick={() => {
                          setHeaderImageTheme(img.id);
                          setHeaderImageUrl("");
                        }}
                        className={`relative overflow-hidden rounded-lg border-2 transition-all ${
                          headerImageTheme === img.id && !headerImageUrl
                            ? "border-stone-800 ring-2 ring-stone-800 ring-offset-2"
                            : "border-stone-200 hover:border-stone-300"
                        }`}
                        data-testid={`button-image-${img.id}`}
                      >
                        <img src={img.url} alt={img.label} className="w-full h-20 object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                          <span className="text-xs text-white">{img.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="headerUrl">Or enter a custom image URL</Label>
                  <input
                    id="headerUrl"
                    type="text"
                    value={headerImageUrl}
                    onChange={(e) => setHeaderImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full mt-1 px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                    data-testid="input-header-url"
                  />
                  <p className="text-xs text-stone-500 mt-1">Custom URL will override the selected theme image</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Content Sections
                </CardTitle>
                <CardDescription>
                  Add information about your co-op
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="about">About Us</Label>
                  <Textarea
                    id="about"
                    value={aboutContent}
                    onChange={(e) => setAboutContent(e.target.value)}
                    placeholder="Tell families about your co-op, your mission, and what makes you special..."
                    className="mt-1 min-h-[120px]"
                    data-testid="textarea-about"
                  />
                  <p className="text-xs text-stone-500 mt-1">This appears prominently on your landing page</p>
                </div>
                <div>
                  <Label htmlFor="pricing">Membership & Pricing (Optional)</Label>
                  <Textarea
                    id="pricing"
                    value={pricingContent}
                    onChange={(e) => setPricingContent(e.target.value)}
                    placeholder="Describe your membership fees, payment schedules, or pricing tiers..."
                    className="mt-1 min-h-[100px]"
                    data-testid="textarea-pricing"
                  />
                  <p className="text-xs text-stone-500 mt-1">Leave empty to hide this section</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="w-5 h-5" />
                  Display Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Public Classes</Label>
                    <p className="text-xs text-stone-500">Display your published classes</p>
                  </div>
                  <Switch
                    checked={showPublicClasses}
                    onCheckedChange={setShowPublicClasses}
                    data-testid="switch-classes"
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Public Events</Label>
                    <p className="text-xs text-stone-500">Display upcoming events</p>
                  </div>
                  <Switch
                    checked={showPublicEvents}
                    onCheckedChange={setShowPublicEvents}
                    data-testid="switch-events"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-stone-100 border-stone-200">
              <CardHeader>
                <CardTitle className="text-base">Design Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-stone-600">
                <p>
                  <strong>Classic layout</strong> — Warm hero image with centered content. Perfect for welcoming new families.
                </p>
                <p>
                  <strong>Modern layout</strong> — Spacious, editorial feel with generous breathing room. Great for making an impression.
                </p>
                <p>
                  <strong>Minimal layout</strong> — Refined simplicity with focus on your message. Ideal for smaller, intimate co-ops.
                </p>
                <p className="pt-2 text-xs text-stone-500">
                  All layouts use a calm, nature-inspired color palette with warm copper accents and soft sage greens.
                </p>
              </CardContent>
            </Card>

            {tenantSlug && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Your Public Page</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-stone-600 mb-3">
                    Share this link with prospective families:
                  </p>
                  <div className="bg-white border border-stone-200 rounded px-3 py-2 text-sm font-mono text-stone-700 break-all">
                    {window.location.origin}/coop/{tenantSlug}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
