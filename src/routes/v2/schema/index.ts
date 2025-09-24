import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { createJobPostingSchema } from './createJobPostingSchema';

const schemaProviderRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.route({
    url: '/',
    method: 'POST',
    schema: {
      tags: ['Schema'],
    },
    handler: createJobPostingSchema,
  });
  fastify.route({
    url: '/',
    method: 'GET',
    schema: {
      tags: ['Schema'],
    },
    handler: () => {},
  });
};

export default schemaProviderRoutes;
