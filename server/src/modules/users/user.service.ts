import { prisma } from '../../prisma/client.js';
import { UpdateProfileInput } from './user.schema.js';

export const getPublicProfile = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      branch: true,
      year: true,
      hostel: true,
      bio: true,
      avatarUrl: true,
      role: true,
      createdAt: true,
      listings: {
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          title: true,
          price: true,
          images: true,
          category: true,
          condition: true,
          status: true,
        },
      },
    },
  });

  if (!user) {
    throw {
      status: 404,
      code: 'NOT_FOUND',
      message: 'User not found',
    };
  }

  return user;
};

export const updateProfile = async (userId: string, input: UpdateProfileInput) => {
  const updateData: Record<string, any> = {};

  if (input.email !== undefined) {
    const email = input.email?.trim().toLowerCase() || null;
    if (email) {
      const existing = await prisma.user.findFirst({
        where: { email, id: { not: userId } },
        select: { id: true },
      });
      if (existing) {
        throw { status: 409, code: 'EMAIL_EXISTS', message: 'Email is already in use' };
      }
    }
    updateData.email = email;
  }
  if (input.hostel !== undefined) updateData.hostel = input.hostel || null;
  if (input.bio !== undefined) updateData.bio = input.bio || null;
  if (input.upiId !== undefined) updateData.upiId = input.upiId || null;
  if (input.upiName !== undefined) updateData.upiName = input.upiName || null;
  if (input.avatarUrl !== undefined) updateData.avatarUrl = input.avatarUrl || null;

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      prn: true,
      branch: true,
      year: true,
      hostel: true,
      bio: true,
      avatarUrl: true,
      upiId: true,
      upiName: true,
      role: true,
      createdAt: true,
    },
  });

  return user;
};
