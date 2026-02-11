import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, Calendar, DollarSign, TrendingUp, ArrowRight, AlertCircle, GraduationCap } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface DashboardData {
  totalFamilies: number;
  totalInstructors: number;
  totalClasses: number;
  totalEvents: number;
  pendingFamilies: number;
  pendingInstructors: number;
  pendingClassProposals: number;
  pendingEventProposals: number;
  totalRevenue: number;
  recentPayments: Array<{
    id: string;
    user: { firstName: string; lastName: string };
    amount: number;
    description?: string;
    createdAt: string;
  }>;
}

export default function TenantDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setLoading(true);
    apiFetch<DashboardData>("/api/tenant/dashboard").then(({ data, error }) => {
      setError(error);
      setData(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading dashboard...</div>
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

  if (!data) {
    return (
      <>
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Unable to load dashboard data</div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-serif font-bold tracking-tight text-foreground">Dashboard</h2>
          <p className="text-muted-foreground mt-2">Welcome back! Here's what's happening at your co-op.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Families</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-serif" data-testid="text-total-families">{data.totalFamilies}</div>
              <p className="text-xs text-muted-foreground">Active members</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Classes</CardTitle>
              <BookOpen className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-serif" data-testid="text-total-classes">{data.totalClasses}</div>
              <p className="text-xs text-muted-foreground">This semester</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Events</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-serif" data-testid="text-total-events">{data.totalEvents}</div>
              <p className="text-xs text-muted-foreground">Scheduled</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-serif" data-testid="text-total-revenue">${(data.totalRevenue / 100).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/app/admin/families">
            <Card 
              className={`cursor-pointer hover:shadow-md transition-shadow ${
                data.pendingFamilies > 0 
                  ? "border-amber-200 bg-amber-50" 
                  : "border-stone-200 bg-stone-50"
              }`} 
              data-testid="card-pending-families"
            >
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                    data.pendingFamilies > 0 ? "bg-amber-100" : "bg-stone-100"
                  }`}>
                    <Users className={`h-6 w-6 ${
                      data.pendingFamilies > 0 ? "text-amber-600" : "text-stone-400"
                    }`} />
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${
                      data.pendingFamilies > 0 ? "text-amber-800" : "text-stone-500"
                    }`}>{data.pendingFamilies}</div>
                    <p className={`text-sm ${
                      data.pendingFamilies > 0 ? "text-amber-600" : "text-stone-400"
                    }`}>
                      {data.pendingFamilies > 0 ? "Pending Family Applications" : "No pending families"}
                    </p>
                  </div>
                </div>
                <ArrowRight className={`h-5 w-5 ${
                  data.pendingFamilies > 0 ? "text-amber-600" : "text-stone-400"
                }`} />
              </CardContent>
            </Card>
          </Link>

          <Link href="/app/admin/instructors">
            <Card 
              className={`cursor-pointer hover:shadow-md transition-shadow ${
                data.pendingInstructors > 0 
                  ? "border-blue-200 bg-blue-50" 
                  : "border-stone-200 bg-stone-50"
              }`} 
              data-testid="card-pending-instructors"
            >
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                    data.pendingInstructors > 0 ? "bg-blue-100" : "bg-stone-100"
                  }`}>
                    <GraduationCap className={`h-6 w-6 ${
                      data.pendingInstructors > 0 ? "text-blue-600" : "text-stone-400"
                    }`} />
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${
                      data.pendingInstructors > 0 ? "text-blue-800" : "text-stone-500"
                    }`}>{data.pendingInstructors}</div>
                    <p className={`text-sm ${
                      data.pendingInstructors > 0 ? "text-blue-600" : "text-stone-400"
                    }`}>
                      {data.pendingInstructors > 0 ? "Pending Instructor Applications" : "No pending instructors"}
                    </p>
                  </div>
                </div>
                <ArrowRight className={`h-5 w-5 ${
                  data.pendingInstructors > 0 ? "text-blue-600" : "text-stone-400"
                }`} />
              </CardContent>
            </Card>
          </Link>

          <Link href="/app/admin/classes">
            <Card 
              className={`cursor-pointer hover:shadow-md transition-shadow ${
                data.pendingClassProposals > 0 
                  ? "border-purple-200 bg-purple-50" 
                  : "border-stone-200 bg-stone-50"
              }`} 
              data-testid="card-pending-classes"
            >
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                    data.pendingClassProposals > 0 ? "bg-purple-100" : "bg-stone-100"
                  }`}>
                    <BookOpen className={`h-6 w-6 ${
                      data.pendingClassProposals > 0 ? "text-purple-600" : "text-stone-400"
                    }`} />
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${
                      data.pendingClassProposals > 0 ? "text-purple-800" : "text-stone-500"
                    }`}>{data.pendingClassProposals}</div>
                    <p className={`text-sm ${
                      data.pendingClassProposals > 0 ? "text-purple-600" : "text-stone-400"
                    }`}>
                      {data.pendingClassProposals > 0 ? "Pending Class Proposals" : "No pending classes"}
                    </p>
                  </div>
                </div>
                <ArrowRight className={`h-5 w-5 ${
                  data.pendingClassProposals > 0 ? "text-purple-600" : "text-stone-400"
                }`} />
              </CardContent>
            </Card>
          </Link>

          <Link href="/app/admin/events">
            <Card 
              className={`cursor-pointer hover:shadow-md transition-shadow ${
                data.pendingEventProposals > 0 
                  ? "border-teal-200 bg-teal-50" 
                  : "border-stone-200 bg-stone-50"
              }`} 
              data-testid="card-pending-events"
            >
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                    data.pendingEventProposals > 0 ? "bg-teal-100" : "bg-stone-100"
                  }`}>
                    <Calendar className={`h-6 w-6 ${
                      data.pendingEventProposals > 0 ? "text-teal-600" : "text-stone-400"
                    }`} />
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${
                      data.pendingEventProposals > 0 ? "text-teal-800" : "text-stone-500"
                    }`}>{data.pendingEventProposals}</div>
                    <p className={`text-sm ${
                      data.pendingEventProposals > 0 ? "text-teal-600" : "text-stone-400"
                    }`}>
                      {data.pendingEventProposals > 0 ? "Pending Event Proposals" : "No pending events"}
                    </p>
                  </div>
                </div>
                <ArrowRight className={`h-5 w-5 ${
                  data.pendingEventProposals > 0 ? "text-teal-600" : "text-stone-400"
                }`} />
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Recent Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments yet</p>
              ) : (
                <div className="space-y-4">
                  {data.recentPayments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{payment.user.firstName} {payment.user.lastName}</p>
                        <p className="text-xs text-muted-foreground">{payment.description || "Payment"}</p>
                      </div>
                      <div className="text-sm font-medium text-green-600">
                        +${(payment.amount / 100).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Instructors</span>
                  <span className="font-medium">{data.totalInstructors}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pending Families</span>
                  <span className="font-medium text-amber-600">{data.pendingFamilies}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pending Instructors</span>
                  <span className="font-medium text-blue-600">{data.pendingInstructors}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pending Classes</span>
                  <span className="font-medium text-purple-600">{data.pendingClassProposals}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pending Events</span>
                  <span className="font-medium text-teal-600">{data.pendingEventProposals}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Classes Running</span>
                  <span className="font-medium">{data.totalClasses}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
