import { FastifyPluginAsync } from 'fastify';
import becknProviderRoutes from './beckn';

const v1Routes: FastifyPluginAsync = async (fastify) => {
  fastify.register(becknProviderRoutes, { prefix: '/beckn' });
};

export default v1Routes;
