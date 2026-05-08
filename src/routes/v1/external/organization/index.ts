import { validateAPIKey } from '@middleware/validateAPIKey';
import { ErrorResponseSchema } from '@validation/schema/response';
import {
  CreateExternalOrganizationSchema,
  ExternalOrganizationResponseSchema,
  UpdateExternalOrganizationParamsSchema,
  UpdateExternalOrganizationSchema,
} from '@validation/schema/external/organization';
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { createExternalOrganization } from './createOrganization';
import { updateExternalOrganization } from './updateOrganization';

const externalOrganizationRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.route({
    url: '/',
    method: 'POST',
    schema: {
      tags: ['External'],
      body: CreateExternalOrganizationSchema,
      response: {
        201: ExternalOrganizationResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        409: ErrorResponseSchema,
      },
    },
    preHandler: async (request, reply) => {
      request.permissions = { create: ['organization'] };
      return await validateAPIKey(request, reply);
    },
    handler: createExternalOrganization,
  });

  fastify.route({
    url: '/:organizationId',
    method: 'PUT',
    schema: {
      tags: ['External'],
      params: UpdateExternalOrganizationParamsSchema,
      body: UpdateExternalOrganizationSchema,
      response: {
        200: ExternalOrganizationResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        409: ErrorResponseSchema,
      },
    },
    preHandler: async (request, reply) => {
      request.permissions = { update: ['organization'] };
      return await validateAPIKey(request, reply);
    },
    handler: updateExternalOrganization,
  });
};

export default externalOrganizationRoutes;
