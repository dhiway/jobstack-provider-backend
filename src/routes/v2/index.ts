import { FastifyPluginAsync } from 'fastify';
import becknProviderRoutes from './beckn';
import schemaProviderRoutes from './schema';
import jobsProviderRoutes from './jobs/organization';
import { associationProviderRoutes } from './association';

const v2Routes: FastifyPluginAsync = async (fastify) => {
  fastify.register(becknProviderRoutes, { prefix: '/beckn' });
  fastify.register(jobsProviderRoutes, { prefix: '/jobs/:organizationId' });
  fastify.register(schemaProviderRoutes, { prefix: '/schema' });
  fastify.register(associationProviderRoutes, { prefix: '/association' });
};

export default v2Routes;
