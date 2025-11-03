import { notificationRepository } from '../repositories/notification-repository.js';
import { wsGateway } from '../lib/ws.js'; // (아래 4번에서 설명할 WebSocket 브로드캐스터)

export const notificationService = {
  async pushPriceChange(args: {
    receiverUserId: number;
    productId: number;
    productName: string;
    oldPrice: number;
    newPrice: number;
  }) {
    const { receiverUserId, productId, productName, oldPrice, newPrice } = args;

    const message = `${productName} 가격이 ${oldPrice}원 → ${newPrice}원 으로 변경되었습니다.`;

    const notif = await notificationRepository.create({
      userId: receiverUserId,
      type: 'PRICE_CHANGE',
      message,
      productId,
    });

    // 실시간 전송
    wsGateway.notifyUser(receiverUserId, notif);

    return notif;
  },

  async pushNewComment(args: {
    receiverUserId: number;
    articleId: number;
    commentId: number;
    articleTitle: string;
    commenterName: string;
  }) {
    const {
      receiverUserId,
      articleId,
      commentId,
      articleTitle,
      commenterName,
    } = args;
    const message = `${commenterName} 님이 '${articleTitle}' 글에 댓글을 남겼습니다.`;

    const notif = await notificationRepository.create({
      userId: receiverUserId,
      type: 'NEW_COMMENT',
      message,
      articleId,
      commentId,
    });

    wsGateway.notifyUser(receiverUserId, notif);

    return notif;
  },

  async getMyNotifications(userId: number) {
    return notificationRepository.findByUserId(userId);
  },

  async getMyUnreadCount(userId: number) {
    return notificationRepository.countUnread(userId);
  },

  async markAsRead(userId: number, notificationId: number) {
    return notificationRepository.markAsRead(userId, notificationId);
  },

  async markAllAsRead(userId: number) {
    return notificationRepository.markAllAsRead(userId);
  },
};
