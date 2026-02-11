import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { authMiddleware, requireRole, AuthRequest, auditLogger } from "./middleware";
import { emailService, getFamilyDeniedEmail, getInstructorDeniedEmail } from "./email";

const prisma = new PrismaClient();
const router = Router();

async function requireCoopAdmin(req: AuthRequest, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  // Check if user has COOP_ADMIN access via primary or secondary roles
  if (req.user.role !== "COOP_ADMIN") {
    // Check secondary roles from database
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { secondaryRoles: true, tenantId: true }
    });
    
    if (!user?.secondaryRoles?.includes("COOP_ADMIN")) {
      return res.status(403).json({ error: "Co-op Admin access required" });
    }
    
    // Use the user's tenantId from the database for secondary role access
    if (user.tenantId) {
      req.user.tenantId = user.tenantId;
    }
  }
  
  if (!req.user.tenantId) {
    return res.status(403).json({ error: "No tenant associated with user" });
  }
  next();
}

router.get("/dashboard", authMiddleware, requireCoopAdmin, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;

    const [
      totalFamilies,
      totalInstructors,
      legacyClassCount,
      offeringCount,
      totalEvents,
      pendingFamilies,
      pendingInstructors,
      legacyPendingClasses,
      pendingOfferings,
      pendingEventProposals,
      recentPayments,
      totalRevenue,
    ] = await Promise.all([
      prisma.user.count({ where: { tenantId, role: "FAMILY" } }),
      prisma.user.count({ where: { tenantId, role: "INSTRUCTOR" } }),
      prisma.class.count({ where: { tenantId } }),
      prisma.offering.count({ where: { tenantId, isArchived: false } }),
      prisma.event.count({ where: { tenantId } }),
      prisma.user.count({ where: { tenantId, role: "FAMILY", applicationStatus: "PENDING" } }),
      prisma.user.count({ where: { tenantId, role: "INSTRUCTOR", applicationStatus: "PENDING" } }),
      prisma.class.count({ where: { tenantId, status: "Pending Approval" } }),
      prisma.offering.count({ where: { tenantId, status: "Pending Approval", isArchived: false } }),
      prisma.event.count({ where: { tenantId, status: "Pending Approval" } }),
      prisma.payment.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.payment.aggregate({
        where: { tenantId, status: "SUCCEEDED" },
        _sum: { amount: true },
      }),
    ]);

    // Combine legacy classes and new offerings for total count
    const totalClasses = legacyClassCount + offeringCount;
    const pendingClassProposals = legacyPendingClasses + pendingOfferings;

    res.json({
      totalFamilies,
      totalInstructors,
      totalClasses,
      totalOfferings: offeringCount,
      totalEvents,
      pendingFamilies,
      pendingInstructors,
      pendingClassProposals,
      pendingOfferings,
      pendingEventProposals,
      recentPayments,
      totalRevenue: totalRevenue._sum.amount || 0,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/pending-counts", authMiddleware, requireCoopAdmin, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;

    const [pendingFamilies, pendingInstructors, legacyPendingClasses, pendingOfferings, pendingEvents] = await Promise.all([
      prisma.user.count({ where: { tenantId, role: "FAMILY", applicationStatus: "PENDING" } }),
      prisma.user.count({ where: { tenantId, role: "INSTRUCTOR", applicationStatus: "PENDING" } }),
      prisma.class.count({ where: { tenantId, status: "Pending Approval" } }),
      prisma.offering.count({ where: { tenantId, status: "Pending Approval", isArchived: false } }),
      prisma.event.count({ where: { tenantId, status: "Pending Approval" } }),
    ]);

    // Combine legacy classes and new offerings for total pending count
    const pendingClasses = legacyPendingClasses + pendingOfferings;

    res.json({
      pendingFamilies,
      pendingInstructors,
      pendingClasses,
      pendingOfferings,
      pendingEvents,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/calendar", authMiddleware, requireCoopAdmin, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;

    const [classSessions, offeringClasses, events] = await Promise.all([
      // Legacy class sessions
      prisma.classSession.findMany({
        where: { class: { tenantId } },
        include: {
          class: {
            select: { id: true, title: true, instructor: { select: { firstName: true, lastName: true } } },
          },
        },
        orderBy: { date: "asc" },
      }),
      // New offering classes
      prisma.offeringClass.findMany({
        where: { offering: { tenantId, isArchived: false } },
        include: {
          offering: {
            select: { 
              id: true, 
              course: { select: { title: true } },
              instructor: { select: { firstName: true, lastName: true } } 
            },
          },
        },
        orderBy: { date: "asc" },
      }),
      prisma.event.findMany({
        where: { tenantId },
        orderBy: { date: "asc" },
      }),
    ]);

    const calendarEvents = [
      // Legacy class sessions
      ...classSessions.map((session) => ({
        type: "class_session",
        id: session.id,
        classId: session.classId,
        title: session.class.title,
        instructor: `${session.class.instructor.firstName} ${session.class.instructor.lastName}`,
        date: session.date.toISOString(),
        startTime: session.startTime,
        endTime: session.endTime,
        location: session.location,
        locationDetails: session.locationDetails,
      })),
      // New offering classes
      ...offeringClasses.map((oc) => ({
        type: "offering_class",
        id: oc.id,
        offeringId: oc.offeringId,
        title: oc.offering.course.title,
        instructor: `${oc.offering.instructor.firstName} ${oc.offering.instructor.lastName}`,
        date: oc.date.toISOString(),
        startTime: oc.startTime,
        endTime: oc.endTime,
        location: oc.location,
        locationDetails: oc.locationDetails,
      })),
      ...events.map((event) => ({
        type: "event",
        id: event.id,
        title: event.title,
        description: event.description,
        date: event.date.toISOString(),
        location: event.location,
        locationDetails: event.locationDetails,
        price: event.price,
      })),
    ];

    res.json({ calendarEvents });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/classes", authMiddleware, requireCoopAdmin, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const classes = await prisma.class.findMany({
      where: { tenantId },
      include: {
        instructor: { select: { id: true, firstName: true, lastName: true, email: true, bio: true } },
        _count: { select: { registrations: true, sessions: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ classes });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/classes", authMiddleware, requireCoopAdmin, auditLogger("CLASS_CREATED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { title, description, price, capacity, instructorId, status, imageUrl, materialsUrl, ageMin, ageMax, gradeMin, gradeMax, prerequisites } = req.body;

    const classItem = await prisma.class.create({
      data: {
        tenant: { connect: { id: tenantId } },
        ...(instructorId && { instructor: { connect: { id: instructorId } } }),
        title,
        description,
        price,
        capacity,
        status: status || "Draft",
        imageUrl,
        materialsUrl,
        ageMin,
        ageMax,
        gradeMin,
        gradeMax,
        prerequisites,
      },
    });
    res.json({ class: classItem });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/classes/:classId", authMiddleware, requireCoopAdmin, auditLogger("CLASS_UPDATED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { classId } = req.params;
    
    const existing = await prisma.class.findFirst({ 
      where: { id: classId, tenantId },
      include: { 
        instructor: { select: { email: true, firstName: true } },
        tenant: { select: { name: true } }
      }
    });
    if (!existing) {
      return res.status(404).json({ error: "Class not found" });
    }

    const classItem = await prisma.class.update({
      where: { id: classId },
      data: req.body,
    });

    // Send email notification to instructor when class is approved (status changes to Published)
    if (req.body.status === "Published" && existing.status === "Pending Approval" && existing.instructor?.email) {
      emailService.send({
        to: existing.instructor.email,
        subject: `Your class "${existing.title}" has been approved!`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7C9082;">Great News, ${existing.instructor.firstName}!</h2>
            <p>Your class <strong>"${existing.title}"</strong> has been approved and is now published at ${existing.tenant?.name || 'your co-op'}.</p>
            <p>Families can now view and enroll in your class.</p>
            <p style="margin-top: 24px;">
              <a href="${process.env.REPLIT_DEV_DOMAIN ? 'https://' + process.env.REPLIT_DEV_DOMAIN : ''}/app/instructor" 
                 style="background: #7C9082; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Your Classes
              </a>
            </p>
            <p style="color: #666; font-size: 12px; margin-top: 32px;">
              This is an automated notification from Bramble.
            </p>
          </div>
        `,
        text: `Great news! Your class "${existing.title}" has been approved and is now published. Families can now view and enroll in your class.`,
      });
    }

    res.json({ class: classItem });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/classes/:classId", authMiddleware, requireCoopAdmin, auditLogger("CLASS_DELETED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { classId } = req.params;

    await prisma.class.deleteMany({ where: { id: classId, tenantId } });
    res.json({ message: "Class deleted" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Archive/unarchive classes
router.patch("/classes/:classId/archive", authMiddleware, requireCoopAdmin, auditLogger("CLASS_ARCHIVED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { classId } = req.params;

    await prisma.class.updateMany({
      where: { id: classId, tenantId },
      data: { isArchived: true },
    });
    res.json({ message: "Class archived" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/classes/:classId/unarchive", authMiddleware, requireCoopAdmin, auditLogger("CLASS_UNARCHIVED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { classId } = req.params;

    await prisma.class.updateMany({
      where: { id: classId, tenantId },
      data: { isArchived: false },
    });
    res.json({ message: "Class restored from archive" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Session management endpoints
router.get("/classes/:classId/sessions", authMiddleware, requireCoopAdmin, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { classId } = req.params;

    const classItem = await prisma.class.findFirst({ where: { id: classId, tenantId } });
    if (!classItem) {
      return res.status(404).json({ error: "Class not found" });
    }

    const sessions = await prisma.classSession.findMany({
      where: { classId },
      orderBy: { date: "asc" },
    });
    res.json({ sessions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/classes/:classId/sessions", authMiddleware, requireCoopAdmin, auditLogger("SESSIONS_CREATED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { classId } = req.params;
    const { sessions } = req.body;

    const classItem = await prisma.class.findFirst({ where: { id: classId, tenantId } });
    if (!classItem) {
      return res.status(404).json({ error: "Class not found" });
    }

    if (!Array.isArray(sessions) || sessions.length === 0) {
      return res.status(400).json({ error: "Sessions array is required" });
    }

    const createdSessions = await prisma.classSession.createMany({
      data: sessions.map((s: any) => ({
        classId,
        date: new Date(s.date),
        startTime: s.startTime,
        endTime: s.endTime,
        location: s.location || null,
        locationDetails: s.locationDetails || null,
      })),
    });

    res.json({ message: `Created ${createdSessions.count} sessions`, count: createdSessions.count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/classes/:classId/sessions/:sessionId", authMiddleware, requireCoopAdmin, auditLogger("SESSION_DELETED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { classId, sessionId } = req.params;

    const classItem = await prisma.class.findFirst({ where: { id: classId, tenantId } });
    if (!classItem) {
      return res.status(404).json({ error: "Class not found" });
    }

    await prisma.classSession.deleteMany({ where: { id: sessionId, classId } });
    res.json({ message: "Session deleted" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/classes/:classId/sessions", authMiddleware, requireCoopAdmin, auditLogger("SESSIONS_CLEARED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { classId } = req.params;

    const classItem = await prisma.class.findFirst({ where: { id: classId, tenantId } });
    if (!classItem) {
      return res.status(404).json({ error: "Class not found" });
    }

    const result = await prisma.classSession.deleteMany({ where: { classId } });
    res.json({ message: `Deleted ${result.count} sessions`, count: result.count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// COURSE / OFFERING / OFFERING CLASS ROUTES
// New Course → Offering → OfferingClass hierarchy
// ========================================

// --- COURSE ROUTES ---

// Get all courses for tenant
router.get("/courses", authMiddleware, requireCoopAdmin, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const courses = await prisma.course.findMany({
      where: { tenantId, isArchived: false },
      include: {
        offerings: {
          where: { isArchived: false },
          include: {
            instructor: { select: { id: true, firstName: true, lastName: true, email: true } },
            _count: { select: { registrations: true, classes: true } },
          },
        },
      },
      orderBy: { title: "asc" },
    });
    res.json({ courses });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single course with offerings
router.get("/courses/:courseId", authMiddleware, requireCoopAdmin, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { courseId } = req.params;

    const course = await prisma.course.findFirst({
      where: { id: courseId, tenantId },
      include: {
        offerings: {
          where: { isArchived: false },
          include: {
            instructor: { select: { id: true, firstName: true, lastName: true, email: true } },
            classes: { orderBy: { date: "asc" } },
            _count: { select: { registrations: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    res.json({ course });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create course
router.post("/courses", authMiddleware, requireCoopAdmin, auditLogger("COURSE_CREATED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { title, description, prerequisites, ageMin, ageMax, imageUrl } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const course = await prisma.course.create({
      data: {
        tenantId,
        title,
        description,
        prerequisites,
        ageMin,
        ageMax,
        imageUrl,
      },
    });

    res.status(201).json({ course });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update course
router.patch("/courses/:courseId", authMiddleware, requireCoopAdmin, auditLogger("COURSE_UPDATED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { courseId } = req.params;
    const { title, description, prerequisites, ageMin, ageMax, imageUrl } = req.body;

    const existing = await prisma.course.findFirst({ where: { id: courseId, tenantId } });
    if (!existing) {
      return res.status(404).json({ error: "Course not found" });
    }

    const course = await prisma.course.update({
      where: { id: courseId },
      data: {
        title: title ?? existing.title,
        description: description ?? existing.description,
        prerequisites: prerequisites ?? existing.prerequisites,
        ageMin: ageMin ?? existing.ageMin,
        ageMax: ageMax ?? existing.ageMax,
        imageUrl: imageUrl ?? existing.imageUrl,
      },
    });

    res.json({ course });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Archive course
router.patch("/courses/:courseId/archive", authMiddleware, requireCoopAdmin, auditLogger("COURSE_ARCHIVED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { courseId } = req.params;

    const existing = await prisma.course.findFirst({ where: { id: courseId, tenantId } });
    if (!existing) {
      return res.status(404).json({ error: "Course not found" });
    }

    const course = await prisma.course.update({
      where: { id: courseId },
      data: { isArchived: true },
    });

    res.json({ course, message: "Course archived" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Unarchive course
router.patch("/courses/:courseId/unarchive", authMiddleware, requireCoopAdmin, auditLogger("COURSE_UNARCHIVED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { courseId } = req.params;

    const existing = await prisma.course.findFirst({ where: { id: courseId, tenantId } });
    if (!existing) {
      return res.status(404).json({ error: "Course not found" });
    }

    const course = await prisma.course.update({
      where: { id: courseId },
      data: { isArchived: false },
    });

    res.json({ course, message: "Course unarchived" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- OFFERING ROUTES ---

// Get all offerings for a course
router.get("/courses/:courseId/offerings", authMiddleware, requireCoopAdmin, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { courseId } = req.params;

    const course = await prisma.course.findFirst({ where: { id: courseId, tenantId } });
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const offerings = await prisma.offering.findMany({
      where: { courseId, tenantId, isArchived: false },
      include: {
        instructor: { select: { id: true, firstName: true, lastName: true, email: true } },
        classes: { orderBy: { date: "asc" } },
        _count: { select: { registrations: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ offerings });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single offering with classes
router.get("/offerings/:offeringId", authMiddleware, requireCoopAdmin, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { offeringId } = req.params;

    const offering = await prisma.offering.findFirst({
      where: { id: offeringId, tenantId },
      include: {
        course: true,
        instructor: { select: { id: true, firstName: true, lastName: true, email: true, bio: true } },
        classes: { orderBy: { date: "asc" } },
        registrations: {
          include: {
            offering: { select: { tenantId: true } },
          },
        },
        _count: { select: { registrations: true } },
      },
    });

    if (!offering) {
      return res.status(404).json({ error: "Offering not found" });
    }

    res.json({ offering });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create offering for a course
router.post("/courses/:courseId/offerings", authMiddleware, requireCoopAdmin, auditLogger("OFFERING_CREATED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { courseId } = req.params;
    const { instructorId, seasonLabel, price, capacity, status, materialsUrl, classes } = req.body;

    const course = await prisma.course.findFirst({ where: { id: courseId, tenantId } });
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    if (price === undefined || capacity === undefined) {
      return res.status(400).json({ error: "Price and capacity are required" });
    }

    const offering = await prisma.offering.create({
      data: {
        tenantId,
        courseId,
        instructorId: instructorId || null,
        seasonLabel,
        price,
        capacity,
        status: status || "Draft",
        materialsUrl,
      },
      include: {
        instructor: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // Create classes if provided
    if (classes && Array.isArray(classes) && classes.length > 0) {
      await prisma.offeringClass.createMany({
        data: classes.map((c: any) => ({
          offeringId: offering.id,
          date: new Date(c.date),
          startTime: c.startTime,
          endTime: c.endTime,
          location: c.location || null,
          locationDetails: c.locationDetails || null,
          isOneOff: c.isOneOff || false,
        })),
      });
    }

    const offeringWithClasses = await prisma.offering.findUnique({
      where: { id: offering.id },
      include: {
        instructor: { select: { id: true, firstName: true, lastName: true, email: true } },
        classes: { orderBy: { date: "asc" } },
        _count: { select: { registrations: true } },
      },
    });

    res.status(201).json({ offering: offeringWithClasses });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update offering
router.patch("/offerings/:offeringId", authMiddleware, requireCoopAdmin, auditLogger("OFFERING_UPDATED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { offeringId } = req.params;
    const { instructorId, seasonLabel, price, capacity, status, materialsUrl, classes } = req.body;

    const existing = await prisma.offering.findFirst({
      where: { id: offeringId, tenantId },
      include: { course: true },
    });
    if (!existing) {
      return res.status(404).json({ error: "Offering not found" });
    }

    // Track status change for approval email
    const oldStatus = existing.status;

    const offering = await prisma.offering.update({
      where: { id: offeringId },
      data: {
        instructorId: instructorId !== undefined ? instructorId : existing.instructorId,
        seasonLabel: seasonLabel !== undefined ? seasonLabel : existing.seasonLabel,
        price: price !== undefined ? price : existing.price,
        capacity: capacity !== undefined ? capacity : existing.capacity,
        status: status !== undefined ? status : existing.status,
        materialsUrl: materialsUrl !== undefined ? materialsUrl : existing.materialsUrl,
      },
    });

    // Update classes if provided - replace all
    if (classes !== undefined && Array.isArray(classes)) {
      // Filter out any invalid classes (must have date, startTime, endTime)
      const validClasses = classes.filter((c: any) => c.date && c.startTime && c.endTime);
      
      await prisma.offeringClass.deleteMany({ where: { offeringId } });
      if (validClasses.length > 0) {
        await prisma.offeringClass.createMany({
          data: validClasses.map((c: any) => ({
            offeringId,
            date: new Date(c.date),
            startTime: c.startTime,
            endTime: c.endTime,
            location: c.location || null,
            locationDetails: c.locationDetails || null,
            isCancelled: c.isCancelled || false,
            isOneOff: c.isOneOff || false,
          })),
        });
      }
    }

    // Send approval email if status changed from Pending Approval to Published
    if (oldStatus === "Pending Approval" && status === "Published" && offering.instructorId) {
      const instructor = await prisma.user.findUnique({
        where: { id: offering.instructorId },
        select: { email: true, firstName: true },
      });
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true },
      });
      if (instructor && tenant) {
        const classTitle = existing.course.title + (offering.seasonLabel ? ` (${offering.seasonLabel})` : '');
        await emailService.send({
          to: instructor.email,
          subject: `Your class "${classTitle}" has been approved!`,
          html: `
            <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #7C9082;">Great News, ${instructor.firstName}!</h2>
              <p>Your class <strong>"${classTitle}"</strong> has been approved and is now published at ${tenant.name}.</p>
              <p>Families can now view and enroll in your class.</p>
              <p style="margin-top: 24px;">
                <a href="${process.env.REPLIT_DEV_DOMAIN ? 'https://' + process.env.REPLIT_DEV_DOMAIN : ''}/app/instructor" 
                   style="background-color: #7C9082; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                  View Your Classes
                </a>
              </p>
              <p style="color: #666; font-size: 14px; margin-top: 32px;">— The ${tenant.name} Team</p>
            </div>
          `,
        });
      }
    }

    const updatedOffering = await prisma.offering.findUnique({
      where: { id: offeringId },
      include: {
        course: true,
        instructor: { select: { id: true, firstName: true, lastName: true, email: true } },
        classes: { orderBy: { date: "asc" } },
        _count: { select: { registrations: true } },
      },
    });

    res.json({ offering: updatedOffering });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Archive offering
router.patch("/offerings/:offeringId/archive", authMiddleware, requireCoopAdmin, auditLogger("OFFERING_ARCHIVED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { offeringId } = req.params;

    const existing = await prisma.offering.findFirst({ where: { id: offeringId, tenantId } });
    if (!existing) {
      return res.status(404).json({ error: "Offering not found" });
    }

    const offering = await prisma.offering.update({
      where: { id: offeringId },
      data: { isArchived: true },
    });

    res.json({ offering, message: "Offering archived" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Unarchive offering
router.patch("/offerings/:offeringId/unarchive", authMiddleware, requireCoopAdmin, auditLogger("OFFERING_UNARCHIVED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { offeringId } = req.params;

    const existing = await prisma.offering.findFirst({ where: { id: offeringId, tenantId } });
    if (!existing) {
      return res.status(404).json({ error: "Offering not found" });
    }

    const offering = await prisma.offering.update({
      where: { id: offeringId },
      data: { isArchived: false },
    });

    res.json({ offering, message: "Offering unarchived" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get offering roster
router.get("/offerings/:offeringId/roster", authMiddleware, requireCoopAdmin, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { offeringId } = req.params;

    const offering = await prisma.offering.findFirst({ where: { id: offeringId, tenantId } });
    if (!offering) {
      return res.status(404).json({ error: "Offering not found" });
    }

    const registrations = await prisma.offeringRegistration.findMany({
      where: { offeringId },
      orderBy: { createdAt: "asc" },
    });

    // Get user and child details for each registration
    const rosterItems = await Promise.all(
      registrations.map(async (reg) => {
        const user = await prisma.user.findUnique({
          where: { id: reg.userId },
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        });
        let child = null;
        if (reg.childId) {
          child = await prisma.child.findUnique({
            where: { id: reg.childId },
            select: { id: true, firstName: true, lastName: true, birthDate: true },
          });
        }
        return {
          ...reg,
          user,
          child,
        };
      })
    );

    res.json({ roster: rosterItems, offering });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- OFFERING CLASS ROUTES ---

// Get classes for an offering
router.get("/offerings/:offeringId/classes", authMiddleware, requireCoopAdmin, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { offeringId } = req.params;

    const offering = await prisma.offering.findFirst({ where: { id: offeringId, tenantId } });
    if (!offering) {
      return res.status(404).json({ error: "Offering not found" });
    }

    const classes = await prisma.offeringClass.findMany({
      where: { offeringId },
      orderBy: { date: "asc" },
    });

    res.json({ classes });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update a single class in an offering
router.patch("/offerings/:offeringId/classes/:classId", authMiddleware, requireCoopAdmin, auditLogger("OFFERING_CLASS_UPDATED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { offeringId, classId } = req.params;
    const { date, startTime, endTime, location, locationDetails, isCancelled } = req.body;

    const offering = await prisma.offering.findFirst({ where: { id: offeringId, tenantId } });
    if (!offering) {
      return res.status(404).json({ error: "Offering not found" });
    }

    const existingClass = await prisma.offeringClass.findFirst({ where: { id: classId, offeringId } });
    if (!existingClass) {
      return res.status(404).json({ error: "Class not found" });
    }

    const updatedClass = await prisma.offeringClass.update({
      where: { id: classId },
      data: {
        date: date !== undefined ? new Date(date) : existingClass.date,
        startTime: startTime !== undefined ? startTime : existingClass.startTime,
        endTime: endTime !== undefined ? endTime : existingClass.endTime,
        location: location !== undefined ? location : existingClass.location,
        locationDetails: locationDetails !== undefined ? locationDetails : existingClass.locationDetails,
        isCancelled: isCancelled !== undefined ? isCancelled : existingClass.isCancelled,
      },
    });

    res.json({ class: updatedClass });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel a single class
router.patch("/offerings/:offeringId/classes/:classId/cancel", authMiddleware, requireCoopAdmin, auditLogger("OFFERING_CLASS_CANCELLED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { offeringId, classId } = req.params;

    const offering = await prisma.offering.findFirst({ where: { id: offeringId, tenantId } });
    if (!offering) {
      return res.status(404).json({ error: "Offering not found" });
    }

    const existingClass = await prisma.offeringClass.findFirst({ where: { id: classId, offeringId } });
    if (!existingClass) {
      return res.status(404).json({ error: "Class not found" });
    }

    const updatedClass = await prisma.offeringClass.update({
      where: { id: classId },
      data: { isCancelled: true },
    });

    res.json({ class: updatedClass, message: "Class cancelled" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a single class
router.delete("/offerings/:offeringId/classes/:classId", authMiddleware, requireCoopAdmin, auditLogger("OFFERING_CLASS_DELETED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { offeringId, classId } = req.params;

    const offering = await prisma.offering.findFirst({ where: { id: offeringId, tenantId } });
    if (!offering) {
      return res.status(404).json({ error: "Offering not found" });
    }

    const existingClass = await prisma.offeringClass.findFirst({ where: { id: classId, offeringId } });
    if (!existingClass) {
      return res.status(404).json({ error: "Class not found" });
    }

    await prisma.offeringClass.delete({ where: { id: classId } });

    res.json({ message: "Class deleted" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// END COURSE / OFFERING / OFFERING CLASS ROUTES
// ========================================

router.get("/events", authMiddleware, requireCoopAdmin, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const events = await prisma.event.findMany({
      where: { tenantId },
      include: { 
        _count: { select: { registrations: true } },
        proposedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { date: "desc" },
    });
    res.json({ events });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/events", authMiddleware, requireCoopAdmin, auditLogger("EVENT_CREATED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { title, description, date, endDate, location, locationDetails, price, capacity, status, imageUrl, isFree, attendeeUnit } = req.body;

    const event = await prisma.event.create({
      data: {
        tenantId,
        title,
        description,
        date: new Date(date),
        endDate: endDate ? new Date(endDate) : null,
        location,
        locationDetails,
        price: isFree ? 0 : price,
        capacity,
        status: status || "Draft",
        imageUrl,
        isFree: isFree || false,
        attendeeUnit: attendeeUnit || "Person",
      },
    });
    res.json({ event });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/events/:eventId", authMiddleware, requireCoopAdmin, auditLogger("EVENT_UPDATED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { eventId } = req.params;

    const existing = await prisma.event.findFirst({ where: { id: eventId, tenantId } });
    if (!existing) {
      return res.status(404).json({ error: "Event not found" });
    }

    const updateData = { ...req.body };
    if (updateData.date) updateData.date = new Date(updateData.date);
    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);

    const event = await prisma.event.update({
      where: { id: eventId },
      data: updateData,
    });
    res.json({ event });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/events/:eventId", authMiddleware, requireCoopAdmin, auditLogger("EVENT_DELETED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { eventId } = req.params;

    await prisma.event.deleteMany({ where: { id: eventId, tenantId } });
    res.json({ message: "Event deleted" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/events/propose", authMiddleware, auditLogger("EVENT_PROPOSED"), async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { tenantId: true, role: true }
    });

    if (!user?.tenantId) {
      return res.status(403).json({ error: "No tenant associated with user" });
    }

    if (!["INSTRUCTOR", "FAMILY"].includes(user.role)) {
      return res.status(403).json({ error: "Only instructors and families can propose events" });
    }

    const { title, description, date, location } = req.body;

    if (!title || !description || !date || !location) {
      return res.status(400).json({ error: "Title, description, date, and location are required" });
    }

    const eventDate = new Date(date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (eventDate < now) {
      return res.status(400).json({ error: "Event date cannot be in the past" });
    }

    const event = await prisma.event.create({
      data: {
        tenantId: user.tenantId,
        title,
        description,
        date: eventDate,
        location,
        locationDetails: req.body.locationDetails || null,
        price: 0,
        isFree: true,
        status: "Pending Approval",
        proposedById: req.user.userId,
      },
    });

    res.json({ event, message: "Event proposal submitted for admin approval" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/events/:eventId/approve", authMiddleware, requireCoopAdmin, auditLogger("EVENT_APPROVED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { eventId } = req.params;

    const existing = await prisma.event.findFirst({ where: { id: eventId, tenantId } });
    if (!existing) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (existing.status !== "Pending Approval") {
      return res.status(400).json({ error: "Event is not pending approval" });
    }

    const event = await prisma.event.update({
      where: { id: eventId },
      data: { status: "Published" },
    });

    res.json({ event, message: "Event approved and published" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/events/:eventId/reject", authMiddleware, requireCoopAdmin, auditLogger("EVENT_REJECTED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { eventId } = req.params;

    const existing = await prisma.event.findFirst({ where: { id: eventId, tenantId } });
    if (!existing) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (existing.status !== "Pending Approval") {
      return res.status(400).json({ error: "Event is not pending approval" });
    }

    const event = await prisma.event.update({
      where: { id: eventId },
      data: { status: "Rejected" },
    });

    res.json({ event, message: "Event rejected" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/branding", authMiddleware, requireCoopAdmin, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    let branding = await prisma.tenantBranding.findUnique({ where: { tenantId } });
    
    if (!branding) {
      branding = await prisma.tenantBranding.create({
        data: { tenantId },
      });
    }
    
    res.json({ branding });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/branding", authMiddleware, requireCoopAdmin, auditLogger("BRANDING_UPDATED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { logoUrl, primaryColor, secondaryColor, accentColor, fontFamily, customDomain } = req.body;

    const branding = await prisma.tenantBranding.upsert({
      where: { tenantId },
      update: {
        ...(logoUrl !== undefined && { logoUrl }),
        ...(primaryColor && { primaryColor }),
        ...(secondaryColor && { secondaryColor }),
        ...(accentColor && { accentColor }),
        ...(fontFamily && { fontFamily }),
        ...(customDomain !== undefined && { customDomain }),
      },
      create: {
        tenantId,
        logoUrl,
        primaryColor: primaryColor || "#1e293b",
        secondaryColor: secondaryColor || "#64748b",
        accentColor: accentColor || "#0ea5e9",
        fontFamily: fontFamily || "Inter",
        customDomain,
      },
    });
    res.json({ branding });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/landing-page", authMiddleware, requireCoopAdmin, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    let landingPage = await prisma.tenantLandingPage.findUnique({ where: { tenantId } });
    
    if (!landingPage) {
      landingPage = await prisma.tenantLandingPage.create({
        data: { tenantId },
      });
    }
    
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });
    
    res.json({ landingPage, tenantSlug: tenant?.slug });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/landing-page", authMiddleware, requireCoopAdmin, auditLogger("LANDING_PAGE_UPDATED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { layoutTemplate, headerImageUrl, headerImageTheme, aboutContent, pricingContent, showPublicClasses, showPublicEvents } = req.body;

    const landingPage = await prisma.tenantLandingPage.upsert({
      where: { tenantId },
      update: {
        ...(layoutTemplate && { layoutTemplate }),
        ...(headerImageUrl !== undefined && { headerImageUrl }),
        ...(headerImageTheme !== undefined && { headerImageTheme }),
        ...(aboutContent !== undefined && { aboutContent }),
        ...(pricingContent !== undefined && { pricingContent }),
        ...(showPublicClasses !== undefined && { showPublicClasses }),
        ...(showPublicEvents !== undefined && { showPublicEvents }),
      },
      create: {
        tenantId,
        layoutTemplate: layoutTemplate || "CLASSIC",
        headerImageUrl,
        headerImageTheme,
        aboutContent,
        pricingContent,
        showPublicClasses: showPublicClasses ?? true,
        showPublicEvents: showPublicEvents ?? true,
      },
    });
    res.json({ landingPage });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/families", authMiddleware, requireCoopAdmin, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const families = await prisma.user.findMany({
      where: { tenantId, role: "FAMILY" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        secondaryRoles: true,
        applicationStatus: true,
        isActive: true,
        isArchived: true,
        children: true,
        _count: { select: { registrations: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ families });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/families/:userId/approve", authMiddleware, requireCoopAdmin, auditLogger("FAMILY_APPROVED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { userId } = req.params;

    const user = await prisma.user.updateMany({
      where: { id: userId, tenantId, role: "FAMILY" },
      data: { applicationStatus: "APPROVED" },
    });
    res.json({ message: "Family approved" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/families/:userId/reject", authMiddleware, requireCoopAdmin, auditLogger("FAMILY_REJECTED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { userId } = req.params;

    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId, role: "FAMILY" },
      include: { tenant: { select: { name: true } } },
    });

    if (!user) {
      return res.status(404).json({ error: "Family not found" });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { applicationStatus: "REJECTED" },
    });

    const emailContent = getFamilyDeniedEmail(user.firstName, user.tenant?.name || "the co-op");
    await emailService.send({
      to: user.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    res.json({ message: "Family rejected" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/families/:userId/move-to-pending", authMiddleware, requireCoopAdmin, auditLogger("FAMILY_MOVED_TO_PENDING"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { userId } = req.params;

    await prisma.user.updateMany({
      where: { id: userId, tenantId, role: "FAMILY" },
      data: { applicationStatus: "PENDING" },
    });
    res.json({ message: "Family moved to pending" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/families/:userId/suspend", authMiddleware, requireCoopAdmin, auditLogger("FAMILY_SUSPENDED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { userId } = req.params;

    await prisma.user.updateMany({
      where: { id: userId, tenantId, role: "FAMILY" },
      data: { isActive: false },
    });
    res.json({ message: "Family suspended" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/families/:userId/reactivate", authMiddleware, requireCoopAdmin, auditLogger("FAMILY_REACTIVATED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { userId } = req.params;

    await prisma.user.updateMany({
      where: { id: userId, tenantId, role: "FAMILY" },
      data: { isActive: true },
    });
    res.json({ message: "Family reactivated" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Archive/unarchive families
router.patch("/families/:userId/archive", authMiddleware, requireCoopAdmin, auditLogger("FAMILY_ARCHIVED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { userId } = req.params;

    await prisma.user.updateMany({
      where: { id: userId, tenantId, role: "FAMILY" },
      data: { isArchived: true },
    });
    res.json({ message: "Family archived" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/families/:userId/unarchive", authMiddleware, requireCoopAdmin, auditLogger("FAMILY_UNARCHIVED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { userId } = req.params;

    await prisma.user.updateMany({
      where: { id: userId, tenantId, role: "FAMILY" },
      data: { isArchived: false },
    });
    res.json({ message: "Family restored from archive" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/families/create", authMiddleware, requireCoopAdmin, auditLogger("FAMILY_CREATED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { firstName, lastName, email, password, phone } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "A user with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        phone,
        role: "FAMILY",
        tenantId,
        applicationStatus: "APPROVED",
      },
    });

    console.log(`[EMAIL] Simulated: Welcome email sent to ${email} (new family account created by admin)`);
    
    res.json({ user, message: "Family created successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/families/invite", authMiddleware, requireCoopAdmin, auditLogger("FAMILY_INVITED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { firstName, lastName, email } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "A user with this email already exists" });
    }

    const tempPassword = Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role: "FAMILY",
        tenantId,
        applicationStatus: "PENDING",
      },
    });

    console.log(`[EMAIL] Simulated: Invitation email sent to ${email}`);
    console.log(`[EMAIL] Temporary password: ${tempPassword} (user should change on first login)`);
    
    res.json({ user, message: "Family invitation sent" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/families/:userId", authMiddleware, requireCoopAdmin, auditLogger("FAMILY_UPDATED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { userId } = req.params;
    const { firstName, lastName, email, phone } = req.body;

    const user = await prisma.user.updateMany({
      where: { id: userId, tenantId, role: "FAMILY" },
      data: { 
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(email && { email }),
        ...(phone !== undefined && { phone }),
      },
    });
    
    if (user.count === 0) {
      return res.status(404).json({ error: "Family not found" });
    }
    
    res.json({ message: "Family updated" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/families/:userId/children", authMiddleware, requireCoopAdmin, auditLogger("CHILD_ADDED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { userId } = req.params;
    const { firstName, lastName, dateOfBirth } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ error: "First name and last name are required" });
    }

    const family = await prisma.user.findFirst({
      where: { id: userId, tenantId, role: "FAMILY" },
    });

    if (!family) {
      return res.status(404).json({ error: "Family not found" });
    }

    const child = await prisma.child.create({
      data: {
        firstName,
        lastName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        parentId: userId,
      },
    });

    res.json({ child, message: "Child added" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/families/:userId/children/:childId", authMiddleware, requireCoopAdmin, auditLogger("CHILD_UPDATED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { userId, childId } = req.params;
    const { 
      firstName, lastName, dateOfBirth, grade, interests,
      learningStylePrimary, learningStyleSecondary,
      educationalPhilosophyPrimary, educationalPhilosophySecondary,
      preferredLearningEnvironment, neurodivergentNotes, healthNotes, parentNotes,
      shareWithInstructors, visibleToOtherParents
    } = req.body;

    const family = await prisma.user.findFirst({
      where: { id: userId, tenantId, role: "FAMILY" },
    });

    if (!family) {
      return res.status(404).json({ error: "Family not found" });
    }

    const child = await prisma.child.findFirst({
      where: { id: childId, parentId: userId },
    });

    if (!child) {
      return res.status(404).json({ error: "Child not found" });
    }

    const updatedChild = await prisma.child.update({
      where: { id: childId },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(dateOfBirth !== undefined && { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }),
        ...(grade !== undefined && { grade }),
        ...(interests !== undefined && { interests }),
        ...(learningStylePrimary !== undefined && { learningStylePrimary }),
        ...(learningStyleSecondary !== undefined && { learningStyleSecondary }),
        ...(educationalPhilosophyPrimary !== undefined && { educationalPhilosophyPrimary }),
        ...(educationalPhilosophySecondary !== undefined && { educationalPhilosophySecondary }),
        ...(preferredLearningEnvironment !== undefined && { preferredLearningEnvironment }),
        ...(neurodivergentNotes !== undefined && { neurodivergentNotes }),
        ...(healthNotes !== undefined && { healthNotes }),
        ...(parentNotes !== undefined && { parentNotes }),
        ...(shareWithInstructors !== undefined && { shareWithInstructors }),
        ...(visibleToOtherParents !== undefined && { visibleToOtherParents }),
      },
    });

    res.json({ child: updatedChild });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/families/:userId/children/:childId", authMiddleware, requireCoopAdmin, auditLogger("CHILD_DELETED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { userId, childId } = req.params;

    const family = await prisma.user.findFirst({
      where: { id: userId, tenantId, role: "FAMILY" },
    });

    if (!family) {
      return res.status(404).json({ error: "Family not found" });
    }

    const child = await prisma.child.findFirst({
      where: { id: childId, parentId: userId },
    });

    if (!child) {
      return res.status(404).json({ error: "Child not found" });
    }

    await prisma.registration.deleteMany({ where: { childId: childId } });
    await prisma.child.delete({ where: { id: childId } });

    res.json({ message: "Child removed" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/instructors", authMiddleware, requireCoopAdmin, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    // Include users with INSTRUCTOR as primary role OR as a secondary role
    const instructors = await prisma.user.findMany({
      where: { 
        tenantId,
        OR: [
          { role: "INSTRUCTOR" },
          { secondaryRoles: { has: "INSTRUCTOR" } }
        ]
      },
      include: {
        _count: { select: { instructedClasses: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ instructors });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/instructors/:userId/approve", authMiddleware, requireCoopAdmin, auditLogger("INSTRUCTOR_APPROVED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { userId } = req.params;

    await prisma.user.updateMany({
      where: { id: userId, tenantId, role: "INSTRUCTOR" },
      data: { applicationStatus: "APPROVED" },
    });
    res.json({ message: "Instructor approved" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/instructors/:userId/reject", authMiddleware, requireCoopAdmin, auditLogger("INSTRUCTOR_REJECTED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { userId } = req.params;

    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId, role: "INSTRUCTOR" },
      include: { tenant: { select: { name: true } } },
    });

    if (!user) {
      return res.status(404).json({ error: "Instructor not found" });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { applicationStatus: "REJECTED" },
    });

    const emailContent = getInstructorDeniedEmail(user.firstName, user.tenant?.name || "the co-op");
    await emailService.send({
      to: user.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    res.json({ message: "Instructor rejected" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/instructors/:userId/move-to-pending", authMiddleware, requireCoopAdmin, auditLogger("INSTRUCTOR_MOVED_TO_PENDING"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { userId } = req.params;

    await prisma.user.updateMany({
      where: { id: userId, tenantId, role: "INSTRUCTOR" },
      data: { applicationStatus: "PENDING" },
    });
    res.json({ message: "Instructor moved to pending" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/instructors/invite", authMiddleware, requireCoopAdmin, auditLogger("INSTRUCTOR_INVITED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { email, firstName, lastName, password } = req.body;

    if (!email || !firstName || !lastName || !password) {
      return res.status(400).json({ error: "Email, first name, last name, and password are required" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "A user with this email already exists" });
    }

    const bcrypt = require("bcryptjs");
    const passwordHash = await bcrypt.hash(password, 10);

    const instructor = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        passwordHash,
        role: "INSTRUCTOR",
        tenantId,
        applicationStatus: "APPROVED",
      },
    });

    res.json({ instructor, message: "Instructor invited successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/instructors/:userId/suspend", authMiddleware, requireCoopAdmin, auditLogger("INSTRUCTOR_SUSPENDED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { userId } = req.params;

    await prisma.user.updateMany({
      where: { id: userId, tenantId, role: "INSTRUCTOR" },
      data: { isActive: false },
    });
    res.json({ message: "Instructor suspended" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/instructors/:userId/reactivate", authMiddleware, requireCoopAdmin, auditLogger("INSTRUCTOR_REACTIVATED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { userId } = req.params;

    await prisma.user.updateMany({
      where: { id: userId, tenantId, role: "INSTRUCTOR" },
      data: { isActive: true },
    });
    res.json({ message: "Instructor reactivated" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Archive/unarchive instructors
router.patch("/instructors/:userId/archive", authMiddleware, requireCoopAdmin, auditLogger("INSTRUCTOR_ARCHIVED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { userId } = req.params;

    await prisma.user.updateMany({
      where: { id: userId, tenantId, role: "INSTRUCTOR" },
      data: { isArchived: true },
    });
    res.json({ message: "Instructor archived" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/instructors/:userId/unarchive", authMiddleware, requireCoopAdmin, auditLogger("INSTRUCTOR_UNARCHIVED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { userId } = req.params;

    await prisma.user.updateMany({
      where: { id: userId, tenantId, role: "INSTRUCTOR" },
      data: { isArchived: false },
    });
    res.json({ message: "Instructor restored from archive" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/instructors/:userId", authMiddleware, requireCoopAdmin, auditLogger("INSTRUCTOR_DELETED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { userId } = req.params;

    const instructor = await prisma.user.findFirst({
      where: { id: userId, tenantId, role: "INSTRUCTOR" },
      include: { _count: { select: { instructedClasses: true } } },
    });

    if (!instructor) {
      return res.status(404).json({ error: "Instructor not found" });
    }

    if (instructor.tenantId !== tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (instructor._count.instructedClasses > 0) {
      return res.status(400).json({ error: "Cannot delete instructor with assigned classes. Reassign or delete their classes first." });
    }

    await prisma.user.delete({ where: { id: userId, tenantId } });
    res.json({ message: "Instructor deleted" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/instructors/:userId", authMiddleware, requireCoopAdmin, auditLogger("INSTRUCTOR_UPDATED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { userId } = req.params;
    const { firstName, lastName, email, bio } = req.body;

    const user = await prisma.user.updateMany({
      where: { id: userId, tenantId, role: "INSTRUCTOR" },
      data: { 
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(email && { email }),
        ...(bio !== undefined && { bio }),
      },
    });
    
    if (user.count === 0) {
      return res.status(404).json({ error: "Instructor not found" });
    }
    
    res.json({ message: "Instructor updated" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/instructors/:userId/classes", authMiddleware, requireCoopAdmin, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { userId } = req.params;

    const classes = await prisma.class.findMany({
      where: { tenantId, instructorId: userId },
      select: {
        id: true,
        title: true,
        status: true,
        _count: { select: { registrations: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ classes });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/fee-rules", authMiddleware, requireCoopAdmin, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const feeRules = await prisma.tenantFeeRule.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ feeRules });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/fee-rules", authMiddleware, requireCoopAdmin, auditLogger("FEE_RULE_CREATED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { type, value, description } = req.body;

    const feeRule = await prisma.tenantFeeRule.create({
      data: { tenantId, type, value, description },
    });
    res.json({ feeRule });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/fee-rules/:feeRuleId", authMiddleware, requireCoopAdmin, auditLogger("FEE_RULE_UPDATED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { feeRuleId } = req.params;

    const feeRule = await prisma.tenantFeeRule.updateMany({
      where: { id: feeRuleId, tenantId },
      data: req.body,
    });
    res.json({ feeRule });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/fee-rules/:feeRuleId", authMiddleware, requireCoopAdmin, auditLogger("FEE_RULE_DELETED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { feeRuleId } = req.params;

    await prisma.tenantFeeRule.deleteMany({ where: { id: feeRuleId, tenantId } });
    res.json({ message: "Fee rule deleted" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/announcements", authMiddleware, requireCoopAdmin, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const announcements = await prisma.announcement.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ announcements });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/announcements", authMiddleware, requireCoopAdmin, auditLogger("ANNOUNCEMENT_CREATED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { title, content, priority, isActive } = req.body;

    const announcement = await prisma.announcement.create({
      data: {
        tenantId,
        title,
        content,
        priority: priority || "Normal",
        isActive: isActive !== false,
        createdBy: req.user!.userId,
      },
    });
    res.json({ announcement });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/announcements/:announcementId", authMiddleware, requireCoopAdmin, auditLogger("ANNOUNCEMENT_UPDATED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { announcementId } = req.params;

    const announcement = await prisma.announcement.updateMany({
      where: { id: announcementId, tenantId },
      data: req.body,
    });
    res.json({ announcement });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/announcements/:announcementId", authMiddleware, requireCoopAdmin, auditLogger("ANNOUNCEMENT_DELETED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { announcementId } = req.params;

    await prisma.announcement.deleteMany({ where: { id: announcementId, tenantId } });
    res.json({ message: "Announcement deleted" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/newsletters", authMiddleware, requireCoopAdmin, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const newsletters = await prisma.newsletter.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ newsletters });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/newsletters", authMiddleware, requireCoopAdmin, auditLogger("NEWSLETTER_CREATED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { subject, content, status, scheduledAt } = req.body;

    const newsletter = await prisma.newsletter.create({
      data: {
        tenantId,
        subject,
        content,
        status: status || "DRAFT",
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        createdBy: req.user!.userId,
      },
    });
    res.json({ newsletter });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/newsletters/:newsletterId", authMiddleware, requireCoopAdmin, auditLogger("NEWSLETTER_UPDATED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { newsletterId } = req.params;

    const updateData = { ...req.body };
    if (updateData.scheduledAt) updateData.scheduledAt = new Date(updateData.scheduledAt);

    const newsletter = await prisma.newsletter.updateMany({
      where: { id: newsletterId, tenantId },
      data: updateData,
    });
    res.json({ newsletter });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/newsletters/:newsletterId/send", authMiddleware, requireCoopAdmin, auditLogger("NEWSLETTER_SENT"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { newsletterId } = req.params;

    const newsletter = await prisma.newsletter.findFirst({
      where: { id: newsletterId, tenantId },
    });

    if (!newsletter) {
      return res.status(404).json({ error: "Newsletter not found" });
    }

    const families = await prisma.user.findMany({
      where: { tenantId, role: "FAMILY", isActive: true },
      select: { email: true, firstName: true },
    });

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

    let sentCount = 0;
    for (const family of families) {
      const success = await emailService.send({
        to: family.email,
        subject: newsletter.subject,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
            ${newsletter.content}
            <p style="color: #666; font-size: 12px; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">
              You received this email from ${tenant?.name || 'your co-op'} via Bramble.
            </p>
          </div>
        `,
        text: newsletter.content.replace(/<[^>]*>/g, ''),
      });
      if (success) sentCount++;
    }

    await prisma.newsletter.updateMany({
      where: { id: newsletterId, tenantId },
      data: { status: "SENT", sentAt: new Date() },
    });

    res.json({ message: `Newsletter sent to ${sentCount} families` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/newsletters/:newsletterId/archive", authMiddleware, requireCoopAdmin, auditLogger("NEWSLETTER_ARCHIVED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { newsletterId } = req.params;

    await prisma.newsletter.updateMany({
      where: { id: newsletterId, tenantId },
      data: { status: "ARCHIVED" },
    });
    res.json({ message: "Newsletter archived" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/automations", authMiddleware, requireCoopAdmin, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const automations = await prisma.emailAutomation.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ automations });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/automations", authMiddleware, requireCoopAdmin, auditLogger("AUTOMATION_CREATED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { name, trigger, isActive, steps } = req.body;

    const automation = await prisma.emailAutomation.create({
      data: {
        tenantId,
        name,
        trigger,
        status: isActive ? "Active" : "Draft",
        steps: steps || [],
      },
    });
    res.json({ automation });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/automations/:automationId/toggle", authMiddleware, requireCoopAdmin, auditLogger("AUTOMATION_TOGGLED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { automationId } = req.params;
    
    const existing = await prisma.emailAutomation.findFirst({ 
      where: { id: automationId, tenantId } 
    });
    if (!existing) return res.status(404).json({ error: "Automation not found" });
    
    const newStatus = existing.status === "Active" ? "Draft" : "Active";
    const automation = await prisma.emailAutomation.update({
      where: { id: automationId },
      data: { status: newStatus },
    });
    res.json({ automation });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/targeted-messages", authMiddleware, requireCoopAdmin, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const messages = await prisma.targetedMessage.findMany({
      where: { tenantId },
      orderBy: { sentAt: "desc" },
    });
    res.json({ messages });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/targeted-messages", authMiddleware, requireCoopAdmin, auditLogger("TARGETED_MESSAGE_SENT"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { subject, body, segment } = req.body;

    const validSegments = ["families", "instructors", "all"];
    if (!segment || !validSegments.includes(segment)) {
      return res.status(400).json({ error: "Invalid segment. Must be 'families', 'instructors', or 'all'" });
    }

    let whereClause: any = { tenantId, isActive: true };
    if (segment === "families") {
      whereClause.role = "FAMILY";
    } else if (segment === "instructors") {
      whereClause.role = "INSTRUCTOR";
    }

    const recipients = await prisma.user.findMany({
      where: whereClause,
      select: { email: true, firstName: true },
    });

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

    let sentCount = 0;
    for (const recipient of recipients) {
      const success = await emailService.send({
        to: recipient.email,
        subject,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
            ${body}
            <p style="color: #666; font-size: 12px; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">
              You received this message from ${tenant?.name || 'your co-op'} via Bramble.
            </p>
          </div>
        `,
        text: body.replace(/<[^>]*>/g, ''),
      });
      if (success) sentCount++;
    }

    const message = await prisma.targetedMessage.create({
      data: {
        tenantId,
        subject,
        body,
        segment,
        sentBy: req.user!.userId,
      },
    });

    res.json({ message, sentCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/payments/overview", authMiddleware, requireCoopAdmin, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;

    const [grossRevenue, brambleFees, instructorPayouts, coopRevenue] = await Promise.all([
      prisma.payment.aggregate({
        where: { tenantId, status: "SUCCEEDED" },
        _sum: { amount: true },
      }),
      prisma.ledgerEntry.aggregate({
        where: { tenantId, entityType: "BRAMBLE" },
        _sum: { amount: true },
      }),
      prisma.ledgerEntry.aggregate({
        where: { tenantId, entityType: "INSTRUCTOR" },
        _sum: { amount: true },
      }),
      prisma.ledgerEntry.aggregate({
        where: { tenantId, entityType: "COOP" },
        _sum: { amount: true },
      }),
    ]);

    res.json({
      grossRevenue: grossRevenue._sum.amount || 0,
      brambleFees: brambleFees._sum.amount || 0,
      instructorPayouts: instructorPayouts._sum.amount || 0,
      coopRevenue: coopRevenue._sum.amount || 0,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/payments/orders", authMiddleware, requireCoopAdmin, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const payments = await prisma.payment.findMany({
      where: { tenantId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        registration: {
          include: {
            class: { select: { title: true } },
            event: { select: { title: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ payments });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/payments/:paymentId/refund", authMiddleware, requireCoopAdmin, auditLogger("PAYMENT_REFUNDED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { paymentId } = req.params;
    const { reason } = req.body;

    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
    });

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    await prisma.payment.update({
      where: { id: paymentId },
      data: { 
        status: "REFUNDED",
        metadata: { ...((payment.metadata as any) || {}), refundReason: reason },
      },
    });

    console.log(`[PAYMENT] Refund processed for payment ${paymentId}: ${reason}`);
    
    res.json({ message: "Refund processed (manual)" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ROLE ASSIGNMENT
// ============================================

router.get("/users/:userId/roles", authMiddleware, requireCoopAdmin, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { userId } = req.params;

    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        secondaryRoles: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/users/:userId/roles", authMiddleware, requireCoopAdmin, auditLogger("ROLE_ASSIGNED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { userId } = req.params;
    const { secondaryRoles } = req.body;

    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Validate roles
    const validRoles = ["COOP_ADMIN", "INSTRUCTOR", "FAMILY"];
    const filteredRoles = (secondaryRoles || []).filter((r: string) => 
      validRoles.includes(r) && r !== user.role
    );

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { secondaryRoles: filteredRoles },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        secondaryRoles: true,
      },
    });

    console.log(`[ROLE] Updated secondary roles for ${user.email}: ${filteredRoles.join(", ")}`);
    
    res.json({ user: updatedUser, message: "Roles updated successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ===== LOCAL PROVIDER DIRECTORY =====

// Get all providers for the tenant (public for families, full details for admins)
router.get("/providers", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const providers = await prisma.localProvider.findMany({
      where: { tenantId, isApproved: true },
      include: {
        linkedUser: { select: { id: true, firstName: true, lastName: true, email: true, bio: true } },
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    // Get unique categories for filtering
    const categories = [...new Set(providers.map(p => p.category))].sort();

    res.json({ providers, categories });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new provider (admin only)
router.post("/providers", authMiddleware, requireCoopAdmin, auditLogger("PROVIDER_CREATED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { name, website, description, category, contactEmail, contactPhone, linkedUserId } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: "Name and category are required" });
    }

    const provider = await prisma.localProvider.create({
      data: {
        tenantId,
        name,
        website,
        description,
        category,
        contactEmail,
        contactPhone,
        linkedUserId,
        isAutoListed: false,
      },
      include: {
        linkedUser: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    res.json({ provider });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update a provider (admin only)
router.patch("/providers/:providerId", authMiddleware, requireCoopAdmin, auditLogger("PROVIDER_UPDATED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { providerId } = req.params;

    const existing = await prisma.localProvider.findFirst({
      where: { id: providerId, tenantId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Provider not found" });
    }

    const provider = await prisma.localProvider.update({
      where: { id: providerId },
      data: req.body,
      include: {
        linkedUser: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    res.json({ provider });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a provider (admin only)
router.delete("/providers/:providerId", authMiddleware, requireCoopAdmin, auditLogger("PROVIDER_DELETED"), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { providerId } = req.params;

    const existing = await prisma.localProvider.findFirst({
      where: { id: providerId, tenantId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Provider not found" });
    }

    await prisma.localProvider.delete({ where: { id: providerId } });
    res.json({ message: "Provider deleted" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Auto-list approved instructors as providers (admin action)
router.post("/providers/sync-instructors", authMiddleware, requireCoopAdmin, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;

    // Get all approved instructors who don't have a provider listing yet
    const instructors = await prisma.user.findMany({
      where: {
        tenantId,
        applicationStatus: "APPROVED",
        OR: [
          { role: "INSTRUCTOR" },
          { secondaryRoles: { has: "INSTRUCTOR" } },
        ],
      },
      select: { id: true, firstName: true, lastName: true, email: true, bio: true },
    });

    // Get existing auto-listed providers
    const existingProviders = await prisma.localProvider.findMany({
      where: { tenantId, isAutoListed: true },
      select: { linkedUserId: true },
    });
    const existingUserIds = new Set(existingProviders.map(p => p.linkedUserId));

    // Create provider entries for instructors without one
    const newProviders = [];
    for (const instructor of instructors) {
      if (!existingUserIds.has(instructor.id)) {
        const provider = await prisma.localProvider.create({
          data: {
            tenantId,
            name: `${instructor.firstName} ${instructor.lastName}`,
            description: instructor.bio || null,
            category: "Instructor",
            contactEmail: instructor.email,
            isAutoListed: true,
            linkedUserId: instructor.id,
          },
        });
        newProviders.push(provider);
      }
    }

    res.json({ 
      message: `Synced ${newProviders.length} instructor(s) to provider directory`,
      newProviders,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get provider categories for filtering
router.get("/provider-categories", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const providers = await prisma.localProvider.findMany({
      where: { tenantId, isApproved: true },
      select: { category: true },
      distinct: ["category"],
    });

    const categories = providers.map(p => p.category).sort();
    res.json({ categories });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
