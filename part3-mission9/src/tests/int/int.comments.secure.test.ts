import request from 'supertest';

import {
  prismaReset,
  seedArticles,
  seedProducts,
  seedComments,
} from '../_helper/prisma-mock.js';
import { createTestApp } from '../_helper/test-app.js';
import { loginAndGetSession } from '../_helper/test-utils.js';

describe('[통합] 게시글 댓글 API (인증 필요)', () => {
  let app: import('express').Express;

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(() => {
    prismaReset();
  });

  test('GET /articles/:articleId/comments → 200 (토큰 필요) + 목록', async () => {
    const { accessToken, user } = await loginAndGetSession(app, { userId: 7 });
    seedArticles([{ id: 1, title: 'A', userId: user.id }]);
    seedComments([{ id: 101, articleId: 1, userId: user.id, content: 'c' }]);

    const res = await request(app)
      .get('/articles/1/comments')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toEqual(
      expect.objectContaining({ data: expect.any(Array) })
    );
    expect(res.body.data[0]).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        content: expect.any(String),
      })
    );
  });

  test('GET /articles/:articleId/comments → 200 (토큰 없음, 비로그인)', async () => {
    seedArticles([{ id: 1, title: 'A', userId: 7 }]);
    await request(app).get('/articles/1/comments').expect(200);
  });

  test('POST /articles/:articleId/comments → 201 (토큰 필요)', async () => {
    const { accessToken, user } = await loginAndGetSession(app, { userId: 7 });
    seedArticles([{ id: 1, title: 'A', userId: user.id }]);

    const res = await request(app)
      .post('/articles/1/comments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: 'hello' })
      .expect((r) => {
        if (r.status !== 201) {
          console.error(
            '[POST /articles/:id/comments] status=',
            r.status,
            'body=',
            r.body
          );
        }
      })
      .expect(201);

    expect(res.body).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          id: expect.any(Number),
          content: 'hello',
        }),
      })
    );
  });

  test('PATCH /comments/:commentId → 200 (소유자) / 403 (비소유자)', async () => {
    const { accessToken, user } = await loginAndGetSession(app, { userId: 7 });
    seedArticles([{ id: 1, title: 'A', userId: user.id }]);
    const [c] = seedComments([
      { id: 201, articleId: 1, userId: user.id, content: 'old' },
    ]);
    if (!c) throw new Error('seedComments failed');
    const cId = c.id;

    await request(app)
      .patch(`/articles/comments/${cId}`) // ← 경로 불일치 의심: /articles/comments/${cId} 일 수도
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: 'new' })
      .expect((r) => {
        if (r.status !== 200) {
          console.error(
            '[PATCH /comments/:id] status=',
            r.status,
            'body=',
            r.body
          );
        }
      })
      .expect(200);

    const { accessToken: other } = await loginAndGetSession(app, {
      userId: 999,
    });
    await request(app)
      .patch(`/articles/comments/${cId}`)
      .set('Authorization', `Bearer ${other}`)
      .send({ content: 'hack' })
      .expect(403);
  });

  test('POST/DELETE /comments/:id/like → 200 → (200 or 204)', async () => {
    const { accessToken, user } = await loginAndGetSession(app, { userId: 7 });
    // ✅ 먼저 게시글 시드
    seedArticles([{ id: 1, title: 'A', userId: user.id }]);
    const [c] = seedComments([
      { id: 301, articleId: 1, userId: user.id, content: 'c' },
    ]);
    if (!c) throw new Error('seedComments failed'); // 테스트 가드
    const cId = c.id;

    const likeRes = await request(app)
      .post(`/articles/comments/${cId}/like`) // ← 경로 재확인
      .set('Authorization', `Bearer ${accessToken}`)
      .expect((r) => {
        if (r.status !== 200) {
          console.error(
            '[POST /comments/:id/like] status=',
            r.status,
            'body=',
            r.body
          );
        }
      })
      .expect(200);

    expect(likeRes.body).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          message: expect.stringMatching(/완료|liked/i),
          likeCount: expect.any(Number),
        }),
      })
    );

    const unlikeRes = await request(app)
      .delete(`/articles/comments/${cId}/like`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect((res) => {
        if (![200, 204].includes(res.status)) {
          throw new Error(`expected 200 or 204, got ${res.status}`);
        }
      });

    // 200으로 왔다면 바디 메시지도 확인(옵션)
    if (unlikeRes.status === 200) {
      expect(unlikeRes.body).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            message: expect.stringMatching(/취소|unliked/i),
            likeCount: expect.any(Number),
          }),
        })
      );
    }
  });
});

