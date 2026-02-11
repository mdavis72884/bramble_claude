import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { SessionScheduler, EmptyState, StatCard, CalendarHeader, useCalendarNavigation, StatusBadge } from "@/components/common";
import { SchedulerConfig, ClassPreview, DEFAULT_SCHEDULER_CONFIG, generateClassesFromConfig } from "@/lib/scheduler";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { 
  Home, BookOpen, CalendarDays, Calendar, DollarSign, MessageSquare, User, LogOut,
  Users, Clock, MapPin, FileText, ChevronRight, Save, ChevronLeft, Send, Plus, X, Edit, Settings, AlertCircle, ChevronDown, Eye
} from "lucide-react";


interface ProfileData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  bio?: string;
  applicationStatus: string;
  tenant?: { id: string; name: string; slug: string };
}

interface ClassData {
  id: string;
  title: string;
  description: string;
  price: number;
  capacity: number;
  status: string;
  ageMin?: number;
  ageMax?: number;
  prerequisites?: string;
  materialsUrl?: string;
  sessions: Array<{
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    location?: string;
    notes?: Array<{ content: string }>;
  }>;
  _count: { registrations: number };
  tenant?: { name: string; slug: string };
}

interface RosterEntry {
  registrationId: string;
  parent: { name: string; email: string; phone?: string };
  student: {
    name: string;
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
  } | null;
  enrolledAt: string;
}

interface CalendarEvent {
  type: string;
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  classId?: string;
}

interface PayoutSummary {
  totalEarnings: number;
  totalPaid: number;
  pendingPayout: number;
}

interface EarningsEntry {
  id: string;
  amount: number;
  createdAt: string;
  payment: {
    registration: {
      class: { title: string };
    };
  } | null;
}

interface PayoutRecord {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  scheduledAt?: string;
}

interface EventData {
  id: string;
  title: string;
  description: string;
  date: string;
  location?: string;
  price: number;
  _count: { registrations: number };
}

