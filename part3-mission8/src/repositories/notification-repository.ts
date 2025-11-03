import { prisma } from '../lib/prismaClient.js';

export const notificationRepository = {
  create(data: {
    userId: number;
    type: 'PRICE_CHANGE' | 'NEW_COMMENT';
    message: string;
    productId?: number;
    articleId?: number;
    commentId?: number;
  }) {
    return prisma.notification.create({ data });
  },

  findByUserId(userId: number) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  },

  countUnread(userId: number) {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  },

  markAsRead(userId: number, notificationId: number) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  },

  markAllAsRead(userId: number) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  },
};
