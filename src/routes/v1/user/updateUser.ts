import { FastifyReply, FastifyRequest } from 'fastify';
import { UpdateUserSchema } from '@validation/common';
import { db } from '@db/setup';
import { user } from '@db/schema/auth';
import { and, eq, ne, DrizzleQueryError } from 'drizzle-orm';
import { DatabaseError } from 'pg';
import z from 'zod/v4';
import redis from '@lib/redis';

type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

export async function updateUser(
  request: FastifyRequest<{ Body: UpdateUserInput }>,
  reply: FastifyReply
) {
  const userId = request.user.id;
  const body = UpdateUserSchema.parse(request.body);

  const [existing] = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!existing) {
    return reply.status(404).send({
      statusCode: 404,
      code: 'USER_NOT_FOUND',
      error: 'Not Found',
      message: 'User not found',
    });
  }

  if (body.email !== undefined) {
    const [otherWithEmail] = await db
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.email, body.email), ne(user.id, userId)))
      .limit(1);
    if (otherWithEmail) {
      return reply.status(409).send({
        statusCode: 409,
        code: 'EMAIL_ALREADY_IN_USE',
        error: 'Conflict',
        message: 'Email is already in use by another user',
      });
    }
  }

  if (body.phoneNumber !== undefined) {
    const [otherWithPhone] = await db
      .select({ id: user.id })
      .from(user)
      .where(
        and(eq(user.phoneNumber, body.phoneNumber), ne(user.id, userId))
      )
      .limit(1);
    if (otherWithPhone) {
      return reply.status(409).send({
        statusCode: 409,
        code: 'PHONE_ALREADY_IN_USE',
        error: 'Conflict',
        message: 'Phone number is already in use by another user',
      });
    }
  }

  const updates: Partial<{
    name: string;
    email: string | null;
    phoneNumber: string | null;
    emailVerified: boolean;
    phoneNumberVerified: boolean;
    updatedAt: Date;
  }> = {
    updatedAt: new Date(),
  };

  if (body.name !== undefined) {
    updates.name = body.name;
  }

  if (body.email !== undefined) {
    updates.email = body.email;
    if (existing.email !== body.email) {
      updates.emailVerified = false;
    }
  }

  if (body.phoneNumber !== undefined) {
    updates.phoneNumber = body.phoneNumber;
    if (existing.phoneNumber !== body.phoneNumber) {
      updates.phoneNumberVerified = false;
    }
  }

  try {
    await db
      .update(user)
      .set(updates)
      .where(eq(user.id, userId));
  } catch (err: any) {
    if (err instanceof DrizzleQueryError && err.cause instanceof DatabaseError) {
      if (err.cause.code === '23505') {
        const detail: string = (err.cause as any).detail || '';
        if (detail.includes('email')) {
          return reply.status(409).send({
            statusCode: 409,
            code: 'EMAIL_ALREADY_IN_USE',
            error: 'Conflict',
            message: 'Email is already in use by another user',
          });
        }
        if (detail.includes('phone_number')) {
          return reply.status(409).send({
            statusCode: 409,
            code: 'PHONE_ALREADY_IN_USE',
            error: 'Conflict',
            message: 'Phone number is already in use by another user',
          });
        }
      }
    }
    throw err;
  }

  // Evict the better-auth Redis session cache so the next getSession call
  // re-fetches the user row and returns the updated email/phoneNumber.
  if (request.sessionToken) {
    await redis.del(request.sessionToken).catch((err) => {
      console.error('Failed to evict session cache:', err);
    });
  }

  // Clear the sessionData cookie cache so the next get-session call
  // falls through to Redis/DB and returns fresh user data.
  const isProd = process.env.NODE_ENV === 'production';
  const sessionDataCookieName = isProd
    ? '__Secure-better-auth.session_data'
    : 'better-auth.session_data';

  const cookieOptions: Record<string, any> = {
    path: '/',
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
  };

  if (isProd && process.env.SERVER_ENDPOINT) {
    cookieOptions.domain = process.env.SERVER_ENDPOINT;
  }

  reply.clearCookie(sessionDataCookieName, cookieOptions);

  return reply.send({
    statusCode: 200,
    message: 'User updated successfully',
  });
}
