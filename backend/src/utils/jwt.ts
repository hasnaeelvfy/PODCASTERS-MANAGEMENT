import jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
}

export interface RefreshTokenPayload {
  sub: number;
  type: 'refresh';
}

export function signAccessToken(payload: JwtPayload): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  const expiresIn = (process.env.JWT_EXPIRES_IN || '15m') as jwt.SignOptions['expiresIn'];
  return jwt.sign(payload, secret, { expiresIn });
}

/** @deprecated Use signAccessToken */
export function signToken(payload: JwtPayload): string {
  return signAccessToken(payload);
}

export function verifyAccessToken(token: string): JwtPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return jwt.verify(token, secret) as JwtPayload;
}

/** @deprecated Use verifyAccessToken */
export function verifyToken(token: string): JwtPayload {
  return verifyAccessToken(token);
}

export function generateRefreshToken(userId: number): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not configured');
  const expiresIn = (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as jwt.SignOptions['expiresIn'];
  return jwt.sign({ sub: userId, type: 'refresh' }, secret, { expiresIn });
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not configured');
  const payload = jwt.verify(token, secret) as unknown as RefreshTokenPayload;
  if (payload.type !== 'refresh') {
    throw new Error('Invalid refresh token type');
  }
  return payload;
}
