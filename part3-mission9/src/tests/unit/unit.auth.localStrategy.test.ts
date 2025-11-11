// src/tests/auth.localStrategy.int.test.ts
import bcrypt from 'bcrypt';
import request from 'supertest';

import { prisma } from '../../lib/prismaClient.js';
import { createPassportTestApp } from '../_helper/test-passport-app.js';

describe('passport-local (비밀번호 검증)', () => {
  const app = createPassportTestApp();

  test('비번이 맞으면 200', async () => {
    const hashed = await bcrypt.hash('1234abcd!', 10);
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: 7,
      username: 'u',
      email: 'u@ex.com',
      password: hashed,
      createdAt: new Date(),
      updatedAt: new Date(),
      images: [],
    });

    await request(app)
      .post('/login')
      .send({ username: 'u', password: '1234abcd!' })
      .expect(200);
  });

  test('비번이 틀리면 401', async () => {
    const hashed = await bcrypt.hash('1234abcd!', 10);
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: 7,
      username: 'u',
      email: 'u@ex.com',
      password: hashed,
      createdAt: new Date(),
      updatedAt: new Date(),
      images: [],
    });

    await request(app)
      .post('/login')
      .send({ username: 'u', password: 'wrong!' })
      .expect(401);
  });
});
