import request from 'supertest';
import { createTestApp } from './_helper/test-app.js';
import {
  prismaReset,
  seedProducts,
  seedProductLikes,
  seedCommentLikes,
} from './_helper/prisma-mock.js';

describe('[통합] 게시글 API (비인증)', () => {
  let app: import('express').Express;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(() => {
    prismaReset();
    seedProducts([
      { id: 21, name: 'B', images: ['b1.png'], tags: [] },
      { id: 22, name: 'C', images: ['c1.png'], tags: [] },
    ]);
    seedProductLikes([
      { productId: 21, userId: 1 },
      { productId: 21, userId: 2 },
    ]);
    // 서비스가 댓글·댓글좋아요도 집계한다면 필요
    seedCommentLikes([{ commentId: 100, userId: 1 }]);
  });
  test('GET /products → 200 + 목록', async () => {
    const res = await request(app)
      .get('/products')
      .query({ page: 1, pageSize: 10 })
      .expect(200);

    expect(res.body).toEqual(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ id: 21, name: 'B' }),
          expect.objectContaining({ id: 22, name: 'C' }),
        ]),
      })
    );
  });

  test('GET /products/:id → 200 + 단건', async () => {
    const res = await request(app).get('/products/21').expect(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({ id: 21, name: 'B' }),
      })
    );
  });

  test('GET /products/404 → 404', async () => {
    await request(app).get('/products/404').expect(404);
  });
});
