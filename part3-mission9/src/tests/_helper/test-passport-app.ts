import express from 'express';
import passport from 'passport';
import { localStrategy } from '../../lib/passport/localStrategy.js'; // 기존 코드 그대로

export function createPassportTestApp() {
  const app = express();
  app.use(express.json());
  passport.use(localStrategy);
  app.use(passport.initialize());

  app.post(
    '/login',
    passport.authenticate('local', { session: false }),
    (req, res) => {
      // req.user가 채워졌다면 컨트롤러에서 하던 일의 최소형만 응답
      res.status(200).json({ ok: true, user: req.user });
    }
  );

  // 에러 바디 노출 (디버깅용)
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.status || 500).json({ message: err.message });
  });

  return app;
}
