import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Palette, Type, Globe, Image, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";

const fontOptions = [
  { value: "Inter", label: "Inter (Modern Sans)" },
  { value: "Georgia", label: "Georgia (Classic Serif)" },
  { value: "Merriweather", label: "Merriweather (Readable Serif)" },
  { value: "Lato", label: "Lato (Friendly Sans)" },
  { value: "Playfair Display", label: "Playfair Display (Elegant Serif)" },
];

interface BrandingData {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  customDomain?: string;
}

export default function BrandingEditor() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [branding, setBranding] = useState({
    logoUrl: "",
    primaryColor: "#1e293b",
    secondaryColor: "#64748b",
    accentColor: "#0ea5e9",
    fontFamily: "Inter",
    customDomain: "",
  });

  useEffect(() => {
    setError(null);
    apiFetch<{ branding: BrandingData }>("/api/tenant/branding").then(({ data, error }) => {
      if (error) {
        setError(error);
      } else if (data?.branding) {
        setBranding({
          logoUrl: data.branding.logoUrl || "",
          primaryColor: data.branding.primaryColor || "#1e293b",
          secondaryColor: data.branding.secondaryColor || "#64748b",
          accentColor: data.branding.accentColor || "#0ea5e9",
          fontFamily: data.branding.fontFamily || "Inter",
          customDomain: data.branding.customDomain || "",
        });
        setError(null);
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await apiFetch("/api/tenant/branding", {
      method: "PATCH",
      body: JSON.stringify(branding),
    });

    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Branding updated" });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading branding...</div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="flex items-center justify-center py-12">
          <Card className="p-6 border-red-200 bg-red-50">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-800">{error}</p>
            </div>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-serif font-bold tracking-tight">Branding</h2>
            <p className="text-muted-foreground mt-1">Customize your co-op's visual identity.</p>
          </div>
          <Button onClick={handleSave} disabled={saving} data-testid="button-save-branding">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Logo
              </CardTitle>
              <CardDescription>Upload your co-op's logo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Logo URL</label>
                <Input
                  placeholder="https://example.com/logo.png"
                  value={branding.logoUrl}
                  onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                  data-testid="input-logo-url"
                />
              </div>
              {branding.logoUrl && (
                <div className="p-4 bg-muted rounded-lg">
                  <img src={branding.logoUrl} alt="Logo preview" className="max-h-20 object-contain" />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Colors
              </CardTitle>
              <CardDescription>Choose your brand colors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Primary Color</label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={branding.primaryColor}
                    onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                    className="w-12 h-10 p-1"
                    data-testid="input-primary-color"
                  />
                  <Input
                    value={branding.primaryColor}
                    onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Secondary Color</label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={branding.secondaryColor}
                    onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                    className="w-12 h-10 p-1"
                    data-testid="input-secondary-color"
                  />
                  <Input
                    value={branding.secondaryColor}
                    onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Accent Color</label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={branding.accentColor}
                    onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                    className="w-12 h-10 p-1"
                    data-testid="input-accent-color"
                  />
                  <Input
                    value={branding.accentColor}
                    onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                Typography
              </CardTitle>
              <CardDescription>Choose your font family</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <label className="text-sm font-medium">Font Family</label>
                <Select value={branding.fontFamily} onValueChange={(value) => setBranding({ ...branding, fontFamily: value })}>
                  <SelectTrigger data-testid="select-font-family">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontOptions.map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        {font.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p style={{ fontFamily: branding.fontFamily }} className="text-lg font-semibold">
                  Preview Text
                </p>
                <p style={{ fontFamily: branding.fontFamily }} className="text-sm text-muted-foreground">
                  The quick brown fox jumps over the lazy dog.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Custom Domain
              </CardTitle>
              <CardDescription>Use your own domain name</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <label className="text-sm font-medium">Custom Domain</label>
                <Input
                  placeholder="coop.yourdomain.com"
                  value={branding.customDomain}
                  onChange={(e) => setBranding({ ...branding, customDomain: e.target.value })}
                  data-testid="input-custom-domain"
                />
                <p className="text-xs text-muted-foreground">Contact support to set up your custom domain.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
