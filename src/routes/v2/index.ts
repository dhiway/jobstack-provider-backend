import { FastifyPluginAsync } from 'fastify';
import becknProviderRoutes from './beckn';

const v2Routes: FastifyPluginAsync = async (fastify) => {
  fastify.register(becknProviderRoutes, { prefix: '/beckn' });
};

export default v2Routes;
