import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "./auth";
import { emailService, getApplicationSubmittedEmail, getNewApplicationNotificationEmail } from "./email";

const prisma = new PrismaClient();
const router = Router();

router.get("/directory/coops", async (req, res) => {
  try {
    const coops = await prisma.tenant.findMany({
      where: { 
        status: "Active",
        directoryVisible: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        contactEmail: true,
        _count: {
          select: {
            classes: { where: { status: "Published" } },
            events: { where: { status: "Published" } },
            users: { where: { role: "FAMILY", applicationStatus: "APPROVED" } },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    res.json({ coops });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/directory/coops/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    
    const coop = await prisma.tenant.findUnique({
      where: { slug },
      include: {
        branding: true,
        classes: {
          where: { status: "Published" },
          include: {
            instructor: { select: { firstName: true, lastName: true } },
            _count: { select: { registrations: true, sessions: true } },
          },
        },
        events: {
          where: { status: "Published", date: { gte: new Date() } },
          orderBy: { date: "asc" },
        },
      },
    });

    if (!coop || coop.status !== "Active") {
      return res.status(404).json({ error: "Co-op not found" });
    }

    res.json({ coop });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/t/:tenantSlug/landing", async (req, res) => {
  try {
    const { tenantSlug } = req.params;
    
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      include: {
        branding: true,
        landingPage: true,
        announcements: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        classes: {
          where: { status: "Published" },
          include: {
            instructor: { select: { firstName: true, lastName: true } },
            sessions: { orderBy: { date: "asc" }, take: 1 },
            _count: { select: { registrations: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        events: {
          where: { status: "Published", date: { gte: new Date() } },
          orderBy: { date: "asc" },
          take: 5,
        },
      },
    });

    if (!tenant || tenant.status !== "Active") {
      return res.status(404).json({ error: "Co-op not found" });
    }

    const landingPage = tenant.landingPage || {
      layoutTemplate: "CLASSIC",
      headerImageUrl: null,
      headerImageTheme: null,
      aboutContent: null,
      pricingContent: null,
      showPublicClasses: true,
      showPublicEvents: true,
    };

    const filteredClasses = landingPage.showPublicClasses ? tenant.classes : [];
    const filteredEvents = landingPage.showPublicEvents ? tenant.events : [];

    res.json({ 
      tenant: {
        ...tenant,
        classes: filteredClasses,
        events: filteredEvents,
      },
      landingPage,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/t/:tenantSlug/apply", async (req, res) => {
  try {
    const { tenantSlug } = req.params;
    const { email, password, firstName, lastName, role, bio, phone, children } = req.body;

    if (!["FAMILY", "INSTRUCTOR"].includes(role)) {
      return res.status(400).json({ error: "Invalid role. Must be FAMILY or INSTRUCTOR" });
    }

    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant || tenant.status !== "Active") {
      return res.status(404).json({ error: "Co-op not found" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role,
        tenantId: tenant.id,
        applicationStatus: "PENDING",
        bio: role === "INSTRUCTOR" ? bio : null,
        phone,
        children: role === "FAMILY" && children?.length > 0 ? {
          create: children.map((child: any) => ({
            firstName: child.firstName,
            lastName: child.lastName,
            dateOfBirth: child.dateOfBirth ? new Date(child.dateOfBirth) : null,
          })),
        } : undefined,
      },
      include: { children: true },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        action: role === "FAMILY" ? "FAMILY_APPLICATION_SUBMITTED" : "INSTRUCTOR_APPLICATION_SUBMITTED",
        details: `${firstName} ${lastName} applied as ${role}`,
      },
    });

    // Send confirmation email to applicant
    const confirmationEmail = getApplicationSubmittedEmail(firstName, tenant.name, role as "FAMILY" | "INSTRUCTOR");
    await emailService.send({
      to: email,
      subject: confirmationEmail.subject,
      html: confirmationEmail.html,
      text: confirmationEmail.text,
    });

    // Notify co-op admins of new application
    const admins = await prisma.user.findMany({
      where: { tenantId: tenant.id, role: "COOP_ADMIN", isActive: true },
      select: { email: true },
    });

    const baseUrl = process.env.BASE_URL || "https://bramble.replit.app";
    const dashboardUrl = `${baseUrl}/app/admin/${role === "FAMILY" ? "families" : "instructors"}`;
    
    for (const admin of admins) {
      const notificationEmail = getNewApplicationNotificationEmail(
        `${firstName} ${lastName}`,
        email,
        tenant.name,
        role as "FAMILY" | "INSTRUCTOR",
        dashboardUrl
      );
      await emailService.send({
        to: admin.email,
        subject: notificationEmail.subject,
        html: notificationEmail.html,
        text: notificationEmail.text,
      });
    }

    res.status(201).json({ 
      message: "Application submitted successfully. You will be notified once reviewed.",
      applicationId: user.id,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
