const base = require('./jest.base.cjs');

/** @type {import('jest').Config} */
module.exports = {
  ...base,
  rootDir: __dirname,
  displayName: 'unit',
  testMatch: [
    '**/src/tests/unit.**/*.test.ts',
    '**/src/tests/**/*.unit.test.ts',
  ],
  moduleNameMapper: {
    // 1) token 모듈: 상대경로/alias 모두 커버 (맨 위!)
    '^@/lib/token(?:\\.(?:js|ts))?$':
      '<rootDir>/src/tests/_helper/token-mock.ts',
    '^.+/lib/token(?:\\.(?:js|ts))?$':
      '<rootDir>/src/tests/_helper/token-mock.ts',

    // 2) prisma (유닛에서만 모킹 필요 시)
    '^@/(?:lib/)?prismaClient(?:\\.(?:js|ts))?$':
      '<rootDir>/src/tests/_helper/prisma-mock.ts',
    '^.+/(?:lib/)?prismaClient(?:\\.(?:js|ts))?$':
      '<rootDir>/src/tests/_helper/prisma-mock.ts',

    // 3) alias 해석 (서비스 코드가 "@/..."를 쓴다면 필수)
    '^@/(.*)$': '<rootDir>/src/$1',

    // 4) 마지막에 .js 확장자 제거 규칙
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  setupFiles: ['<rootDir>/src/tests/_helper/jest.env.setup.ts'],
};
