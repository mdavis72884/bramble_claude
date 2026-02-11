import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, Edit, Trash2, Users, BookOpen, CalendarDays, DollarSign, 
  Clock, Calendar, MapPin, Archive, ArchiveRestore, ChevronRight,
  ArrowLeft, Layers, X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { SessionScheduler, EmptyState, StatusBadge, ConfirmDialog } from "@/components/common";
import { 
  SchedulerConfig, ClassPreview, DEFAULT_SCHEDULER_CONFIG, generateClassesFromConfig,
  extractScheduleFromClasses, formatScheduleSummary, formatDateRange, ExtractedSchedule
} from "@/lib/scheduler";

interface Course {
  id: string;
  title: string;
  description?: string;
  prerequisites?: string;
  ageMin?: number;
  ageMax?: number;
  imageUrl?: string;
  isArchived?: boolean;
  offerings: Offering[];
}

interface Offering {
  id: string;
  courseId: string;
  instructorId?: string;
  seasonLabel?: string;
  price: number;
  capacity: number;
  status: string;
  isArchived?: boolean;
  materialsUrl?: string;
  instructor?: { id: string; firstName: string; lastName: string; email: string };
  classes: OfferingClass[];
  _count: { registrations: number };
  course?: Course;
}

interface OfferingClass {
  id: string;
  offeringId: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  locationDetails?: string;
  isCancelled?: boolean;
  isOneOff?: boolean;
}

interface InstructorData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  applicationStatus?: string;
}

