import passport from 'passport';
import { localStrategy } from './localStrategy.js';
import { accessTokenStrategy, refreshTokenStrategy } from './jwtStrategy.js';

// 1) 전략 등록 (이름을 명시해두면 라우터에서 읽기 쉬움)
passport.use('local', localStrategy);
passport.use('access-token', accessTokenStrategy); // access 토큰 검증
passport.use('refresh-token', refreshTokenStrategy); // refresh 토큰 검증

// 2) 세션 안 쓰면 serialize/deserialize 불필요
//    (세션을 쓸 거면 아래 주석 해제하고 prisma 경로/모델명 맞춰서 사용)
// import { prisma } from '../prismaClient.js';
// import type { AuthUser } from '../../types/authenticated-request.js';
// passport.serializeUser((user: AuthUser, done) => done(null, user.id));
// passport.deserializeUser(async (id: number, done) => {
//   try {
//     const user = await prisma.user.findUnique({ where: { id } });
//     done(null, user ?? false);
//   } catch (e) {
//     done(e);
//   }
// });

// 3) 미들웨어 export (라우터에서 바로 쓰기 편하게)
export const localAuth = passport.authenticate('local', { session: false });
export const accessAuth = passport.authenticate('access-token', {
  session: false,
});
export const refreshAuth = passport.authenticate('refresh-token', {
  session: false,
});

// 4) 기본 export: 초기화용 passport 인스턴스
export default passport;
