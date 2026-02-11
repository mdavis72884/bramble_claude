import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";

import LoginPage from "@/pages/LoginPage";

import Dashboard from "@/pages/console/Dashboard";
import TenantsPage from "@/pages/console/TenantsPage";
import TenantDetailPage from "@/pages/console/TenantDetailPage";
import PaymentsPage from "@/pages/console/PaymentsPage";
import FeesPage from "@/pages/console/FeesPage";
import AuditLogsPage from "@/pages/console/AuditLogsPage";
import EmailSystemPage from "@/pages/console/EmailSystemPage";
import ApplicationsPage from "@/pages/console/ApplicationsPage";
import ApplicationReviewPage from "@/pages/console/ApplicationReviewPage";

import TenantDashboard from "@/pages/admin/TenantDashboard";
import ClassManager from "@/pages/admin/ClassManager";
import CourseManager from "@/pages/admin/CourseManager";
import EventManager from "@/pages/admin/EventManager";
import FamilyManager from "@/pages/admin/FamilyManager";
import InstructorManager from "@/pages/admin/InstructorManager";
import BrandingEditor from "@/pages/admin/BrandingEditor";
import LandingPageEditor from "@/pages/admin/LandingPageEditor";
import FeeSettings from "@/pages/admin/FeeSettings";
import CommunicationsHub from "@/pages/admin/CommunicationsHub";
import PaymentsView from "@/pages/admin/PaymentsView";
import CalendarView from "@/pages/admin/CalendarView";
import ProviderManager from "@/pages/admin/ProviderManager";

import Directory from "@/pages/public/Directory";
import CoopLanding from "@/pages/public/CoopLanding";
import Apply from "@/pages/public/Apply";
import BrambleLanding from "@/pages/public/BrambleLanding";
import StartCoop from "@/pages/public/StartCoop";
import About from "@/pages/public/About";
import Privacy from "@/pages/public/Privacy";
import Terms from "@/pages/public/Terms";
import SetupAccount from "@/pages/public/SetupAccount";
import FamilyDashboard from "@/pages/family/FamilyDashboard";
import InstructorDashboard from "@/pages/instructor/InstructorDashboard";
import RoutesPage from "@/pages/dev/RoutesPage";

import { OperatorLayout } from "@/components/layouts/OperatorLayout";
import { TenantLayout } from "@/components/layouts/TenantLayout";
import { ImpersonationBanner } from "@/components/common/ImpersonationBanner";
import { ErrorBoundary } from "@/components/common";

function ProtectedRoute({ 
  component: Component, 
  allowedRoles,
  layout,
  layoutRole 
}: { 
  component: React.ComponentType; 
  allowedRoles: string[];
  layout?: "operator" | "tenant";
  layoutRole?: "COOP_ADMIN" | "INSTRUCTOR" | "FAMILY";
}) {
  const { user, isLoading, availablePortals } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  // Check if user has access via their available portals (supports multi-role users)
  const hasAccess = allowedRoles.some(role => availablePortals.includes(role));
  if (!hasAccess) {
    return <AccessDeniedPage />;
  }

  if (layout === "operator") {
    return (
      <OperatorLayout>
        <Component />
      </OperatorLayout>
    );
  }

  if (layout === "tenant" && layoutRole) {
    return (
      <TenantLayout role={layoutRole}>
        <Component />
      </TenantLayout>
    );
  }

  return <Component />;
}

function AccessDeniedPage() {
  const { user, logout } = useAuth();
  
  const roleLabel = user?.role === 'BRAMBLE_OPERATOR' ? 'Operator' 
    : user?.role === 'COOP_ADMIN' ? 'Co-op Admin' 
    : user?.role === 'INSTRUCTOR' ? 'Instructor' 
    : 'Family Member';
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-md text-center space-y-6">
        <div className="text-5xl font-serif font-bold text-slate-900">Bramble</div>
        <h1 className="text-2xl font-semibold text-slate-800">Access Restricted</h1>
        <p className="text-slate-600">
          Hello {user?.firstName}, you're signed in as a <strong>{roleLabel}</strong>.
        </p>
        <p className="text-slate-600">
          You don't have access to this area.
        </p>
        <button
          onClick={logout}
          className="inline-flex items-center px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors"
          data-testid="button-logout-access-denied"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

function RoleBasedRedirect() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-slate-600">Loading...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Redirect to="/directory" />;
  }
  
  switch (user.role) {
    case "BRAMBLE_OPERATOR":
      return <Redirect to="/operator" />;
    case "COOP_ADMIN":
      return <Redirect to="/app/admin" />;
    case "INSTRUCTOR":
      return <Redirect to="/app/instructor" />;
    case "FAMILY":
      return <Redirect to="/app/family" />;
    default:
      return <Redirect to="/login" />;
  }
}

