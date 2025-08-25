import { HealthCheckResponseSchema } from '@validation/schema/jobs/sucessResponse';
import { FastifyPluginAsync } from 'fastify';

const HomepageRoute: FastifyPluginAsync = async (fastify) => {
  fastify.route({
    url: '/',
    method: 'GET',
    schema: {
      response: {
        200: HealthCheckResponseSchema,
      },
    },
    handler: async function (_, reply) {
      reply.status(200).send({
        name: 'Jobstack Backend Service',
        version: '1.0.0',
        description: 'API Service for Auth, Provider Backend and Beckn Layer',
        docs: {
          api: '/api/v1/reference',
          auth: '/api/v1/auth/reference',
          gettingStarted: '/api/v1/docs/getting-started',
        },
        status: 'OK',
      });
    },
  });
};

export default HomepageRoute;
