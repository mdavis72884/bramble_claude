import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Edit, Trash2, Brain, Heart, FileText, BookOpen, Shield, Eye, EyeOff, GraduationCap, Sparkles, Users } from "lucide-react";

const LEARNING_STYLES: Record<string, { label: string; description: string }> = {
  visual: { label: "Visual", description: "Learns best by seeing things—pictures, diagrams, color, and visual examples." },
  auditory: { label: "Auditory", description: "Learns best by listening, talking things through, and hearing explanations." },
  kinesthetic: { label: "Hands-On (Kinesthetic)", description: "Learns best by moving, building, touching, and doing." },
  reading_writing: { label: "Reading & Writing", description: "Learns best by reading, writing, and working with text." },
  social: { label: "Social", description: "Learns best with others through conversation, teamwork, and shared ideas." },
  independent: { label: "Independent", description: "Learns best alone, with time to think and work at their own pace." },
  logical: { label: "Logical", description: "Learns best through patterns, steps, problem-solving, and clear structure." },
  creative: { label: "Creative", description: "Learns best through stories, imagination, art, and open-ended exploration." },
  multi_sensory: { label: "Multi-Sensory", description: "Learns best when learning includes a mix of seeing, hearing, and doing." },
};

const EDUCATIONAL_PHILOSOPHIES: Record<string, { label: string; description: string }> = {
  classical: { label: "Classical Education", description: "Learning through great books, discussion, and clear thinking." },
  traditional: { label: "Traditional / Textbook-Based", description: "Structured lessons with clear expectations, schedules, and progress." },
  charlotte_mason: { label: "Charlotte Mason", description: "Gentle learning with meaningful books, short lessons, and time outdoors." },
  montessori: { label: "Montessori", description: "Hands-on learning that encourages independence and self-direction." },
  waldorf: { label: "Waldorf", description: "Learning through stories, art, imagination, and rhythm." },
  project_based: { label: "Project-Based Learning", description: "Learning by working on real-world projects and ideas." },
  interest_led: { label: "Interest-Led / Student-Led", description: "Learning guided by a child's natural interests and curiosity." },
  reggio_emilia: { label: "Reggio Emilia", description: "Creative, exploratory learning shaped by curiosity and environment." },
  nature_forest: { label: "Nature / Forest School", description: "Learning rooted in outdoor exploration and hands-on experiences in nature." },
};

const LEARNING_ENVIRONMENTS: Record<string, string> = {
  solo: "Solo",
  small_group: "Small Group",
  large_group: "Large Group",
};

export interface ChildProfileViewDialogProps {
  child: {
    id: string;
    firstName: string;
    lastName?: string;
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
    visibleToOtherParents?: boolean;
    enrollments?: Array<{ id: string; class: { id: string; title: string } }>;
  } | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (child: any) => void;
  onDelete?: (childId: string) => void;
  onClassClick?: (classId: string) => void;
  viewerRole: 'admin' | 'parent' | 'instructor';
  showPrivacySettings?: boolean;
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function ChildProfileViewDialog({
  child,
  isOpen,
  onOpenChange,
  onEdit,
  onDelete,
  onClassClick,
  viewerRole,
  showPrivacySettings = false,
}: ChildProfileViewDialogProps) {
  if (!child) return null;

  const fullName = [child.firstName, child.lastName].filter(Boolean).join(" ");
  const initials = [child.firstName?.[0], child.lastName?.[0]].filter(Boolean).join("").toUpperCase() || "?";
  const age = child.dateOfBirth ? calculateAge(child.dateOfBirth) : null;

  const getLearningStyleInfo = (value?: string) => {
    if (!value) return null;
    return LEARNING_STYLES[value] || { label: value, description: "" };
  };

  const getPhilosophyInfo = (value?: string) => {
    if (!value) return null;
    return EDUCATIONAL_PHILOSOPHIES[value] || { label: value, description: "" };
  };

  const getEnvironmentLabel = (value?: string) => {
    if (!value) return null;
    return LEARNING_ENVIRONMENTS[value] || value;
  };

  const hasSupportNotes = child.neurodivergentNotes || child.healthNotes || child.parentNotes;
  const hasLearningInfo = child.learningStylePrimary || child.educationalPhilosophyPrimary || child.preferredLearningEnvironment;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="dialog-child-profile">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 border-2 border-stone-200">
                <AvatarFallback className="bg-[#7C9082] text-white text-lg font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-xl font-serif" data-testid="text-child-name">
                  {fullName}
                </DialogTitle>
                <DialogDescription className="text-stone-500 mt-1">
                  {age !== null && <span>{age} years old</span>}
                  {age !== null && child.grade && <span> • </span>}
                  {child.grade && <span>{child.grade}</span>}
                </DialogDescription>
              </div>
            </div>
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(child)}
                className="flex-shrink-0"
                data-testid="button-edit-child"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </DialogHeader>

