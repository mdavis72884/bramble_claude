import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookOpen, MapPin, Clock, User, AlertCircle, Calendar } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { CalendarHeader, useCalendarNavigation, LoadingState, AsyncSection } from "@/components/common";

interface CalendarEvent {
  type: string;
  id: string;
  classId?: string;
  title: string;
  description?: string;
  instructor?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  price?: number;
}

export default function CalendarView() {
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
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ date: Date; events: CalendarEvent[] } | null>(null);

  useEffect(() => {
    apiFetch<{ calendarEvents: CalendarEvent[] }>("/api/tenant/calendar").then(({ data, error }) => {
      if (error) {
        setError(error);
      } else {
        setEvents(data?.calendarEvents || []);
      }
      setLoading(false);
    });
  }, []);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();

  const eventsMap = new Map<string, CalendarEvent[]>();
  events.forEach(event => {
    const dateKey = new Date(event.date).toDateString();
    if (!eventsMap.has(dateKey)) eventsMap.set(dateKey, []);
    eventsMap.get(dateKey)!.push(event);
  });

  return (
    <AsyncSection loading={loading} error={error} loadingMessage="Loading calendar...">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-serif font-bold tracking-tight">Calendar</h2>
            <p className="text-muted-foreground mt-1">View all classes and events for your co-op.</p>
          </div>
        </div>

        <CalendarHeader
          currentMonth={currentMonth}
          currentYear={currentYear}
          onMonthChange={setCurrentMonth}
          onYearChange={setCurrentYear}
          onToday={goToToday}
          onPrevMonth={goToPrevMonth}
          onNextMonth={goToNextMonth}
          testIdPrefix="admin-calendar"
        />

        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">{day}</div>
              ))}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="h-28" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const date = new Date(currentYear, currentMonth, i + 1);
                const dateKey = date.toDateString();
                const dayEvents = eventsMap.get(dateKey) || [];
                const isToday = date.toDateString() === today.toDateString();
                
                return (
                  <div 
                    key={i} 
                    className={`h-28 border border-border rounded-md p-1 ${isToday ? "bg-accent" : ""} ${dayEvents.length > 0 ? "cursor-pointer hover:bg-accent/50" : ""}`}
                    onClick={() => dayEvents.length > 0 && setSelectedDayEvents({ date, events: dayEvents })}
                    data-testid={`admin-calendar-day-${i + 1}`}
                  >
                    <p className={`text-sm ${isToday ? "font-bold text-primary" : "text-muted-foreground"}`}>
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
                          data-testid={`admin-calendar-event-${event.id}`}
                        >
                          {event.title}
                        </button>
                      ))}
                      {dayEvents.length > 2 && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedDayEvents({ date, events: dayEvents }); }}
                          className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
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

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-100 border border-blue-200" />
            Classes
          </span>
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-100 border border-green-200" />
            Events
          </span>
        </div>
      </div>

      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent?.type === "class_session" ? (
                <BookOpen className="w-5 h-5 text-blue-600" />
              ) : (
                <Calendar className="w-5 h-5 text-green-600" />
              )}
              {selectedEvent?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{selectedEvent && new Date(selectedEvent.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
            </div>
            {selectedEvent?.startTime && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{selectedEvent.startTime} - {selectedEvent.endTime}</span>
              </div>
            )}
            {selectedEvent?.location && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{selectedEvent.location}</span>
              </div>
            )}
            {selectedEvent?.instructor && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-4 h-4" />
                <span>{selectedEvent.instructor}</span>
              </div>
            )}
            {selectedEvent?.description && (
              <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
            )}
            <Badge variant={selectedEvent?.type === "class_session" ? "default" : "secondary"}>
              {selectedEvent?.type === "class_session" ? "Class" : "Event"}
            </Badge>
          </div>
        </DialogContent>
      </Dialog>

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
                className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{event.title}</span>
                  <Badge variant={event.type === "class_session" ? "default" : "secondary"} className="text-xs">
                    {event.type === "class_session" ? "Class" : "Event"}
                  </Badge>
                </div>
                {event.startTime && (
                  <p className="text-sm text-muted-foreground mt-1">{event.startTime} - {event.endTime}</p>
                )}
                {event.instructor && (
                  <p className="text-sm text-muted-foreground">{event.instructor}</p>
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </AsyncSection>
  );
}
