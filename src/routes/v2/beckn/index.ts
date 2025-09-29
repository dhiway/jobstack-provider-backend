import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { initJobApplication } from './init';
import {
  InitJobApplicationSchema,
  SelectJobApplicationSchema,
} from './validation/request';
import {
  InitJobApplicationResponseSchema,
  SelectJobApplicationResponseSchema,
} from './validation/response';
import { ErrorResponseSchema } from '@validation/schema/response';
import { selectJobApplication } from './select';

const becknProviderRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.route({
    url: '/init',
    method: 'POST',
    schema: {
      tags: ['Beckn-v2'],
      body: InitJobApplicationSchema,
      response: {
        200: InitJobApplicationResponseSchema,
        400: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    handler: initJobApplication,
  });
  fastify.route({
    url: '/select',
    method: 'POST',
    schema: {
      tags: ['Beckn-v2'],
      body: SelectJobApplicationSchema,
      response: {
        200: SelectJobApplicationResponseSchema,
        400: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    handler: selectJobApplication,
  });
};

export default becknProviderRoutes;
