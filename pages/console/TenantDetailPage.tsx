import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ArrowLeft, 
  ExternalLink, 
  Mail, 
  ShieldCheck, 
  Building,
  Globe,
  Package,
  Eye,
  Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

interface TenantUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  applicationStatus: string;
  isActive: boolean;
}

interface TenantData {
  id: string;
  name: string;
  slug: string;
  status: string;
  directoryVisible: boolean;
  _count?: {
    users: number;
    classes: number;
    events: number;
    payments: number;
  };
}

export default function TenantDetailPage() {
  const [, params] = useRoute("/operator/tenants/:id");
  const { toast } = useToast();
  const { impersonate } = useAuth();
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const fetchTenant = async () => {
    if (!params?.id) return;
    const { data, error } = await apiFetch(`/api/tenants/${params.id}`);
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      setTenant(data.tenant);
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    if (!params?.id) return;
    setLoadingUsers(true);
    const { data, error } = await apiFetch(`/api/tenants/${params.id}/users`);
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      setUsers(data.users || []);
    }
    setLoadingUsers(false);
  };

  useEffect(() => {
    fetchTenant();
    fetchUsers();
  }, [params?.id]);

  const handleImpersonate = async (userId: string) => {
    try {
      await impersonate(userId);
      toast({ title: "Impersonation started", description: "You are now viewing as this user" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Loading...</div>;
  }

  if (!tenant) {
    return <div>Tenant not found</div>;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
             <Button variant="outline" size="icon" onClick={() => window.history.back()} data-testid="button-back">
               <ArrowLeft className="h-4 w-4" />
             </Button>
             <div>
               <div className="flex items-center gap-3">
                 <h2 className="text-3xl font-serif font-bold tracking-tight text-foreground">{tenant.name}</h2>
                 <Badge variant={tenant.status === "Active" || tenant.status === "ACTIVE" ? "default" : "secondary"}>{tenant.status}</Badge>
               </div>
               <p className="text-muted-foreground mt-1 flex items-center gap-2">
                 <Building className="h-4 w-4" /> {tenant.slug}.bramble.co
                 <ExternalLink className="h-3 w-3 opacity-50" />
               </p>
             </div>
          </div>
          <div className="flex gap-2">
            <a href={`/coop/${tenant.slug}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" data-testid="button-preview-landing">
                <Globe className="mr-2 h-4 w-4" /> Preview Landing Page
              </Button>
            </a>
            <Button variant="outline" data-testid="button-apply-starter">
              <Package className="mr-2 h-4 w-4" /> Apply Starter Pack
            </Button>
            <Button variant="outline" data-testid="button-contact-admin">
              <Mail className="mr-2 h-4 w-4" /> Contact Admin
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="billing">Billing & Fees</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
             <div className="grid gap-6 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-serif font-bold">{tenant._count?.users || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Classes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-serif font-bold">{tenant._count?.classes || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Events</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-serif font-bold">{tenant._count?.events || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Payments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-serif font-bold">{tenant._count?.payments || 0}</div>
                  </CardContent>
                </Card>
             </div>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Tenant Users
                </CardTitle>
                <CardDescription>View and manage users belonging to this co-op. Use "View As" to see the platform from their perspective.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <div className="py-8 text-center text-muted-foreground">Loading users...</div>
                ) : users.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">No users in this tenant yet.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                          <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
                          <TableCell className="text-muted-foreground">{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{user.role}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.isActive ? "default" : "secondary"}>
                              {user.isActive ? "Active" : user.applicationStatus || "Pending"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleImpersonate(user.id)}
                              data-testid={`button-impersonate-${user.id}`}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View As
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Platform Configuration</CardTitle>
                <CardDescription>Manage platform-level settings for this specific tenant.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-primary" />
                      <Label className="text-base">Directory Visibility</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Show this co-op in the public Bramble directory.
                    </p>
                  </div>
                  <Switch checked={tenant.directoryVisible !== false} />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                       <ShieldCheck className="h-4 w-4 text-primary" />
                       <Label className="text-base">Require Admin Approval</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      New families must be approved by a co-op admin before joining.
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

              </CardContent>
              <CardFooter className="bg-muted/20 border-t flex justify-end p-4">
                 <Button variant="ghost">Reset Defaults</Button>
                 <Button>Save Changes</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="billing">
            <Card>
              <CardHeader>
                <CardTitle>Billing & Fees</CardTitle>
                <CardDescription>View payment history and fee configuration for this tenant.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Billing details coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
