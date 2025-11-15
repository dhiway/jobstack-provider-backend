import { authMiddleware } from '@middleware/validateSession';
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import {
  listAssociations,
  ListAssociationsQuerySchema,
} from './fetchAssociationList';
import {
  AssociationParamsSchema,
  fetchAssociationOverview,
  fetchAssociationOverviewQuerySchema,
} from './fetchAssociationOverview';

export const associationProviderRoutes: FastifyPluginAsyncZod = async function (
  fastify
) {
  fastify.route({
    url: '/',
    method: 'GET',
    preHandler: authMiddleware,
    handler: listAssociations,
    schema: {
      querystring: ListAssociationsQuerySchema,
    },
  });
  fastify.route({
    url: '/:slug/overview',
    method: 'GET',
    preHandler: authMiddleware,
    handler: fetchAssociationOverview,
    schema: {
      querystring: fetchAssociationOverviewQuerySchema,
      params: AssociationParamsSchema,
    },
  });
};
