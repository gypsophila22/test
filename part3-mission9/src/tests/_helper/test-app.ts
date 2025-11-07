export async function createTestApp() {
  const mod = await import('../../app.js'); // ← 동적 import (모킹 이후에 로드)
  const app = await mod.buildApp({ forTest: true });
  return app as import('express').Express;
}
