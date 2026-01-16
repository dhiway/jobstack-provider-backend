import { FastifyRequest, FastifyReply } from 'fastify';
import { auth } from '@lib/auth';
import { logActivity } from './logger';
import { updateUserSessionActivity } from '@lib/sessionActivity';

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

  // Track user session activity in Redis for last seen tracking
  // This is done asynchronously to not block the request
  const user = session.user as { 
    id: string; 
    email?: string | null; 
    phoneNumber?: string | null; 
    name: string 
  };
  
  updateUserSessionActivity(
    {
      id: user.id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      name: user.name,
    },
    session.session?.id
  ).catch((err) => {
    // Log error but don't fail the request
    console.error('Failed to update session activity:', err);
  });
}
