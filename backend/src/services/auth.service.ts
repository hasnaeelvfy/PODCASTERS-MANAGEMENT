import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';

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
      role: 'admin',
    },
    select: { id: true, fullname: true, email: true, role: true, avatar: true },
  });

  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  return { user, token };
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError(401, 'Invalid credentials');

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw new AppError(401, 'Invalid credentials');

  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    user: {
      id: user.id,
      fullname: user.fullname,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    },
    token,
  };
}
