/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',

  // ESM + TypeScript -> SWC로 변환
  transform: {
    '^.+\\.[tj]sx?$': [
      '@swc/jest',
      {
        jsc: { parser: { syntax: 'typescript', tsx: false }, target: 'es2020' },
        module: { type: 'es6' },
      },
    ],
  },
  extensionsToTreatAsEsm: ['.ts'],

  moduleNameMapper: {
    // Prisma 클라이언트는 테스트용 mock으로 강제
    '^\\.{1,2}(?:\\/\\.\\.)*\\/(?:lib\\/)?prismaClient(?:\\.js)?$':
      '<rootDir>/src/tests/_helper/prisma-mock.ts',

    // (선택) ws / wsAuth 같이 import 시 부작용 있는 모듈은 스텁으로 막기
    '^\\.{1,2}/lib/ws(?:Auth)?(?:\\.js)?$':
      '<rootDir>/src/tests/_helper/mock-modules.ts',

    // 상대경로의 .js 확장자를 제거해서 실제 .ts로 매핑
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^\\.{1,2}/lib/token(?:\\.js)?$':
      '<rootDir>/src/tests/_helper/token-mock.ts',
  },

  // ✅ ENV 먼저, 그다음 기타 셋업(타임아웃 등)
  setupFiles: ['<rootDir>/src/tests/_helper/jest.env.setup.ts'],
  setupFilesAfterEnv: [
    '<rootDir>/src/tests/_helper/mock-modules.ts', // 이 파일이 전역 타임아웃/매처 등 설정이라면 여기
    // 또는 별도의 jest.setup.ts가 있다면 거기에 타임아웃 등 분리
  ],

  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/app.ts',
    '!src/**/swagger.ts',
    '!src/**/ws.ts',
    '!src/tests/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  testMatch: ['**/src/tests/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};
