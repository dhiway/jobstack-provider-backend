import { FastifyRequest, FastifyReply } from 'fastify';
import { auth } from '@lib/auth';
import { logActivity } from './logger';
import { db } from '@db/setup';
import { user } from '@db/schema';
import { eq } from 'drizzle-orm';

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const session = await auth.api.getSession({
    headers: new Headers(request.headers as Record<string, string>),
  });
  if (!session?.user) {
    return reply.status(401).send({
      statusCode: 401,
      code: 'Session_Err',
      error: 'Unauthorized',
      message: 'Missing/invalid authentication',
    });
  }

  logActivity(request, {
    message: {
      user: session.user.id,
      method: request.method,
      url: request.url,
    },
    methods: ['PUT', 'POST', 'DELETE'],
  });

  // Update last activity timestamp (fire and forget to not slow down requests)
  db.update(user)
    .set({
      lastActivityAt: new Date(),
    })
    .where(eq(user.id, session.user.id))
    .catch((err) => {
      console.error('Failed to update lastActivityAt:', err);
    });

  request.user = session.user;
}
