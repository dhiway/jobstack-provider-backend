import { auth } from '@lib/auth';
import { FastifyPluginAsync } from 'fastify';

const AuthRoutes: FastifyPluginAsync = async (fastify): Promise<void> => {
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
