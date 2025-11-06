import { jest } from '@jest/globals';
import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import request from 'supertest';
import {
  makeArticle,
  makeComment,
  makeLikedComment,
  makeProduct,
  makeUser,
} from './types/user.type.js';

async function reqAndDump(
  r: request.Test,
  expected: number
): Promise<request.Response> {
  const resp = await r;
  if (resp.status !== expected) {
    console.log('--- FAIL DUMP ---');
    console.log('status:', resp.status);
    console.log('headers:', resp.headers);
    console.log('body:', resp.body);
    console.log('text:', resp.text);
    console.log('-----------------');
  }
  expect(resp.status).toBe(expected);
  return resp;
}

function makeApp(
  ctrl: typeof import('../controllers/user-controller.js')['userController']
) {
  const app = express();
  app.use(express.json());

  app.patch('/users/:userId', (req, res) => ctrl.updateUserProfile(req, res));
  app.get('/users/:userId', (req, res) => ctrl.getUserProfile(req, res));
  app.post('/login', (req, res) => {
    (
      req as Request & { user: { id: number; email: string; username: string } }
    ).user = {
      id: 3,
      email: 'u@example.com',
      username: 'u',
    };
    return ctrl.login(req, res);
  });
  app.post('/users/:userId/password', (req, res) =>
    ctrl.updatePassword(req, res)
  );
  app.get('/users/:userId/likes/products', (req, res) =>
    ctrl.getUserLikedProducts(req, res)
  );
  app.get('/users/:userId/likes/articles', (req, res) =>
    ctrl.getUserLikedArticles(req, res)
  );
  app.get('/users/:userId/likes/comments', (req, res) =>
    ctrl.getUserLikedComments(req, res)
  );

  // 에러 바디도 보여주기 (디버그 편의)
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({
      message: 'internal',
      error: err instanceof Error ? err.stack ?? err.message : String(err),
    });
  });

  return app;
}

