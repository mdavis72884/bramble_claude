import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware, AuthRequest, auditLogger } from "./middleware";

const prisma = new PrismaClient();
const router = Router();

async function requireFamily(req: AuthRequest, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  // Check if user has FAMILY access via primary or secondary roles
  if (req.user.role !== "FAMILY") {
    // Check secondary roles from database
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { secondaryRoles: true, tenantId: true }
    });
    
    if (!user?.secondaryRoles?.includes("FAMILY")) {
      return res.status(403).json({ error: "Family access required" });
    }
    
    // Use the user's tenantId from the database for secondary role access
    if (user.tenantId) {
      req.user.tenantId = user.tenantId;
    }
  }
  next();
}

function requireApprovedFamily(req: AuthRequest, res: any, next: any) {
  requireFamily(req, res, async () => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user || user.applicationStatus !== "APPROVED") {
      return res.status(403).json({ error: "Application not yet approved" });
    }
    next();
  });
}

router.get("/me/profile", authMiddleware, requireFamily, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: {
        children: true,
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
        applicationStatus: user.applicationStatus,
        children: user.children,
        tenant: user.tenant,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/me/profile", authMiddleware, requireFamily, async (req: AuthRequest, res) => {
  try {
    const { firstName, lastName, phone } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone !== undefined && { phone }),
      },
    });

    res.json({ profile: user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/me/children", authMiddleware, requireFamily, async (req: AuthRequest, res) => {
  try {
    const children = await prisma.child.findMany({
      where: { parentId: req.user!.userId },
      include: {
        registrations: {
          include: {
            class: { select: { id: true, title: true } },
            event: { select: { id: true, title: true } },
          },
        },
      },
    });

    res.json({ children });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/me/children", authMiddleware, requireFamily, async (req: AuthRequest, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      dateOfBirth,
      grade,
      interests,
      learningStylePrimary,
      learningStyleSecondary,
      educationalPhilosophyPrimary,
      educationalPhilosophySecondary,
      preferredLearningEnvironment,
      neurodivergentNotes,
      healthNotes,
      parentNotes,
      shareWithInstructors,
      visibleToOtherParents,
    } = req.body;

    if (!firstName) {
      return res.status(400).json({ error: "First name is required" });
    }

    const child = await prisma.child.create({
      data: {
        firstName,
        lastName: lastName || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        grade: grade || null,
        interests: interests || [],
        learningStylePrimary: learningStylePrimary || null,
        learningStyleSecondary: learningStyleSecondary || null,
        educationalPhilosophyPrimary: educationalPhilosophyPrimary || null,
        educationalPhilosophySecondary: educationalPhilosophySecondary || null,
        preferredLearningEnvironment: preferredLearningEnvironment || null,
        neurodivergentNotes: neurodivergentNotes || null,
        healthNotes: healthNotes || null,
        parentNotes: parentNotes || null,
        shareWithInstructors: shareWithInstructors !== undefined ? shareWithInstructors : true,
        visibleToOtherParents: visibleToOtherParents !== undefined ? visibleToOtherParents : false,
        parentId: req.user!.userId,
      },
    });

    res.status(201).json({ child });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/me/children/:childId", authMiddleware, requireFamily, async (req: AuthRequest, res) => {
  try {
    const { childId } = req.params;
    const { 
      firstName, 
      lastName, 
      dateOfBirth,
      grade,
      interests,
      learningStylePrimary,
      learningStyleSecondary,
      educationalPhilosophyPrimary,
      educationalPhilosophySecondary,
      preferredLearningEnvironment,
      neurodivergentNotes,
      healthNotes,
      parentNotes,
      shareWithInstructors,
      visibleToOtherParents,
    } = req.body;

    const existing = await prisma.child.findFirst({
      where: { id: childId, parentId: req.user!.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Child not found" });
    }

    const child = await prisma.child.update({
      where: { id: childId },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName: lastName || null }),
        ...(dateOfBirth !== undefined && { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }),
        ...(grade !== undefined && { grade: grade || null }),
        ...(interests !== undefined && { interests }),
        ...(learningStylePrimary !== undefined && { learningStylePrimary: learningStylePrimary || null }),
        ...(learningStyleSecondary !== undefined && { learningStyleSecondary: learningStyleSecondary || null }),
        ...(educationalPhilosophyPrimary !== undefined && { educationalPhilosophyPrimary: educationalPhilosophyPrimary || null }),
        ...(educationalPhilosophySecondary !== undefined && { educationalPhilosophySecondary: educationalPhilosophySecondary || null }),
        ...(preferredLearningEnvironment !== undefined && { preferredLearningEnvironment: preferredLearningEnvironment || null }),
        ...(neurodivergentNotes !== undefined && { neurodivergentNotes: neurodivergentNotes || null }),
        ...(healthNotes !== undefined && { healthNotes: healthNotes || null }),
        ...(parentNotes !== undefined && { parentNotes: parentNotes || null }),
        ...(shareWithInstructors !== undefined && { shareWithInstructors }),
        ...(visibleToOtherParents !== undefined && { visibleToOtherParents }),
      },
    });

    res.json({ child });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/me/children/:childId", authMiddleware, requireFamily, async (req: AuthRequest, res) => {
  try {
    const { childId } = req.params;

    const existing = await prisma.child.findFirst({
      where: { id: childId, parentId: req.user!.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Child not found" });
    }

    await prisma.child.delete({ where: { id: childId } });
    res.json({ message: "Child removed" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/t/:tenantSlug/classes", authMiddleware, requireApprovedFamily, async (req: AuthRequest, res) => {
  try {
    const { tenantSlug } = req.params;
    const userTenantId = req.user!.tenantId;

    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) {
      return res.status(404).json({ error: "Co-op not found" });
    }

    if (userTenantId && userTenantId !== tenant.id) {
      return res.status(403).json({ error: "Access denied - you are not a member of this co-op" });
    }

    // Get user's children
    const userChildren = await prisma.child.findMany({
      where: { parentId: req.user!.userId },
      select: { id: true },
    });
    const userChildIds = userChildren.map(c => c.id);

    const classes = await prisma.class.findMany({
      where: { tenantId: tenant.id, status: "Published" },
      include: {
        instructor: { select: { firstName: true, lastName: true } },
        sessions: { orderBy: { date: "asc" } },
        _count: { select: { registrations: true } },
        registrations: {
          where: { childId: { in: userChildIds } },
          select: { childId: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform to include enrolledChildIds for the current user's children
    const classesWithEnrollment = classes.map(cls => ({
      ...cls,
      enrolledChildIds: cls.registrations
        .filter(r => r.status === "APPROVED")
        .map(r => r.childId),
      registrations: undefined, // Remove raw registrations from response
    }));

    res.json({ classes: classesWithEnrollment });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/t/:tenantSlug/classes/:classId/enroll", authMiddleware, requireApprovedFamily, async (req: AuthRequest, res) => {
  try {
    const { tenantSlug, classId } = req.params;
    const { childIds } = req.body;
    const userTenantId = req.user!.tenantId;

    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) {
      return res.status(404).json({ error: "Co-op not found" });
    }

    if (userTenantId && userTenantId !== tenant.id) {
      return res.status(403).json({ error: "Access denied - you are not a member of this co-op" });
    }

    const classItem = await prisma.class.findFirst({
      where: { id: classId, tenantId: tenant.id, status: "Published" },
      include: { _count: { select: { registrations: true } } },
    });

    if (!classItem) {
      return res.status(404).json({ error: "Class not found" });
    }

    const children = await prisma.child.findMany({
      where: { id: { in: childIds }, parentId: req.user!.userId },
    });

    if (children.length !== childIds.length) {
      return res.status(400).json({ error: "Invalid child selection" });
    }

    const currentEnrollment = classItem._count.registrations;
    if (currentEnrollment + children.length > classItem.capacity) {
      return res.status(400).json({ error: "Not enough seats available" });
    }

    const registrations = await Promise.all(
      children.map(async (child) => {
        const existing = await prisma.registration.findFirst({
          where: { classId, childId: child.id },
        });

        if (existing) {
          return existing;
        }

        return prisma.registration.create({
          data: {
            tenantId: tenant.id,
            userId: req.user!.userId,
            childId: child.id,
            classId,
            status: "APPROVED",
          },
        });
      })
    );

    console.log(`[EMAIL] class_enrollment_confirmed triggered for user ${req.user!.userId}`);

    res.status(201).json({ 
      message: "Enrollment successful",
      registrations,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/t/:tenantSlug/events", authMiddleware, requireApprovedFamily, async (req: AuthRequest, res) => {
  try {
    const { tenantSlug } = req.params;
    const userTenantId = req.user!.tenantId;

    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) {
      return res.status(404).json({ error: "Co-op not found" });
    }

    if (userTenantId && userTenantId !== tenant.id) {
      return res.status(403).json({ error: "Access denied - you are not a member of this co-op" });
    }

    // Get user's children
    const userChildren = await prisma.child.findMany({
      where: { parentId: req.user!.userId },
      select: { id: true },
    });
    const userChildIds = userChildren.map(c => c.id);

    const events = await prisma.event.findMany({
      where: { tenantId: tenant.id, status: "Published" },
      include: { 
        _count: { select: { registrations: true } },
        registrations: {
          where: {
            OR: [
              { userId: req.user!.userId, childId: null }, // Self RSVP
              { childId: { in: userChildIds } }, // Child RSVPs
            ],
          },
          select: { childId: true, userId: true, status: true },
        },
      },
      orderBy: { date: "asc" },
    });

    // Transform to include RSVP status
    const eventsWithRsvp = events.map(event => ({
      ...event,
      selfRsvped: event.registrations.some(r => r.userId === req.user!.userId && !r.childId && r.status === "APPROVED"),
      rsvpedChildIds: event.registrations
        .filter(r => r.childId && r.status === "APPROVED")
        .map(r => r.childId),
      registrations: undefined, // Remove raw registrations from response
    }));

    res.json({ events: eventsWithRsvp });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/t/:tenantSlug/events/:eventId/rsvp", authMiddleware, requireApprovedFamily, async (req: AuthRequest, res) => {
  try {
    const { tenantSlug, eventId } = req.params;
    const { childIds, attendeeSelf } = req.body;
    const userTenantId = req.user!.tenantId;

    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) {
      return res.status(404).json({ error: "Co-op not found" });
    }

    if (userTenantId && userTenantId !== tenant.id) {
      return res.status(403).json({ error: "Access denied - you are not a member of this co-op" });
    }

    const event = await prisma.event.findFirst({
      where: { id: eventId, tenantId: tenant.id, status: "Published" },
      include: { _count: { select: { registrations: true } } },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const registrations = [];

    if (attendeeSelf) {
      const existing = await prisma.registration.findFirst({
        where: { eventId, userId: req.user!.userId, childId: null },
      });

      if (!existing) {
        const reg = await prisma.registration.create({
          data: {
            tenantId: tenant.id,
            userId: req.user!.userId,
            eventId,
            status: "APPROVED",
          },
        });
        registrations.push(reg);
      }
    }

    if (childIds?.length > 0) {
      const children = await prisma.child.findMany({
        where: { id: { in: childIds }, parentId: req.user!.userId },
      });

      for (const child of children) {
        const existing = await prisma.registration.findFirst({
          where: { eventId, childId: child.id },
        });

        if (!existing) {
          const reg = await prisma.registration.create({
            data: {
              tenantId: tenant.id,
              userId: req.user!.userId,
              childId: child.id,
              eventId,
              status: "APPROVED",
            },
          });
          registrations.push(reg);
        }
      }
    }

    console.log(`[EMAIL] event_rsvp_confirmed triggered for user ${req.user!.userId}`);

    res.status(201).json({ 
      message: "RSVP confirmed",
      registrations,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/me/payments/orders", authMiddleware, requireFamily, async (req: AuthRequest, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user!.userId },
      include: {
        registration: {
          include: {
            class: { select: { title: true } },
            event: { select: { title: true } },
            child: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ orders: payments });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/me/payments/orders/:orderId", authMiddleware, requireFamily, async (req: AuthRequest, res) => {
  try {
    const { orderId } = req.params;

    const payment = await prisma.payment.findFirst({
      where: { id: orderId, userId: req.user!.userId },
      include: {
        registration: {
          include: {
            class: { select: { title: true, price: true } },
            event: { select: { title: true, price: true } },
            child: { select: { firstName: true, lastName: true } },
          },
        },
        ledgerEntries: true,
      },
    });

    if (!payment) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ order: payment });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/me/payments/orders/:orderId/receipt", authMiddleware, requireFamily, async (req: AuthRequest, res) => {
  try {
    const { orderId } = req.params;

    const payment = await prisma.payment.findFirst({
      where: { id: orderId, userId: req.user!.userId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        tenant: { select: { name: true, slug: true } },
        registration: {
          include: {
            class: { 
              select: { title: true, price: true },
              include: { instructor: { select: { firstName: true, lastName: true } } }
            },
            event: { select: { title: true, price: true } },
            child: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({ error: "Receipt not found" });
    }

    const receipt = {
      receiptNumber: `BRM-${payment.id.slice(-8).toUpperCase()}`,
      date: payment.createdAt,
      paidBy: {
        name: `${payment.user.firstName} ${payment.user.lastName}`,
        email: payment.user.email,
      },
      coopName: payment.tenant?.name || "Unknown Co-op",
      itemType: payment.registration?.class ? "class" : "event",
      itemTitle: payment.registration?.class?.title || payment.registration?.event?.title || "N/A",
      instructor: payment.registration?.class?.instructor 
        ? `${payment.registration.class.instructor.firstName} ${payment.registration.class.instructor.lastName}` 
        : null,
      childName: payment.registration?.child 
        ? `${payment.registration.child.firstName} ${payment.registration.child.lastName}`
        : null,
      amount: payment.amount,
      status: payment.status,
    };

    res.json({ receipt });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/me/children/:childId/sessions/:sessionId/notes", authMiddleware, requireApprovedFamily, async (req: AuthRequest, res) => {
  try {
    const { childId, sessionId } = req.params;
    const tenantId = req.user!.tenantId;

    const child = await prisma.child.findFirst({
      where: { id: childId, parentId: req.user!.userId },
    });

    if (!child) {
      return res.status(404).json({ error: "Child not found" });
    }

    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      include: { class: true },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (tenantId && session.class.tenantId !== tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const registration = await prisma.registration.findFirst({
      where: { classId: session.classId, childId, status: "APPROVED", tenantId: session.class.tenantId },
    });

    if (!registration) {
      return res.status(403).json({ error: "Child is not enrolled in this class" });
    }

    const notes = await prisma.sessionNote.findMany({
      where: { sessionId },
      include: {
        session: { include: { class: { select: { title: true } } } },
      },
    });

    res.json({ notes });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/me/calendar", authMiddleware, requireApprovedFamily, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const children = await prisma.child.findMany({
      where: { parentId: req.user!.userId },
    });

    const childIds = children.map(c => c.id);

    // Get legacy class registrations
    const registrations = await prisma.registration.findMany({
      where: {
        OR: [
          { userId: req.user!.userId },
          { childId: { in: childIds } },
        ],
        status: "APPROVED",
        ...(tenantId && { tenantId }),
      },
      include: {
        class: {
          include: {
            sessions: { orderBy: { date: "asc" } },
            instructor: { select: { firstName: true, lastName: true } },
          },
        },
        event: true,
        child: { select: { firstName: true, lastName: true } },
      },
    });

    // Get new offering registrations
    const offeringRegistrations = await prisma.offeringRegistration.findMany({
      where: {
        OR: [
          { userId: req.user!.userId },
          { childId: { in: childIds } },
        ],
        status: "APPROVED",
        ...(tenantId && { tenantId }),
      },
      include: {
        offering: {
          include: {
            course: { select: { title: true } },
            classes: { orderBy: { date: "asc" } },
            instructor: { select: { firstName: true, lastName: true } },
          },
        },
        child: { select: { firstName: true, lastName: true } },
      },
    });

    const calendarEvents: any[] = [];

    // Add legacy class sessions
    for (const reg of registrations) {
      if (reg.class) {
        for (const session of reg.class.sessions) {
          calendarEvents.push({
            type: "class_session",
            id: session.id,
            title: reg.class.title,
            date: session.date,
            startTime: session.startTime,
            endTime: session.endTime,
            location: session.location,
            locationDetails: session.locationDetails,
            instructor: `${reg.class.instructor.firstName} ${reg.class.instructor.lastName}`,
            child: reg.child ? `${reg.child.firstName} ${reg.child.lastName}` : null,
            classId: reg.class.id,
          });
        }
      }

      if (reg.event) {
        calendarEvents.push({
          type: "event",
          id: reg.event.id,
          title: reg.event.title,
          date: reg.event.date,
          endDate: reg.event.endDate,
          location: reg.event.location,
          locationDetails: reg.event.locationDetails,
          child: reg.child ? `${reg.child.firstName} ${reg.child.lastName}` : null,
        });
      }
    }

    // Add new offering classes
    for (const reg of offeringRegistrations) {
      if (reg.offering) {
        for (const oc of reg.offering.classes) {
          calendarEvents.push({
            type: "offering_class",
            id: oc.id,
            title: reg.offering.course.title,
            date: oc.date,
            startTime: oc.startTime,
            endTime: oc.endTime,
            location: oc.location,
            locationDetails: oc.locationDetails,
            instructor: `${reg.offering.instructor.firstName} ${reg.offering.instructor.lastName}`,
            child: reg.child ? `${reg.child.firstName} ${reg.child.lastName}` : null,
            offeringId: reg.offering.id,
          });
        }
      }
    }

    calendarEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    res.json({ calendarEvents });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// OFFERING ROUTES (New Course System)
// ========================================

// Get available offerings for a tenant
router.get("/t/:tenantSlug/offerings", authMiddleware, requireApprovedFamily, async (req: AuthRequest, res) => {
  try {
    const { tenantSlug } = req.params;
    const userTenantId = req.user!.tenantId;

    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) {
      return res.status(404).json({ error: "Co-op not found" });
    }

    if (userTenantId && userTenantId !== tenant.id) {
      return res.status(403).json({ error: "Access denied - you are not a member of this co-op" });
    }

    // Get user's children
    const userChildren = await prisma.child.findMany({
      where: { parentId: req.user!.userId },
      select: { id: true },
    });
    const userChildIds = userChildren.map(c => c.id);

    const offerings = await prisma.offering.findMany({
      where: { tenantId: tenant.id, status: "Published", isArchived: false },
      include: {
        course: true,
        instructor: { select: { firstName: true, lastName: true } },
        classes: { orderBy: { date: "asc" } },
        _count: { select: { registrations: true } },
        registrations: {
          where: { childId: { in: userChildIds } },
          select: { childId: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform to include enrolledChildIds for the current user's children
    const offeringsWithEnrollment = offerings.map(off => ({
      ...off,
      enrolledChildIds: off.registrations
        .filter(r => r.status === "APPROVED")
        .map(r => r.childId),
      registrations: undefined, // Remove raw registrations from response
    }));

    res.json({ offerings: offeringsWithEnrollment });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single offering details
router.get("/t/:tenantSlug/offerings/:offeringId", authMiddleware, requireApprovedFamily, async (req: AuthRequest, res) => {
  try {
    const { tenantSlug, offeringId } = req.params;
    const userTenantId = req.user!.tenantId;

    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) {
      return res.status(404).json({ error: "Co-op not found" });
    }

    if (userTenantId && userTenantId !== tenant.id) {
      return res.status(403).json({ error: "Access denied - you are not a member of this co-op" });
    }

    // Get user's children
    const userChildren = await prisma.child.findMany({
      where: { parentId: req.user!.userId },
      select: { id: true },
    });
    const userChildIds = userChildren.map(c => c.id);

    const offering = await prisma.offering.findFirst({
      where: { id: offeringId, tenantId: tenant.id, status: "Published", isArchived: false },
      include: {
        course: true,
        instructor: { select: { firstName: true, lastName: true, bio: true } },
        classes: { orderBy: { date: "asc" } },
        _count: { select: { registrations: true } },
        registrations: {
          where: { childId: { in: userChildIds } },
          select: { childId: true, status: true },
        },
      },
    });

    if (!offering) {
      return res.status(404).json({ error: "Offering not found" });
    }

    const offeringWithEnrollment = {
      ...offering,
      enrolledChildIds: offering.registrations
        .filter(r => r.status === "APPROVED")
        .map(r => r.childId),
      registrations: undefined,
    };

    res.json({ offering: offeringWithEnrollment });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Enroll in an offering
router.post("/t/:tenantSlug/offerings/:offeringId/enroll", authMiddleware, requireApprovedFamily, async (req: AuthRequest, res) => {
  try {
    const { tenantSlug, offeringId } = req.params;
    const { childIds } = req.body;
    const userTenantId = req.user!.tenantId;

    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) {
      return res.status(404).json({ error: "Co-op not found" });
    }

    if (userTenantId && userTenantId !== tenant.id) {
      return res.status(403).json({ error: "Access denied - you are not a member of this co-op" });
    }

    const offering = await prisma.offering.findFirst({
      where: { id: offeringId, tenantId: tenant.id, status: "Published", isArchived: false },
      include: { 
        course: true,
        _count: { select: { registrations: true } } 
      },
    });

    if (!offering) {
      return res.status(404).json({ error: "Offering not found" });
    }

    const children = await prisma.child.findMany({
      where: { id: { in: childIds }, parentId: req.user!.userId },
    });

    if (children.length !== childIds.length) {
      return res.status(400).json({ error: "Invalid child selection" });
    }

    const currentEnrollment = offering._count.registrations;
    if (currentEnrollment + children.length > offering.capacity) {
      return res.status(400).json({ error: "Not enough seats available" });
    }

    const registrations = await Promise.all(
      children.map(async (child) => {
        const existing = await prisma.offeringRegistration.findFirst({
          where: { offeringId, childId: child.id },
        });

        if (existing) {
          return existing;
        }

        return prisma.offeringRegistration.create({
          data: {
            tenantId: tenant.id,
            userId: req.user!.userId,
            childId: child.id,
            offeringId,
            status: "APPROVED",
          },
        });
      })
    );

    console.log(`[EMAIL] offering_enrollment_confirmed triggered for user ${req.user!.userId}`);

    res.status(201).json({ 
      message: "Enrollment successful",
      registrations,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get family's enrolled offerings
router.get("/me/offerings", authMiddleware, requireApprovedFamily, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;

    // Get all registrations for user's children
    const registrations = await prisma.offeringRegistration.findMany({
      where: { userId },
      include: {
        offering: {
          include: {
            course: true,
            instructor: { select: { firstName: true, lastName: true } },
            classes: { orderBy: { date: "asc" } },
          },
        },
      },
    });

    // Get child details
    const enrichedRegistrations = await Promise.all(
      registrations.map(async (reg) => {
        let child = null;
        if (reg.childId) {
          child = await prisma.child.findUnique({
            where: { id: reg.childId },
            select: { id: true, firstName: true, lastName: true },
          });
        }
        return { ...reg, child };
      })
    );

    res.json({ registrations: enrichedRegistrations });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
