import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/common";
import { Plus, Edit, Trash2, Globe, Mail, Phone, Users, Search, RefreshCw, ExternalLink, Building2 } from "lucide-react";

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

const DEFAULT_CATEGORIES = [
  "Instructor",
  "Tutoring",
  "Music & Arts",
  "Sports & Fitness",
  "STEM",
  "Language Learning",
  "Special Needs Support",
  "Testing Services",
  "Enrichment Programs",
  "Field Trips",
  "Other",
];

export default function ProviderManager() {
  const { toast } = useToast();
  const [providers, setProviders] = useState<ProviderData[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ProviderData | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    website: "",
    description: "",
    category: "",
    contactEmail: "",
    contactPhone: "",
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    variant?: "destructive" | "default";
    onConfirm: () => Promise<void>;
  }>({ open: false, title: "", description: "", confirmLabel: "", onConfirm: async () => {} });

  const fetchProviders = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch("/api/tenant/providers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setProviders(data.providers || []);
        setCategories(data.categories || []);
      }
    } catch (error) {
      toast({ title: "Error loading providers", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const openCreateDialog = () => {
    setEditingProvider(null);
    setFormData({
      name: "",
      website: "",
      description: "",
      category: "",
      contactEmail: "",
      contactPhone: "",
    });
    setValidationErrors({});
    setIsDialogOpen(true);
  };

  const openEditDialog = (provider: ProviderData) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      website: provider.website || "",
      description: provider.description || "",
      category: provider.category,
      contactEmail: provider.contactEmail || "",
      contactPhone: provider.contactPhone || "",
    });
    setValidationErrors({});
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Name is required";
    if (!formData.category) errors.category = "Category is required";
    
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast({ title: "Please fix the errors", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("accessToken");
      const url = editingProvider 
        ? `/api/tenant/providers/${editingProvider.id}`
        : "/api/tenant/providers";
      
      const res = await fetch(url, {
        method: editingProvider ? "PATCH" : "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast({ title: editingProvider ? "Provider updated" : "Provider created" });
        setIsDialogOpen(false);
        fetchProviders();
      } else {
        const data = await res.json();
        toast({ title: data.error || "Failed to save", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to save provider", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (provider: ProviderData) => {
    setConfirmDialog({
      open: true,
      title: "Delete Provider",
      description: `Are you sure you want to delete "${provider.name}" from the directory?`,
      confirmLabel: "Delete",
      variant: "destructive",
      onConfirm: async () => {
        const token = localStorage.getItem("accessToken");
        const res = await fetch(`/api/tenant/providers/${provider.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          toast({ title: "Provider deleted" });
          fetchProviders();
        } else {
          toast({ title: "Failed to delete", variant: "destructive" });
        }
      },
    });
  };

  const syncInstructors = async () => {
    setSyncing(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch("/api/tenant/providers/sync-instructors", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: data.message });
        fetchProviders();
      } else {
        toast({ title: data.error || "Failed to sync", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to sync instructors", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const filteredProviders = providers.filter(p => {
    const matchesSearch = searchQuery === "" || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const allCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...categories])).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7C9082]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-serif text-stone-800">Provider Directory</h1>
          <p className="text-muted-foreground mt-1">Manage local providers, instructors, and services visible to your co-op families.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={syncInstructors} disabled={syncing} data-testid="button-sync-instructors">
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Instructors"}
          </Button>
          <Button onClick={openCreateDialog} data-testid="button-add-provider">
            <Plus className="w-4 h-4 mr-2" />
            Add Provider
          </Button>
        </div>
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
            {allCategories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredProviders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-stone-300 mb-4" />
            <h3 className="font-medium text-stone-700 mb-2">No providers found</h3>
            <p className="text-sm text-stone-500 mb-4">
              {searchQuery || filterCategory !== "all" 
                ? "Try adjusting your search or filter" 
                : "Add local providers, businesses, and services to share with families"}
            </p>
            <Button variant="outline" onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" /> Add First Provider
            </Button>
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
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(provider)} data-testid={`button-edit-provider-${provider.id}`}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => confirmDelete(provider)} data-testid={`button-delete-provider-${provider.id}`}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
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
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" />
                      {provider.contactEmail}
                    </span>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProvider ? "Edit Provider" : "Add Provider"}</DialogTitle>
            <DialogDescription>
              {editingProvider ? "Update provider information" : "Add a new provider to your local directory"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Provider or business name"
                data-testid="input-provider-name"
              />
              {validationErrors.name && <p className="text-xs text-red-500">{validationErrors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger data-testid="select-provider-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {allCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.category && <p className="text-xs text-red-500">{validationErrors.category}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of services offered"
                rows={3}
                data-testid="input-provider-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://example.com"
                data-testid="input-provider-website"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="email@example.com"
                  data-testid="input-provider-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  placeholder="(555) 123-4567"
                  data-testid="input-provider-phone"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} data-testid="button-save-provider">
              {saving ? "Saving..." : (editingProvider ? "Save Changes" : "Add Provider")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
      />
    </div>
  );
}