describe('UserController (isolated, no any)', () => {
  test('updateUserProfile → 200 / updated 반환', async () => {
    await jest.isolateModulesAsync(async () => {
      // 0) Prisma 모킹 (DB 차단)
      await jest.unstable_mockModule('../lib/prismaClient.js', () => {
        const prisma = {
          user: {
            update: jest.fn(async () =>
              makeUser({
                id: 7,
                username: 'neo',
                email: 'neo@ex.com',
                images: ['x.png'],
              })
            ),
            findUnique: jest.fn(async ({ where: { id } }: any) =>
              id === 404 ? null : makeUser({ id })
            ),
          },
        };
        return { prisma };
      });

      // 1) (선택) 기존 서비스 모킹 — 유지해도 됨
      await jest.unstable_mockModule('../services/product-service.js', () => ({
        productService: {
          getUserLikedProducts: jest.fn(async () => [{ id: 10, name: 'P' }]),
        },
      }));
      await jest.unstable_mockModule('../services/article-service.js', () => ({
        articleService: {
          getUserLikedArticles: jest.fn(async () => [{ id: 20, title: 'A' }]),
        },
      }));

      // 2) import
      const { userController } = await import(
        '../controllers/user-controller.js'
      );
      const svcMod = await import('../services/user-service.js');

      // 3) 컨트롤러가 참조 중인 userService 인스턴스의 메서드를 직접 패치
      const us = svcMod.userService;

      // updateUserProfile 은 컨트롤러가 updated(부분 필드)만 쓰는 구조라면 아래처럼 OK
      const updateUserProfileSpy = jest
        .spyOn(us, 'updateUserProfile')
        .mockResolvedValue(
          makeUser({
            id: 7,
            username: 'neo',
            email: 'neo@ex.com',
            images: ['x.png'],
          })
        );

      // getUserProfile 은 createdAt/updatedAt 포함된 풀 타입을 반환해야 TS 에러가 안 남
      const getUserProfileSpy = jest
        .spyOn(us, 'getUserProfile')
        .mockImplementation(async (userId: number) =>
          userId === 404 ? null : makeUser({ id: userId })
        );

      jest
        .spyOn(us, 'login')
        .mockResolvedValue({ accessToken: 'a.t', refreshToken: 'r.t' });

      jest.spyOn(us, 'updatePassword').mockResolvedValue(
        makeUser({ id: 7 }) // 컨트롤러가 해당 반환을 쓰지 않더라도 타입은 맞춰야 함
      );
      // 4) app 생성 & 요청
      const app = makeApp(userController);

      const resp = await reqAndDump(
        request(app)
          .patch('/users/7')
          .send({ username: 'neo', email: 'neo@ex.com', images: ['x.png'] }),
        200
      );

      // 5) 검증
      expect(updateUserProfileSpy).toHaveBeenCalledWith(7, {
        username: 'neo',
        email: 'neo@ex.com',
        images: ['x.png'],
      });
      expect(resp.body).toEqual(
        expect.objectContaining({
          message: '프로필 수정 완료!',
          updated: expect.objectContaining({
            username: 'neo',
            email: 'neo@ex.com',
            images: ['x.png'],
          }),
        })
      );

      // getUserProfileSpy 타입도 문제 없이 유지되는지 한번 호출해봄(선택)
      await us.getUserProfile(7);
      expect(getUserProfileSpy).toHaveBeenCalledWith(7);
    });
  });

  test('getUserProfile: 404 처리', async () => {
    await jest.isolateModulesAsync(async () => {
      await jest.unstable_mockModule('../lib/prismaClient.js', () => {
        const prisma = {
          user: {
            findUnique: jest.fn(async ({ where: { id } }: any) =>
              id === 404 ? null : makeUser({ id })
            ),
          },
        };
        return { prisma };
      });

      const { userController } = await import(
        '../controllers/user-controller.js'
      );
      const svcMod = await import('../services/user-service.js');
      const us = svcMod.userService;

      const getUserProfileSpy = jest
        .spyOn(us, 'getUserProfile')
        .mockImplementation(async (userId: number) =>
          userId === 404 ? null : makeUser({ id: userId })
        );

      const app = makeApp(userController);

      const resp = await reqAndDump(request(app).get('/users/404'), 404);

      expect(getUserProfileSpy).toHaveBeenCalledWith(404);
      expect(resp.body).toEqual({ message: '유저를 찾을 수 없습니다.' });
    });
  });

  test('login → 200 / 토큰 + 쿠키 세팅', async () => {
    await jest.isolateModulesAsync(async () => {
      // DB 차단 (안전망)
      await jest.unstable_mockModule('../lib/prismaClient.js', () => ({
        prisma: {},
      }));

      const { userController } = await import(
        '../controllers/user-controller.js'
      );
      const svcMod = await import('../services/user-service.js');
      const us = svcMod.userService;

      const loginSpy = jest
        .spyOn(us, 'login')
        .mockResolvedValue({ accessToken: 'a.t', refreshToken: 'r.t' });

      const setTokenCookiesSpy = jest
        .spyOn(us, 'setTokenCookies')
        .mockImplementation((res, a, r) => {
          res.cookie('at', a);
          res.cookie('rt', r);
        });

      const app = makeApp(userController);

      const resp = await reqAndDump(
        // makeApp 내부에서 req.user를 주입해 둠(id:3)
        request(app).post('/login'),
        200
      );

      expect(loginSpy).toHaveBeenCalledWith(3);
      expect(setTokenCookiesSpy).toHaveBeenCalledWith(
        expect.anything(),
        'a.t',
        'r.t'
      );
      expect(resp.body).toEqual(
        expect.objectContaining({
          accessToken: 'a.t',
          refreshToken: 'r.t',
          message: '로그인 되었습니다.',
        })
      );
    });
  });

  test('logout → 200 / 쿠키 삭제 호출', async () => {
    await jest.isolateModulesAsync(async () => {
      await jest.unstable_mockModule('../lib/prismaClient.js', () => ({
        prisma: {},
      }));

      const { userController } = await import(
        '../controllers/user-controller.js'
      );
      const svcMod = await import('../services/user-service.js');
      const us = svcMod.userService;

      const clearTokenCookiesSpy = jest
        .spyOn(us, 'clearTokenCookies')
        .mockImplementation((res) => {
          res.clearCookie('at');
          res.clearCookie('rt');
        });

      // logout 라우트는 makeApp에 없으니 임시 app 생성
      const app = express();
      app.use(express.json());
      app.post('/logout', (req, res) => userController.logout(req, res));
      const resp = await reqAndDump(request(app).post('/logout'), 200);

      expect(clearTokenCookiesSpy).toHaveBeenCalledWith(expect.anything());
      expect(resp.body).toEqual({ message: '로그아웃 되었습니다.' });
    });
  });

  test('register → 201 / data 반환', async () => {
    await jest.isolateModulesAsync(async () => {
      await jest.unstable_mockModule('../lib/prismaClient.js', () => ({
        prisma: {},
      }));

      const { userController } = await import(
        '../controllers/user-controller.js'
      );
      const svcMod = await import('../services/user-service.js');
      const us = svcMod.userService;

      const registerSpy = jest
        .spyOn(us, 'register')
        .mockResolvedValue(
          makeUser({ id: 77, username: 'neo', email: 'neo@ex.com' })
        );

      const app = express();
      app.use(express.json());
      app.post('/register', (req, res) => userController.register(req, res));

      const payload = {
        username: 'neo',
        email: 'neo@ex.com',
        password: 'pass123!',
      };
      const resp = await reqAndDump(
        request(app).post('/register').send(payload),
        201
      );

      expect(registerSpy).toHaveBeenCalledWith('neo', 'neo@ex.com', 'pass123!');
      expect(resp.body).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            id: 77,
            username: 'neo',
            email: 'neo@ex.com',
          }),
          message: '회원 가입 성공!',
        })
      );
    });
  });

  test('updatePassword → 400 (새 비밀번호 불일치)', async () => {
    await jest.isolateModulesAsync(async () => {
      await jest.unstable_mockModule('../lib/prismaClient.js', () => ({
        prisma: {},
      }));

      const { userController } = await import(
        '../controllers/user-controller.js'
      );
      const svcMod = await import('../services/user-service.js');
      const us = svcMod.userService;

      const updatePasswordSpy = jest
        .spyOn(us, 'updatePassword')
        .mockResolvedValue(makeUser({ id: 7 }));

      const app = makeApp(userController);

      const resp = await reqAndDump(
        request(app).post('/users/7/password').send({
          currentPassword: 'old',
          newPassword: 'a',
          newPasswordConfirm: 'b',
        }),
        400
      );

      expect(resp.body).toEqual({
        message: '새 비밀번호가 일치하지 않습니다.',
      });
      expect(updatePasswordSpy).not.toHaveBeenCalled();
    });
  });

  test('updatePassword → 200 (성공)', async () => {
    await jest.isolateModulesAsync(async () => {
      await jest.unstable_mockModule('../lib/prismaClient.js', () => ({
        prisma: {},
      }));

      const { userController } = await import(
        '../controllers/user-controller.js'
      );
      const svcMod = await import('../services/user-service.js');
      const us = svcMod.userService;

      // 서비스 시그니처가 Promise<void>든 유저든 안전하게 맞추기 위해 유저로 반환
      const updatePasswordSpy = jest
        .spyOn(us, 'updatePassword')
        .mockResolvedValue(makeUser({ id: 7 }));

      const app = makeApp(userController);

      const body = {
        currentPassword: 'old',
        newPassword: 'new123!',
        newPasswordConfirm: 'new123!',
      };

      const resp = await reqAndDump(
        request(app).post('/users/7/password').send(body),
        200
      );

      expect(updatePasswordSpy).toHaveBeenCalledWith(7, 'old', 'new123!');
      expect(resp.body).toEqual({ message: '비밀번호가 변경되었습니다.' });
    });
  });

  test('getUserComments → 200 / comments 배열', async () => {
    await jest.isolateModulesAsync(async () => {
      await jest.unstable_mockModule('../lib/prismaClient.js', () => ({
        prisma: {},
      }));

      const { userController } = await import(
        '../controllers/user-controller.js'
      );
      const svcMod = await import('../services/user-service.js');
      const us = svcMod.userService;

      const comments = [makeComment({ id: 1, content: 'hi' })];
      const getUserCommentsSpy = jest
        .spyOn(us, 'getUserComments')
        .mockResolvedValue(comments);

      const app = express();
      app.use(express.json());
      app.get('/users/:userId/comments', (req, res) =>
        userController.getUserComments(req, res)
      );

      const resp = await reqAndDump(request(app).get('/users/7/comments'), 200);

      expect(getUserCommentsSpy).toHaveBeenCalledWith(7);
      expect(resp.body).toEqual({
        comments: expect.arrayContaining([
          expect.objectContaining({ id: 1, content: 'hi' }),
        ]),
      });
    });
  });

  test('getUserLikedProducts → 200 / data 배열', async () => {
    await jest.isolateModulesAsync(async () => {
      await jest.unstable_mockModule('../lib/prismaClient.js', () => ({
        prisma: {},
      }));

      const { userController } = await import(
        '../controllers/user-controller.js'
      );

      const prodMod = await import('../services/product-service.js');
      const productService = prodMod.productService;

      const spy = jest
        .spyOn(productService, 'getUserLikedProducts')
        .mockResolvedValue([makeProduct({ id: 10, name: 'P' })]);

      const app = makeApp(userController);

      const resp = await reqAndDump(
        request(app).get('/users/7/likes/products'),
        200
      );

      expect(spy).toHaveBeenCalledWith(7);
      +expect(resp.body).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({ id: 10, name: 'P' }),
        ]),
      });
    });
  });

  test('getUserLikedArticles → 200 / data 배열', async () => {
    await jest.isolateModulesAsync(async () => {
      await jest.unstable_mockModule('../lib/prismaClient.js', () => ({
        prisma: {},
      }));

      const { userController } = await import(
        '../controllers/user-controller.js'
      );

      const artMod = await import('../services/article-service.js');
      const articleService = artMod.articleService;

      const spy = jest
        .spyOn(articleService, 'getUserLikedArticles')
        .mockResolvedValue([makeArticle({ id: 20, title: 'A' })]);

      const app = makeApp(userController);

      const resp = await reqAndDump(
        request(app).get('/users/7/likes/articles'),
        200
      );

      expect(spy).toHaveBeenCalledWith(7);
      expect(resp.body).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({ id: 20, title: 'A' }),
        ]),
      });
    });
  });

  test('getUserLikedComments → 200 / data 배열', async () => {
    await jest.isolateModulesAsync(async () => {
      await jest.unstable_mockModule('../lib/prismaClient.js', () => ({
        prisma: {},
      }));

      const { userController } = await import(
        '../controllers/user-controller.js'
      );
      const svcMod = await import('../services/user-service.js');
      const us = svcMod.userService;

      const spy = jest
        .spyOn(us, 'getUserLikedComments')
        .mockResolvedValue([makeLikedComment({ id: 30, content: 'nice' })]);

      const app = makeApp(userController);

      const resp = await reqAndDump(
        request(app).get('/users/7/likes/comments'),
        200
      );

      expect(spy).toHaveBeenCalledWith(7);
      expect(resp.body).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({ id: 30, content: 'nice' }),
        ]),
      });
    });
  });
});
