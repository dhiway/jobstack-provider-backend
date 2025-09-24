import { FastifyPluginAsync } from 'fastify';
import becknProviderRoutes from './beckn';
import schemaProviderRoutes from './schema';
import jobsProviderRoutes from './jobs/organization';

const v2Routes: FastifyPluginAsync = async (fastify) => {
  fastify.register(becknProviderRoutes, { prefix: '/beckn' });
  fastify.register(jobsProviderRoutes, { prefix: '/jobs/:organizationId' });
  fastify.register(schemaProviderRoutes, { prefix: '/schema' });
};

export default v2Routes;
