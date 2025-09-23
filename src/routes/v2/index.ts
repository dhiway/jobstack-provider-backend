import { FastifyPluginAsync } from 'fastify';
import becknProviderRoutes from './beckn';
import schemaProviderRoutes from './schema';

const v2Routes: FastifyPluginAsync = async (fastify) => {
  fastify.register(becknProviderRoutes, { prefix: '/beckn' });
  fastify.register(schemaProviderRoutes, { prefix: '/schema' });
};

export default v2Routes;
