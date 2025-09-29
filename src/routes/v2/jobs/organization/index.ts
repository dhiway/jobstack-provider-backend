import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { CreateJobPostSchema } from '../schema/request';
import { JobPostingResponseSchema } from '../schema/response';
import { JobParamsSchema } from '@validation/schema/jobs/request';
import { ErrorResponseSchema } from '@validation/schema/response';
import { authMiddleware } from '@middleware/validateSession';
import { createJobPost } from '../organization/posting/createJobPosting';

const jobsProviderRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.route({
    url: '/',
    method: 'POST',
    schema: {
      body: CreateJobPostSchema,
      params: JobParamsSchema,
      tags: ['Provider-v2'],
      response: {
        201: JobPostingResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
      },
    },
    preHandler: authMiddleware,
    handler: createJobPost,
  });
};

export default jobsProviderRoutes;
