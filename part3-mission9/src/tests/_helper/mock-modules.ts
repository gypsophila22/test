import { jest } from '@jest/globals';

type OneArgAsync<R = any> = (args: any) => Promise<R>;
type OptArgAsync<R = any> = (args?: any) => Promise<R>;

export type PrismaMock = {
  user: {
    findUnique: jest.MockedFunction<OneArgAsync<any | null>>;
    create: jest.MockedFunction<OneArgAsync<any>>;
    update: jest.MockedFunction<OneArgAsync<any>>;
  };
  product: {
    findMany: jest.MockedFunction<OptArgAsync<any[]>>;
    findUnique: jest.MockedFunction<OneArgAsync<any | null>>;
    create: jest.MockedFunction<OneArgAsync<any>>;
    update: jest.MockedFunction<OneArgAsync<any>>;
    delete: jest.MockedFunction<OneArgAsync<any>>;
  };
  article: {
    findMany: jest.MockedFunction<OptArgAsync<any[]>>;
    findUnique: jest.MockedFunction<OneArgAsync<any | null>>;
    create: jest.MockedFunction<OneArgAsync<any>>;
    update: jest.MockedFunction<OneArgAsync<any>>;
    delete: jest.MockedFunction<OneArgAsync<any>>;
  };
};

// ✅ 단일 인스턴스 (테스트 전체에서 공유)
export const prisma: PrismaMock = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  product: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  article: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

export default prisma;
