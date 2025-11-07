import { prisma } from '../lib/prismaClient.js';
import { AppError } from '../middlewares/errorHandler.js';
import { type NotificationCreateInput } from '../types/notification.js';

class NotificationRepository {
  create(data: NotificationCreateInput) {
    return prisma.notification.create({
      data: {
        ...data,
        productId: data.productId ?? null,
        articleId: data.articleId ?? null,
        commentId: data.commentId ?? null,
      },
    });
  }

  findByUserId(userId: number) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  countUnread(userId: number) {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(userId: number, notificationId: number) {
    const r = await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
    if (r.count === 0) {
      throw new AppError('요청이 허용되지 않습니다.', 403);
    }
    return r;
  }

  markAllAsRead(userId: number) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}

export const notificationRepository = new NotificationRepository();
