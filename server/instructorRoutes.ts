import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware, AuthRequest, auditLogger } from "./middleware";

const prisma = new PrismaClient();
const router = Router();

async function requireInstructor(req: AuthRequest, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  // Check if user has INSTRUCTOR access via primary or secondary roles
  if (req.user.role !== "INSTRUCTOR") {
    // Check secondary roles from database
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { secondaryRoles: true, tenantId: true }
    });
    
    if (!user?.secondaryRoles?.includes("INSTRUCTOR")) {
      return res.status(403).json({ error: "Instructor access required" });
    }
    
    // Use the user's tenantId from the database for secondary role access
    if (user.tenantId) {
      req.user.tenantId = user.tenantId;
    }
  }
  next();
}

function requireApprovedInstructor(req: AuthRequest, res: any, next: any) {
  requireInstructor(req, res, async () => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user || user.applicationStatus !== "APPROVED") {
      return res.status(403).json({ error: "Application not yet approved" });
    }
    next();
  });
}

router.get("/instructor/profile", authMiddleware, requireInstructor, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      profile: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        bio: user.bio,
        applicationStatus: user.applicationStatus,
        tenant: user.tenant,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/instructor/profile", authMiddleware, requireInstructor, async (req: AuthRequest, res) => {
  try {
    const { firstName, lastName, phone, bio } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone !== undefined && { phone }),
        ...(bio !== undefined && { bio }),
      },
    });

    res.json({ profile: user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Resubmit for approval - allows REJECTED instructors to request re-approval
router.post("/instructor/resubmit", authMiddleware, requireInstructor, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Only allow resubmit if currently REJECTED
    if (user.applicationStatus !== "REJECTED") {
      return res.status(400).json({ 
        error: `Cannot resubmit: current status is ${user.applicationStatus}. Resubmission is only available for rejected applications.` 
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        applicationStatus: "PENDING",
      },
    });

    res.json({ 
      message: "Application resubmitted for approval", 
      applicationStatus: updatedUser.applicationStatus 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/instructor/classes", authMiddleware, requireApprovedInstructor, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const classes = await prisma.class.findMany({
      where: { 
        instructorId: req.user!.userId,
        ...(tenantId && { tenantId }),
      },
      include: {
        sessions: { orderBy: { date: "asc" } },
        _count: { select: { registrations: true } },
        tenant: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ classes });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/instructor/classes/propose", authMiddleware, requireApprovedInstructor, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: "No tenant association found" });
    }

    const { title, description, price, capacity, sessions, ageMin, ageMax, prerequisites } = req.body;

    if (!title || price === undefined || !capacity) {
      return res.status(400).json({ error: "Title, price, and capacity are required" });
    }

    const newClass = await prisma.class.create({
      data: {
        tenantId,
        instructorId: req.user!.userId,
        title,
        description: description || "",
        price: parseFloat(price) || 0,
        capacity: parseInt(capacity) || 10,
        status: "Pending Approval",
        ageMin: ageMin ? parseInt(ageMin) : null,
        ageMax: ageMax ? parseInt(ageMax) : null,
        prerequisites: prerequisites || null,
        sessions: sessions && sessions.length > 0 ? {
          create: sessions.map((s: any) => ({
            date: new Date(s.date),
            startTime: s.startTime,
            endTime: s.endTime,
            location: s.location || null,
          })),
        } : undefined,
      },
      include: {
        sessions: true,
        _count: { select: { registrations: true } },
      },
    });

    res.json({ class: newClass, message: "Class proposal submitted for admin approval" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/instructor/classes/:classId", authMiddleware, requireApprovedInstructor, async (req: AuthRequest, res) => {
  try {
    const { classId } = req.params;
    const tenantId = req.user!.tenantId;

    const classItem = await prisma.class.findFirst({
      where: { 
        id: classId, 
        instructorId: req.user!.userId,
        ...(tenantId && { tenantId }),
      },
      include: {
        sessions: {
          orderBy: { date: "asc" },
          include: {
            notes: { where: { instructorId: req.user!.userId } },
          },
        },
        tenant: { select: { name: true, slug: true } },
        _count: { select: { registrations: true } },
      },
    });

    if (!classItem) {
      return res.status(404).json({ error: "Class not found" });
    }

    res.json({ class: classItem });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/instructor/classes/:classId", authMiddleware, requireApprovedInstructor, async (req: AuthRequest, res) => {
  try {
    const { classId } = req.params;
    const tenantId = req.user!.tenantId;
    const { title, description, price, capacity, materialsUrl, ageMin, ageMax, prerequisites } = req.body;

    const classItem = await prisma.class.findFirst({
      where: { 
        id: classId, 
        instructorId: req.user!.userId,
        ...(tenantId && { tenantId }),
      },
    });

    if (!classItem) {
      return res.status(404).json({ error: "Class not found or you don't have permission to edit it" });
    }

    const updateData: Record<string, any> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (capacity !== undefined) updateData.capacity = capacity;
    if (materialsUrl !== undefined) updateData.materialsUrl = materialsUrl;
    if (ageMin !== undefined) updateData.ageMin = ageMin;
    if (ageMax !== undefined) updateData.ageMax = ageMax;
    if (prerequisites !== undefined) updateData.prerequisites = prerequisites;

    const significantFields = ['title', 'price', 'capacity'];
    const hasSignificantChange = significantFields.some(field => {
      if (updateData[field] === undefined) return false;
      return updateData[field] !== (classItem as any)[field];
    });

    const wasPublished = classItem.status === 'Published';
    if (hasSignificantChange && wasPublished) {
      updateData.status = 'Pending Approval';
    }

    const updated = await prisma.class.update({
      where: { id: classId },
      data: updateData,
    });

    const requiresReapproval = hasSignificantChange && wasPublished;
    const message = requiresReapproval 
      ? "Class updated. Since you changed significant details (title, price, or capacity), it requires re-approval."
      : "Class updated successfully";

    res.json({ class: updated, message, requiresReapproval });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/instructor/classes/:classId/roster", authMiddleware, requireApprovedInstructor, async (req: AuthRequest, res) => {
  try {
    const { classId } = req.params;
    const tenantId = req.user!.tenantId;

    const classItem = await prisma.class.findFirst({
      where: { 
        id: classId, 
        instructorId: req.user!.userId,
        ...(tenantId && { tenantId }),
      },
    });

    if (!classItem) {
      return res.status(404).json({ error: "Class not found" });
    }

    const registrations = await prisma.registration.findMany({
      where: { classId, status: "APPROVED", tenantId: classItem.tenantId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
        child: true,
      },
    });

    const roster = registrations.map(reg => {
      const child = reg.child;
      const shareProfile = child?.shareWithInstructors ?? false;
      
      return {
        registrationId: reg.id,
        parent: {
          name: `${reg.user.firstName} ${reg.user.lastName}`,
          email: reg.user.email,
          phone: reg.user.phone,
        },
        student: child ? {
          name: `${child.firstName}${child.lastName ? ' ' + child.lastName : ''}`,
          dateOfBirth: child.dateOfBirth,
          grade: child.grade,
          // Only include profile details if shareWithInstructors is true
          ...(shareProfile && {
            interests: child.interests,
            learningStylePrimary: child.learningStylePrimary,
            learningStyleSecondary: child.learningStyleSecondary,
            educationalPhilosophyPrimary: child.educationalPhilosophyPrimary,
            educationalPhilosophySecondary: child.educationalPhilosophySecondary,
            preferredLearningEnvironment: child.preferredLearningEnvironment,
            neurodivergentNotes: child.neurodivergentNotes,
            healthNotes: child.healthNotes,
            parentNotes: child.parentNotes,
          }),
          shareWithInstructors: shareProfile,
        } : null,
        enrolledAt: reg.createdAt,
      };
    });

    res.json({ roster, totalStudents: roster.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/instructor/payouts", authMiddleware, requireApprovedInstructor, async (req: AuthRequest, res) => {
  try {
    const payouts = await prisma.payout.findMany({
      where: {
        entityType: "INSTRUCTOR",
        entityId: req.user!.userId,
      },
      orderBy: { createdAt: "desc" },
    });

    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: {
        entityType: "INSTRUCTOR",
        entityId: req.user!.userId,
      },
      include: {
        payment: {
          include: {
            registration: {
              include: {
                class: { select: { title: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalEarnings = ledgerEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const totalPaid = payouts.filter(p => p.status === "PAID").reduce((sum, p) => sum + p.amount, 0);
    const pendingPayout = totalEarnings - totalPaid;

    res.json({
      payouts,
      earnings: ledgerEntries,
      summary: {
        totalEarnings,
        totalPaid,
        pendingPayout,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/instructor/calendar", authMiddleware, requireApprovedInstructor, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const instructorId = req.user!.userId;

    // Get legacy classes
    const classes = await prisma.class.findMany({
      where: { 
        instructorId,
        ...(tenantId && { tenantId }),
      },
      include: {
        sessions: { orderBy: { date: "asc" } },
        tenant: { select: { name: true } },
      },
    });

    // Get new offerings
    const offerings = await prisma.offering.findMany({
      where: { 
        instructorId,
        isArchived: false,
        ...(tenantId && { tenantId }),
      },
      include: {
        course: { select: { title: true } },
        classes: { orderBy: { date: "asc" } },
        tenant: { select: { name: true } },
      },
    });

    const calendarEvents: any[] = [];

    // Add legacy class sessions
    for (const classItem of classes) {
      for (const session of classItem.sessions) {
        calendarEvents.push({
          type: "class_session",
          id: session.id,
          title: classItem.title,
          date: session.date,
          startTime: session.startTime,
          endTime: session.endTime,
          location: session.location,
          locationDetails: session.locationDetails,
          classId: classItem.id,
          tenantName: classItem.tenant?.name,
        });
      }
    }

    // Add new offering classes
    for (const offering of offerings) {
      for (const oc of offering.classes) {
        calendarEvents.push({
          type: "offering_class",
          id: oc.id,
          title: offering.course.title,
          date: oc.date,
          startTime: oc.startTime,
          endTime: oc.endTime,
          location: oc.location,
          locationDetails: oc.locationDetails,
          offeringId: offering.id,
          tenantName: offering.tenant?.name,
        });
      }
    }

    if (tenantId) {
      const events = await prisma.event.findMany({
        where: {
          tenantId,
          status: "Published",
        },
        orderBy: { date: "asc" },
      });

      for (const event of events) {
        calendarEvents.push({
          type: "coop_event",
          id: event.id,
          title: event.title,
          date: event.date,
          endDate: event.endDate,
          location: event.location,
          locationDetails: event.locationDetails,
          description: event.description,
        });
      }
    }

    calendarEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    res.json({ calendarEvents });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Session management for instructors
router.post("/instructor/classes/:classId/sessions", authMiddleware, requireApprovedInstructor, async (req: AuthRequest, res) => {
  try {
    const { classId } = req.params;
    const { sessions } = req.body;
    const tenantId = req.user!.tenantId;

    const classItem = await prisma.class.findFirst({
      where: { 
        id: classId, 
        instructorId: req.user!.userId,
        ...(tenantId && { tenantId }),
      },
    });

    if (!classItem) {
      return res.status(404).json({ error: "Class not found or you don't have permission" });
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
      })),
    });

    const requiresReapproval = classItem.status === 'Published';
    if (requiresReapproval) {
      await prisma.class.update({
        where: { id: classId },
        data: { status: 'Pending Approval' },
      });
    }

    res.json({ 
      message: requiresReapproval 
        ? `Created ${createdSessions.count} sessions. Class requires re-approval due to schedule changes.`
        : `Created ${createdSessions.count} sessions`, 
      count: createdSessions.count,
      requiresReapproval,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/instructor/classes/:classId/sessions/:sessionId", authMiddleware, requireApprovedInstructor, async (req: AuthRequest, res) => {
  try {
    const { classId, sessionId } = req.params;
    const tenantId = req.user!.tenantId;

    const classItem = await prisma.class.findFirst({
      where: { 
        id: classId, 
        instructorId: req.user!.userId,
        ...(tenantId && { tenantId }),
      },
    });

    if (!classItem) {
      return res.status(404).json({ error: "Class not found or you don't have permission" });
    }

    await prisma.classSession.deleteMany({ where: { id: sessionId, classId } });

    const requiresReapproval = classItem.status === 'Published';
    if (requiresReapproval) {
      await prisma.class.update({
        where: { id: classId },
        data: { status: 'Pending Approval' },
      });
    }

    res.json({ 
      message: requiresReapproval 
        ? "Session deleted. Class requires re-approval due to schedule changes."
        : "Session deleted",
      requiresReapproval,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/instructor/classes/:classId/sessions", authMiddleware, requireApprovedInstructor, async (req: AuthRequest, res) => {
  try {
    const { classId } = req.params;
    const tenantId = req.user!.tenantId;

    const classItem = await prisma.class.findFirst({
      where: { 
        id: classId, 
        instructorId: req.user!.userId,
        ...(tenantId && { tenantId }),
      },
    });

    if (!classItem) {
      return res.status(404).json({ error: "Class not found or you don't have permission" });
    }

    const result = await prisma.classSession.deleteMany({ where: { classId } });

    const requiresReapproval = classItem.status === 'Published';
    if (requiresReapproval) {
      await prisma.class.update({
        where: { id: classId },
        data: { status: 'Pending Approval' },
      });
    }

    res.json({ 
      message: requiresReapproval 
        ? `Deleted ${result.count} sessions. Class requires re-approval due to schedule changes.`
        : `Deleted ${result.count} sessions`, 
      count: result.count,
      requiresReapproval,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/instructor/classes/:classId/sessions/:sessionId/notes", authMiddleware, requireApprovedInstructor, async (req: AuthRequest, res) => {
  try {
    const { classId, sessionId } = req.params;
    const { content } = req.body;
    const tenantId = req.user!.tenantId;

    const classItem = await prisma.class.findFirst({
      where: { 
        id: classId, 
        instructorId: req.user!.userId,
        ...(tenantId && { tenantId }),
      },
    });

    if (!classItem) {
      return res.status(404).json({ error: "Class not found" });
    }

    const session = await prisma.classSession.findFirst({
      where: { id: sessionId, classId: classItem.id },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const note = await prisma.sessionNote.upsert({
      where: {
        sessionId_instructorId: {
          sessionId,
          instructorId: req.user!.userId,
        },
      },
      update: { content },
      create: {
        sessionId,
        instructorId: req.user!.userId,
        content,
      },
    });

    res.json({ note });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/instructor/classes/:classId/sessions/:sessionId/notes", authMiddleware, requireApprovedInstructor, async (req: AuthRequest, res) => {
  try {
    const { classId, sessionId } = req.params;
    const tenantId = req.user!.tenantId;

    const classItem = await prisma.class.findFirst({
      where: { 
        id: classId, 
        instructorId: req.user!.userId,
        ...(tenantId && { tenantId }),
      },
    });

    if (!classItem) {
      return res.status(404).json({ error: "Class not found" });
    }

    const session = await prisma.classSession.findFirst({
      where: { id: sessionId, classId: classItem.id },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const note = await prisma.sessionNote.findFirst({
      where: { sessionId: session.id, instructorId: req.user!.userId },
    });

    res.json({ note });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/instructor/classes/:classId/chat", authMiddleware, requireApprovedInstructor, async (req: AuthRequest, res) => {
  try {
    const { classId } = req.params;
    const tenantId = req.user!.tenantId;

    const classItem = await prisma.class.findFirst({
      where: { 
        id: classId, 
        instructorId: req.user!.userId,
        ...(tenantId && { tenantId }),
      },
    });

    if (!classItem) {
      return res.status(404).json({ error: "Class not found" });
    }

    let chat = await prisma.chat.findFirst({
      where: { classId, tenantId: classItem.tenantId },
    });

    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          tenantId: classItem.tenantId,
          classId,
          name: `${classItem.title} Chat`,
          isGeneral: false,
        },
      });
    }

    res.json({ chat });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// OFFERING ROUTES (New Course System)
// ========================================

// Get instructor's offerings
router.get("/instructor/offerings", authMiddleware, requireApprovedInstructor, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const offerings = await prisma.offering.findMany({
      where: { 
        instructorId: req.user!.userId,
        ...(tenantId && { tenantId }),
        isArchived: false,
      },
      include: {
        course: true,
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

// Get single offering with details
router.get("/instructor/offerings/:offeringId", authMiddleware, requireApprovedInstructor, async (req: AuthRequest, res) => {
  try {
    const { offeringId } = req.params;
    const tenantId = req.user!.tenantId;

    const offering = await prisma.offering.findFirst({
      where: { 
        id: offeringId, 
        instructorId: req.user!.userId,
        ...(tenantId && { tenantId }),
      },
      include: {
        course: true,
        classes: { orderBy: { date: "asc" } },
        registrations: true,
        _count: { select: { registrations: true } },
      },
    });

    if (!offering) {
      return res.status(404).json({ error: "Offering not found or you don't have permission" });
    }

    res.json({ offering });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get offering roster
router.get("/instructor/offerings/:offeringId/roster", authMiddleware, requireApprovedInstructor, async (req: AuthRequest, res) => {
  try {
    const { offeringId } = req.params;
    const tenantId = req.user!.tenantId;

    const offering = await prisma.offering.findFirst({
      where: { 
        id: offeringId, 
        instructorId: req.user!.userId,
        ...(tenantId && { tenantId }),
      },
    });

    if (!offering) {
      return res.status(404).json({ error: "Offering not found" });
    }

    const registrations = await prisma.offeringRegistration.findMany({
      where: { offeringId },
      orderBy: { createdAt: "asc" },
    });

    // Get user and child details for each registration
    const roster = await Promise.all(
      registrations.map(async (reg) => {
        const user = await prisma.user.findUnique({
          where: { id: reg.userId },
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        });
        let child = null;
        if (reg.childId) {
          child = await prisma.child.findUnique({
            where: { id: reg.childId },
            select: { id: true, firstName: true, lastName: true },
          });
        }
        return { ...reg, user, child };
      })
    );

    res.json({ roster, offering });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update offering (limited fields for instructors)
router.patch("/instructor/offerings/:offeringId", authMiddleware, requireApprovedInstructor, async (req: AuthRequest, res) => {
  try {
    const { offeringId } = req.params;
    const tenantId = req.user!.tenantId;
    const { materialsUrl } = req.body;

    const existing = await prisma.offering.findFirst({
      where: { 
        id: offeringId, 
        instructorId: req.user!.userId,
        ...(tenantId && { tenantId }),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Offering not found or you don't have permission" });
    }

    const offering = await prisma.offering.update({
      where: { id: offeringId },
      data: {
        materialsUrl: materialsUrl !== undefined ? materialsUrl : existing.materialsUrl,
      },
      include: {
        course: true,
        classes: { orderBy: { date: "asc" } },
        _count: { select: { registrations: true } },
      },
    });

    res.json({ offering });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
