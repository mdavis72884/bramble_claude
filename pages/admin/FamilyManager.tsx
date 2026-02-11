import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, Users, Mail, Phone, AlertCircle, Shield, Plus, UserPlus, ChevronRight, BookOpen, Edit, Trash2, Eye, GraduationCap, Brain, Pause, Play, RotateCcw, Archive, ArchiveRestore } from "lucide-react";
import { EmptyState, ApplicationStatusBadge, ConfirmDialog } from "@/components/common";
import { ChildProfileEditor, ChildProfileData } from "@/components/common/ChildProfileEditor";
import { ChildProfileViewDialog } from "@/components/common/ChildProfileViewDialog";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";

const LEARNING_STYLES: Record<string, { label: string; description: string }> = {
  visual: { label: "Visual", description: "Learns best by seeing things—pictures, diagrams, color, and visual examples." },
  auditory: { label: "Auditory", description: "Learns best by listening, talking things through, and hearing explanations." },
  kinesthetic: { label: "Hands-On (Kinesthetic)", description: "Learns best by moving, building, touching, and doing." },
  reading_writing: { label: "Reading & Writing", description: "Learns best by reading, writing, and working with text." },
  social: { label: "Social", description: "Learns best with others through conversation, teamwork, and shared ideas." },
  independent: { label: "Independent", description: "Learns best alone, with time to think and work at their own pace." },
  logical: { label: "Logical", description: "Learns best through patterns, steps, problem-solving, and clear structure." },
  creative: { label: "Creative", description: "Learns best through stories, imagination, art, and open-ended exploration." },
  multi_sensory: { label: "Multi-Sensory", description: "Learns best when learning includes a mix of seeing, hearing, and doing." },
};


interface ChildData {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  grade?: string;
  interests?: string[];
  learningStylePrimary?: string;
  learningStyleSecondary?: string;
  educationalPhilosophyPrimary?: string;
  educationalPhilosophySecondary?: string;
  preferredLearningEnvironment?: string;
  neurodivergentNotes?: string;
  healthNotes?: string;
  parentNotes?: string;
  shareWithInstructors?: boolean;
  visibleToOtherParents?: boolean;
  enrollments?: Array<{ id: string; class: { id: string; title: string } }>;
}

interface FamilyData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  applicationStatus: string;
  role: string;
  secondaryRoles?: string[];
  children: ChildData[];
  isActive?: boolean;
  isArchived?: boolean;
  _count?: { registrations: number };
}

