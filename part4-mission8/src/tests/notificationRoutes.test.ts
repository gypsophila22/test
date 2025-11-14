import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

const TEST_USER = { id: 2, email: 'user@x.com' };

type Ctx = {
  app: express.Express;
  notificationRepository: any;
  generateTokens: (id: number) => { accessToken: string; refreshToken: string };
};

function makeApp(passport: any, notificationRouter: any) {
  const app = express();
  app.use(express.json());
  app.use(passport.initialize());
  app.use('/notifications', notificationRouter);
  app.use((err: any, _req: any, res: any, _next: any) => {
    // eslint-disable-next-line no-console
    console.error('Route error:', err);
    res
      .status(err?.status || 500)
      .json({ message: err?.message || 'internal' });
  });
  return app;
}

/** 매 테스트마다 깨끗한 컨텍스트 구성 */
async function setupCtx(): Promise<Ctx> {
  let app!: express.Express;
  let notificationRepository!: any;
  let generateTokens!: Ctx['generateTokens'];

  await jest.isolateModulesAsync(async () => {
    // 1) prisma 먼저 import 후 메서드 패치로 DB 호출 차단
    const prismaMod = await import('../lib/prismaClient.js');
    const prismaObj: any =
      (prismaMod as any).prisma ?? (prismaMod as any).default;
    prismaObj.user = prismaObj.user ?? {};
    prismaObj.user.findUnique = jest.fn(async () => TEST_USER);

    // 2) 그 다음 인증/라우터/레포/토큰 import
    const passportMod = await import('../lib/passport/index.js');
    const routerMod = await import('../routes/notification-router.js');
    const repoMod = await import('../repositories/notification-repository.js');
    const tokenMod = await import('../lib/token.js');

    const passport = (passportMod as any).default ?? passportMod;
    const notificationRouter = (routerMod as any).default;

    app = makeApp(passport, notificationRouter);
    notificationRepository = (repoMod as any).notificationRepository;
    generateTokens = (tokenMod as any).generateTokens;
  });

  return { app, notificationRepository, generateTokens };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Notification routes (real JWT + mocked Prisma)', () => {
  test('GET /notifications -> list mine', async () => {
    const { app, notificationRepository, generateTokens } = await setupCtx();

    jest
      .spyOn(notificationRepository, 'findByUserId')
      .mockResolvedValue([{ id: 11 }]);

    const { accessToken } = generateTokens(TEST_USER.id);
    const res = await request(app)
      .get('/notifications')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 11 })])
    );
    expect(notificationRepository.findByUserId).toHaveBeenCalledWith(
      TEST_USER.id
    );
  });

  test('GET /notifications/unread-count -> returns count', async () => {
    const { app, notificationRepository, generateTokens } = await setupCtx();

    jest.spyOn(notificationRepository, 'countUnread').mockResolvedValue(3);

    const { accessToken } = generateTokens(TEST_USER.id);
    const res = await request(app)
      .get('/notifications/unread-count')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const bodyCount = (res.body as any).count ?? (res.body as any).unreadCount;
    expect(bodyCount).toBe(3);
    expect(notificationRepository.countUnread).toHaveBeenCalledWith(
      TEST_USER.id
    );
  });

  test('PATCH /notifications/:id/read -> mark one as read', async () => {
    const { app, notificationRepository, generateTokens } = await setupCtx();

    jest
      .spyOn(notificationRepository, 'markAsRead')
      .mockResolvedValue({ count: 1 });

    const { accessToken } = generateTokens(TEST_USER.id);
    const res = await request(app)
      .patch('/notifications/1/read')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect((r) => {
        if (![200, 204].includes(r.status)) {
          throw new Error(`Unexpected status: ${r.status}`);
        }
      });

    if (res.status === 200) {
      expect(res.body).toEqual(expect.objectContaining({ count: 1 }));
    }
    expect(notificationRepository.markAsRead).toHaveBeenCalledWith(
      TEST_USER.id,
      1
    );
  });

  test('PATCH /notifications/read-all -> mark all as read', async () => {
    const { app, notificationRepository, generateTokens } = await setupCtx();

    jest
      .spyOn(notificationRepository, 'markAllAsRead')
      .mockResolvedValue({ count: 5 });

    const { accessToken } = generateTokens(TEST_USER.id);
    const res = await request(app)
      .patch('/notifications/read-all')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect((r) => {
        if (![200, 204].includes(r.status)) {
          throw new Error(`Unexpected status: ${r.status}`);
        }
      });

    if (res.status === 200) {
      expect(res.body).toEqual({ count: 5 });
    }
    expect(notificationRepository.markAllAsRead).toHaveBeenCalledWith(
      TEST_USER.id
    );
  });
});
