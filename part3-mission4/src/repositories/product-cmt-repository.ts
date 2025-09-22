import { prisma } from '../lib/prismaClient.js';

export const productCommentRepository = {
  findByProductId(productId: number) {
    return prisma.comment.findMany({
      where: { productId },
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  create(productId: number, content: string, userId: number) {
    return prisma.comment.create({
      data: {
        content,
        user: { connect: { id: userId } },
        product: { connect: { id: productId } },
      },
    });
  },
};
