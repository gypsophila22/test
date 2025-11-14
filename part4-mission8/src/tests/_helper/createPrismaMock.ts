export function createPrismaMock() {
  const prisma = {
    // ---- articles ----
    article: {
      findUnique: jest.fn(async () => ({ id: 9, userId: 3, title: '멋진 글' })),
    },

    // ---- comments ----
    comment: {
      create: jest.fn(async () => ({
        id: 55,
        content: 'hi',
        userId: 2,
        articleId: 9,
        productId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      findMany: jest.fn(async () => []),
    },

    // ---- users ----
    user: {
      findUnique: jest.fn(async () => ({ id: 3, username: '코더' })),
    },

    // ---- notifications ----
    notification: {
      create: jest.fn(async (args: any) => ({
        id: 1000,
        userId: args.data.userId,
        createdAt: new Date(),
        articleId: args.data.articleId ?? null,
        productId: args.data.productId ?? null,
        type: args.data.type,
        message: args.data.message,
        commentId: args.data.commentId ?? null,
        isRead: false,
      })),
    },

    // ---- products (price-change 테스트용) ----
    product: {
      findUnique: jest.fn(async () => ({
        id: 101,
        name: '상품',
        price: 1000,
      })),
      update: jest.fn(async ({ data }: any) => ({
        id: 101,
        name: '상품',
        price: data.price,
      })),
    },

    // 좋아요 유저 목록 (price-change 테스트용)
    likedProduct: {
      findMany: jest.fn(async ({ where }: any) => [
        { userId: 2, productId: where.productId },
        { userId: 7, productId: where.productId },
      ]),
    },
  };

  // ESM default/named import 모두 대응
  return { prisma, default: prisma };
}
