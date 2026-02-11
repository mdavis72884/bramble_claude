import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, Clock, CheckCircle, XCircle, Building2, User, Mail, 
  Phone, MapPin, Users, FileText, Calendar, Loader2, ExternalLink, Send
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface CoopApplication {
  id: string;
  status: "PENDING" | "APPROVED" | "DENIED";
  coopName: string;
  location: string | null;
  description: string | null;
  estimatedSize: string | null;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string | null;
  whyStartingCoop: string | null;
  operatorNotes: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdTenantId: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ApplicationReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { token } = useAuth();
  const { toast } = useToast();
  
  const [application, setApplication] = useState<CoopApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (token) {
      fetchApplication();
    }
  }, [id, token]);

  const fetchApplication = async () => {
    if (!token) return;
    try {
      const response = await fetch(`/api/coop-applications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setApplication(data.application);
        setNotes(data.application.operatorNotes || "");
      }
    } catch (error) {
      console.error("Failed to fetch application:", error);
    } finally {
      setLoading(false);
    }
  };

  const openEmailDialog = () => {
    if (application) {
      setEmailSubject(`Question about your ${application.coopName} application on Bramble`);
      setEmailBody("");
      setEmailDialogOpen(true);
    }
  };

  const sendEmail = async () => {
    if (!emailSubject || !emailBody) {
      toast({
        title: "Error",
        description: "Please enter both a subject and message",
        variant: "destructive",
      });
      return;
    }
    
    setSendingEmail(true);
    try {
      const response = await fetch(`/api/coop-applications/${id}/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subject: emailSubject, body: emailBody }),
      });

      if (response.ok) {
        toast({
          title: "Email Sent",
          description: `Your message was sent to ${application?.applicantEmail}`,
        });
        setEmailDialogOpen(false);
        setEmailSubject("");
        setEmailBody("");
      } else {
        throw new Error("Failed to send email");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleAction = async (status: "APPROVED" | "DENIED") => {
    setProcessing(true);
    try {
      const response = await fetch(`/api/coop-applications/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, operatorNotes: notes }),
      });

      if (response.ok) {
        const data = await response.json();
        setApplication(data.application);
        toast({
          title: status === "APPROVED" ? "Application Approved" : "Application Denied",
          description: status === "APPROVED" 
            ? `${application?.coopName} has been set up. A magic link was sent to ${application?.applicantEmail}.`
            : `The application has been denied.`,
        });
      } else {
        throw new Error("Failed to update application");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process the application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="w-3 h-3 mr-1" />
            Pending Review
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "DENIED":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Denied
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Application not found</p>
        <Link href="/operator/applications">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Applications
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/operator/applications">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-slate-900" data-testid="text-page-title">
            {application.coopName}
          </h1>
          <p className="text-slate-500">Application Review</p>
        </div>
        {statusBadge(application.status)}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Co-op Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Co-op Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-500">Co-op Name</Label>
                  <p className="font-medium">{application.coopName}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Location</Label>
                  <p className="font-medium flex items-center gap-1">
                    {application.location ? (
                      <>
                        <MapPin className="w-4 h-4 text-slate-400" />
                        {application.location}
                      </>
                    ) : (
                      <span className="text-slate-400">Not provided</span>
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-slate-500">Estimated Size</Label>
                  <p className="font-medium flex items-center gap-1">
                    {application.estimatedSize ? (
                      <>
                        <Users className="w-4 h-4 text-slate-400" />
                        {application.estimatedSize} families
                      </>
                    ) : (
                      <span className="text-slate-400">Not provided</span>
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-slate-500">Submitted</Label>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {formatDate(application.createdAt)}
                  </p>
                </div>
              </div>

              {application.description && (
                <div>
                  <Label className="text-slate-500">Description</Label>
                  <p className="mt-1 text-slate-700 whitespace-pre-wrap">
                    {application.description}
                  </p>
                </div>
              )}

              {application.whyStartingCoop && (
                <div>
                  <Label className="text-slate-500">Why They're Starting This Co-op</Label>
                  <p className="mt-1 text-slate-700 whitespace-pre-wrap">
                    {application.whyStartingCoop}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Applicant Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5" />
                Applicant Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-500">Name</Label>
                  <p className="font-medium">{application.applicantName}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Email</Label>
                  <p className="font-medium flex items-center gap-1">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <a 
                      href={`mailto:${application.applicantEmail}`}
                      className="text-blue-600 hover:underline"
                    >
                      {application.applicantEmail}
                    </a>
                  </p>
                </div>
                {application.applicantPhone && (
                  <div>
                    <Label className="text-slate-500">Phone</Label>
                    <p className="font-medium flex items-center gap-1">
                      <Phone className="w-4 h-4 text-slate-400" />
                      {application.applicantPhone}
                    </p>
                  </div>
                )}
              </div>
              <div className="pt-2 border-t">
                <Button
                  variant="secondary"
                  onClick={openEmailDialog}
                  data-testid="button-email-applicant"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email Applicant
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          {application.status === "PENDING" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Review Actions</CardTitle>
                <CardDescription>
                  Approve or deny this application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="notes">Internal Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add notes about this application..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    data-testid="input-notes"
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        className="w-full bg-[#7C9082] hover:bg-[#6a7d70]"
                        disabled={processing}
                        data-testid="button-approve"
                      >
                        {processing ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        Approve Application
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Approve Application?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will:
                          <ul className="list-disc pl-4 mt-2 space-y-1">
                            <li>Create a new tenant for "{application.coopName}"</li>
                            <li>Set up {application.applicantName} as the Co-op Admin</li>
                            <li>Send a magic login link to {application.applicantEmail}</li>
                          </ul>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleAction("APPROVED")}
                          className="bg-[#7C9082] hover:bg-[#6a7d70]"
                        >
                          Approve
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full text-red-600 border-red-200 hover:bg-red-50"
                        disabled={processing}
                        data-testid="button-deny"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Deny Application
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Deny Application?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will mark the application as denied. The applicant will not be notified automatically.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleAction("DENIED")}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Deny
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Info */}
          {application.status !== "PENDING" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Review Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-slate-500">Status</Label>
                  <div className="mt-1">{statusBadge(application.status)}</div>
                </div>

                {application.reviewedAt && (
                  <div>
                    <Label className="text-slate-500">Reviewed</Label>
                    <p className="text-sm">{formatDate(application.reviewedAt)}</p>
                  </div>
                )}

                {application.operatorNotes && (
                  <div>
                    <Label className="text-slate-500">Notes</Label>
                    <p className="text-sm mt-1 whitespace-pre-wrap">
                      {application.operatorNotes}
                    </p>
                  </div>
                )}

                {application.status === "APPROVED" && application.createdTenantId && (
                  <div className="pt-2">
                    <Link href={`/operator/tenants/${application.createdTenantId}`}>
                      <Button variant="outline" className="w-full">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Tenant
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Email Applicant</DialogTitle>
            <DialogDescription>
              Send a message to {application?.applicantName} ({application?.applicantEmail})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Enter subject..."
                data-testid="input-email-subject"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-body">Message</Label>
              <Textarea
                id="email-body"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Type your message here..."
                rows={6}
                data-testid="input-email-body"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={sendEmail} 
              disabled={sendingEmail || !emailSubject || !emailBody}
              className="bg-[#7C9082] hover:bg-[#6a7d70]"
              data-testid="button-send-email"
            >
              {sendingEmail ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {sendingEmail ? "Sending..." : "Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
