import { notificationService } from '../services/notification-service.js';

// prisma & ws 모킹
jest.mock('../repositories/notification-repository.js', () => ({
  notificationRepository: {
    create: jest.fn(),
    findByUserId: jest.fn(),
    countUnread: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
  },
}));
jest.mock('../lib/ws.js', () => ({
  wsGateway: { notifyUser: jest.fn() },
}));

import { notificationRepository } from '../repositories/notification-repository.js';
import { wsGateway } from '../lib/ws.js';

describe('notificationService', () => {
  beforeEach(() => jest.clearAllMocks());

  test('pushPriceChange: creates DB row & pushes WS', async () => {
    (notificationRepository.create as jest.Mock).mockResolvedValue({
      id: 101,
      userId: 2,
      type: 'PRICE_CHANGE',
      message: '테스트',
      productId: 7,
      isRead: false,
      createdAt: new Date('2025-01-01T00:00:00Z'),
    });

    const notif = await notificationService.pushPriceChange({
      receiverUserId: 2,
      productId: 7,
      productName: '쏘나타',
      oldPrice: 2400,
      newPrice: 2200,
    });

    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 2,
        type: 'PRICE_CHANGE',
        productId: 7,
        message: expect.stringContaining('쏘나타'),
      })
    );

    expect(wsGateway.notifyUser).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 2,
        type: 'PRICE_CHANGE',
        message: expect.any(String),
        createdAt: expect.any(Date), // service에서 Date로 넘기고 ws가 ISO로 변환해도 OK
      })
    );

    expect(notif.id).toBe(101);
  });

  test('pushNewComment: creates DB row & pushes WS', async () => {
    (notificationRepository.create as jest.Mock).mockResolvedValue({
      id: 202,
      userId: 9,
      type: 'NEW_COMMENT',
      message: '테스트',
      articleId: 33,
      commentId: 55,
      isRead: false,
      createdAt: new Date('2025-01-01T00:00:00Z'),
    });

    await notificationService.pushNewComment({
      receiverUserId: 9,
      articleId: 33,
      commentId: 55,
      articleTitle: '글제목',
      commenterName: '코더',
    });

    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 9,
        type: 'NEW_COMMENT',
        articleId: 33,
        commentId: 55,
        message: expect.stringContaining('글제목'),
      })
    );

    expect(wsGateway.notifyUser).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 9,
        type: 'NEW_COMMENT',
        message: expect.any(String),
        createdAt: expect.any(Date),
      })
    );
  });
});
