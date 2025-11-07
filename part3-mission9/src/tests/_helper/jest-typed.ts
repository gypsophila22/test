export type Awaited<T> = T extends Promise<infer U> ? U : T;

/** Prisma 스타일: (args: TArgs) => Promise<TReturn> 형태의 함수를 Mock으로 변환 */
export function asMockFn<TArgs, TReturn>(
  fn: (args: TArgs) => Promise<TReturn>
) {
  return fn as unknown as jest.MockedFunction<
    (args: TArgs) => Promise<TReturn>
  >;
}
