import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',
  transform: {}, // ESM + ts-node/tsx 사용 중이면 빈 객체 유지
  roots: ['<rootDir>/src'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'mjs', 'cjs', 'json'],
  moduleNameMapper: {
    // .js 확장자 강제 매핑 (ESM 상대경로 import 호환)
    '^(.+?\\.js)$': '$1',
  },
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/index.ts',
    '!src/lib/prismaClient.ts', // 실제 DB 클라이언트 제외
    '!src/**/types.ts',
    '!src/**/dto*/*.ts',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
};

export default config;
