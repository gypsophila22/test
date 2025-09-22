import { prisma } from '../lib/prismaClient.js';

type LikeModels = 'articleLike' | 'productLike' | 'commentLike';

type TargetIdKey<M extends LikeModels> = M extends 'articleLike'
  ? 'articleId'
  : M extends 'productLike'
  ? 'productId'
  : 'commentId';

type CompositeKey<M extends LikeModels> = M extends 'articleLike'
  ? 'userId_articleId'
  : M extends 'productLike'
  ? 'userId_productId'
  : 'userId_commentId';

export class LikeRepository<M extends LikeModels> {
  constructor(private model: M) {}

  async create(userId: number, targetId: number) {
    const targetKey = this.getTargetKey();
    return (prisma as any)[this.model].create({
      data: { userId, [targetKey]: targetId },
    });
  }

  async delete(userId: number, targetId: number) {
    const targetKey = this.getTargetKey();
    const compositeKey = this.getCompositeKey();
    return (prisma as any)[this.model].delete({
      where: { [compositeKey]: { userId, [targetKey]: targetId } },
    });
  }

  async count(targetId: number) {
    const targetKey = this.getTargetKey();
    return (prisma as any)[this.model].count({
      where: { [targetKey]: targetId },
    });
  }

  async exists(userId: number, targetId: number): Promise<boolean> {
    const targetKey = this.getTargetKey();
    const compositeKey = this.getCompositeKey();
    const record = await (prisma as any)[this.model].findUnique({
      where: { [compositeKey]: { userId, [targetKey]: targetId } },
    });
    return !!record;
  }

  private getTargetKey(): TargetIdKey<M> {
    if (this.model === 'articleLike') return 'articleId' as TargetIdKey<M>;
    if (this.model === 'productLike') return 'productId' as TargetIdKey<M>;
    return 'commentId' as TargetIdKey<M>;
  }

  private getCompositeKey(): CompositeKey<M> {
    if (this.model === 'articleLike')
      return 'userId_articleId' as CompositeKey<M>;
    if (this.model === 'productLike')
      return 'userId_productId' as CompositeKey<M>;
    return 'userId_commentId' as CompositeKey<M>;
  }
}

export const articleLikeRepository = new LikeRepository('articleLike');
export const productLikeRepository = new LikeRepository('productLike');
export const commentLikeRepository = new LikeRepository('commentLike');
