import request from 'supertest';
import bcrypt from 'bcrypt';
import { jest } from '@jest/globals';
import { prisma } from '../lib/prismaClient.js';
import { validation } from '../middlewares/validation.js';
import { asMockFn, type Awaited } from './_helper/jest-typed.js';

import {
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
} from '../lib/constants.js';

describe('[통합] 인증 (회원가입/로그인)', () => {
  let app: import('express').Express;

  beforeAll(async () => {
    jest.spyOn(validation, 'validateRegister').mockImplementation(((
      req,
      _res,
      next
    ) => {
      if (
        typeof req.body?.email !== 'string' ||
        typeof req.body?.username !== 'string' ||
        typeof req.body?.password !== 'string'
      ) {
      }
      next();
      return Promise.resolve();
    }) as typeof validation.validateRegister);

    const { createTestApp } = await import('./_helper/test-app.js');
    app = await createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.log as unknown as jest.Mock).mockRestore();
    (console.error as unknown as jest.Mock).mockRestore();
  });

  // ---------------------------
  // 회원가입
  // ---------------------------
  test('POST /users/register → 201 + 생성된 유저 일부 필드', async () => {
    const now = new Date();

    // create의 반환 타입을 정확히 맞춰줌
    type UserCreateArgs = Parameters<typeof prisma.user.create>[0];
    type UserEntity = Awaited<ReturnType<typeof prisma.user.create>>;
    asMockFn<UserCreateArgs, UserEntity>(prisma.user.create).mockResolvedValue({
      id: 101,
      email: 'new@ex.com',
      username: 'newbie',
      password: await bcrypt.hash('1234abcd!', 10),
      images: [] as string[],
      createdAt: now,
      updatedAt: now,
    } satisfies UserEntity);

    const res = await request(app)
      .post('/users/register')
      .send({ email: 'new@ex.com', username: 'newbie', password: '1234abcd!' })
      .expect(201);

    const body = res.body ?? {};
    const flattened = body.data?.user ?? body.data ?? body.user ?? body;

    expect(flattened).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        email: 'new@ex.com',
        username: 'newbie',
      })
    );

    expect(prisma.user.create).toHaveBeenCalledTimes(1);
  });

  test('POST /users/register (중복 이메일) → 409', async () => {
    const p2002 = Object.assign(new Error('P2002'), {
      code: 'P2002' as const,
      meta: { target: ['email'] as string[] },
    }) as Error & { code: 'P2002'; meta: { target: string[] } };
    jest.spyOn(prisma.user, 'create').mockRejectedValueOnce(p2002);

    const res = await request(app)
      .post('/users/register')
      .send({ email: 'dup@ex.com', username: 'dup', password: '1234abcd!' })
      .expect(409);

    expect(res.body).toEqual(
      expect.objectContaining({
        status: 409,
        message: expect.stringMatching(/이미 사용 중인 이메일|중복/),
      })
    );
  });

  // ---------------------------
  // 로그인
  // ---------------------------
  test('POST /users/login → 200 + 토큰 + 쿠키', async () => {
    const hashed = await bcrypt.hash('1234abcd!', 10);

    type FindUniqueArgs = Parameters<typeof prisma.user.findUnique>[0];
    type FindUniqueRet = Awaited<ReturnType<typeof prisma.user.findUnique>>;

    asMockFn<FindUniqueArgs, FindUniqueRet>(
      prisma.user.findUnique
    ).mockResolvedValue({
      id: 7,
      username: 'u',
      email: 'u@ex.com',
      password: hashed,
      images: [] as string[],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as FindUniqueRet);

    const res = await request(app)
      .post('/users/login')
      .send({ username: 'u', password: '1234abcd!' })
      .expect(200);

    expect(res.body).toEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      })
    );

    const rawCookies = res.get('Set-Cookie') ?? [];
    const cookies = (
      Array.isArray(rawCookies) ? rawCookies : [rawCookies]
    ).join(';');

    expect(typeof ACCESS_TOKEN_COOKIE_NAME).toBe('string');
    expect(typeof REFRESH_TOKEN_COOKIE_NAME).toBe('string');

    expect(cookies).toMatch(
      new RegExp(
        `${ACCESS_TOKEN_COOKIE_NAME.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&')}=`
      )
    );
    expect(cookies).toMatch(
      new RegExp(
        `${REFRESH_TOKEN_COOKIE_NAME.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&')}=`
      )
    );
  });

  test('POST /users/login (없는 유저) → 400', async () => {
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce(null);

    await request(app)
      .post('/users/login')
      .send({ username: 'nope', password: 'whatever' })
      .expect(401);
  });

  test('POST /users/login (비밀번호 불일치) → 400', async () => {
    const hashedReal = await bcrypt.hash('real-pass', 10);

    type FindUniqueArgs = Parameters<typeof prisma.user.findUnique>[0];
    type FindUniqueRet = Awaited<ReturnType<typeof prisma.user.findUnique>>;

    asMockFn<FindUniqueArgs, FindUniqueRet>(
      prisma.user.findUnique
    ).mockResolvedValueOnce({
      id: 9,
      username: 'u2',
      email: 'u2@ex.com',
      password: hashedReal,
      images: [] as string[],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as FindUniqueRet);

    await request(app)
      .post('/users/login')
      .send({ username: 'u2', password: 'wrong-pass' })
      .expect(401);
  });
});
