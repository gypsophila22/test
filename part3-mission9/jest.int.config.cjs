// jest.int.config.cjs
const base = require('./jest.base.cjs');

/** @type {import('jest').Config} */
module.exports = {
  ...base,
  rootDir: __dirname,
  displayName: 'integration',
  testMatch: ['**/src/tests/int.*.test.ts', '**/src/tests/**/*.int.test.ts'],
  moduleNameMapper: {
    // ⬇⬇⬇ 이 두 줄이 가장 위에 오게!
    '^@/(?:lib/)?prismaClient(?:\\.(?:js|ts))?$':
      '<rootDir>/src/tests/_helper/prisma-mock.ts',
    '^.+/(?:lib/)?prismaClient(?:\\.(?:js|ts))?$':
      '<rootDir>/src/tests/_helper/prisma-mock.ts',

    // alias 해석(프로젝트가 "@/..." 쓰면 필요)
    '^@/(.*)$': '<rootDir>/src/$1',

    // 마지막에 .js 제거 규칙
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  setupFiles: ['<rootDir>/src/tests/_helper/jest.env.setup.ts'],
};
