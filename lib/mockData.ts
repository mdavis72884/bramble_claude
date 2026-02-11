import { addDays, subDays, format } from "date-fns";

export const tenants = [
  {
    id: "1",
    name: "Oak Hallow Co-op",
    slug: "oak-hollow",
    status: "Active",
    members: 142,
    nextPayout: "2025-01-05",
    balance: 4250.00,
    contactEmail: "admin@oakhollow.edu",
    joinedAt: "2024-08-15",
  },
  {
    id: "2",
    name: "River Valley Homeschoolers",
    slug: "river-valley",
    status: "Active",
    members: 89,
    nextPayout: "2025-01-05",
    balance: 1205.50,
    contactEmail: "sarah@rivervalley.org",
    joinedAt: "2024-09-01",
  },
  {
    id: "3",
    name: "Maplewood Learning Collective",
    slug: "maplewood",
    status: "Onboarding",
    members: 0,
    nextPayout: "-",
    balance: 0.00,
    contactEmail: "hello@maplewood.com",
    joinedAt: "2024-12-10",
    directoryVisible: false,
  },
];

export const payouts = [
  { id: "po_001", date: "2024-12-15", recipient: "Oak Hallow Co-op", amount: 1250.00, status: "Paid", method: "Stripe Connect" },
  { id: "po_002", date: "2024-12-15", recipient: "River Valley Homeschoolers", amount: 840.50, status: "Paid", method: "Stripe Connect" },
  { id: "po_003", date: "2024-12-08", recipient: "Oak Hallow Co-op", amount: 1100.00, status: "Paid", method: "Stripe Connect" },
];

export const emailLogs = [
  { id: "email_001", date: subDays(new Date(), 0).toISOString(), recipient: "admin@oakhollow.edu", subject: "Weekly Payout Report", status: "Sent", template: "payout_summary" },
  { id: "email_002", date: subDays(new Date(), 0).toISOString(), recipient: "sarah@rivervalley.org", subject: "New Member Registration", status: "Delivered", template: "member_welcome" },
  { id: "email_003", date: subDays(new Date(), 1).toISOString(), recipient: "newuser@gmail.com", subject: "Welcome to Bramble", status: "Opened", template: "platform_invite" },
  { id: "email_004", date: subDays(new Date(), 2).toISOString(), recipient: "admin@maplewood.com", subject: "Action Required: Complete Onboarding", status: "Bounced", template: "onboarding_reminder" },
];

export const emailTemplates = [
  { id: "tmpl_001", name: "Welcome to Bramble", key: "platform_invite", lastUpdated: "2024-11-20", subject: "Welcome to {coop_name}" },
  { id: "tmpl_002", name: "Weekly Payout Summary", key: "payout_summary", lastUpdated: "2024-10-15", subject: "Your payout of {amount} is on the way" },
  { id: "tmpl_003", name: "New Registration Alert", key: "admin_reg_alert", lastUpdated: "2024-09-01", subject: "New registration for {class_name}" },
];

export const recentTransactions = [
  { id: "tx_001", date: subDays(new Date(), 0).toISOString(), description: "Class Registration: Biology 101", amount: 150.00, tenant: "Oak Hallow Co-op", status: "Succeeded" },
  { id: "tx_002", date: subDays(new Date(), 0).toISOString(), description: "Class Registration: Art History", amount: 85.00, tenant: "Oak Hallow Co-op", status: "Succeeded" },
  { id: "tx_003", date: subDays(new Date(), 1).toISOString(), description: "Event: Fall Festival", amount: 25.00, tenant: "River Valley", status: "Succeeded" },
  { id: "tx_004", date: subDays(new Date(), 1).toISOString(), description: "Refund: Math Club", amount: -45.00, tenant: "Oak Hallow Co-op", status: "Refunded" },
  { id: "tx_005", date: subDays(new Date(), 2).toISOString(), description: "Class Registration: Chemistry", amount: 160.00, tenant: "River Valley", status: "Succeeded" },
];

export const auditLogs = [
  { id: "log_001", action: "TENANT_CREATED", user: "Admin User", details: "Created new tenant: Maplewood Learning Collective", timestamp: subDays(new Date(), 5).toISOString() },
  { id: "log_002", action: "FEE_RULE_UPDATED", user: "Admin User", details: "Updated platform fee to 2.5%", timestamp: subDays(new Date(), 6).toISOString() },
  { id: "log_003", action: "PAYOUT_PROCESSED", user: "System Job", details: "Processed weekly payout for Oak Hallow", timestamp: subDays(new Date(), 7).toISOString() },
  { id: "log_004", action: "USER_LOGIN", user: "Co-op Admin (Oak)", details: "Successful login", timestamp: subDays(new Date(), 0).toISOString() },
];

export const feeRules = [
  { id: "1", type: "Platform Fee", value: "2.5%", effectiveDate: "2024-01-01", status: "Active" },
  { id: "2", type: "Stripe Processing", value: "2.9% + $0.30", effectiveDate: "2024-01-01", status: "Active" },
  { id: "3", type: "Instructor Payout Fee", value: "$2.00", effectiveDate: "2024-06-01", status: "Active" },
];
