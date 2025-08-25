import SearchRequestSchema from '@validation/beckn/methods/search';
import { ErrorResponseSchema } from '@validation/schema/response';
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { getJobPostings } from './search';
import SelectRequestSchema from '@validation/beckn/methods/select';
import { selectJobPosting } from './select';
import { initJobPosting } from './init';
import ConfirmRequestSchema from '@validation/beckn/methods/confirm';
import { confirmJobApplication } from './confirm';
import StatusRequestSchema from '@validation/beckn/methods/status';
import { jobApplicationStatus } from './status';

const becknProvider: FastifyPluginAsyncZod = async function (fastify) {
  fastify.route({
    url: '/search',
    method: 'POST',
    schema: {
      body: SearchRequestSchema,
      tags: ['Beckn'],
      response: {
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
      },
    },
    handler: getJobPostings,
  });
  fastify.route({
    url: '/select',
    method: 'POST',
    schema: {
      body: SelectRequestSchema,
      tags: ['Beckn'],
      response: {
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
      },
    },
    handler: selectJobPosting,
  });
  fastify.route({
    url: '/init',
    method: 'POST',
    schema: {
      /* body: InitRequestSchema, */
      tags: ['Beckn'],
      response: {
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
      },
    },
    handler: initJobPosting,
  });
  fastify.route({
    url: '/confirm',
    method: 'POST',
    schema: {
      body: ConfirmRequestSchema,
      tags: ['Beckn'],
      response: {
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
      },
    },
    handler: confirmJobApplication,
  });
  fastify.route({
    url: '/status',
    method: 'POST',
    schema: {
      body: StatusRequestSchema,
      tags: ['Beckn'],
      response: {
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
      },
    },
    handler: jobApplicationStatus,
  });
};

export default becknProvider;
