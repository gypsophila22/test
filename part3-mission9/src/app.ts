import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import http from 'http';

import passport from './lib/passport/index.js';
import { setupWebSocket } from './lib/ws.js';
import errorHandler from './middlewares/errorHandler.js';
import { requestLogger } from './middlewares/logger.js';
import routes from './routes/index.js';
import { setupSwagger } from './swagger.js';

export async function buildApp(opts: { forTest?: boolean } = {}) {
  dotenv.config(process.env.NODE_ENV === 'test' ? { quiet: true } : undefined);
  const forTest = !!opts.forTest;

  const app = express();

  app.use(
    cors({
      origin: [
        process.env.CORS_ORIGIN || 'http://localhost:3001',
        'https://codeit-mission3.com',
      ],
      credentials: true,
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/uploads', express.static('uploads'));

  app.use(cookieParser());
  app.use(passport.initialize());
  app.use(requestLogger);

  app.use('/', routes);
  setupSwagger(app); // swagger는 필요 시 끄고 싶으면 forTest 조건 넣어도 됨

  app.use(errorHandler);

  if (!forTest) {
    const server = http.createServer(app);
    setupWebSocket(server);
    const PORT = Number(process.env.PORT) || 3000;
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  }

  return app;
}

// 실제 실행 진입점 (개발/운영)
if (process.env.NODE_ENV !== 'test') {
  buildApp({ forTest: false }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
