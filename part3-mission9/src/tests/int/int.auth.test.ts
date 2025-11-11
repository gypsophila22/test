import { jest } from '@jest/globals';
import bcrypt from 'bcrypt';
import type { JwtPayload } from 'jsonwebtoken';
import request from 'supertest';

import { prisma } from '../../lib/prismaClient.js';
import { validation } from '../../middlewares/validation.js';
import { asMockFn, type Awaited } from '../_helper/jest-typed.js';
import {
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
} from '../../lib/constants.js';

function extractCookieUnsafe(res: any, name: string): string | null {
  const raw = res.get('Set-Cookie');
  const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const item = arr.find(
    (c: string) => typeof c === 'string' && c.startsWith(`${name}=`)
  );
  if (!item) return null;
  const first = item.split(';', 1)[0];
  const eq = first.indexOf('=');
  return eq >= 0 ? first.slice(eq + 1) : null;
}

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
        // 스키마는 실제 미들웨어에서 검사하므로 여기선 패스
      }
      next();
      return Promise.resolve();
    }) as typeof validation.validateRegister);

    const { createTestApp } = await import('../_helper/test-app.js');
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

    type UserCreateArgs = Parameters<typeof prisma.user.create>[0];
    type UserEntity = Awaited<ReturnType<typeof prisma.user.create>>;

    asMockFn<UserCreateArgs, UserEntity>(
      prisma.user.create
    ).mockRejectedValueOnce(p2002);

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
    } satisfies NonNullable<FindUniqueRet>);

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
    type FindUniqueArgs = Parameters<typeof prisma.user.findUnique>[0];
    type FindUniqueRet = Awaited<ReturnType<typeof prisma.user.findUnique>>;

    asMockFn<FindUniqueArgs, FindUniqueRet>(
      prisma.user.findUnique
    ).mockResolvedValueOnce(null);

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
    } satisfies NonNullable<FindUniqueRet>);

    await request(app)
      .post('/users/login')
      .send({ username: 'u2', password: 'wrong-pass' })
      .expect(401);
  });

  test('POST /auth/refresh → 200 + accessToken 재발급 & refresh 회전', async () => {
    const hashed = await bcrypt.hash('1234abcd!', 10);

    type FindUniqueArgs = Parameters<typeof prisma.user.findUnique>[0];
    type FindUniqueRet = Awaited<ReturnType<typeof prisma.user.findUnique>>;

    asMockFn<FindUniqueArgs, FindUniqueRet>(
      prisma.user.findUnique
    ).mockResolvedValue({
      id: 77,
      username: 'ruser',
      email: 'r@ex.com',
      password: hashed,
      images: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies NonNullable<FindUniqueRet>);

    const loginRes = await request(app)
      .post('/users/login')
      .send({ username: 'ruser', password: '1234abcd!' })
      .expect(200);

    const setCookie = loginRes.get('Set-Cookie') ?? [];
    const cookieHeader = (Array.isArray(setCookie) ? setCookie : [setCookie])
      .map((c) => c.split(';')[0])
      .join('; ');

    const res = await request(app)
      .post('/auth/refresh')
      .set('Cookie', cookieHeader)
      .expect(200);

    expect(res.body).toEqual(
      expect.objectContaining({ accessToken: expect.any(String) })
    );

    const refreshedCookies = (res.get('Set-Cookie') ?? []).join(';');
    expect(refreshedCookies).toMatch(
      new RegExp(
        `${ACCESS_TOKEN_COOKIE_NAME.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&')}=`
      )
    );
    expect(refreshedCookies).toMatch(
      new RegExp(
        `${REFRESH_TOKEN_COOKIE_NAME.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&')}=`
      )
    );
  });

  test('POST /auth/refresh (쿠키 없음) → 401', async () => {
    const res = await request(app).post('/auth/refresh').expect(401);
    expect(res.body).toEqual(
      expect.objectContaining({ message: expect.any(String) })
    );
  });

  test('POST /auth/refresh (토큰 위조: 재서명으로 시그니처 불일치) → 401', async () => {
    // 1) 로그인 가능한 유저 mock
    type FindUniqueArgs = Parameters<typeof prisma.user.findUnique>[0];
    type FindUniqueRet = Awaited<ReturnType<typeof prisma.user.findUnique>>;

    const hashed = await bcrypt.hash('1234abcd!', 10);
    asMockFn<FindUniqueArgs, FindUniqueRet>(
      prisma.user.findUnique
    ).mockResolvedValue({
      id: 777,
      username: 'siguser',
      email: 'sig@ex.com',
      password: hashed,
      images: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies NonNullable<FindUniqueRet>);

    // 2) 정상 로그인 → 진짜 refresh 토큰 확보
    const loginRes = await request(app)
      .post('/users/login')
      .send({ username: 'siguser', password: '1234abcd!' })
      .expect(200);

    const refreshRaw = extractCookieUnsafe(loginRes, REFRESH_TOKEN_COOKIE_NAME);
    expect(typeof refreshRaw).toBe('string');

    // 3) 동일 payload로 "다른 시크릿" 재서명 → forged
    const jwt = (await import('jsonwebtoken')).default;
    const C1 = await import('../../lib/constants.js');

    const decoded = jwt.decode(refreshRaw!) as JwtPayload | null;
    const sub = (decoded?.sub as unknown as number) ?? 777;

    const BAD_SECRET = `${C1.REFRESH_TOKEN_SECRET}__FORGED__`; // 반드시 다름
    const forged = jwt.sign({ sub, type: 'refresh' }, BAD_SECRET, {
      algorithm: 'HS256',
      expiresIn: '7d',
    });

    // 4) sanity: jsonwebtoken 레벨에서도 반드시 실패해야 함
    expect(() =>
      jwt.verify(forged, C1.REFRESH_TOKEN_SECRET, { algorithms: ['HS256'] })
    ).toThrow();

    // 5) 모듈 캐시 리셋 후 fresh import로 함수 단위 검증
    jest.resetModules();
    const { verifyRefreshToken } = await import('../../lib/token.js');

    // 혹시 모르게 C2.SECRET과 BAD_SECRET이 같은지 확인 (디버깅용, 필요시 주석)
    // expect(BAD_SECRET).not.toBe(C2.REFRESH_TOKEN_SECRET);

    expect(() => verifyRefreshToken(forged)).toThrow(
      /유효하지 않은 리프레시 토큰/
    );

    // 6) 라우터 401
    const fakeCookieHeader = `${REFRESH_TOKEN_COOKIE_NAME}=${encodeURIComponent(
      forged
    )}`;
    await request(app)
      .post('/auth/refresh')
      .set('Cookie', [fakeCookieHeader])
      .expect(401);
  });
});
