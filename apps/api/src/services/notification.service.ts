import { prisma } from "../db.js";

export async function getNotifications(userRole?: string) {
  const where: any = {};
  if (userRole && userRole !== "ADMIN") {
    where.OR = [
      { targetRole: "ALL" },
      { targetRole: userRole },
    ];
  }

  return await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
}

export async function markNotificationAsRead(id: number) {
  return await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
}
