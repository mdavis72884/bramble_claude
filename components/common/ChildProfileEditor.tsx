import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Info, X, Plus, AlertTriangle, Loader2 } from "lucide-react";

export interface ChildProfileData {
  id?: string;
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

const PREDEFINED_INTERESTS = [
  "Creativity & Arts",
  "STEM & Logic",
  "Nature & Exploration",
  "Reading & Humanities",
  "Building & Making",
  "Hands-On & Discovery",
  "Physical & Movement",
  "Social & Leadership",
  "Music & Performing Arts",
  "Animals & Pets",
  "Cooking & Culinary",
  "Games & Strategy",
  "Faith & Spirituality",
  "World Cultures & Languages",
];

const LEARNING_STYLES = [
  { value: "visual", label: "Visual", description: "Learns best by seeing things—pictures, diagrams, color, and visual examples." },
  { value: "auditory", label: "Auditory", description: "Learns best by listening, talking things through, and hearing explanations." },
  { value: "kinesthetic", label: "Hands-On (Kinesthetic)", description: "Learns best by moving, building, touching, and doing." },
  { value: "reading_writing", label: "Reading & Writing", description: "Learns best by reading, writing, and working with text." },
  { value: "social", label: "Social", description: "Learns best with others through conversation, teamwork, and shared ideas." },
  { value: "independent", label: "Independent", description: "Learns best alone, with time to think and work at their own pace." },
  { value: "logical", label: "Logical", description: "Learns best through patterns, steps, problem-solving, and clear structure." },
  { value: "creative", label: "Creative", description: "Learns best through stories, imagination, art, and open-ended exploration." },
  { value: "multi_sensory", label: "Multi-Sensory", description: "Learns best when learning includes a mix of seeing, hearing, and doing." },
];

const EDUCATIONAL_PHILOSOPHIES = [
  { value: "classical", label: "Classical Education", description: "Learning through great books, discussion, and clear thinking." },
  { value: "traditional", label: "Traditional / Textbook-Based", description: "Structured lessons with clear expectations, schedules, and progress." },
  { value: "charlotte_mason", label: "Charlotte Mason", description: "Gentle learning with meaningful books, short lessons, and time outdoors." },
  { value: "montessori", label: "Montessori", description: "Hands-on learning that encourages independence and self-direction." },
  { value: "waldorf", label: "Waldorf", description: "Learning through stories, art, imagination, and rhythm." },
  { value: "project_based", label: "Project-Based Learning", description: "Learning by working on real-world projects and ideas." },
  { value: "interest_led", label: "Interest-Led / Student-Led", description: "Learning guided by a child's natural interests and curiosity." },
  { value: "reggio_emilia", label: "Reggio Emilia", description: "Creative, exploratory learning shaped by curiosity and environment." },
  { value: "nature_forest", label: "Nature / Forest School", description: "Learning rooted in outdoor exploration and hands-on experiences in nature." },
];

const GRADES = [
  "Pre-K",
  "Kindergarten",
  "1st Grade",
  "2nd Grade",
  "3rd Grade",
  "4th Grade",
  "5th Grade",
  "6th Grade",
  "7th Grade",
  "8th Grade",
  "9th Grade",
  "10th Grade",
  "11th Grade",
  "12th Grade",
  "Other",
];

const LEARNING_ENVIRONMENTS = [
  { value: "solo", label: "Solo" },
  { value: "small_group", label: "Small Group" },
  { value: "large_group", label: "Large Group" },
];

interface ChildProfileEditorProps {
  initialData?: Partial<ChildProfileData>;
  onSave: (data: ChildProfileData) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
}

export function ChildProfileEditor({ initialData, onSave, onCancel, isEditing = false }: ChildProfileEditorProps) {
  const getDefaultFormData = (data?: Partial<ChildProfileData>): ChildProfileData => ({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    grade: "",
    interests: [],
    learningStylePrimary: "",
    learningStyleSecondary: "",
    educationalPhilosophyPrimary: "",
    educationalPhilosophySecondary: "",
    preferredLearningEnvironment: "",
    neurodivergentNotes: "",
    healthNotes: "",
    parentNotes: "",
    shareWithInstructors: true,
    visibleToOtherParents: false,
    ...data,
  });

  const [formData, setFormData] = useState<ChildProfileData>(getDefaultFormData(initialData));
  const [initialFormData] = useState<ChildProfileData>(getDefaultFormData(initialData));

  const [customInterest, setCustomInterest] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  const isDirty = useMemo(() => {
    if (!isEditing) {
      return formData.firstName.trim() !== "" || 
             formData.lastName?.trim() !== "" ||
             formData.dateOfBirth !== "" ||
             formData.interests.length > 0;
    }
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  }, [formData, initialFormData, isEditing]);

  // Sync form data when initialData changes (for editing different children)
  useEffect(() => {
    if (isEditing && initialData) {
      setFormData(getDefaultFormData(initialData));
      setErrors({});
    }
  }, [initialData?.id, isEditing]);

  useEffect(() => {
    const savedDraft = localStorage.getItem("child_profile_draft");
    if (savedDraft && !isEditing) {
      try {
        const draft = JSON.parse(savedDraft);
        setFormData(prev => ({ ...prev, ...draft }));
      } catch (e) {
      }
    }
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing && formData.firstName) {
      localStorage.setItem("child_profile_draft", JSON.stringify(formData));
    }
  }, [formData, isEditing]);

