import { FastifyPluginAsync } from 'fastify';
import { getOrganizationDetailsBySlug } from './organization/getOrganizationDetailsBySlug';
import {
  CreateApiKeyResponseSchema,
  GetOrganizationDetailsBySlugResponeSchema,
  UsersByOrgRoleResponseSchema,
} from '@validation/schema/jobs/sucessResponse';
import { ErrorResponseSchema } from '@validation/schema/response';
import { createApiKey } from './apiKey/createApiKey';
import {
  CreateApiKeyRequestSchema,
  GetOrganizationDetailsBySlugRequestSchema,
  GetUsersByOrgRoleRequestSchema,
  GetUsersStatusRequestSchema,
} from '@validation/schema/admin/common';
import { authMiddleware } from '@middleware/validateSession';
import { getUsersInOrganization } from './organization/getOrganizationsWithCount';
import { getUsersJobApplicationsStatusCount } from './organization/getUsersJobApplicationStatusCount';
import { getUsersWithProfile } from './organization/getUsersWithProfileCount';
import { getUsersWithJobApplications } from './organization/getUsersWithJobApplications';
import { validateAPIKey } from '@middleware/validateAPIKey';

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.route({
    url: '/org-details',
    method: 'GET',
    schema: {
      tags: ['Admin'],
      querystring: GetOrganizationDetailsBySlugRequestSchema,
      response: {
        200: GetOrganizationDetailsBySlugResponeSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    preHandler: async (request, reply) => {
      request.permissions = { view: ['organization'] };
      validateAPIKey(request, reply);
    },
    handler: getOrganizationDetailsBySlug,
  });
  fastify.route({
    url: '/users/by-role',
    method: 'GET',
    schema: {
      tags: ['Admin'],
      querystring: GetUsersByOrgRoleRequestSchema,
      response: {
        200: UsersByOrgRoleResponseSchema,
      },
    },
    preHandler: authMiddleware,
    handler: getUsersInOrganization,
  });
  fastify.route({
    url: '/users/by-status',
    method: 'GET',
    schema: {
      tags: ['Admin'],
      querystring: GetUsersStatusRequestSchema,
      response: {
        200: UsersByOrgRoleResponseSchema,
      },
    },
    preHandler: authMiddleware,
    handler: getUsersJobApplicationsStatusCount,
  });
  fastify.route({
    url: '/users/with-profile',
    method: 'GET',
    schema: {
      tags: ['Admin'],
      querystring: GetUsersStatusRequestSchema,
      response: {
        200: UsersByOrgRoleResponseSchema,
      },
    },
    preHandler: authMiddleware,
    handler: getUsersWithProfile,
  });
  fastify.route({
    url: '/users/with-job-applications',
    method: 'GET',
    schema: {
      tags: ['Admin'],
      querystring: GetUsersStatusRequestSchema,
      response: {
        200: UsersByOrgRoleResponseSchema,
      },
    },
    preHandler: authMiddleware,
    handler: getUsersWithJobApplications,
  });
  fastify.route({
    url: '/api-key/create',
    method: 'POST',
    schema: {
      tags: ['Admin'],
      body: CreateApiKeyRequestSchema,
      response: {
        201: CreateApiKeyResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
      },
    },
    preHandler: authMiddleware,
    handler: createApiKey,
  });
};

export default adminRoutes;
