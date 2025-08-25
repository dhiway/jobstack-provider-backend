import { validateAPIKey } from '@middleware/validateAPIKey';
import { FastifyPluginAsync } from 'fastify';
import verifyUser from './verifyUser';
import createProfile from './createProfile';
import createJobPosting from './createJobPosting';
import { getOrganizationDetailsByAgentId } from './getOrganizationDetailsByAgentId';

const dialFlowRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.route({
    url: '/verify-user',
    method: 'POST',
    preHandler: async (request, reply) => {
      validateAPIKey(request, reply);
    },
    handler: verifyUser,
  });
  fastify.route({
    url: '/create-profile',
    method: 'POST',
    preHandler: async (request, reply) => {
      validateAPIKey(request, reply);
    },
    handler: createProfile,
  });
  fastify.route({
    url: '/create-job-post',
    method: 'POST',
    preHandler: async (request, reply) => {
      validateAPIKey(request, reply);
    },
    handler: createJobPosting,
  });
   fastify.route({
    url: '/org-details',
    method: 'GET',
    preHandler: async (request, reply) => {
      validateAPIKey(request, reply);
    },
    handler: getOrganizationDetailsByAgentId,
  });
};

export default dialFlowRoutes;