export default function CourseManager() {
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [instructors, setInstructors] = useState<InstructorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // View state
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedOffering, setSelectedOffering] = useState<Offering | null>(null);
  
  // Dialog states
  const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false);
  const [isOfferingDialogOpen, setIsOfferingDialogOpen] = useState(false);
  const [isOfferingDetailOpen, setIsOfferingDetailOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingOffering, setEditingOffering] = useState<Offering | null>(null);
  
  // Form state for course
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    prerequisites: "",
    ageMin: "",
    ageMax: "",
  });
  
  // Form state for offering
  const [offeringForm, setOfferingForm] = useState({
    instructorId: "",
    seasonLabel: "",
    price: "",
    capacity: "",
    status: "Draft",
  });
  
  // Scheduler state for offering
  const [schedulerConfig, setSchedulerConfig] = useState<SchedulerConfig>({ ...DEFAULT_SCHEDULER_CONFIG });
  const [previewClasses, setPreviewClasses] = useState<ClassPreview[]>([]);
  const [existingClasses, setExistingClasses] = useState<OfferingClass[]>([]);
  const [originalClasses, setOriginalClasses] = useState<OfferingClass[]>([]); // Track original state for dirty detection
  
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Schedule display mode (display-first, edit on demand)
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [currentSchedule, setCurrentSchedule] = useState<ExtractedSchedule | null>(null);
  
  // Individual class management
  const [rescheduleDialog, setRescheduleDialog] = useState<{ open: boolean; classData: OfferingClass | null }>({ open: false, classData: null });
  const [rescheduleForm, setRescheduleForm] = useState({ date: "", startTime: "", endTime: "", location: "", locationDetails: "" });
  const [addOneOffDialog, setAddOneOffDialog] = useState(false);
  const [oneOffForm, setOneOffForm] = useState({ date: "", startTime: "10:00", endTime: "11:30", location: "", locationDetails: "" });
  
  // Confirmation dialog
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

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    const [coursesRes, instructorsRes] = await Promise.all([
      apiFetch<{ courses: Course[] }>("/api/tenant/courses"),
      apiFetch<{ instructors: InstructorData[] }>("/api/tenant/instructors"),
    ]);

    if (coursesRes.error) {
      setError(coursesRes.error);
    } else {
      setCourses(coursesRes.data?.courses || []);
    }

    if (instructorsRes.data) {
      setInstructors(instructorsRes.data.instructors?.filter((i) => i.applicationStatus === "APPROVED") || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Course CRUD
  const openCreateCourse = () => {
    setEditingCourse(null);
    setCourseForm({ title: "", description: "", prerequisites: "", ageMin: "", ageMax: "" });
    setIsCourseDialogOpen(true);
  };

  const openEditCourse = (course: Course) => {
    setEditingCourse(course);
    setCourseForm({
      title: course.title,
      description: course.description || "",
      prerequisites: course.prerequisites || "",
      ageMin: course.ageMin?.toString() || "",
      ageMax: course.ageMax?.toString() || "",
    });
    setIsCourseDialogOpen(true);
  };

  const handleSaveCourse = async () => {
    if (!courseForm.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    const body = {
      title: courseForm.title.trim(),
      description: courseForm.description.trim() || null,
      prerequisites: courseForm.prerequisites.trim() || null,
      ageMin: courseForm.ageMin ? parseInt(courseForm.ageMin) : null,
      ageMax: courseForm.ageMax ? parseInt(courseForm.ageMax) : null,
    };

    if (editingCourse) {
      const { error } = await apiFetch(`/api/tenant/courses/${editingCourse.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (error) {
        toast({ title: "Failed to update course", description: error, variant: "destructive" });
      } else {
        toast({ title: "Course updated" });
        setIsCourseDialogOpen(false);
        fetchData();
      }
    } else {
      const { error } = await apiFetch("/api/tenant/courses", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (error) {
        toast({ title: "Failed to create course", description: error, variant: "destructive" });
      } else {
        toast({ title: "Course created" });
        setIsCourseDialogOpen(false);
        fetchData();
      }
    }
    setSaving(false);
  };

  const handleArchiveCourse = async (course: Course) => {
    const action = course.isArchived ? "unarchive" : "archive";
    const { error } = await apiFetch(`/api/tenant/courses/${course.id}/${action}`, { method: "PATCH" });
    if (error) {
      toast({ title: `Failed to ${action} course`, description: error, variant: "destructive" });
    } else {
      toast({ title: `Course ${action}d` });
      fetchData();
    }
  };

  // Offering CRUD
  const openCreateOffering = (course: Course) => {
    setSelectedCourse(course);
    setEditingOffering(null);
    setOfferingForm({ instructorId: "", seasonLabel: "", price: "", capacity: "", status: "Draft" });
    setSchedulerConfig({ ...DEFAULT_SCHEDULER_CONFIG });
    setPreviewClasses([]);
    setExistingClasses([]);
    setOriginalClasses([]);
    setHasUnsavedChanges(false);
    setCurrentSchedule(null);
    setIsEditingSchedule(true); // New offering: start in edit mode
    setIsOfferingDialogOpen(true);
  };

  const openEditOffering = async (offering: Offering) => {
    setEditingOffering(offering);
    setOfferingForm({
      instructorId: offering.instructorId || "",
      seasonLabel: offering.seasonLabel || "",
      price: (offering.price / 100).toFixed(2),
      capacity: offering.capacity.toString(),
      status: offering.status,
    });
    
    // Load existing classes
    const classes = offering.classes || [];
    setExistingClasses(classes);
    setOriginalClasses(JSON.parse(JSON.stringify(classes))); // Deep copy for comparison
    setPreviewClasses([]);
    
    // Extract schedule pattern from existing classes
    const extracted = extractScheduleFromClasses(classes);
    setCurrentSchedule(extracted);
    
    // Pre-populate scheduler config from extracted pattern
    if (extracted.hasSchedule) {
      setSchedulerConfig({
        startDate: extracted.startDate,
        endDate: extracted.endDate,
        dayTimes: extracted.dayTimes,
        location: extracted.location,
        locationDetails: extracted.locationDetails,
      });
    } else {
      setSchedulerConfig({ ...DEFAULT_SCHEDULER_CONFIG });
    }
    
    setIsEditingSchedule(false); // Edit existing: start in display mode
    setHasUnsavedChanges(false);
    setIsOfferingDialogOpen(true);
  };

  const handleSaveOffering = async () => {
    if (!offeringForm.price || !offeringForm.capacity) {
      toast({ title: "Price and capacity are required", variant: "destructive" });
      return;
    }

    setSaving(true);

    // Get one-off classes (manually added) - these are preserved across schedule changes
    const oneOffClasses = existingClasses.filter(c => c.isOneOff).map(c => ({
      date: c.date,
      startTime: c.startTime,
      endTime: c.endTime,
      location: c.location,
      locationDetails: c.locationDetails,
      isCancelled: c.isCancelled || false,
      isOneOff: true,
    }));
    
    // Get pattern-based classes from existingClasses (not one-off) - only used if no preview generated
    const existingPatternClasses = existingClasses.filter(c => !c.isOneOff).map(c => ({
      date: c.date,
      startTime: c.startTime,
      endTime: c.endTime,
      location: c.location,
      locationDetails: c.locationDetails,
      isCancelled: c.isCancelled || false,
      isOneOff: false,
    }));
    
    // If we have preview classes from the scheduler, use those as the pattern-based classes
    // Otherwise, keep the existing pattern-based classes
    const patternClasses = previewClasses.length > 0 
      ? previewClasses.map(p => ({
          date: p.date,
          startTime: p.startTime,
          endTime: p.endTime,
          location: p.location,
          locationDetails: p.locationDetails,
          isCancelled: false,
          isOneOff: false,
        }))
      : existingPatternClasses;
    
    // Combine: pattern-based classes + one-off classes
    const allClasses = [...patternClasses, ...oneOffClasses];
    
    // Validate that all classes have required fields
    const invalidClasses = allClasses.filter(c => !c.date || !c.startTime || !c.endTime);
    if (invalidClasses.length > 0) {
      toast({ title: "Some classes are missing date or time", description: "Please ensure all classes have a date, start time, and end time", variant: "destructive" });
      setSaving(false);
      return;
    }

    const body = {
      instructorId: offeringForm.instructorId || null,
      seasonLabel: offeringForm.seasonLabel.trim() || null,
      price: Math.round(parseFloat(offeringForm.price) * 100),
      capacity: parseInt(offeringForm.capacity),
      status: offeringForm.status,
      classes: allClasses,
    };

    if (editingOffering) {
      const { error } = await apiFetch(`/api/tenant/offerings/${editingOffering.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (error) {
        toast({ title: "Failed to update offering", description: error, variant: "destructive" });
      } else {
        toast({ title: "Offering updated" });
        setIsOfferingDialogOpen(false);
        fetchData();
      }
    } else {
      const { error } = await apiFetch(`/api/tenant/courses/${selectedCourse!.id}/offerings`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (error) {
        toast({ title: "Failed to create offering", description: error, variant: "destructive" });
      } else {
        toast({ title: "Offering created" });
        setIsOfferingDialogOpen(false);
        fetchData();
      }
    }
    setSaving(false);
  };

  const handleArchiveOffering = async (offering: Offering) => {
    const action = offering.isArchived ? "unarchive" : "archive";
    const { error } = await apiFetch(`/api/tenant/offerings/${offering.id}/${action}`, { method: "PATCH" });
    if (error) {
      toast({ title: `Failed to ${action} offering`, description: error, variant: "destructive" });
    } else {
      toast({ title: `Offering ${action}d` });
      fetchData();
    }
  };

  const openOfferingDetail = async (offering: Offering) => {
    // Fetch full offering details
    const { data, error } = await apiFetch<{ offering: Offering }>(`/api/tenant/offerings/${offering.id}`);
    if (error) {
      toast({ title: "Failed to load offering details", description: error, variant: "destructive" });
      return;
    }
    setSelectedOffering(data!.offering);
    setIsOfferingDetailOpen(true);
  };

  // Update preview when scheduler config changes
  const handleGeneratePreview = () => {
    if (schedulerConfig.startDate && schedulerConfig.endDate && schedulerConfig.dayTimes.length > 0) {
      const generated = generateClassesFromConfig(schedulerConfig);
      setPreviewClasses(generated);
    }
  };

  // Remove an existing class
  const removeExistingClass = (classId: string) => {
    setExistingClasses(prev => prev.filter(c => c.id !== classId));
    setHasUnsavedChanges(true);
  };

  // Remove a preview class
  const removePreviewClass = (index: number) => {
    setPreviewClasses(prev => prev.filter((_, i) => i !== index));
  };

  // Open reschedule dialog
  const openReschedule = (cls: OfferingClass) => {
    setRescheduleForm({
      date: cls.date.split('T')[0],
      startTime: cls.startTime,
      endTime: cls.endTime,
      location: cls.location || "",
      locationDetails: cls.locationDetails || "",
    });
    setRescheduleDialog({ open: true, classData: cls });
  };

  // Save rescheduled class (updates in existingClasses state for later save)
  const saveReschedule = () => {
    if (!rescheduleDialog.classData) return;
    setExistingClasses(prev => prev.map(c => 
      c.id === rescheduleDialog.classData!.id 
        ? { ...c, date: rescheduleForm.date, startTime: rescheduleForm.startTime, endTime: rescheduleForm.endTime, location: rescheduleForm.location || undefined, locationDetails: rescheduleForm.locationDetails || undefined }
        : c
    ));
    setRescheduleDialog({ open: false, classData: null });
    setHasUnsavedChanges(true);
    toast({ title: "Class rescheduled - save offering to apply changes" });
  };

  // Cancel a class (mark as cancelled in state)
  const cancelClass = (classId: string) => {
    setConfirmDialog({
      open: true,
      title: "Cancel Class",
      description: "Are you sure you want to cancel this class? Enrolled families will be notified.",
      confirmLabel: "Cancel Class",
      variant: "destructive",
      onConfirm: () => {
        setExistingClasses(prev => prev.map(c => 
          c.id === classId ? { ...c, isCancelled: true } : c
        ));
        setHasUnsavedChanges(true);
        toast({ title: "Class marked as cancelled - save offering to apply" });
        setConfirmDialog(prev => ({ ...prev, open: false }));
      },
    });
  };

  // Uncancel a class
  const uncancelClass = (classId: string) => {
    setExistingClasses(prev => prev.map(c => 
      c.id === classId ? { ...c, isCancelled: false } : c
    ));
    setHasUnsavedChanges(true);
    toast({ title: "Class restored - save offering to apply" });
  };

  // Add one-off class (adds to existing classes with isOneOff flag)
  const addOneOffClass = () => {
    if (!oneOffForm.date || !oneOffForm.startTime || !oneOffForm.endTime) {
      toast({ title: "Please fill in date and times", variant: "destructive" });
      return;
    }
    const newClass: OfferingClass = {
      id: `new-${Date.now()}`,
      offeringId: editingOffering?.id || "",
      date: oneOffForm.date,
      startTime: oneOffForm.startTime,
      endTime: oneOffForm.endTime,
      location: oneOffForm.location,
      locationDetails: oneOffForm.locationDetails,
      isCancelled: false,
      isOneOff: true,
    };
    // Add one-off classes to existingClasses - these are preserved when schedule regenerates
    setExistingClasses(prev => [...prev, newClass].sort((a, b) => a.date.localeCompare(b.date)));
    setAddOneOffDialog(false);
    setOneOffForm({ date: "", startTime: "10:00", endTime: "11:30", location: "", locationDetails: "" });
    setHasUnsavedChanges(true);
    toast({ title: "One-off class added - save offering to apply" });
  };

  // Handle close offering dialog with unsaved changes warning
  const handleCloseOfferingDialog = () => {
    if (hasUnsavedChanges) {
      setConfirmDialog({
        open: true,
        title: "Unsaved Changes",
        description: "You have unsaved changes. Are you sure you want to close without saving?",
        confirmLabel: "Discard Changes",
        variant: "destructive",
        onConfirm: () => {
          setIsOfferingDialogOpen(false);
          setHasUnsavedChanges(false);
          setConfirmDialog(prev => ({ ...prev, open: false }));
        },
      });
    } else {
      setIsOfferingDialogOpen(false);
    }
  };

  const formatPrice = (cents: number) => {
    return cents === 0 ? "Free" : `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", { 
      weekday: "short", month: "short", day: "numeric" 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Published": return "bg-green-100 text-green-800";
      case "Draft": return "bg-gray-100 text-gray-800";
      case "Pending Approval": return "bg-yellow-100 text-yellow-800";
      case "Archived": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7C9082]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        Error loading courses: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Course Library</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your courses and their seasonal offerings
          </p>
        </div>
        <Button onClick={openCreateCourse} className="bg-[#7C9082] hover:bg-[#6B7F71]">
          <Plus className="w-4 h-4 mr-2" />
          New Course
        </Button>
      </div>

      {/* Course List */}
      {courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses yet"
          description="Create your first course to start building your class catalog"
          actionLabel="Create Course"
          onAction={openCreateCourse}
        />
      ) : (
        <div className="grid gap-4">
          {courses.map((course) => (
            <Card key={course.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-[#7C9082]" />
                      {course.title}
                    </CardTitle>
                    {course.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{course.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      {(course.ageMin || course.ageMax) && (
                        <span>
                          Ages: {course.ageMin || "Any"} - {course.ageMax || "Any"}
                        </span>
                      )}
                      <span>
                        <Layers className="w-3 h-3 inline mr-1" />
                        {course.offerings.length} offering{course.offerings.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditCourse(course)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleArchiveCourse(course)}
                    >
                      {course.isArchived ? (
                        <ArchiveRestore className="w-4 h-4" />
                      ) : (
                        <Archive className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {/* Offerings for this course */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-700">Offerings</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openCreateOffering(course)}
                      className="text-[#7C9082] hover:text-[#6B7F71]"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      New Offering
                    </Button>
                  </div>
                  
                  {course.offerings.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">
                      No offerings yet. Create one to start enrolling students.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {course.offerings.map((offering) => (
                        <div
                          key={offering.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                          onClick={() => openOfferingDetail(offering)}
                        >
                          <div className="flex items-center gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">
                                  {offering.seasonLabel || "Untitled Offering"}
                                </span>
                                <Badge className={getStatusColor(offering.status)} variant="secondary">
                                  {offering.status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                {offering.instructor && (
                                  <span>
                                    {offering.instructor.firstName} {offering.instructor.lastName}
                                  </span>
                                )}
                                <span>
                                  <DollarSign className="w-3 h-3 inline" />
                                  {formatPrice(offering.price)}
                                </span>
                                <span>
                                  <Users className="w-3 h-3 inline mr-1" />
                                  {offering._count?.registrations || 0}/{offering.capacity}
                                </span>
                                <span>
                                  <Calendar className="w-3 h-3 inline mr-1" />
                                  {offering.classes?.length || 0} classes
                                </span>
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Course Dialog */}
      <Dialog open={isCourseDialogOpen} onOpenChange={setIsCourseDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCourse ? "Edit Course" : "Create Course"}</DialogTitle>
            <DialogDescription>
              A course is a reusable template for a subject (e.g., "Welding", "Art 101").
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="course-title">Course Title *</Label>
              <Input
                id="course-title"
                value={courseForm.title}
                onChange={(e) => setCourseForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Introduction to Welding"
              />
            </div>
            
            <div>
              <Label htmlFor="course-description">Description</Label>
              <Textarea
                id="course-description"
                value={courseForm.description}
                onChange={(e) => setCourseForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="What will students learn in this course?"
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="course-prerequisites">Prerequisites & Notes</Label>
              <Textarea
                id="course-prerequisites"
                value={courseForm.prerequisites}
                onChange={(e) => setCourseForm(prev => ({ ...prev, prerequisites: e.target.value }))}
                placeholder="Any requirements or notes for students"
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="course-ageMin">Minimum Age</Label>
                <Input
                  id="course-ageMin"
                  type="number"
                  value={courseForm.ageMin}
                  onChange={(e) => setCourseForm(prev => ({ ...prev, ageMin: e.target.value }))}
                  placeholder="Any"
                />
              </div>
              <div>
                <Label htmlFor="course-ageMax">Maximum Age</Label>
                <Input
                  id="course-ageMax"
                  type="number"
                  value={courseForm.ageMax}
                  onChange={(e) => setCourseForm(prev => ({ ...prev, ageMax: e.target.value }))}
                  placeholder="Any"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCourseDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveCourse} 
              disabled={saving || !courseForm.title.trim()}
              className="bg-[#7C9082] hover:bg-[#6B7F71]"
            >
              {saving ? "Saving..." : editingCourse ? "Save Changes" : "Create Course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Offering Dialog */}
      <Dialog open={isOfferingDialogOpen} onOpenChange={(open) => !open && handleCloseOfferingDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingOffering ? "Edit Offering" : "Create Offering"}
            </DialogTitle>
            <DialogDescription>
              {editingOffering 
                ? `Editing ${editingOffering.seasonLabel || "offering"} for ${editingOffering.course?.title || "this course"}`
                : `Creating a new offering for "${selectedCourse?.title}"`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="offering-season">Season Label</Label>
                <Input
                  id="offering-season"
                  value={offeringForm.seasonLabel}
                  onChange={(e) => setOfferingForm(prev => ({ ...prev, seasonLabel: e.target.value }))}
                  placeholder="e.g., Fall 2026, Spring 2027"
                />
              </div>
              <div>
                <Label htmlFor="offering-status">Status</Label>
                <Select
                  value={offeringForm.status}
                  onValueChange={(v) => setOfferingForm(prev => ({ ...prev, status: v }))}
                >
                  <SelectTrigger id="offering-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Pending Approval">Pending Approval</SelectItem>
                    <SelectItem value="Published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="offering-price">Price ($) *</Label>
                <Input
                  id="offering-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={offeringForm.price}
                  onChange={(e) => setOfferingForm(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="offering-capacity">Capacity *</Label>
                <Input
                  id="offering-capacity"
                  type="number"
                  min="1"
                  value={offeringForm.capacity}
                  onChange={(e) => setOfferingForm(prev => ({ ...prev, capacity: e.target.value }))}
                  placeholder="20"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="offering-instructor">Instructor</Label>
              <Select
                value={offeringForm.instructorId}
                onValueChange={(v) => setOfferingForm(prev => ({ ...prev, instructorId: v === "none" ? "" : v }))}
              >
                <SelectTrigger id="offering-instructor">
                  <SelectValue placeholder="Select an instructor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No instructor assigned</SelectItem>
                  {instructors.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.firstName} {inst.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Separator />
            
            {/* Class Schedule */}
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Schedule
              </h3>
              
              {/* Display Mode: Show schedule summary */}
              {!isEditingSchedule && currentSchedule?.hasSchedule && (
                <div className="border rounded-lg p-4 bg-white mb-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">{formatScheduleSummary(currentSchedule)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <CalendarDays className="w-4 h-4" />
                        <span>{formatDateRange(currentSchedule.startDate, currentSchedule.endDate)}</span>
                      </div>
                      {currentSchedule.location && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <MapPin className="w-4 h-4" />
                          <span>{currentSchedule.location}</span>
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-2">
                        {existingClasses.filter(c => !c.isOneOff).length} classes scheduled
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingSchedule(true)}
                      data-testid="button-edit-schedule"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Display Mode: No schedule yet */}
              {!isEditingSchedule && (!currentSchedule || !currentSchedule.hasSchedule) && existingClasses.length === 0 && (
                <div className="border border-dashed rounded-lg p-6 bg-gray-50 mb-4 text-center">
                  <CalendarDays className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm mb-3">No schedule set yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingSchedule(true)}
                    data-testid="button-set-schedule"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Set Schedule
                  </Button>
                </div>
              )}
              
              {/* Edit Mode: Schedule editor */}
              {isEditingSchedule && (
                <div className="border rounded-lg p-4 bg-stone-50 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">
                      {currentSchedule?.hasSchedule ? "Edit Schedule" : "Set Schedule"}
                    </Label>
                    {currentSchedule?.hasSchedule && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsEditingSchedule(false);
                          setPreviewClasses([]); // Clear any preview
                          // Restore scheduler config to current schedule values
                          if (currentSchedule) {
                            setSchedulerConfig({
                              startDate: currentSchedule.startDate,
                              endDate: currentSchedule.endDate,
                              dayTimes: currentSchedule.dayTimes,
                              location: currentSchedule.location,
                              locationDetails: currentSchedule.locationDetails,
                            });
                          }
                        }}
                        className="text-xs h-7"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </div>
                  {currentSchedule?.hasSchedule && (
                    <p className="text-xs text-amber-600 mb-3">
                      Changing the schedule will regenerate all recurring classes. One-off classes will be preserved.
                    </p>
                  )}
                  
                  <SessionScheduler
                    config={schedulerConfig}
                    onConfigChange={setSchedulerConfig}
                    previewClasses={previewClasses}
                    onPreviewGenerate={(classes) => {
                      setPreviewClasses(classes);
                      if (classes.length > 0) setHasUnsavedChanges(true);
                    }}
                  />
                  
                  {previewClasses.length > 0 && (
                    <p className="text-xs text-green-600 mt-2">
                      {previewClasses.length} classes will be created from this schedule
                    </p>
                  )}
                </div>
              )}
              
              {/* Class List */}
              {existingClasses.length > 0 && (
                <div className="mb-4">
                  <Label className="text-sm text-gray-500 mb-2 block">
                    Classes ({existingClasses.length})
                    {existingClasses.filter(c => c.isOneOff).length > 0 && (
                      <span className="ml-1 text-blue-600">
                        · {existingClasses.filter(c => c.isOneOff).length} one-off
                      </span>
                    )}
                  </Label>
                  <div className="space-y-1 max-h-64 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                    {existingClasses.sort((a, b) => a.date.localeCompare(b.date)).map((cls) => (
                      <div key={cls.id} className={`flex items-center justify-between p-2 rounded text-sm ${cls.isCancelled ? 'bg-red-50 border border-red-200' : cls.isOneOff ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className={`font-medium ${cls.isCancelled ? 'line-through text-gray-400' : ''}`}>{formatDate(cls.date)}</span>
                          <span className={`${cls.isCancelled ? 'line-through text-gray-400' : 'text-gray-500'}`}>
                            {cls.startTime} - {cls.endTime}
                          </span>
                          {cls.location && (
                            <span className="text-gray-400 truncate">
                              <MapPin className="w-3 h-3 inline mr-1" />
                              {cls.location}
                            </span>
                          )}
                          {cls.isOneOff && !cls.isCancelled && (
                            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">One-off</Badge>
                          )}
                          {cls.isCancelled && (
                            <Badge variant="destructive" className="text-xs">Cancelled</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {!cls.isCancelled ? (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => openReschedule(cls)} className="h-7 px-2 text-xs" data-testid={`button-reschedule-${cls.id}`}>
                                Reschedule
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => cancelClass(cls.id)} className="h-7 px-2 text-xs text-amber-600 hover:text-amber-700" data-testid={`button-cancel-${cls.id}`}>
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <Button variant="ghost" size="sm" onClick={() => uncancelClass(cls.id)} className="h-7 px-2 text-xs text-green-600 hover:text-green-700" data-testid={`button-restore-${cls.id}`}>
                              Restore
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => removeExistingClass(cls.id)} className="text-red-500 hover:text-red-700 h-7 w-7 p-0" data-testid={`button-delete-${cls.id}`}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* One-off classes section (when there's a schedule but user wants to add extras) */}
              {existingClasses.length > 0 && !isEditingSchedule && (
                <div className="flex justify-end mb-2">
                  <Button variant="outline" size="sm" onClick={() => setAddOneOffDialog(true)} data-testid="button-add-oneoff">
                    <Plus className="w-3 h-3 mr-1" /> Add One-Off Class
                  </Button>
                </div>
              )}
              
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseOfferingDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveOffering} 
              disabled={saving || !offeringForm.price || !offeringForm.capacity || (existingClasses.length === 0 && previewClasses.length === 0)}
              className="bg-[#7C9082] hover:bg-[#6B7F71]"
            >
              {saving ? "Saving..." : editingOffering ? "Save Changes" : "Create Offering"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Offering Detail Sheet */}
      <Sheet open={isOfferingDetailOpen} onOpenChange={setIsOfferingDetailOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {selectedOffering?.course?.title}
              {selectedOffering?.seasonLabel && (
                <span className="text-gray-500 font-normal">({selectedOffering.seasonLabel})</span>
              )}
            </SheetTitle>
            <SheetDescription>
              Offering details and individual classes
            </SheetDescription>
          </SheetHeader>
          
          {selectedOffering && (
            <div className="mt-6 space-y-6">
              {/* Status & Actions */}
              <div className="flex items-center justify-between">
                <Badge className={getStatusColor(selectedOffering.status)}>
                  {selectedOffering.status}
                </Badge>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsOfferingDetailOpen(false);
                      openEditOffering(selectedOffering);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                </div>
              </div>
              
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Instructor</span>
                  <p className="font-medium">
                    {selectedOffering.instructor 
                      ? `${selectedOffering.instructor.firstName} ${selectedOffering.instructor.lastName}`
                      : "Not assigned"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Price</span>
                  <p className="font-medium">{formatPrice(selectedOffering.price)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Capacity</span>
                  <p className="font-medium">
                    {selectedOffering._count?.registrations || 0} / {selectedOffering.capacity} enrolled
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Classes</span>
                  <p className="font-medium">{selectedOffering.classes?.length || 0} scheduled</p>
                </div>
              </div>
              
              <Separator />
              
              {/* Class Schedule */}
              <div>
                <h3 className="font-medium mb-3">Class Schedule</h3>
                {selectedOffering.classes?.length === 0 ? (
                  <p className="text-gray-400 text-sm italic">No classes scheduled</p>
                ) : (
                  <div className="space-y-2">
                    {selectedOffering.classes?.map((cls) => (
                      <div key={cls.id} className={`p-3 rounded-lg border ${cls.isCancelled ? 'bg-red-50 border-red-200' : 'bg-gray-50'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {formatDate(cls.date)}
                              {cls.isCancelled && (
                                <Badge variant="destructive" className="ml-2 text-xs">Cancelled</Badge>
                              )}
                            </p>
                            <p className="text-sm text-gray-500">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {cls.startTime} - {cls.endTime}
                            </p>
                            {cls.location && (
                              <p className="text-sm text-gray-500">
                                <MapPin className="w-3 h-3 inline mr-1" />
                                {cls.location}
                                {cls.locationDetails && ` • ${cls.locationDetails}`}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialog.open} onOpenChange={(open) => setRescheduleDialog({ open, classData: open ? rescheduleDialog.classData : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Class</DialogTitle>
            <DialogDescription>Change the date and time for this class</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Date</Label>
              <Input
                type="date"
                value={rescheduleForm.date}
                onChange={(e) => setRescheduleForm(prev => ({ ...prev, date: e.target.value }))}
                data-testid="input-reschedule-date"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={rescheduleForm.startTime}
                  onChange={(e) => setRescheduleForm(prev => ({ ...prev, startTime: e.target.value }))}
                  data-testid="input-reschedule-start-time"
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={rescheduleForm.endTime}
                  onChange={(e) => setRescheduleForm(prev => ({ ...prev, endTime: e.target.value }))}
                  data-testid="input-reschedule-end-time"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location (optional)</Label>
              <Input
                value={rescheduleForm.location}
                onChange={(e) => setRescheduleForm(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Address"
                data-testid="input-reschedule-location"
              />
            </div>
            <div className="space-y-2">
              <Label>Location Details (optional)</Label>
              <Input
                value={rescheduleForm.locationDetails}
                onChange={(e) => setRescheduleForm(prev => ({ ...prev, locationDetails: e.target.value }))}
                placeholder="Directions or notes"
                data-testid="input-reschedule-location-details"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleDialog({ open: false, classData: null })}>Cancel</Button>
            <Button 
              onClick={saveReschedule} 
              disabled={!rescheduleForm.date || !rescheduleForm.startTime || !rescheduleForm.endTime}
              data-testid="button-save-reschedule"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add One-Off Class Dialog */}
      <Dialog open={addOneOffDialog} onOpenChange={setAddOneOffDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add One-Off Class</DialogTitle>
            <DialogDescription>Add a single class outside the regular schedule (e.g., makeup session)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={oneOffForm.date}
                onChange={(e) => setOneOffForm(prev => ({ ...prev, date: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                data-testid="input-oneoff-date"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time *</Label>
                <Input
                  type="time"
                  value={oneOffForm.startTime}
                  onChange={(e) => setOneOffForm(prev => ({ ...prev, startTime: e.target.value }))}
                  data-testid="input-oneoff-start-time"
                />
              </div>
              <div className="space-y-2">
                <Label>End Time *</Label>
                <Input
                  type="time"
                  value={oneOffForm.endTime}
                  onChange={(e) => setOneOffForm(prev => ({ ...prev, endTime: e.target.value }))}
                  data-testid="input-oneoff-end-time"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location (optional)</Label>
              <Input
                value={oneOffForm.location}
                onChange={(e) => setOneOffForm(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Address"
                data-testid="input-oneoff-location"
              />
            </div>
            <div className="space-y-2">
              <Label>Location Details (optional)</Label>
              <Input
                value={oneOffForm.locationDetails}
                onChange={(e) => setOneOffForm(prev => ({ ...prev, locationDetails: e.target.value }))}
                placeholder="Directions or notes"
                data-testid="input-oneoff-location-details"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOneOffDialog(false)}>Cancel</Button>
            <Button 
              onClick={addOneOffClass} 
              disabled={!oneOffForm.date || !oneOffForm.startTime || !oneOffForm.endTime}
              data-testid="button-add-oneoff-save"
            >
              Add Class
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
      />
    </div>
  );
}
