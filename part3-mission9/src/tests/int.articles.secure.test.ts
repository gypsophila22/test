import './_helper/mock-modules.js';
import request from 'supertest';

import { createTestApp } from './_helper/test-app.js';
import { prisma } from '../lib/prismaClient.js';
import { seedArticles } from './_helper/prisma-mock.js';
import { loginAndGetSession } from './_helper/test-utils.js';

describe('[통합] 게시글 API (인증 필요)', () => {
  let app: import('express').Express;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /articles → 201 (쿠키 필요)', async () => {
    const { accessToken } = await loginAndGetSession(app);

    (prisma.article.create as jest.Mock).mockResolvedValue({
      id: 1,
      title: 'N',
      content: 'd',
      tags: [],
      images: [],
      userId: 7,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .post('/articles')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'N', content: 'd', tags: [], images: [] })
      .expect(201);

    expect(res.body).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({ id: 1, title: 'N' }),
      })
    );
  });

  test('PATCH /articles/:id → 200 (쿠키 필요)', async () => {
    const { accessToken } = await loginAndGetSession(app);
    seedArticles([{ id: 1, title: 'N', userId: 7 }]);
    (prisma.article.update as jest.Mock).mockResolvedValue({
      id: 1,
      title: 'N2',
      content: 'd2',
      tags: [],
      images: [],
      userId: 7,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .patch('/articles/1')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'N2', content: 'd2', tags: [], images: [] })
      .expect(200);

    expect(res.body).toEqual({
      data: { message: '게시글이 수정되었습니다.' },
    });
  });

  test('DELETE /articles/:id → 200 (쿠키 필요)', async () => {
    const { accessToken } = await loginAndGetSession(app);
    seedArticles([{ id: 1, title: 'N', userId: 7 }]);
    (prisma.article.delete as jest.Mock).mockResolvedValue({
      id: 1,
      title: 'N2',
      content: 'd2',
      tags: [],
      images: [],
      userId: 7,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await request(app)
      .delete('/articles/1')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);
  });
});
