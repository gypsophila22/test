import '@jest/globals';

// 전역 jest 심볼에 타입을 매핑
declare global {
  const jest: import('@jest/globals').Jest;
}

// @jest/globals 모듈의 Jest 인터페이스도 보강
declare module '@jest/globals' {
  interface Jest {
    unstable_mockModule<TModule>(
      moduleName: string,
      moduleFactory: () => TModule
    ): Promise<void>;

    isolateModulesAsync<T>(fn: () => Promise<T>): Promise<T>;
  }
}

export {};
