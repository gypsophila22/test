export function asMockFn<TArgs, TReturn>(
  fn: (args: TArgs) => Promise<TReturn>
) {
  return fn as jest.MockedFunction<(args: TArgs) => Promise<TReturn>>;
}

/** 공통 함수 시그니처 */
type FnLike = (...args: unknown[]) => unknown;
type KnownKeys<T> = {
  [K in keyof T]: string extends K
    ? never
    : number extends K
    ? never
    : symbol extends K
    ? never
    : K;
}[keyof T];
type MethodKeys<T> = {
  [K in KnownKeys<T>]-?: T[K] extends FnLike ? K : never;
}[KnownKeys<T>];

/**  새 범용 캐스터: 인자 0개/여러 개/옵셔널 모두 커버 */
export type MockedFn<Fn extends FnLike> = jest.MockedFunction<Fn>;

export function asMock<Fn extends FnLike>(fn: Fn) {
  return fn as jest.MockedFunction<Fn>;
}

/** spyOn 전용: 원본 메서드 시그니처 유지한 mock/spy 반환 */
export function typedSpy<T extends object, K extends MethodKeys<Required<T>>>(
  obj: T,
  method: K
): jest.SpiedFunction<Extract<Required<T>[K], FnLike>>;
export function typedSpy(obj: object, method: PropertyKey) {
  return jest.spyOn(obj as any, method as any) as any;
}
