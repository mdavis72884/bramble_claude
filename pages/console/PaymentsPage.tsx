import { recentTransactions, payouts } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

export default function PaymentsPage() {
  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-serif font-bold tracking-tight text-foreground">Payments</h2>
          <p className="text-muted-foreground mt-2">Global transaction history and payouts.</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Tabs defaultValue="transactions" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>
                Real-time feed of all platform transactions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{tx.id}</TableCell>
                      <TableCell className="text-sm">{format(new Date(tx.date), "MMM d, yyyy")}</TableCell>
                      <TableCell className="font-medium">{tx.description}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{tx.tenant}</TableCell>
                      <TableCell className={tx.amount < 0 ? "text-destructive" : ""}>
                        {tx.amount > 0 ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          tx.status === "Succeeded" ? "border-green-200 text-green-700 bg-green-50" : 
                          tx.status === "Refunded" ? "border-orange-200 text-orange-700 bg-orange-50" : ""
                        }>
                          {tx.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Payouts</CardTitle>
              <CardDescription>
                Automated transfers to co-ops and instructors.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payout ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{po.id}</TableCell>
                      <TableCell className="text-sm">{format(new Date(po.date), "MMM d, yyyy")}</TableCell>
                      <TableCell className="font-medium">{po.recipient}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{po.method}</TableCell>
                      <TableCell>${po.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex items-center text-green-700 text-xs font-medium">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          {po.status}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                         {po.status !== "Paid" && (
                           <Button size="sm" variant="outline">Mark Paid</Button>
                         )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