export default function FamilyManager() {
  const { toast } = useToast();
  const [families, setFamilies] = useState<FamilyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Sheet state
  const [selectedFamily, setSelectedFamily] = useState<FamilyData | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // Role dialog
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);
  
  // Edit family dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  
  // Add child dialog
  const [isAddChildDialogOpen, setIsAddChildDialogOpen] = useState(false);
  
  // Create/Invite dialogs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newFamily, setNewFamily] = useState({ firstName: "", lastName: "", email: "", password: "", phone: "" });
  const [inviteData, setInviteData] = useState({ firstName: "", lastName: "", email: "" });
  
  // Child profile dialog
  const [selectedChild, setSelectedChild] = useState<ChildData | null>(null);
  const [isChildProfileOpen, setIsChildProfileOpen] = useState(false);
  
  // Edit child dialog
  const [editingChild, setEditingChild] = useState<ChildData | null>(null);
  const [isEditChildDialogOpen, setIsEditChildDialogOpen] = useState(false);
  
  // Confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    variant: "default" | "destructive";
    onConfirm: () => Promise<void>;
  }>({ open: false, title: "", description: "", confirmLabel: "Confirm", variant: "default", onConfirm: async () => {} });

  const openChildProfile = (child: ChildData, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedChild(child);
    setIsChildProfileOpen(true);
  };

  const getLearningStyleLabel = (value?: string) => {
    if (!value) return null;
    return LEARNING_STYLES[value]?.label || value;
  };

  const fetchFamilies = async () => {
    setError(null);
    const { data, error } = await apiFetch<{ families: FamilyData[] }>("/api/tenant/families");
    if (error) {
      setError(error);
    } else {
      setFamilies(data?.families || []);
      setError(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFamilies();
  }, []);

  // Filter out archived families from main lists unless viewing archived tab
  const activeFamilies = families.filter((f) => !f.isArchived);
  const archivedFamilies = families.filter((f) => f.isArchived === true);
  
  const pendingFamilies = activeFamilies.filter((f) => f.applicationStatus === "PENDING");
  const approvedFamilies = activeFamilies.filter((f) => f.applicationStatus === "APPROVED" && f.isActive !== false);
  const rejectedFamilies = activeFamilies.filter((f) => f.applicationStatus === "REJECTED");
  const suspendedFamilies = activeFamilies.filter((f) => f.isActive === false);

  const openFamilyDetail = (family: FamilyData) => {
    setSelectedFamily(family);
    setIsDetailOpen(true);
  };

  const approveFamily = async (familyId: string) => {
    const { error } = await apiFetch(`/api/tenant/families/${familyId}/approve`, { method: "PATCH" });

    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      fetchFamilies();
      toast({ title: "Success", description: "Family approved" });
      // Update selected family if it's the same
      if (selectedFamily?.id === familyId) {
        setSelectedFamily(prev => prev ? { ...prev, applicationStatus: "APPROVED" } : null);
      }
    }
  };

  const confirmRejectFamily = (familyId: string, familyName: string) => {
    setConfirmDialog({
      open: true,
      title: "Reject Family Application",
      description: `Are you sure you want to reject ${familyName}'s application? They will receive an email notification about this decision.`,
      confirmLabel: "Reject Application",
      variant: "destructive",
      onConfirm: async () => {
        const { error } = await apiFetch(`/api/tenant/families/${familyId}/reject`, { method: "PATCH" });
        if (error) {
          toast({ title: "Error", description: error, variant: "destructive" });
        } else {
          fetchFamilies();
          toast({ title: "Success", description: "Family rejected and notified by email" });
          setIsDetailOpen(false);
        }
      },
    });
  };

  const moveFamilyToPending = async (familyId: string) => {
    const { error } = await apiFetch(`/api/tenant/families/${familyId}/move-to-pending`, { method: "PATCH" });
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      fetchFamilies();
      toast({ title: "Success", description: "Family moved to pending" });
      if (selectedFamily?.id === familyId) {
        setSelectedFamily(prev => prev ? { ...prev, applicationStatus: "PENDING" } : null);
      }
    }
  };

  const confirmSuspendFamily = (familyId: string, familyName: string) => {
    setConfirmDialog({
      open: true,
      title: "Suspend Family",
      description: `Are you sure you want to suspend ${familyName}? They will not be able to access the co-op portal until reactivated.`,
      confirmLabel: "Suspend Family",
      variant: "destructive",
      onConfirm: async () => {
        const { error } = await apiFetch(`/api/tenant/families/${familyId}/suspend`, { method: "PATCH" });
        if (error) {
          toast({ title: "Error", description: error, variant: "destructive" });
        } else {
          fetchFamilies();
          toast({ title: "Success", description: "Family suspended" });
          if (selectedFamily?.id === familyId) {
            setSelectedFamily(prev => prev ? { ...prev, isActive: false } : null);
          }
        }
      },
    });
  };

  const reactivateFamily = async (familyId: string) => {
    const { error } = await apiFetch(`/api/tenant/families/${familyId}/reactivate`, { method: "PATCH" });
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      fetchFamilies();
      toast({ title: "Success", description: "Family reactivated" });
      if (selectedFamily?.id === familyId) {
        setSelectedFamily(prev => prev ? { ...prev, isActive: true } : null);
      }
    }
  };

  const archiveFamily = (familyId: string, familyName: string) => {
    setConfirmDialog({
      open: true,
      title: "Archive Family",
      description: `Are you sure you want to archive ${familyName}? They will be hidden from the main list but their data will be preserved. You can restore them later.`,
      confirmLabel: "Archive Family",
      variant: "default" as const,
      onConfirm: async () => {
        const { error } = await apiFetch(`/api/tenant/families/${familyId}/archive`, { method: "PATCH" });
        if (error) {
          toast({ title: "Error", description: error, variant: "destructive" });
        } else {
          fetchFamilies();
          setIsDetailOpen(false);
          toast({ title: "Success", description: "Family archived" });
        }
      },
    });
  };

  const unarchiveFamily = async (familyId: string) => {
    const { error } = await apiFetch(`/api/tenant/families/${familyId}/unarchive`, { method: "PATCH" });
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      fetchFamilies();
      toast({ title: "Success", description: "Family restored from archive" });
      if (selectedFamily?.id === familyId) {
        setSelectedFamily(prev => prev ? { ...prev, isArchived: false } : null);
      }
    }
  };

  const openRoleDialog = () => {
    if (!selectedFamily) return;
    setSelectedRoles(selectedFamily.secondaryRoles || []);
    setRoleDialogOpen(true);
  };

  const toggleRole = (role: string) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter(r => r !== role));
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  const saveRoles = async () => {
    if (!selectedFamily) return;
    
    setSavingRoles(true);
    const { error } = await apiFetch(`/api/tenant/users/${selectedFamily.id}/roles`, {
      method: "PUT",
      body: JSON.stringify({ secondaryRoles: selectedRoles }),
    });

    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Roles updated successfully" });
      fetchFamilies();
      setSelectedFamily(prev => prev ? { ...prev, secondaryRoles: selectedRoles } : null);
      setRoleDialogOpen(false);
    }
    setSavingRoles(false);
  };

  const openEditDialog = () => {
    if (!selectedFamily) return;
    setEditForm({
      firstName: selectedFamily.firstName,
      lastName: selectedFamily.lastName,
      email: selectedFamily.email,
      phone: selectedFamily.phone || "",
    });
    setIsEditDialogOpen(true);
  };

  const saveEdit = async () => {
    if (!selectedFamily) return;
    
    setSavingEdit(true);
    const { error } = await apiFetch(`/api/tenant/families/${selectedFamily.id}`, {
      method: "PATCH",
      body: JSON.stringify(editForm),
    });

    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Family updated" });
      fetchFamilies();
      setSelectedFamily(prev => prev ? { ...prev, ...editForm } : null);
      setIsEditDialogOpen(false);
    }
    setSavingEdit(false);
  };

  const openAddChildDialog = () => {
    setIsAddChildDialogOpen(true);
  };

  const addChild = async (profileData: ChildProfileData) => {
    if (!selectedFamily) return;
    
    const { error } = await apiFetch(`/api/tenant/families/${selectedFamily.id}/children`, {
      method: "POST",
      body: JSON.stringify(profileData),
    });

    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
      throw new Error(error);
    } else {
      toast({ title: "Success", description: "Child added" });
      fetchFamilies();
      setIsAddChildDialogOpen(false);
    }
  };

  const updateChild = async (profileData: ChildProfileData) => {
    if (!selectedFamily || !editingChild) return;
    
    const { error } = await apiFetch(`/api/tenant/families/${selectedFamily.id}/children/${editingChild.id}`, {
      method: "PATCH",
      body: JSON.stringify(profileData),
    });

    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
      throw new Error(error);
    } else {
      toast({ title: "Success", description: "Child profile updated" });
      fetchFamilies();
      setIsEditChildDialogOpen(false);
      setEditingChild(null);
    }
  };

  const openEditChildDialog = (child: ChildData) => {
    setEditingChild(child);
    setIsEditChildDialogOpen(true);
  };

  const deleteChild = async (childId: string) => {
    if (!selectedFamily) return;
    if (!confirm("Are you sure you want to remove this child? This will also remove all their enrollments.")) return;
    
    const { error } = await apiFetch(`/api/tenant/families/${selectedFamily.id}/children/${childId}`, {
      method: "DELETE",
    });

    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Child removed" });
      fetchFamilies();
      setSelectedFamily(prev => prev ? { 
        ...prev, 
        children: prev.children.filter(c => c.id !== childId) 
      } : null);
    }
  };

  const createFamily = async () => {
    if (!newFamily.firstName || !newFamily.lastName || !newFamily.email || !newFamily.password) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    setCreating(true);
    const { error } = await apiFetch("/api/tenant/families/create", {
      method: "POST",
      body: JSON.stringify(newFamily),
    });

    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      setIsCreateDialogOpen(false);
      setNewFamily({ firstName: "", lastName: "", email: "", password: "", phone: "" });
      fetchFamilies();
      toast({ title: "Success", description: "Family created successfully" });
    }
    setCreating(false);
  };

  const inviteFamily = async () => {
    if (!inviteData.firstName || !inviteData.lastName || !inviteData.email) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    setCreating(true);
    const { error } = await apiFetch("/api/tenant/families/invite", {
      method: "POST",
      body: JSON.stringify(inviteData),
    });

    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      setIsInviteDialogOpen(false);
      setInviteData({ firstName: "", lastName: "", email: "" });
      fetchFamilies();
      toast({ title: "Success", description: "Family invitation sent" });
    }
    setCreating(false);
  };

  const calculateAge = (dob: string): number => {
    return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading families...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="p-6 border-red-200 bg-red-50">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  const FamilyCard = ({ family }: { family: FamilyData }) => (
    <Card 
      key={family.id} 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => openFamilyDetail(family)}
      data-testid={`card-family-${family.id}`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold" data-testid={`text-family-name-${family.id}`}>
                {family.firstName} {family.lastName}
              </h3>
              <ApplicationStatusBadge status={family.isActive === false ? "Suspended" : family.applicationStatus} />
              {family.secondaryRoles && family.secondaryRoles.length > 0 && (
                family.secondaryRoles.map(role => (
                  <Badge key={role} variant="outline" className="text-xs">{role}</Badge>
                ))
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {family.email}
              </span>
              {family.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {family.phone}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {family.children?.length || 0} children
              </span>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-stone-400 flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-serif font-bold tracking-tight">Family Manager</h2>
            <p className="text-muted-foreground mt-1">Manage family applications and member profiles.</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-invite-family">
                  <UserPlus className="h-4 w-4 mr-2" /> Invite Family
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Family</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-sm text-muted-foreground">Send an invitation email to join the co-op. They will receive a temporary password to set up their account.</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name *</Label>
                      <Input
                        value={inviteData.firstName}
                        onChange={(e) => setInviteData({ ...inviteData, firstName: e.target.value })}
                        placeholder="First name"
                        data-testid="input-invite-firstname"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name *</Label>
                      <Input
                        value={inviteData.lastName}
                        onChange={(e) => setInviteData({ ...inviteData, lastName: e.target.value })}
                        placeholder="Last name"
                        data-testid="input-invite-lastname"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={inviteData.email}
                      onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                      placeholder="email@example.com"
                      data-testid="input-invite-email"
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={inviteFamily} 
                    disabled={creating || !inviteData.firstName || !inviteData.lastName || !inviteData.email}
                    data-testid="button-send-invite"
                  >
                    {creating ? "Sending..." : "Send Invitation"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-family">
                  <Plus className="h-4 w-4 mr-2" /> Create Family
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Family Account</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-sm text-muted-foreground">Create a new family account directly. They will be automatically approved.</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name *</Label>
                      <Input
                        value={newFamily.firstName}
                        onChange={(e) => setNewFamily({ ...newFamily, firstName: e.target.value })}
                        placeholder="First name"
                        data-testid="input-create-firstname"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name *</Label>
                      <Input
                        value={newFamily.lastName}
                        onChange={(e) => setNewFamily({ ...newFamily, lastName: e.target.value })}
                        placeholder="Last name"
                        data-testid="input-create-lastname"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={newFamily.email}
                      onChange={(e) => setNewFamily({ ...newFamily, email: e.target.value })}
                      placeholder="email@example.com"
                      data-testid="input-create-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password *</Label>
                    <Input
                      type="password"
                      value={newFamily.password}
                      onChange={(e) => setNewFamily({ ...newFamily, password: e.target.value })}
                      placeholder="Password"
                      data-testid="input-create-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone (optional)</Label>
                    <Input
                      type="tel"
                      value={newFamily.phone}
                      onChange={(e) => setNewFamily({ ...newFamily, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                      data-testid="input-create-phone"
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={createFamily} 
                    disabled={creating || !newFamily.firstName || !newFamily.lastName || !newFamily.email || !newFamily.password}
                    data-testid="button-submit-create"
                  >
                    {creating ? "Creating..." : "Create Account"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All ({activeFamilies.length})</TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({pendingFamilies.length})
              {pendingFamilies.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs flex items-center justify-center">
                  {pendingFamilies.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">Active ({approvedFamilies.length})</TabsTrigger>
            {rejectedFamilies.length > 0 && (
              <TabsTrigger value="rejected">Rejected ({rejectedFamilies.length})</TabsTrigger>
            )}
            {suspendedFamilies.length > 0 && (
              <TabsTrigger value="suspended">Suspended ({suspendedFamilies.length})</TabsTrigger>
            )}
            {archivedFamilies.length > 0 && (
              <TabsTrigger value="archived">Archived ({archivedFamilies.length})</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {activeFamilies.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No families yet"
                description="Families will appear here once they register and are approved"
                accentColor="#7C9082"
              />
            ) : (
              activeFamilies.map((family) => <FamilyCard key={family.id} family={family} />)
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            {pendingFamilies.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">No pending applications</Card>
            ) : (
              pendingFamilies.map((family) => <FamilyCard key={family.id} family={family} />)
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            {approvedFamilies.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">No active families</Card>
            ) : (
              approvedFamilies.map((family) => <FamilyCard key={family.id} family={family} />)
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {rejectedFamilies.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">No rejected families</Card>
            ) : (
              rejectedFamilies.map((family) => <FamilyCard key={family.id} family={family} />)
            )}
          </TabsContent>

          <TabsContent value="suspended" className="space-y-4">
            {suspendedFamilies.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">No suspended families</Card>
            ) : (
              suspendedFamilies.map((family) => <FamilyCard key={family.id} family={family} />)
            )}
          </TabsContent>

          <TabsContent value="archived" className="space-y-4">
            {archivedFamilies.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">No archived families</Card>
            ) : (
              archivedFamilies.map((family) => (
                <Card key={family.id} className="p-4 hover:shadow-md transition-shadow border-l-4 border-l-gray-300" data-testid={`card-archived-family-${family.id}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-lg font-medium text-gray-500">
                          {family.firstName.charAt(0)}{family.lastName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-600">{family.firstName} {family.lastName}</h3>
                          <Badge variant="outline" className="bg-gray-100 text-gray-600">
                            <Archive className="h-3 w-3 mr-1" /> Archived
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{family.email}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => unarchiveFamily(family.id)}
                      data-testid={`button-restore-family-${family.id}`}
                    >
                      <ArchiveRestore className="h-4 w-4 mr-1" /> Restore
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Family Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" data-testid="dialog-family-detail">
          {selectedFamily && (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-[#7C9082]/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xl font-medium text-[#7C9082]">
                      {selectedFamily.firstName.charAt(0)}{selectedFamily.lastName.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="text-xl font-serif">
                      {selectedFamily.firstName} {selectedFamily.lastName}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                      Family profile details and management options
                    </DialogDescription>
                    <div className="flex items-center gap-2 mt-1">
                      <ApplicationStatusBadge status={selectedFamily.isActive === false ? "Suspended" : selectedFamily.applicationStatus} />
                      {selectedFamily.secondaryRoles?.map(role => (
                        <Badge key={role} variant="outline" className="text-xs">{role}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <Separator />

              {/* Contact Info */}
              <div className="space-y-3">
                <h4 className="font-medium text-stone-800">Contact Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{selectedFamily.email}</span>
                  </div>
                  {selectedFamily.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{selectedFamily.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-[#7C9082]/10 rounded-lg">
                  <Users className="h-5 w-5 mx-auto mb-1 text-[#7C9082]" />
                  <div className="text-2xl font-bold text-stone-800">{selectedFamily.children.length}</div>
                  <div className="text-xs text-muted-foreground">Children</div>
                </div>
                <div className="text-center p-4 bg-stone-50 rounded-lg">
                  <BookOpen className="h-5 w-5 mx-auto mb-1 text-stone-500" />
                  <div className="text-2xl font-bold text-stone-800">{selectedFamily._count?.registrations || 0}</div>
                  <div className="text-xs text-muted-foreground">Enrollments</div>
                </div>
              </div>

              <Separator />

              {/* Children */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-stone-800 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Children ({selectedFamily.children.length})
                  </h4>
                  <Button variant="outline" size="sm" onClick={openAddChildDialog} data-testid="button-add-child">
                    <Plus className="h-4 w-4 mr-1" /> Add Child
                  </Button>
                </div>
                {selectedFamily.children.length === 0 ? (
                  <div className="text-center py-6 bg-stone-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">No children registered</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedFamily.children.map((child) => (
                      <div 
                        key={child.id} 
                        className="p-4 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer border border-transparent hover:border-[#7C9082]/30"
                        onClick={(e) => openChildProfile(child, e)}
                        data-testid={`card-child-${child.id}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-stone-800">{child.firstName} {child.lastName}</span>
                              {child.grade && (
                                <Badge variant="outline" className="text-xs">
                                  <GraduationCap className="h-3 w-3 mr-1" />
                                  {child.grade}
                                </Badge>
                              )}
                            </div>
                            {child.dateOfBirth && (
                              <p className="text-sm text-muted-foreground mt-0.5">
                                Age {calculateAge(child.dateOfBirth)} • Born {new Date(child.dateOfBirth).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-[#7C9082] hover:text-[#6a7d70] hover:bg-[#7C9082]/10"
                              onClick={(e) => openChildProfile(child, e)}
                              data-testid={`button-view-child-${child.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => { e.stopPropagation(); deleteChild(child.id); }}
                              data-testid={`button-delete-child-${child.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Learning Styles */}
                        {(child.learningStylePrimary || child.learningStyleSecondary) && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {child.learningStylePrimary && (
                              <Badge className="bg-[#7C9082] hover:bg-[#6a7d70] text-xs">
                                <Brain className="h-3 w-3 mr-1" />
                                {getLearningStyleLabel(child.learningStylePrimary)}
                              </Badge>
                            )}
                            {child.learningStyleSecondary && (
                              <Badge variant="outline" className="text-xs border-[#7C9082]/50 text-[#7C9082]">
                                {getLearningStyleLabel(child.learningStyleSecondary)}
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        {/* Interests */}
                        {child.interests && child.interests.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {child.interests.slice(0, 3).map((interest, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs bg-stone-200/60">
                                {interest}
                              </Badge>
                            ))}
                            {child.interests.length > 3 && (
                              <Badge variant="secondary" className="text-xs bg-stone-200/60">
                                +{child.interests.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Actions */}
              <div className="space-y-3">
                {selectedFamily.applicationStatus === "PENDING" && (
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1" 
                      onClick={() => approveFamily(selectedFamily.id)}
                      data-testid="button-approve-family-detail"
                    >
                      <Check className="h-4 w-4 mr-2" /> Approve
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="flex-1"
                      onClick={() => confirmRejectFamily(selectedFamily.id, `${selectedFamily.firstName} ${selectedFamily.lastName}`)}
                      data-testid="button-reject-family-detail"
                    >
                      <X className="h-4 w-4 mr-2" /> Reject
                    </Button>
                  </div>
                )}
                {selectedFamily.applicationStatus === "REJECTED" && (
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => moveFamilyToPending(selectedFamily.id)}
                    data-testid="button-move-to-pending-family"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" /> Move to Pending
                  </Button>
                )}
                {selectedFamily.applicationStatus === "APPROVED" && selectedFamily.isActive !== false && (
                  <Button 
                    variant="outline" 
                    className="w-full text-amber-600 hover:text-amber-700 border-amber-200 hover:border-amber-300 hover:bg-amber-50"
                    onClick={() => confirmSuspendFamily(selectedFamily.id, `${selectedFamily.firstName} ${selectedFamily.lastName}`)}
                    data-testid="button-suspend-family"
                  >
                    <Pause className="h-4 w-4 mr-2" /> Suspend Family
                  </Button>
                )}
                {selectedFamily.isActive === false && (
                  <Button 
                    className="w-full" 
                    onClick={() => reactivateFamily(selectedFamily.id)}
                    data-testid="button-reactivate-family"
                  >
                    <Play className="h-4 w-4 mr-2" /> Reactivate Family
                  </Button>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={openEditDialog} data-testid="button-edit-family-detail">
                    <Edit className="h-4 w-4 mr-2" /> Edit Info
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={openRoleDialog} data-testid="button-manage-roles-detail">
                    <Shield className="h-4 w-4 mr-2" /> Manage Roles
                  </Button>
                </div>
                {selectedFamily.applicationStatus === "APPROVED" && (
                  <Button 
                    variant="outline" 
                    className="w-full text-gray-600 hover:text-gray-700"
                    onClick={() => archiveFamily(selectedFamily.id, `${selectedFamily.firstName} ${selectedFamily.lastName}`)}
                    data-testid="button-archive-family"
                  >
                    <Archive className="h-4 w-4 mr-2" /> Archive Family
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Roles for {selectedFamily?.firstName} {selectedFamily?.lastName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Primary role: <Badge>{selectedFamily?.role}</Badge>
            </p>
            <div className="space-y-3">
              <p className="text-sm font-medium">Assign additional roles:</p>
              {["INSTRUCTOR", "COOP_ADMIN"].map(role => (
                <div key={role} className="flex items-center space-x-2">
                  <Checkbox
                    id={`role-${role}`}
                    checked={selectedRoles.includes(role)}
                    onCheckedChange={() => toggleRole(role)}
                    disabled={selectedFamily?.role === role}
                    data-testid={`checkbox-role-${role.toLowerCase()}`}
                  />
                  <Label htmlFor={`role-${role}`} className="text-sm">
                    {role === "INSTRUCTOR" ? "Instructor Portal Access" : "Co-op Admin Portal Access"}
                    {selectedFamily?.role === role && <span className="text-xs text-muted-foreground ml-2">(primary role)</span>}
                  </Label>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-4">
              <Button 
                onClick={saveRoles} 
                disabled={savingRoles}
                data-testid="button-save-roles"
              >
                {savingRoles ? "Saving..." : "Save Roles"}
              </Button>
              <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Family Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Family Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  data-testid="input-edit-firstname"
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  data-testid="input-edit-lastname"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                data-testid="input-edit-email"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                data-testid="input-edit-phone"
              />
            </div>
            <Button 
              className="w-full" 
              onClick={saveEdit} 
              disabled={savingEdit}
              data-testid="button-save-edit"
            >
              {savingEdit ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Child Dialog */}
      <Dialog open={isAddChildDialogOpen} onOpenChange={setIsAddChildDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Child Profile</DialogTitle>
            <p className="text-sm text-stone-500">Add a new child to this family's profile</p>
          </DialogHeader>
          <ChildProfileEditor
            isEditing={false}
            onSave={addChild}
            onCancel={() => setIsAddChildDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Child Dialog */}
      <Dialog open={isEditChildDialogOpen} onOpenChange={setIsEditChildDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Child Profile</DialogTitle>
            <p className="text-sm text-stone-500">Update {editingChild?.firstName}'s profile information</p>
          </DialogHeader>
          {editingChild && (
            <ChildProfileEditor
              key={editingChild.id}
              isEditing={true}
              initialData={{
                ...editingChild,
                interests: editingChild.interests || [],
                dateOfBirth: editingChild.dateOfBirth ? editingChild.dateOfBirth.split("T")[0] : "",
              }}
              onSave={updateChild}
              onCancel={() => {
                setIsEditChildDialogOpen(false);
                setEditingChild(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Child Profile Dialog */}
      <ChildProfileViewDialog
        child={selectedChild}
        isOpen={isChildProfileOpen}
        onOpenChange={setIsChildProfileOpen}
        onEdit={(child) => {
          setIsChildProfileOpen(false);
          openEditChildDialog(child);
        }}
        onDelete={(childId) => {
          setIsChildProfileOpen(false);
          deleteChild(childId);
        }}
        viewerRole="admin"
        showPrivacySettings={true}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
      />
    </>
  );
}