        {viewerRole === 'admin' && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700 flex-shrink-0">
            <Shield className="w-4 h-4" />
            <span>As admin, you see all data</span>
          </div>
        )}

        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-6 pb-4">
            {child.dateOfBirth && (
              <section>
                <h3 className="text-sm font-medium text-stone-500 mb-2 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Basic Information
                </h3>
                <div className="bg-stone-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-stone-600">Date of Birth</span>
                    <span className="font-medium">{formatDate(child.dateOfBirth)}</span>
                  </div>
                  {child.grade && (
                    <div className="flex justify-between">
                      <span className="text-stone-600">Grade</span>
                      <span className="font-medium">{child.grade}</span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {child.interests && child.interests.length > 0 && (
              <section>
                <h3 className="text-sm font-medium text-stone-500 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Interests
                </h3>
                <div className="flex flex-wrap gap-2">
                  {child.interests.map((interest, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="bg-[#7C9082]/10 text-[#5a6b5f] border-[#7C9082]/20"
                      data-testid={`badge-child-interest-${index}`}
                    >
                      {interest}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            {hasLearningInfo && (
              <section>
                <h3 className="text-sm font-medium text-stone-500 mb-2 flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Learning Style & Environment
                </h3>
                <div className="space-y-3">
                  {child.learningStylePrimary && (
                    <div className="bg-stone-50 rounded-lg p-4">
                      <div className="font-medium text-stone-800">
                        Primary: {getLearningStyleInfo(child.learningStylePrimary)?.label}
                      </div>
                      <p className="text-sm text-stone-600 mt-1">
                        {getLearningStyleInfo(child.learningStylePrimary)?.description}
                      </p>
                    </div>
                  )}
                  {child.learningStyleSecondary && (
                    <div className="bg-stone-50 rounded-lg p-4">
                      <div className="font-medium text-stone-800">
                        Secondary: {getLearningStyleInfo(child.learningStyleSecondary)?.label}
                      </div>
                      <p className="text-sm text-stone-600 mt-1">
                        {getLearningStyleInfo(child.learningStyleSecondary)?.description}
                      </p>
                    </div>
                  )}
                  {child.preferredLearningEnvironment && (
                    <div className="bg-stone-50 rounded-lg p-4">
                      <div className="font-medium text-stone-800">
                        Preferred Environment: {getEnvironmentLabel(child.preferredLearningEnvironment)}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {(child.educationalPhilosophyPrimary || child.educationalPhilosophySecondary) && (
              <section>
                <h3 className="text-sm font-medium text-stone-500 mb-2 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Educational Philosophy
                </h3>
                <div className="space-y-3">
                  {child.educationalPhilosophyPrimary && (
                    <div className="bg-stone-50 rounded-lg p-4">
                      <div className="font-medium text-stone-800">
                        Primary: {getPhilosophyInfo(child.educationalPhilosophyPrimary)?.label}
                      </div>
                      <p className="text-sm text-stone-600 mt-1">
                        {getPhilosophyInfo(child.educationalPhilosophyPrimary)?.description}
                      </p>
                    </div>
                  )}
                  {child.educationalPhilosophySecondary && (
                    <div className="bg-stone-50 rounded-lg p-4">
                      <div className="font-medium text-stone-800">
                        Secondary: {getPhilosophyInfo(child.educationalPhilosophySecondary)?.label}
                      </div>
                      <p className="text-sm text-stone-600 mt-1">
                        {getPhilosophyInfo(child.educationalPhilosophySecondary)?.description}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {hasSupportNotes && (
              <section>
                <h3 className="text-sm font-medium text-stone-500 mb-2 flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Support Notes
                </h3>
                <div className="space-y-3">
                  {child.neurodivergentNotes && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 font-medium text-amber-800 mb-1">
                        <Brain className="w-4 h-4" />
                        Learning Differences & Neurodivergent Notes
                      </div>
                      <p className="text-sm text-amber-900 whitespace-pre-wrap">
                        {child.neurodivergentNotes}
                      </p>
                    </div>
                  )}
                  {child.healthNotes && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 font-medium text-red-800 mb-1">
                        <Heart className="w-4 h-4" />
                        Health Notes
                      </div>
                      <p className="text-sm text-red-900 whitespace-pre-wrap">
                        {child.healthNotes}
                      </p>
                    </div>
                  )}
                  {child.parentNotes && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 font-medium text-blue-800 mb-1">
                        <FileText className="w-4 h-4" />
                        Additional Parent Notes
                      </div>
                      <p className="text-sm text-blue-900 whitespace-pre-wrap">
                        {child.parentNotes}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {showPrivacySettings && viewerRole === 'admin' && (
              <section>
                <h3 className="text-sm font-medium text-stone-500 mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Privacy Settings
                </h3>
                <div className="bg-stone-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-stone-500" />
                      <span className="text-stone-700">Shared with Instructors</span>
                    </div>
                    <Badge variant={child.shareWithInstructors ? "default" : "secondary"}>
                      {child.shareWithInstructors ? (
                        <><Eye className="w-3 h-3 mr-1" /> Yes</>
                      ) : (
                        <><EyeOff className="w-3 h-3 mr-1" /> No</>
                      )}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-stone-500" />
                      <span className="text-stone-700">Visible to Other Parents</span>
                    </div>
                    <Badge variant={child.visibleToOtherParents ? "default" : "secondary"}>
                      {child.visibleToOtherParents ? (
                        <><Eye className="w-3 h-3 mr-1" /> Yes</>
                      ) : (
                        <><EyeOff className="w-3 h-3 mr-1" /> No</>
                      )}
                    </Badge>
                  </div>
                </div>
              </section>
            )}

            {child.enrollments && child.enrollments.length > 0 && (
              <section>
                <h3 className="text-sm font-medium text-stone-500 mb-2 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Enrolled Classes
                </h3>
                <div className="space-y-2">
                  {child.enrollments.map((enrollment) => (
                    <div
                      key={enrollment.id}
                      className={`bg-stone-50 rounded-lg p-3 flex items-center gap-3 ${onClassClick ? 'cursor-pointer hover:bg-stone-100 transition-colors' : ''}`}
                      onClick={() => onClassClick?.(enrollment.class.id)}
                      data-testid={`enrollment-${enrollment.id}`}
                    >
                      <div className="w-8 h-8 bg-[#7C9082]/20 rounded-full flex items-center justify-center">
                        <BookOpen className="w-4 h-4 text-[#7C9082]" />
                      </div>
                      <span className="font-medium text-stone-800 flex-1">{enrollment.class.title}</span>
                      {onClassClick && (
                        <span className="text-stone-400 text-sm">View →</span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {onDelete && (
              <>
                <Separator />
                <div className="pt-2">
                  <Button
                    variant="destructive"
                    onClick={() => onDelete(child.id)}
                    className="w-full"
                    data-testid="button-delete-child"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Child Profile
                  </Button>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
