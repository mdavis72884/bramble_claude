import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, X, Mail, BookOpen, AlertCircle, Plus, Trash2, Pause, Play, ChevronRight, Edit, Clock, Users, RotateCcw, Archive, ArchiveRestore } from "lucide-react";
import { EmptyState, ApplicationStatusBadge, ConfirmDialog } from "@/components/common";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";

interface ClassInfo {
  id: string;
  title: string;
  status: string;
  _count?: { registrations: number };
}

interface InstructorData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  bio?: string;
  applicationStatus: string;
  isActive?: boolean;
  isArchived?: boolean;
  _count?: { instructedClasses: number };
  classes?: ClassInfo[];
}

export default function InstructorManager() {
  const { toast } = useToast();
  const [instructors, setInstructors] = useState<InstructorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Sheet state
  const [selectedInstructor, setSelectedInstructor] = useState<InstructorData | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [instructorClasses, setInstructorClasses] = useState<ClassInfo[]>([]);
  
  // Invite dialog
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [newInstructor, setNewInstructor] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  
  // Edit dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", email: "", bio: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  
  // Confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    variant: "default" | "destructive";
    onConfirm: () => Promise<void>;
  }>({ open: false, title: "", description: "", confirmLabel: "Confirm", variant: "default", onConfirm: async () => {} });

  const fetchInstructors = async () => {
    setError(null);
    const { data, error } = await apiFetch<{ instructors: InstructorData[] }>("/api/tenant/instructors");
    if (error) {
      setError(error);
    } else {
      setInstructors(data?.instructors || []);
      setError(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInstructors();
  }, []);

  // Filter out archived instructors from main lists unless viewing archived tab
  const activeInstructors = instructors.filter((i) => !i.isArchived);
  const archivedInstructors = instructors.filter((i) => i.isArchived === true);
  
  const pendingInstructors = activeInstructors.filter((i) => i.applicationStatus === "PENDING");
  const approvedInstructors = activeInstructors.filter((i) => i.applicationStatus === "APPROVED" && i.isActive !== false);
  const rejectedInstructors = activeInstructors.filter((i) => i.applicationStatus === "REJECTED");
  const suspendedInstructors = activeInstructors.filter((i) => i.isActive === false);

  const openInstructorDetail = async (instructor: InstructorData) => {
    setSelectedInstructor(instructor);
    setIsDetailOpen(true);
    setLoadingClasses(true);
    setInstructorClasses([]);
    
    // Fetch instructor's classes
    const { data } = await apiFetch<{ classes: ClassInfo[] }>(`/api/tenant/instructors/${instructor.id}/classes`);
    if (data?.classes) {
      setInstructorClasses(data.classes);
    }
    setLoadingClasses(false);
  };

  const approveInstructor = async (instructorId: string) => {
    const { error } = await apiFetch(`/api/tenant/instructors/${instructorId}/approve`, { method: "PATCH" });

    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      fetchInstructors();
      toast({ title: "Success", description: "Instructor approved" });
      if (selectedInstructor?.id === instructorId) {
        setSelectedInstructor(prev => prev ? { ...prev, applicationStatus: "APPROVED", isActive: true } : null);
      }
    }
  };

  const confirmRejectInstructor = (instructorId: string, instructorName: string) => {
    setConfirmDialog({
      open: true,
      title: "Reject Instructor Application",
      description: `Are you sure you want to reject ${instructorName}'s application? They will receive an email notification about this decision.`,
      confirmLabel: "Reject Application",
      variant: "destructive",
      onConfirm: async () => {
        const { error } = await apiFetch(`/api/tenant/instructors/${instructorId}/reject`, { method: "PATCH" });
        if (error) {
          toast({ title: "Error", description: error, variant: "destructive" });
        } else {
          fetchInstructors();
          toast({ title: "Success", description: "Instructor rejected and notified by email" });
          setIsDetailOpen(false);
        }
      },
    });
  };

  const moveInstructorToPending = async (instructorId: string) => {
    const { error } = await apiFetch(`/api/tenant/instructors/${instructorId}/move-to-pending`, { method: "PATCH" });
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      fetchInstructors();
      toast({ title: "Success", description: "Instructor moved to pending" });
      if (selectedInstructor?.id === instructorId) {
        setSelectedInstructor(prev => prev ? { ...prev, applicationStatus: "PENDING" } : null);
      }
    }
  };

  const confirmSuspendInstructor = (instructorId: string, instructorName: string) => {
    setConfirmDialog({
      open: true,
      title: "Suspend Instructor",
      description: `Are you sure you want to suspend ${instructorName}? They will not be able to access the instructor portal until reactivated.`,
      confirmLabel: "Suspend Instructor",
      variant: "destructive",
      onConfirm: async () => {
        const { error } = await apiFetch(`/api/tenant/instructors/${instructorId}/suspend`, { method: "PATCH" });
        if (error) {
          toast({ title: "Error", description: error, variant: "destructive" });
        } else {
          fetchInstructors();
          toast({ title: "Success", description: "Instructor suspended" });
          if (selectedInstructor?.id === instructorId) {
            setSelectedInstructor(prev => prev ? { ...prev, isActive: false } : null);
          }
        }
      },
    });
  };

  const reactivateInstructor = async (instructorId: string) => {
    const { error } = await apiFetch(`/api/tenant/instructors/${instructorId}/reactivate`, { method: "PATCH" });

    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      fetchInstructors();
      toast({ title: "Success", description: "Instructor reactivated" });
      if (selectedInstructor?.id === instructorId) {
        setSelectedInstructor(prev => prev ? { ...prev, isActive: true } : null);
      }
    }
  };

  const archiveInstructor = (instructorId: string, instructorName: string) => {
    setConfirmDialog({
      open: true,
      title: "Archive Instructor",
      description: `Are you sure you want to archive ${instructorName}? They will be hidden from the main list but their data will be preserved. You can restore them later.`,
      confirmLabel: "Archive Instructor",
      variant: "default" as const,
      onConfirm: async () => {
        const { error } = await apiFetch(`/api/tenant/instructors/${instructorId}/archive`, { method: "PATCH" });
        if (error) {
          toast({ title: "Error", description: error, variant: "destructive" });
        } else {
          fetchInstructors();
          setIsDetailOpen(false);
          toast({ title: "Success", description: "Instructor archived" });
        }
      },
    });
  };

  const unarchiveInstructor = async (instructorId: string) => {
    const { error } = await apiFetch(`/api/tenant/instructors/${instructorId}/unarchive`, { method: "PATCH" });
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      fetchInstructors();
      toast({ title: "Success", description: "Instructor restored from archive" });
      if (selectedInstructor?.id === instructorId) {
        setSelectedInstructor(prev => prev ? { ...prev, isArchived: false } : null);
      }
    }
  };

  const confirmDeleteInstructor = (instructorId: string, instructorName: string) => {
    setConfirmDialog({
      open: true,
      title: "Delete Instructor",
      description: `Are you sure you want to delete ${instructorName}? This action cannot be undone.`,
      confirmLabel: "Delete Instructor",
      variant: "destructive",
      onConfirm: async () => {
        const { error } = await apiFetch(`/api/tenant/instructors/${instructorId}`, { method: "DELETE" });
        if (error) {
          toast({ title: "Error", description: error, variant: "destructive" });
        } else {
          fetchInstructors();
          toast({ title: "Success", description: "Instructor deleted" });
          setIsDetailOpen(false);
        }
      },
    });
  };

  const openEditDialog = () => {
    if (!selectedInstructor) return;
    setEditForm({
      firstName: selectedInstructor.firstName,
      lastName: selectedInstructor.lastName,
      email: selectedInstructor.email,
      bio: selectedInstructor.bio || "",
    });
    setIsEditDialogOpen(true);
  };

  const saveEdit = async () => {
    if (!selectedInstructor) return;
    
    setSavingEdit(true);
    const { error } = await apiFetch(`/api/tenant/instructors/${selectedInstructor.id}`, {
      method: "PATCH",
      body: JSON.stringify(editForm),
    });

    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Instructor updated" });
      fetchInstructors();
      setSelectedInstructor(prev => prev ? { ...prev, ...editForm } : null);
      setIsEditDialogOpen(false);
    }
    setSavingEdit(false);
  };

  const inviteInstructor = async () => {
    if (!newInstructor.firstName || !newInstructor.lastName || !newInstructor.email || !newInstructor.password) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    setInviting(true);
    const { error } = await apiFetch("/api/tenant/instructors/invite", {
      method: "POST",
      body: JSON.stringify(newInstructor),
    });

    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      setIsInviteDialogOpen(false);
      setNewInstructor({ firstName: "", lastName: "", email: "", password: "" });
      fetchInstructors();
      toast({ title: "Success", description: "Instructor invited successfully" });
    }
    setInviting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading instructors...</div>
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

  const InstructorCard = ({ instructor }: { instructor: InstructorData }) => (
    <Card 
      key={instructor.id} 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => openInstructorDetail(instructor)}
      data-testid={`card-instructor-${instructor.id}`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold" data-testid={`text-instructor-name-${instructor.id}`}>
                {instructor.firstName} {instructor.lastName}
              </h3>
              <ApplicationStatusBadge 
                status={instructor.isActive === false ? "Suspended" : instructor.applicationStatus} 
              />
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {instructor.email}
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                {instructor._count?.instructedClasses || 0} classes
              </span>
            </div>
            {instructor.bio && <p className="text-sm text-muted-foreground mt-2 line-clamp-1">{instructor.bio}</p>}
          </div>
          <ChevronRight className="h-5 w-5 text-stone-400 flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-serif font-bold tracking-tight">Instructor Manager</h2>
            <p className="text-muted-foreground mt-1">Manage instructor applications and profiles.</p>
          </div>
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-invite-instructor">
                <Plus className="h-4 w-4 mr-2" /> Invite Instructor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite New Instructor</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input
                      value={newInstructor.firstName}
                      onChange={(e) => setNewInstructor({ ...newInstructor, firstName: e.target.value })}
                      placeholder="First name"
                      data-testid="input-instructor-firstname"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input
                      value={newInstructor.lastName}
                      onChange={(e) => setNewInstructor({ ...newInstructor, lastName: e.target.value })}
                      placeholder="Last name"
                      data-testid="input-instructor-lastname"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newInstructor.email}
                    onChange={(e) => setNewInstructor({ ...newInstructor, email: e.target.value })}
                    placeholder="instructor@example.com"
                    data-testid="input-instructor-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Temporary Password</Label>
                  <Input
                    type="password"
                    value={newInstructor.password}
                    onChange={(e) => setNewInstructor({ ...newInstructor, password: e.target.value })}
                    placeholder="Set initial password"
                    data-testid="input-instructor-password"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={inviteInstructor}
                  disabled={inviting || !newInstructor.firstName || !newInstructor.lastName || !newInstructor.email || !newInstructor.password}
                  data-testid="button-submit-invite"
                >
                  {inviting ? "Inviting..." : "Send Invitation"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All ({activeInstructors.length})</TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({pendingInstructors.length})
              {pendingInstructors.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs flex items-center justify-center">
                  {pendingInstructors.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">Active ({approvedInstructors.length})</TabsTrigger>
            {rejectedInstructors.length > 0 && (
              <TabsTrigger value="rejected">Rejected ({rejectedInstructors.length})</TabsTrigger>
            )}
            {suspendedInstructors.length > 0 && (
              <TabsTrigger value="suspended">Suspended ({suspendedInstructors.length})</TabsTrigger>
            )}
            {archivedInstructors.length > 0 && (
              <TabsTrigger value="archived">Archived ({archivedInstructors.length})</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {activeInstructors.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No active instructors"
                description="Invite instructors to join your co-op or wait for applications"
                actionLabel="Invite Instructor"
                onAction={() => setIsInviteDialogOpen(true)}
                accentColor="#AE8660"
                testId="button-invite-first-instructor"
              />
            ) : (
              activeInstructors.map((instructor) => <InstructorCard key={instructor.id} instructor={instructor} />)
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            {pendingInstructors.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">No pending applications</Card>
            ) : (
              pendingInstructors.map((instructor) => <InstructorCard key={instructor.id} instructor={instructor} />)
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            {approvedInstructors.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">No active instructors</Card>
            ) : (
              approvedInstructors.map((instructor) => <InstructorCard key={instructor.id} instructor={instructor} />)
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {rejectedInstructors.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">No rejected instructors</Card>
            ) : (
              rejectedInstructors.map((instructor) => <InstructorCard key={instructor.id} instructor={instructor} />)
            )}
          </TabsContent>

          <TabsContent value="suspended" className="space-y-4">
            {suspendedInstructors.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">No suspended instructors</Card>
            ) : (
              suspendedInstructors.map((instructor) => <InstructorCard key={instructor.id} instructor={instructor} />)
            )}
          </TabsContent>

          <TabsContent value="archived" className="space-y-4">
            {archivedInstructors.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">No archived instructors</Card>
            ) : (
              archivedInstructors.map((instructor) => (
                <Card key={instructor.id} className="p-4 hover:shadow-md transition-shadow border-l-4 border-l-gray-300" data-testid={`card-archived-instructor-${instructor.id}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-lg font-medium text-gray-500">
                          {instructor.firstName.charAt(0)}{instructor.lastName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-600">{instructor.firstName} {instructor.lastName}</h3>
                          <Badge variant="outline" className="bg-gray-100 text-gray-600">
                            <Archive className="h-3 w-3 mr-1" /> Archived
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{instructor.email}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => unarchiveInstructor(instructor.id)}
                      data-testid={`button-restore-instructor-${instructor.id}`}
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

      {/* Instructor Detail Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto" data-testid="sheet-instructor-detail">
          {selectedInstructor && (
            <div className="space-y-6">
              <SheetHeader>
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-[#AE8660]/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xl font-medium text-[#AE8660]">
                      {selectedInstructor.firstName.charAt(0)}{selectedInstructor.lastName.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <SheetTitle className="text-xl font-serif">
                      {selectedInstructor.firstName} {selectedInstructor.lastName}
                    </SheetTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <ApplicationStatusBadge 
                        status={selectedInstructor.isActive === false ? "Suspended" : selectedInstructor.applicationStatus} 
                      />
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <Separator />

              {/* Contact Info */}
              <div className="space-y-3">
                <h4 className="font-medium text-stone-800">Contact Information</h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{selectedInstructor.email}</span>
                </div>
              </div>

              {/* Bio */}
              {selectedInstructor.bio && (
                <div>
                  <h4 className="font-medium text-stone-800 mb-2">Bio</h4>
                  <p className="text-sm text-muted-foreground">{selectedInstructor.bio}</p>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-[#AE8660]/10 rounded-lg">
                  <BookOpen className="h-5 w-5 mx-auto mb-1 text-[#AE8660]" />
                  <div className="text-2xl font-bold text-stone-800">{selectedInstructor._count?.instructedClasses || 0}</div>
                  <div className="text-xs text-muted-foreground">Classes Teaching</div>
                </div>
                <div className="text-center p-4 bg-stone-50 rounded-lg">
                  <Users className="h-5 w-5 mx-auto mb-1 text-stone-500" />
                  <div className="text-2xl font-bold text-stone-800">
                    {instructorClasses.reduce((sum, c) => sum + (c._count?.registrations || 0), 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Students</div>
                </div>
              </div>

              <Separator />

              {/* Classes */}
              <div>
                <h4 className="font-medium text-stone-800 mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Classes ({instructorClasses.length})
                </h4>
                {loadingClasses ? (
                  <p className="text-sm text-muted-foreground italic">Loading classes...</p>
                ) : instructorClasses.length === 0 ? (
                  <div className="text-center py-6 bg-stone-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">No classes assigned</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {instructorClasses.map((cls) => (
                      <div key={cls.id} className="p-4 bg-stone-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-stone-800">{cls.title}</div>
                            <p className="text-sm text-muted-foreground">
                              {cls._count?.registrations || 0} enrolled
                            </p>
                          </div>
                          <Badge variant={cls.status === "Published" ? "default" : "secondary"}>
                            {cls.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Actions */}
              <div className="space-y-3">
                {selectedInstructor.applicationStatus === "PENDING" && (
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1" 
                      onClick={() => approveInstructor(selectedInstructor.id)}
                      data-testid="button-approve-instructor-detail"
                    >
                      <Check className="h-4 w-4 mr-2" /> Approve
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="flex-1"
                      onClick={() => confirmRejectInstructor(selectedInstructor.id, `${selectedInstructor.firstName} ${selectedInstructor.lastName}`)}
                      data-testid="button-reject-instructor-detail"
                    >
                      <X className="h-4 w-4 mr-2" /> Reject
                    </Button>
                  </div>
                )}
                
                {selectedInstructor.applicationStatus === "REJECTED" && (
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => moveInstructorToPending(selectedInstructor.id)}
                    data-testid="button-move-to-pending-instructor"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" /> Move to Pending
                  </Button>
                )}
                
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={openEditDialog} data-testid="button-edit-instructor-detail">
                    <Edit className="h-4 w-4 mr-2" /> Edit Info
                  </Button>
                  {selectedInstructor.applicationStatus === "APPROVED" && selectedInstructor.isActive !== false && (
                    <Button 
                      variant="outline" 
                      className="flex-1 text-amber-600 hover:text-amber-700 border-amber-200 hover:border-amber-300 hover:bg-amber-50"
                      onClick={() => confirmSuspendInstructor(selectedInstructor.id, `${selectedInstructor.firstName} ${selectedInstructor.lastName}`)}
                      data-testid="button-suspend-instructor-detail"
                    >
                      <Pause className="h-4 w-4 mr-2" /> Suspend
                    </Button>
                  )}
                  {selectedInstructor.isActive === false && (
                    <Button 
                      className="flex-1"
                      onClick={() => reactivateInstructor(selectedInstructor.id)}
                      data-testid="button-reactivate-instructor-detail"
                    >
                      <Play className="h-4 w-4 mr-2" /> Reactivate
                    </Button>
                  )}
                </div>

                {(selectedInstructor._count?.instructedClasses || 0) === 0 && (
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={() => confirmDeleteInstructor(selectedInstructor.id, `${selectedInstructor.firstName} ${selectedInstructor.lastName}`)}
                    data-testid="button-delete-instructor-detail"
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Delete Instructor
                  </Button>
                )}
                {selectedInstructor.applicationStatus === "APPROVED" && (
                  <Button 
                    variant="outline" 
                    className="w-full text-gray-600 hover:text-gray-700"
                    onClick={() => archiveInstructor(selectedInstructor.id, `${selectedInstructor.firstName} ${selectedInstructor.lastName}`)}
                    data-testid="button-archive-instructor-detail"
                  >
                    <Archive className="h-4 w-4 mr-2" /> Archive Instructor
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Instructor Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  data-testid="input-edit-instructor-firstname"
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  data-testid="input-edit-instructor-lastname"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                data-testid="input-edit-instructor-email"
              />
            </div>
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                placeholder="Instructor biography..."
                data-testid="input-edit-instructor-bio"
              />
            </div>
            <Button 
              className="w-full" 
              onClick={saveEdit} 
              disabled={savingEdit}
              data-testid="button-save-instructor-edit"
            >
              {savingEdit ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
