// src/tests/product.price-change.test.ts
import { jest } from '@jest/globals';

jest.setTimeout(15000);

// 테스트에서 현재가를 제어하기 위한 변수
let CURRENT_PRICE = 1000;

describe('updateProductPrice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('가격이 바뀌면 DB 업데이트 + 좋아요 유저 전원에게 알림', async () => {
    await jest.isolateModulesAsync(async () => {
      CURRENT_PRICE = 1000;

      // 1) prisma 싱글톤 로드 → 사용하는 모델들 패치
      const prismaMod = (await import('../lib/prismaClient.js')) as any;
      const prisma = prismaMod.prisma ?? prismaMod.default;

      prisma.product = {
        findUnique: jest.fn(async () => ({
          id: 101,
          name: '상품',
          price: CURRENT_PRICE,
          userId: 99,
        })),
        update: jest.fn(async ({ data }: any) => ({
          id: 101,
          name: '상품',
          price: data.price,
          userId: 99,
        })),
      };

      // like-repository는 prisma.productLike
      prisma.productLike = {
        findMany: jest.fn(async (_args: any) => [
          // like-repository.ts가 select로 user{id}를 가져가므로 이 형태로 반환
          { user: { id: 2 } },
          { user: { id: 7 } },
        ]),
      };

      // notificationService에서 쓸 수 있으니 마련
      prisma.notification = {
        create: jest.fn(async (args: any) => ({
          id: 1,
          userId: args.data.userId,
          productId: args.data.productId ?? null,
          type: args.data.type,
          message: args.data.message,
          createdAt: new Date(),
          isRead: false,
        })),
      };

      // 2) ws 게이트웨이는 스파이로 교체
      const wsMod = (await import('../lib/ws.js')) as any;
      if (wsMod.wsGateway) {
        wsMod.wsGateway.notifyUser = jest.fn();
      }

      // 3) 서비스 import (레포는 prisma를 통해 접근 → 패치된 목으로 동작)
      const { productService } = await import('../services/product-service.js');

      await productService.updateProductPrice(101, 2000, 999);

      // 4) 검증
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 101 }),
          data: expect.objectContaining({ price: 2000 }),
        })
      );

      expect(prisma.productLike.findMany).toHaveBeenCalled(); // 좋아요 유저 조회됨

      if ((await import('../lib/ws.js')).wsGateway) {
        expect(
          (await import('../lib/ws.js')).wsGateway.notifyUser
        ).toHaveBeenCalledTimes(2);
        expect(
          (await import('../lib/ws.js')).wsGateway.notifyUser
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 2,
            data: expect.objectContaining({ productId: 101 }),
          })
        );
        expect(
          (await import('../lib/ws.js')).wsGateway.notifyUser
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 7,
            data: expect.objectContaining({ productId: 101 }),
          })
        );
      }
    });
  });

  test('가격이 같으면 업데이트/알림 없음', async () => {
    await jest.isolateModulesAsync(async () => {
      CURRENT_PRICE = 2000;

      const prismaMod = (await import('../lib/prismaClient.js')) as any;
      const prisma = prismaMod.prisma ?? prismaMod.default;

      prisma.product = {
        findUnique: jest.fn(async () => ({
          id: 101,
          name: '상품',
          price: CURRENT_PRICE,
          userId: 99,
        })),
        update: jest.fn(), // 호출되면 안 됨
      };

      prisma.productLike = {
        findMany: jest.fn(), // 호출되면 안 됨
      };

      prisma.notification = {
        create: jest.fn(), // 호출되면 안 됨
      };

      const wsMod = (await import('../lib/ws.js')) as any;
      if (wsMod.wsGateway) {
        wsMod.wsGateway.notifyUser = jest.fn(); // 호출되면 안 됨
      }

      const { productService } = await import('../services/product-service.js');

      await productService.updateProductPrice(101, 2000, 999);

      expect(prisma.product.update).not.toHaveBeenCalled();
      expect(prisma.productLike.findMany).not.toHaveBeenCalled();
      expect(prisma.notification.create).not.toHaveBeenCalled();

      if ((await import('../lib/ws.js')).wsGateway) {
        expect(
          (await import('../lib/ws.js')).wsGateway.notifyUser
        ).not.toHaveBeenCalled();
      }
    });
  });
});
