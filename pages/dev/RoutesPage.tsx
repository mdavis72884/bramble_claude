export default function RoutesPage() {
  const routes = [
    { path: "/", label: "Home (Role-based redirect)" },
    { path: "/login", label: "Login" },
    
    { section: "Public Pages" },
    { path: "/directory", label: "Co-op Directory" },
    { path: "/coop/oak-hollow", label: "Co-op Landing (example: oak-hollow)" },
    { path: "/apply/oak-hollow/family", label: "Family Application (example)" },
    { path: "/apply/oak-hollow/instructor", label: "Instructor Application (example)" },
    
    { section: "Operator Dashboard (/operator/*)" },
    { path: "/operator", label: "Operator Dashboard" },
    { path: "/operator/tenants", label: "Tenants List" },
    { path: "/operator/payments", label: "Payments" },
    { path: "/operator/fees", label: "Fee Rules" },
    { path: "/operator/audit", label: "Audit Logs" },
    { path: "/operator/email", label: "Email System" },
    
    { section: "Tenant App - Co-op Admin (/app/admin/*)" },
    { path: "/app/admin", label: "Admin Dashboard" },
    { path: "/app/admin/calendar", label: "Calendar View" },
    { path: "/app/admin/classes", label: "Class Manager (with pending approval)" },
    { path: "/app/admin/events", label: "Event Manager" },
    { path: "/app/admin/families", label: "Family Manager" },
    { path: "/app/admin/instructors", label: "Instructor Manager (invite/suspend/delete)" },
    { path: "/app/admin/branding", label: "Branding Editor" },
    { path: "/app/admin/landing-page", label: "Landing Page Editor" },
    { path: "/app/admin/settings", label: "Fee Settings" },
    { path: "/app/admin/communications", label: "Communications Hub" },
    { path: "/app/admin/payments", label: "Payments View" },
    
    { section: "Tenant App - Family (/app/family/*)" },
    { path: "/app/family", label: "Family Dashboard (calendar, classes, payments, receipts)" },
    
    { section: "Tenant App - Instructor (/app/instructor/*)" },
    { path: "/app/instructor", label: "Instructor Dashboard (calendar, classes, propose new class)" },
    
    { section: "API Endpoints" },
    { info: "GET /api/tenant/pending-counts - Pending approval counts" },
    { info: "GET /api/tenant/calendar - Admin calendar events" },
    { info: "POST /api/tenant/instructors/invite - Invite instructor" },
    { info: "PATCH /api/tenant/instructors/:id/suspend - Suspend instructor" },
    { info: "PATCH /api/tenant/instructors/:id/reactivate - Reactivate instructor" },
    { info: "DELETE /api/tenant/instructors/:id - Delete instructor" },
    { info: "POST /api/instructor/classes/propose - Propose new class" },
    { info: "GET /api/me/payments/orders/:id/receipt - Get payment receipt" },
    
    { section: "Test Credentials (2 users per role)" },
    { info: "OPERATORS (password: operator123)" },
    { info: "  operator@bramble.co" },
    { info: "  admin@bramble.co" },
    { info: "CO-OP ADMINS (password: admin123)" },
    { info: "  admin@oakhollow.edu" },
    { info: "  director@oakhollow.edu" },
    { info: "INSTRUCTORS (password: instructor123)" },
    { info: "  jane.smith@oakhollow.edu" },
    { info: "  robert.wilson@oakhollow.edu" },
    { info: "FAMILIES (password: family123)" },
    { info: "  parent@example.com (Doe family - Emma & Liam)" },
    { info: "  martinez@example.com (Martinez family - Sofia & Diego)" },
  ];

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "8px" }}>Bramble Routes</h1>
      <p style={{ color: "#666", marginBottom: "32px" }}>Developer utility page - click links to open in new tab</p>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {routes.map((item, idx) => {
          if ("section" in item) {
            return (
              <h2 key={idx} style={{ fontSize: "16px", fontWeight: "600", marginTop: "24px", marginBottom: "8px", borderBottom: "1px solid #ddd", paddingBottom: "4px" }}>
                {item.section}
              </h2>
            );
          }
          if ("info" in item) {
            return (
              <p key={idx} style={{ fontSize: "13px", color: "#888", paddingLeft: "12px" }}>
                {item.info}
              </p>
            );
          }
          return (
            <a
              key={idx}
              href={item.path}
              target="_blank"
              rel="noopener noreferrer"
              style={{ 
                fontSize: "14px", 
                color: "#0066cc", 
                textDecoration: "none",
                padding: "8px 12px",
                borderRadius: "4px",
                backgroundColor: "#f5f5f5"
              }}
            >
              <span style={{ fontFamily: "monospace", marginRight: "12px", color: "#666" }}>{item.path}</span>
              {item.label}
            </a>
          );
        })}
      </div>
      
      <div style={{ marginTop: "48px", padding: "16px", backgroundColor: "#fffbeb", borderRadius: "8px", fontSize: "13px" }}>
        <strong>Note:</strong> Some routes require authentication. Log in first, then visit the route. 
        Role-based access control will redirect you if you don't have permission.
      </div>
    </div>
  );
}
