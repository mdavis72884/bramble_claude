import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Leaf, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FormData {
  coopName: string;
  location: string;
  description: string;
  estimatedSize: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  whyStartingCoop: string;
}

const initialFormData: FormData = {
  coopName: "",
  location: "",
  description: "",
  estimatedSize: "",
  applicantName: "",
  applicantEmail: "",
  applicantPhone: "",
  whyStartingCoop: "",
};

export default function StartCoop() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};
    
    if (!formData.coopName.trim()) {
      newErrors.coopName = "Co-op name is required";
    }
    if (!formData.applicantName.trim()) {
      newErrors.applicantName = "Your name is required";
    }
    if (!formData.applicantEmail.trim()) {
      newErrors.applicantEmail = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.applicantEmail)) {
      newErrors.applicantEmail = "Please enter a valid email";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkDuplicates = async () => {
    try {
      const response = await fetch(`/api/coop-applications/check-duplicates?email=${encodeURIComponent(formData.applicantEmail)}&name=${encodeURIComponent(formData.coopName)}`);
      const data = await response.json();
      
      if (data.emailExists) {
        setErrors(prev => ({ ...prev, applicantEmail: "An application with this email already exists" }));
        return false;
      }
      
      if (data.nameExists) {
        setDuplicateWarning(`A co-op with a similar name "${data.similarName}" already exists. You can still submit if this is a different co-op.`);
      } else {
        setDuplicateWarning(null);
      }
      
      return !data.emailExists;
    } catch {
      return true;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitting(true);
    
    const canSubmit = await checkDuplicates();
    if (!canSubmit) {
      setSubmitting(false);
      return;
    }
    
    try {
      const response = await fetch("/api/coop-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to submit application");
      }
      
      setSubmitted(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 bg-[#7C9082]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-[#7C9082]" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-stone-800 mb-2">
              Application Received!
            </h2>
            <p className="text-stone-600 mb-6">
              Thank you for applying to start <strong>{formData.coopName}</strong>. We'll review your application and get back to you at <strong>{formData.applicantEmail}</strong> within a few business days.
            </p>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

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

      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center text-stone-600 hover:text-stone-800 mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-serif">Start a Co-op</CardTitle>
            <CardDescription>
              Tell us about the homeschool co-op you'd like to create. We'll review your application and help you get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Co-op Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-stone-800">Co-op Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="coopName">Co-op Name *</Label>
                  <Input
                    id="coopName"
                    placeholder="e.g., Oak Hollow Homeschool Co-op"
                    value={formData.coopName}
                    onChange={(e) => handleChange("coopName", e.target.value)}
                    className={errors.coopName ? "border-red-500" : ""}
                    data-testid="input-coop-name"
                  />
                  {errors.coopName && (
                    <p className="text-sm text-red-600">{errors.coopName}</p>
                  )}
                  {duplicateWarning && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-amber-800">{duplicateWarning}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location (City, State)</Label>
                  <Input
                    id="location"
                    placeholder="e.g., Austin, TX"
                    value={formData.location}
                    onChange={(e) => handleChange("location", e.target.value)}
                    data-testid="input-location"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Tell us about your co-op's mission, focus, or philosophy..."
                    value={formData.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    rows={3}
                    data-testid="input-description"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimatedSize">Estimated Size</Label>
                  <Select
                    value={formData.estimatedSize}
                    onValueChange={(value) => handleChange("estimatedSize", value)}
                  >
                    <SelectTrigger data-testid="select-size">
                      <SelectValue placeholder="How many families do you expect?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1-10 families</SelectItem>
                      <SelectItem value="11-25">11-25 families</SelectItem>
                      <SelectItem value="26-50">26-50 families</SelectItem>
                      <SelectItem value="51-100">51-100 families</SelectItem>
                      <SelectItem value="100+">100+ families</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Applicant Information */}
              <div className="space-y-4 pt-4 border-t border-stone-200">
                <h3 className="font-medium text-stone-800">Your Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="applicantName">Your Name *</Label>
                  <Input
                    id="applicantName"
                    placeholder="Full name"
                    value={formData.applicantName}
                    onChange={(e) => handleChange("applicantName", e.target.value)}
                    className={errors.applicantName ? "border-red-500" : ""}
                    data-testid="input-applicant-name"
                  />
                  {errors.applicantName && (
                    <p className="text-sm text-red-600">{errors.applicantName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="applicantEmail">Email Address *</Label>
                  <Input
                    id="applicantEmail"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.applicantEmail}
                    onChange={(e) => handleChange("applicantEmail", e.target.value)}
                    className={errors.applicantEmail ? "border-red-500" : ""}
                    data-testid="input-applicant-email"
                  />
                  {errors.applicantEmail && (
                    <p className="text-sm text-red-600">{errors.applicantEmail}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="applicantPhone">Phone Number (optional)</Label>
                  <Input
                    id="applicantPhone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={formData.applicantPhone}
                    onChange={(e) => handleChange("applicantPhone", e.target.value)}
                    data-testid="input-applicant-phone"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whyStartingCoop">Why are you starting this co-op? (optional)</Label>
                  <Textarea
                    id="whyStartingCoop"
                    placeholder="Share your vision or motivation..."
                    value={formData.whyStartingCoop}
                    onChange={(e) => handleChange("whyStartingCoop", e.target.value)}
                    rows={3}
                    data-testid="input-why"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#7C9082] hover:bg-[#6a7d70]"
                disabled={submitting}
                data-testid="button-submit"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Application"
                )}
              </Button>

              <p className="text-xs text-stone-500 text-center">
                By submitting this application, you agree to our{" "}
                <Link href="/terms" className="underline hover:text-stone-700">Terms of Service</Link>
                {" "}and{" "}
                <Link href="/privacy" className="underline hover:text-stone-700">Privacy Policy</Link>.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
