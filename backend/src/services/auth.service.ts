import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword } from '../utils/password';
import { signAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';

const userSelect = {
  id: true,
  fullname: true,
  email: true,
  role: true,
  avatar: true,
} as const;

export async function registerUser(data: {
  fullname: string;
  email: string;
  password: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new AppError(409, 'Email already registered');

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      fullname: data.fullname,
      email: data.email,
      passwordHash,
      role: 'viewer',
    },
    select: userSelect,
  });

  const accessToken = signAccessToken({ userId: user.id, email: user.email, role: user.role });
  const refreshToken = generateRefreshToken(user.id);
  return { user, accessToken, refreshToken };
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError(401, 'Invalid credentials');

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw new AppError(401, 'Invalid credentials');

  const accessToken = signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });
  const refreshToken = generateRefreshToken(user.id);

  return {
    user: {
      id: user.id,
      fullname: user.fullname,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    },
    accessToken,
    refreshToken,
  };
}

export async function refreshAccessToken(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(401, 'Invalid or expired refresh token');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: userSelect,
  });
  if (!user) throw new AppError(401, 'User not found');

  const accessToken = signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return { accessToken, user };
}

export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string,
) {
  if (!newPassword || newPassword.length < 8) {
    throw new AppError(400, 'Le mot de passe doit avoir au moins 8 caractères');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'User not found');

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) throw new AppError(401, 'Mot de passe actuel incorrect');

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  return { message: 'Mot de passe mis à jour avec succès' };
}

export async function getUserById(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect,
  });
  if (!user) throw new AppError(404, 'User not found');
  return user;
}
