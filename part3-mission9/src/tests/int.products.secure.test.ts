import './_helper/mock-modules.js';
import { createTestApp } from './_helper/test-app.js';
import { prisma } from '../lib/prismaClient.js';
import { loginAndGetSession } from './_helper/test-utils.js';
import request from 'supertest';
import { seedProducts } from './_helper/prisma-mock.js';

describe('[통합] 상품 API (인증 필요)', () => {
  let app: import('express').Express;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /products → 201 (쿠키 필요)', async () => {
    const { accessToken } = await loginAndGetSession(app);

    (prisma.product.create as jest.Mock).mockResolvedValue({
      id: 1,
      name: 'N',
      description: 'd',
      price: 999,
      tags: [],
      images: [],
      userId: 7,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'N', description: 'd', price: 999, tags: [], images: [] })
      .expect(201);

    expect(res.body).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({ id: 1, name: 'N' }),
      })
    );
  });

  test('PATCH /products/:id → 200 (쿠키 필요)', async () => {
    const { accessToken } = await loginAndGetSession(app);
    seedProducts([{ id: 1, name: 'N', userId: 7, price: 1000 }]);
    (prisma.product.update as jest.Mock).mockResolvedValue({
      id: 1,
      name: 'N2',
      description: 'd2',
      price: 888,
      tags: [],
      images: [],
      userId: 7,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .patch('/products/1')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'N2', description: 'd2', price: 888 })
      .expect(200);

    expect(res.body).toEqual({
      data: { message: '상품이 수정되었습니다.' },
    });
  });

  test('DELETE /products/:id → 200 (쿠키 필요)', async () => {
    const { accessToken } = await loginAndGetSession(app);
    seedProducts([{ id: 1, name: 'N', userId: 7, price: 1000 }]);
    (prisma.product.delete as jest.Mock).mockResolvedValue({
      id: 1,
      name: 'N2',
      description: 'd2',
      price: 888,
      tags: [],
      images: [],
      userId: 7,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await request(app)
      .delete('/products/1')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);
  });
});
