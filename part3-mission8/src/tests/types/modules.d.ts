import type { PrismaClient } from '@prisma/client';

declare module '../lib/prismaClient.js' {
  // 실제 코드에서 export const prisma = new PrismaClient()
  export const prisma: PrismaClient;
  export default prisma;
}

declare module '../lib/ws.js' {
  export interface WsGateway {
    notifyUser: (userId: number, payload: unknown) => void;
  }
  export const wsGateway: WsGateway | null | undefined;
}

declare module '../services/comments/article-cmt-service.js' {
  export const articleCommentService: {
    createArticleComment(
      articleId: number,
      content: string,
      userId: number
    ): Promise<{ id: number }>;
  };
}

declare module '../services/comments/product-cmt-service.js' {
  export const productCommentService: {
    createProductComment(
      productId: number,
      content: string,
      userId: number
    ): Promise<{ id: number }>;
  };
}
