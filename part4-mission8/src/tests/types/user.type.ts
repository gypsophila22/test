export type UserEntity = {
  id: number;
  username: string;
  email: string;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
};

export const makeUser = (overrides: Partial<UserEntity> = {}): UserEntity => ({
  id: 1,
  username: 'u',
  email: 'e@example.com',
  images: [] as string[], // 빈 배열의 never[] 추론 방지
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  ...overrides,
});

export type CommentEntity = {
  id: number;
  content: string;
  likeCount: number;
  createdAt: Date;
  product: { id: number; name: string } | null;
  article: { id: number; title: string } | null;
};

export type LikedCommentEntity = CommentEntity & { isLiked: boolean };

export const makeComment = (o: Partial<CommentEntity> = {}): CommentEntity => ({
  id: 1,
  content: 'comment',
  likeCount: 0,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  product: null,
  article: { id: 100, title: 'A' },
  ...o,
});

export const makeLikedComment = (
  o: Partial<LikedCommentEntity> = {}
): LikedCommentEntity => ({
  ...makeComment(),
  isLiked: true,
  ...o,
});

// 상품
export type ProductEntity = {
  id: number;
  name: string;
  description: string;
  price: number;
  tags: string[];
  images: string[];
  userId: number;
  createdAt: Date;
  updatedAt: Date;
};
export const makeProduct = (o: Partial<ProductEntity> = {}): ProductEntity => ({
  id: 10,
  name: 'P',
  description: 'desc',
  price: 1000,
  tags: [],
  images: [],
  userId: 7,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  ...o,
});

// 게시글
export type ArticleEntity = {
  id: number;
  title: string;
  content: string;
  tags: string[];
  images: string[];
  userId: number;
  createdAt: Date;
  updatedAt: Date;
};

export const makeArticle = (o: Partial<ArticleEntity> = {}): ArticleEntity => ({
  id: 20,
  title: 'A',
  content: 'content',
  tags: [],
  images: [],
  userId: 7,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  ...o,
});
