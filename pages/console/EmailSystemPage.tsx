import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Plus, Send, Edit2, Eye, RefreshCw, AlertCircle, X, Trash2, CheckCircle, Mail } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface EmailLog {
  id: string;
  recipientEmail: string;
  subject: string;
  templateKey?: string;
  status: string;
  sentAt?: string;
  createdAt: string;
  metadata?: { htmlContent?: string };
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
  createdAt: string;
}

interface EmailAutomation {
  id: string;
  name: string;
  trigger: string;
  status: string;
  steps: any[];
}

interface Tenant {
  id: string;
  name: string;
}

export default function EmailSystemPage() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [automations, setAutomations] = useState<EmailAutomation[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editedTemplate, setEditedTemplate] = useState({ name: "", subject: "", htmlContent: "", textContent: "" });
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ key: "", name: "", subject: "", htmlContent: "", textContent: "" });
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLog, setPreviewLog] = useState<EmailLog | null>(null);
  
  const [targetedMessage, setTargetedMessage] = useState({ tenantId: "all", segment: "admins", subject: "", body: "" });
  
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const sendTestEmail = async () => {
    if (!testEmail) {
      toast({ title: "Error", description: "Please enter an email address", variant: "destructive" });
      return;
    }
    setTestSending(true);
    setTestResult(null);
    const { data, error } = await apiFetch<{ success: boolean; message: string }>("/api/email/test", {
      method: "POST",
      body: JSON.stringify({ recipientEmail: testEmail }),
    });
    if (error) {
      setTestResult({ success: false, message: error });
      toast({ title: "Error", description: error, variant: "destructive" });
    } else if (data) {
      setTestResult({ success: true, message: data.message || "Test email sent!" });
      toast({ title: "Success", description: "Test email sent successfully" });
    }
    setTestSending(false);
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    const [logsRes, templatesRes, automationsRes, tenantsRes] = await Promise.all([
      apiFetch<{ logs: EmailLog[] }>("/api/email/logs"),
      apiFetch<{ templates: EmailTemplate[] }>("/api/email/templates"),
      apiFetch<{ automations: EmailAutomation[] }>("/api/email/automations"),
      apiFetch<{ tenants: Tenant[] }>("/api/tenants"),
    ]);
    
    if (logsRes.error || templatesRes.error) {
      setError(logsRes.error || templatesRes.error || "Failed to load data");
    } else {
      setLogs(logsRes.data?.logs || []);
      setTemplates(templatesRes.data?.templates || []);
      setAutomations(automationsRes.data?.automations || []);
      setTenants(tenantsRes.data?.tenants || []);
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
        textContent: selectedTemplate.textContent || "",
      });
    }
  }, [selectedTemplate]);

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

  const createTemplate = async () => {
    if (!newTemplate.key || !newTemplate.name || !newTemplate.subject || !newTemplate.htmlContent) {
      toast({ title: "Error", description: "All fields are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await apiFetch("/api/email/templates", {
      method: "POST",
      body: JSON.stringify(newTemplate),
    });
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Template created" });
      setIsCreateTemplateOpen(false);
      setNewTemplate({ key: "", name: "", subject: "", htmlContent: "", textContent: "" });
      fetchData();
    }
    setSaving(false);
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    const { error } = await apiFetch(`/api/email/templates/${id}`, { method: "DELETE" });
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Template deleted" });
      setSelectedTemplate(null);
      fetchData();
    }
  };

  const sendTargetedMessage = async () => {
    if (!targetedMessage.subject || !targetedMessage.body) {
      toast({ title: "Error", description: "Subject and body are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await apiFetch("/api/email/send", {
      method: "POST",
      body: JSON.stringify({
        recipientEmail: `${targetedMessage.segment}@${targetedMessage.tenantId === "all" ? "all-tenants" : targetedMessage.tenantId}.bramble`,
        subject: targetedMessage.subject,
        htmlContent: targetedMessage.body,
      }),
    });
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Message logged (simulated send)" });
      setTargetedMessage({ tenantId: "all", segment: "admins", subject: "", body: "" });
      fetchData();
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading email system...</div>
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

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-serif font-bold tracking-tight text-foreground">Email System</h2>
          <p className="text-muted-foreground mt-2">Manage templates, logs, and targeted messaging.</p>
        </div>
      </div>

      <Tabs defaultValue="test" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="test">Test</TabsTrigger>
          <TabsTrigger value="logs">Email Logs</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="automations">Automations</TabsTrigger>
          <TabsTrigger value="targeted">Targeted Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="test">
          <div className="max-w-xl mx-auto">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-[#7C9082]/10 flex items-center justify-center">
                    <Mail className="h-6 w-6 text-[#7C9082]" />
                  </div>
                  <div>
                    <CardTitle>Test Email Configuration</CardTitle>
                    <CardDescription>Verify your SMTP settings are working correctly</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="test-email">Send Test Email To</Label>
                  <Input
                    id="test-email"
                    type="email"
                    placeholder="your@email.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    data-testid="input-test-email"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter your email address to receive a test message
                  </p>
                </div>

                {testResult && (
                  <div className={`p-4 rounded-lg flex items-center gap-3 ${
                    testResult.success 
                      ? "bg-green-50 border border-green-200" 
                      : "bg-red-50 border border-red-200"
                  }`}>
                    {testResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    )}
                    <p className={testResult.success ? "text-green-800" : "text-red-800"}>
                      {testResult.message}
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={sendTestEmail} 
                  disabled={testSending || !testEmail}
                  className="w-full"
                  data-testid="button-send-test-email"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {testSending ? "Sending..." : "Send Test Email"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Logs</CardTitle>
              <CardDescription>Recent outbound email activity across all tenants.</CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No emails sent yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sent At</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id} data-testid={`row-email-log-${log.id}`}>
                        <TableCell className="text-sm">
                          {format(new Date(log.sentAt || log.createdAt), "MMM d, HH:mm")}
                        </TableCell>
                        <TableCell className="font-medium text-sm">{log.recipientEmail}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{log.subject}</TableCell>
                        <TableCell>
                          {log.templateKey ? (
                            <span className="text-xs font-mono bg-muted px-2 py-1 rounded">{log.templateKey}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            log.status === "SENT" ? "default" :
                            log.status === "DELIVERED" ? "outline" :
                            log.status === "BOUNCED" ? "destructive" : "secondary"
                          }>
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => { setPreviewLog(log); setPreviewOpen(true); }}
                            data-testid={`button-view-log-${log.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-4">
              {templates.map(tmpl => (
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
                  <CardFooter className="p-4 pt-0 text-xs text-muted-foreground flex justify-between">
                    <span>Updated: {format(new Date(tmpl.createdAt), "MMM d, yyyy")}</span>
                    <Edit2 className="h-3 w-3" />
                  </CardFooter>
                </Card>
              ))}
              <Dialog open={isCreateTemplateOpen} onOpenChange={setIsCreateTemplateOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full border-dashed" data-testid="button-create-template">
                    <Plus className="h-4 w-4 mr-2" /> Create New Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Create Email Template</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Template Key</Label>
                        <Input
                          placeholder="e.g., welcome_email"
                          value={newTemplate.key}
                          onChange={(e) => setNewTemplate({ ...newTemplate, key: e.target.value })}
                          data-testid="input-template-key"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Template Name</Label>
                        <Input
                          placeholder="e.g., Welcome Email"
                          value={newTemplate.name}
                          onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                          data-testid="input-template-name"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Subject Line</Label>
                      <Input
                        placeholder="Welcome to {coop_name}"
                        value={newTemplate.subject}
                        onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                        data-testid="input-template-subject"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>HTML Content</Label>
                      <Textarea
                        className="min-h-[200px] font-mono text-sm"
                        placeholder="<html><body>...</body></html>"
                        value={newTemplate.htmlContent}
                        onChange={(e) => setNewTemplate({ ...newTemplate, htmlContent: e.target.value })}
                        data-testid="input-template-html"
                      />
                    </div>
                    <Button onClick={createTemplate} disabled={saving} className="w-full" data-testid="button-save-new-template">
                      {saving ? "Creating..." : "Create Template"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="md:col-span-2">
              {selectedTemplate ? (
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Edit Template: {selectedTemplate.name}</CardTitle>
                        <CardDescription>{selectedTemplate.isGlobal ? "Global Bramble template" : "Tenant-specific template"}</CardDescription>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteTemplate(selectedTemplate.id)} data-testid="button-delete-template">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Template Name</Label>
                      <Input 
                        value={editedTemplate.name} 
                        onChange={(e) => setEditedTemplate({ ...editedTemplate, name: e.target.value })}
                        data-testid="input-edit-template-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Subject Line</Label>
                      <Input 
                        value={editedTemplate.subject} 
                        onChange={(e) => setEditedTemplate({ ...editedTemplate, subject: e.target.value })}
                        data-testid="input-edit-template-subject"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>HTML Content</Label>
                      <Textarea 
                        className="min-h-[300px] font-mono text-sm" 
                        value={editedTemplate.htmlContent}
                        onChange={(e) => setEditedTemplate({ ...editedTemplate, htmlContent: e.target.value })}
                        data-testid="input-edit-template-html"
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="justify-end gap-2">
                    <Button variant="ghost" onClick={() => setPreviewOpen(true)} data-testid="button-preview-template">Preview</Button>
                    <Button onClick={saveTemplate} disabled={saving} data-testid="button-save-template">
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </CardFooter>
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
        </TabsContent>

        <TabsContent value="automations">
          <Card>
            <CardHeader>
              <CardTitle>Email Automations</CardTitle>
              <CardDescription>Configure automated email sequences based on system events.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {automations.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No automations configured yet</p>
                ) : (
                  automations.map((flow) => (
                    <div key={flow.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`row-automation-${flow.id}`}>
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <RefreshCw className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{flow.name}</p>
                          <p className="text-sm text-muted-foreground">Trigger: {flow.trigger}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={flow.status === "Active" ? "default" : "secondary"}>
                          {flow.status}
                        </Badge>
                        <Button variant="ghost" size="sm" data-testid={`button-edit-automation-${flow.id}`}>Edit Flow</Button>
                      </div>
                    </div>
                  ))
                )}
                
                <Button className="w-full border-dashed" variant="outline" data-testid="button-create-automation">
                  <Plus className="mr-2 h-4 w-4" /> Create New Automation
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="targeted">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Send Targeted Message</CardTitle>
                <CardDescription>Send a one-off system notification to a specific tenant or audience segment.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Recipient Tenant</Label>
                  <Select 
                    value={targetedMessage.tenantId} 
                    onValueChange={(v) => setTargetedMessage({ ...targetedMessage, tenantId: v })}
                  >
                    <SelectTrigger data-testid="select-target-tenant">
                      <SelectValue placeholder="Select a tenant..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tenants (Broadcast)</SelectItem>
                      {tenants.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Audience Segment</Label>
                  <Select 
                    value={targetedMessage.segment} 
                    onValueChange={(v) => setTargetedMessage({ ...targetedMessage, segment: v })}
                  >
                    <SelectTrigger data-testid="select-target-segment">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admins">Co-op Admins Only</SelectItem>
                      <SelectItem value="instructors">Instructors Only</SelectItem>
                      <SelectItem value="everyone">All Active Users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Message Subject</Label>
                  <Input 
                    placeholder="Important update regarding platform fees..." 
                    value={targetedMessage.subject}
                    onChange={(e) => setTargetedMessage({ ...targetedMessage, subject: e.target.value })}
                    data-testid="input-targeted-subject"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Message Body</Label>
                  <Textarea 
                    placeholder="Type your message here..." 
                    className="min-h-[150px]" 
                    value={targetedMessage.body}
                    onChange={(e) => setTargetedMessage({ ...targetedMessage, body: e.target.value })}
                    data-testid="input-targeted-body"
                  />
                  <p className="text-xs text-muted-foreground">Markdown is supported.</p>
                </div>
              </CardContent>
              <CardFooter className="justify-end">
                <Button 
                  className="w-full sm:w-auto" 
                  onClick={sendTargetedMessage} 
                  disabled={saving}
                  data-testid="button-send-targeted"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {saving ? "Sending..." : "Send Message"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {previewLog ? `Email: ${previewLog.subject}` : `Preview: ${editedTemplate.subject || selectedTemplate?.subject}`}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {previewLog ? (
              <div className="space-y-4">
                <div className="text-sm space-y-1">
                  <p><strong>To:</strong> {previewLog.recipientEmail}</p>
                  <p><strong>Status:</strong> {previewLog.status}</p>
                  <p><strong>Sent:</strong> {format(new Date(previewLog.sentAt || previewLog.createdAt), "PPpp")}</p>
                </div>
                <div className="border rounded-lg p-4 bg-white">
                  <div dangerouslySetInnerHTML={{ __html: previewLog.metadata?.htmlContent || "<p>No content</p>" }} />
                </div>
              </div>
            ) : (
              <div className="border rounded-lg p-4 bg-white">
                <div dangerouslySetInnerHTML={{ __html: editedTemplate.htmlContent || selectedTemplate?.htmlContent || "<p>No content</p>" }} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
