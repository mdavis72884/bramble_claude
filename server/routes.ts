import type { Express } from "express";
import { createServer, type Server } from "http";
import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  comparePassword,
  hashPassword,
} from "./auth";
import {
  authMiddleware,
  requireRole,
  requireTenantAccess,
  auditLogger,
  AuthRequest,
} from "./middleware";
import { handleWebhook, stripe, createPaymentIntent } from "./stripe";
import tenantRoutes from "./tenantRoutes";
import publicRoutes from "./publicRoutes";
import familyRoutes from "./familyRoutes";
import instructorRoutes from "./instructorRoutes";
import chatRoutes from "./chatRoutes";
import { z } from "zod";
import {
  emailService,
  getApplicationReceivedEmail,
  getApplicationApprovedEmail,
  getApplicationDeniedEmail,
} from "./email";

const prisma = new PrismaClient();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Mount tenant admin routes
  app.use("/api/tenant", tenantRoutes);
  
  // Mount public routes
  app.use("/api", publicRoutes);
  
  // Mount family routes
  app.use("/api", familyRoutes);
  
  // Mount instructor routes
  app.use("/api", instructorRoutes);
  
  // Mount chat routes
  app.use("/api", chatRoutes);

  // ============================================
  // AUTH ROUTES
  // ============================================
  
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName, role, tenantId } = req.body;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(400).json({ error: "Email already exists" });
      }

      const passwordHash = await hashPassword(password);
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          role: role || "FAMILY",
          tenantId: tenantId || null,
        },
      });

      await prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: "USER_REGISTERED",
          details: `New user registered: ${user.email}`,
          metadata: { role: user.role },
        },
      });

      const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      };

      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);

      res.json({ user, accessToken, refreshToken });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValid = await comparePassword(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: "Account is inactive" });
      }

      await prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: "USER_LOGIN",
          details: `User logged in: ${user.email}`,
          metadata: { role: user.role },
        },
      });

      // Compute available portals for role switcher
      const availablePortals: string[] = [user.role];
      
      if (user.secondaryRoles && user.secondaryRoles.length > 0) {
        for (const role of user.secondaryRoles) {
          if (!availablePortals.includes(role)) {
            availablePortals.push(role);
          }
        }
      }
      
      // Check if user has children (can access Family portal)
      if (!availablePortals.includes("FAMILY")) {
        const hasChildren = await prisma.child.count({ where: { parentId: user.id } });
        if (hasChildren > 0) availablePortals.push("FAMILY");
      }
      
      // Check if user teaches classes (can access Instructor portal)
      if (!availablePortals.includes("INSTRUCTOR")) {
        const teachesClasses = await prisma.class.count({ where: { instructorId: user.id } });
        if (teachesClasses > 0) availablePortals.push("INSTRUCTOR");
      }

      const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      };

      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);

      res.json({ user, accessToken, refreshToken, availablePortals });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/refresh", async (req, res) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ error: "Refresh token required" });
      }

      const payload = verifyRefreshToken(refreshToken);
      const newAccessToken = generateAccessToken(payload);

      res.json({ accessToken: newAccessToken });
    } catch (error) {
      res.status(401).json({ error: "Invalid refresh token" });
    }
  });

  app.post("/api/auth/logout", authMiddleware, async (req: AuthRequest, res) => {
    try {
      await prisma.auditLog.create({
        data: {
          tenantId: req.user?.tenantId || null,
          userId: req.user?.userId || "",
          action: "USER_LOGOUT",
          details: "User logged out",
          metadata: {},
        },
      });
      res.json({ message: "Logged out successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user?.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          secondaryRoles: true,
          tenantId: true,
          isActive: true,
        },
      });

      // Determine available portals based on user data
      const availablePortals: string[] = [];
      
      if (user) {
        // Primary role always available
        availablePortals.push(user.role);
        
        // Add secondary roles assigned by admin
        if (user.secondaryRoles && user.secondaryRoles.length > 0) {
          for (const role of user.secondaryRoles) {
            if (!availablePortals.includes(role)) {
              availablePortals.push(role);
            }
          }
        }
        
        // Check if user has children (can access Family portal)
        if (!availablePortals.includes("FAMILY")) {
          const hasChildren = await prisma.child.count({ where: { parentId: user.id } });
          if (hasChildren > 0) availablePortals.push("FAMILY");
        }
        
        // Check if user teaches classes (can access Instructor portal)
        if (!availablePortals.includes("INSTRUCTOR")) {
          const teachesClasses = await prisma.class.count({ where: { instructorId: user.id } });
          if (teachesClasses > 0) availablePortals.push("INSTRUCTOR");
        }
      }

      let tenantName = null;
      if (user?.tenantId) {
        const tenant = await prisma.tenant.findUnique({ 
          where: { id: user.tenantId },
          select: { name: true }
        });
        tenantName = tenant?.name;
      }

      res.json({ 
        user: {
          ...user,
          tenantName,
          isImpersonating: req.user?.isImpersonating || false,
          originalUserId: req.user?.originalUserId || null,
        }, 
        availablePortals 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // TENANT ROUTES
  // ============================================
  
  app.get("/api/tenants", authMiddleware, requireRole("BRAMBLE_OPERATOR"), async (req, res) => {
    try {
      const tenants = await prisma.tenant.findMany({
        include: {
          _count: {
            select: {
              users: true,
              classes: true,
              events: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json({ tenants });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tenants", authMiddleware, requireRole("BRAMBLE_OPERATOR"), auditLogger("TENANT_CREATED"), async (req: AuthRequest, res) => {
    try {
      const { name, slug, contactEmail } = req.body;

      const tenant = await prisma.tenant.create({
        data: {
          name,
          slug,
          contactEmail,
          status: "Active",
          directoryVisible: true,
        },
      });

      res.json({ tenant });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tenants/:tenantId", authMiddleware, requireTenantAccess, async (req, res) => {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: req.params.tenantId },
        include: {
          _count: {
            select: {
              users: true,
              classes: true,
              events: true,
              payments: true,
            },
          },
        },
      });

      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      res.json({ tenant });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tenants/:tenantId/users", authMiddleware, requireRole("BRAMBLE_OPERATOR"), async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        where: { tenantId: req.params.tenantId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          applicationStatus: true,
          isActive: true,
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({ users });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/tenants/:tenantId", authMiddleware, requireRole("BRAMBLE_OPERATOR", "COOP_ADMIN"), requireTenantAccess, auditLogger("TENANT_UPDATED"), async (req, res) => {
    try {
      const { name, contactEmail, directoryVisible, status } = req.body;

      const tenant = await prisma.tenant.update({
        where: { id: req.params.tenantId },
        data: {
          ...(name && { name }),
          ...(contactEmail && { contactEmail }),
          ...(typeof directoryVisible === "boolean" && { directoryVisible }),
          ...(status && { status }),
        },
      });

      res.json({ tenant });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tenants/:tenantId/invite-admin", authMiddleware, requireRole("BRAMBLE_OPERATOR"), auditLogger("ADMIN_INVITED"), async (req: AuthRequest, res) => {
    try {
      const { tenantId } = req.params;
      const { firstName, lastName, email } = req.body;

      if (!firstName || !lastName || !email) {
        return res.status(400).json({ error: "First name, last name, and email are required" });
      }

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: "A user with this email already exists" });
      }

      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      const tempPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await hashPassword(tempPassword);

      const newAdmin = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email,
          passwordHash: hashedPassword,
          role: "COOP_ADMIN",
          applicationStatus: "PENDING",
          tenantId,
        },
      });

      console.log("=== SIMULATED EMAIL ===");
      console.log(`To: ${email}`);
      console.log(`Subject: You've been invited to manage ${tenant.name} on Bramble`);
      console.log(`Body:`);
      console.log(`Hello ${firstName},`);
      console.log(`You've been invited to be an administrator for ${tenant.name}.`);
      console.log(`Your temporary login credentials:`);
      console.log(`  Email: ${email}`);
      console.log(`  Password: ${tempPassword}`);
      console.log(`Please log in and change your password immediately.`);
      console.log("=== END EMAIL ===");

      res.json({ message: "Admin invitation sent", userId: newAdmin.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tenants/:tenantId/starter-pack", authMiddleware, requireRole("BRAMBLE_OPERATOR", "COOP_ADMIN"), requireTenantAccess, auditLogger("STARTER_PACK_APPLIED"), async (req, res) => {
    try {
      const { tenantId } = req.params;

      await prisma.emailTemplate.createMany({
        data: [
          {
            tenantId,
            key: `${tenantId}_welcome`,
            name: "Welcome to Co-op",
            subject: "Welcome!",
            htmlContent: "<h1>Welcome!</h1>",
            isGlobal: false,
          },
          {
            tenantId,
            key: `${tenantId}_reminder`,
            name: "Class Reminder",
            subject: "Class Reminder",
            htmlContent: "<p>Reminder about your class</p>",
            isGlobal: false,
          },
        ],
        skipDuplicates: true,
      });

      res.json({ message: "Starter pack applied successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // IMPERSONATION ROUTES (Bramble Operators Only)
  // ============================================

  app.post("/api/impersonate/:userId", authMiddleware, requireRole("BRAMBLE_OPERATOR"), auditLogger("USER_IMPERSONATED"), async (req: AuthRequest, res) => {
    try {
      const { userId } = req.params;
      const operatorId = req.user!.userId;

      if (req.user?.isImpersonating) {
        return res.status(400).json({ error: "Cannot impersonate while already impersonating. Stop impersonation first." });
      }

      const targetUser = await prisma.user.findUnique({ 
        where: { id: userId },
        include: { tenant: true }
      });

      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const impersonationPayload = {
        userId: targetUser.id,
        email: targetUser.email,
        role: targetUser.role,
        tenantId: targetUser.tenantId,
        isImpersonating: true,
        originalUserId: operatorId,
      };

      const accessToken = generateAccessToken(impersonationPayload);
      const refreshToken = generateRefreshToken(impersonationPayload);

      console.log(`=== IMPERSONATION STARTED ===`);
      console.log(`Operator ${operatorId} is now impersonating user ${targetUser.email} (${targetUser.firstName} ${targetUser.lastName})`);
      console.log(`=== END ===`);

      res.json({
        accessToken,
        refreshToken,
        user: {
          id: targetUser.id,
          firstName: targetUser.firstName,
          lastName: targetUser.lastName,
          email: targetUser.email,
          role: targetUser.role,
          tenantId: targetUser.tenantId,
          tenantName: targetUser.tenant?.name,
          isImpersonating: true,
          originalUserId: operatorId,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/stop-impersonation", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (!req.user?.isImpersonating || !req.user?.originalUserId) {
        return res.status(400).json({ error: "Not currently impersonating" });
      }

      const originalUser = await prisma.user.findUnique({
        where: { id: req.user.originalUserId },
        include: { tenant: true },
      });

      if (!originalUser) {
        return res.status(404).json({ error: "Original user not found" });
      }

      const payload = {
        userId: originalUser.id,
        email: originalUser.email,
        role: originalUser.role,
        tenantId: originalUser.tenantId,
      };

      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);

      console.log(`=== IMPERSONATION STOPPED ===`);
      console.log(`Operator ${originalUser.email} has stopped impersonating`);
      console.log(`=== END ===`);

      // Compute available portals for the original user (same logic as login)
      const allUserAccounts = await prisma.user.findMany({
        where: { email: originalUser.email },
        select: { role: true },
      });
      const availablePortals = Array.from(new Set(allUserAccounts.map(u => u.role)));

      res.json({
        accessToken,
        refreshToken,
        user: {
          id: originalUser.id,
          firstName: originalUser.firstName,
          lastName: originalUser.lastName,
          email: originalUser.email,
          role: originalUser.role,
          tenantId: originalUser.tenantId,
          tenantName: originalUser.tenant?.name,
        },
        availablePortals,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // PAYMENT ROUTES
  // ============================================
  
  app.get("/api/payments", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const where: any = {};

      if (req.user?.role !== "BRAMBLE_OPERATOR") {
        where.tenantId = req.user?.tenantId;
      }

      if (req.query.tenantId) {
        where.tenantId = req.query.tenantId;
      }

      if (req.query.status) {
        where.status = req.query.status;
      }

      const payments = await prisma.payment.findMany({
        where,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          tenant: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      res.json({ payments });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/payouts", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const where: any = {};

      if (req.user?.role !== "BRAMBLE_OPERATOR") {
        where.tenantId = req.user?.tenantId;
      }

      if (req.query.tenantId) {
        where.tenantId = req.query.tenantId;
      }

      if (req.query.status) {
        where.status = req.query.status;
      }

      const payouts = await prisma.payout.findMany({
        where,
        include: {
          tenant: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { scheduledFor: "desc" },
        take: 100,
      });

      res.json({ payouts });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/payouts/:payoutId/mark-paid", authMiddleware, requireRole("BRAMBLE_OPERATOR"), auditLogger("PAYOUT_MARKED_PAID"), async (req, res) => {
    try {
      const payout = await prisma.payout.update({
        where: { id: req.params.payoutId },
        data: {
          status: "PAID",
          paidAt: new Date(),
        },
      });

      res.json({ payout });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // FEE RULE ROUTES
  // ============================================
  
  app.get("/api/fee-rules", authMiddleware, requireRole("BRAMBLE_OPERATOR"), async (req, res) => {
    try {
      const feeRules = await prisma.feeRule.findMany({
        orderBy: { effectiveDate: "desc" },
      });
      res.json({ feeRules });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/fee-rules", authMiddleware, requireRole("BRAMBLE_OPERATOR"), auditLogger("FEE_RULE_CREATED"), async (req, res) => {
    try {
      const { type, value, effectiveDate } = req.body;

      const feeRule = await prisma.feeRule.create({
        data: {
          type,
          value,
          effectiveDate: new Date(effectiveDate),
          status: "Active",
        },
      });

      res.json({ feeRule });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/fee-rules/:feeRuleId", authMiddleware, requireRole("BRAMBLE_OPERATOR"), auditLogger("FEE_RULE_UPDATED"), async (req, res) => {
    try {
      const { value, status } = req.body;

      const feeRule = await prisma.feeRule.update({
        where: { id: req.params.feeRuleId },
        data: {
          ...(value && { value }),
          ...(status && { status }),
        },
      });

      res.json({ feeRule });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // EMAIL SYSTEM ROUTES
  // ============================================
  
  app.get("/api/email/logs", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const where: any = {};

      if (req.user?.role !== "BRAMBLE_OPERATOR") {
        where.tenantId = req.user?.tenantId;
      }

      if (req.query.tenantId) {
        where.tenantId = req.query.tenantId;
      }

      if (req.query.status) {
        where.status = req.query.status;
      }

      if (req.query.search) {
        where.OR = [
          { recipientEmail: { contains: req.query.search as string } },
          { subject: { contains: req.query.search as string } },
        ];
      }

      const logs = await prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      res.json({ logs });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/email/templates", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const where: any = {
        OR: [
          { isGlobal: true },
          { tenantId: req.user?.tenantId },
        ],
      };

      const templates = await prisma.emailTemplate.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      res.json({ templates });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/email/templates", authMiddleware, requireRole("BRAMBLE_OPERATOR", "COOP_ADMIN"), auditLogger("EMAIL_TEMPLATE_CREATED"), async (req: AuthRequest, res) => {
    try {
      const { key, name, subject, htmlContent, textContent } = req.body;

      const template = await prisma.emailTemplate.create({
        data: {
          key,
          name,
          subject,
          htmlContent,
          textContent,
          tenantId: req.user?.role === "BRAMBLE_OPERATOR" ? null : req.user?.tenantId,
          isGlobal: req.user?.role === "BRAMBLE_OPERATOR",
        },
      });

      res.json({ template });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/email/templates/:templateId", authMiddleware, requireRole("BRAMBLE_OPERATOR", "COOP_ADMIN"), auditLogger("EMAIL_TEMPLATE_UPDATED"), async (req, res) => {
    try {
      const { name, subject, htmlContent, textContent } = req.body;

      const template = await prisma.emailTemplate.update({
        where: { id: req.params.templateId },
        data: {
          ...(name && { name }),
          ...(subject && { subject }),
          ...(htmlContent && { htmlContent }),
          ...(textContent && { textContent }),
        },
      });

      res.json({ template });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/email/templates/:templateId", authMiddleware, requireRole("BRAMBLE_OPERATOR", "COOP_ADMIN"), auditLogger("EMAIL_TEMPLATE_DELETED"), async (req, res) => {
    try {
      await prisma.emailTemplate.delete({
        where: { id: req.params.templateId },
      });

      res.json({ message: "Template deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/email/automations", authMiddleware, requireRole("BRAMBLE_OPERATOR"), async (req, res) => {
    try {
      const automations = await prisma.emailAutomation.findMany({
        orderBy: { createdAt: "desc" },
      });
      res.json({ automations });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/email/send", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { recipientEmail, subject, htmlContent, templateKey } = req.body;

      if (!recipientEmail || !subject || !htmlContent) {
        return res.status(400).json({ error: "Recipient email, subject, and content are required" });
      }

      const success = await emailService.send({
        to: recipientEmail,
        subject,
        html: htmlContent,
        text: htmlContent.replace(/<[^>]*>/g, ''),
      });

      const emailLog = await prisma.emailLog.create({
        data: {
          tenantId: req.user?.tenantId,
          recipientEmail,
          subject,
          templateKey,
          status: success ? "SENT" : "FAILED",
          sentAt: new Date(),
          metadata: { htmlContent },
        },
      });

      if (success) {
        res.json({ emailLog, message: "Email sent successfully" });
      } else {
        res.status(500).json({ emailLog, error: "Failed to send email" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/email/test", authMiddleware, requireRole("BRAMBLE_OPERATOR"), async (req: AuthRequest, res) => {
    try {
      const { recipientEmail } = req.body;

      if (!recipientEmail) {
        return res.status(400).json({ error: "Recipient email is required" });
      }

      const success = await emailService.send({
        to: recipientEmail,
        subject: "Bramble Test Email",
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #7C9082;">Test Email Successful!</h1>
            <p>This is a test email from your Bramble platform.</p>
            <p>If you received this, your email configuration is working correctly.</p>
            <p style="color: #666; font-size: 14px; margin-top: 32px;">— The Bramble Team</p>
          </div>
        `,
        text: "Test Email Successful!\n\nThis is a test email from your Bramble platform.\n\nIf you received this, your email configuration is working correctly.\n\n— The Bramble Team",
      });

      if (success) {
        await prisma.emailLog.create({
          data: {
            recipientEmail,
            subject: "Bramble Test Email",
            templateKey: "test_email",
            status: "SENT",
            sentAt: new Date(),
            metadata: { htmlContent: "Test email" },
          },
        });

        res.json({ success: true, message: "Test email sent successfully" });
      } else {
        res.status(500).json({ success: false, error: "Failed to send test email" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // STRIPE ROUTES
  // ============================================
  
  app.post("/api/stripe/create-payment-intent", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { amount, description, metadata } = req.body;

      const result = await createPaymentIntent(
        amount,
        req.user?.tenantId || "",
        req.user?.userId || "",
        description,
        metadata
      );

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/stripe/webhook", async (req, res) => {
    if (!stripe) {
      return res.status(503).json({ error: "Stripe is not configured" });
    }

    const sig = req.headers["stripe-signature"];
    
    if (!sig) {
      return res.status(400).send("Missing stripe signature");
    }

    try {
      const event = stripe.webhooks.constructEvent(
        req.rawBody as Buffer,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET || ""
      );

      await handleWebhook(event);

      res.json({ received: true });
    } catch (error: any) {
      console.error("Webhook error:", error.message);
      res.status(400).send(`Webhook Error: ${error.message}`);
    }
  });

  // ============================================
  // CO-OP APPLICATION ROUTES (Public + Operator)
  // ============================================

  app.get("/api/coop-applications/check-duplicates", async (req, res) => {
    try {
      const { email, name } = req.query;

      if (!email || !name) {
        return res.status(400).json({ error: "Email and name are required" });
      }

      const emailExists = await prisma.coopApplication.findFirst({
        where: { applicantEmail: email as string },
      });

      const similarName = await prisma.coopApplication.findFirst({
        where: {
          coopName: {
            contains: (name as string).toLowerCase(),
            mode: "insensitive",
          },
        },
        select: { coopName: true },
      });

      const tenantWithName = await prisma.tenant.findFirst({
        where: {
          name: {
            contains: (name as string).toLowerCase(),
            mode: "insensitive",
          },
        },
        select: { name: true },
      });

      res.json({
        emailExists: !!emailExists,
        nameExists: !!similarName || !!tenantWithName,
        similarName: similarName?.coopName || tenantWithName?.name || null,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const coopApplicationSchema = z.object({
    coopName: z.string().min(1, "Co-op name is required"),
    location: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    estimatedSize: z.string().optional().nullable(),
    applicantName: z.string().min(1, "Applicant name is required"),
    applicantEmail: z.string().email("Valid email is required"),
    applicantPhone: z.string().optional().nullable(),
    whyStartingCoop: z.string().optional().nullable(),
  });

  app.post("/api/coop-applications", async (req, res) => {
    try {
      const parseResult = coopApplicationSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: parseResult.error.errors[0]?.message || "Invalid input",
        });
      }

      const {
        coopName,
        location,
        description,
        estimatedSize,
        applicantName,
        applicantEmail,
        applicantPhone,
        whyStartingCoop,
      } = parseResult.data;

      const existingEmail = await prisma.coopApplication.findFirst({
        where: { applicantEmail },
      });

      if (existingEmail) {
        return res.status(400).json({
          error: "An application with this email already exists",
        });
      }

      const application = await prisma.coopApplication.create({
        data: {
          coopName,
          location: location || null,
          description: description || null,
          estimatedSize: estimatedSize || null,
          applicantName,
          applicantEmail,
          applicantPhone: applicantPhone || null,
          whyStartingCoop: whyStartingCoop || null,
        },
      });

      const emailContent = getApplicationReceivedEmail(coopName);
      await emailService.send({
        to: applicantEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      res.status(201).json({ application });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get(
    "/api/coop-applications/pending-count",
    authMiddleware,
    requireRole("BRAMBLE_OPERATOR"),
    async (req: AuthRequest, res) => {
      try {
        const count = await prisma.coopApplication.count({
          where: { status: "PENDING" },
        });
        res.json({ count });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.get(
    "/api/coop-applications",
    authMiddleware,
    requireRole("BRAMBLE_OPERATOR"),
    async (req: AuthRequest, res) => {
      try {
        const { status } = req.query;

        const where: any = {};
        if (status && status !== "all") {
          where.status = status;
        }

        const applications = await prisma.coopApplication.findMany({
          where,
          orderBy: { createdAt: "desc" },
        });

        res.json({ applications });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.get(
    "/api/coop-applications/:id",
    authMiddleware,
    requireRole("BRAMBLE_OPERATOR"),
    async (req: AuthRequest, res) => {
      try {
        const application = await prisma.coopApplication.findUnique({
          where: { id: req.params.id },
        });

        if (!application) {
          return res.status(404).json({ error: "Application not found" });
        }

        res.json({ application });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  const applicationReviewSchema = z.object({
    status: z.enum(["APPROVED", "DENIED"]).optional(),
    operatorNotes: z.string().optional().nullable(),
  });

  app.patch(
    "/api/coop-applications/:id",
    authMiddleware,
    requireRole("BRAMBLE_OPERATOR"),
    async (req: AuthRequest, res) => {
      try {
        const parseResult = applicationReviewSchema.safeParse(req.body);
        if (!parseResult.success) {
          return res.status(400).json({
            error: parseResult.error.errors[0]?.message || "Invalid input",
          });
        }

        const { status, operatorNotes } = parseResult.data;
        const applicationId = req.params.id;

        const application = await prisma.coopApplication.findUnique({
          where: { id: applicationId },
        });

        if (!application) {
          return res.status(404).json({ error: "Application not found" });
        }

        const baseUrl = `${req.protocol}://${req.get("host")}`;

        if (status === "APPROVED") {
          const result = await prisma.$transaction(async (tx) => {
            const slug = application.coopName
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "");

            const existingSlug = await tx.tenant.findUnique({
              where: { slug },
            });

            const finalSlug = existingSlug
              ? `${slug}-${Date.now().toString(36)}`
              : slug;

            const tenant = await tx.tenant.create({
              data: {
                name: application.coopName,
                slug: finalSlug,
                contactEmail: application.applicantEmail,
                status: "Active",
                directoryVisible: true,
              },
            });

            const nameParts = application.applicantName.split(" ");
            const firstName = nameParts[0] || "Admin";
            const lastName = nameParts.slice(1).join(" ") || "";

            const tempPassword = await hashPassword(
              `temp-${Date.now()}-${Math.random().toString(36)}`
            );

            const user = await tx.user.create({
              data: {
                email: application.applicantEmail,
                passwordHash: tempPassword,
                firstName,
                lastName,
                role: "COOP_ADMIN",
                tenantId: tenant.id,
                applicationStatus: "APPROVED",
              },
            });

            const token = `ml_${Date.now().toString(36)}_${Math.random()
              .toString(36)
              .substring(2, 15)}`;
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            await tx.magicLink.create({
              data: {
                token,
                email: application.applicantEmail,
                userId: user.id,
                expiresAt,
              },
            });

            await tx.auditLog.create({
              data: {
                tenantId: tenant.id,
                userId: req.user?.userId,
                action: "COOP_APPLICATION_APPROVED",
                details: `Co-op application approved: ${application.coopName}`,
                metadata: { applicationId, tenantId: tenant.id },
              },
            });

            const updated = await tx.coopApplication.update({
              where: { id: applicationId },
              data: {
                status: "APPROVED",
                operatorNotes,
                reviewedAt: new Date(),
                reviewedBy: req.user?.userId,
                createdTenantId: tenant.id,
              },
            });

            return { updated, tenant, token };
          });

          const emailContent = getApplicationApprovedEmail(
            application.coopName,
            application.applicantName,
            result.token,
            baseUrl
          );
          await emailService.send({
            to: application.applicantEmail,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
          });

          res.json({ application: result.updated });
        } else if (status === "DENIED") {
          const updated = await prisma.$transaction(async (tx) => {
            await tx.auditLog.create({
              data: {
                tenantId: null,
                userId: req.user?.userId,
                action: "COOP_APPLICATION_DENIED",
                details: `Co-op application denied: ${application.coopName}`,
                metadata: { applicationId },
              },
            });

            return tx.coopApplication.update({
              where: { id: applicationId },
              data: {
                status: "DENIED",
                operatorNotes,
                reviewedAt: new Date(),
                reviewedBy: req.user?.userId,
              },
            });
          });

          const emailContent = getApplicationDeniedEmail(
            application.coopName,
            application.applicantName
          );
          await emailService.send({
            to: application.applicantEmail,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
          });

          res.json({ application: updated });
        } else {
          const updated = await prisma.coopApplication.update({
            where: { id: applicationId },
            data: {
              operatorNotes,
              reviewedAt: new Date(),
              reviewedBy: req.user?.userId,
            },
          });
          res.json({ application: updated });
        }
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/coop-applications/:id/email",
    authMiddleware,
    requireRole("BRAMBLE_OPERATOR"),
    async (req: AuthRequest, res) => {
      try {
        const { subject, body } = req.body;
        const applicationId = req.params.id;

        if (!subject || !body) {
          return res.status(400).json({ error: "Subject and body are required" });
        }

        const application = await prisma.coopApplication.findUnique({
          where: { id: applicationId },
        });

        if (!application) {
          return res.status(404).json({ error: "Application not found" });
        }

        const success = await emailService.send({
          to: application.applicantEmail,
          subject,
          html: `
            <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
              ${body}
              <p style="color: #666; font-size: 14px; margin-top: 32px;">— The Bramble Team</p>
            </div>
          `,
          text: body.replace(/<[^>]*>/g, ''),
        });

        if (success) {
          await prisma.emailLog.create({
            data: {
              recipientEmail: application.applicantEmail,
              subject,
              templateKey: "operator_message",
              status: "SENT",
              sentAt: new Date(),
              metadata: { applicationId, body, sentBy: req.user?.userId },
            },
          });

          await prisma.auditLog.create({
            data: {
              tenantId: null,
              userId: req.user?.userId,
              action: "OPERATOR_EMAIL_SENT",
              details: `Email sent to applicant: ${application.applicantEmail}`,
              metadata: { applicationId, subject },
            },
          });

          res.json({ success: true, message: "Email sent successfully" });
        } else {
          res.status(500).json({ success: false, error: "Failed to send email" });
        }
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // ============================================
  // MAGIC LINK AUTH ROUTES
  // ============================================

  app.get("/api/auth/validate-magic-link", async (req, res) => {
    try {
      const { token } = req.query;

      if (!token) {
        return res.json({ valid: false });
      }

      const magicLink = await prisma.magicLink.findUnique({
        where: { token: token as string },
      });

      if (!magicLink) {
        return res.json({ valid: false });
      }

      if (magicLink.usedAt) {
        return res.json({ valid: false, used: true });
      }

      if (new Date() > magicLink.expiresAt) {
        return res.json({ valid: false, expired: true });
      }

      res.json({
        valid: true,
        email: magicLink.email,
        userId: magicLink.userId,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/set-password", async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ error: "Token and password are required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }

      const magicLink = await prisma.magicLink.findUnique({
        where: { token },
      });

      if (!magicLink) {
        return res.status(400).json({ error: "Invalid token" });
      }

      if (magicLink.usedAt) {
        return res.status(400).json({ error: "This link has already been used" });
      }

      if (new Date() > magicLink.expiresAt) {
        return res.status(400).json({ error: "This link has expired" });
      }

      if (!magicLink.userId) {
        return res.status(400).json({ error: "No user associated with this link" });
      }

      const passwordHash = await hashPassword(password);

      await prisma.user.update({
        where: { id: magicLink.userId },
        data: { passwordHash },
      });

      await prisma.magicLink.update({
        where: { id: magicLink.id },
        data: { usedAt: new Date() },
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // AUDIT LOG ROUTES
  // ============================================
  
  app.get("/api/audit-logs", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const where: any = {};

      if (req.user?.role !== "BRAMBLE_OPERATOR") {
        where.tenantId = req.user?.tenantId;
      }

      if (req.query.tenantId) {
        where.tenantId = req.query.tenantId;
      }

      if (req.query.action) {
        where.action = req.query.action;
      }

      const logs = await prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          tenant: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      res.json({ logs });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