function Router() {
  return (
    <Switch>
      {/* Developer Utility */}
      <Route path="/routes" component={RoutesPage} />
      
      {/* Public Bramble Website */}
      <Route path="/" component={BrambleLanding} />
      <Route path="/start" component={StartCoop} />
      <Route path="/about" component={About} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/directory" component={Directory} />
      <Route path="/coop/:slug" component={CoopLanding} />
      <Route path="/apply/:slug/:role" component={Apply} />
      <Route path="/setup" component={SetupAccount} />
      
      <Route path="/login" component={LoginPage} />
      <Route path="/home">
        {() => <RoleBasedRedirect />}
      </Route>

      {/* Legacy redirects for backward compatibility */}
      <Route path="/console">
        {() => <Redirect to="/operator" />}
      </Route>
      <Route path="/admin">
        {() => <Redirect to="/app/admin" />}
      </Route>
      <Route path="/instructor">
        {() => <Redirect to="/app/instructor" />}
      </Route>
      <Route path="/family">
        {() => <Redirect to="/app/family" />}
      </Route>
      
      {/* Operator Routes - Bramble Operator Only */}
      <Route path="/operator">
        {() => <ProtectedRoute component={Dashboard} allowedRoles={["BRAMBLE_OPERATOR"]} layout="operator" />}
      </Route>
      <Route path="/operator/tenants">
        {() => <ProtectedRoute component={TenantsPage} allowedRoles={["BRAMBLE_OPERATOR"]} layout="operator" />}
      </Route>
      <Route path="/operator/tenants/:id">
        {() => <ProtectedRoute component={TenantDetailPage} allowedRoles={["BRAMBLE_OPERATOR"]} layout="operator" />}
      </Route>
      <Route path="/operator/payments">
        {() => <ProtectedRoute component={PaymentsPage} allowedRoles={["BRAMBLE_OPERATOR"]} layout="operator" />}
      </Route>
      <Route path="/operator/fees">
        {() => <ProtectedRoute component={FeesPage} allowedRoles={["BRAMBLE_OPERATOR"]} layout="operator" />}
      </Route>
      <Route path="/operator/audit">
        {() => <ProtectedRoute component={AuditLogsPage} allowedRoles={["BRAMBLE_OPERATOR"]} layout="operator" />}
      </Route>
      <Route path="/operator/email">
        {() => <ProtectedRoute component={EmailSystemPage} allowedRoles={["BRAMBLE_OPERATOR"]} layout="operator" />}
      </Route>
      <Route path="/operator/applications">
        {() => <ProtectedRoute component={ApplicationsPage} allowedRoles={["BRAMBLE_OPERATOR"]} layout="operator" />}
      </Route>
      <Route path="/operator/applications/:id">
        {() => <ProtectedRoute component={ApplicationReviewPage} allowedRoles={["BRAMBLE_OPERATOR"]} layout="operator" />}
      </Route>

      {/* Tenant App Routes - Co-op Admin */}
      <Route path="/app/admin">
        {() => <ProtectedRoute component={TenantDashboard} allowedRoles={["COOP_ADMIN"]} layout="tenant" layoutRole="COOP_ADMIN" />}
      </Route>
      <Route path="/app/admin/calendar">
        {() => <ProtectedRoute component={CalendarView} allowedRoles={["COOP_ADMIN"]} layout="tenant" layoutRole="COOP_ADMIN" />}
      </Route>
      <Route path="/app/admin/classes">
        {() => <ProtectedRoute component={ClassManager} allowedRoles={["COOP_ADMIN"]} layout="tenant" layoutRole="COOP_ADMIN" />}
      </Route>
      <Route path="/app/admin/courses">
        {() => <ProtectedRoute component={CourseManager} allowedRoles={["COOP_ADMIN"]} layout="tenant" layoutRole="COOP_ADMIN" />}
      </Route>
      <Route path="/app/admin/events">
        {() => <ProtectedRoute component={EventManager} allowedRoles={["COOP_ADMIN"]} layout="tenant" layoutRole="COOP_ADMIN" />}
      </Route>
      <Route path="/app/admin/families">
        {() => <ProtectedRoute component={FamilyManager} allowedRoles={["COOP_ADMIN"]} layout="tenant" layoutRole="COOP_ADMIN" />}
      </Route>
      <Route path="/app/admin/instructors">
        {() => <ProtectedRoute component={InstructorManager} allowedRoles={["COOP_ADMIN"]} layout="tenant" layoutRole="COOP_ADMIN" />}
      </Route>
      <Route path="/app/admin/branding">
        {() => <ProtectedRoute component={BrandingEditor} allowedRoles={["COOP_ADMIN"]} layout="tenant" layoutRole="COOP_ADMIN" />}
      </Route>
      <Route path="/app/admin/landing-page">
        {() => <ProtectedRoute component={LandingPageEditor} allowedRoles={["COOP_ADMIN"]} layout="tenant" layoutRole="COOP_ADMIN" />}
      </Route>
      <Route path="/app/admin/settings">
        {() => <ProtectedRoute component={FeeSettings} allowedRoles={["COOP_ADMIN"]} layout="tenant" layoutRole="COOP_ADMIN" />}
      </Route>
      <Route path="/app/admin/communications">
        {() => <ProtectedRoute component={CommunicationsHub} allowedRoles={["COOP_ADMIN"]} layout="tenant" layoutRole="COOP_ADMIN" />}
      </Route>
      <Route path="/app/admin/payments">
        {() => <ProtectedRoute component={PaymentsView} allowedRoles={["COOP_ADMIN"]} layout="tenant" layoutRole="COOP_ADMIN" />}
      </Route>
      <Route path="/app/admin/providers">
        {() => <ProtectedRoute component={ProviderManager} allowedRoles={["COOP_ADMIN"]} layout="tenant" layoutRole="COOP_ADMIN" />}
      </Route>

      {/* Tenant App Routes - Family (has built-in layout with tabs) */}
      <Route path="/app/family">
        {() => <ProtectedRoute component={FamilyDashboard} allowedRoles={["FAMILY"]} />}
      </Route>
      <Route path="/app/family/:tab">
        {() => <ProtectedRoute component={FamilyDashboard} allowedRoles={["FAMILY"]} />}
      </Route>

      {/* Tenant App Routes - Instructor (has built-in layout with tabs) */}
      <Route path="/app/instructor">
        {() => <ProtectedRoute component={InstructorDashboard} allowedRoles={["INSTRUCTOR"]} />}
      </Route>
      <Route path="/app/instructor/:tab">
        {() => <ProtectedRoute component={InstructorDashboard} allowedRoles={["INSTRUCTOR"]} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <ImpersonationBanner />
            <Router />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
