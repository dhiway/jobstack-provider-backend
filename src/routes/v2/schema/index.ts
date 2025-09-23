import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { createSchema } from './createSchema';

const schemaProviderRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.route({
    url: '/',
    method: 'POST',
    schema: {
      tags: ['Schema'],
    },
    handler: createSchema,
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
