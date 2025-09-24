import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { createJobPostingSchema } from './createJobPostingSchema';

import { CreateSchemaRequestSchema } from './validation/request';
import { CreateJobPostingSchemaResponseSchema } from './validation/response';
import { ErrorResponseSchema } from '@validation/schema/response';
import { authMiddleware } from '@middleware/validateSession';

const schemaProviderRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.route({
    url: '/job-posting',
    method: 'POST',
    preHandler: authMiddleware,
    schema: {
      tags: ['Schema'],
      body: CreateSchemaRequestSchema,
      response: {
        200: CreateJobPostingSchemaResponseSchema,
        400: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
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
