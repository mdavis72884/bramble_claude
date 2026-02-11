import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Send, Edit, Trash2, Bell, Mail, Zap, Users, Archive, AlertCircle, FileText, Eye } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";

interface AnnouncementData {
  id: string;
  title: string;
  content: string;
  priority: string;
  isActive: boolean;
  createdAt: string;
}

interface NewsletterData {
  id: string;
  subject: string;
  content: string;
  status: string;
  sentAt?: string;
}

interface AutomationData {
  id: string;
  name: string;
  trigger: string;
  status: string;
}

interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  isGlobal: boolean;
  tenantId?: string;
}

export default function CommunicationsHub() {
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
  const [newsletters, setNewsletters] = useState<NewsletterData[]>([]);
  const [automations, setAutomations] = useState<AutomationData[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAnnouncementDialogOpen, setIsAnnouncementDialogOpen] = useState(false);
  const [isNewsletterDialogOpen, setIsNewsletterDialogOpen] = useState(false);
  const [isAutomationDialogOpen, setIsAutomationDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newAutomation, setNewAutomation] = useState({ name: "", trigger: "", action: "", template: "" });

  const [newAnnouncement, setNewAnnouncement] = useState({ title: "", content: "", priority: "Normal" });
  const [newNewsletter, setNewNewsletter] = useState({ subject: "", content: "", layout: "simple" });
  const [targetedMessage, setTargetedMessage] = useState({ subject: "", body: "", segment: "" });
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editedTemplate, setEditedTemplate] = useState({ name: "", subject: "", htmlContent: "" });
  const [templatePreviewOpen, setTemplatePreviewOpen] = useState(false);

  const fetchData = async () => {
    setError(null);
    const [announcementsRes, newslettersRes, automationsRes, templatesRes] = await Promise.all([
      apiFetch<{ announcements: AnnouncementData[] }>("/api/tenant/announcements"),
      apiFetch<{ newsletters: NewsletterData[] }>("/api/tenant/newsletters"),
      apiFetch<{ automations: AutomationData[] }>("/api/tenant/automations"),
      apiFetch<{ templates: EmailTemplate[] }>("/api/email/templates"),
    ]);

    if (announcementsRes.error || newslettersRes.error || automationsRes.error) {
      setError(announcementsRes.error || newslettersRes.error || automationsRes.error);
    } else {
      setAnnouncements(announcementsRes.data?.announcements || []);
      setNewsletters(newslettersRes.data?.newsletters || []);
      setAutomations(automationsRes.data?.automations || []);
      setTemplates(templatesRes.data?.templates || []);
      setError(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      setEditedTemplate({
        name: selectedTemplate.name,
        subject: selectedTemplate.subject,
        htmlContent: selectedTemplate.htmlContent,
      });
    }
  }, [selectedTemplate]);

  const createAnnouncement = async () => {
    if (!newAnnouncement.title || !newAnnouncement.content) {
      toast({ title: "Error", description: "Title and content are required", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { error } = await apiFetch("/api/tenant/announcements", {
      method: "POST",
      body: JSON.stringify(newAnnouncement),
    });

    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      setIsAnnouncementDialogOpen(false);
      setNewAnnouncement({ title: "", content: "", priority: "Normal" });
      fetchData();
      toast({ title: "Success", description: "Announcement created" });
    }
    setSaving(false);
  };

  const createNewsletter = async () => {
    if (!newNewsletter.subject || !newNewsletter.content) {
      toast({ title: "Error", description: "Subject and content are required", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { error } = await apiFetch("/api/tenant/newsletters", {
      method: "POST",
      body: JSON.stringify(newNewsletter),
    });

    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      setIsNewsletterDialogOpen(false);
      setNewNewsletter({ subject: "", content: "", layout: "simple" });
      fetchData();
      toast({ title: "Success", description: "Newsletter saved as draft" });
    }
    setSaving(false);
  };

  const toggleAutomation = async (automationId: string) => {
    const { error } = await apiFetch(`/api/tenant/automations/${automationId}/toggle`, { method: "PATCH" });

    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      fetchData();
    }
  };

  const sendTargetedMessage = async () => {
    if (!targetedMessage.segment || !targetedMessage.subject || !targetedMessage.body) {
      toast({ title: "Error", description: "All fields are required", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { error } = await apiFetch("/api/tenant/targeted-messages", {
      method: "POST",
      body: JSON.stringify(targetedMessage),
    });

    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      setTargetedMessage({ subject: "", body: "", segment: "" });
      toast({ title: "Success", description: "Message sent" });
    }
    setSaving(false);
  };

  const saveTemplate = async () => {
    if (!selectedTemplate) return;
    setSaving(true);
    const { error } = await apiFetch(`/api/email/templates/${selectedTemplate.id}`, {
      method: "PATCH",
      body: JSON.stringify(editedTemplate),
    });
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Template saved" });
      fetchData();
    }
    setSaving(false);
  };

  const createAutomation = async () => {
    if (!newAutomation.name || !newAutomation.trigger || !newAutomation.action) {
      toast({ title: "Error", description: "Name, trigger, and action are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await apiFetch("/api/tenant/automations", {
      method: "POST",
      body: JSON.stringify({
        name: newAutomation.name,
        trigger: newAutomation.trigger,
        isActive: true,
        steps: [{ action: newAutomation.action, template: newAutomation.template }],
      }),
    });
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      setIsAutomationDialogOpen(false);
      setNewAutomation({ name: "", trigger: "", action: "", template: "" });
      fetchData();
      toast({ title: "Success", description: "Automation created" });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading communications...</div>
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
        <div>
          <h2 className="text-3xl font-serif font-bold tracking-tight">Communications Hub</h2>
          <p className="text-muted-foreground mt-1">Manage announcements, newsletters, and messaging.</p>
        </div>

        <Tabs defaultValue="announcements" className="space-y-4">
          <TabsList>
            <TabsTrigger value="announcements" className="flex items-center gap-2">
              <Bell className="h-4 w-4" /> Announcements
            </TabsTrigger>
            <TabsTrigger value="newsletters" className="flex items-center gap-2">
              <Mail className="h-4 w-4" /> Newsletters
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Templates
            </TabsTrigger>
            <TabsTrigger value="automations" className="flex items-center gap-2">
              <Zap className="h-4 w-4" /> Automations
            </TabsTrigger>
            <TabsTrigger value="targeted" className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Targeted Messages
            </TabsTrigger>
          </TabsList>

          <TabsContent value="announcements" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isAnnouncementDialogOpen} onOpenChange={setIsAnnouncementDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-announcement">
                    <Plus className="h-4 w-4 mr-2" />
                    New Announcement
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Create Announcement</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Title</label>
                      <Input
                        placeholder="Announcement title"
                        value={newAnnouncement.title}
                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                        data-testid="input-announcement-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Content</label>
                      <Textarea
                        placeholder="Write your announcement..."
                        value={newAnnouncement.content}
                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                        rows={4}
                        data-testid="input-announcement-content"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Priority</label>
                      <Select value={newAnnouncement.priority} onValueChange={(value) => setNewAnnouncement({ ...newAnnouncement, priority: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Normal">Normal</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full" onClick={createAnnouncement} disabled={saving} data-testid="button-save-announcement">
                      {saving ? "Saving..." : "Post Announcement"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {announcements.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">No announcements yet</Card>
            ) : (
              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <Card key={announcement.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold" data-testid={`text-announcement-title-${announcement.id}`}>
                              {announcement.title}
                            </h3>
                            <Badge variant={announcement.priority === "High" ? "destructive" : "secondary"}>{announcement.priority}</Badge>
                            {announcement.isActive && <Badge variant="default">Active</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">{announcement.content}</p>
                          <p className="text-xs text-muted-foreground mt-2">Posted {format(new Date(announcement.createdAt), "MMM d, yyyy")}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="newsletters" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isNewsletterDialogOpen} onOpenChange={setIsNewsletterDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-newsletter">
                    <Plus className="h-4 w-4 mr-2" />
                    New Newsletter
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[700px]">
                  <DialogHeader>
                    <DialogTitle>Create Newsletter</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Layout Style</label>
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          type="button"
                          className={`p-3 border rounded-lg text-center transition-all ${newNewsletter.layout === "simple" ? "border-primary bg-primary/5 ring-2 ring-primary" : "hover:border-primary/50"}`}
                          onClick={() => setNewNewsletter({ ...newNewsletter, layout: "simple" })}
                          data-testid="button-layout-simple"
                        >
                          <div className="h-12 bg-muted rounded mb-2 flex items-center justify-center">
                            <div className="w-3/4 space-y-1">
                              <div className="h-1.5 bg-foreground/30 rounded" />
                              <div className="h-1.5 bg-foreground/20 rounded w-2/3" />
                            </div>
                          </div>
                          <span className="text-xs font-medium">Simple Text</span>
                        </button>
                        <button
                          type="button"
                          className={`p-3 border rounded-lg text-center transition-all ${newNewsletter.layout === "header" ? "border-primary bg-primary/5 ring-2 ring-primary" : "hover:border-primary/50"}`}
                          onClick={() => setNewNewsletter({ ...newNewsletter, layout: "header" })}
                          data-testid="button-layout-header"
                        >
                          <div className="h-12 bg-muted rounded mb-2">
                            <div className="h-4 bg-primary/30 rounded-t" />
                            <div className="p-1 space-y-0.5">
                              <div className="h-1 bg-foreground/20 rounded" />
                              <div className="h-1 bg-foreground/10 rounded w-2/3" />
                            </div>
                          </div>
                          <span className="text-xs font-medium">With Header</span>
                        </button>
                        <button
                          type="button"
                          className={`p-3 border rounded-lg text-center transition-all ${newNewsletter.layout === "featured" ? "border-primary bg-primary/5 ring-2 ring-primary" : "hover:border-primary/50"}`}
                          onClick={() => setNewNewsletter({ ...newNewsletter, layout: "featured" })}
                          data-testid="button-layout-featured"
                        >
                          <div className="h-12 bg-muted rounded mb-2 flex gap-1 p-1">
                            <div className="w-1/2 bg-primary/20 rounded" />
                            <div className="w-1/2 space-y-0.5 py-0.5">
                              <div className="h-1 bg-foreground/20 rounded" />
                              <div className="h-1 bg-foreground/10 rounded" />
                              <div className="h-1 bg-foreground/10 rounded w-2/3" />
                            </div>
                          </div>
                          <span className="text-xs font-medium">Featured Image</span>
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Subject</label>
                      <Input
                        placeholder="Newsletter subject"
                        value={newNewsletter.subject}
                        onChange={(e) => setNewNewsletter({ ...newNewsletter, subject: e.target.value })}
                        data-testid="input-newsletter-subject"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Content</label>
                      <Textarea
                        placeholder="Write your newsletter..."
                        value={newNewsletter.content}
                        onChange={(e) => setNewNewsletter({ ...newNewsletter, content: e.target.value })}
                        rows={8}
                        data-testid="input-newsletter-content"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={createNewsletter} disabled={saving}>
                        Save Draft
                      </Button>
                      <Button className="flex-1" onClick={createNewsletter} disabled={saving} data-testid="button-send-newsletter">
                        <Send className="h-4 w-4 mr-2" />
                        {saving ? "Saving..." : "Send Now"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {newsletters.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">No newsletters yet</Card>
            ) : (
              <div className="space-y-4">
                {newsletters.map((newsletter) => (
                  <Card key={newsletter.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold" data-testid={`text-newsletter-subject-${newsletter.id}`}>
                              {newsletter.subject}
                            </h3>
                            <Badge variant={newsletter.status === "SENT" ? "default" : newsletter.status === "DRAFT" ? "secondary" : "outline"}>
                              {newsletter.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {newsletter.sentAt ? `Sent ${format(new Date(newsletter.sentAt), "MMM d, yyyy")}` : "Not sent yet"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {newsletter.status === "DRAFT" && (
                            <Button size="sm">
                              <Send className="h-4 w-4 mr-1" /> Send
                            </Button>
                          )}
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          {newsletter.status !== "ARCHIVED" && (
                            <Button variant="ghost" size="icon">
                              <Archive className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 space-y-4">
                {templates.length === 0 ? (
                  <Card className="p-8 text-center text-muted-foreground">No templates available</Card>
                ) : (
                  templates.map(tmpl => (
                    <Card 
                      key={tmpl.id} 
                      className={`cursor-pointer transition-colors ${selectedTemplate?.id === tmpl.id ? "border-primary" : "hover:border-primary/50"}`}
                      onClick={() => setSelectedTemplate(tmpl)}
                      data-testid={`card-template-${tmpl.id}`}
                    >
                      <CardHeader className="p-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-medium">{tmpl.name}</CardTitle>
                          {tmpl.isGlobal && <Badge variant="secondary" className="text-xs">Global</Badge>}
                        </div>
                        <CardDescription className="text-xs font-mono mt-1">{tmpl.key}</CardDescription>
                      </CardHeader>
                    </Card>
                  ))
                )}
              </div>
              
              <div className="md:col-span-2">
                {selectedTemplate ? (
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle>Edit: {selectedTemplate.name}</CardTitle>
                      <CardDescription>
                        {selectedTemplate.isGlobal ? "This is a global template. Your edits create a local copy." : "Local template for your co-op."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Subject Line</label>
                        <Input 
                          value={editedTemplate.subject} 
                          onChange={(e) => setEditedTemplate({ ...editedTemplate, subject: e.target.value })}
                          data-testid="input-edit-template-subject"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">HTML Content</label>
                        <Textarea 
                          className="min-h-[250px] font-mono text-sm" 
                          value={editedTemplate.htmlContent}
                          onChange={(e) => setEditedTemplate({ ...editedTemplate, htmlContent: e.target.value })}
                          data-testid="input-edit-template-html"
                        />
                      </div>
                    </CardContent>
                    <div className="p-6 pt-0 flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setTemplatePreviewOpen(true)}>
                        <Eye className="h-4 w-4 mr-2" /> Preview
                      </Button>
                      <Button onClick={saveTemplate} disabled={saving} data-testid="button-save-template">
                        {saving ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <Card className="h-full flex items-center justify-center">
                    <CardContent className="text-center py-12">
                      <p className="text-muted-foreground">Select a template to edit</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            <Dialog open={templatePreviewOpen} onOpenChange={setTemplatePreviewOpen}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Preview: {editedTemplate.subject || selectedTemplate?.subject}</DialogTitle>
                </DialogHeader>
                <div className="border rounded-lg p-4 bg-white mt-4">
                  <div dangerouslySetInnerHTML={{ __html: editedTemplate.htmlContent || "<p>No content</p>" }} />
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="automations" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isAutomationDialogOpen} onOpenChange={setIsAutomationDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-automation">
                    <Plus className="h-4 w-4 mr-2" />
                    New Automation
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[550px]">
                  <DialogHeader>
                    <DialogTitle>Create Automation</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Automation Name</label>
                      <Input
                        placeholder="e.g., Welcome new families"
                        value={newAutomation.name}
                        onChange={(e) => setNewAutomation({ ...newAutomation, name: e.target.value })}
                        data-testid="input-automation-name"
                      />
                    </div>
                    
                    <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-primary">When</span>
                        <Select value={newAutomation.trigger} onValueChange={(v) => setNewAutomation({ ...newAutomation, trigger: v })}>
                          <SelectTrigger className="flex-1" data-testid="select-automation-trigger">
                            <SelectValue placeholder="Select trigger..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="family_approved">A family is approved</SelectItem>
                            <SelectItem value="instructor_approved">An instructor is approved</SelectItem>
                            <SelectItem value="class_registration">Someone registers for a class</SelectItem>
                            <SelectItem value="payment_received">A payment is received</SelectItem>
                            <SelectItem value="class_reminder">Class starts in 24 hours</SelectItem>
                            <SelectItem value="class_cancelled">A class is cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-primary">Then</span>
                        <Select value={newAutomation.action} onValueChange={(v) => setNewAutomation({ ...newAutomation, action: v })}>
                          <SelectTrigger className="flex-1" data-testid="select-automation-action">
                            <SelectValue placeholder="Select action..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="send_email">Send an email</SelectItem>
                            <SelectItem value="send_notification">Send in-app notification</SelectItem>
                            <SelectItem value="add_to_calendar">Add to calendar</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {newAutomation.action === "send_email" && (
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-muted-foreground">Using</span>
                          <Select value={newAutomation.template} onValueChange={(v) => setNewAutomation({ ...newAutomation, template: v })}>
                            <SelectTrigger className="flex-1" data-testid="select-automation-template">
                              <SelectValue placeholder="Select template..." />
                            </SelectTrigger>
                            <SelectContent>
                              {templates.map((t) => (
                                <SelectItem key={t.id} value={t.key}>{t.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    <Button className="w-full" onClick={createAutomation} disabled={saving} data-testid="button-save-automation">
                      {saving ? "Creating..." : "Create Automation"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Active Automations</CardTitle>
                <CardDescription>Toggle automations on or off to control when they run.</CardDescription>
              </CardHeader>
              <CardContent>
                {automations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No automations configured. Create your first one above!</p>
                ) : (
                  <div className="space-y-4">
                    {automations.map((automation) => (
                      <div key={automation.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <p className="font-medium" data-testid={`text-automation-name-${automation.id}`}>
                            {automation.name}
                          </p>
                          <p className="text-sm text-muted-foreground">When: {automation.trigger.replace(/_/g, " ")}</p>
                        </div>
                        <Switch checked={automation.status === "Active"} onCheckedChange={() => toggleAutomation(automation.id)} data-testid={`switch-automation-${automation.id}`} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="targeted" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Send Targeted Message</CardTitle>
                <CardDescription>Send a message to a specific group of members.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Audience Segment</label>
                  <Select value={targetedMessage.segment} onValueChange={(value) => setTargetedMessage({ ...targetedMessage, segment: value })}>
                    <SelectTrigger data-testid="select-targeted-segment">
                      <SelectValue placeholder="Select audience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_families">All Families</SelectItem>
                      <SelectItem value="all_instructors">All Instructors</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject</label>
                  <Input
                    placeholder="Message subject"
                    value={targetedMessage.subject}
                    onChange={(e) => setTargetedMessage({ ...targetedMessage, subject: e.target.value })}
                    data-testid="input-targeted-subject"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Message</label>
                  <Textarea
                    placeholder="Write your message..."
                    value={targetedMessage.body}
                    onChange={(e) => setTargetedMessage({ ...targetedMessage, body: e.target.value })}
                    rows={4}
                    data-testid="input-targeted-body"
                  />
                </div>
                <Button className="w-full" onClick={sendTargetedMessage} disabled={saving} data-testid="button-send-targeted">
                  <Send className="h-4 w-4 mr-2" />
                  {saving ? "Sending..." : "Send Message"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
