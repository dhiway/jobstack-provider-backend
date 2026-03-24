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

  // Update the session data in Redis so subsequent getSession calls return
  // fresh user data without logging the user out.
  // (better-auth uses secondaryStorage as the sole session store when configured,
  //  so deleting the key would invalidate the session entirely.)
  const sessionToken = request.sessionToken;
  if (sessionToken) {
    await (async () => {
      try {
        const raw = await redis.get(sessionToken);
        if (raw) {
          const sessionData = JSON.parse(raw);
          if (body.name !== undefined) sessionData.user.name = body.name;
          if (body.email !== undefined) {
            sessionData.user.email = body.email;
            if (existing.email !== body.email)
              sessionData.user.emailVerified = false;
          }
          if (body.phoneNumber !== undefined) {
            sessionData.user.phoneNumber = body.phoneNumber;
            if (existing.phoneNumber !== body.phoneNumber)
              sessionData.user.phoneNumberVerified = false;
          }
          sessionData.user.updatedAt = new Date().toISOString();
          const ttl = await redis.ttl(sessionToken);
          if (ttl > 0) {
            await redis.set(sessionToken, JSON.stringify(sessionData), 'EX', ttl);
          } else {
            await redis.set(sessionToken, JSON.stringify(sessionData));
          }
        }
      } catch (err) {
        console.error('Failed to update session cache in Redis:', err);
      }
    })();
  }

  // Clear the session_data cookie cache so the next get-session call reads
  // the updated session from Redis instead of returning stale cookie data.
  // Must match all attributes used when the cookie was set (including
  // `partitioned: true` in production) or the browser will not clear it.
  const isProd = process.env.NODE_ENV === 'production';
  const sessionDataCookieName = isProd
    ? '__Secure-better-auth.session_data'
    : 'better-auth.session_data';

  const cookieOptions: Record<string, any> = {
    path: '/',
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    ...(isProd ? { partitioned: true } : {}),
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
