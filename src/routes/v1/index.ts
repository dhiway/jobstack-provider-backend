import { FastifyPluginAsync } from 'fastify';
import jobsProviderRoutes from './jobs/organization';
import becknProviderRoutes from './beckn';
import storageBucket from './gcp/buckets';
import userProfile from './profile';
import location from './profile/location';
import contact from './profile/contact';
import docsRoutes from './docs';
import adminRoutes from './admin';
import dialFlowRoutes from './dialFlow';

const v1Routes: FastifyPluginAsync = async (fastify) => {
  fastify.register(adminRoutes, { prefix: '/admin' });
  fastify.register(jobsProviderRoutes, { prefix: '/jobs/:organizationId' });
  fastify.register(userProfile, { prefix: '/profile' });
  fastify.register(location, { prefix: '/location' });
  fastify.register(contact, { prefix: '/contact' });
  fastify.register(becknProviderRoutes, { prefix: '/beckn' });
  fastify.register(storageBucket, { prefix: '/storage' });
  fastify.register(dialFlowRoutes, { prefix: '/dial-flow' });
  fastify.register(docsRoutes, { prefix: '/docs' });
};

export default v1Routes;
