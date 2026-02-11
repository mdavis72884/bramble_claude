import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  FileText, Clock, CheckCircle, XCircle, ArrowRight, Users, MapPin 
} from "lucide-react";
import { useAuth } from "@/lib/auth";

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

export default function ApplicationsPage() {
  const { token } = useAuth();
  const [applications, setApplications] = useState<CoopApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("PENDING");

  useEffect(() => {
    if (token) {
      fetchApplications();
    }
  }, [filter, token]);

  const fetchApplications = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/coop-applications?status=${filter}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      setApplications(data.applications || []);
    } catch (error) {
      console.error("Failed to fetch applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="w-3 h-3 mr-1" />
            Pending
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
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const pendingCount = applications.filter(a => a.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900" data-testid="text-page-title">
          Co-op Applications
        </h1>
        <p className="text-slate-500">
          Review and manage applications from co-ops wanting to join Bramble.
        </p>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="PENDING" className="relative">
            Pending
            {filter !== "PENDING" && pendingCount > 0 && (
              <span className="ml-2 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="APPROVED">Approved</TabsTrigger>
          <TabsTrigger value="DENIED">Denied</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {filter === "all" ? "All Applications" : `${filter.charAt(0) + filter.slice(1).toLowerCase()} Applications`}
              </CardTitle>
              <CardDescription>
                {filter === "PENDING" 
                  ? "Applications awaiting your review"
                  : filter === "APPROVED"
                  ? "Approved co-ops that have been set up"
                  : filter === "DENIED"
                  ? "Applications that were not approved"
                  : "All co-op applications"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-slate-400">Loading...</div>
              ) : applications.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No applications found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Co-op Name</TableHead>
                      <TableHead>Applicant</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.map((app) => (
                      <TableRow key={app.id} data-testid={`row-application-${app.id}`}>
                        <TableCell className="font-medium">{app.coopName}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{app.applicantName}</div>
                            <div className="text-sm text-slate-500">{app.applicantEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {app.location ? (
                            <span className="flex items-center gap-1 text-slate-600">
                              <MapPin className="w-3 h-3" />
                              {app.location}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {app.estimatedSize ? (
                            <span className="flex items-center gap-1 text-slate-600">
                              <Users className="w-3 h-3" />
                              {app.estimatedSize}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>{statusBadge(app.status)}</TableCell>
                        <TableCell className="text-slate-600">
                          {formatDate(app.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Link href={`/operator/applications/${app.id}`}>
                            <Button variant="ghost" size="sm">
                              Review
                              <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
