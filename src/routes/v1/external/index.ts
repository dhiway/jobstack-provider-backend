import { FastifyPluginAsync } from 'fastify';
import externalOrganizationRoutes from './organization';

const externalRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.register(externalOrganizationRoutes, { prefix: '/organization' });
};

export default externalRoutes;
