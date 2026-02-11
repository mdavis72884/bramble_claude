import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware, AuthRequest } from "./middleware";

const prisma = new PrismaClient();
const router = Router();

function requireTenantMember(req: AuthRequest, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  if (!req.user.tenantId) {
    return res.status(403).json({ error: "Not a member of any co-op" });
  }
  if (!["COOP_ADMIN", "INSTRUCTOR", "FAMILY"].includes(req.user.role)) {
    return res.status(403).json({ error: "Access denied" });
  }
  next();
}

router.get("/tenant/chats", authMiddleware, requireTenantMember, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId!;
    const userId = req.user!.userId;
    const role = req.user!.role;

    let chats;

    if (role === "COOP_ADMIN") {
      chats = await prisma.chat.findMany({
        where: { tenantId },
        include: {
          class: { select: { title: true } },
          _count: { select: { messages: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (role === "INSTRUCTOR") {
      const instructorClasses = await prisma.class.findMany({
        where: { instructorId: userId },
        select: { id: true },
      });
      const classIds = instructorClasses.map(c => c.id);

      chats = await prisma.chat.findMany({
        where: {
          tenantId,
          OR: [
            { isGeneral: true },
            { classId: { in: classIds } },
          ],
        },
        include: {
          class: { select: { title: true } },
          _count: { select: { messages: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      const children = await prisma.child.findMany({
        where: { parentId: userId },
        select: { id: true },
      });
      const childIds = children.map(c => c.id);

      const registrations = await prisma.registration.findMany({
        where: {
          OR: [
            { userId },
            { childId: { in: childIds } },
          ],
          classId: { not: null },
          status: "APPROVED",
          tenantId,
        },
        select: { classId: true },
      });
      const classIds = Array.from(new Set(registrations.map(r => r.classId).filter(Boolean)));

      chats = await prisma.chat.findMany({
        where: {
          tenantId,
          OR: [
            { isGeneral: true },
            { classId: { in: classIds as string[] } },
          ],
        },
        include: {
          class: { select: { title: true } },
          _count: { select: { messages: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    res.json({ chats });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/tenant/chats/:chatId/messages", authMiddleware, requireTenantMember, async (req: AuthRequest, res) => {
  try {
    const { chatId } = req.params;
    const tenantId = req.user!.tenantId!;
    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before as string;

    const chat = await prisma.chat.findFirst({
      where: { id: chatId, tenantId },
    });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        chatId,
        ...(before && { createdAt: { lt: new Date(before) } }),
      },
      include: {
        user: { select: { firstName: true, lastName: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const messagesWithRole = messages.map(m => ({
      ...m,
      user: {
        ...m.user,
        role: m.senderRole || m.user.role,
      },
    }));

    res.json({ messages: messagesWithRole.reverse() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/tenant/chats/:chatId/messages", authMiddleware, requireTenantMember, async (req: AuthRequest, res) => {
  try {
    const { chatId } = req.params;
    const { content } = req.body;
    const tenantId = req.user!.tenantId!;
    const userId = req.user!.userId;

    if (!content || content.trim() === "") {
      return res.status(400).json({ error: "Message content required" });
    }

    const chat = await prisma.chat.findFirst({
      where: { id: chatId, tenantId },
    });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    const senderRole = req.user!.role;
    const message = await prisma.chatMessage.create({
      data: {
        chatId,
        userId,
        content: content.trim(),
        senderRole,
      },
      include: {
        user: { select: { firstName: true, lastName: true, role: true } },
      },
    });

    const messageWithRole = {
      ...message,
      user: {
        ...message.user,
        role: message.senderRole || message.user.role,
      },
    };

    res.status(201).json({ message: messageWithRole });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/tenant/classes/:classId/chat/ensure", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { classId } = req.params;
    const tenantId = req.user!.tenantId;

    if (req.user!.role !== "COOP_ADMIN") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const classItem = await prisma.class.findFirst({
      where: { id: classId, tenantId: tenantId! },
    });

    if (!classItem) {
      return res.status(404).json({ error: "Class not found" });
    }

    let chat = await prisma.chat.findFirst({
      where: { classId, tenantId: tenantId! },
    });

    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          tenantId: tenantId!,
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

export default router;
