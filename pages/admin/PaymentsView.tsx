import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, TrendingUp, CreditCard, RefreshCcw, ArrowDownLeft, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";

interface OverviewData {
  grossRevenue: number;
  brambleFees: number;
  instructorPayouts: number;
  coopRevenue: number;
}

interface OrderData {
  id: string;
  user: { firstName: string; lastName: string; email: string };
  amount: number;
  status: string;
  description?: string;
  createdAt: string;
}

export default function PaymentsView() {
  const { toast } = useToast();
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchData = async () => {
    setError(null);
    const [overviewRes, ordersRes] = await Promise.all([
      apiFetch<OverviewData>("/api/tenant/payments/overview"),
      apiFetch<{ orders: OrderData[] }>("/api/tenant/payments/orders"),
    ]);

    if (overviewRes.error || ordersRes.error) {
      setError(overviewRes.error || ordersRes.error);
    } else {
      setOverview(overviewRes.data);
      setOrders(ordersRes.data?.orders || []);
      setError(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openRefundDialog = (paymentId: string) => {
    setSelectedPayment(paymentId);
    setIsRefundDialogOpen(true);
  };

  const processRefund = async () => {
    if (!selectedPayment) return;

    setProcessing(true);
    const { error } = await apiFetch(`/api/tenant/payments/${selectedPayment}/refund`, {
      method: "POST",
      body: JSON.stringify({ reason: refundReason }),
    });

    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      fetchData();
      toast({ title: "Success", description: "Refund processed" });
    }
    setProcessing(false);
    setIsRefundDialogOpen(false);
    setRefundReason("");
  };

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading payments...</div>
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
        <div>
          <h2 className="text-3xl font-serif font-bold tracking-tight">Payments</h2>
          <p className="text-muted-foreground mt-1">View revenue, orders, and manage refunds.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Gross Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-serif text-green-600" data-testid="text-gross-revenue">
                ${((overview?.grossRevenue || 0) / 100).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Total collected</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Platform Fees</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-serif" data-testid="text-platform-fees">
                ${((overview?.brambleFees || 0) / 100).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">2.5% + processing</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Instructor Payouts</CardTitle>
              <ArrowDownLeft className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-serif" data-testid="text-instructor-payouts">
                ${((overview?.instructorPayouts || 0) / 100).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Paid to instructors</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Co-op Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-serif text-primary" data-testid="text-coop-revenue">
                ${((overview?.coopRevenue || 0) / 100).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Your net revenue</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="refunds">Refunds</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                {orders.length === 0 ? (
                  <p className="p-8 text-center text-muted-foreground">No orders yet</p>
                ) : (
                  <table className="w-full">
                    <thead className="border-b">
                      <tr className="text-left text-sm text-muted-foreground">
                        <th className="p-4 font-medium">Customer</th>
                        <th className="p-4 font-medium">Description</th>
                        <th className="p-4 font-medium">Amount</th>
                        <th className="p-4 font-medium">Status</th>
                        <th className="p-4 font-medium">Date</th>
                        <th className="p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id} className="border-b last:border-0">
                          <td className="p-4">
                            <div>
                              <p className="font-medium" data-testid={`text-order-customer-${order.id}`}>
                                {order.user.firstName} {order.user.lastName}
                              </p>
                              <p className="text-sm text-muted-foreground">{order.user.email}</p>
                            </div>
                          </td>
                          <td className="p-4 text-sm">{order.description || "Payment"}</td>
                          <td className="p-4 font-medium">${(order.amount / 100).toFixed(2)}</td>
                          <td className="p-4">
                            <Badge
                              variant={
                                order.status === "SUCCEEDED" ? "default" : order.status === "PENDING" ? "secondary" : "destructive"
                              }
                            >
                              {order.status}
                            </Badge>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">{format(new Date(order.createdAt), "MMM d, yyyy")}</td>
                          <td className="p-4">
                            {order.status === "SUCCEEDED" && (
                              <Button variant="ghost" size="sm" onClick={() => openRefundDialog(order.id)} data-testid={`button-refund-${order.id}`}>
                                <RefreshCcw className="h-4 w-4 mr-1" />
                                Refund
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="refunds" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {orders.filter((o) => o.status === "REFUNDED").length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No refunds processed</p>
                  ) : (
                    orders
                      .filter((o) => o.status === "REFUNDED")
                      .map((order) => (
                        <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">
                              {order.user.firstName} {order.user.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">{order.description || "Payment"}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-red-600">-${(order.amount / 100).toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(order.createdAt), "MMM d, yyyy")}</p>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Process Refund</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                This will process a manual refund. The original payment will be marked as refunded.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason for refund</label>
                <Textarea
                  placeholder="Enter the reason for this refund..."
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  rows={3}
                  data-testid="input-refund-reason"
                />
              </div>
              <Button className="w-full" variant="destructive" onClick={processRefund} disabled={processing} data-testid="button-confirm-refund">
                {processing ? "Processing..." : "Process Refund"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
