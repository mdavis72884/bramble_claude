import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarHeader, useCalendarNavigation } from "@/components/common";
import { ChildProfileEditor, ChildProfileData, LEARNING_STYLES, EDUCATIONAL_PHILOSOPHIES } from "@/components/common/ChildProfileEditor";
import { ChildProfileViewDialog } from "@/components/common/ChildProfileViewDialog";
import { 
  Home, Users, BookOpen, CalendarDays, CreditCard, MessageSquare, Settings, LogOut,
  ChevronRight, Clock, MapPin, User, Plus, Send, ChevronLeft, Edit, Trash2, Sparkles,
  Building2, Globe, Mail, Phone, ExternalLink, Search
} from "lucide-react";


interface ChildData {
  id: string;
  firstName: string;
  lastName?: string;
  dateOfBirth?: string;
  grade?: string;
  interests: string[];
  learningStylePrimary?: string;
  learningStyleSecondary?: string;
  educationalPhilosophyPrimary?: string;
  educationalPhilosophySecondary?: string;
  preferredLearningEnvironment?: string;
  neurodivergentNotes?: string;
  healthNotes?: string;
  parentNotes?: string;
  shareWithInstructors: boolean;
  visibleToOtherParents: boolean;
}

interface ProfileData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  applicationStatus: string;
  children: ChildData[];
  tenant?: {
    id: string;
    name: string;
    slug: string;
  };
}

interface ClassData {
  id: string;
  title: string;
  description: string;
  price: number;
  capacity: number;
  instructor: { firstName: string; lastName: string };
  sessions: Array<{ id: string; date: string; startTime: string; endTime: string; location?: string }>;
  _count: { registrations: number };
  enrolledChildIds?: string[];
}

interface EventData {
  id: string;
  title: string;
  description: string;
  date: string;
  location?: string;
  price: number;
  _count: { registrations: number };
  selfRsvped?: boolean;
  rsvpedChildIds?: (string | null)[];
}

interface CalendarEvent {
  type: string;
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  child?: string;
  classId?: string;
}

interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  user: { firstName: string; lastName: string; role: string };
}