export default function InstructorDashboard() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [calendar, setCalendar] = useState<CalendarEvent[]>([]);
  const [events, setEvents] = useState<EventData[]>([]);
  const [payoutSummary, setPayoutSummary] = useState<PayoutSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch("/api/instructor/profile", { headers }).then(r => r.json()),
      fetch("/api/instructor/classes", { headers }).then(r => r.json()),
      fetch("/api/instructor/calendar", { headers }).then(r => r.json()).catch(() => ({ calendarEvents: [] })),
      fetch("/api/instructor/payouts", { headers }).then(r => r.json()).catch(() => ({ summary: null })),
      fetch("/api/tenant/events", { headers }).then(r => r.json()).catch(() => ({ events: [] })),
    ]).then(([profileData, classesData, calendarData, payoutsData, eventsData]) => {
      setProfile(profileData.profile);
      setClasses(classesData.classes || []);
      setCalendar(calendarData.calendarEvents || []);
      setPayoutSummary(payoutsData.summary);
      setEvents(eventsData.events || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-pulse text-stone-400">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-stone-600 mb-4">Unable to load profile</p>
          <Button onClick={() => logout()}>Sign Out</Button>
        </div>
      </div>
    );
  }

  const isPending = profile.applicationStatus === "PENDING";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingEvents = calendar
    .filter(e => new Date(e.date) >= today)
    .slice(0, 5);
  const totalStudents = classes.reduce((sum, c) => sum + c._count.registrations, 0);

  return (
    <div className="min-h-screen bg-stone-50 flex">
      <aside className="w-64 bg-white border-r border-stone-200 flex flex-col">
        <div className="p-6 border-b border-stone-100">
          <h1 className="font-serif text-xl text-stone-800">Instructor Portal</h1>
          <p className="text-sm text-stone-500 mt-1">{profile.tenant?.name || "Bramble"}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavButton icon={Home} label="Overview" active={activeTab === "overview"} onClick={() => { setActiveTab("overview"); setSelectedClass(null); }} />
          <NavButton icon={BookOpen} label="My Classes" active={activeTab === "classes"} onClick={() => { setActiveTab("classes"); setSelectedClass(null); }} />
          <NavButton icon={CalendarDays} label="Calendar" active={activeTab === "calendar"} onClick={() => { setActiveTab("calendar"); setSelectedClass(null); }} />
          <NavButton icon={Calendar} label="Events" active={activeTab === "events"} onClick={() => { setActiveTab("events"); setSelectedClass(null); }} />
          <NavButton icon={DollarSign} label="Payouts" active={activeTab === "payouts"} onClick={() => { setActiveTab("payouts"); setSelectedClass(null); }} />
          <NavButton icon={MessageSquare} label="Messages" active={activeTab === "messages"} onClick={() => { setActiveTab("messages"); setSelectedClass(null); }} />
          <NavButton icon={Settings} label="Settings" active={activeTab === "settings"} onClick={() => { setActiveTab("settings"); setSelectedClass(null); }} />
        </nav>

        <div className="p-4 border-t border-stone-100 space-y-3">
          <RoleSwitcher currentPortal="INSTRUCTOR" variant="sidebar" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-stone-200 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-stone-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-800 truncate">{profile.firstName} {profile.lastName}</p>
              <p className="text-xs text-stone-500 truncate">{profile.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={logout} data-testid="button-logout">
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>
      </aside>

      <main className="flex-1 p-8">
        {isPending && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-amber-800">
              Your application is pending approval. You'll have full access once approved.
            </p>
          </div>
        )}

        {activeTab === "overview" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-serif text-stone-800" data-testid="text-dashboard-title">Welcome, {profile.firstName}!</h2>
                
                <div className="grid md:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-stone-500" />
                        Classes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-semibold text-stone-800">{classes.length}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="w-5 h-5 text-stone-500" />
                        Students
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-semibold text-stone-800">{totalStudents}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CalendarDays className="w-5 h-5 text-stone-500" />
                        Upcoming
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-semibold text-stone-800">{upcomingEvents.length}</p>
                      <p className="text-sm text-stone-500">classes</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-stone-500" />
                        Earnings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-semibold text-stone-800">
                        ${((payoutSummary?.totalEarnings || 0) / 100).toFixed(2)}
                      </p>
                      <p className="text-sm text-stone-500">total</p>
                    </CardContent>
                  </Card>
                </div>

                {upcomingEvents.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Upcoming Classes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {upcomingEvents.map((event, i) => (
                          <div key={i} className="flex items-center gap-4 py-2 border-b border-stone-100 last:border-0">
                            <div className="w-12 text-center">
                              <p className="text-xs text-stone-500">{new Date(event.date).toLocaleDateString("en-US", { weekday: "short" })}</p>
                              <p className="text-lg font-semibold text-stone-800">{new Date(event.date).getDate()}</p>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-stone-800">{event.title}</p>
                              <p className="text-sm text-stone-500">
                                {event.startTime} - {event.endTime}
                                {event.location && ` • ${event.location}`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {activeTab === "classes" && (
              <ProposeClassSection 
                classes={classes}
                onSelectClass={setSelectedClass}
                onClassProposed={() => {
                  const token = localStorage.getItem("accessToken");
                  fetch("/api/instructor/classes", { headers: { Authorization: `Bearer ${token}` } })
                    .then(r => r.json())
                    .then(data => setClasses(data.classes || []));
                }}
              />
            )}

            {activeTab === "calendar" && (
              <InstructorCalendarTab calendar={calendar} />
            )}

            {activeTab === "events" && (
              <InstructorEventsTab events={events} />
            )}

            {activeTab === "payouts" && (
              <PayoutsTab summary={payoutSummary} />
            )}

            {activeTab === "messages" && (
              <InstructorMessagesTab />
            )}

        {activeTab === "settings" && (
          <InstructorSettingsTab profile={profile} onRefresh={() => {
            const token = localStorage.getItem("accessToken");
            fetch("/api/instructor/profile", { headers: { Authorization: `Bearer ${token}` } })
              .then(r => r.json())
              .then(data => setProfile(data.profile));
          }} />
        )}

        <Sheet open={!!selectedClass} onOpenChange={(open) => !open && setSelectedClass(null)}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto" data-testid="sheet-class-detail">
            {selectedClass && (
              <ClassDetailPanel 
                classData={selectedClass} 
                onClose={() => setSelectedClass(null)}
                onRefresh={() => {
                  const token = localStorage.getItem("accessToken");
                  fetch("/api/instructor/classes", { headers: { Authorization: `Bearer ${token}` } })
                    .then(r => r.json())
                    .then(data => setClasses(data.classes || []));
                }}
              />
            )}
          </SheetContent>
        </Sheet>
      </main>
    </div>
  );
}

function ProposeClassSection({ 
  classes, 
  onSelectClass, 
  onClassProposed 
}: { 
  classes: ClassData[]; 
  onSelectClass: (cls: ClassData) => void;
  onClassProposed: () => void;
}) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newClass, setNewClass] = useState({
    title: "",
    description: "",
    price: "",
    capacity: "10",
    prerequisites: "",
    ageMin: "",
    ageMax: "",
  });
  
  const [schedulerConfig, setSchedulerConfig] = useState<SchedulerConfig>({ ...DEFAULT_SCHEDULER_CONFIG });
  const [previewClasses, setPreviewClasses] = useState<ClassPreview[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleSubmit = async () => {
    // Validate required fields
    const errors: Record<string, string> = {};
    if (!newClass.title.trim()) errors.title = "Title is required";
    if (!newClass.price) errors.price = "Price is required";
    if (!newClass.capacity) errors.capacity = "Capacity is required";
    
    setValidationErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      toast({ title: "Missing Information", description: "Please fill in the highlighted fields", variant: "destructive" });
      return;
    }

    // Auto-generate classes if dates are set but preview wasn't clicked
    let classesToSubmit = previewClasses;
    if (classesToSubmit.length === 0 && schedulerConfig.startDate && schedulerConfig.endDate && schedulerConfig.dayTimes.length > 0) {
      classesToSubmit = generateClassesFromConfig(schedulerConfig);
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("accessToken");
      
      const res = await fetch("/api/instructor/classes/propose", {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newClass,
          price: Math.round(parseFloat(newClass.price) * 100) || 0,
          sessions: classesToSubmit,
        }),
      });

      const data = await res.json();
      
      if (res.ok) {
        toast({ title: "Success", description: "Class proposal submitted for admin approval" });
        setIsDialogOpen(false);
        setNewClass({ title: "", description: "", price: "", capacity: "10", prerequisites: "", ageMin: "", ageMax: "" });
        setSchedulerConfig({ ...DEFAULT_SCHEDULER_CONFIG });
        setPreviewClasses([]);
        setValidationErrors({});
        onClassProposed();
      } else {
        toast({ title: "Error", description: data.error || "Failed to submit proposal", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to submit proposal", variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif text-stone-800">My Classes</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-propose-class">
              <Plus className="w-4 h-4 mr-2" />
              Propose New Class
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Propose a New Class</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {Object.keys(validationErrors).length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">Please fill in all required fields highlighted below.</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label className={validationErrors.title ? "text-red-600" : ""}>Class Title *</Label>
                  <Input
                    value={newClass.title}
                    onChange={(e) => {
                      setNewClass({ ...newClass, title: e.target.value });
                      if (validationErrors.title) setValidationErrors(prev => ({ ...prev, title: "" }));
                    }}
                    placeholder="e.g., Introduction to Art History"
                    className={validationErrors.title ? "border-red-500 focus:ring-red-500" : ""}
                    data-testid="input-class-title"
                  />
                  {validationErrors.title && <p className="text-xs text-red-600">{validationErrors.title}</p>}
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newClass.description}
                    onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                    placeholder="Describe what students will learn..."
                    rows={3}
                    data-testid="input-class-description"
                  />
                </div>
                <div className="space-y-2">
                  <Label className={validationErrors.price ? "text-red-600" : ""}>Price ($) *</Label>
                  <Input
                    type="number"
                    value={newClass.price}
                    onChange={(e) => {
                      setNewClass({ ...newClass, price: e.target.value });
                      if (validationErrors.price) setValidationErrors(prev => ({ ...prev, price: "" }));
                    }}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className={validationErrors.price ? "border-red-500 focus:ring-red-500" : ""}
                    data-testid="input-class-price"
                  />
                  {validationErrors.price && <p className="text-xs text-red-600">{validationErrors.price}</p>}
                </div>
                <div className="space-y-2">
                  <Label className={validationErrors.capacity ? "text-red-600" : ""}>Capacity *</Label>
                  <Input
                    type="number"
                    value={newClass.capacity}
                    onChange={(e) => {
                      setNewClass({ ...newClass, capacity: e.target.value });
                      if (validationErrors.capacity) setValidationErrors(prev => ({ ...prev, capacity: "" }));
                    }}
                    placeholder="10"
                    min="1"
                    className={validationErrors.capacity ? "border-red-500 focus:ring-red-500" : ""}
                    data-testid="input-class-capacity"
                  />
                  {validationErrors.capacity && <p className="text-xs text-red-600">{validationErrors.capacity}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Minimum Age</Label>
                  <Input
                    type="number"
                    value={newClass.ageMin}
                    onChange={(e) => setNewClass({ ...newClass, ageMin: e.target.value })}
                    placeholder="Optional"
                    min="0"
                    data-testid="input-class-age-min"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Maximum Age</Label>
                  <Input
                    type="number"
                    value={newClass.ageMax}
                    onChange={(e) => setNewClass({ ...newClass, ageMax: e.target.value })}
                    placeholder="Optional"
                    min="0"
                    data-testid="input-class-age-max"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Prerequisites</Label>
                  <Input
                    value={newClass.prerequisites}
                    onChange={(e) => setNewClass({ ...newClass, prerequisites: e.target.value })}
                    placeholder="Optional prerequisites for the class"
                    data-testid="input-class-prerequisites"
                  />
                </div>
              </div>

              <SessionScheduler
                config={schedulerConfig}
                onConfigChange={setSchedulerConfig}
                previewClasses={previewClasses}
                onPreviewGenerate={setPreviewClasses}
                testIdPrefix="propose-scheduler"
              />

              <div className="pt-4 flex gap-2">
                <Button 
                  className="flex-1" 
                  onClick={handleSubmit} 
                  disabled={saving}
                  data-testid="button-submit-proposal"
                >
                  {saving ? "Submitting..." : "Submit for Approval"}
                </Button>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {classes.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No classes yet"
          description="Propose your first class to get started teaching"
          actionLabel="Propose Your First Class"
          onAction={() => setIsDialogOpen(true)}
          testId="button-propose-first-class"
        />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatCard
              icon={BookOpen}
              label="Total Classes"
              value={classes.length}
              accentColor="#7C9082"
              testId="stat-total-classes"
            />
            <StatCard
              icon={Users}
              label="Total Students"
              value={classes.reduce((sum, c) => sum + c._count.registrations, 0)}
              accentColor="#AE8660"
              testId="stat-total-students"
            />
            <StatCard
              icon={CalendarDays}
              label="Published"
              value={classes.filter(c => c.status === "Published").length}
              accentColor="#9333ea"
              testId="stat-published"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {classes.map(cls => {
              const enrollmentPercent = cls.capacity > 0 ? (cls._count.registrations / cls.capacity) * 100 : 0;
              const nextSession = cls.sessions.find(s => new Date(s.date) >= new Date());
              
              return (
                <Card 
                  key={cls.id} 
                  className="cursor-pointer hover:shadow-lg transition-all hover:border-[#7C9082]/30 overflow-hidden group"
                  onClick={() => onSelectClass(cls)}
                  data-testid={`card-class-${cls.id}`}
                >
                  <div className="h-1 bg-gradient-to-r from-[#7C9082] to-[#AE8660]" />
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate group-hover:text-[#7C9082] transition-colors">
                          {cls.title}
                        </CardTitle>
                        <CardDescription className="mt-1">{cls.tenant?.name}</CardDescription>
                      </div>
                      <Badge 
                        variant={cls.status === "Published" ? "default" : cls.status === "Pending Approval" ? "outline" : "secondary"}
                        className={cls.status === "Published" ? "bg-[#7C9082]" : ""}
                      >
                        {cls.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5 text-stone-600">
                        <Users className="w-4 h-4 text-stone-400" />
                        <span className="font-medium">{cls._count.registrations}</span>
                        <span className="text-stone-400">/ {cls.capacity}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-stone-600">
                        <Calendar className="w-4 h-4 text-stone-400" />
                        <span>{cls.sessions.length} classes</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-stone-600">
                        <DollarSign className="w-4 h-4 text-stone-400" />
                        <span>${(cls.price / 100).toFixed(0)}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-stone-500">Enrollment</span>
                        <span className="text-stone-600 font-medium">{Math.round(enrollmentPercent)}%</span>
                      </div>
                      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#7C9082] rounded-full transition-all"
                          style={{ width: `${Math.min(enrollmentPercent, 100)}%` }}
                        />
                      </div>
                    </div>

                    {nextSession && (
                      <div className="pt-2 border-t border-stone-100">
                        <p className="text-xs text-stone-500">Next class</p>
                        <p className="text-sm text-stone-700">
                          {new Date(nextSession.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                          {nextSession.startTime && ` at ${nextSession.startTime}`}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function NavButton({ icon: Icon, label, active, onClick }: { icon: any; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        active ? "bg-stone-100 text-stone-900" : "text-stone-600 hover:bg-stone-50"
      }`}
      data-testid={`nav-${label.toLowerCase().replace(" ", "-")}`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

const LEARNING_STYLE_LABELS: Record<string, string> = {
  visual: "Visual",
  auditory: "Auditory",
  kinesthetic: "Hands-On (Kinesthetic)",
  reading_writing: "Reading & Writing",
  social: "Social",
  independent: "Independent",
  logical: "Logical",
  creative: "Creative",
  multi_sensory: "Multi-Sensory",
};

const PHILOSOPHY_LABELS: Record<string, string> = {
  classical: "Classical Education",
  traditional: "Traditional / Textbook-Based",
  charlotte_mason: "Charlotte Mason",
  montessori: "Montessori",
  waldorf: "Waldorf",
  project_based: "Project-Based Learning",
  interest_led: "Interest-Led / Student-Led",
  reggio_emilia: "Reggio Emilia",
  nature_forest: "Nature / Forest School",
};

const ENVIRONMENT_LABELS: Record<string, string> = {
  solo: "Solo",
  small_group: "Small Group",
  large_group: "Large Group",
};

interface StudentProfileViewProps {
  student: NonNullable<RosterEntry['student']>;
  parentName: string;
}

function StudentProfileView({ student, parentName }: StudentProfileViewProps) {
  const [supportNotesOpen, setSupportNotesOpen] = useState(true);

  if (student.shareWithInstructors === false) {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">{student.name}</DialogTitle>
          <DialogDescription className="text-stone-500">
            From {parentName}'s family
          </DialogDescription>
        </DialogHeader>
        <div className="py-8 text-center">
          <div className="w-12 h-12 bg-stone-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <User className="w-6 h-6 text-stone-400" />
          </div>
          <p className="text-stone-600">Profile not shared by parent</p>
          <p className="text-sm text-stone-400 mt-1">
            The parent has chosen not to share this child's profile details with instructors.
          </p>
        </div>
      </>
    );
  }

  const age = student.dateOfBirth
    ? new Date().getFullYear() - new Date(student.dateOfBirth).getFullYear()
    : null;

  const hasLearningInfo = student.learningStylePrimary || student.educationalPhilosophyPrimary || student.preferredLearningEnvironment;
  const hasSupportNotes = student.neurodivergentNotes || student.healthNotes || student.parentNotes;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-serif text-xl">{student.name}</DialogTitle>
        <DialogDescription className="text-stone-500">
          {age && `${age} years old`}
          {age && student.grade && " • "}
          {student.grade && student.grade}
        </DialogDescription>
      </DialogHeader>

      <ScrollArea className="flex-1 pr-4 -mr-4">
        <div className="space-y-5 py-4 pb-6">
          {student.interests && student.interests.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-stone-700 mb-2">Interests</h4>
            <div className="flex flex-wrap gap-2">
              {student.interests.map((interest, i) => (
                <Badge key={i} variant="secondary" className="bg-[#7C9082]/10 text-[#7C9082] border-[#7C9082]/20">
                  {interest}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {hasLearningInfo && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-stone-700">Learning Profile</h4>
              
              {(student.learningStylePrimary || student.learningStyleSecondary) && (
                <div className="bg-stone-50 rounded-lg p-3">
                  <p className="text-xs text-stone-500 mb-1">Learning Style</p>
                  <p className="text-sm text-stone-700">
                    {LEARNING_STYLE_LABELS[student.learningStylePrimary || ""] || student.learningStylePrimary}
                    {student.learningStyleSecondary && (
                      <span className="text-stone-500">
                        {" + "}{LEARNING_STYLE_LABELS[student.learningStyleSecondary] || student.learningStyleSecondary}
                      </span>
                    )}
                  </p>
                </div>
              )}

              {(student.educationalPhilosophyPrimary || student.educationalPhilosophySecondary) && (
                <div className="bg-stone-50 rounded-lg p-3">
                  <p className="text-xs text-stone-500 mb-1">Educational Philosophy</p>
                  <p className="text-sm text-stone-700">
                    {PHILOSOPHY_LABELS[student.educationalPhilosophyPrimary || ""] || student.educationalPhilosophyPrimary}
                    {student.educationalPhilosophySecondary && (
                      <span className="text-stone-500">
                        {" + "}{PHILOSOPHY_LABELS[student.educationalPhilosophySecondary] || student.educationalPhilosophySecondary}
                      </span>
                    )}
                  </p>
                </div>
              )}

              {student.preferredLearningEnvironment && (
                <div className="bg-stone-50 rounded-lg p-3">
                  <p className="text-xs text-stone-500 mb-1">Preferred Environment</p>
                  <p className="text-sm text-stone-700">
                    {ENVIRONMENT_LABELS[student.preferredLearningEnvironment] || student.preferredLearningEnvironment}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {hasSupportNotes && (
          <>
            <Separator />
            <Collapsible open={supportNotesOpen} onOpenChange={setSupportNotesOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium text-stone-700 hover:text-stone-900">
                <span>Support Notes</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${supportNotesOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                {student.neurodivergentNotes && (
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                    <p className="text-xs text-amber-700 font-medium mb-1">Neurodivergent Notes</p>
                    <p className="text-sm text-amber-900">{student.neurodivergentNotes}</p>
                  </div>
                )}
                {student.healthNotes && (
                  <div className="bg-rose-50 border border-rose-100 rounded-lg p-3">
                    <p className="text-xs text-rose-700 font-medium mb-1">Health Notes</p>
                    <p className="text-sm text-rose-900">{student.healthNotes}</p>
                  </div>
                )}
                {student.parentNotes && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <p className="text-xs text-blue-700 font-medium mb-1">Parent Notes</p>
                    <p className="text-sm text-blue-900">{student.parentNotes}</p>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </>
        )}

        {!student.interests?.length && !hasLearningInfo && !hasSupportNotes && (
          <div className="text-center py-4 text-stone-500 text-sm">
            No additional profile information available.
          </div>
        )}
        </div>
      </ScrollArea>
    </>
  );
}

function ClassDetailPanel({ classData: initialClassData, onClose, onRefresh }: { classData: ClassData; onClose: () => void; onRefresh: () => void }) {
  const { toast } = useToast();
  const [classData, setClassData] = useState<ClassData>(initialClassData);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [activeView, setActiveView] = useState<"sessions" | "roster" | "messages">("sessions");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [classChat, setClassChat] = useState<{ id: string; name: string } | null>(null);
  const [classChatMessages, setClassChatMessages] = useState<ChatMessage[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ 
    title: "", 
    description: "", 
    price: "", 
    capacity: "",
    ageMin: "",
    ageMax: "",
    prerequisites: "",
    materialsUrl: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  
  const [showScheduler, setShowScheduler] = useState(false);
  const [schedulerConfig, setSchedulerConfig] = useState<SchedulerConfig>({ ...DEFAULT_SCHEDULER_CONFIG });
  const [previewClasses2, setPreviewClasses2] = useState<ClassPreview[]>([]);
  const [creatingSessions, setCreatingSessions] = useState(false);
  const [deletingSession, setDeletingSession] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<RosterEntry | null>(null);

  const classId = classData.id;

  useEffect(() => {
    setClassData(initialClassData);
  }, [initialClassData]);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    setLoadingRoster(true);
    fetch(`/api/instructor/classes/${classId}/roster`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        setRoster(data.roster || []);
        setLoadingRoster(false);
      })
      .catch(() => setLoadingRoster(false));
  }, [classId]);

  const refreshClassData = async () => {
    const token = localStorage.getItem("accessToken");
    try {
      const response = await fetch(`/api/instructor/classes/${classData.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.class) {
        setClassData(data.class);
      }
    } catch (error) {
      console.error("Failed to refresh class data", error);
    }
  };

  const enterEditMode = () => {
    setEditForm({
      title: classData.title,
      description: classData.description || "",
      price: String((classData.price || 0) / 100),
      capacity: String(classData.capacity || ""),
      ageMin: classData.ageMin ? String(classData.ageMin) : "",
      ageMax: classData.ageMax ? String(classData.ageMax) : "",
      prerequisites: classData.prerequisites || "",
      materialsUrl: classData.materialsUrl || "",
    });
    setIsEditMode(true);
  };

  const cancelEditMode = () => {
    setIsEditMode(false);
  };

  const saveClassEdit = async () => {
    setSavingEdit(true);
    const token = localStorage.getItem("accessToken");
    try {
      const response = await fetch(`/api/instructor/classes/${classData.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description,
          price: Math.round(parseFloat(editForm.price) * 100),
          capacity: editForm.capacity ? parseInt(editForm.capacity) : null,
          ageMin: editForm.ageMin ? parseInt(editForm.ageMin) : null,
          ageMax: editForm.ageMax ? parseInt(editForm.ageMax) : null,
          prerequisites: editForm.prerequisites || null,
          materialsUrl: editForm.materialsUrl || null,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.requiresReapproval) {
          toast({ 
            title: "Class updated - requires re-approval",
            description: "Since you changed title, price, or capacity, the class needs admin approval again."
          });
        } else {
          toast({ title: "Class updated successfully" });
        }
        await refreshClassData();
        onRefresh();
        setIsEditMode(false);
      } else {
        const data = await response.json();
        toast({ title: data.error || "Failed to update class", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to update class", variant: "destructive" });
    }
    setSavingEdit(false);
  };

  const createBulkSessions = async () => {
    if (previewClasses2.length === 0) return;
    setCreatingSessions(true);
    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetch(`/api/instructor/classes/${classId}/sessions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ sessions: previewClasses2 }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.requiresReapproval) {
          toast({
            title: "Classes created - requires re-approval",
            description: "Schedule changes require admin approval before the offering is visible again."
          });
        } else {
          toast({ title: `Created ${previewClasses2.length} classes` });
        }
        setPreviewClasses2([]);
        setShowScheduler(false);
        setSchedulerConfig({ ...DEFAULT_SCHEDULER_CONFIG });
        await refreshClassData();
        onRefresh();
      } else {
        const data = await res.json();
        toast({ title: data.error || "Failed to create classes", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to create classes", variant: "destructive" });
    }
    setCreatingSessions(false);
  };

  const deleteSession = async (sessionId: string) => {
    setDeletingSession(sessionId);
    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetch(`/api/instructor/classes/${classId}/sessions/${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.requiresReapproval) {
          toast({
            title: "Class deleted - requires re-approval",
            description: "Schedule changes require admin approval before the offering is visible again."
          });
        } else {
          toast({ title: "Class deleted" });
        }
        await refreshClassData();
        onRefresh();
      } else {
        toast({ title: "Failed to delete class", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to delete class", variant: "destructive" });
    }
    setDeletingSession(null);
  };

  const saveNote = async (sessionId: string) => {
    setSavingNote(true);
    const token = localStorage.getItem("accessToken");
    try {
      const response = await fetch(`/api/instructor/classes/${classData.id}/sessions/${sessionId}/notes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: noteContent }),
      });
      if (response.ok) {
        toast({ title: "Notes saved successfully" });
        await refreshClassData();
      } else {
        toast({ title: "Failed to save notes", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to save notes", variant: "destructive" });
    }
    setSavingNote(false);
    setEditingNote(null);
  };

  const loadClassChat = async () => {
    setLoadingChat(true);
    const token = localStorage.getItem("accessToken");
    try {
      const ensureRes = await fetch(`/api/instructor/classes/${classId}/chat`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const ensureData = await ensureRes.json();
      if (ensureData.chat) {
        setClassChat(ensureData.chat);
        const messagesRes = await fetch(`/api/tenant/chats/${ensureData.chat.id}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const messagesData = await messagesRes.json();
        setClassChatMessages(messagesData.messages || []);
      }
    } catch {
      toast({ title: "Failed to load chat", variant: "destructive" });
    }
    setLoadingChat(false);
  };

  const sendClassMessage = async () => {
    if (!newMessage.trim() || !classChat) return;
    setSendingMessage(true);
    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetch(`/api/tenant/chats/${classChat.id}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage }),
      });
      const data = await res.json();
      if (data.message) {
        setClassChatMessages([...classChatMessages, data.message]);
        setNewMessage("");
      }
    } catch {
      toast({ title: "Failed to send message", variant: "destructive" });
    }
    setSendingMessage(false);
  };

  useEffect(() => {
    if (activeView === "messages" && !classChat) {
      loadClassChat();
    }
  }, [activeView]);

  if (isEditMode) {
    return (
      <div className="space-y-6">
        <SheetHeader>
          <SheetTitle className="text-xl font-serif">Edit Class</SheetTitle>
          <div className="text-sm text-stone-500">Update your class details below</div>
        </SheetHeader>

        <Separator />

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Class Title *</Label>
            <Input
              id="edit-title"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              placeholder="e.g., Introduction to Art History"
              data-testid="input-edit-title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="Describe what students will learn..."
              rows={4}
              data-testid="input-edit-description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-price">Price ($) *</Label>
              <Input
                id="edit-price"
                type="number"
                step="0.01"
                min="0"
                value={editForm.price}
                onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                placeholder="0.00"
                data-testid="input-edit-price"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-capacity">Capacity *</Label>
              <Input
                id="edit-capacity"
                type="number"
                min="1"
                value={editForm.capacity}
                onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })}
                placeholder="10"
                data-testid="input-edit-capacity"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-age-min">Minimum Age</Label>
              <Input
                id="edit-age-min"
                type="number"
                min="0"
                value={editForm.ageMin}
                onChange={(e) => setEditForm({ ...editForm, ageMin: e.target.value })}
                placeholder="Optional"
                data-testid="input-edit-age-min"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-age-max">Maximum Age</Label>
              <Input
                id="edit-age-max"
                type="number"
                min="0"
                value={editForm.ageMax}
                onChange={(e) => setEditForm({ ...editForm, ageMax: e.target.value })}
                placeholder="Optional"
                data-testid="input-edit-age-max"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-prerequisites">Prerequisites</Label>
            <Input
              id="edit-prerequisites"
              value={editForm.prerequisites}
              onChange={(e) => setEditForm({ ...editForm, prerequisites: e.target.value })}
              placeholder="Optional prerequisites for the class"
              data-testid="input-edit-prerequisites"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-materials">Materials URL</Label>
            <Input
              id="edit-materials"
              value={editForm.materialsUrl}
              onChange={(e) => setEditForm({ ...editForm, materialsUrl: e.target.value })}
              placeholder="Link to class materials (optional)"
              data-testid="input-edit-materials"
            />
          </div>
        </div>

        <Separator />

        {/* Class Schedule Management */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-stone-800">Classes</h3>
              <p className="text-sm text-stone-500">{classData.sessions.length} classes scheduled</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowScheduler(!showScheduler)}
              data-testid="button-toggle-scheduler"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Classes
            </Button>
          </div>

          {showScheduler && (
            <div className="space-y-3">
              <SessionScheduler
                config={schedulerConfig}
                onConfigChange={setSchedulerConfig}
                previewClasses={previewClasses2}
                onPreviewGenerate={setPreviewClasses2}
                title="Add Classes"
                testIdPrefix="instructor-scheduler"
              />
              {previewClasses2.length > 0 && (
                <Button 
                  className="w-full" 
                  onClick={createBulkSessions}
                  disabled={creatingSessions}
                  data-testid="button-instructor-create-sessions"
                >
                  {creatingSessions ? "Creating..." : `Create ${previewClasses2.length} Classes`}
                </Button>
              )}
            </div>
          )}

          {/* Existing Classes List */}
          {classData.sessions.length > 0 && (
            <div className="space-y-2">
              <Label>Existing Classes</Label>
              <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                {classData.sessions.map(session => (
                  <div key={session.id} className="flex items-center justify-between p-2 text-sm">
                    <div>
                      <span className="font-medium">
                        {new Date(session.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-stone-500 ml-2">
                        {session.startTime} - {session.endTime}
                      </span>
                      {session.location && (
                        <span className="text-stone-400 ml-2">@ {session.location}</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteSession(session.id)}
                      disabled={deletingSession === session.id}
                      data-testid={`button-delete-session-${session.id}`}
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator />

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={cancelEditMode} data-testid="button-cancel-edit">
            Cancel
          </Button>
          <Button 
            onClick={saveClassEdit} 
            disabled={savingEdit || !editForm.title || !editForm.price || !editForm.capacity} 
            data-testid="button-save-class-edit"
          >
            {savingEdit ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SheetHeader>
        <div className="flex items-start justify-between">
          <div>
            <SheetTitle className="text-xl font-serif">{classData.title}</SheetTitle>
            <div className="flex items-center gap-2 mt-1 text-sm text-stone-500">
              <Badge variant={classData.status === "Published" ? "default" : "secondary"}>{classData.status}</Badge>
              <span>{classData._count.registrations}/{classData.capacity} enrolled</span>
              {classData.price > 0 && <span>${(classData.price / 100).toFixed(2)}</span>}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={enterEditMode} data-testid="button-edit-class">
            <Edit className="w-4 h-4 mr-1" /> Edit
          </Button>
        </div>
      </SheetHeader>

      {(classData.ageMin || classData.ageMax || classData.prerequisites) && (
        <div className="bg-stone-50 rounded-lg p-3 text-sm space-y-1">
          {(classData.ageMin || classData.ageMax) && (
            <p className="text-stone-600">
              <span className="font-medium">Ages:</span> {classData.ageMin || "Any"} - {classData.ageMax || "Any"}
            </p>
          )}
          {classData.prerequisites && (
            <p className="text-stone-600">
              <span className="font-medium">Prerequisites:</span> {classData.prerequisites}
            </p>
          )}
        </div>
      )}

      {classData.description && (
        <p className="text-sm text-stone-600">{classData.description}</p>
      )}

      <Separator />

      <div className="flex gap-4 border-b border-stone-200">
        <button
          onClick={() => setActiveView("sessions")}
          className={`pb-2 px-1 text-sm font-medium border-b-2 ${
            activeView === "sessions" ? "border-stone-800 text-stone-800" : "border-transparent text-stone-500"
          }`}
        >
          Classes & Notes
        </button>
        <button
          onClick={() => setActiveView("roster")}
          className={`pb-2 px-1 text-sm font-medium border-b-2 ${
            activeView === "roster" ? "border-stone-800 text-stone-800" : "border-transparent text-stone-500"
          }`}
        >
          Roster ({roster.length})
        </button>
        <button
          onClick={() => setActiveView("messages")}
          className={`pb-2 px-1 text-sm font-medium border-b-2 ${
            activeView === "messages" ? "border-stone-800 text-stone-800" : "border-transparent text-stone-500"
          }`}
          data-testid="tab-class-messages"
        >
          <MessageSquare className="w-4 h-4 inline mr-1" />
          Messages
        </button>
      </div>

      {activeView === "sessions" && (
        <div className="space-y-4">
          {classData.sessions.map(session => (
            <Card key={session.id} data-testid={`card-session-${session.id}`}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">
                      {new Date(session.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {session.startTime} - {session.endTime}
                      </span>
                      {session.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {session.location}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setEditingNote(session.id);
                          setNoteContent(session.notes?.[0]?.content || "");
                        }}
                        data-testid={`button-notes-${session.id}`}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        {session.notes?.length ? "Edit Notes" : "Add Notes"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Session Notes</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Textarea
                          value={noteContent}
                          onChange={(e) => setNoteContent(e.target.value)}
                          placeholder="Add notes for this session..."
                          rows={6}
                          data-testid="input-note-content"
                        />
                        <Button 
                          onClick={() => saveNote(session.id)} 
                          disabled={savingNote}
                          data-testid="button-save-note"
                        >
                          <Save className="w-4 h-4 mr-1" />
                          {savingNote ? "Saving..." : "Save Notes"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              {session.notes?.[0]?.content && (
                <CardContent>
                  <div className="bg-stone-50 rounded p-3 text-sm text-stone-600">
                    {session.notes[0].content}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {activeView === "roster" && (
        <Card>
          <CardContent className="p-0">
            {loadingRoster ? (
              <p className="p-4 text-stone-400">Loading roster...</p>
            ) : roster.length === 0 ? (
              <p className="p-4 text-stone-500 text-center">No students enrolled yet.</p>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <table className="w-full">
                  <thead className="bg-stone-50 sticky top-0">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-stone-600">Student</th>
                      <th className="text-left p-4 text-sm font-medium text-stone-600">Parent</th>
                      <th className="text-left p-4 text-sm font-medium text-stone-600">Email</th>
                      <th className="text-left p-4 text-sm font-medium text-stone-600">Phone</th>
                      <th className="text-left p-4 text-sm font-medium text-stone-600">Enrolled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map(entry => (
                      <tr key={entry.registrationId} className="border-t border-stone-100" data-testid={`row-roster-${entry.registrationId}`}>
                        <td className="p-4 text-sm font-medium" data-testid={`text-student-name-${entry.registrationId}`}>
                          {entry.student ? (
                            <button
                              onClick={() => setSelectedStudent(entry)}
                              className="text-left hover:text-[#7C9082] hover:underline flex items-center gap-1 group"
                              data-testid={`button-view-profile-${entry.registrationId}`}
                            >
                              {entry.student.name}
                              {entry.student.dateOfBirth && (
                                <span className="text-xs text-stone-400 ml-1">
                                  ({new Date().getFullYear() - new Date(entry.student.dateOfBirth).getFullYear()} yrs)
                                </span>
                              )}
                              <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#7C9082]" />
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-4 text-sm" data-testid={`text-parent-name-${entry.registrationId}`}>{entry.parent.name}</td>
                        <td className="p-4 text-sm text-stone-500">
                          <a href={`mailto:${entry.parent.email}`} className="hover:text-blue-600 hover:underline" data-testid={`link-email-${entry.registrationId}`}>
                            {entry.parent.email}
                          </a>
                        </td>
                        <td className="p-4 text-sm text-stone-500" data-testid={`text-phone-${entry.registrationId}`}>
                          {entry.parent.phone ? (
                            <a href={`tel:${entry.parent.phone}`} className="hover:text-blue-600 hover:underline">
                              {entry.parent.phone}
                            </a>
                          ) : "—"}
                        </td>
                        <td className="p-4 text-sm text-stone-500">{new Date(entry.enrolledAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col" data-testid="dialog-student-profile">
          {selectedStudent?.student && (
            <StudentProfileView student={selectedStudent.student} parentName={selectedStudent.parent.name} />
          )}
        </DialogContent>
      </Dialog>

      {activeView === "messages" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Class Messages</CardTitle>
            <CardDescription>Send messages to all enrolled families. They can reply here.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingChat ? (
              <p className="text-center text-stone-400 py-8">Loading chat...</p>
            ) : (
              <div className="space-y-4">
                <div className="h-64 overflow-y-auto border border-stone-200 rounded-lg p-4 bg-stone-50" data-testid="chat-messages-container">
                  {classChatMessages.length === 0 ? (
                    <p className="text-center text-stone-500">No messages yet. Start the conversation!</p>
                  ) : (
                    classChatMessages.map(msg => (
                      <div
                        key={msg.id}
                        className={`mb-3 p-3 rounded-lg max-w-[80%] ${
                          msg.user.role === "INSTRUCTOR"
                            ? "bg-blue-100 ml-auto"
                            : "bg-white border border-stone-200"
                        }`}
                        data-testid={`chat-message-${msg.id}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-stone-800">
                            {msg.user.firstName} {msg.user.lastName}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {msg.user.role === "INSTRUCTOR" ? "Instructor" : "Parent"}
                          </Badge>
                        </div>
                        <p className="text-sm text-stone-700">{msg.content}</p>
                        <p className="text-xs text-stone-400 mt-1">
                          {new Date(msg.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message to all enrolled families..."
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendClassMessage()}
                    data-testid="input-class-message"
                  />
                  <Button onClick={sendClassMessage} disabled={sendingMessage || !newMessage.trim()} data-testid="button-send-class-message">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InstructorCalendarTab({ calendar }: { calendar: CalendarEvent[] }) {
  const { toast } = useToast();
  const today = new Date();
  const {
    currentMonth,
    currentYear,
    setCurrentMonth,
    setCurrentYear,
    goToToday,
    goToPrevMonth,
    goToNextMonth,
  } = useCalendarNavigation();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ date: Date; events: CalendarEvent[] } | null>(null);
  const [isProposeEventOpen, setIsProposeEventOpen] = useState(false);
  const [proposing, setProposing] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
    locationDetails: "",
  });

  const handleProposeEvent = async () => {
    if (!eventForm.title || !eventForm.description || !eventForm.date || !eventForm.location) {
      toast({ title: "Error", description: "All fields are required", variant: "destructive" });
      return;
    }

    const eventDate = new Date(eventForm.date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (eventDate < now) {
      toast({ title: "Error", description: "Event date cannot be in the past", variant: "destructive" });
      return;
    }

    setProposing(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch("/api/tenant/events/propose", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventForm),
      });

      const data = await res.json();
      if (res.ok) {
        toast({ title: "Success", description: "Event proposal submitted for admin approval" });
        setIsProposeEventOpen(false);
        setEventForm({ title: "", description: "", date: "", location: "", locationDetails: "" });
      } else {
        toast({ title: "Error", description: data.error || "Failed to submit proposal", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to submit proposal", variant: "destructive" });
    }
    setProposing(false);
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  
  const eventsMap = new Map<string, CalendarEvent[]>();
  calendar.forEach(event => {
    const dateKey = new Date(event.date).toDateString();
    if (!eventsMap.has(dateKey)) eventsMap.set(dateKey, []);
    eventsMap.get(dateKey)!.push(event);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif text-stone-800">Teaching Calendar</h2>
        <div className="flex items-center gap-4">
          <Dialog open={isProposeEventOpen} onOpenChange={setIsProposeEventOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-propose-event">
                <Plus className="w-4 h-4 mr-2" />
                Propose Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Propose a Co-op Event</DialogTitle>
                <DialogDescription>
                  Suggest an event for the co-op. It will be reviewed by an admin before being published.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Event Title *</Label>
                  <Input
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    placeholder="e.g., Spring Potluck"
                    data-testid="input-event-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea
                    value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                    placeholder="Describe the event..."
                    rows={3}
                    data-testid="input-event-description"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                    min={new Date().toISOString().split("T")[0]}
                    data-testid="input-event-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address *</Label>
                  <Input
                    value={eventForm.location}
                    onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                    placeholder="1400 Sullivan Rd, Park City, UT 84060"
                    data-testid="input-event-location"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location Details</Label>
                  <Input
                    value={eventForm.locationDetails}
                    onChange={(e) => setEventForm({ ...eventForm, locationDetails: e.target.value })}
                    placeholder="Near playground and volleyball nets"
                    data-testid="input-event-location-details"
                  />
                  <p className="text-xs text-muted-foreground">Add directions or notes to help people find the exact spot</p>
                </div>
                <div className="pt-4 flex gap-2">
                  <Button 
                    className="flex-1" 
                    onClick={handleProposeEvent} 
                    disabled={proposing || !eventForm.title || !eventForm.description || !eventForm.date || !eventForm.location}
                    data-testid="button-submit-event-proposal"
                  >
                    {proposing ? "Submitting..." : "Submit for Approval"}
                  </Button>
                  <Button variant="outline" onClick={() => setIsProposeEventOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <CalendarHeader
            currentMonth={currentMonth}
            currentYear={currentYear}
            onMonthChange={setCurrentMonth}
            onYearChange={setCurrentYear}
            onToday={goToToday}
            onPrevMonth={goToPrevMonth}
            onNextMonth={goToNextMonth}
            testIdPrefix="instructor-calendar"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
              <div key={day} className="text-center text-sm font-medium text-stone-500 py-2">{day}</div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-24" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const date = new Date(currentYear, currentMonth, i + 1);
              const dateKey = date.toDateString();
              const dayEvents = eventsMap.get(dateKey) || [];
              const isToday = date.toDateString() === today.toDateString();
              
              return (
                <div 
                  key={i} 
                  className={`h-24 border border-stone-100 p-1 ${isToday ? "bg-stone-100" : ""} ${dayEvents.length > 0 ? "cursor-pointer hover:bg-stone-50" : ""}`}
                  onClick={() => dayEvents.length > 0 && setSelectedDayEvents({ date, events: dayEvents })}
                  data-testid={`calendar-day-${i + 1}`}
                >
                  <p className={`text-sm ${isToday ? "font-bold text-stone-800" : "text-stone-600"}`}>{i + 1}</p>
                  <div className="space-y-1 mt-1">
                    {dayEvents.slice(0, 2).map((event, idx) => (
                      <button 
                        key={idx} 
                        onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                        className={`w-full text-left text-xs truncate px-1 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity ${
                          event.type === "coop_event" 
                            ? "bg-emerald-100 text-emerald-800" 
                            : "bg-blue-100 text-blue-800"
                        }`}
                        data-testid={`calendar-event-${event.id}`}
                      >
                        {event.title}
                      </button>
                    ))}
                    {dayEvents.length > 2 && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedDayEvents({ date, events: dayEvents }); }}
                        className="text-xs text-stone-500 hover:text-stone-700 cursor-pointer"
                        data-testid={`calendar-more-${i + 1}`}
                      >
                        +{dayEvents.length - 2} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Event Detail Modal */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent?.type === "coop_event" ? (
                <Calendar className="w-5 h-5 text-emerald-600" />
              ) : (
                <BookOpen className="w-5 h-5 text-blue-600" />
              )}
              {selectedEvent?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-stone-600">
              <CalendarDays className="w-4 h-4" />
              <span>{selectedEvent && new Date(selectedEvent.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
            </div>
            {selectedEvent?.startTime && (
              <div className="flex items-center gap-2 text-stone-600">
                <Clock className="w-4 h-4" />
                <span>{selectedEvent.startTime} - {selectedEvent.endTime}</span>
              </div>
            )}
            {selectedEvent?.location && (
              <div className="flex items-center gap-2 text-stone-600">
                <MapPin className="w-4 h-4" />
                <span>{selectedEvent.location}</span>
              </div>
            )}
            <Badge className={selectedEvent?.type === "coop_event" ? "bg-emerald-100 text-emerald-800" : ""}>
              {selectedEvent?.type === "coop_event" ? "Co-op Event" : "Class"}
            </Badge>
          </div>
        </DialogContent>
      </Dialog>

      {/* Day Events Modal */}
      <Dialog open={!!selectedDayEvents} onOpenChange={() => setSelectedDayEvents(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedDayEvents && selectedDayEvents.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto">
            {selectedDayEvents?.events.map((event, idx) => (
              <button
                key={idx}
                onClick={() => { setSelectedDayEvents(null); setSelectedEvent(event); }}
                className="w-full text-left p-3 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors"
                data-testid={`day-event-${event.id}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-stone-800">{event.title}</span>
                  <Badge className={`text-xs ${event.type === "coop_event" ? "bg-emerald-100 text-emerald-800" : ""}`}>
                    {event.type === "coop_event" ? "Event" : "Class"}
                  </Badge>
                </div>
                {event.startTime && (
                  <p className="text-sm text-stone-500 mt-1">{event.startTime} - {event.endTime}</p>
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InstructorEventsTab({ events }: { events: EventData[] }) {
  const { toast } = useToast();
  const [isProposeEventOpen, setIsProposeEventOpen] = useState(false);
  const [proposing, setProposing] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
    locationDetails: "",
  });

  const handleProposeEvent = async () => {
    if (!eventForm.title || !eventForm.description || !eventForm.date || !eventForm.location) {
      toast({ title: "Error", description: "All fields are required", variant: "destructive" });
      return;
    }

    const eventDate = new Date(eventForm.date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (eventDate < now) {
      toast({ title: "Error", description: "Event date cannot be in the past", variant: "destructive" });
      return;
    }

    setProposing(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch("/api/tenant/events/propose", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventForm),
      });

      const data = await res.json();
      if (res.ok) {
        toast({ title: "Success", description: "Event proposal submitted for admin approval" });
        setIsProposeEventOpen(false);
        setEventForm({ title: "", description: "", date: "", location: "", locationDetails: "" });
      } else {
        toast({ title: "Error", description: data.error || "Failed to submit proposal", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to submit proposal", variant: "destructive" });
    }
    setProposing(false);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingEvents = events
    .filter(e => new Date(e.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif text-stone-800">Co-op Events</h2>
        <Dialog open={isProposeEventOpen} onOpenChange={setIsProposeEventOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" data-testid="button-propose-event-tab">
              <Plus className="w-4 h-4 mr-2" />
              Propose Event
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Propose a Co-op Event</DialogTitle>
              <DialogDescription>
                Suggest an event for the co-op. It will be reviewed by an admin before being published.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Event Title *</Label>
                <Input
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  placeholder="e.g., Spring Potluck"
                  data-testid="input-propose-event-title"
                />
              </div>
              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder="Describe the event..."
                  rows={3}
                  data-testid="input-propose-event-description"
                />
              </div>
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={eventForm.date}
                  onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                  min={new Date().toISOString().split("T")[0]}
                  data-testid="input-propose-event-date"
                />
              </div>
              <div className="space-y-2">
                <Label>Address *</Label>
                <Input
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  placeholder="1400 Sullivan Rd, Park City, UT 84060"
                  data-testid="input-propose-event-location"
                />
              </div>
              <div className="space-y-2">
                <Label>Location Details</Label>
                <Input
                  value={eventForm.locationDetails}
                  onChange={(e) => setEventForm({ ...eventForm, locationDetails: e.target.value })}
                  placeholder="Near playground and volleyball nets"
                  data-testid="input-propose-event-location-details"
                />
                <p className="text-xs text-muted-foreground">Add directions or notes to help people find the exact spot</p>
              </div>
              <div className="pt-4 flex gap-2">
                <Button 
                  className="flex-1" 
                  onClick={handleProposeEvent} 
                  disabled={proposing || !eventForm.title || !eventForm.description || !eventForm.date || !eventForm.location}
                  data-testid="button-submit-propose-event"
                >
                  {proposing ? "Submitting..." : "Submit for Approval"}
                </Button>
                <Button variant="outline" onClick={() => setIsProposeEventOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {upcomingEvents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 mx-auto text-stone-300 mb-4" />
            <p className="text-stone-600 font-medium">No upcoming events</p>
            <p className="text-sm text-stone-500 mt-1">
              Propose a new event for the co-op community
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {upcomingEvents.map(event => (
            <Card key={event.id} className="hover:shadow-md transition-shadow" data-testid={`card-event-${event.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{event.title}</CardTitle>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    {event._count.registrations} RSVPs
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <CalendarDays className="w-4 h-4" />
                  {new Date(event.date).toLocaleDateString("en-US", { 
                    weekday: "short", 
                    month: "short", 
                    day: "numeric",
                    year: "numeric"
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {event.location && (
                  <div className="flex items-center gap-2 text-sm text-stone-600">
                    <MapPin className="w-4 h-4 text-stone-400" />
                    {event.location}
                  </div>
                )}
                {event.description && (
                  <p className="text-sm text-stone-600 line-clamp-2">{event.description}</p>
                )}
                {event.price > 0 && (
                  <div className="flex items-center gap-2 text-sm text-stone-600">
                    <DollarSign className="w-4 h-4 text-stone-400" />
                    ${(event.price / 100).toFixed(2)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function PayoutsTab({ summary }: { summary: PayoutSummary | null }) {
  const [earnings, setEarnings] = useState<EarningsEntry[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<"earnings" | "payouts">("earnings");

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    fetch("/api/instructor/payouts", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        setEarnings(data.earnings || []);
        setPayouts(data.payouts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>;
      case "PENDING":
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pending</Badge>;
      case "SCHEDULED":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Scheduled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-serif text-stone-800">Payouts</h2>
      
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-stone-500">Total Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-stone-800" data-testid="text-total-earnings">
              ${((summary?.totalEarnings || 0) / 100).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-stone-500">Paid Out</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-green-600" data-testid="text-paid-out">
              ${((summary?.totalPaid || 0) / 100).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-stone-500">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-amber-600" data-testid="text-pending-payout">
              ${((summary?.pendingPayout || 0) / 100).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 border-b border-stone-100 -mx-6 px-6 pb-4">
            <button
              onClick={() => setActiveSection("earnings")}
              className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                activeSection === "earnings"
                  ? "border-stone-800 text-stone-800"
                  : "border-transparent text-stone-500 hover:text-stone-700"
              }`}
              data-testid="tab-earnings"
            >
              Earnings History
            </button>
            <button
              onClick={() => setActiveSection("payouts")}
              className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                activeSection === "payouts"
                  ? "border-stone-800 text-stone-800"
                  : "border-transparent text-stone-500 hover:text-stone-700"
              }`}
              data-testid="tab-payouts"
            >
              Payout History
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-stone-400">Loading...</div>
          ) : activeSection === "earnings" ? (
            earnings.length === 0 ? (
              <div className="py-8 text-center text-stone-500">
                <DollarSign className="w-12 h-12 mx-auto text-stone-300 mb-3" />
                <p>No earnings yet</p>
                <p className="text-sm mt-1">Earnings will appear here when students enroll in your classes.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {earnings.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between py-3 border-b border-stone-100 last:border-0" data-testid={`row-earning-${entry.id}`}>
                    <div>
                      <p className="font-medium text-stone-800">
                        {entry.payment?.registration?.class?.title || "Class Enrollment"}
                      </p>
                      <p className="text-sm text-stone-500">
                        {new Date(entry.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <p className="text-lg font-semibold text-green-600">
                      +${(entry.amount / 100).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )
          ) : payouts.length === 0 ? (
            <div className="py-8 text-center text-stone-500">
              <DollarSign className="w-12 h-12 mx-auto text-stone-300 mb-3" />
              <p>No payouts yet</p>
              <p className="text-sm mt-1">Payouts are processed weekly once your balance meets the minimum threshold.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payouts.map(payout => (
                <div key={payout.id} className="flex items-center justify-between py-3 border-b border-stone-100 last:border-0" data-testid={`row-payout-${payout.id}`}>
                  <div>
                    <p className="font-medium text-stone-800">
                      Payout #{payout.id.slice(-8)}
                    </p>
                    <p className="text-sm text-stone-500">
                      {new Date(payout.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(payout.status)}
                    <p className="text-lg font-semibold text-stone-800">
                      ${(payout.amount / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payout Information</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-stone-600">
            Payouts are processed automatically each week for balances over the minimum threshold. Contact your co-op admin for more details about payout schedules.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  user: { firstName: string; lastName: string; role: string };
}

function InstructorMessagesTab() {
  const { toast } = useToast();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    fetch("/api/tenant/chats", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setChats(data.chats || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const openChat = async (chat: any) => {
    setSelectedChat(chat);
    setLoadingMessages(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`/api/tenant/chats/${chat.id}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {
      toast({ title: "Error", description: "Failed to load messages", variant: "destructive" });
    }
    setLoadingMessages(false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;
    
    const messageContent = newMessage;
    setSending(true);
    
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`/api/tenant/chats/${selectedChat.id}/messages`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: messageContent }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setMessages([...messages, data.message]);
        setNewMessage("");
      } else {
        toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    }
    setSending(false);
  };

  if (selectedChat) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedChat(null)} data-testid="button-back-to-chats">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h2 className="text-xl font-serif text-stone-800">{selectedChat.name}</h2>
        </div>

        <Card className="h-[500px] flex flex-col">
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {loadingMessages ? (
              <p className="text-center text-stone-400">Loading messages...</p>
            ) : messages.length === 0 ? (
              <p className="text-center text-stone-500">No messages yet. Start the conversation!</p>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-stone-800">
                      {msg.user.firstName} {msg.user.lastName}
                    </span>
                    <Badge variant="outline" className="text-xs">{msg.user.role}</Badge>
                    <span className="text-xs text-stone-400">
                      {new Date(msg.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-stone-600 bg-stone-50 rounded-lg p-3">{msg.content}</p>
                </div>
              ))
            )}
          </CardContent>
          <div className="border-t p-4 flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              data-testid="input-chat-message"
            />
            <Button onClick={sendMessage} disabled={sending || !newMessage.trim()} data-testid="button-send-message">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-serif text-stone-800">Messages</h2>
      
      {loading ? (
        <p className="text-stone-400">Loading...</p>
      ) : chats.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-stone-500">
            No chats available yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {chats.map(chat => (
            <Card 
              key={chat.id} 
              className="cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => openChat(chat)}
              data-testid={`card-chat-${chat.id}`}
            >
              <CardContent className="py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-stone-800">{chat.name}</p>
                  <p className="text-sm text-stone-500">
                    {chat.isGeneral ? "General Chat" : `${chat.class?.title || "Class"} Chat`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{chat._count?.messages || 0} messages</Badge>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function InstructorSettingsTab({ profile, onRefresh }: { profile: ProfileData; onRefresh: () => void }) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);
  const [form, setForm] = useState({
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone || "",
    bio: profile.bio || "",
  });

  const handleResubmit = async () => {
    setResubmitting(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch("/api/instructor/resubmit", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (res.ok) {
        toast({ title: "Application resubmitted", description: "Your application is now pending review." });
        onRefresh();
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: data.error || "Failed to resubmit", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to resubmit application", variant: "destructive" });
    }
    setResubmitting(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch("/api/instructor/profile", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast({ title: "Profile updated successfully" });
        setIsEditing(false);
        onRefresh();
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: data.error || "Failed to update profile", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to update profile", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleCancel = () => {
    setForm({
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone || "",
      bio: profile.bio || "",
    });
    setIsEditing(false);
  };

  const isRejected = profile.applicationStatus === "REJECTED";
  const isPending = profile.applicationStatus === "PENDING";

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-serif text-stone-800">Settings</h2>
        <p className="text-sm text-stone-500 mt-1">Manage your instructor profile</p>
      </div>

      {isRejected && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-800">Application Rejected</p>
                <p className="text-sm text-red-700 mt-1">
                  Your instructor application was not approved. You can update your profile and resubmit for review.
                </p>
                <Button 
                  className="mt-3" 
                  onClick={handleResubmit}
                  disabled={resubmitting}
                  data-testid="button-resubmit-application"
                >
                  {resubmitting ? "Resubmitting..." : "Resubmit for Approval"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isPending && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Application Pending</p>
                <p className="text-sm text-amber-700 mt-1">
                  Your instructor application is awaiting review by a co-op administrator.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Profile Information</CardTitle>
            {!isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} data-testid="button-edit-profile">
                <Edit className="w-3 h-3 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    data-testid="input-profile-firstname"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    data-testid="input-profile-lastname"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  data-testid="input-profile-phone"
                />
              </div>
              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Tell families about yourself and your teaching experience..."
                  rows={4}
                  data-testid="input-profile-bio"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving || !form.firstName || !form.lastName} data-testid="button-save-profile">
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="outline" onClick={handleCancel}>Cancel</Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[#7C9082]/20 rounded-full flex items-center justify-center">
                  <span className="text-xl font-medium text-[#7C9082]">
                    {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-lg font-medium text-stone-800">{profile.firstName} {profile.lastName}</p>
                  <p className="text-sm text-stone-500">{profile.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-stone-400 uppercase tracking-wide">Phone</p>
                  <p className="text-stone-700 mt-1">{profile.phone || "Not set"}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 uppercase tracking-wide">Status</p>
                  <Badge variant={profile.applicationStatus === "APPROVED" ? "default" : "outline"} className="mt-1">
                    {profile.applicationStatus}
                  </Badge>
                </div>
              </div>
              {profile.bio && (
                <div className="pt-4 border-t">
                  <p className="text-xs text-stone-400 uppercase tracking-wide mb-2">Bio</p>
                  <p className="text-stone-700">{profile.bio}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Co-op Membership</CardTitle>
        </CardHeader>
        <CardContent>
          {profile.tenant ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#AE8660]/20 rounded-lg flex items-center justify-center">
                <Home className="w-5 h-5 text-[#AE8660]" />
              </div>
              <div>
                <p className="font-medium text-stone-800">{profile.tenant.name}</p>
                <p className="text-sm text-stone-500">Instructor</p>
              </div>
            </div>
          ) : (
            <p className="text-stone-500">No co-op assignment</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
