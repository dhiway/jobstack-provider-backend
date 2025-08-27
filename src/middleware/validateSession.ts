import { FastifyRequest, FastifyReply } from 'fastify';
import { auth } from '@lib/auth';
import { logActivity } from './logger';

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

  request.user = session.user;
}
