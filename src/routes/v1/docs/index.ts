import { FastifyPluginAsync } from 'fastify';
import GettingStartedDoc from './getting-started';

const docsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.register(GettingStartedDoc);
};

export default docsRoutes;
