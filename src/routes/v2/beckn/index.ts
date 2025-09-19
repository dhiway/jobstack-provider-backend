import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { initJobApplication } from './init';

const becknProviderRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.route({
    url: '/init',
    method: 'POST',
    handler: initJobApplication,
  });
  /* fastify.route({ */
  /*   url: '/select', */
  /*   method: 'POST', */
  /*   schema: { */
  /*     body: SelectRequestSchema, */
  /*     tags: ['Beckn'], */
  /*     response: { */
  /*       400: ErrorResponseSchema, */
  /*       401: ErrorResponseSchema, */
  /*     }, */
  /*   }, */
  /*   handler: selectJobPosting, */
  /* }); */
  /* fastify.route({ */
  /*   url: '/init', */
  /*   method: 'POST', */
  /*   schema: { */
  /*     /* body: InitRequestSchema, */
  /*     tags: ['Beckn'], */
  /*     response: { */
  /*       400: ErrorResponseSchema, */
  /*       401: ErrorResponseSchema, */
  /*     }, */
  /*   }, */
  /*   handler: initJobPosting, */
  /* }); */
  /* fastify.route({ */
  /*   url: '/confirm', */
  /*   method: 'POST', */
  /*   schema: { */
  /*     body: ConfirmRequestSchema, */
  /*     tags: ['Beckn'], */
  /*     response: { */
  /*       400: ErrorResponseSchema, */
  /*       401: ErrorResponseSchema, */
  /*     }, */
  /*   }, */
  /*   handler: confirmJobApplication, */
  /* }); */
  /* fastify.route({ */
  /*   url: '/status', */
  /*   method: 'POST', */
  /*   schema: { */
  /*     body: StatusRequestSchema, */
  /*     tags: ['Beckn'], */
  /*     response: { */
  /*       400: ErrorResponseSchema, */
  /*       401: ErrorResponseSchema, */
  /*     }, */
  /*   }, */
  /*   handler: jobApplicationStatus, */
  /* }); */
};

export default becknProviderRoutes;
