import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, X, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChildInput {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
}

export default function Apply() {
  const { slug, role } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [children, setChildren] = useState<ChildInput[]>([{ firstName: "", lastName: "", dateOfBirth: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const isFamily = role === "family";
  const isInstructor = role === "instructor";

  const addChild = () => {
    setChildren([...children, { firstName: "", lastName: "", dateOfBirth: "" }]);
  };

  const removeChild = (index: number) => {
    if (children.length > 1) {
      setChildren(children.filter((_, i) => i !== index));
    }
  };

  const updateChild = (index: number, field: keyof ChildInput, value: string) => {
    const updated = [...children];
    updated[index][field] = value;
    setChildren(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const body: any = {
        email,
        password,
        firstName,
        lastName,
        phone: phone || null,
        role: isFamily ? "FAMILY" : "INSTRUCTOR",
      };

      if (isInstructor) {
        body.bio = bio;
      }

      if (isFamily) {
        body.children = children.filter(c => c.firstName && c.lastName);
      }

      const res = await fetch(`/api/t/${slug}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Application failed");
      }

      setSuccess(true);
    } catch (error: any) {
      toast({
        title: "Application Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-serif text-stone-800 mb-2">Application Submitted!</h2>
            <p className="text-stone-600 mb-6">
              Thank you for applying. You'll receive an email once your application has been reviewed.
            </p>
            <Button onClick={() => navigate(`/coop/${slug}`)} variant="outline">
              Return to Co-op Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-6">
      <div className="max-w-xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate(`/coop/${slug}`)}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Co-op
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-serif">
              {isFamily ? "Family Application" : "Instructor Application"}
            </CardTitle>
            <CardDescription>
              {isFamily 
                ? "Join this co-op as a family. Add your children below."
                : "Apply to teach at this co-op. Tell us about yourself."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    data-testid="input-first-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    data-testid="input-last-name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  data-testid="input-password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  data-testid="input-phone"
                />
              </div>

              {isInstructor && (
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio / Teaching Experience</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about your teaching background and expertise..."
                    rows={4}
                    data-testid="input-bio"
                  />
                </div>
              )}

              {isFamily && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Children</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addChild} data-testid="button-add-child">
                      <Plus className="w-4 h-4 mr-1" /> Add Child
                    </Button>
                  </div>
                  
                  {children.map((child, index) => (
                    <div key={index} className="border border-stone-200 rounded-lg p-4 relative" data-testid={`card-child-${index}`}>
                      {children.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeChild(index)}
                          className="absolute top-2 right-2 text-stone-400 hover:text-stone-600"
                          data-testid={`button-remove-child-${index}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <Label>First Name</Label>
                          <Input
                            value={child.firstName}
                            onChange={(e) => updateChild(index, "firstName", e.target.value)}
                            data-testid={`input-child-first-name-${index}`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Last Name</Label>
                          <Input
                            value={child.lastName}
                            onChange={(e) => updateChild(index, "lastName", e.target.value)}
                            data-testid={`input-child-last-name-${index}`}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Date of Birth (optional)</Label>
                        <Input
                          type="date"
                          value={child.dateOfBirth}
                          onChange={(e) => updateChild(index, "dateOfBirth", e.target.value)}
                          data-testid={`input-child-dob-${index}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={submitting} data-testid="button-submit">
                {submitting ? "Submitting..." : "Submit Application"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
