import type { Prisma } from '@prisma/client';

export type ArticleModel = {
  findUnique: (
    args: Prisma.ArticleFindUniqueArgs
  ) => Promise<{ id: number; userId: number; title: string } | null>;
};

export type ProductModel = {
  findUnique: (
    args: Prisma.ProductFindUniqueArgs
  ) => Promise<{ id: number; userId: number; name: string } | null>;
};

export type CommentModel = {
  create: (args: Prisma.CommentCreateArgs) => Promise<{
    id: number;
    content: string;
    userId: number;
    articleId: number | null;
    productId: number | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  findMany: (args: Prisma.CommentFindManyArgs) => Promise<unknown[]>;
};

export type UserModel = {
  findUnique: (
    args: Prisma.UserFindUniqueArgs
  ) => Promise<{ username: string } | null>;
};

export type NotificationModel = {
  create: (args: Prisma.NotificationCreateArgs) => Promise<{
    id: number;
    userId: number;
    createdAt: Date;
    articleId: number | null;
    productId: number | null;
    type: string;
    message: string;
    commentId: number | null;
    isRead: boolean;
  }>;
};

export type PrismaPatchArticle = {
  article: ArticleModel;
  comment: CommentModel;
  user: UserModel;
  notification: NotificationModel;
};

export type PrismaPatchProduct = {
  product: ProductModel;
  comment: CommentModel;
  user: UserModel;
  notification: NotificationModel;
};