describe('[통합] 상품 댓글 API (인증 필요)', () => {
  let app: import('express').Express;

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(() => {
    prismaReset();
  });

  test('GET /products/:productId/comments → 200 (토큰 필요) + 목록', async () => {
    const { accessToken, user } = await loginAndGetSession(app, { userId: 7 });
    seedProducts([{ id: 1, name: 'A', price: 111, userId: user.id }]);
    seedComments([{ id: 101, productId: 1, userId: user.id, content: 'c' }]);

    const res = await request(app)
      .get('/products/1/comments')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toEqual(
      expect.objectContaining({ data: expect.any(Array) })
    );
    expect(res.body.data[0]).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        content: expect.any(String),
      })
    );
  });

  test('GET /products/:productId/comments → 200 (토큰 없음, 비로그인)', async () => {
    seedProducts([{ id: 1, name: 'A', price: 111, userId: 7 }]);
    await request(app).get('/products/1/comments').expect(200);
  });

  test('POST /products/:productId/comments → 201 (토큰 필요)', async () => {
    const { accessToken, user } = await loginAndGetSession(app, { userId: 7 });
    seedProducts([{ id: 1, name: 'A', price: 111, userId: user.id }]);

    const res = await request(app)
      .post('/products/1/comments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: 'hello' })
      .expect((r) => {
        if (r.status !== 201) {
          console.error(
            '[POST /products/:id/comments] status=',
            r.status,
            'body=',
            r.body
          );
        }
      })
      .expect(201);

    expect(res.body).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          id: expect.any(Number),
          content: 'hello',
        }),
      })
    );
  });

  test('PATCH /comments/:commentId → 200 (소유자) / 403 (비소유자)', async () => {
    const { accessToken, user } = await loginAndGetSession(app, { userId: 7 });
    seedProducts([{ id: 1, name: 'A', price: 111, userId: user.id }]);
    const [c] = seedComments([
      { id: 201, productId: 1, userId: user.id, content: 'old' },
    ]);
    if (!c) throw new Error('seedComments failed');
    const cId = c.id;

    await request(app)
      .patch(`/products/comments/${cId}`) // ← 경로 불일치 의심: /products/comments/${cId} 일 수도
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: 'new' })
      .expect((r) => {
        if (r.status !== 200) {
          console.error(
            '[PATCH /comments/:id] status=',
            r.status,
            'body=',
            r.body
          );
        }
      })
      .expect(200);

    const { accessToken: other } = await loginAndGetSession(app, {
      userId: 999,
    });
    await request(app)
      .patch(`/products/comments/${cId}`)
      .set('Authorization', `Bearer ${other}`)
      .send({ content: 'hack' })
      .expect(403);
  });

  test('POST/DELETE /comments/:id/like → 200 → (200 or 204)', async () => {
    const { accessToken, user } = await loginAndGetSession(app, { userId: 7 });
    // ✅ 먼저 게시글 시드
    seedProducts([{ id: 1, name: 'A', price: 111, userId: user.id }]);
    const [c] = seedComments([
      { id: 301, productId: 1, userId: user.id, content: 'c' },
    ]);
    if (!c) throw new Error('seedComments failed'); // 테스트 가드
    const cId = c.id;

    const likeRes = await request(app)
      .post(`/products/comments/${cId}/like`) // ← 경로 재확인
      .set('Authorization', `Bearer ${accessToken}`)
      .expect((r) => {
        if (r.status !== 200) {
          console.error(
            '[POST /comments/:id/like] status=',
            r.status,
            'body=',
            r.body
          );
        }
      })
      .expect(200);

    expect(likeRes.body).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          message: expect.stringMatching(/완료|liked/i),
          likeCount: expect.any(Number),
        }),
      })
    );

    const unlikeRes = await request(app)
      .delete(`/products/comments/${cId}/like`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect((res) => {
        if (![200, 204].includes(res.status)) {
          throw new Error(`expected 200 or 204, got ${res.status}`);
        }
      });

    // 200으로 왔다면 바디 메시지도 확인(옵션)
    if (unlikeRes.status === 200) {
      expect(unlikeRes.body).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            message: expect.stringMatching(/취소|unliked/i),
            likeCount: expect.any(Number),
          }),
        })
      );
    }
  });
});
