import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Users, Eye, EyeOff, AlertCircle, BookOpen, CalendarDays, DollarSign, Clock, Calendar, RefreshCw, MapPin, Archive, ArchiveRestore } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { SessionScheduler, EmptyState, StatusBadge, ConfirmDialog } from "@/components/common";
import { SchedulerConfig, SessionPreview, DEFAULT_SCHEDULER_CONFIG, generateSessionsFromConfig } from "@/lib/scheduler";

interface ClassData {
  id: string;
  title: string;
  description?: string;
  price: number;
  capacity: number;
  status: string;
  isArchived?: boolean;
  ageMin?: number;
  ageMax?: number;
  prerequisites?: string;
  instructor: { id: string; firstName: string; lastName: string; email: string; bio?: string } | null;
  _count: { registrations: number; sessions: number };
}

interface InstructorData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  applicationStatus?: string;
}

interface SessionData {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
}

interface EnrollmentData {
  id: string;
  student: { id: string; firstName: string; lastName: string };
  family: { id: string; primaryEmail: string; primaryPhone?: string };
}

export default function ClassManager() {
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [instructors, setInstructors] = useState<InstructorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassData | null>(null);
  const [newClass, setNewClass] = useState({ 
    title: "", description: "", price: "", capacity: "", instructorId: "",
    ageMin: "", ageMax: "", prerequisites: ""
  });
  const [editClass, setEditClass] = useState({ 
    title: "", description: "", price: "", capacity: "", instructorId: "",
    ageMin: "", ageMax: "", prerequisites: ""
  });
  const [createValidationErrors, setCreateValidationErrors] = useState<Record<string, string>>({});
  const [editValidationErrors, setEditValidationErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentData[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // Session scheduler state (for class detail sheet)
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const [schedulerConfig, setSchedulerConfig] = useState<SchedulerConfig>({ ...DEFAULT_SCHEDULER_CONFIG });
  const [previewSessions, setPreviewSessions] = useState<SessionPreview[]>([]);
  
  // Create dialog session scheduler state
  const [createSchedulerConfig, setCreateSchedulerConfig] = useState<SchedulerConfig>({ ...DEFAULT_SCHEDULER_CONFIG });
  const [createPreviewSessions, setCreatePreviewSessions] = useState<SessionPreview[]>([]);
  
  // Edit dialog session scheduler state
  const [editSchedulerConfig, setEditSchedulerConfig] = useState<SchedulerConfig>({ ...DEFAULT_SCHEDULER_CONFIG });
  const [editPreviewSessions, setEditPreviewSessions] = useState<SessionPreview[]>([]);
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    variant: "default" | "destructive";
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    description: "",
    confirmLabel: "Confirm",
    variant: "default",
    onConfirm: () => {},
  });

  const validateClassForm = (
    classData: typeof newClass,
    schedulerConfig: SchedulerConfig
  ): Record<string, string> => {
    const errors: Record<string, string> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!classData.title.trim()) {
      errors.title = "Title is required";
    }
    if (!classData.description.trim()) {
      errors.description = "Description is required";
    }
    if (!classData.capacity) {
      errors.capacity = "Capacity is required";
    }
    if (!schedulerConfig.location.trim()) {
      errors.location = "Address is required";
    }
    if (!schedulerConfig.startDate) {
      errors.startDate = "Start date is required";
    }
    if (!schedulerConfig.endDate) {
      errors.endDate = "End date is required";
    }
    if (!schedulerConfig.startTime) {
      errors.startTime = "Start time is required";
    }
    if (!schedulerConfig.endTime) {
      errors.endTime = "End time is required";
    }

    if (schedulerConfig.startDate) {
      const startDate = new Date(schedulerConfig.startDate);
      if (startDate < today) {
        errors.startDate = "Start date cannot be in the past";
      }
    }

    if (schedulerConfig.startDate && schedulerConfig.endDate) {
      const startDate = new Date(schedulerConfig.startDate);
      const endDate = new Date(schedulerConfig.endDate);
      if (endDate < startDate) {
        errors.endDate = "End date must be same as or after start date";
      }
    }

    if (schedulerConfig.startTime && schedulerConfig.endTime) {
      const [startHour, startMin] = schedulerConfig.startTime.split(":").map(Number);
      const [endHour, endMin] = schedulerConfig.endTime.split(":").map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      if (endMinutes <= startMinutes) {
        errors.endTime = "End time must be after start time";
      }
    }

    return errors;
  };

  const isCreateFormValid = Object.keys(createValidationErrors).length === 0 &&
    newClass.title.trim() &&
    newClass.description.trim() &&
    newClass.capacity &&
    createSchedulerConfig.location.trim() &&
    createSchedulerConfig.startDate &&
    createSchedulerConfig.endDate &&
    createSchedulerConfig.startTime &&
    createSchedulerConfig.endTime;

  // Edit form only requires class fields - scheduler is optional for adding new sessions
  const isEditFormValid = Object.keys(editValidationErrors).length === 0 &&
    editClass.title.trim() &&
    editClass.description.trim() &&
    editClass.capacity;

  const fetchData = async () => {
    setError(null);
    const [classesRes, instructorsRes] = await Promise.all([
      apiFetch<{ classes: ClassData[] }>("/api/tenant/classes"),
      apiFetch<{ instructors: InstructorData[] }>("/api/tenant/instructors"),
    ]);

    if (classesRes.error) {
      setError(classesRes.error);
    } else {
      setClasses(classesRes.data?.classes || []);
      setError(null);
    }

    if (instructorsRes.data) {
      setInstructors(instructorsRes.data.instructors?.filter((i) => i.applicationStatus === "APPROVED") || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Keep selectedClass in sync with classes when they update
  useEffect(() => {
    if (selectedClass && classes.length > 0) {
      const updatedClass = classes.find(c => c.id === selectedClass.id);
      if (updatedClass && JSON.stringify(updatedClass) !== JSON.stringify(selectedClass)) {
        setSelectedClass(updatedClass);
      }
    }
  }, [classes, selectedClass]);

  const handleCreateClass = async () => {
    const errors = validateClassForm(newClass, createSchedulerConfig);
    setCreateValidationErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      toast({ title: "Validation Error", description: "Please fix the highlighted errors before submitting", variant: "destructive" });
      return;
    }

    setSaving(true);
    
    // Auto-generate sessions if dates are set but preview wasn't clicked
    let sessionsToCreate = createPreviewSessions;
    if (sessionsToCreate.length === 0 && createSchedulerConfig.startDate && createSchedulerConfig.endDate) {
      sessionsToCreate = generateSessionsFromConfig(createSchedulerConfig);
    }
    
    const { data, error } = await apiFetch<{ class: { id: string } }>("/api/tenant/classes", {
      method: "POST",
      body: JSON.stringify({
        title: newClass.title,
        description: newClass.description || null,
        price: Math.round(parseFloat(newClass.price) * 100) || 0,
        capacity: parseInt(newClass.capacity),
        instructorId: newClass.instructorId || null,
        ageMin: newClass.ageMin ? parseInt(newClass.ageMin) : null,
        ageMax: newClass.ageMax ? parseInt(newClass.ageMax) : null,
        prerequisites: newClass.prerequisites || null,
      }),
    });

    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
      setSaving(false);
      return;
    }
    
    // Create sessions if any were configured
    if (data?.class?.id && sessionsToCreate.length > 0) {
      await apiFetch(`/api/tenant/classes/${data.class.id}/sessions`, {
        method: "POST",
        body: JSON.stringify({ sessions: sessionsToCreate }),
      });
    }
    
    setIsAddDialogOpen(false);
    setNewClass({ title: "", description: "", price: "", capacity: "", instructorId: "", ageMin: "", ageMax: "", prerequisites: "" });
    setCreateSchedulerConfig({ ...DEFAULT_SCHEDULER_CONFIG });
    setCreatePreviewSessions([]);
    setCreateValidationErrors({});
    fetchData();
    toast({ title: "Success", description: sessionsToCreate.length > 0 ? `Class created with ${sessionsToCreate.length} sessions` : "Class created successfully" });
    setSaving(false);
  };

  const toggleStatus = async (classId: string, currentStatus: string) => {
    const newStatus = currentStatus === "Published" ? "Draft" : "Published";
    const { error } = await apiFetch(`/api/tenant/classes/${classId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus }),
    });

    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      fetchData();
    }
  };

  const confirmDeleteClass = (classId: string, classTitle: string) => {
    setConfirmDialog({
      open: true,
      title: "Delete Class",
      description: `Are you sure you want to delete "${classTitle}"? This action cannot be undone.`,
      confirmLabel: "Delete Class",
      variant: "destructive" as const,
      onConfirm: async () => {
        const { error } = await apiFetch(`/api/tenant/classes/${classId}`, { method: "DELETE" });
        if (error) {
          toast({ title: "Error", description: error, variant: "destructive" });
        } else {
          fetchData();
          setIsDetailOpen(false);
          toast({ title: "Success", description: "Class deleted" });
        }
      },
    });
  };

  const openEditDialog = (classItem: ClassData) => {
    setEditingClass(classItem);
    setEditClass({
      title: classItem.title,
      description: classItem.description || "",
      price: ((classItem.price || 0) / 100).toString(),
      capacity: classItem.capacity.toString(),
      instructorId: classItem.instructor?.id || "",
      ageMin: classItem.ageMin?.toString() || "",
      ageMax: classItem.ageMax?.toString() || "",
      prerequisites: classItem.prerequisites || "",
    });
    // Reset edit scheduler and validation
    setEditSchedulerConfig({ ...DEFAULT_SCHEDULER_CONFIG });
    setEditPreviewSessions([]);
    setEditValidationErrors({});
    setIsEditDialogOpen(true);
  };

  const handleUpdateClass = async () => {
    if (!editingClass) return;
    
    // For editing, only validate required class fields - description is optional
    const errors: Record<string, string> = {};
    if (!editClass.title.trim()) errors.title = "Title is required";
    if (!editClass.capacity) errors.capacity = "Capacity is required";
    
    setEditValidationErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      toast({ title: "Validation Error", description: "Please fix the highlighted errors before submitting", variant: "destructive" });
      return;
    }

    setSaving(true);
    
    // Only generate sessions if the scheduler has been filled out
    let sessionsToCreate = editPreviewSessions;
    const hasSchedulerData = editSchedulerConfig.startDate && editSchedulerConfig.endDate && 
                             editSchedulerConfig.startTime && editSchedulerConfig.endTime;
    if (sessionsToCreate.length === 0 && hasSchedulerData) {
      sessionsToCreate = generateSessionsFromConfig(editSchedulerConfig);
    }
    
    const { error } = await apiFetch(`/api/tenant/classes/${editingClass.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: editClass.title,
        description: editClass.description || null,
        price: Math.round(parseFloat(editClass.price) * 100) || 0,
        capacity: parseInt(editClass.capacity),
        instructorId: editClass.instructorId || null,
        ageMin: editClass.ageMin ? parseInt(editClass.ageMin) : null,
        ageMax: editClass.ageMax ? parseInt(editClass.ageMax) : null,
        prerequisites: editClass.prerequisites || null,
      }),
    });

    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
      setSaving(false);
      return;
    }
    
    // If user configured new sessions, clear existing ones first then create the new ones
    if (sessionsToCreate.length > 0) {
      // First clear existing sessions to prevent duplicates
      await apiFetch(`/api/tenant/classes/${editingClass.id}/sessions`, {
        method: "DELETE",
      });
      // Then create new sessions
      await apiFetch(`/api/tenant/classes/${editingClass.id}/sessions`, {
        method: "POST",
        body: JSON.stringify({ sessions: sessionsToCreate }),
      });
    }
    
    setIsEditDialogOpen(false);
    setEditingClass(null);
    setEditSchedulerConfig({ ...DEFAULT_SCHEDULER_CONFIG });
    setEditPreviewSessions([]);
    setEditValidationErrors({});
    fetchData();
    toast({ title: "Success", description: sessionsToCreate.length > 0 ? `Class updated with ${sessionsToCreate.length} sessions` : "Class updated successfully" });
    setSaving(false);
  };

  const openClassDetail = async (classItem: ClassData) => {
    setSelectedClass(classItem);
    setIsDetailOpen(true);
    setLoadingDetail(true);
    setSessions([]);
    setEnrollments([]);

    const [sessionsRes, enrollmentsRes] = await Promise.all([
      apiFetch<{ sessions: SessionData[] }>(`/api/tenant/classes/${classItem.id}/sessions`),
      apiFetch<{ registrations: EnrollmentData[] }>(`/api/tenant/classes/${classItem.id}/registrations`),
    ]);

    if (sessionsRes.data?.sessions) {
      setSessions(sessionsRes.data.sessions);
    }
    if (enrollmentsRes.data?.registrations) {
      setEnrollments(enrollmentsRes.data.registrations);
    }
    setLoadingDetail(false);
  };

  const openScheduler = () => {
    const today = new Date();
    const threeMonthsLater = new Date(today);
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
    
    setSchedulerConfig({
      startDate: today.toISOString().split("T")[0],
      endDate: threeMonthsLater.toISOString().split("T")[0],
      frequency: "weekly",
      daysOfWeek: [1],
      startTime: "10:00",
      endTime: "11:30",
      location: "",
      locationDetails: "",
    });
    setPreviewSessions([]);
    setIsSchedulerOpen(true);
  };

  const handleCreateSessions = async () => {
    if (!selectedClass || previewSessions.length === 0) return;
    
    setSaving(true);
    const { error } = await apiFetch(`/api/tenant/classes/${selectedClass.id}/sessions`, {
      method: "POST",
      body: JSON.stringify({ sessions: previewSessions }),
    });

    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      toast({ title: "Success", description: `Created ${previewSessions.length} sessions` });
      setIsSchedulerOpen(false);
      // Refresh the class detail
      openClassDetail(selectedClass);
      fetchData();
    }
    setSaving(false);
  };

  const confirmDeleteSession = (sessionId: string) => {
    if (!selectedClass) return;
    setConfirmDialog({
      open: true,
      title: "Delete Class",
      description: "Are you sure you want to delete this class?",
      confirmLabel: "Delete Class",
      variant: "destructive" as const,
      onConfirm: async () => {
        const { error } = await apiFetch(`/api/tenant/classes/${selectedClass.id}/sessions/${sessionId}`, {
          method: "DELETE",
        });
        if (error) {
          toast({ title: "Error", description: error, variant: "destructive" });
        } else {
          toast({ title: "Success", description: "Class deleted" });
          setSessions(sessions.filter(s => s.id !== sessionId));
          fetchData();
        }
      },
    });
  };

  const confirmClearAllSessions = () => {
    if (!selectedClass) return;
    setConfirmDialog({
      open: true,
      title: "Delete All Classes",
      description: `Are you sure you want to delete all ${sessions.length} classes for this offering? This action cannot be undone.`,
      confirmLabel: "Delete All Classes",
      variant: "destructive" as const,
      onConfirm: async () => {
        const { error } = await apiFetch(`/api/tenant/classes/${selectedClass.id}/sessions`, {
          method: "DELETE",
        });
        if (error) {
          toast({ title: "Error", description: error, variant: "destructive" });
        } else {
          toast({ title: "Success", description: "All classes deleted" });
          setSessions([]);
          fetchData();
        }
      },
    });
  };

  const confirmArchiveClass = (classId: string, classTitle: string) => {
    setConfirmDialog({
      open: true,
      title: "Archive Class",
      description: `Archive "${classTitle}"? It will be hidden from the main list but preserved for records. You can restore it later.`,
      confirmLabel: "Archive Class",
      variant: "default" as const,
      onConfirm: async () => {
        const { error } = await apiFetch(`/api/tenant/classes/${classId}/archive`, { method: "PATCH" });
        if (error) {
          toast({ title: "Error", description: error, variant: "destructive" });
        } else {
          toast({ title: "Success", description: "Class archived" });
          setIsDetailOpen(false);
          fetchData();
        }
      },
    });
  };

  const unarchiveClass = async (classId: string) => {
    const { error } = await apiFetch(`/api/tenant/classes/${classId}/unarchive`, { method: "PATCH" });
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Class restored from archive" });
      fetchData();
    }
  };

  // Filter classes by archived status
  const activeClasses = classes.filter(c => !c.isArchived);
  const archivedClasses = classes.filter(c => c.isArchived === true);

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading classes...</div>
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
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-serif font-bold tracking-tight">Class Manager</h2>
            <p className="text-muted-foreground mt-1">Create, edit, and manage your co-op classes.</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-class">
                <Plus className="h-4 w-4 mr-2" />
                Add Class
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Class</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {Object.keys(createValidationErrors).length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-800 font-medium mb-2">
                      <AlertCircle className="h-4 w-4" />
                      Please fix the following errors:
                    </div>
                    <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                      {Object.values(createValidationErrors).map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label>Class Title *</Label>
                    <Input
                      placeholder="e.g., Introduction to Art History"
                      value={newClass.title}
                      onChange={(e) => setNewClass({ ...newClass, title: e.target.value })}
                      className={createValidationErrors.title ? "border-red-500" : ""}
                      data-testid="input-class-title"
                    />
                    {createValidationErrors.title && (
                      <p className="text-xs text-red-600">{createValidationErrors.title}</p>
                    )}
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Description *</Label>
                    <Textarea
                      placeholder="Describe what students will learn..."
                      value={newClass.description}
                      onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                      className={createValidationErrors.description ? "border-red-500" : ""}
                      rows={3}
                      data-testid="input-class-description"
                    />
                    {createValidationErrors.description && (
                      <p className="text-xs text-red-600">{createValidationErrors.description}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Price ($)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      min="0"
                      step="0.01"
                      value={newClass.price}
                      onChange={(e) => setNewClass({ ...newClass, price: e.target.value })}
                      data-testid="input-class-price"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Capacity *</Label>
                    <Input
                      type="number"
                      placeholder="10"
                      min="1"
                      value={newClass.capacity}
                      onChange={(e) => setNewClass({ ...newClass, capacity: e.target.value })}
                      className={createValidationErrors.capacity ? "border-red-500" : ""}
                      data-testid="input-class-capacity"
                    />
                    {createValidationErrors.capacity && (
                      <p className="text-xs text-red-600">{createValidationErrors.capacity}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Minimum Age</Label>
                    <Input
                      type="number"
                      placeholder="Optional"
                      min="0"
                      value={newClass.ageMin}
                      onChange={(e) => setNewClass({ ...newClass, ageMin: e.target.value })}
                      data-testid="input-class-agemin"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Maximum Age</Label>
                    <Input
                      type="number"
                      placeholder="Optional"
                      min="0"
                      value={newClass.ageMax}
                      onChange={(e) => setNewClass({ ...newClass, ageMax: e.target.value })}
                      data-testid="input-class-agemax"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Prerequisites</Label>
                    <Input
                      placeholder="Optional prerequisites for the class"
                      value={newClass.prerequisites}
                      onChange={(e) => setNewClass({ ...newClass, prerequisites: e.target.value })}
                      data-testid="input-class-prerequisites"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Assign Instructor</Label>
                    <Select onValueChange={(value) => setNewClass({ ...newClass, instructorId: value })}>
                      <SelectTrigger data-testid="select-class-instructor">
                        <SelectValue placeholder="Select instructor (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {instructors.map((inst) => (
                          <SelectItem key={inst.id} value={inst.id}>
                            {inst.firstName} {inst.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <SessionScheduler
                  config={createSchedulerConfig}
                  onConfigChange={setCreateSchedulerConfig}
                  previewSessions={createPreviewSessions}
                  onPreviewGenerate={setCreatePreviewSessions}
                  title="Class Schedule *"
                  testIdPrefix="create-scheduler"
                  validationErrors={createValidationErrors}
                />

                <Button className="w-full" onClick={handleCreateClass} disabled={saving} data-testid="button-save-class">
                  {saving ? "Creating..." : "Create Class"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Class</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {Object.keys(editValidationErrors).length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-800 font-medium mb-2">
                      <AlertCircle className="h-4 w-4" />
                      Please fix the following errors:
                    </div>
                    <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                      {Object.values(editValidationErrors).map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label>Class Title *</Label>
                    <Input
                      placeholder="e.g., Introduction to Art History"
                      value={editClass.title}
                      onChange={(e) => setEditClass({ ...editClass, title: e.target.value })}
                      className={editValidationErrors.title ? "border-red-500" : ""}
                      data-testid="input-edit-class-title"
                    />
                    {editValidationErrors.title && (
                      <p className="text-xs text-red-600">{editValidationErrors.title}</p>
                    )}
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Description *</Label>
                    <Textarea
                      placeholder="Describe what students will learn..."
                      value={editClass.description}
                      onChange={(e) => setEditClass({ ...editClass, description: e.target.value })}
                      className={editValidationErrors.description ? "border-red-500" : ""}
                      rows={3}
                      data-testid="input-edit-class-description"
                    />
                    {editValidationErrors.description && (
                      <p className="text-xs text-red-600">{editValidationErrors.description}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Price ($)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      min="0"
                      step="0.01"
                      value={editClass.price}
                      onChange={(e) => setEditClass({ ...editClass, price: e.target.value })}
                      data-testid="input-edit-class-price"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Capacity *</Label>
                    <Input
                      type="number"
                      placeholder="10"
                      min="1"
                      value={editClass.capacity}
                      onChange={(e) => setEditClass({ ...editClass, capacity: e.target.value })}
                      className={editValidationErrors.capacity ? "border-red-500" : ""}
                      data-testid="input-edit-class-capacity"
                    />
                    {editValidationErrors.capacity && (
                      <p className="text-xs text-red-600">{editValidationErrors.capacity}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Minimum Age</Label>
                    <Input
                      type="number"
                      placeholder="Optional"
                      min="0"
                      value={editClass.ageMin}
                      onChange={(e) => setEditClass({ ...editClass, ageMin: e.target.value })}
                      data-testid="input-edit-class-agemin"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Maximum Age</Label>
                    <Input
                      type="number"
                      placeholder="Optional"
                      min="0"
                      value={editClass.ageMax}
                      onChange={(e) => setEditClass({ ...editClass, ageMax: e.target.value })}
                      data-testid="input-edit-class-agemax"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Prerequisites</Label>
                    <Input
                      placeholder="Optional prerequisites for the class"
                      value={editClass.prerequisites}
                      onChange={(e) => setEditClass({ ...editClass, prerequisites: e.target.value })}
                      data-testid="input-edit-class-prerequisites"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Assign Instructor</Label>
                    <Select value={editClass.instructorId} onValueChange={(value) => setEditClass({ ...editClass, instructorId: value })}>
                      <SelectTrigger data-testid="select-edit-class-instructor">
                        <SelectValue placeholder="Select instructor (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {instructors.map((inst) => (
                          <SelectItem key={inst.id} value={inst.id}>
                            {inst.firstName} {inst.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <SessionScheduler
                  config={editSchedulerConfig}
                  onConfigChange={setEditSchedulerConfig}
                  previewSessions={editPreviewSessions}
                  onPreviewGenerate={setEditPreviewSessions}
                  title="Class Schedule *"
                  testIdPrefix="edit-scheduler"
                  validationErrors={editValidationErrors}
                />

                <Button className="w-full" onClick={handleUpdateClass} disabled={saving} data-testid="button-update-class">
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {activeClasses.length === 0 && archivedClasses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No classes yet"
            description="Create your first class to start building your curriculum"
            actionLabel="Create Your First Class"
            onAction={() => setIsAddDialogOpen(true)}
            testId="button-create-first-class"
          />
        ) : (
          <div className="grid gap-4">
            {activeClasses.map((classItem) => (
              <Card 
                key={classItem.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openClassDetail(classItem)}
                data-testid={`card-class-${classItem.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold" data-testid={`text-class-title-${classItem.id}`}>
                          {classItem.title}
                        </h3>
                        <StatusBadge status={classItem.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Instructor: {classItem.instructor ? `${classItem.instructor.firstName} ${classItem.instructor.lastName}` : "Unassigned"}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {classItem._count.registrations}/{classItem.capacity} enrolled
                        </span>
                        <span>${(classItem.price / 100).toFixed(2)}</span>
                        <span>{classItem._count.sessions} classes</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleStatus(classItem.id, classItem.status)}
                        data-testid={`button-toggle-class-${classItem.id}`}
                      >
                        {classItem.status === "Published" ? (
                          <><EyeOff className="h-4 w-4 mr-1" /> Unpublish</>
                        ) : (
                          <><Eye className="h-4 w-4 mr-1" /> Publish</>
                        )}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(classItem)} data-testid={`button-edit-class-${classItem.id}`}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-gray-500" 
                        onClick={() => confirmArchiveClass(classItem.id, classItem.title)}
                        data-testid={`button-archive-class-${classItem.id}`}
                        title="Archive class"
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-red-500" 
                        onClick={() => confirmDeleteClass(classItem.id, classItem.title)}
                        data-testid={`button-delete-class-${classItem.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Archived Classes Section */}
            {archivedClasses.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-500 mb-4 flex items-center gap-2">
                  <Archive className="h-5 w-5" />
                  Archived Classes ({archivedClasses.length})
                </h3>
                <div className="grid gap-3">
                  {archivedClasses.map((classItem) => (
                    <Card key={classItem.id} className="p-4 bg-gray-50 border-l-4 border-l-gray-300" data-testid={`card-archived-class-${classItem.id}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-600">{classItem.title}</h4>
                            <Badge variant="outline" className="bg-gray-100 text-gray-500">Archived</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {classItem.instructor ? `${classItem.instructor.firstName} ${classItem.instructor.lastName}` : "Unassigned"} • {classItem._count.registrations} enrollments
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unarchiveClass(classItem.id)}
                          data-testid={`button-restore-class-${classItem.id}`}
                        >
                          <ArchiveRestore className="h-4 w-4 mr-1" /> Restore
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedClass && (
            <div className="space-y-6">
              <SheetHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <SheetTitle className="text-xl font-serif">{selectedClass.title}</SheetTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={selectedClass.status} />
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => {
                    setIsDetailOpen(false);
                    openEditDialog(selectedClass);
                  }} data-testid="button-edit-class-detail">
                    <Edit className="w-4 h-4 mr-1" /> Edit
                  </Button>
                </div>
              </SheetHeader>

              <Separator />

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-stone-50 rounded-lg">
                  <Users className="h-5 w-5 mx-auto mb-1 text-[#7C9082]" />
                  <div className="text-2xl font-bold text-stone-800">{selectedClass._count.registrations}/{selectedClass.capacity}</div>
                  <div className="text-xs text-muted-foreground">Enrolled</div>
                </div>
                <div className="text-center p-4 bg-stone-50 rounded-lg">
                  <DollarSign className="h-5 w-5 mx-auto mb-1 text-[#7C9082]" />
                  <div className="text-2xl font-bold text-stone-800">${(selectedClass.price / 100).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">Price</div>
                </div>
                <div className="text-center p-4 bg-stone-50 rounded-lg">
                  <CalendarDays className="h-5 w-5 mx-auto mb-1 text-[#7C9082]" />
                  <div className="text-2xl font-bold text-stone-800">{selectedClass._count.sessions}</div>
                  <div className="text-xs text-muted-foreground">Classes</div>
                </div>
              </div>

              {selectedClass.description && (
                <div>
                  <h4 className="font-medium text-stone-800 mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedClass.description}</p>
                </div>
              )}

              <div>
                <h4 className="font-medium text-stone-800 mb-2">Instructor</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedClass.instructor 
                    ? `${selectedClass.instructor.firstName} ${selectedClass.instructor.lastName} (${selectedClass.instructor.email})`
                    : "No instructor assigned"
                  }
                </p>
                {selectedClass.instructor?.bio && (
                  <p className="text-sm text-muted-foreground mt-1 italic">{selectedClass.instructor.bio}</p>
                )}
              </div>

              {(selectedClass.ageMin || selectedClass.ageMax) && (
                <div>
                  <h4 className="font-medium text-stone-800 mb-2">Age Range</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedClass.ageMin && selectedClass.ageMax 
                      ? `Ages ${selectedClass.ageMin} - ${selectedClass.ageMax}`
                      : selectedClass.ageMin 
                        ? `Ages ${selectedClass.ageMin}+`
                        : `Ages up to ${selectedClass.ageMax}`
                    }
                  </p>
                </div>
              )}

              {selectedClass.prerequisites && (
                <div>
                  <h4 className="font-medium text-stone-800 mb-2">Prerequisites</h4>
                  <p className="text-sm text-muted-foreground">{selectedClass.prerequisites}</p>
                </div>
              )}

              <Separator />

              {loadingDetail ? (
                <div className="text-center py-4 text-muted-foreground">Loading details...</div>
              ) : (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-stone-800 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Classes ({sessions.length})
                      </h4>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={openScheduler} data-testid="button-schedule-sessions">
                          <Calendar className="h-3 w-3 mr-1" /> Schedule
                        </Button>
                        {sessions.length > 0 && (
                          <Button variant="ghost" size="sm" onClick={confirmClearAllSessions} className="text-red-500">
                            Clear All
                          </Button>
                        )}
                      </div>
                    </div>
                    {sessions.length === 0 ? (
                      <div className="text-center py-6 bg-stone-50 rounded-lg">
                        <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No classes scheduled</p>
                        <Button variant="link" size="sm" onClick={openScheduler} className="mt-2">
                          Add classes with schedule generator
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {sessions.map((session) => (
                          <div key={session.id} className="p-3 bg-stone-50 rounded-lg text-sm flex justify-between items-center group">
                            <div>
                              <div className="font-medium">
                                {new Date(session.date).toLocaleDateString(undefined, { 
                                  weekday: 'short', month: 'short', day: 'numeric' 
                                })}
                              </div>
                              <div className="text-muted-foreground">
                                {session.startTime} - {session.endTime}
                                {session.location && ` • ${session.location}`}
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 text-red-500"
                              onClick={() => confirmDeleteSession(session.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-medium text-stone-800 mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Enrolled Students ({enrollments.length})
                    </h4>
                    {enrollments.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">No students enrolled yet</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {enrollments.map((enrollment) => (
                          <div key={enrollment.id} className="p-3 bg-stone-50 rounded-lg text-sm flex justify-between items-center">
                            <div>
                              <div className="font-medium">
                                {enrollment.student.firstName} {enrollment.student.lastName}
                              </div>
                              <div className="text-muted-foreground text-xs">
                                {enrollment.family.primaryEmail}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="pt-4 flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => toggleStatus(selectedClass.id, selectedClass.status)}
                  data-testid="button-toggle-status-detail"
                >
                  {selectedClass.status === "Published" ? (
                    <><EyeOff className="h-4 w-4 mr-2" /> Unpublish</>
                  ) : (
                    <><Eye className="h-4 w-4 mr-2" /> Publish</>
                  )}
                </Button>
                <Button 
                  variant="outline"
                  className="text-gray-600"
                  onClick={() => confirmArchiveClass(selectedClass.id, selectedClass.title)}
                  data-testid="button-archive-class-detail"
                >
                  <Archive className="h-4 w-4 mr-2" /> Archive
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => confirmDeleteClass(selectedClass.id, selectedClass.title)}
                  data-testid="button-delete-class-detail"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

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

      {/* Class Schedule Dialog */}
      <Dialog open={isSchedulerOpen} onOpenChange={setIsSchedulerOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Schedule Recurring Classes
            </DialogTitle>
            <DialogDescription>
              Create multiple classes at once using a recurring pattern.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <SessionScheduler
              config={schedulerConfig}
              onConfigChange={setSchedulerConfig}
              previewSessions={previewSessions}
              onPreviewGenerate={setPreviewSessions}
              title="Class Schedule"
              testIdPrefix="detail-scheduler"
            />

            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setIsSchedulerOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1"
                onClick={handleCreateSessions}
                disabled={saving || previewSessions.length === 0}
                data-testid="button-create-sessions"
              >
                {saving ? "Creating..." : `Create ${previewSessions.length} Classes`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
