import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import {
  ErrorResponseSchema,
  SuccessResponseSchema,
} from '@validation/schema/response';
import { authMiddleware } from '@middleware/validateSession';
import { UpdateUserSchema } from '@validation/common';
import { updateUser } from './updateUser';

const userRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.route({
    url: '/',
    method: 'PATCH',
    schema: {
      body: UpdateUserSchema,
      tags: ['User'],
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        409: ErrorResponseSchema,
      },
    },
    preHandler: authMiddleware,
    handler: updateUser,
  });
};

export default userRoutes;
