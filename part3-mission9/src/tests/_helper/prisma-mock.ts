// src/tests/_helper/prisma-mock.ts
import { jest } from '@jest/globals';

/* ---------- Records ---------- */
export type UserRecord = {
  id: number;
  username: string;
  email: string;
  password: string;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type ArticleRecord = {
  id: number;
  title: string;
  content: string;
  userId: number;
  tags: string[];
  images: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type ProductRecord = {
  id: number;
  name: string;
  description: string;
  price: number; // ✅ 추가
  userId: number; // ✅ 추가
  tags: string[];
  images: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type ArticleLikeRecord = {
  id: number;
  articleId: number;
  userId: number;
};
export type ProductLikeRecord = {
  id: number;
  productId: number;
  userId: number;
};
type CommentLikeRecord = { id: number; commentId: number; userId: number };

/* ---------- Select/Args helpers ---------- */
type UserSelect = Partial<Record<keyof UserRecord, boolean>>;
type UserWhereUnique = { id?: number; username?: string; email?: string };

type FindUniqueUserArgs =
  | { where: UserWhereUnique; select?: undefined }
  | {
      where: UserWhereUnique;
      select: Pick<UserSelect, 'id' | 'username' | 'email' | 'password'>;
    };

type FindUniqueUserReturn<A extends FindUniqueUserArgs> = A extends {
  select: infer S;
}
  ? S extends UserSelect
    ? Pick<UserRecord, Extract<keyof S, keyof UserRecord>> | null
    : UserRecord | null
  : UserRecord | null;

type ProductSelect = Partial<Record<keyof ProductRecord, boolean>>;
type FindUniqueProductArgs =
  | { where: { id: number }; select?: undefined }
  | {
      where: { id: number };
      select: Pick<ProductSelect, 'id' | 'userId' | 'name' | 'price'>;
    };

type FindUniqueProductReturn<A extends FindUniqueProductArgs> = A extends {
  select: infer S;
}
  ? S extends ProductSelect
    ? Pick<ProductRecord, Extract<keyof S, keyof ProductRecord>> | null
    : ProductRecord | null
  : ProductRecord | null;

/* ---------- DB (in-memory) ---------- */
const db: {
  users: UserRecord[];
  articles: ArticleRecord[];
  products: ProductRecord[];
  articleLikes: ArticleLikeRecord[];
  productLikes: ProductLikeRecord[];
  commentLikes: CommentLikeRecord[];
} = {
  users: [],
  articles: [],
  products: [],
  articleLikes: [],
  productLikes: [],
  commentLikes: [],
};

let seq = { user: 1, article: 1, product: 1, aLike: 1, pLike: 1, cLike: 1 };

/* ---------- Utils ---------- */
function pickUserBy(where: UserWhereUnique): UserRecord | undefined {
  const { id, username, email } = where;
  return db.users.find(
    (u) =>
      (id !== undefined && u.id === id) ||
      (username !== undefined && u.username === username) ||
      (email !== undefined && u.email === email)
  );
}

function ensureArticleArrays<
  T extends {
    tags?: unknown;
    images?: unknown;
    comments?: unknown;
    likes?: unknown;
  }
>(a: T) {
  return {
    ...a,
    tags: Array.isArray(a.tags) ? a.tags : [],
    images: Array.isArray(a.images) ? a.images : [],
    comments: Array.isArray(a.comments) ? a.comments : [],
    likes: Array.isArray(a.likes) ? a.likes : [],
  };
}
function ensureProductArrays<
  T extends {
    tags?: unknown;
    images?: unknown;
    comments?: unknown;
    likes?: unknown;
  }
>(p: T) {
  return {
    ...p,
    tags: Array.isArray(p.tags) ? p.tags : [],
    images: Array.isArray(p.images) ? p.images : [],
    comments: Array.isArray(p.comments) ? p.comments : [],
    likes: Array.isArray(p.likes) ? p.likes : [],
  };
}

function isNumArray(x: unknown): x is number[] {
  return (
    Array.isArray(x) &&
    x.every((n) => typeof n === 'number' && Number.isFinite(n))
  );
}

function wantsCount(v: unknown, key: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj = v as any;
  return !!(obj && (obj._all || obj[key]));
}

function matchesArticleWhere(
  a: ArticleRecord,
  where?: {
    OR?: Array<
      | { title?: { contains?: string; mode?: 'insensitive' | 'default' } }
      | { content?: { contains?: string; mode?: 'insensitive' | 'default' } }
    >;
  }
): boolean {
  if (!where?.OR || where.OR.length === 0) return true;
  return where.OR.some((cond) => {
    if ('title' in cond && cond.title?.contains != null) {
      const q = cond.title.contains!;
      return cond.title.mode === 'insensitive'
        ? a.title.toLowerCase().includes(q.toLowerCase())
        : a.title.includes(q);
    }
    if ('content' in cond && cond.content?.contains != null) {
      const q = cond.content.contains!;
      return cond.content.mode === 'insensitive'
        ? a.content.toLowerCase().includes(q.toLowerCase())
        : a.content.includes(q);
    }
    return false;
  });
}

/* ---- like matchers ---- */
type ArticleLikeWhere =
  | { articleId: number; userId?: number }
  | { articleId: { in: number[] }; userId?: number };
type ProductLikeWhere =
  | { productId: number; userId?: number }
  | { productId: { in: number[] }; userId?: number };
type CommentLikeWhere =
  | { commentId: number; userId?: number }
  | { commentId: { in: number[] }; userId?: number };

function matchArticleLike(
  where: ArticleLikeWhere,
  rec: ArticleLikeRecord
): boolean {
  const idOk =
    typeof (where as any).articleId === 'number'
      ? rec.articleId === (where as { articleId: number }).articleId
      : isNumArray((where as { articleId: { in?: number[] } }).articleId?.in) &&
        (where as { articleId: { in: number[] } }).articleId.in.includes(
          rec.articleId
        );
  const userOk =
    (where as { userId?: number }).userId === undefined ||
    rec.userId === (where as { userId?: number }).userId;
  return idOk && userOk;
}

function matchProductLike(
  where: ProductLikeWhere,
  rec: ProductLikeRecord
): boolean {
  const idOk =
    typeof (where as any).productId === 'number'
      ? rec.productId === (where as { productId: number }).productId
      : isNumArray((where as { productId: { in?: number[] } }).productId?.in) &&
        (where as { productId: { in: number[] } }).productId.in.includes(
          rec.productId
        );
  const userOk =
    (where as { userId?: number }).userId === undefined ||
    rec.userId === (where as { userId?: number }).userId;
  return idOk && userOk;
}

function matchCommentLike(
  where: CommentLikeWhere,
  rec: CommentLikeRecord
): boolean {
  const idOk =
    typeof (where as any).commentId === 'number'
      ? rec.commentId === (where as { commentId: number }).commentId
      : isNumArray((where as { commentId: { in?: number[] } }).commentId?.in) &&
        (where as { commentId: { in: number[] } }).commentId.in.includes(
          rec.commentId
        );

  const userOk =
    (where as { userId?: number }).userId === undefined ||
    rec.userId === (where as { userId?: number }).userId;

  return idOk && userOk;
}

/* ---------- Prisma Mock ---------- */
export const prisma = {
  user: {
    create: jest.fn(
      async (args: {
        data: Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt'>;
      }) => {
        const now = new Date();
        const { images: imagesIn, ...rest } = args.data;
        const rec: UserRecord = {
          id: seq.user++,
          createdAt: now,
          updatedAt: now,
          ...rest,
          images: imagesIn ?? [],
        };
        db.users.push(rec);
        return { ...rec };
      }
    ),

    findUnique: jest.fn(
      async <A extends FindUniqueUserArgs>(
        args: A
      ): Promise<FindUniqueUserReturn<A>> => {
        const found = pickUserBy(args.where);
        if (!found) return null as FindUniqueUserReturn<A>;
        if (!('select' in args) || !args.select)
          return { ...found } as FindUniqueUserReturn<A>;

        const sel = args.select as UserSelect;
        const picked = Object.fromEntries(
          Object.keys(sel)
            .filter((k) => sel[k as keyof UserSelect])
            .map((k) => [k, found[k as keyof UserRecord]])
        ) as Pick<UserRecord, Extract<keyof typeof sel, keyof UserRecord>>;
        return picked as FindUniqueUserReturn<A>;
      }
    ),

    update: jest.fn(
      async (args: {
        where: { id: number };
        data: Partial<Omit<UserRecord, 'id'>>;
      }) => {
        const target = db.users.find((u) => u.id === args.where.id);
        if (!target) {
          const e = new Error('Not found') as Error & { code: string };
          e.code = 'P2025';
          throw e;
        }
        Object.assign(target, args.data, { updatedAt: new Date() });
        return { ...target };
      }
    ),
  },

  article: {
    findMany: jest.fn(async (_args?: unknown) =>
      db.articles.map((a) => ensureArticleArrays({ ...a }))
    ),
    findUnique: jest.fn(async (args: { where: { id: number } }) => {
      const f = db.articles.find((a) => a.id === args.where.id);
      return f ? ensureArticleArrays({ ...f }) : null;
    }),
    count: jest.fn(
      async (args?: {
        where?: {
          OR?: Array<
            | {
                title?: { contains?: string; mode?: 'insensitive' | 'default' };
              }
            | {
                content?: {
                  contains?: string;
                  mode?: 'insensitive' | 'default';
                };
              }
          >;
        };
      }) =>
        db.articles.filter((a) => matchesArticleWhere(a, args?.where)).length
    ),
    create: jest.fn(
      async (args: {
        data: Omit<ArticleRecord, 'id' | 'createdAt' | 'updatedAt'>;
      }) => {
        const now = new Date();
        const rec: ArticleRecord = {
          id: seq.article++,
          title: args.data.title,
          content: args.data.content,
          userId: args.data.userId,
          tags: Array.isArray(args.data.tags) ? args.data.tags : [],
          images: Array.isArray(args.data.images) ? args.data.images : [],
          createdAt: now,
          updatedAt: now,
        };
        db.articles.push(rec);
        return { ...rec };
      }
    ),

    update: jest.fn(
      async (args: {
        where: { id: number };
        data: Partial<Omit<ArticleRecord, 'id'>>;
      }) => {
        const target = db.articles.find((p) => p.id === args.where.id);
        if (!target) {
          const e = new Error('Not found') as Error & { code: string };
          e.code = 'P2025';
          throw e;
        }
        Object.assign(target, {
          ...args.data,
          tags: args.data.tags ?? target.tags,
          images: args.data.images ?? target.images,
          updatedAt: new Date(),
        });
        return { ...target };
      }
    ),

    delete: jest.fn(async (args: { where: { id: number } }) => {
      const idx = db.articles.findIndex((a) => a.id === args.where.id);
      if (idx === -1) {
        const e = new Error('Not found') as Error & { code: string };
        e.code = 'P2025';
        throw e;
      }
      const [removed] = db.articles.splice(idx, 1);
      return { ...removed };
    }),

    deleteMany: jest.fn(async () => ({ count: 1 })),
  },

  product: {
    findMany: jest.fn(async (_args?: unknown) =>
      db.products.map((p) => ensureProductArrays({ ...p }))
    ),

    // ✅ select 지원 + 제네릭 반환
    findUnique: jest.fn(
      async <A extends FindUniqueProductArgs>(
        args: A
      ): Promise<FindUniqueProductReturn<A>> => {
        const f = db.products.find((p) => p.id === args.where.id);
        if (!f) return null as FindUniqueProductReturn<A>;

        if (!('select' in args) || !args.select) {
          return ensureProductArrays({
            ...f,
          }) as unknown as FindUniqueProductReturn<A>;
        }

        const sel = args.select as ProductSelect;
        const picked = Object.fromEntries(
          Object.keys(sel)
            .filter((k) => sel[k as keyof ProductSelect])
            .map((k) => [k, (f as Record<string, unknown>)[k]])
        ) as Pick<
          ProductRecord,
          Extract<keyof typeof sel, keyof ProductRecord>
        >;
        return picked as FindUniqueProductReturn<A>;
      }
    ),

    count: jest.fn(async (_args?: { where?: unknown }) => db.products.length),

    create: jest.fn(
      async (args: {
        data: Omit<ProductRecord, 'id' | 'createdAt' | 'updatedAt'>;
      }) => {
        const now = new Date();
        const rec: ProductRecord = {
          id: seq.product++,
          name: args.data.name,
          description: args.data.description,
          price: args.data.price ?? 0,
          userId: args.data.userId,
          tags: Array.isArray(args.data.tags) ? args.data.tags : [],
          images: Array.isArray(args.data.images) ? args.data.images : [],
          createdAt: now,
          updatedAt: now,
        };
        db.products.push(rec);
        return { ...rec };
      }
    ),

    update: jest.fn(
      async (args: {
        where: { id: number };
        data: Partial<Omit<ProductRecord, 'id'>>;
      }) => {
        const target = db.products.find((p) => p.id === args.where.id);
        if (!target) {
          const e = new Error('Not found') as Error & { code: string };
          e.code = 'P2025';
          throw e;
        }
        Object.assign(target, {
          ...args.data,
          tags: args.data.tags ?? target.tags,
          images: args.data.images ?? target.images,
          updatedAt: new Date(),
        });
        return { ...target };
      }
    ),

    delete: jest.fn(async (args: { where: { id: number } }) => {
      const idx = db.products.findIndex((p) => p.id === args.where.id);
      if (idx === -1) {
        const e = new Error('Not found') as Error & { code: string };
        e.code = 'P2025';
        throw e;
      }
      const [removed] = db.products.splice(idx, 1);
      return { ...removed };
    }),

    deleteMany: jest.fn(async () => ({ count: 1 })),
  },

  articleLike: {
    count: jest.fn(
      async (args: { where: ArticleLikeWhere }) =>
        db.articleLikes.filter((l) => matchArticleLike(args.where, l)).length
    ),
    groupBy: jest.fn(
      async (args: {
        by?: string[];
        where?: { articleId?: { in?: number[] } };
        _count?: { _all?: true; articleId?: true };
      }) => {
        const rawIds = args?.where?.articleId?.in ?? [];
        const ids = isNumArray(rawIds) ? rawIds : [];
        return ids.map((id) => {
          const c = db.articleLikes.filter((l) => l.articleId === id).length;
          return wantsCount(args?._count, 'articleId')
            ? { articleId: id, _count: { articleId: c } }
            : { articleId: id };
        });
      }
    ),
  },

  productLike: {
    count: jest.fn(
      async (args: { where: ProductLikeWhere }) =>
        db.productLikes.filter((l) => matchProductLike(args.where, l)).length
    ),
    groupBy: jest.fn(
      async (args: {
        by?: string[];
        where?: { productId?: { in?: number[] } };
        _count?: { _all?: true; productId?: true };
      }) => {
        const rawIds = args?.where?.productId?.in ?? [];
        const ids = isNumArray(rawIds) ? rawIds : [];
        return ids.map((id) => {
          const c = db.productLikes.filter((l) => l.productId === id).length;
          return wantsCount(args?._count, 'productId')
            ? { productId: id, _count: { productId: c } }
            : { productId: id };
        });
      }
    ),
  },

  commentLike: {
    count: jest.fn(
      async (args: { where: CommentLikeWhere }) =>
        db.commentLikes.filter((l) => matchCommentLike(args.where, l)).length
    ),
    groupBy: jest.fn(
      async (args: {
        by?: string[];
        where?: { commentId?: { in?: number[] } };
        _count?: { _all?: true; commentId?: true };
      }) => {
        const rawIds = args?.where?.commentId?.in ?? [];
        const ids = isNumArray(rawIds) ? rawIds : [];
        return ids.map((id) => {
          const c = db.commentLikes.filter((l) => l.commentId === id).length;
          return wantsCount(args?._count, 'commentId')
            ? { commentId: id, _count: { commentId: c } }
            : { commentId: id };
        });
      }
    ),
  },
};

export default prisma;

/* ---------- test helpers ---------- */
export function prismaReset(): void {
  db.users = [];
  db.articles = [];
  db.products = [];
  db.articleLikes = [];
  db.productLikes = [];
  db.commentLikes = [];
  seq = { user: 1, article: 1, product: 1, aLike: 1, pLike: 1, cLike: 1 };

  prisma.user.create.mockClear();
  prisma.user.findUnique.mockClear();
  prisma.user.update.mockClear();

  prisma.article.findMany.mockClear();
  prisma.article.findUnique.mockClear();
  prisma.article.count.mockClear();
  prisma.article.create.mockClear();
  prisma.article.update.mockClear();
  prisma.article.delete.mockClear();
  prisma.article.deleteMany.mockClear();

  prisma.product.findMany.mockClear();
  prisma.product.findUnique.mockClear();
  prisma.product.count.mockClear();
  prisma.product.create.mockClear();
  prisma.product.update.mockClear();
  prisma.product.delete.mockClear();
  prisma.product.deleteMany.mockClear();

  prisma.articleLike.count.mockClear();
  prisma.articleLike.groupBy.mockClear();
  prisma.productLike.count.mockClear();
  prisma.productLike.groupBy.mockClear();
  prisma.commentLike.count.mockClear();
  prisma.commentLike.groupBy.mockClear();
}

export function seedArticles(
  list: Array<
    Pick<ArticleRecord, 'id' | 'title' | 'userId'> & Partial<ArticleRecord>
  >
): void {
  for (const a of list) {
    db.articles.push({
      id: a.id,
      title: a.title,
      content: a.content ?? '',
      userId: a.userId,
      tags: a.tags ?? [],
      images: a.images ?? [],
      createdAt: a.createdAt ?? new Date(),
      updatedAt: a.updatedAt ?? new Date(),
    });
  }
}

export function seedProducts(
  list: Array<
    Pick<ProductRecord, 'id' | 'name' | 'userId' | 'price'> &
      Partial<ProductRecord>
  >
): void {
  for (const p of list) {
    db.products.push({
      id: p.id,
      name: p.name,
      description: p.description ?? '',
      price: p.price,
      userId: p.userId,
      tags: p.tags ?? [],
      images: p.images ?? [],
      createdAt: p.createdAt ?? new Date(),
      updatedAt: p.updatedAt ?? new Date(),
    });
  }
}

export function seedArticleLikes(
  pairs: ReadonlyArray<Pick<ArticleLikeRecord, 'articleId' | 'userId'>>
): void {
  for (const x of pairs) db.articleLikes.push({ id: seq.aLike++, ...x });
}
export function seedProductLikes(
  pairs: ReadonlyArray<Pick<ProductLikeRecord, 'productId' | 'userId'>>
): void {
  for (const x of pairs) db.productLikes.push({ id: seq.pLike++, ...x });
}
export function seedCommentLikes(
  list: Array<Pick<CommentLikeRecord, 'commentId' | 'userId'>>
): void {
  for (const x of list) db.commentLikes.push({ id: seq.cLike++, ...x });
}
