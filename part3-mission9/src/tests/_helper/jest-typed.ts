export type Awaited<T> = T extends Promise<infer U> ? U : T;

/** ✅ 기존 1-arg 전용: 필요하면 계속 사용 가능 */
export function asMockFn<TArgs, TReturn>(
  fn: (args: TArgs) => Promise<TReturn>
) {
  return fn as unknown as jest.MockedFunction<
    (args: TArgs) => Promise<TReturn>
  >;
}

/** ✅ 새 범용 캐스터: 인자 0개/여러 개/옵셔널 모두 커버 */
export type MockedFn<Fn extends (...args: any[]) => any> =
  jest.MockedFunction<Fn>;
export function asMock<Fn extends (...args: any[]) => any>(fn: Fn) {
  return fn as MockedFn<Fn>;
}

/** ✅ spyOn 전용: 객체 메서드의 원본 시그니처를 그대로 유지한 Mock 반환 */
export function typedSpy<T extends object, K extends keyof T & string>(
  obj: T,
  method: K
) {
  return jest.spyOn(obj as any, method) as unknown as MockedFn<
    Extract<T[K], (...args: any[]) => any>
  >;
}
