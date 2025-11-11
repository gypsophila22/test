//#region Imports
import { jest } from '@jest/globals';
import bcrypt from 'bcryptjs';
//#endregion

//#region Records (Types)
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

export type CommentRecord = {
  id: number;
  content: string;
  userId: number;
  articleId?: number | null;
  productId?: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type NotificationRecord = {
  id: number;
  userId: number;
  type: 'COMMENT' | 'LIKE' | 'SYSTEM' | string; // 프로젝트에 맞게 열거형 쓰세요
  message: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type CommentLikeRecord = { id: number; commentId: number; userId: number };
//#endregion

//#region Select/Args helpers (Generics)
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
//#endregion

//#region In-memory DB & Sequences
const db: {
  users: UserRecord[];
  articles: ArticleRecord[];
  products: ProductRecord[];
  comments: CommentRecord[];
  articleLikes: ArticleLikeRecord[];
  productLikes: ProductLikeRecord[];
  commentLikes: CommentLikeRecord[];
  notifications: NotificationRecord[];
} = {
  users: [],
  articles: [],
  products: [],
  comments: [],
  articleLikes: [],
  productLikes: [],
  commentLikes: [],
  notifications: [],
};

let seq = {
  user: 1,
  article: 1,
  product: 1,
  cmt: 1,
  aLike: 1,
  pLike: 1,
  cLike: 1,
  notif: 1,
};
//#endregion

//#region Utils (helpers)
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

function matchesProductWhere(
  p: ProductRecord,
  where?: {
    OR?: Array<
      | { name?: { contains?: string; mode?: 'insensitive' | 'default' } }
      | {
          description?: { contains?: string; mode?: 'insensitive' | 'default' };
        }
    >;
  }
): boolean {
  if (!where?.OR || where.OR.length === 0) return true;
  return where.OR.some((cond) => {
    if ('name' in cond && cond.name?.contains != null) {
      const q = cond.name.contains!;
      return cond.name.mode === 'insensitive'
        ? p.name.toLowerCase().includes(q.toLowerCase())
        : p.name.includes(q);
    }
    if ('description' in cond && cond.description?.contains != null) {
      const q = cond.description.contains!;
      return cond.description.mode === 'insensitive'
        ? p.description.toLowerCase().includes(q.toLowerCase())
        : p.description.includes(q);
    }
    return false;
  });
}

function pickArticleLikeKey(where: any): { userId: number; articleId: number } {
  const a = where?.userId_articleId || where?.articleId_userId;
  if (!a)
    throw new Error(
      'articleLike.where needs userId_articleId or articleId_userId'
    );
  return { userId: Number(a.userId), articleId: Number(a.articleId) };
}

function pickProductLikeKey(where: any): { userId: number; productId: number } {
  const a = where?.userId_productId || where?.productId_userId;
  if (!a)
    throw new Error(
      'productLike.where needs userId_productId or productId_userId'
    );
  return { userId: Number(a.userId), productId: Number(a.productId) };
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
//#endregion

//#region Prisma Mock Root
export const prisma = {
  //#region prisma.user
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
  //#endregion

  //#region prisma.article
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
          content: args.data.content ?? '',
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

    deleteMany: jest.fn(async (args?: { where?: { id?: number } }) => {
      const before = db.articles.length;
      if (!args?.where || args.where.id == null) {
        db.articles = [];
      } else {
        const id = args.where.id;
        db.articles = db.articles.filter((a) => a.id !== id);
      }
      const after = db.articles.length;
      return { count: before - after };
    }),
  },
  //#endregion

  //#region prisma.product
  product: {
    findMany: jest.fn(async (args?: { where?: any }) => {
      const list = db.products.filter((p) =>
        matchesProductWhere(p, args?.where)
      );
      return list.map((p) => ensureProductArrays({ ...p }));
    }),

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

    count: jest.fn(
      async (args?: {
        where?: {
          OR?: Array<
            | {
                name?: {
                  contains?: string;
                  mode?: 'insensitive' | 'default';
                };
              }
            | {
                description?: {
                  contains?: string;
                  mode?: 'insensitive' | 'default';
                };
              }
          >;
        };
      }) =>
        db.products.filter((p) => matchesProductWhere(p, args?.where)).length
    ),

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

    deleteMany: jest.fn(async (args?: { where?: { id?: number } }) => {
      const before = db.products.length;
      if (!args?.where || args.where.id == null) {
        db.products = [];
      } else {
        const id = args.where.id;
        db.products = db.products.filter((p) => p.id !== id);
      }
      const after = db.products.length;
      return { count: before - after };
    }),
  },
  //#endregion

  //#region prisma.comment
  comment: {
    findUnique: jest.fn(async (args: { where: { id: number } }) => {
      const f = db.comments.find((c) => c.id === args.where.id);
      return f ? { ...f } : null;
    }),

    findMany: jest.fn(
      async (args?: {
        where?: {
          id?: number | { in?: number[] };
          articleId?: number | null;
          productId?: number | null;
          userId?: number;
        };
        orderBy?: { createdAt?: 'asc' | 'desc' };
        skip?: number;
        take?: number;
      }) => {
        let list = db.comments.slice();

        // ✅ id/in 필터 추가
        if (args?.where?.id !== undefined) {
          const idCond = args.where.id as any;
          if (typeof idCond === 'number') {
            list = list.filter((c) => c.id === idCond);
          } else if (idCond && Array.isArray(idCond.in)) {
            list = list.filter((c) => idCond.in.includes(c.id));
          }
        }

        if (args?.where?.articleId !== undefined) {
          list = list.filter((c) => c.articleId === args.where!.articleId);
        }
        if (args?.where?.productId !== undefined) {
          list = list.filter((c) => c.productId === args.where!.productId);
        }
        if (args?.where?.userId !== undefined) {
          list = list.filter((c) => c.userId === args.where!.userId);
        }

        if (args?.orderBy?.createdAt) {
          const dir = args.orderBy.createdAt === 'asc' ? 1 : -1;
          list.sort(
            (a, b) => (a.createdAt.getTime() - b.createdAt.getTime()) * dir
          );
        }

        const start = args?.skip ?? 0;
        const end = args?.take != null ? start + args.take : undefined;
        return list.slice(start, end).map((c) => ({ ...c }));
      }
    ),

    create: jest.fn(
      async (args: {
        data: Omit<CommentRecord, 'id' | 'createdAt' | 'updatedAt'> &
          Partial<Pick<CommentRecord, 'id'>>;
      }) => {
        // XOR 검사
        const hasArticle = typeof args.data.articleId === 'number';
        const hasProduct = typeof args.data.productId === 'number';
        if (hasArticle === hasProduct) {
          const e: any = new Error(
            'Exactly one of articleId/productId required'
          );
          e.code = 'VALIDATION';
          throw e;
        }

        const now = new Date();
        const rec: CommentRecord = {
          id: args.data.id ?? seq.cmt++,
          content: args.data.content ?? '',
          userId: args.data.userId,
          articleId: hasArticle ? args.data.articleId! : null,
          productId: hasProduct ? args.data.productId! : null,
          createdAt: now,
          updatedAt: now,
        };
        db.comments.push(rec);
        return { ...rec };
      }
    ),

    update: jest.fn(
      async (args: {
        where: { id: number };
        data: Partial<Omit<CommentRecord, 'id'>>;
      }) => {
        const t = db.comments.find((c) => c.id === args.where.id);
        if (!t) {
          const e: any = new Error('Not found');
          e.code = 'P2025';
          throw e;
        }
        Object.assign(t, { ...args.data, updatedAt: new Date() });
        return { ...t };
      }
    ),

    delete: jest.fn(async (args: { where: { id: number } }) => {
      const idx = db.comments.findIndex((c) => c.id === args.where.id);
      if (idx < 0) {
        const e: any = new Error('Not found');
        e.code = 'P2025';
        throw e;
      }
      const [removed] = db.comments.splice(idx, 1);
      return { ...removed };
    }),
  },
  //#endregion

  //#region prisma.articleLike
  articleLike: {
    findUnique: jest.fn(async ({ where }: any) => {
      const { userId, articleId } = pickArticleLikeKey(where);
      return (
        db.articleLikes.find(
          (l) => l.userId === userId && l.articleId === articleId
        ) ?? null
      );
    }),

    create: jest.fn(async ({ data }: any) => {
      const userId = Number(data.userId);
      const articleId = Number(data.articleId);
      const exists = db.articleLikes.some(
        (l) => l.userId === userId && l.articleId === articleId
      );
      if (exists) {
        const e: any = new Error('Unique constraint failed');
        e.code = 'P2002';
        throw e;
      }
      const row: ArticleLikeRecord = { id: seq.aLike++, userId, articleId };
      db.articleLikes.push(row);
      return { ...row };
    }),

    delete: jest.fn(async ({ where }: any) => {
      const { userId, articleId } = pickArticleLikeKey(where);
      const idx = db.articleLikes.findIndex(
        (l) => l.userId === userId && l.articleId === articleId
      );
      if (idx < 0) {
        const e: any = new Error('Not found');
        e.code = 'P2025';
        throw e;
      }
      const [removed] = db.articleLikes.splice(idx, 1);
      return { ...removed };
    }),

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
  //#endregion

  //#region prisma.productLike
  productLike: {
    findUnique: jest.fn(async ({ where }: any) => {
      const { userId, productId } = pickProductLikeKey(where);
      return (
        db.productLikes.find(
          (l) => l.userId === userId && l.productId === productId
        ) ?? null
      );
    }),

    create: jest.fn(async ({ data }: any) => {
      const userId = Number(data.userId);
      const productId = Number(data.productId);
      const exists = db.productLikes.some(
        (l) => l.userId === userId && l.productId === productId
      );
      if (exists) {
        const e: any = new Error('Unique constraint failed');
        e.code = 'P2002';
        throw e;
      }
      const row: ProductLikeRecord = { id: seq.pLike++, userId, productId };
      db.productLikes.push(row);
      return { ...row };
    }),

    delete: jest.fn(async ({ where }: any) => {
      const { userId, productId } = pickProductLikeKey(where);
      const idx = db.productLikes.findIndex(
        (l) => l.userId === userId && l.productId === productId
      );
      if (idx < 0) {
        const e: any = new Error('Not found');
        e.code = 'P2025';
        throw e;
      }
      const [removed] = db.productLikes.splice(idx, 1);
      return { ...removed };
    }),

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
  //#endregion

  //#region prisma.commentLike
  commentLike: {
    findUnique: jest.fn(
      async ({
        where: {
          userId_commentId: { userId, commentId },
        },
      }) => {
        return (
          db.commentLikes.find(
            (l) => l.userId === userId && l.commentId === commentId
          ) ?? null
        );
      }
    ),

    findMany: jest.fn(async (args?: any) => {
      let list = db.commentLikes.slice();

      if (args?.where) {
        const w = args.where as {
          userId?: number;
          commentId?: number | { in?: number[] };
        };

        const hasCommentIdCond =
          typeof w.commentId === 'number' ||
          (w.commentId && Array.isArray((w.commentId as any).in));

        if (hasCommentIdCond) {
          list = list.filter((rec) => matchCommentLike(w as any, rec));
        }

        if (typeof w.userId === 'number') {
          list = list.filter((rec) => rec.userId === w.userId);
        }
      }

      if (args?.orderBy?.id) {
        const dir = args.orderBy.id === 'asc' ? 1 : -1;
        list.sort((a, b) => (a.id - b.id) * dir);
      }
      const start = args?.skip ?? 0;
      const end = args?.take != null ? start + args.take : undefined;
      const sliced = list.slice(start, end);

      const commentArg = args?.include?.comment;
      const wantComment = !!commentArg;
      const isSelect = typeof commentArg === 'object' && !!commentArg.select;
      const sel = isSelect ? commentArg.select : undefined;

      const pick = (obj: any, keysObj: Record<string, boolean> | undefined) => {
        if (!obj) return null;
        if (!keysObj) return { ...obj };
        const out: any = {};
        for (const k of Object.keys(keysObj)) {
          if ((keysObj as any)[k]) out[k] = obj[k];
        }
        return out;
      };

      const wantArticle =
        !isSelect &&
        typeof commentArg === 'object' &&
        !!commentArg?.include?.article;
      const wantProduct =
        !isSelect &&
        typeof commentArg === 'object' &&
        !!commentArg?.include?.product;

      const result = sliced.map((like) => {
        if (!wantComment) return { ...like };

        const c = db.comments.find((x) => x.id === like.commentId) || null;
        if (!c) return { ...like, comment: null };

        if (isSelect) {
          const comment: any = pick(c, sel);

          if (sel?.article) {
            const art =
              c.articleId != null
                ? db.articles.find((a) => a.id === c.articleId) || null
                : null;
            comment.article = sel.article.select
              ? pick(art, sel.article.select)
              : art;
          }
          if (sel?.product) {
            const prod =
              c.productId != null
                ? db.products.find((p) => p.id === c.productId) || null
                : null;
            comment.product = sel.product.select
              ? pick(prod, sel.product.select)
              : prod;
          }
          return { ...like, comment };
        }

        const comment: any = { ...c };
        if (wantArticle) {
          comment.article =
            c.articleId != null
              ? db.articles.find((a) => a.id === c.articleId) || null
              : null;
        }
        if (wantProduct) {
          comment.product =
            c.productId != null
              ? db.products.find((p) => p.id === c.productId) || null
              : null;
        }
        return { ...like, comment };
      });
      return result;
    }),

    create: jest.fn(async ({ data: { userId, commentId } }) => {
      const exists = db.commentLikes.some(
        (l) => l.userId === userId && l.commentId === commentId
      );
      if (exists) {
        const e: any = new Error('Unique constraint failed');
        e.code = 'P2002';
        throw e;
      }
      const row = { id: seq.cLike++, userId, commentId };
      db.commentLikes.push(row);
      return row;
    }),

    delete: jest.fn(
      async ({
        where: {
          userId_commentId: { userId, commentId },
        },
      }) => {
        const idx = db.commentLikes.findIndex(
          (l) => l.userId === userId && l.commentId === commentId
        );
        if (idx < 0) {
          const e: any = new Error('Not found');
          e.code = 'P2025';
          throw e;
        }
        const [removed] = db.commentLikes.splice(idx, 1);
        return removed;
      }
    ),

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
  //#endregion

  //#region prisma.notification
  notification: {
    findMany: jest.fn(
      async (args?: {
        where?: { userId?: number; isRead?: boolean };
        orderBy?: { createdAt?: 'asc' | 'desc' };
        skip?: number;
        take?: number;
      }) => {
        let list = db.notifications.slice();

        if (args?.where?.userId !== undefined) {
          list = list.filter((n) => n.userId === args.where!.userId);
        }
        if (args?.where?.isRead !== undefined) {
          list = list.filter((n) => n.isRead === args.where!.isRead);
        }

        if (args?.orderBy?.createdAt) {
          const dir = args.orderBy.createdAt === 'asc' ? 1 : -1;
          list.sort(
            (a, b) => (a.createdAt.getTime() - b.createdAt.getTime()) * dir
          );
        }

        const start = args?.skip ?? 0;
        const end = args?.take != null ? start + args.take : undefined;
        return list.slice(start, end).map((n) => ({ ...n }));
      }
    ),

    count: jest.fn(
      async (args?: { where?: { userId?: number; isRead?: boolean } }) => {
        return db.notifications.filter((n) => {
          if (
            args?.where?.userId !== undefined &&
            n.userId !== args.where!.userId
          )
            return false;
          if (
            args?.where?.isRead !== undefined &&
            n.isRead !== args.where!.isRead
          )
            return false;
          return true;
        }).length;
      }
    ),

    updateMany: jest.fn(
      async (args: {
        where?: { userId?: number; isRead?: boolean };
        data: Partial<Pick<NotificationRecord, 'isRead' | 'message' | 'type'>>;
      }) => {
        let count = 0;
        for (const n of db.notifications) {
          const userOk =
            args.where?.userId === undefined || n.userId === args.where!.userId;
          const readOk =
            args.where?.isRead === undefined || n.isRead === args.where!.isRead;
          if (userOk && readOk) {
            Object.assign(n, args.data, { updatedAt: new Date() });
            count++;
          }
        }
        return { count };
      }
    ),

    update: jest.fn(
      async (args: {
        where: { id: number };
        data: Partial<Pick<NotificationRecord, 'isRead' | 'message' | 'type'>>;
      }) => {
        const target = db.notifications.find((n) => n.id === args.where.id);
        if (!target) {
          const e = new Error('Not found') as Error & { code: string };
          e.code = 'P2025';
          throw e;
        }
        Object.assign(target, args.data, { updatedAt: new Date() });
        return { ...target };
      }
    ),

    create: jest.fn(
      async (args: {
        data: Omit<NotificationRecord, 'id' | 'createdAt' | 'updatedAt'>;
      }) => {
        const now = new Date();
        const rec: NotificationRecord = {
          id: seq.notif++,
          createdAt: now,
          updatedAt: now,
          ...args.data,
        };
        db.notifications.push(rec);
        return { ...rec };
      }
    ),

    findUnique: jest.fn(async (args: { where: { id: number } }) => {
      const n = db.notifications.find((x) => x.id === args.where.id);
      return n ? { ...n } : null;
    }),
  },
  //#endregion
};
//#endregion

//#region Prisma Mock: $transaction & default export
(prisma as any).$transaction = jest.fn(async (arg: any) => {
  if (Array.isArray(arg)) return Promise.all(arg);
  if (typeof arg === 'function') return arg(prisma);
  return arg;
});

export default prisma;
//#endregion

//#region Test Helpers (reset & seeders)
export function prismaReset(): void {
  db.users = [];
  db.articles = [];
  db.products = [];
  db.comments = [];
  db.articleLikes = [];
  db.productLikes = [];
  db.commentLikes = [];
  seq = {
    user: 1,
    article: 1,
    product: 1,
    cmt: 1,
    aLike: 1,
    pLike: 1,
    cLike: 1,
    notif: 1,
  };

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

  prisma.comment.findMany.mockClear();
  prisma.comment.findUnique.mockClear();
  // prisma.comment.count.mockClear();
  prisma.comment.create.mockClear();
  prisma.comment.update.mockClear();
  prisma.comment.delete.mockClear();
  // prisma.comment.deleteMany.mockClear();

  prisma.articleLike.count.mockClear();
  prisma.articleLike.groupBy.mockClear();
  prisma.productLike.count.mockClear();
  prisma.productLike.groupBy.mockClear();
  prisma.commentLike.count.mockClear();
  prisma.commentLike.groupBy.mockClear();

  prisma.notification.findMany.mockClear();
  prisma.notification.count.mockClear();
  prisma.notification.updateMany.mockClear();
  prisma.notification.update.mockClear();
  prisma.notification.create.mockClear();
  prisma.notification.findUnique.mockClear();

  (prisma as any).$transaction?.mockClear?.();
}

export function seedUsers(
  list: Array<
    Pick<UserRecord, 'id' | 'username' | 'email' | 'password'> &
      Partial<Pick<UserRecord, 'images' | 'createdAt' | 'updatedAt'>>
  >
): void {
  for (const u of list) {
    db.users.push({
      id: u.id,
      username: u.username,
      email: u.email,
      // ⚠️ 이 함수는 "이미 해시된 비밀번호"를 넣는다고 가정
      password: u.password,
      images: u.images ?? [],
      createdAt: u.createdAt ?? new Date(),
      updatedAt: u.updatedAt ?? new Date(),
    });
  }
}

export async function seedUsersWithHash(
  list: Array<
    Pick<UserRecord, 'id' | 'username' | 'email' | 'password'> &
      Partial<Pick<UserRecord, 'images' | 'createdAt' | 'updatedAt'>>
  >,
  opts: { saltRounds?: number } = {}
): Promise<void> {
  const saltRounds = opts.saltRounds ?? 10;

  for (const u of list) {
    const hashed = await bcrypt.hash(u.password, saltRounds);
    db.users.push({
      id: u.id,
      username: u.username,
      email: u.email,
      password: hashed,
      images: u.images ?? [],
      createdAt: u.createdAt ?? new Date(),
      updatedAt: u.updatedAt ?? new Date(),
    });
  }
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

export function seedComments(
  list: Array<
    Pick<CommentRecord, 'id' | 'userId' | 'content'> &
      (
        | { articleId: number; productId?: undefined }
        | { productId: number; articleId?: undefined }
      ) &
      Partial<Pick<CommentRecord, 'createdAt' | 'updatedAt'>>
  >
): CommentRecord[] {
  const out: CommentRecord[] = [];
  for (const c of list) {
    // XOR 보장: articleId 또는 productId 중 정확히 하나
    const hasArticle = typeof (c as any).articleId === 'number';
    const hasProduct = typeof (c as any).productId === 'number';
    if (hasArticle === hasProduct) {
      throw new Error(
        'seedComments: require exactly one of articleId or productId'
      );
    }
    const rec: CommentRecord = {
      id: c.id,
      content: c.content,
      userId: c.userId,
      articleId: (c as any).articleId ?? null,
      productId: (c as any).productId ?? null,
      createdAt: c.createdAt ?? new Date(),
      updatedAt: c.updatedAt ?? new Date(),
    };
    db.comments.push(rec);
    out.push(rec);
  }
  return out;
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

export function seedNotifications(
  list: Array<
    Omit<NotificationRecord, 'id' | 'createdAt' | 'updatedAt'> &
      Partial<Pick<NotificationRecord, 'id' | 'createdAt' | 'updatedAt'>>
  >
): void {
  for (const n of list) {
    const now = new Date();
    db.notifications.push({
      id: n.id ?? seq.notif++,
      userId: n.userId,
      type: n.type,
      message: n.message,
      isRead: n.isRead ?? false,
      createdAt: n.createdAt ?? now,
      updatedAt: n.updatedAt ?? now,
    });
  }
}
//#endregion
