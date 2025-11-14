import { notificationService } from '../services/notification-service.js';

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

describe('notificationService - read & state', () => {
  beforeEach(() => jest.clearAllMocks());

  test('getMyNotifications: returns my notifications', async () => {
    (notificationRepository.findByUserId as jest.Mock).mockResolvedValue([
      {
        id: 1,
        userId: 2,
        type: 'PRICE_CHANGE',
        message: '...',
        isRead: false,
        createdAt: new Date(),
      },
      {
        id: 2,
        userId: 2,
        type: 'NEW_COMMENT',
        message: '...',
        isRead: true,
        createdAt: new Date(),
      },
    ]);

    // ✅ 객체가 아니라 숫자 3개로 호출
    const result = await notificationService.getMyNotifications(2);

    // 레포로는 보통 객체를 내려보내겠지만, 구현에 따라 다를 수 있음
    // 구현이 객체로 넘긴다면 아래 expect는 그대로 유효
    expect(notificationRepository.findByUserId).toHaveBeenCalledWith(2);
    expect(result).toHaveLength(2);
  });

  test('getMyUnreadCount: returns unread count', async () => {
    (notificationRepository.countUnread as jest.Mock).mockResolvedValue(5);

    // ✅ 서비스 이름에 맞추기
    const count = await notificationService.getMyUnreadCount(9);

    expect(notificationRepository.countUnread).toHaveBeenCalledWith(9);
    expect(count).toBe(5);
  });

  test('markAsRead: marks specific notification as read (BatchPayload)', async () => {
    // ✅ 서비스가 BatchPayload를 반환한다면 count만 검증
    (notificationRepository.markAsRead as jest.Mock).mockResolvedValue({
      count: 1,
    });

    const updated = await notificationService.markAsRead(3, 10);

    // 레포가 객체 인자 받는 구현이라면 아래 유지
    expect(notificationRepository.markAsRead).toHaveBeenCalledWith(3, 10);
    expect(updated.count).toBe(1);
  });

  test('markAllAsRead: marks all my notifications as read', async () => {
    (notificationRepository.markAllAsRead as jest.Mock).mockResolvedValue({
      count: 7,
    });

    const result = await notificationService.markAllAsRead(3);

    expect(notificationRepository.markAllAsRead).toHaveBeenCalledWith(3);
    expect(result.count).toBe(7);
  });
});
