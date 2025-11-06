// import { jest } from '@jest/globals';

// jest.unstable_mockModule('../repositories/user-repository.js', () => ({
//   userRepository: {
//     findByUsername: jest.fn(),
//     createUser: jest.fn(),
//     findById: jest.fn(),
//     updateUser: jest.fn(),
//     findByIdWithPassword: jest.fn(),
//     updatePassword: jest.fn(),
//     getUserComments: jest.fn(),
//     getUserLikedComments: jest.fn(),
//   },
// }));

// jest.unstable_mockModule('../repositories/like-repository.js', () => ({
//   commentLikeRepository: {
//     count: jest.fn(),
//   },
// }));

// jest.unstable_mockModule('../lib/token.js', () => ({
//   generateTokens: jest.fn(),
//   verifyRefreshToken: jest.fn(),
// }));

// jest.unstable_mockModule('bcrypt', () => {
//   const hash = jest.fn();
//   const compare = jest.fn();
//   return {
//     hash,
//     compare,
//     default: { hash, compare },
//   };
// });

// jest.unstable_mockModule('../lib/constants.js', () => ({
//   NODE_ENV: 'test',
//   ACCESS_TOKEN_COOKIE_NAME: 'at',
//   REFRESH_TOKEN_COOKIE_NAME: 'rt',
// }));

// type User = {
//   id: number;
//   username: string;
//   email: string;
//   password: string;
//   images: string[];
//   createdAt: Date;
//   updatedAt: Date;
// };

// type UserPublic = {
//   username: string;
//   email: string;
//   images: string[];
// };

// type Comment = {
//   id: number;
//   content: string;
//   createdAt: Date;
//   product: { id: number; name: string } | null;
//   article: { id: number; title: string } | null;
// };

// type GenerateTokens = (userId: number) => {
//   accessToken: string;
//   refreshToken: string;
// };
// type VerifyRefreshToken = (rt: string) => { userId: number };

// type HashFn = (data: string, saltOrRounds: string | number) => Promise<string>;
// type CompareFn = (data: string, encrypted: string) => Promise<boolean>;

// let userService: typeof import('../services/user-service.js')['userService'];

// let UR: typeof import('../repositories/user-repository.js')['userRepository'];
// let CR: typeof import('../repositories/like-repository.js')['commentLikeRepository'];
// let TOK: typeof import('../lib/token.js');

// let findByUsername: jest.MockedFunction<
//   (username: string) => Promise<User | null>
// >;
// let createUser: jest.MockedFunction<
//   (data: { username: string; email: string; password: string }) => Promise<User>
// >;
// let findById: jest.MockedFunction<
//   (userId: number) => Promise<Omit<User, 'password'> | null>
// >;
// let updateUser: jest.MockedFunction<
//   (userId: number, updateData: UserPublic) => Promise<UserPublic>
// >;
// let findByIdWithPassword: jest.MockedFunction<
//   (userId: number) => Promise<User | null>
// >;
// let updatePasswordRepo: jest.MockedFunction<
//   (userId: number, hashedPassword: string) => Promise<User>
// >;
// let getUserCommentsRepo: jest.MockedFunction<
//   (userId: number) => Promise<Comment[]>
// >;
// let getUserLikedCommentsRepo: jest.MockedFunction<
//   (userId: number) => Promise<
//     {
//       comment: Comment;
//       id: number;
//       userId: number;
//       commentId: number;
//       createdAt: Date;
//     }[]
//   >
// >;
// let countLikes: jest.MockedFunction<(commentId: number) => Promise<number>>;

// let generateTokens: jest.MockedFunction<GenerateTokens>;
// let verifyRefreshToken: jest.MockedFunction<VerifyRefreshToken>;

// let hashMock: jest.MockedFunction<HashFn>;
// let compareMock: jest.MockedFunction<CompareFn>;

// const resMock = () => {
//   const cookies: Record<string, unknown> = {};

//   const cookieImpl = (k: string, v: unknown, o?: unknown): void => {
//     cookies[k] = v;
//   };
//   const clearCookieImpl = (k: string): void => {
//     delete cookies[k];
//   };

//   const cookie = jest.fn(cookieImpl) as jest.MockedFunction<typeof cookieImpl>;
//   const clearCookie = jest.fn(clearCookieImpl) as jest.MockedFunction<
//     typeof clearCookieImpl
//   >;
//   return {
//     cookie,
//     clearCookie,
//     _cookies: cookies,
//   } satisfies {
//     cookie: jest.MockedFunction<(k: string, v: unknown, o?: unknown) => void>;
//     clearCookie: jest.MockedFunction<(k: string) => void>;
//     _cookies: Record<string, unknown>;
//   };
// };

