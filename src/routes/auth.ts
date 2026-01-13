import { auth } from '@lib/auth';
import { FastifyPluginAsync } from 'fastify';
import { db } from '@db/setup';
import { user, sessionHistory } from '@db/schema';
import { eq } from 'drizzle-orm';

const AuthRoutes: FastifyPluginAsync = async (fastify): Promise<void> => {
  // Custom logout endpoint to track logout activity
  fastify.post('/api/v1/auth/sign-out', async (request, reply) => {
    try {
      const session = await auth.api.getSession({
        headers: new Headers(request.headers as Record<string, string>),
      });

      if (session?.user) {
        const now = new Date();

        // Update last logout time in user table
        await db
          .update(user)
          .set({
            lastLogoutAt: now,
          })
          .where(eq(user.id, session.user.id));

        // Update session history with logout time
        await db
          .update(sessionHistory)
          .set({
            logoutAt: now,
            updatedAt: now,
          })
          .where(eq(sessionHistory.sessionId, session.session.id));
      }

      // Call Better Auth sign-out handler (this will delete the session from session table)
      const url = new URL(request.url, `http://${request.headers.host}`);
      const headers = new Headers();

      for (const [key, value] of Object.entries(request.headers)) {
        if (value) headers.append(key, String(value));
      }

      const req = new Request(url.toString(), {
        method: request.method,
        headers,
        body: request.body ? JSON.stringify(request.body) : undefined,
      });

      const response = await auth.handler(req);

      response.headers.forEach((value, key) => {
        reply.header(key, value);
      });

      reply.status(response.status);
      reply.send(response.body ? await response.text() : null);
    } catch (err: any) {
      reply.status(500).send({
        error: 'Logout failed',
        code: 'LOGOUT_FAILURE',
        message: err.message,
      });
    }
  });

  fastify.route({
    method: ['GET', 'POST', 'OPTIONS'],
    url: '/api/v1/auth/*',
    config: { rateLimit: { max: 10, timeWindow: '10 seconds' } },
    handler: async (request, reply) => {
      if (request.method === 'OPTIONS') {
        return reply.status(204).send();
      }

      try {
        const url = new URL(request.url, `http://${request.headers.host}`);
        const headers = new Headers();

        for (const [key, value] of Object.entries(request.headers)) {
          if (value) headers.append(key, String(value));
        }

        const req = new Request(url.toString(), {
          method: request.method,
          headers,
          body: request.body ? JSON.stringify(request.body) : undefined,
        });

        const response = await auth.handler(req);

        response.headers.forEach((value, key) => {
          reply.header(key, value);
        });

        reply.status(response.status);
        reply.send(response.body ? await response.text() : null);
      } catch (err: any) {
        reply.status(500).send({
          error: 'Internal authentication error',
          code: 'AUTH_FAILURE',
          message: err.message,
        });
      }
    },
  });
};

export default AuthRoutes;
