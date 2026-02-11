import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, DollarSign, Percent } from "lucide-react";

const mockFeeRules = [
  { id: "1", type: "Instructor Payout", value: "70%", description: "Standard instructor payout percentage" },
  { id: "2", type: "Co-op Revenue", value: "27.5%", description: "Co-op's share after platform fees" },
  { id: "3", type: "Materials Fee", value: "$15", description: "Flat fee for class materials" },
];

export default function FeeSettings() {
  const [feeRules, setFeeRules] = useState(mockFeeRules);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newRule, setNewRule] = useState({ type: "", value: "", description: "" });

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-serif font-bold tracking-tight">Fee Settings</h2>
            <p className="text-muted-foreground mt-1">Configure fee rules and instructor payouts.</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-fee-rule">
                <Plus className="h-4 w-4 mr-2" />
                Add Fee Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create Fee Rule</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rule Type</label>
                  <Input
                    placeholder="e.g., Instructor Payout"
                    value={newRule.type}
                    onChange={(e) => setNewRule({ ...newRule, type: e.target.value })}
                    data-testid="input-fee-type"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Value</label>
                  <Input
                    placeholder="e.g., 70% or $15"
                    value={newRule.value}
                    onChange={(e) => setNewRule({ ...newRule, value: e.target.value })}
                    data-testid="input-fee-value"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    placeholder="Describe this fee rule"
                    value={newRule.description}
                    onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                    data-testid="input-fee-description"
                  />
                </div>
                <Button className="w-full" onClick={() => setIsAddDialogOpen(false)} data-testid="button-save-fee-rule">
                  Create Rule
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Platform Fees (Set by Bramble)</CardTitle>
            <CardDescription>These fees are managed by the platform and cannot be modified.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Platform Fee</p>
                    <p className="text-sm text-muted-foreground">Bramble's service fee</p>
                  </div>
                </div>
                <span className="font-mono font-medium">2.5%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Payment Processing</p>
                    <p className="text-sm text-muted-foreground">Stripe processing fee</p>
                  </div>
                </div>
                <span className="font-mono font-medium">2.9% + $0.30</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Co-op Fee Rules</CardTitle>
            <CardDescription>Customize your co-op's fee structure and payout rules.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {feeRules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {rule.value.includes("%") ? (
                      <Percent className="h-4 w-4 text-primary" />
                    ) : (
                      <DollarSign className="h-4 w-4 text-primary" />
                    )}
                    <div>
                      <p className="font-medium" data-testid={`text-fee-type-${rule.id}`}>{rule.type}</p>
                      <p className="text-sm text-muted-foreground">{rule.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-medium" data-testid={`text-fee-value-${rule.id}`}>{rule.value}</span>
                    <Button variant="ghost" size="icon" data-testid={`button-edit-fee-${rule.id}`}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500" data-testid={`button-delete-fee-${rule.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