// beforeAll(async () => {
//   const repoMod = await import('../repositories/user-repository.js');
//   const likeMod = await import('../repositories/like-repository.js');
//   const tokenMod = await import('../lib/token.js');
//   const bcryptMod = await import('bcrypt');
//   ({ userService } = await import('../services/user-service.js'));

//   UR = repoMod.userRepository;
//   CR = likeMod.commentLikeRepository;
//   TOK = tokenMod;

//   findByUsername = UR.findByUsername as typeof findByUsername;
//   createUser = UR.createUser as typeof createUser;
//   findById = UR.findById as typeof findById;
//   updateUser = UR.updateUser as typeof updateUser;
//   findByIdWithPassword = UR.findByIdWithPassword as typeof findByIdWithPassword;
//   updatePasswordRepo = UR.updatePassword as typeof updatePasswordRepo;
//   getUserCommentsRepo = UR.getUserComments as typeof getUserCommentsRepo;
//   getUserLikedCommentsRepo =
//     UR.getUserLikedComments as typeof getUserLikedCommentsRepo;

//   countLikes = CR.count as typeof countLikes;

//   generateTokens = TOK.generateTokens as typeof generateTokens;
//   verifyRefreshToken = TOK.verifyRefreshToken as typeof verifyRefreshToken;

//   hashMock = bcryptMod.hash as unknown as jest.MockedFunction<HashFn>;
//   compareMock = bcryptMod.compare as unknown as jest.MockedFunction<CompareFn>;
// });

// describe('UserService', () => {
//   beforeEach(() => {
//     jest.clearAllMocks();
//   });

//   describe('register', () => {
//     test('닉네임 중복 → 409', async () => {
//       findByUsername.mockResolvedValue({ id: 1 } as unknown as User);
//       await expect(
//         userService.register('u', 'e@e.com', 'pw')
//       ).rejects.toMatchObject({ status: 409 });
//     });

//     test('정상 → 해시 후 저장, password 제외 반환', async () => {
//       findByUsername.mockResolvedValue(null);
//       hashMock.mockResolvedValue('hashed');
//       createUser.mockResolvedValue({
//         id: 10,
//         username: 'u',
//         email: 'e@e.com',
//         password: 'hashed',
//         createdAt: new Date(),
//         updatedAt: new Date(),
//         images: [],
//       });

//       const out = await userService.register('u', 'e@e.com', 'pw');
//       expect(hashMock).toHaveBeenCalledWith('pw', 10);
//       expect(createUser).toHaveBeenCalledWith({
//         username: 'u',
//         email: 'e@e.com',
//         password: 'hashed',
//       });
//       expect(out).toEqual(
//         expect.objectContaining({ id: 10, username: 'u', email: 'e@e.com' })
//       );
//       expect(out).not.toHaveProperty('password');
//     });
//   });

//   test('login → generateTokens 위임', async () => {
//     generateTokens.mockReturnValue({ accessToken: 'A', refreshToken: 'R' });
//     const tok = await userService.login(7);
//     expect(generateTokens).toHaveBeenCalledWith(7);
//     expect(tok).toEqual({ accessToken: 'A', refreshToken: 'R' });
//   });

//   test('getUserProfile → 레포 위임', async () => {
//     findById.mockResolvedValue({
//       id: 7,
//       username: 'u',
//       email: 'e',
//       images: [],
//       createdAt: new Date(),
//       updatedAt: new Date(),
//     });
//     await userService.getUserProfile(7);
//     expect(findById).toHaveBeenCalledWith(7);
//   });

//   test('updateUserProfile → 레포 위임', async () => {
//     updateUser.mockResolvedValue({ username: 'neo', email: 'e', images: [] });
//     const dto: UserPublic = { username: 'neo', email: 'e', images: [] };
//     await userService.updateUserProfile(7, dto);
//     expect(updateUser).toHaveBeenCalledWith(7, dto);
//   });

//   describe('updatePassword', () => {
//     test('사용자 없음 → 404', async () => {
//       findByIdWithPassword.mockResolvedValue(null);
//       await expect(
//         userService.updatePassword(7, 'c', 'n')
//       ).rejects.toMatchObject({ status: 404 });
//     });

//     test('현재 비번 불일치 → 400', async () => {
//       findByIdWithPassword.mockResolvedValue({
//         id: 7,
//         username: 'u',
//         email: 'e',
//         password: 'hashed',
//         images: [],
//         createdAt: new Date(),
//         updatedAt: new Date(),
//       });
//       compareMock.mockResolvedValue(false);