export default function FamilyDashboard() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [events, setEvents] = useState<EventData[]>([]);
  const [calendar, setCalendar] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [navigateToClassId, setNavigateToClassId] = useState<string | null>(null);

  const refreshProfile = () => {
    const token = localStorage.getItem("accessToken");
    fetch("/api/me/profile", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setProfile(data.profile));
  };

  const refreshData = () => {
    if (!profile?.tenant?.slug) return;
    const token = localStorage.getItem("accessToken");
    const headers = { Authorization: `Bearer ${token}` };
    const slug = profile.tenant.slug;
    Promise.all([
      fetch(`/api/t/${slug}/classes`, { headers }).then(r => r.json()),
      fetch(`/api/t/${slug}/events`, { headers }).then(r => r.json()),
      fetch("/api/me/calendar", { headers }).then(r => r.json()).catch(() => ({ calendarEvents: [] })),
    ]).then(([classesData, eventsData, calendarData]) => {
      setClasses(classesData.classes || []);
      setEvents(eventsData.events || []);
      setCalendar(calendarData.calendarEvents || []);
    });
  };

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch("/api/me/profile", { headers }).then(r => r.json()),
      fetch("/api/me/calendar", { headers }).then(r => r.json()).catch(() => ({ calendarEvents: [] })),
    ]).then(([profileData, calendarData]) => {
      setProfile(profileData.profile);
      setCalendar(calendarData.calendarEvents || []);
      
      if (profileData.profile?.tenant?.slug) {
        const slug = profileData.profile.tenant.slug;
        Promise.all([
          fetch(`/api/t/${slug}/classes`, { headers }).then(r => r.json()),
          fetch(`/api/t/${slug}/events`, { headers }).then(r => r.json()),
        ]).then(([classesData, eventsData]) => {
          setClasses(classesData.classes || []);
          setEvents(eventsData.events || []);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
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
  const upcomingEvents = calendar.slice(0, 5);

  return (
    <div className="min-h-screen bg-stone-50 flex">
      <aside className="w-64 bg-white border-r border-stone-200 flex flex-col">
        <div className="p-6 border-b border-stone-100">
          <h1 className="font-serif text-xl text-stone-800">Family Portal</h1>
          <p className="text-sm text-stone-500 mt-1">{profile.tenant?.name || "Bramble"}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavButton icon={Home} label="Overview" active={activeTab === "overview"} onClick={() => setActiveTab("overview")} />
          <NavButton icon={Users} label="Children" active={activeTab === "children"} onClick={() => setActiveTab("children")} />
          <NavButton icon={BookOpen} label="Classes" active={activeTab === "classes"} onClick={() => setActiveTab("classes")} />
          <NavButton icon={CalendarDays} label="Events" active={activeTab === "events"} onClick={() => setActiveTab("events")} />
          <NavButton icon={CalendarDays} label="Calendar" active={activeTab === "calendar"} onClick={() => setActiveTab("calendar")} />
          <NavButton icon={CreditCard} label="Payments" active={activeTab === "payments"} onClick={() => setActiveTab("payments")} />
          <NavButton icon={Building2} label="Providers" active={activeTab === "providers"} onClick={() => setActiveTab("providers")} />
          <NavButton icon={MessageSquare} label="Messages" active={activeTab === "messages"} onClick={() => setActiveTab("messages")} />
          <NavButton icon={Settings} label="Settings" active={activeTab === "settings"} onClick={() => setActiveTab("settings")} />
        </nav>

        <div className="p-4 border-t border-stone-100 space-y-3">
          <RoleSwitcher currentPortal="FAMILY" variant="sidebar" />
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
          <OverviewTab 
            profile={profile}
            calendar={calendar}
            events={events}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === "children" && (
          <ChildrenTab 
            profile={profile} 
            classes={classes} 
            onRefresh={refreshProfile} 
            onViewClass={(classId) => {
              setNavigateToClassId(classId);
              setActiveTab("classes");
            }}
          />
        )}

        {activeTab === "classes" && (
          <ClassesTab 
            classes={classes} 
            children={profile.children} 
            tenantSlug={profile.tenant?.slug} 
            onRefresh={refreshData} 
            initialSelectedClassId={navigateToClassId}
            onClassViewed={() => setNavigateToClassId(null)}
          />
        )}

        {activeTab === "events" && (
          <EventsTab events={events} children={profile.children} tenantSlug={profile.tenant?.slug} onRefresh={refreshData} />
        )}

        {activeTab === "calendar" && (
          <CalendarTab calendar={calendar} />
        )}

        {activeTab === "payments" && (
          <PaymentsTab />
        )}

        {activeTab === "providers" && (
          <ProvidersTab />
        )}

        {activeTab === "messages" && (
          <MessagesTab />
        )}

        {activeTab === "settings" && (
          <SettingsTab profile={profile} onRefresh={refreshProfile} />
        )}
      </main>
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
      data-testid={`nav-${label.toLowerCase()}`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function OverviewTab({ 
  profile, 
  calendar, 
  events, 
  setActiveTab 
}: { 
  profile: ProfileData; 
  calendar: CalendarEvent[]; 
  events: EventData[]; 
  setActiveTab: (tab: string) => void;
}) {
  const [chats, setChats] = useState<any[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [selectedSession, setSelectedSession] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    fetch("/api/tenant/chats", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setChats(data.chats || []);
        setLoadingChats(false);
      })
      .catch(() => setLoadingChats(false));
  }, []);

  const today = new Date();
  const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const thisWeekClasses = calendar
    .filter(e => e.type === "class_session")
    .filter(e => {
      const eventDate = new Date(e.date);
      return eventDate >= today && eventDate <= weekFromNow;
    })
    .slice(0, 4);

  const upcomingEventsFiltered = events
    .filter(e => new Date(e.date) >= today)
    .slice(0, 3);

  const recentChats = chats.slice(0, 3);
  const totalUnread = chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif text-stone-800" data-testid="text-dashboard-title">
          Welcome back, {profile.firstName}!
        </h2>
        <p className="text-sm text-stone-500">
          {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-l-4 border-l-[#7C9082]" data-testid="card-this-week-classes">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#7C9082]" />
                This Week's Classes
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab("calendar")} className="text-stone-500 hover:text-stone-700">
                View Calendar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {thisWeekClasses.length === 0 ? (
              <p className="text-sm text-stone-500 py-4 text-center">No classes scheduled this week</p>
            ) : (
              <div className="space-y-3">
                {thisWeekClasses.map((cls, i) => (
                  <div 
                    key={i} 
                    className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg cursor-pointer hover:bg-stone-100 transition-colors"
                    onClick={() => setSelectedSession(cls)}
                    data-testid={`session-${i}`}
                  >
                    <div className="w-12 text-center flex-shrink-0">
                      <p className="text-xs text-stone-500 uppercase">
                        {new Date(cls.date).toLocaleDateString("en-US", { weekday: "short" })}
                      </p>
                      <p className="text-lg font-semibold text-stone-800">
                        {new Date(cls.date).getDate()}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-stone-800 truncate">{cls.title}</p>
                      <p className="text-sm text-stone-500">
                        {cls.startTime} - {cls.endTime}
                        {cls.child && <span className="ml-2 text-[#7C9082]">{cls.child}</span>}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#AE8660]" data-testid="card-messages-announcements">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#AE8660]" />
                Messages & Announcements
                {totalUnread > 0 && (
                  <Badge variant="default" className="bg-[#AE8660] text-xs ml-1" data-testid="badge-total-unread">
                    {totalUnread}
                  </Badge>
                )}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab("messages")} className="text-stone-500 hover:text-stone-700">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingChats ? (
              <p className="text-sm text-stone-500 py-4 text-center">Loading...</p>
            ) : recentChats.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-stone-500">No messages yet</p>
                <p className="text-xs text-stone-400 mt-1">Messages from instructors will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentChats.map((chat: any) => (
                  <div 
                    key={chat.id} 
                    className="p-3 bg-stone-50 rounded-lg cursor-pointer hover:bg-stone-100 transition-colors"
                    onClick={() => setActiveTab("messages")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-stone-800 text-sm truncate flex-1">
                        {chat.class?.title || "Class Discussion"}
                      </p>
                      {chat.unreadCount > 0 && (
                        <Badge variant="default" className="bg-[#AE8660] text-xs">
                          {chat.unreadCount} new
                        </Badge>
                      )}
                    </div>
                    {chat.lastMessage && (
                      <p className="text-xs text-stone-500 mt-1 line-clamp-2">
                        {chat.lastMessage.content}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-your-children">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-stone-500" />
                Your Children
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab("children")} className="text-stone-500 hover:text-stone-700">
                Manage
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {profile.children.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-stone-500">No children added yet</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => setActiveTab("children")}
                >
                  Add a Child
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {profile.children.map(child => (
                  <div 
                    key={child.id} 
                    className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg cursor-pointer hover:bg-stone-100 transition-colors"
                    onClick={() => setActiveTab("children")}
                    data-testid={`overview-child-${child.id}`}
                  >
                    <div className="w-10 h-10 bg-[#7C9082]/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-[#7C9082]">
                        {child.firstName.charAt(0)}{(child.lastName || "").charAt(0)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-stone-800 text-sm truncate">
                        {child.firstName} {child.lastName || ""}
                      </p>
                      {child.dateOfBirth && (
                        <p className="text-xs text-stone-500">
                          Age {Math.floor((Date.now() - new Date(child.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-400" data-testid="card-upcoming-events">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-purple-500" />
                Upcoming Events
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab("events")} className="text-stone-500 hover:text-stone-700">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingEventsFiltered.length === 0 ? (
              <p className="text-sm text-stone-500 py-4 text-center">No upcoming events</p>
            ) : (
              <div className="space-y-3">
                {upcomingEventsFiltered.map(event => {
                  const hasRsvp = event.selfRsvped || (event.rsvpedChildIds && event.rsvpedChildIds.length > 0);
                  const rsvpedNames = [
                    ...(event.selfRsvped ? ["You"] : []),
                    ...profile.children
                      .filter(c => event.rsvpedChildIds?.includes(c.id))
                      .map(c => c.firstName),
                  ].join(", ");

                  return (
                    <div 
                      key={event.id} 
                      className="flex items-start gap-3 p-3 bg-stone-50 rounded-lg cursor-pointer hover:bg-stone-100 transition-colors"
                      onClick={() => setSelectedEvent(event)}
                      data-testid={`card-event-${event.id}`}
                    >
                      <div className="w-12 text-center flex-shrink-0">
                        <p className="text-xs text-stone-500 uppercase">
                          {new Date(event.date).toLocaleDateString("en-US", { month: "short" })}
                        </p>
                        <p className="text-lg font-semibold text-stone-800">
                          {new Date(event.date).getDate()}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-stone-800 truncate">{event.title}</p>
                        {event.location && (
                          <p className="text-xs text-stone-500 flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" /> {event.location}
                          </p>
                        )}
                        {hasRsvp && (
                          <p className="text-xs text-[#7C9082] mt-1">Attending: {rsvpedNames}</p>
                        )}
                      </div>
                      {hasRsvp ? (
                        <Badge variant="default" className="flex-shrink-0 bg-[#7C9082]">RSVP'd</Badge>
                      ) : (
                        <Badge variant="secondary" className="flex-shrink-0">
                          {event.price === 0 ? "Free" : `$${event.price}`}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border border-[#7C9082]/30 bg-gradient-to-r from-[#7C9082]/5 to-transparent" data-testid="card-browse-classes">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#7C9082]/20 rounded-full flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-[#7C9082]" />
              </div>
              <div>
                <h3 className="font-semibold text-stone-800">Browse Available Classes</h3>
                <p className="text-sm text-stone-500">Discover new classes and enroll your children</p>
              </div>
            </div>
            <Button onClick={() => setActiveTab("classes")} className="bg-[#7C9082] hover:bg-[#6a7d70]" data-testid="button-browse-classes">
              View All Classes
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-lg">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-serif">{selectedEvent.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-stone-600">
                  <CalendarDays className="w-4 h-4" />
                  <span>
                    {new Date(selectedEvent.date).toLocaleDateString("en-US", { 
                      weekday: "long", 
                      month: "long", 
                      day: "numeric", 
                      year: "numeric" 
                    })}
                  </span>
                </div>
                {selectedEvent.location && (
                  <div className="flex items-center gap-2 text-stone-600">
                    <MapPin className="w-4 h-4" />
                    <span>{selectedEvent.location}</span>
                  </div>
                )}
                {selectedEvent.description && (
                  <p className="text-stone-700">{selectedEvent.description}</p>
                )}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div>
                    {selectedEvent.price === 0 ? (
                      <Badge variant="secondary">Free Event</Badge>
                    ) : (
                      <Badge variant="secondary">${selectedEvent.price}</Badge>
                    )}
                  </div>
                  {(selectedEvent.selfRsvped || (selectedEvent.rsvpedChildIds && selectedEvent.rsvpedChildIds.length > 0)) && (
                    <Badge variant="default" className="bg-purple-600">You're Attending</Badge>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  {!(selectedEvent.selfRsvped || (selectedEvent.rsvpedChildIds && selectedEvent.rsvpedChildIds.length > 0)) && (
                    <Button onClick={() => { setSelectedEvent(null); setActiveTab("events"); }} className="bg-purple-600 hover:bg-purple-700">
                      RSVP Now
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => { setSelectedEvent(null); setActiveTab("events"); }}>
                    View All Events
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedSession} onOpenChange={(open) => !open && setSelectedSession(null)}>
        <DialogContent className="max-w-lg" data-testid="dialog-session-detail">
          {selectedSession && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-serif">{selectedSession.title}</DialogTitle>
                <DialogDescription>Class</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-[#7C9082]/10 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#7C9082]/20 rounded-full flex items-center justify-center">
                      <CalendarDays className="w-6 h-6 text-[#7C9082]" />
                    </div>
                    <div>
                      <p className="font-semibold text-stone-800">
                        {new Date(selectedSession.date).toLocaleDateString("en-US", { 
                          weekday: "long", 
                          month: "long", 
                          day: "numeric" 
                        })}
                      </p>
                      <p className="text-sm text-stone-600">
                        {selectedSession.startTime} - {selectedSession.endTime}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedSession.location && (
                  <div className="flex items-center gap-3 text-stone-600">
                    <MapPin className="w-5 h-5" />
                    <span>{selectedSession.location}</span>
                  </div>
                )}

                {selectedSession.child && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#7C9082]/20 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-[#7C9082]" />
                    </div>
                    <div>
                      <p className="text-xs text-stone-500">Attending</p>
                      <p className="font-medium text-stone-800">{selectedSession.child}</p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button variant="outline" onClick={() => setSelectedSession(null)}>
                    Close
                  </Button>
                  <Button onClick={() => { setSelectedSession(null); setActiveTab("calendar"); }} className="bg-[#7C9082] hover:bg-[#6a7d70]">
                    View Full Calendar
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChildrenTab({ profile, classes, onRefresh, onViewClass }: { profile: ProfileData; classes: ClassData[]; onRefresh: () => void; onViewClass?: (classId: string) => void }) {
  const { toast } = useToast();
  const [view, setView] = useState<"list" | "add" | "edit">("list");
  const [editingChild, setEditingChild] = useState<ChildData | null>(null);
  const [deletingChild, setDeletingChild] = useState<ChildData | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedChild, setSelectedChild] = useState<ChildData | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const getChildEnrolledClasses = (childId: string): ClassData[] => {
    return classes.filter(cls => cls.enrolledChildIds?.includes(childId));
  };

  const getLearningStyleLabel = (value?: string) => {
    return LEARNING_STYLES.find(s => s.value === value)?.label || value;
  };

  const getPhilosophyLabel = (value?: string) => {
    return EDUCATIONAL_PHILOSOPHIES.find(p => p.value === value)?.label || value;
  };

  const handleSaveChild = async (data: ChildProfileData) => {
    const token = localStorage.getItem("accessToken");
    const isEdit = !!data.id;
    const url = isEdit ? `/api/me/children/${data.id}` : "/api/me/children";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast({ title: isEdit ? "Profile updated" : "Child added successfully" });
      setView("list");
      setEditingChild(null);
      onRefresh();
    } else {
      const err = await res.json().catch(() => ({}));
      toast({ title: err.error || "Failed to save", variant: "destructive" });
      throw new Error(err.error);
    }
  };

  const handleDeleteChild = async () => {
    if (!deletingChild) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`/api/me/children/${deletingChild.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setDeletingChild(null);
        toast({ title: "Child removed successfully" });
        onRefresh();
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: data.error || "Failed to remove child", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to remove child", variant: "destructive" });
    }
    setDeleting(false);
  };

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getProfileCompleteness = (child: ChildData): { percentage: number; missingFields: string[] } => {
    const fields = [
      { key: "dateOfBirth", label: "Date of birth", weight: 20 },
      { key: "grade", label: "Grade level", weight: 15 },
      { key: "learningStylePrimary", label: "Learning style", weight: 25 },
      { key: "interests", label: "Interests", weight: 25, isArray: true },
      { key: "educationalPhilosophyPrimary", label: "Educational philosophy", weight: 15 },
    ];
    
    let score = 0;
    const missing: string[] = [];
    
    for (const field of fields) {
      const value = child[field.key as keyof ChildData];
      if (field.isArray) {
        if (Array.isArray(value) && value.length > 0) {
          score += field.weight;
        } else {
          missing.push(field.label);
        }
      } else if (value) {
        score += field.weight;
      } else {
        missing.push(field.label);
      }
    }
    
    return { percentage: score, missingFields: missing };
  };

  if (view === "add") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="sm" onClick={() => setView("list")}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h2 className="text-xl font-serif text-stone-800">Add Child Profile</h2>
        </div>
        <ChildProfileEditor
          onSave={handleSaveChild}
          onCancel={() => setView("list")}
        />
      </div>
    );
  }

  if (view === "edit" && editingChild) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="sm" onClick={() => { setView("list"); setEditingChild(null); }}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h2 className="text-xl font-serif text-stone-800">Edit {editingChild.firstName}'s Profile</h2>
        </div>
        <ChildProfileEditor
          initialData={{
            ...editingChild,
            dateOfBirth: editingChild.dateOfBirth ? editingChild.dateOfBirth.split("T")[0] : "",
          }}
          onSave={handleSaveChild}
          onCancel={() => { setView("list"); setEditingChild(null); }}
          isEditing
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif text-stone-800">My Children</h2>
          <p className="text-sm text-stone-500 mt-1">Manage your children's profiles and enrollments</p>
        </div>
        <Button onClick={() => setView("add")} data-testid="button-add-child">
          <Plus className="w-4 h-4 mr-2" />
          Add Child
        </Button>
      </div>
      
      {profile.children.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 mx-auto bg-stone-100 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-stone-400" />
            </div>
            <h3 className="font-medium text-stone-800 mb-2">No children added yet</h3>
            <p className="text-sm text-stone-500 mb-4">Add your children to start enrolling them in classes</p>
            <Button onClick={() => setView("add")} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Child
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {profile.children.map(child => {
            const enrolledClasses = getChildEnrolledClasses(child.id);
            const hasProfile = child.learningStylePrimary || child.interests?.length > 0;
            const { percentage, missingFields } = getProfileCompleteness(child);
            const isComplete = percentage >= 100;
            return (
              <Card 
                key={child.id} 
                className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" 
                onClick={() => { setSelectedChild(child); setIsDetailOpen(true); }}
                data-testid={`card-child-${child.id}`}
              >
                <CardHeader className="pb-3 bg-gradient-to-r from-[#7C9082]/10 to-transparent">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#7C9082]/20 rounded-full flex items-center justify-center">
                        <span className="text-lg font-medium text-[#7C9082]">
                          {child.firstName.charAt(0)}{(child.lastName || "").charAt(0)}
                        </span>
                      </div>
                      <div>
                        <CardTitle className="text-lg">{child.firstName} {child.lastName || ""}</CardTitle>
                        {child.dateOfBirth && (
                          <CardDescription className="flex items-center gap-2">
                            <span>Age {calculateAge(child.dateOfBirth)}</span>
                            {child.grade && (
                              <>
                                <span className="text-stone-300">•</span>
                                <span>{child.grade}</span>
                              </>
                            )}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-3 space-y-3">
                  {!isComplete && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-100" data-testid={`profile-incomplete-${child.id}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-amber-800">Profile {percentage}% complete</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-amber-700 hover:text-amber-900 hover:bg-amber-100 px-2"
                          onClick={(e) => { e.stopPropagation(); setEditingChild(child); setView("edit"); }}
                          data-testid={`button-complete-profile-${child.id}`}
                        >
                          <Edit className="w-3 h-3 mr-1" /> Complete
                        </Button>
                      </div>
                      <div className="w-full bg-amber-200 rounded-full h-1.5">
                        <div 
                          className="bg-amber-500 h-1.5 rounded-full transition-all duration-500" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-amber-600 mt-1.5">
                        Missing: {missingFields.slice(0, 3).join(", ")}{missingFields.length > 3 ? ` (+${missingFields.length - 3})` : ""}
                      </p>
                    </div>
                  )}
                  {isComplete && (
                    <div className="flex items-center gap-1.5 text-xs text-[#7C9082]" data-testid={`profile-complete-${child.id}`}>
                      <Sparkles className="w-3 h-3" />
                      <span>Profile complete</span>
                    </div>
                  )}
                  {hasProfile && (
                    <div className="flex flex-wrap gap-1.5">
                      {child.learningStylePrimary && (
                        <Badge variant="secondary" className="text-xs bg-[#7C9082]/10 text-[#7C9082]">
                          <Sparkles className="w-3 h-3 mr-1" />
                          {getLearningStyleLabel(child.learningStylePrimary)}
                        </Badge>
                      )}
                      {child.interests?.slice(0, 2).map(interest => (
                        <Badge key={interest} variant="outline" className="text-xs">
                          {interest}
                        </Badge>
                      ))}
                      {(child.interests?.length || 0) > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{child.interests!.length - 2} more
                        </Badge>
                      )}
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <BookOpen className="w-4 h-4" />
                      <span>{enrolledClasses.length} class{enrolledClasses.length !== 1 ? "es" : ""} enrolled</span>
                    </div>
                    {enrolledClasses.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {enrolledClasses.slice(0, 3).map(cls => (
                          <button
                            key={cls.id}
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              onViewClass?.(cls.id); 
                            }}
                            className="text-xs bg-[#7C9082]/10 text-[#5a6b5f] px-2 py-1 rounded hover:bg-[#7C9082]/20 transition-colors"
                            data-testid={`link-class-${cls.id}`}
                          >
                            {cls.title}
                          </button>
                        ))}
                        {enrolledClasses.length > 3 && (
                          <span className="text-xs text-stone-400 px-2 py-1">+{enrolledClasses.length - 3} more</span>
                        )}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-stone-400 self-center" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!deletingChild} onOpenChange={(open) => !open && setDeletingChild(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Child</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-stone-600">
              Are you sure you want to remove <span className="font-medium">{deletingChild?.firstName} {deletingChild?.lastName}</span>? 
              This will also remove all their class enrollments.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeletingChild(null)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteChild}
              disabled={deleting}
              data-testid="button-confirm-delete-child"
            >
              {deleting ? "Removing..." : "Remove Child"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ChildProfileViewDialog
        child={selectedChild ? {
          ...selectedChild,
          enrollments: getChildEnrolledClasses(selectedChild.id).map(cls => ({
            id: cls.id,
            class: { id: cls.id, title: cls.title }
          }))
        } : null}
        isOpen={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onEdit={(child) => {
          setIsDetailOpen(false);
          setEditingChild(child);
          setView("edit");
        }}
        onDelete={(childId) => {
          setIsDetailOpen(false);
          setDeletingChild(profile.children.find(c => c.id === childId) || null);
        }}
        onClassClick={(classId) => {
          setIsDetailOpen(false);
          onViewClass?.(classId);
        }}
        viewerRole="parent"
        showPrivacySettings={false}
      />
    </div>
  );
}

function ClassesTab({ classes, children, tenantSlug, onRefresh, initialSelectedClassId, onClassViewed }: { 
  classes: ClassData[]; 
  children: ProfileData["children"]; 
  tenantSlug?: string; 
  onRefresh?: () => void;
  initialSelectedClassId?: string | null;
  onClassViewed?: () => void;
}) {
  const { toast } = useToast();
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);

  useEffect(() => {
    if (initialSelectedClassId) {
      const classToSelect = classes.find(c => c.id === initialSelectedClassId);
      if (classToSelect) {
        setSelectedClass(classToSelect);
        onClassViewed?.();
      }
    }
  }, [initialSelectedClassId, classes, onClassViewed]);
  const [enrolling, setEnrolling] = useState(false);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [localEnrollments, setLocalEnrollments] = useState<Record<string, string[]>>({});

  const handleEnroll = async () => {
    if (!selectedClass || selectedChildren.length === 0) return;
    setEnrolling(true);
    
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`/api/t/${tenantSlug}/classes/${selectedClass.id}/enroll`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ childIds: selectedChildren }),
      });
      
      if (res.ok) {
        setLocalEnrollments(prev => ({
          ...prev,
          [selectedClass.id]: [...(prev[selectedClass.id] || []), ...selectedChildren],
        }));
        toast({ title: "Success", description: "Enrolled successfully" });
        setSelectedChildren([]);
        onRefresh?.();
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Error", description: data.error || "Failed to enroll", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to enroll", variant: "destructive" });
    }
    setEnrolling(false);
  };

  const getEnrolledChildIds = (cls: ClassData): string[] => {
    const fromApi = cls.enrolledChildIds || [];
    const fromLocal = localEnrollments[cls.id] || [];
    return Array.from(new Set([...fromApi, ...fromLocal]));
  };

  const getUnenrolledChildren = (cls: ClassData) => {
    const enrolledIds = getEnrolledChildIds(cls);
    return children.filter(child => !enrolledIds.includes(child.id));
  };

  const formatSessionDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-serif text-stone-800">Available Classes</h2>
      
      {classes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 mx-auto bg-[#7C9082]/10 rounded-full flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-[#7C9082]" />
            </div>
            <h3 className="font-medium text-stone-800 mb-2">No classes available</h3>
            <p className="text-sm text-stone-500">Check back soon for new class offerings from your co-op</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {classes.map(cls => {
            const enrolledChildIds = getEnrolledChildIds(cls);
            const allChildrenEnrolled = getUnenrolledChildren(cls).length === 0 && children.length > 0;
            const someEnrolled = enrolledChildIds.length > 0;
            const enrolledNames = children
              .filter(c => enrolledChildIds.includes(c.id))
              .map(c => c.firstName)
              .join(", ");
            
            return (
              <Card 
                key={cls.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedClass(cls)}
                data-testid={`card-class-${cls.id}`}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{cls.title}</CardTitle>
                    <Badge variant="secondary">${cls.price}</Badge>
                  </div>
                  <CardDescription>
                    with {cls.instructor.firstName} {cls.instructor.lastName}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-stone-600 mb-4 line-clamp-2">{cls.description}</p>
                  <div className="flex items-center gap-4 text-sm text-stone-500 mb-4">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {cls._count.registrations}/{cls.capacity}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {cls.sessions.length} classes
                    </span>
                  </div>
                  
                  {allChildrenEnrolled ? (
                    <div className="space-y-2">
                      <Badge variant="default" className="bg-[#7C9082]" data-testid={`badge-enrolled-${cls.id}`}>Enrolled</Badge>
                      <p className="text-xs text-stone-500">Enrolled: {enrolledNames}</p>
                    </div>
                  ) : someEnrolled ? (
                    <div className="space-y-2">
                      <p className="text-xs text-stone-500">Enrolled: {enrolledNames}</p>
                      <Badge variant="outline" className="text-[#7C9082] border-[#7C9082]">Tap to add more</Badge>
                    </div>
                  ) : (
                    <Badge variant="outline">Tap to view details</Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet open={!!selectedClass} onOpenChange={(open) => { if (!open) { setSelectedClass(null); setSelectedChildren([]); } }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto" data-testid="sheet-class-detail">
          {selectedClass && (() => {
            const enrolledChildIds = getEnrolledChildIds(selectedClass);
            const unenrolledChildren = getUnenrolledChildren(selectedClass);
            const allChildrenEnrolled = unenrolledChildren.length === 0 && children.length > 0;
            const enrolledNames = children
              .filter(c => enrolledChildIds.includes(c.id))
              .map(c => c.firstName)
              .join(", ");
            const nextSession = selectedClass.sessions[0];
            
            return (
              <>
                <SheetHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <SheetTitle className="text-xl font-serif">{selectedClass.title}</SheetTitle>
                      <SheetDescription className="mt-1">
                        with {selectedClass.instructor.firstName} {selectedClass.instructor.lastName}
                      </SheetDescription>
                    </div>
                    <Badge variant="secondary" className="text-lg">${selectedClass.price}</Badge>
                  </div>
                </SheetHeader>

                <Separator className="my-4" />

                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-stone-800 mb-2">About this class</h4>
                    <p className="text-sm text-stone-600">{selectedClass.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-stone-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-semibold text-stone-800">
                        {selectedClass._count.registrations}/{selectedClass.capacity}
                      </p>
                      <p className="text-xs text-stone-500">Enrolled</p>
                    </div>
                    <div className="bg-stone-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-semibold text-stone-800">{selectedClass.sessions.length}</p>
                      <p className="text-xs text-stone-500">Classes</p>
                    </div>
                  </div>

                  {nextSession && (
                    <div className="bg-[#7C9082]/10 rounded-lg p-4">
                      <h4 className="font-medium text-stone-800 mb-2 flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-[#7C9082]" />
                        Next Class
                      </h4>
                      <p className="text-sm text-stone-700">{formatSessionDate(nextSession.date)}</p>
                      <p className="text-xs text-stone-500">
                        {nextSession.startTime} - {nextSession.endTime}
                        {nextSession.location && ` • ${nextSession.location}`}
                      </p>
                    </div>
                  )}

                  {selectedClass.sessions.length > 1 && (
                    <div>
                      <h4 className="font-medium text-stone-800 mb-2">All Classes</h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {selectedClass.sessions.map((session, idx) => (
                          <div key={session.id} className="flex justify-between text-sm text-stone-600">
                            <span>{formatSessionDate(session.date)}</span>
                            <span className="text-stone-500">{session.startTime}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {enrolledChildIds.length > 0 && (
                    <div className="bg-[#7C9082]/10 rounded-lg p-4">
                      <h4 className="font-medium text-[#7C9082] mb-1">Currently Enrolled</h4>
                      <p className="text-sm text-stone-700">{enrolledNames}</p>
                    </div>
                  )}

                  {allChildrenEnrolled ? (
                    <div className="text-center py-4">
                      <Badge variant="default" className="bg-[#7C9082] text-lg px-4 py-2">All Children Enrolled</Badge>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h4 className="font-medium text-stone-800">Enroll Children</h4>
                      {unenrolledChildren.length === 0 ? (
                        <p className="text-sm text-stone-500">Add children in the Children tab first.</p>
                      ) : (
                        <>
                          <div className="space-y-2">
                            {unenrolledChildren.map(child => (
                              <label 
                                key={child.id} 
                                className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg cursor-pointer hover:bg-stone-100 transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 rounded border-stone-300"
                                  checked={selectedChildren.includes(child.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedChildren([...selectedChildren, child.id]);
                                    } else {
                                      setSelectedChildren(selectedChildren.filter(id => id !== child.id));
                                    }
                                  }}
                                  data-testid={`checkbox-enroll-${child.id}`}
                                />
                                <span className="text-stone-800">{child.firstName} {child.lastName}</span>
                              </label>
                            ))}
                          </div>
                          <Button 
                            className="w-full bg-[#7C9082] hover:bg-[#6a7d70]" 
                            onClick={handleEnroll}
                            disabled={selectedChildren.length === 0 || enrolling}
                            data-testid="button-confirm-enroll"
                          >
                            {enrolling ? "Enrolling..." : `Enroll ${selectedChildren.length > 0 ? `(${selectedChildren.length})` : ""}`}
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function EventsTab({ events, children, tenantSlug, onRefresh }: { events: EventData[]; children: ProfileData["children"]; tenantSlug?: string; onRefresh?: () => void }) {
  const { toast } = useToast();
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [rsvping, setRsvping] = useState(false);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [attendSelf, setAttendSelf] = useState(false);
  const [localRsvps, setLocalRsvps] = useState<Record<string, { self: boolean; childIds: string[] }>>({});
  const [isSuggestEventOpen, setIsSuggestEventOpen] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestForm, setSuggestForm] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
  });
  const [suggestErrors, setSuggestErrors] = useState<Record<string, string>>({});

  const handleSuggestEvent = async () => {
    // Validate required fields
    const errors: Record<string, string> = {};
    if (!suggestForm.title.trim()) errors.title = "Title is required";
    if (!suggestForm.description.trim()) errors.description = "Description is required";
    if (!suggestForm.date) errors.date = "Date is required";
    if (!suggestForm.location.trim()) errors.location = "Address is required";
    
    setSuggestErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      toast({ title: "Missing Information", description: "Please fill in the highlighted fields", variant: "destructive" });
      return;
    }

    const eventDate = new Date(suggestForm.date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (eventDate < now) {
      setSuggestErrors(prev => ({ ...prev, date: "Event date cannot be in the past" }));
      toast({ title: "Invalid Date", description: "Event date cannot be in the past", variant: "destructive" });
      return;
    }

    setSuggesting(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch("/api/tenant/events/propose", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(suggestForm),
      });

      const data = await res.json();
      if (res.ok) {
        toast({ title: "Success", description: "Event suggestion submitted for admin review" });
        setIsSuggestEventOpen(false);
        setSuggestForm({ title: "", description: "", date: "", location: "" });
        setSuggestErrors({});
      } else {
        toast({ title: "Error", description: data.error || "Failed to submit suggestion", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to submit suggestion", variant: "destructive" });
    }
    setSuggesting(false);
  };

  const handleRsvp = async () => {
    if (!selectedEvent || (!attendSelf && selectedChildren.length === 0)) return;
    setRsvping(true);
    
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`/api/t/${tenantSlug}/events/${selectedEvent.id}/rsvp`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ childIds: selectedChildren, attendeeSelf: attendSelf }),
      });
      
      if (res.ok) {
        setLocalRsvps(prev => ({
          ...prev,
          [selectedEvent.id]: {
            self: attendSelf || prev[selectedEvent.id]?.self || false,
            childIds: [...(prev[selectedEvent.id]?.childIds || []), ...selectedChildren],
          },
        }));
        toast({ title: "Success", description: "RSVP confirmed" });
        setSelectedChildren([]);
        setAttendSelf(false);
        onRefresh?.();
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Error", description: data.error || "Failed to RSVP", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to RSVP", variant: "destructive" });
    }
    setRsvping(false);
  };

  const getRsvpStatus = (event: EventData) => {
    const fromApi = {
      self: event.selfRsvped || false,
      childIds: (event.rsvpedChildIds || []).filter((id): id is string => id !== null),
    };
    const fromLocal = localRsvps[event.id] || { self: false, childIds: [] };
    return {
      self: fromApi.self || fromLocal.self,
      childIds: Array.from(new Set([...fromApi.childIds, ...fromLocal.childIds])),
    };
  };

  const getUnrsvpedChildren = (event: EventData) => {
    const rsvpStatus = getRsvpStatus(event);
    return children.filter(child => !rsvpStatus.childIds.includes(child.id));
  };

  const formatEventDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", { 
      weekday: "long", 
      month: "long", 
      day: "numeric", 
      year: "numeric" 
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif text-stone-800">Upcoming Events</h2>
        <Dialog open={isSuggestEventOpen} onOpenChange={(open) => {
          setIsSuggestEventOpen(open);
          if (!open) setSuggestErrors({});
        }}>
          <DialogTrigger asChild>
            <Button variant="outline" data-testid="button-suggest-event">
              <Plus className="w-4 h-4 mr-2" />
              Suggest Event
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Suggest an Event</DialogTitle>
              <DialogDescription>
                Suggest an event for the co-op. It will be reviewed by an admin before being published.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {Object.keys(suggestErrors).length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">Please fill in all required fields highlighted below.</p>
                </div>
              )}
              <div className="space-y-2">
                <Label className={suggestErrors.title ? "text-red-600" : ""}>Event Title *</Label>
                <Input
                  value={suggestForm.title}
                  onChange={(e) => {
                    setSuggestForm({ ...suggestForm, title: e.target.value });
                    if (suggestErrors.title) setSuggestErrors(prev => ({ ...prev, title: "" }));
                  }}
                  placeholder="e.g., Spring Potluck"
                  className={suggestErrors.title ? "border-red-500" : ""}
                  data-testid="input-suggest-title"
                />
                {suggestErrors.title && <p className="text-xs text-red-600">{suggestErrors.title}</p>}
              </div>
              <div className="space-y-2">
                <Label className={suggestErrors.description ? "text-red-600" : ""}>Description *</Label>
                <Textarea
                  value={suggestForm.description}
                  onChange={(e) => {
                    setSuggestForm({ ...suggestForm, description: e.target.value });
                    if (suggestErrors.description) setSuggestErrors(prev => ({ ...prev, description: "" }));
                  }}
                  placeholder="Describe the event..."
                  rows={3}
                  className={suggestErrors.description ? "border-red-500" : ""}
                  data-testid="input-suggest-description"
                />
                {suggestErrors.description && <p className="text-xs text-red-600">{suggestErrors.description}</p>}
              </div>
              <div className="space-y-2">
                <Label className={suggestErrors.date ? "text-red-600" : ""}>Date *</Label>
                <Input
                  type="date"
                  value={suggestForm.date}
                  onChange={(e) => {
                    setSuggestForm({ ...suggestForm, date: e.target.value });
                    if (suggestErrors.date) setSuggestErrors(prev => ({ ...prev, date: "" }));
                  }}
                  min={new Date().toISOString().split("T")[0]}
                  className={suggestErrors.date ? "border-red-500" : ""}
                  data-testid="input-suggest-date"
                />
                {suggestErrors.date && <p className="text-xs text-red-600">{suggestErrors.date}</p>}
              </div>
              <div className="space-y-2">
                <Label className={suggestErrors.location ? "text-red-600" : ""}>Location *</Label>
                <Input
                  value={suggestForm.location}
                  onChange={(e) => {
                    setSuggestForm({ ...suggestForm, location: e.target.value });
                    if (suggestErrors.location) setSuggestErrors(prev => ({ ...prev, location: "" }));
                  }}
                  placeholder="e.g., Community Center"
                  className={suggestErrors.location ? "border-red-500" : ""}
                  data-testid="input-suggest-location"
                />
                {suggestErrors.location && <p className="text-xs text-red-600">{suggestErrors.location}</p>}
              </div>
              <div className="pt-4 flex gap-2">
                <Button 
                  className="flex-1" 
                  onClick={handleSuggestEvent} 
                  disabled={suggesting}
                  data-testid="button-submit-suggest"
                >
                  {suggesting ? "Submitting..." : "Submit for Review"}
                </Button>
                <Button variant="outline" onClick={() => setIsSuggestEventOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {events.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <CalendarDays className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="font-medium text-stone-800 mb-2">No upcoming events</h3>
            <p className="text-sm text-stone-500">Check back soon for community events from your co-op</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {events.map(event => {
            const rsvpStatus = getRsvpStatus(event);
            const hasAnyRsvp = rsvpStatus.self || rsvpStatus.childIds.length > 0;
            const allRsvped = rsvpStatus.self && getUnrsvpedChildren(event).length === 0;
            const rsvpedNames = [
              ...(rsvpStatus.self ? ["You"] : []),
              ...children.filter(c => rsvpStatus.childIds.includes(c.id)).map(c => c.firstName),
            ].join(", ");

            return (
              <Card 
                key={event.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedEvent(event)}
                data-testid={`card-event-${event.id}`}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{event.title}</CardTitle>
                    <Badge variant="secondary">{event.price === 0 ? "Free" : `$${event.price}`}</Badge>
                  </div>
                  <CardDescription className="flex items-center gap-1">
                    <CalendarDays className="w-4 h-4" />
                    {new Date(event.date).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-stone-600 mb-4 line-clamp-2">{event.description}</p>
                  {event.location && (
                    <p className="flex items-center gap-1 text-sm text-stone-500 mb-4">
                      <MapPin className="w-4 h-4" /> {event.location}
                    </p>
                  )}
                  
                  {allRsvped ? (
                    <div className="space-y-2">
                      <Badge variant="default" className="bg-purple-600" data-testid={`badge-rsvped-${event.id}`}>RSVP'd</Badge>
                      <p className="text-xs text-stone-500">Attending: {rsvpedNames}</p>
                    </div>
                  ) : hasAnyRsvp ? (
                    <div className="space-y-2">
                      <p className="text-xs text-stone-500">Attending: {rsvpedNames}</p>
                      <Badge variant="outline" className="text-purple-600 border-purple-600">Tap to add more</Badge>
                    </div>
                  ) : (
                    <Badge variant="outline">Tap to view details</Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet open={!!selectedEvent} onOpenChange={(open) => { if (!open) { setSelectedEvent(null); setSelectedChildren([]); setAttendSelf(false); } }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto" data-testid="sheet-event-detail">
          {selectedEvent && (() => {
            const rsvpStatus = getRsvpStatus(selectedEvent);
            const unrsvpedChildren = getUnrsvpedChildren(selectedEvent);
            const hasAnyRsvp = rsvpStatus.self || rsvpStatus.childIds.length > 0;
            const allRsvped = rsvpStatus.self && unrsvpedChildren.length === 0;
            const rsvpedNames = [
              ...(rsvpStatus.self ? ["You"] : []),
              ...children.filter(c => rsvpStatus.childIds.includes(c.id)).map(c => c.firstName),
            ].join(", ");
            
            return (
              <>
                <SheetHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <SheetTitle className="text-xl font-serif">{selectedEvent.title}</SheetTitle>
                      <SheetDescription className="mt-1">
                        {formatEventDate(selectedEvent.date)}
                      </SheetDescription>
                    </div>
                    <Badge variant="secondary" className="text-lg">
                      {selectedEvent.price === 0 ? "Free" : `$${selectedEvent.price}`}
                    </Badge>
                  </div>
                </SheetHeader>

                <Separator className="my-4" />

                <div className="space-y-6">
                  {selectedEvent.location && (
                    <div className="flex items-center gap-3 text-stone-600">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-stone-800">Location</p>
                        <p className="text-sm">{selectedEvent.location}</p>
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="font-medium text-stone-800 mb-2">About this event</h4>
                    <p className="text-sm text-stone-600">{selectedEvent.description}</p>
                  </div>

                  <div className="bg-stone-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-semibold text-stone-800">{selectedEvent._count.registrations}</p>
                    <p className="text-xs text-stone-500">People Attending</p>
                  </div>

                  <Separator />

                  {hasAnyRsvp && (
                    <div className="bg-purple-50 rounded-lg p-4">
                      <h4 className="font-medium text-purple-600 mb-1">You're Attending!</h4>
                      <p className="text-sm text-stone-700">{rsvpedNames}</p>
                    </div>
                  )}

                  {allRsvped ? (
                    <div className="text-center py-4">
                      <Badge variant="default" className="bg-purple-600 text-lg px-4 py-2">Everyone's RSVP'd</Badge>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h4 className="font-medium text-stone-800">Who's attending?</h4>
                      <div className="space-y-2">
                        {!rsvpStatus.self && (
                          <label 
                            className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg cursor-pointer hover:bg-stone-100 transition-colors"
                          >
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-stone-300"
                              checked={attendSelf}
                              onChange={(e) => setAttendSelf(e.target.checked)}
                              data-testid="checkbox-rsvp-self"
                            />
                            <span className="text-stone-800">Myself</span>
                          </label>
                        )}
                        {unrsvpedChildren.map(child => (
                          <label 
                            key={child.id} 
                            className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg cursor-pointer hover:bg-stone-100 transition-colors"
                          >
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-stone-300"
                              checked={selectedChildren.includes(child.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedChildren([...selectedChildren, child.id]);
                                } else {
                                  setSelectedChildren(selectedChildren.filter(id => id !== child.id));
                                }
                              }}
                              data-testid={`checkbox-rsvp-${child.id}`}
                            />
                            <span className="text-stone-800">{child.firstName} {child.lastName}</span>
                          </label>
                        ))}
                      </div>
                      <Button 
                        className="w-full bg-purple-600 hover:bg-purple-700" 
                        onClick={handleRsvp}
                        disabled={(!attendSelf && selectedChildren.length === 0) || rsvping}
                        data-testid="button-confirm-rsvp"
                      >
                        {rsvping ? "Confirming..." : "Confirm RSVP"}
                      </Button>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function CalendarTab({ calendar }: { calendar: CalendarEvent[] }) {
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
        <h2 className="text-2xl font-serif text-stone-800">Calendar</h2>
        <CalendarHeader
          currentMonth={currentMonth}
          currentYear={currentYear}
          onMonthChange={setCurrentMonth}
          onYearChange={setCurrentYear}
          onToday={goToToday}
          onPrevMonth={goToPrevMonth}
          onNextMonth={goToNextMonth}
          testIdPrefix="family-calendar"
        />
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
                  <p className={`text-sm ${isToday ? "font-bold text-stone-800" : "text-stone-600"}`}>
                    {i + 1}
                  </p>
                  <div className="space-y-1 mt-1">
                    {dayEvents.slice(0, 2).map((event, idx) => (
                      <button 
                        key={idx}
                        onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                        className={`w-full text-left text-xs truncate px-1 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity ${
                          event.type === "class_session" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
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
              {selectedEvent?.type === "class_session" ? (
                <BookOpen className="w-5 h-5 text-blue-600" />
              ) : (
                <CalendarDays className="w-5 h-5 text-green-600" />
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
            {selectedEvent?.child && (
              <div className="flex items-center gap-2 text-stone-600">
                <User className="w-4 h-4" />
                <span>Enrolled: {selectedEvent.child}</span>
              </div>
            )}
            <Badge variant={selectedEvent?.type === "class_session" ? "default" : "secondary"}>
              {selectedEvent?.type === "class_session" ? "Class" : "Event"}
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
                  <Badge variant={event.type === "class_session" ? "default" : "secondary"} className="text-xs">
                    {event.type === "class_session" ? "Class" : "Event"}
                  </Badge>
                </div>
                {event.startTime && (
                  <p className="text-sm text-stone-500 mt-1">{event.startTime} - {event.endTime}</p>
                )}
                {event.child && (
                  <p className="text-sm text-stone-500">{event.child}</p>
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PaymentsTab() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    fetch("/api/me/payments/orders", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setOrders(data.orders || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const viewReceipt = async (orderId: string) => {
    setLoadingReceipt(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`/api/me/payments/orders/${orderId}/receipt`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.receipt) {
        setSelectedReceipt(data.receipt);
      } else {
        setSelectedReceipt(null);
      }
    } catch {
      setSelectedReceipt(null);
    }
    setLoadingReceipt(false);
  };

  const printReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-serif text-stone-800">Payment History</h2>
      
      {loading ? (
        <p className="text-stone-400">Loading...</p>
      ) : orders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 mx-auto bg-[#AE8660]/10 rounded-full flex items-center justify-center mb-4">
              <CreditCard className="w-8 h-8 text-[#AE8660]" />
            </div>
            <h3 className="font-medium text-stone-800 mb-2">No payment history</h3>
            <p className="text-sm text-stone-500">Your payment history will appear here after enrolling in classes or events</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-stone-50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-stone-600">Date</th>
                  <th className="text-left p-4 text-sm font-medium text-stone-600">Description</th>
                  <th className="text-left p-4 text-sm font-medium text-stone-600">Amount</th>
                  <th className="text-left p-4 text-sm font-medium text-stone-600">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-stone-600"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id} className="border-t border-stone-100">
                    <td className="p-4 text-sm">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 text-sm">{order.registration?.class?.title || order.registration?.event?.title || "Payment"}</td>
                    <td className="p-4 text-sm">${(order.amount / 100).toFixed(2)}</td>
                    <td className="p-4">
                      <Badge variant={order.status === "PAID" || order.status === "SUCCEEDED" ? "default" : "secondary"}>{order.status}</Badge>
                    </td>
                    <td className="p-4">
                      {(order.status === "PAID" || order.status === "SUCCEEDED") && (
                        <Button size="sm" variant="outline" onClick={() => viewReceipt(order.id)} data-testid={`button-view-receipt-${order.id}`}>
                          Receipt
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
        <DialogContent className="max-w-md print:max-w-full print:shadow-none print:border-none">
          <DialogHeader>
            <DialogTitle className="font-serif">Payment Receipt</DialogTitle>
          </DialogHeader>
          {loadingReceipt ? (
            <p className="text-stone-400">Loading receipt...</p>
          ) : selectedReceipt && (
            <div className="space-y-6 py-4" id="receipt-content">
              <div className="text-center border-b border-stone-200 pb-4">
                <h3 className="text-xl font-serif font-semibold text-stone-800">Bramble</h3>
                <p className="text-sm text-stone-500">{selectedReceipt.coopName}</p>
              </div>

              <div className="text-center">
                <p className="text-xs text-stone-400 uppercase tracking-wider">Receipt Number</p>
                <p className="font-mono font-semibold">{selectedReceipt.receiptNumber}</p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-500">Date</span>
                  <span className="font-medium">{new Date(selectedReceipt.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Paid By</span>
                  <span className="font-medium">{selectedReceipt.paidBy.name}</span>
                </div>
                {selectedReceipt.childName && (
                  <div className="flex justify-between">
                    <span className="text-stone-500">Student</span>
                    <span className="font-medium">{selectedReceipt.childName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-stone-500">{selectedReceipt.itemType === "class" ? "Class" : "Event"}</span>
                  <span className="font-medium">{selectedReceipt.itemTitle}</span>
                </div>
                {selectedReceipt.instructor && (
                  <div className="flex justify-between">
                    <span className="text-stone-500">Instructor</span>
                    <span className="font-medium">{selectedReceipt.instructor}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-stone-200 pt-4">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total Paid</span>
                  <span className="text-[#7C9082]">${(selectedReceipt.amount / 100).toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center pt-4 border-t border-stone-200">
                <Badge variant="default" className="bg-green-100 text-green-800">
                  {selectedReceipt.status}
                </Badge>
              </div>

              <div className="flex justify-center gap-2 print:hidden">
                <Button onClick={printReceipt} data-testid="button-print-receipt">
                  Print Receipt
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ProviderData {
  id: string;
  name: string;
  website?: string;
  description?: string;
  category: string;
  contactEmail?: string;
  contactPhone?: string;
  isAutoListed: boolean;
  linkedUser?: { id: string; firstName: string; lastName: string; email: string; bio?: string } | null;
}

function ProvidersTab() {
  const [providers, setProviders] = useState<ProviderData[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    fetch("/api/tenant/providers", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setProviders(data.providers || []);
        setCategories(data.categories || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredProviders = providers.filter(p => {
    const matchesSearch = searchQuery === "" || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif text-stone-800">Local Providers</h2>
        <p className="text-stone-500 mt-1">Discover instructors, tutors, and local services recommended by your co-op</p>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-stone-400" />
          <Input
            placeholder="Search providers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-providers"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-48" data-testid="select-filter-category">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-stone-400">Loading...</p>
      ) : filteredProviders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 mx-auto bg-[#7C9082]/10 rounded-full flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-[#7C9082]" />
            </div>
            <h3 className="font-medium text-stone-800 mb-2">No providers found</h3>
            <p className="text-sm text-stone-500">
              {searchQuery || filterCategory !== "all" 
                ? "Try adjusting your search or filter" 
                : "Your co-op hasn't added any local providers yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProviders.map(provider => (
            <Card key={provider.id} className="hover:shadow-md transition-shadow" data-testid={`card-provider-${provider.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{provider.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">{provider.category}</Badge>
                      {provider.isAutoListed && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          <Users className="w-3 h-3 mr-1" /> Instructor
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {provider.description && (
                  <p className="text-sm text-stone-600 line-clamp-2">{provider.description}</p>
                )}
                <div className="flex flex-wrap gap-2 text-sm text-stone-500">
                  {provider.website && (
                    <a href={provider.website} target="_blank" rel="noopener noreferrer" 
                       className="flex items-center gap-1 hover:text-[#7C9082]">
                      <Globe className="w-3.5 h-3.5" />
                      <span className="underline">Website</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {provider.contactEmail && (
                    <a href={`mailto:${provider.contactEmail}`} className="flex items-center gap-1 hover:text-[#7C9082]">
                      <Mail className="w-3.5 h-3.5" />
                      {provider.contactEmail}
                    </a>
                  )}
                  {provider.contactPhone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      {provider.contactPhone}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  user: { firstName: string; lastName: string; role: string };
}

function MessagesTab() {
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

function SettingsTab({ profile, onRefresh }: { profile: ProfileData; onRefresh: () => void }) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone || "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleSave = async () => {
    // Validate required fields
    const errors: Record<string, string> = {};
    if (!form.firstName.trim()) errors.firstName = "First name is required";
    if (!form.lastName.trim()) errors.lastName = "Last name is required";
    
    setFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      toast({ title: "Missing Information", description: "Please fill in the highlighted fields", variant: "destructive" });
      return;
    }
    
    setSaving(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast({ title: "Profile updated successfully" });
        setFormErrors({});
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
    });
    setFormErrors({});
    setIsEditing(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-serif text-stone-800">Settings</h2>
        <p className="text-sm text-stone-500 mt-1">Manage your account and profile information</p>
      </div>

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
              {Object.keys(formErrors).length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                  <p className="text-sm text-red-700">Please fill in all required fields highlighted below.</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={formErrors.firstName ? "text-red-600" : ""}>First Name *</Label>
                  <Input
                    value={form.firstName}
                    onChange={(e) => {
                      setForm({ ...form, firstName: e.target.value });
                      if (formErrors.firstName) setFormErrors(prev => ({ ...prev, firstName: "" }));
                    }}
                    className={formErrors.firstName ? "border-red-500" : ""}
                    data-testid="input-profile-firstname"
                  />
                  {formErrors.firstName && <p className="text-xs text-red-600">{formErrors.firstName}</p>}
                </div>
                <div className="space-y-2">
                  <Label className={formErrors.lastName ? "text-red-600" : ""}>Last Name *</Label>
                  <Input
                    value={form.lastName}
                    onChange={(e) => {
                      setForm({ ...form, lastName: e.target.value });
                      if (formErrors.lastName) setFormErrors(prev => ({ ...prev, lastName: "" }));
                    }}
                    className={formErrors.lastName ? "border-red-500" : ""}
                    data-testid="input-profile-lastname"
                  />
                  {formErrors.lastName && <p className="text-xs text-red-600">{formErrors.lastName}</p>}
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
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving} data-testid="button-save-profile">
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
                <p className="text-sm text-stone-500">Member since joining</p>
              </div>
            </div>
          ) : (
            <p className="text-stone-500">No co-op membership</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
