// import './mock-modules.js';
// import request from 'supertest';
// import type { PrismaMock } from './mock-modules.js';
// import bcrypt from 'bcryptjs';

// export async function getPrismaMock(): Promise<PrismaMock> {
//   const mod: any = await import('../../lib/prismaClient.js');
//   return (mod.default ?? mod.prisma) as PrismaMock;
// }

// /**
//  * 로그인해서 쿠키 받기
//  * - localStrategy 가 email을 아이디로 쓰면 useEmail=true 로 호출
//  * - loginPath 는 실제 라우터 경로와 일치시킬 것 (예: '/auth/login' or '/users/login')
//  */
// export async function loginAndGetCookies(
//   app: import('express').Express,
//   opts?: {
//     loginPath?: string; // default: '/users/login'
//     username?: string; // default: 'u'
//     email?: string; // default: 'u@ex.com'
//     password?: string; // default: 'pw' (평문)
//   }
// ) {
//   const {
//     loginPath = '/users/login',
//     username = 'u',
//     email = 'u@ex.com',
//     password = 'pw', // ← 평문
//   } = opts ?? {};

//   const prisma = await getPrismaMock();

//   if (!prisma?.user?.findUnique) {
//     throw new Error(
//       'prisma.user.findUnique mock이 없습니다. mock-modules가 먼저 로드되는지 확인하세요.'
//     );
//   }
//   console.log('isMock?', 'mockResolvedValue' in prisma.user.findUnique);
//   prisma.user.findUnique.mockResolvedValue({
//     id: 7,
//     username,
//     email,
//     password: await bcrypt.hash('pw', 10), // ← 저장된 해시
//     createdAt: new Date(),
//     updatedAt: new Date(),
//     images: [],
//   });

//   const res = await request(app)
//     .post(loginPath)
//     .send({ username: username, password: password }) // ★ 평문
//     .expect(200);
//   console.log('res:', res);
//   const setCookie = res.headers['set-cookie'];
//   return Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
// }

import './mock-modules.js';
import request from 'supertest';
import type { PrismaMock } from './mock-modules.js'; // 네 util대로 가져오면 됨
import bcrypt from 'bcrypt'; // 앱이 bcrypt 쓰면 테스트도 bcrypt로!

export async function getPrismaMock(): Promise<PrismaMock> {
  const mod: any = await import('../../lib/prismaClient.js');
  return (mod.default ?? mod.prisma) as PrismaMock;
}

export async function loginAndGetSession(
  app: import('express').Express,
  opts?: { loginPath?: string; username?: string; password?: string }
) {
  const {
    loginPath = '/users/login',
    username = 'u',
    password = 'pw',
  } = opts ?? {};
  const prisma = await getPrismaMock();

  // DB에 저장된 해시를 리턴하도록 mock
  prisma.user.findUnique.mockResolvedValue({
    id: 7,
    username,
    email: 'u@ex.com',
    password: await bcrypt.hash(password, 10),
    createdAt: new Date(),
    updatedAt: new Date(),
    images: [],
  });

  const res = await request(app)
    .post(loginPath)
    .send({ username, password })
    .expect(200);

  const setCookies = res.headers['set-cookie'] ?? [];
  const cookiePairs = (
    Array.isArray(setCookies) ? setCookies : [setCookies]
  ).map((c) => c.split(';')[0]);
  const accessToken = res.body?.accessToken as string | undefined;

  return { cookies: cookiePairs, accessToken };
}