//       await expect(
//         userService.updatePassword(7, 'wrong', 'new')
//       ).rejects.toMatchObject({ status: 400 });
//       expect(compareMock).toHaveBeenCalledWith('wrong', 'hashed');
//     });

//     test('기존 비번 재사용 → 400', async () => {
//       findByIdWithPassword.mockResolvedValue({
//         id: 7,
//         username: 'u',
//         email: 'e',
//         password: 'hashed',
//         images: [],
//         createdAt: new Date(),
//         updatedAt: new Date(),
//       });
//       compareMock.mockResolvedValueOnce(true).mockResolvedValueOnce(true);

//       await expect(
//         userService.updatePassword(7, 'old', 'old')
//       ).rejects.toMatchObject({ status: 400 });
//     });

//     test('성공 → hash→update, password 제외 반환', async () => {
//       findByIdWithPassword.mockResolvedValue({
//         id: 7,
//         username: 'u',
//         email: 'e',
//         password: 'hashed',
//         images: [],
//         createdAt: new Date(),
//         updatedAt: new Date(),
//       });
//       compareMock.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
//       hashMock.mockResolvedValue('newHashed');
//       updatePasswordRepo.mockResolvedValue({
//         id: 7,
//         username: 'u',
//         email: 'e',
//         password: 'newHashed',
//         images: [],
//         createdAt: new Date(),
//         updatedAt: new Date(),
//       });

//       const out = await userService.updatePassword(7, 'old', 'new!');
//       expect(hashMock).toHaveBeenCalledWith('new!', 10);
//       expect(updatePasswordRepo).toHaveBeenCalledWith(7, 'newHashed');
//       expect(out).toEqual(
//         expect.objectContaining({ id: 7, username: 'u', email: 'e' })
//       );
//       expect(out).not.toHaveProperty('password');
//     });
//   });

//   describe('getUserComments / getUserLikedComments', () => {
//     test('getUserComments → likeCount 합성', async () => {
//       getUserCommentsRepo.mockResolvedValue([
//         {
//           id: 1,
//           content: 'a',
//           product: null,
//           article: { id: 100, title: 'A' },
//           createdAt: new Date(),
//         },
//         {
//           id: 2,
//           content: 'b',
//           product: null,
//           article: null,
//           createdAt: new Date(),
//         },
//       ]);
//       countLikes.mockResolvedValueOnce(5).mockResolvedValueOnce(0);

//       const out = await userService.getUserComments(7);
//       expect(out).toEqual([
//         expect.objectContaining({ id: 1, likeCount: 5 }),
//         expect.objectContaining({ id: 2, likeCount: 0 }),
//       ]);
//     });

//     test('getUserLikedComments → comment + likeCount + isLiked', async () => {
//       getUserLikedCommentsRepo.mockResolvedValue([
//         {
//           id: 1,
//           userId: 7,
//           commentId: 3,
//           createdAt: new Date(),
//           comment: {
//             id: 3,
//             content: 'c',
//             product: null,
//             article: null,
//             createdAt: new Date(),
//           },
//         },
//       ]);
//       countLikes.mockResolvedValue(7);

//       const out = await userService.getUserLikedComments(7);
//       expect(out).toEqual([
//         expect.objectContaining({
//           id: 3,
//           content: 'c',
//           likeCount: 7,
//           isLiked: true,
//         }),
//       ]);
//     });
//   });

//   describe('cookies / refresh', () => {
//     const resCast = (r: unknown) => r as import('express').Response;

//     test('setTokenCookies', () => {
//       const res = resMock();
//       userService.setTokenCookies(resCast(res), 'A', 'R');
//       expect(res.cookie).toHaveBeenCalledWith('at', 'A', expect.any(Object));
//       expect(res.cookie).toHaveBeenCalledWith(
//         'rt',
//         'R',
//         expect.objectContaining({ path: '/auth/refresh' })
//       );
//     });

//     test('clearTokenCookies', () => {
//       const res = resMock();
//       userService.clearTokenCookies(resCast(res));
//       expect(res.clearCookie).toHaveBeenCalledWith('at');
//       expect(res.clearCookie).toHaveBeenCalledWith('rt');
//     });

//     test('refreshTokens → verify → generate → set cookies → access 반환', async () => {
//       verifyRefreshToken.mockReturnValue({ userId: 7 });
//       generateTokens.mockReturnValue({ accessToken: 'A', refreshToken: 'R' });

//       const res = resMock();
//       const access = await userService.refreshTokens('RT', resCast(res));
//       expect(verifyRefreshToken).toHaveBeenCalledWith('RT');
//       expect(generateTokens).toHaveBeenCalledWith(7);
//       expect(res.cookie).toHaveBeenCalledTimes(2);
//       expect(access).toBe('A');
//     });
//   });
// });
