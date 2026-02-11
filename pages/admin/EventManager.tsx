import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Users, Calendar, MapPin, Eye, EyeOff, AlertCircle, DollarSign, Clock, Check, X } from "lucide-react";
import { EmptyState } from "@/components/common";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";

interface EventData {
  id: string;
  title: string;
  description?: string;
  date: string;
  location?: string;
  locationDetails?: string;
  price: number;
  capacity: number | null;
  isFree: boolean;
  status: string;
  _count: { registrations: number };
  proposedBy?: { id: string; firstName: string; lastName: string; email: string };
}

interface RsvpData {
  id: string;
  user?: { id: string; firstName: string; lastName: string; email: string };
  student?: { id: string; firstName: string; lastName: string };
  family?: { id: string; primaryEmail: string };
}

export default function EventManager() {
  const { toast } = useToast();
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventData | null>(null);
  const [newEvent, setNewEvent] = useState({ title: "", description: "", date: "", location: "", locationDetails: "", price: "", capacity: "", isFree: false });
  const [editEvent, setEditEvent] = useState({ title: "", description: "", date: "", location: "", locationDetails: "", price: "", capacity: "", isFree: false });
  const [saving, setSaving] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [rsvps, setRsvps] = useState<RsvpData[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchEvents = async () => {
    setError(null);
    const { data, error } = await apiFetch<{ events: EventData[] }>("/api/tenant/events");
    if (error) {
      setError(error);
    } else {
      setEvents(data?.events || []);
      setError(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.date) {
      toast({ title: "Error", description: "Title and date are required", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { error } = await apiFetch("/api/tenant/events", {
      method: "POST",
      body: JSON.stringify({
        title: newEvent.title,
        description: newEvent.description || null,
        date: newEvent.date,
        location: newEvent.location || null,
        locationDetails: newEvent.locationDetails || null,
        price: newEvent.isFree ? 0 : Math.round(parseFloat(newEvent.price) * 100) || 0,
        capacity: newEvent.capacity ? parseInt(newEvent.capacity) : null,
        isFree: newEvent.isFree,
      }),
    });

    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      setIsAddDialogOpen(false);
      setNewEvent({ title: "", description: "", date: "", location: "", locationDetails: "", price: "", capacity: "", isFree: false });
      fetchEvents();
      toast({ title: "Success", description: "Event created successfully" });
    }
    setSaving(false);
  };

  const toggleStatus = async (eventId: string, currentStatus: string) => {
    const newStatus = currentStatus === "Published" ? "Draft" : "Published";
    const { error } = await apiFetch(`/api/tenant/events/${eventId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus }),
    });

    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      fetchEvents();
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;

    const { error } = await apiFetch(`/api/tenant/events/${eventId}`, { method: "DELETE" });

    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      fetchEvents();
      toast({ title: "Success", description: "Event deleted" });
    }
  };

  const approveEvent = async (eventId: string) => {
    const { error } = await apiFetch(`/api/tenant/events/${eventId}/approve`, { method: "POST" });

    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      fetchEvents();
      toast({ title: "Success", description: "Event approved and published" });
    }
  };

  const rejectEvent = async (eventId: string) => {
    if (!confirm("Are you sure you want to reject this event proposal?")) return;

    const { error } = await apiFetch(`/api/tenant/events/${eventId}/reject`, { method: "POST" });

    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      fetchEvents();
      toast({ title: "Success", description: "Event rejected" });
    }
  };

  const pendingEvents = events.filter(e => e.status === "Pending Approval");
  const otherEvents = events.filter(e => e.status !== "Pending Approval");

  const openEditDialog = (event: EventData) => {
    setEditingEvent(event);
    setEditEvent({
      title: event.title,
      description: event.description || "",
      date: event.date.split("T")[0],
      location: event.location || "",
      locationDetails: event.locationDetails || "",
      price: ((event.price || 0) / 100).toString(),
      capacity: event.capacity?.toString() || "",
      isFree: event.isFree,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent) return;
    if (!editEvent.title || !editEvent.date) {
      toast({ title: "Error", description: "Title and date are required", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { error } = await apiFetch(`/api/tenant/events/${editingEvent.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: editEvent.title,
        description: editEvent.description || null,
        date: editEvent.date,
        location: editEvent.location || null,
        locationDetails: editEvent.locationDetails || null,
        price: editEvent.isFree ? 0 : Math.round(parseFloat(editEvent.price) * 100) || 0,
        capacity: editEvent.capacity ? parseInt(editEvent.capacity) : null,
        isFree: editEvent.isFree,
      }),
    });

    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      setIsEditDialogOpen(false);
      setEditingEvent(null);
      fetchEvents();
      toast({ title: "Success", description: "Event updated successfully" });
    }
    setSaving(false);
  };

  const openEventDetail = async (event: EventData) => {
    setSelectedEvent(event);
    setIsDetailOpen(true);
    setLoadingDetail(true);
    setRsvps([]);

    const { data } = await apiFetch<{ registrations: RsvpData[] }>(`/api/tenant/events/${event.id}/registrations`);
    if (data?.registrations) {
      setRsvps(data.registrations);
    }
    setLoadingDetail(false);
  };

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading events...</div>
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
            <h2 className="text-3xl font-serif font-bold tracking-tight">Event Manager</h2>
            <p className="text-muted-foreground mt-1">Organize and manage co-op events.</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-event">
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Event</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    placeholder="e.g., Fall Festival"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    data-testid="input-event-title"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="Event description..."
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    data-testid="input-event-description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date</label>
                    <Input
                      type="date"
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                      data-testid="input-event-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Address</label>
                    <Input
                      placeholder="1400 Sullivan Rd, Park City, UT 84060"
                      value={newEvent.location}
                      onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                      data-testid="input-event-location"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location Details</label>
                  <Input
                    placeholder="Near playground and volleyball nets"
                    value={newEvent.locationDetails}
                    onChange={(e) => setNewEvent({ ...newEvent, locationDetails: e.target.value })}
                    data-testid="input-event-location-details"
                  />
                  <p className="text-xs text-muted-foreground">Add directions or notes to help people find the exact spot</p>
                </div>
                <div className="flex items-center justify-between py-2">
                  <label className="text-sm font-medium">Free Event</label>
                  <Switch
                    checked={newEvent.isFree}
                    onCheckedChange={(checked) => setNewEvent({ ...newEvent, isFree: checked, price: checked ? "0" : newEvent.price })}
                    data-testid="switch-event-free"
                  />
                </div>
                {!newEvent.isFree && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Price ($)</label>
                    <Input
                      type="number"
                      placeholder="25"
                      value={newEvent.price}
                      onChange={(e) => setNewEvent({ ...newEvent, price: e.target.value })}
                      data-testid="input-event-price"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Capacity (leave empty for unlimited)</label>
                  <Input
                    type="number"
                    placeholder="100"
                    value={newEvent.capacity}
                    onChange={(e) => setNewEvent({ ...newEvent, capacity: e.target.value })}
                    data-testid="input-event-capacity"
                  />
                </div>
                <Button className="w-full" onClick={handleCreateEvent} disabled={saving} data-testid="button-save-event">
                  {saving ? "Creating..." : "Create Event"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Edit Event</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    placeholder="e.g., Fall Festival"
                    value={editEvent.title}
                    onChange={(e) => setEditEvent({ ...editEvent, title: e.target.value })}
                    data-testid="input-edit-event-title"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="Event description..."
                    value={editEvent.description}
                    onChange={(e) => setEditEvent({ ...editEvent, description: e.target.value })}
                    data-testid="input-edit-event-description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date</label>
                    <Input
                      type="date"
                      value={editEvent.date}
                      onChange={(e) => setEditEvent({ ...editEvent, date: e.target.value })}
                      data-testid="input-edit-event-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Address</label>
                    <Input
                      placeholder="1400 Sullivan Rd, Park City, UT 84060"
                      value={editEvent.location}
                      onChange={(e) => setEditEvent({ ...editEvent, location: e.target.value })}
                      data-testid="input-edit-event-location"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location Details</label>
                  <Input
                    placeholder="Near playground and volleyball nets"
                    value={editEvent.locationDetails}
                    onChange={(e) => setEditEvent({ ...editEvent, locationDetails: e.target.value })}
                    data-testid="input-edit-event-location-details"
                  />
                  <p className="text-xs text-muted-foreground">Add directions or notes to help people find the exact spot</p>
                </div>
                <div className="flex items-center justify-between py-2">
                  <label className="text-sm font-medium">Free Event</label>
                  <Switch
                    checked={editEvent.isFree}
                    onCheckedChange={(checked) => setEditEvent({ ...editEvent, isFree: checked, price: checked ? "0" : editEvent.price })}
                    data-testid="switch-edit-event-free"
                  />
                </div>
                {!editEvent.isFree && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Price ($)</label>
                    <Input
                      type="number"
                      placeholder="25"
                      value={editEvent.price}
                      onChange={(e) => setEditEvent({ ...editEvent, price: e.target.value })}
                      data-testid="input-edit-event-price"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Capacity (leave empty for unlimited)</label>
                  <Input
                    type="number"
                    placeholder="100"
                    value={editEvent.capacity}
                    onChange={(e) => setEditEvent({ ...editEvent, capacity: e.target.value })}
                    data-testid="input-edit-event-capacity"
                  />
                </div>
                <Button className="w-full" onClick={handleUpdateEvent} disabled={saving} data-testid="button-update-event">
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {pendingEvents.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-teal-600" />
              <h3 className="text-lg font-semibold text-teal-800">Pending Event Proposals ({pendingEvents.length})</h3>
            </div>
            <div className="grid gap-4">
              {pendingEvents.map((event) => (
                <Card 
                  key={event.id} 
                  className="border-teal-200 bg-teal-50 hover:shadow-md transition-shadow"
                  data-testid={`card-pending-event-${event.id}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold" data-testid={`text-pending-event-title-${event.id}`}>
                            {event.title}
                          </h3>
                          <Badge variant="secondary" className="bg-teal-100 text-teal-700">
                            Pending Approval
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(event.date), "MMM d, yyyy")}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {event.location}
                            </span>
                          )}
                          {event.proposedBy && (
                            <span className="text-teal-600">
                              Proposed by: {event.proposedBy.firstName} {event.proposedBy.lastName}
                            </span>
                          )}
                        </div>
                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{event.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-teal-600 hover:bg-teal-700"
                          onClick={() => approveEvent(event.id)}
                          data-testid={`button-approve-event-${event.id}`}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                          onClick={() => rejectEvent(event.id)}
                          data-testid={`button-reject-event-${event.id}`}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Separator className="my-6" />
          </div>
        )}

        {events.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No events yet"
            description="Create your first event to bring your community together"
            actionLabel="Create Your First Event"
            onAction={() => setIsAddDialogOpen(true)}
            accentColor="#9333ea"
            testId="button-create-first-event"
          />
        ) : otherEvents.length === 0 && pendingEvents.length > 0 ? (
          <p className="text-muted-foreground text-center py-8">No other events yet. Approve pending events above or create a new one.</p>
        ) : (
          <div className="grid gap-4">
            {otherEvents.map((event) => (
              <Card 
                key={event.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openEventDetail(event)}
                data-testid={`card-event-${event.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold" data-testid={`text-event-title-${event.id}`}>
                          {event.title}
                        </h3>
                        <Badge variant={event.status === "Published" ? "default" : "secondary"}>
                          {event.status}
                        </Badge>
                        {event.isFree && <Badge variant="outline" className="text-green-600">Free</Badge>}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(event.date), "MMM d, yyyy")}
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {event.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {event._count.registrations}{event.capacity ? `/${event.capacity}` : ""} registered
                        </span>
                        {!event.isFree && <span>${event.price}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleStatus(event.id, event.status)}
                        data-testid={`button-toggle-event-${event.id}`}
                      >
                        {event.status === "Published" ? (
                          <><EyeOff className="h-4 w-4 mr-1" /> Unpublish</>
                        ) : (
                          <><Eye className="h-4 w-4 mr-1" /> Publish</>
                        )}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(event)} data-testid={`button-edit-event-${event.id}`}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-red-500" 
                        onClick={() => deleteEvent(event.id)}
                        data-testid={`button-delete-event-${event.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedEvent && (
            <div className="space-y-6">
              <SheetHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <SheetTitle className="text-xl font-serif">{selectedEvent.title}</SheetTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={selectedEvent.status === "Published" ? "default" : "secondary"}>
                        {selectedEvent.status}
                      </Badge>
                      {selectedEvent.isFree && <Badge variant="outline" className="text-green-600">Free</Badge>}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => {
                    setIsDetailOpen(false);
                    openEditDialog(selectedEvent);
                  }} data-testid="button-edit-event-detail">
                    <Edit className="w-4 h-4 mr-1" /> Edit
                  </Button>
                </div>
              </SheetHeader>

              <Separator />

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Users className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                  <div className="text-2xl font-bold text-stone-800">
                    {selectedEvent._count.registrations}{selectedEvent.capacity ? `/${selectedEvent.capacity}` : ""}
                  </div>
                  <div className="text-xs text-muted-foreground">Registered</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Calendar className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                  <div className="text-lg font-bold text-stone-800">{format(new Date(selectedEvent.date), "MMM d")}</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(selectedEvent.date), "yyyy")}</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <DollarSign className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                  <div className="text-2xl font-bold text-stone-800">{selectedEvent.isFree ? "Free" : `$${selectedEvent.price}`}</div>
                  <div className="text-xs text-muted-foreground">Price</div>
                </div>
              </div>

              {selectedEvent.location && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium text-stone-800">Location</h4>
                    <p className="text-sm text-muted-foreground">{selectedEvent.location}</p>
                  </div>
                </div>
              )}

              {selectedEvent.description && (
                <div>
                  <h4 className="font-medium text-stone-800 mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
                </div>
              )}

              <Separator />

              {loadingDetail ? (
                <div className="text-center py-4 text-muted-foreground">Loading registrations...</div>
              ) : (
                <div>
                  <h4 className="font-medium text-stone-800 mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Registered ({rsvps.length})
                  </h4>
                  {rsvps.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No registrations yet</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {rsvps.map((rsvp) => (
                        <div key={rsvp.id} className="p-3 bg-stone-50 rounded-lg text-sm">
                          {rsvp.user ? (
                            <div>
                              <div className="font-medium">{rsvp.user.firstName} {rsvp.user.lastName}</div>
                              <div className="text-muted-foreground text-xs">{rsvp.user.email}</div>
                            </div>
                          ) : rsvp.student ? (
                            <div>
                              <div className="font-medium">{rsvp.student.firstName} {rsvp.student.lastName}</div>
                              <div className="text-muted-foreground text-xs">{rsvp.family?.primaryEmail || "Student"}</div>
                            </div>
                          ) : (
                            <div className="text-muted-foreground">Unknown registrant</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => toggleStatus(selectedEvent.id, selectedEvent.status)}
                  data-testid="button-toggle-status-event-detail"
                >
                  {selectedEvent.status === "Published" ? (
                    <><EyeOff className="h-4 w-4 mr-2" /> Unpublish</>
                  ) : (
                    <><Eye className="h-4 w-4 mr-2" /> Publish</>
                  )}
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => {
                    deleteEvent(selectedEvent.id);
                    setIsDetailOpen(false);
                  }}
                  data-testid="button-delete-event-detail"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
