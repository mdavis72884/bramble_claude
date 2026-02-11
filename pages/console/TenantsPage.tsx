import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, UserPlus, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

interface TenantUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  _count?: {
    users: number;
  };
}

export default function TenantsPage() {
  const { toast } = useToast();
  const { impersonate } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isViewAsOpen, setIsViewAsOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [selectedTenantName, setSelectedTenantName] = useState<string>("");
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  const [newTenant, setNewTenant] = useState({ name: "", slug: "" });
  const [adminInvite, setAdminInvite] = useState({ firstName: "", lastName: "", email: "" });

  const fetchTenants = async () => {
    const { data, error } = await apiFetch("/api/tenants");
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      setTenants(data.tenants || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const createTenant = async () => {
    if (!newTenant.name || !newTenant.slug) {
      toast({ title: "Error", description: "Name and slug are required", variant: "destructive" });
      return;
    }

    setCreating(true);
    const { error } = await apiFetch("/api/tenants", {
      method: "POST",
      body: JSON.stringify(newTenant),
    });

    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Tenant created successfully" });
      setNewTenant({ name: "", slug: "" });
      setIsCreateOpen(false);
      fetchTenants();
    }
    setCreating(false);
  };

  const inviteAdmin = async () => {
    if (!selectedTenantId || !adminInvite.firstName || !adminInvite.lastName || !adminInvite.email) {
      toast({ title: "Error", description: "All fields are required", variant: "destructive" });
      return;
    }

    setInviting(true);
    const { error } = await apiFetch(`/api/tenants/${selectedTenantId}/invite-admin`, {
      method: "POST",
      body: JSON.stringify(adminInvite),
    });

    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Admin invitation sent" });
      setAdminInvite({ firstName: "", lastName: "", email: "" });
      setIsInviteOpen(false);
      setSelectedTenantId(null);
    }
    setInviting(false);
  };

  const openInviteDialog = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    setIsInviteOpen(true);
  };

  const openViewAsDialog = async (tenantId: string, tenantName: string) => {
    setSelectedTenantId(tenantId);
    setSelectedTenantName(tenantName);
    setIsViewAsOpen(true);
    setLoadingUsers(true);
    
    const { data, error } = await apiFetch(`/api/tenants/${tenantId}/users`);
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      setTenantUsers(data.users || []);
    }
    setLoadingUsers(false);
  };

  const handleImpersonate = async (userId: string) => {
    try {
      await impersonate(userId);
      toast({ title: "Impersonation started", description: "You are now viewing as this user" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-serif font-bold tracking-tight text-foreground">Tenants</h2>
          <p className="text-muted-foreground mt-2">Manage co-op organizations on the platform.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-md" data-testid="button-new-tenant">
              <Plus className="mr-2 h-4 w-4" />
              New Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-serif">Create Tenant</DialogTitle>
              <DialogDescription>
                Add a new co-op to the platform.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Co-op Name *</Label>
                <Input 
                  id="name" 
                  placeholder="Oak Hollow Co-op"
                  value={newTenant.name}
                  onChange={(e) => {
                    setNewTenant({ 
                      name: e.target.value, 
                      slug: generateSlug(e.target.value)
                    });
                  }}
                  data-testid="input-tenant-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug *</Label>
                <Input 
                  id="slug" 
                  placeholder="oak-hollow"
                  value={newTenant.slug}
                  onChange={(e) => setNewTenant({ ...newTenant, slug: e.target.value })}
                  data-testid="input-tenant-slug"
                />
                <p className="text-xs text-muted-foreground">
                  Will be accessible at: bramble.co/coop/{newTenant.slug || "your-slug"}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={createTenant} 
                disabled={creating || !newTenant.name || !newTenant.slug}
                data-testid="button-submit-tenant"
              >
                {creating ? "Creating..." : "Create Tenant"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-serif">Invite Co-op Admin</DialogTitle>
            <DialogDescription>
              Send an invitation to a new administrator for this co-op. They will receive login credentials.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input 
                  value={adminInvite.firstName}
                  onChange={(e) => setAdminInvite({ ...adminInvite, firstName: e.target.value })}
                  placeholder="First name"
                  data-testid="input-admin-firstname"
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input 
                  value={adminInvite.lastName}
                  onChange={(e) => setAdminInvite({ ...adminInvite, lastName: e.target.value })}
                  placeholder="Last name"
                  data-testid="input-admin-lastname"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input 
                type="email"
                value={adminInvite.email}
                onChange={(e) => setAdminInvite({ ...adminInvite, email: e.target.value })}
                placeholder="admin@example.com"
                data-testid="input-admin-email"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={inviteAdmin} 
              disabled={inviting || !adminInvite.firstName || !adminInvite.lastName || !adminInvite.email}
              data-testid="button-send-admin-invite"
            >
              {inviting ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewAsOpen} onOpenChange={setIsViewAsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="font-serif">View As User - {selectedTenantName}</DialogTitle>
            <DialogDescription>
              Select a user to view the platform from their perspective.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {loadingUsers ? (
              <div className="py-8 text-center text-muted-foreground">Loading users...</div>
            ) : tenantUsers.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No users in this tenant yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenantUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role}</Badge>
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
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>All Tenants</CardTitle>
          <CardDescription>
            A list of all registered co-ops on the Bramble platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading tenants...</div>
          ) : tenants.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No tenants yet. Create one to get started.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow key={tenant.id} data-testid={`row-tenant-${tenant.id}`}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{tenant.slug}</TableCell>
                    <TableCell>
                      <Badge variant={tenant.status === "ACTIVE" ? "default" : "secondary"}>
                        {tenant.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{tenant._count?.users || 0}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openViewAsDialog(tenant.id, tenant.name)}
                        data-testid={`button-view-as-${tenant.id}`}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View As
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openInviteDialog(tenant.id)}
                        data-testid={`button-invite-admin-${tenant.id}`}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Invite Admin
                      </Button>
                      <Link href={`/operator/tenants/${tenant.id}`}>
                        <Button variant="ghost" size="sm" data-testid={`button-manage-tenant-${tenant.id}`}>
                          Manage
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
    </>
  );
}
