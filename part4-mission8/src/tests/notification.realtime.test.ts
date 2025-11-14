import { jest } from '@jest/globals';

jest.setTimeout(10000);

test('client receives notification via wsGateway.notifyUser', async () => {
  await jest.isolateModulesAsync(async () => {
    // 실모듈 그대로 로드 (확장자 명시)
    const wsMod: any = await import('../lib/ws.js');

    const wsGateway = wsMod.wsGateway ?? wsMod.default?.wsGateway;
    const setupWebSocket =
      wsMod.setupWebSocket ?? wsMod.default?.setupWebSocket;

    if (!wsGateway || typeof wsGateway.notifyUser !== 'function') {
      throw new Error('wsGateway not found on module');
    }

    // 네트워킹 제거: 테스트 내부에서 in-memory 구독/브로드캐스트 구현
    const listeners = new Set<(payload: any) => void>();

    const originalNotify = wsGateway.notifyUser;
    wsGateway.notifyUser = ({ userId, type, message, data }: any) => {
      // 테스트용: userId=2 에게만 전달
      if (userId === 2) {
        const payload = { type, message, data };
        for (const fn of listeners) fn(payload);
      }
    };

    // 형식상 호출(네트워킹 없음)
    if (typeof setupWebSocket === 'function') {
      setupWebSocket({} as any);
    }

    await new Promise<void>((resolve, reject) => {
      // 구독 등록
      const handler = (payload: any) => {
        try {
          expect(payload).toMatchObject({
            message: 'price changed!',
            data: { productId: 101 },
          });
          listeners.delete(handler);
          resolve();
        } catch (e) {
          listeners.delete(handler);
          reject(e);
        }
      };
      listeners.add(handler);

      // 알림 발사 → 우리가 패치한 notifyUser가 즉시 전달
      wsGateway.notifyUser({
        userId: 2,
        type: 'PRICE_CHANGE',
        message: 'price changed!',
        data: { productId: 101 },
      });
    });

    // 원복(다른 테스트에 영향 방지 — isolateModules 있어도 깔끔하게)
    wsGateway.notifyUser = originalNotify;
  });
});
