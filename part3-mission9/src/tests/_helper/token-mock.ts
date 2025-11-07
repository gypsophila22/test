export const generateTokens = jest.fn((_userId: number) => ({
  accessToken: 'A.T',
  refreshToken: 'R.T',
}));

export const verifyRefreshToken = jest.fn(() => ({ userId: 7 }));

export default { generateTokens, verifyRefreshToken };
