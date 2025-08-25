import {
  DeleteObjectInputSchema,
  PresignedUrlInputSchema,
} from '@validation/gcp/buckets';
import { ErrorResponseSchema } from '@validation/schema/response';
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import {
  deleteObjectHandler,
  generatePresignedUrlHandler,
} from './JobstackStorage';
import { authMiddleware } from '@middleware/validateSession';
import {
  DeleteObjectResponseSchema,
  GeneratePresignedUrlResponseSchema,
} from '@validation/schema/jobs/sucessResponse';

const storageBucket: FastifyPluginAsyncZod = async function (fastify) {
  fastify.route({
    url: '/presigned-url',
    method: 'POST',
    schema: {
      body: PresignedUrlInputSchema,
      tags: ['Storage'],
      response: {
        200: GeneratePresignedUrlResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: authMiddleware,
    handler: generatePresignedUrlHandler,
  });

  fastify.route({
    url: '/object',
    method: 'DELETE',
    schema: {
      body: DeleteObjectInputSchema,
      tags: ['Storage'],
      response: {
        200: DeleteObjectResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: authMiddleware,
    handler: deleteObjectHandler,
  });
};

export default storageBucket;
