import { jest } from '@jest/globals';
import type { Prisma } from '@prisma/client';
import type { PrismaPatchArticle } from './types/prisma-partial.js';

jest.setTimeout(15000);

test('게시글: 남의 글에 댓글 → 글쓴이에게 알림', async () => {
  await jest.isolateModulesAsync(async () => {
    // 1) prisma 싱글톤 로드 (모듈 타입은 .d.ts에서 제공)
    const { prisma } = await import('../lib/prismaClient.js');

    // 2) 우리가 덮어쓸 부분만 타입 안전하게 패치
    const patch: PrismaPatchArticle = {
      article: {
        findUnique: jest.fn(async () => ({
          id: 9,
          userId: 3,
          title: '멋진 글',
        })),
      },
      comment: {
        create: jest.fn(async () => ({
          id: 55,
          content: 'hi',
          userId: 2,
          articleId: 9,
          productId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        findMany: jest.fn(async () => []),
      },
      user: {
        findUnique: jest.fn(async () => ({ username: '코더' })),
      },
      notification: {
        create: jest.fn(async (args: Prisma.NotificationCreateArgs) => ({
          id: 1000,
          userId: args.data.userId as number,
          createdAt: new Date(),
          articleId: (args.data.articleId as number | null) ?? null,
          productId: null,
          type: args.data.type as string,
          message: args.data.message as string,
          commentId: (args.data.commentId as number | null) ?? null,
          isRead: false,
        })),
      },
    };

    // prisma는 실제 인스턴스이므로, 필요한 메서드만 덮어씀
    Object.assign(prisma as unknown as PrismaPatchArticle, patch);

    // 3) ws 게이트웨이도 타입 안전하게 스파이로 교체
    const wsMod: typeof import('../lib/ws.js') = await import('../lib/ws.js');
    if (wsMod.wsGateway) {
      wsMod.wsGateway.notifyUser = jest.fn();
    }

    // 4) 서비스 import (타입은 .d.ts로 이미 부여됨)
    const { articleCommentService } = await import(
      '../services/comments/article-cmt-service.js'
    );

    // 5) 실행 & 검증
    const result = await articleCommentService.createArticleComment(9, 'hi', 2);
    expect(result.id).toBe(55);

    // Notification payload 검증
    const createMock = patch.notification.create as jest.Mock;
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 3,
          type: 'NEW_COMMENT',
          articleId: 9,
          commentId: 55,
        }),
      })
    );
  });
});
