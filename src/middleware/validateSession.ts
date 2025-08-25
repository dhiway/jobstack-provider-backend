import { FastifyRequest, FastifyReply } from 'fastify';
import { auth } from '@lib/auth';

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

  request.user = session.user;
}