  const toggleInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const addCustomInterest = () => {
    if (customInterest.trim() && !formData.interests.includes(customInterest.trim())) {
      setFormData(prev => ({
        ...prev,
        interests: [...prev.interests, customInterest.trim()],
      }));
      setCustomInterest("");
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = "Birthdate is required";
    }
    if (!formData.learningStylePrimary) {
      newErrors.learningStylePrimary = "Primary learning style is required";
    }
    if (!formData.educationalPhilosophyPrimary) {
      newErrors.educationalPhilosophyPrimary = "Primary educational philosophy is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave(formData);
      setErrors({});
      localStorage.removeItem("child_profile_draft");
    } catch (error) {
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      setShowUnsavedWarning(true);
    } else {
      confirmCancel();
    }
  };

  const confirmCancel = () => {
    setErrors({});
    setShowUnsavedWarning(false);
    localStorage.removeItem("child_profile_draft");
    onCancel();
  };

  const handleFieldChange = (field: keyof ChildProfileData, value: string | boolean | string[]) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {hasErrors && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-medium">Please fix the following errors:</p>
          <ul className="list-disc list-inside text-red-600 text-sm mt-1">
            {Object.values(errors).map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-serif">Basic Information</CardTitle>
          <CardDescription>Name, age, and grade level</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className={errors.firstName ? "text-red-600" : ""}>First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleFieldChange("firstName", e.target.value)}
                placeholder="Enter first name"
                className={errors.firstName ? "border-red-500 focus-visible:ring-red-500" : ""}
                data-testid="input-child-firstname"
              />
              {errors.firstName && <p className="text-sm text-red-500">{errors.firstName}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName || ""}
                onChange={(e) => handleFieldChange("lastName", e.target.value)}
                placeholder="Optional"
                data-testid="input-child-lastname"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth" className={errors.dateOfBirth ? "text-red-600" : ""}>Birthdate *</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth || ""}
                onChange={(e) => handleFieldChange("dateOfBirth", e.target.value)}
                className={errors.dateOfBirth ? "border-red-500 focus-visible:ring-red-500" : ""}
                data-testid="input-child-dob"
              />
              {errors.dateOfBirth && <p className="text-sm text-red-500">{errors.dateOfBirth}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="grade">Grade</Label>
              <Select value={formData.grade || ""} onValueChange={(value) => setFormData({ ...formData, grade: value })}>
                <SelectTrigger data-testid="select-child-grade">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {GRADES.map(grade => (
                    <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
            <CardHeader>
              <CardTitle className="text-xl font-serif">Interests</CardTitle>
              <CardDescription>What does your child enjoy?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {PREDEFINED_INTERESTS.map(interest => (
                  <Badge
                    key={interest}
                    variant={formData.interests.includes(interest) ? "default" : "outline"}
                    className={`cursor-pointer transition-colors ${
                      formData.interests.includes(interest)
                        ? "bg-[#7C9082] hover:bg-[#6a7d70]"
                        : "hover:bg-stone-100"
                    }`}
                    onClick={() => toggleInterest(interest)}
                    data-testid={`badge-interest-${interest.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {interest}
                  </Badge>
                ))}
              </div>

              {formData.interests.filter(i => !PREDEFINED_INTERESTS.includes(i)).length > 0 && (
                <div className="pt-2">
                  <Label className="text-sm text-stone-500">Custom Interests</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.interests.filter(i => !PREDEFINED_INTERESTS.includes(i)).map(interest => (
                      <Badge key={interest} variant="secondary" className="flex items-center gap-1">
                        {interest}
                        <X
                          className="w-3 h-3 cursor-pointer"
                          onClick={() => toggleInterest(interest)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  placeholder="Add a custom interest..."
                  value={customInterest}
                  onChange={(e) => setCustomInterest(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomInterest())}
                  data-testid="input-custom-interest"
                />
                <Button type="button" variant="outline" onClick={addCustomInterest} data-testid="button-add-interest">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-serif">Learning Style & Educational Fit</CardTitle>
              <CardDescription>How does your child learn best?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className={errors.learningStylePrimary ? "text-red-600" : ""}>Primary Learning Style *</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-stone-400" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Select the way your child learns best most of the time.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Select
                    value={formData.learningStylePrimary || ""}
                    onValueChange={(value) => handleFieldChange("learningStylePrimary", value)}
                  >
                    <SelectTrigger className={errors.learningStylePrimary ? "border-red-500" : ""} data-testid="select-learning-style-primary">
                      <SelectValue placeholder="Select primary learning style" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEARNING_STYLES.map(style => (
                        <SelectItem key={style.value} value={style.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{style.label}</span>
                            <span className="text-xs text-stone-500">{style.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.learningStylePrimary && <p className="text-sm text-red-500">{errors.learningStylePrimary}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Secondary Learning Style</Label>
                  <Select
                    value={formData.learningStyleSecondary || ""}
                    onValueChange={(value) => handleFieldChange("learningStyleSecondary", value)}
                  >
                    <SelectTrigger data-testid="select-learning-style-secondary">
                      <SelectValue placeholder="Optional - select secondary style" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEARNING_STYLES.filter(s => s.value !== formData.learningStylePrimary).map(style => (
                        <SelectItem key={style.value} value={style.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{style.label}</span>
                            <span className="text-xs text-stone-500">{style.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className={errors.educationalPhilosophyPrimary ? "text-red-600" : ""}>Primary Educational Philosophy *</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-stone-400" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Select the educational approach that best fits your family's goals.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Select
                    value={formData.educationalPhilosophyPrimary || ""}
                    onValueChange={(value) => handleFieldChange("educationalPhilosophyPrimary", value)}
                  >
                    <SelectTrigger className={errors.educationalPhilosophyPrimary ? "border-red-500" : ""} data-testid="select-philosophy-primary">
                      <SelectValue placeholder="Select primary philosophy" />
                    </SelectTrigger>
                    <SelectContent>
                      {EDUCATIONAL_PHILOSOPHIES.map(phil => (
                        <SelectItem key={phil.value} value={phil.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{phil.label}</span>
                            <span className="text-xs text-stone-500">{phil.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.educationalPhilosophyPrimary && <p className="text-sm text-red-500">{errors.educationalPhilosophyPrimary}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Secondary Educational Philosophy</Label>
                  <Select
                    value={formData.educationalPhilosophySecondary || ""}
                    onValueChange={(value) => handleFieldChange("educationalPhilosophySecondary", value)}
                  >
                    <SelectTrigger data-testid="select-philosophy-secondary">
                      <SelectValue placeholder="Optional - select secondary philosophy" />
                    </SelectTrigger>
                    <SelectContent>
                      {EDUCATIONAL_PHILOSOPHIES.filter(p => p.value !== formData.educationalPhilosophyPrimary).map(phil => (
                        <SelectItem key={phil.value} value={phil.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{phil.label}</span>
                            <span className="text-xs text-stone-500">{phil.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <Label>Preferred Learning Environment</Label>
                <Select
                  value={formData.preferredLearningEnvironment || ""}
                  onValueChange={(value) => setFormData({ ...formData, preferredLearningEnvironment: value })}
                >
                  <SelectTrigger data-testid="select-learning-environment">
                    <SelectValue placeholder="Select preferred environment" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEARNING_ENVIRONMENTS.map(env => (
                      <SelectItem key={env.value} value={env.value}>{env.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-serif">Support & Notes</CardTitle>
          <CardDescription>Optional - private notes to help instructors support your child</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="neurodivergentNotes">Learning Differences & Neurodivergent Notes</Label>
            <Textarea
              id="neurodivergentNotes"
              value={formData.neurodivergentNotes || ""}
              onChange={(e) => setFormData({ ...formData, neurodivergentNotes: e.target.value })}
              placeholder="Any learning differences, ADHD, autism, dyslexia, or other notes that would help instructors..."
              rows={3}
              data-testid="textarea-neurodivergent-notes"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="healthNotes">Health Notes</Label>
            <Textarea
              id="healthNotes"
              value={formData.healthNotes || ""}
              onChange={(e) => setFormData({ ...formData, healthNotes: e.target.value })}
              placeholder="Allergies, medical conditions, or other health information..."
              rows={3}
              data-testid="textarea-health-notes"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="parentNotes">Additional Parent Notes</Label>
            <Textarea
              id="parentNotes"
              value={formData.parentNotes || ""}
              onChange={(e) => setFormData({ ...formData, parentNotes: e.target.value })}
              placeholder="Anything else you'd like instructors to know..."
              rows={3}
              data-testid="textarea-parent-notes"
            />
          </div>
        </CardContent>
      </Card>

          <Card className="border-amber-200 bg-amber-50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <CardTitle className="text-lg text-amber-800">Privacy Settings</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-amber-700">
                Your co-op administrators can view all child profile information to ensure a safe and supportive environment.
              </p>

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="shareWithInstructors" className="font-medium">Share with Instructors</Label>
                  <p className="text-sm text-stone-500">Allow instructors to see your child's full profile, including notes and learning preferences</p>
                </div>
                <Switch
                  id="shareWithInstructors"
                  checked={formData.shareWithInstructors}
                  onCheckedChange={(checked) => setFormData({ ...formData, shareWithInstructors: checked })}
                  data-testid="switch-share-instructors"
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t">
                <div>
                  <Label htmlFor="visibleToOtherParents" className="font-medium">Visible to Other Parents</Label>
                  <p className="text-sm text-stone-500">Allow other families in your co-op to see your child's basic profile</p>
                </div>
                <Switch
                  id="visibleToOtherParents"
                  checked={formData.visibleToOtherParents}
                  onCheckedChange={(checked) => setFormData({ ...formData, visibleToOtherParents: checked })}
                  data-testid="switch-visible-parents"
                />
              </div>
            </CardContent>
          </Card>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={handleCancel} data-testid="button-cancel-profile">
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="bg-[#7C9082] hover:bg-[#6a7d70]"
          data-testid="button-save-profile"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            isEditing ? "Save Changes" : "Create Profile"
          )}
        </Button>
      </div>

      <Dialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Unsaved Changes
            </DialogTitle>
            <DialogDescription>
              You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowUnsavedWarning(false)} data-testid="button-keep-editing">
              Keep Editing
            </Button>
            <Button variant="destructive" onClick={confirmCancel} data-testid="button-discard-changes">
              Discard Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { LEARNING_STYLES, EDUCATIONAL_PHILOSOPHIES, PREDEFINED_INTERESTS };
