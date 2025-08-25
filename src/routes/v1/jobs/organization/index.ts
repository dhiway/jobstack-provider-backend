import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import {
  CreateJobPostSchema,
  DeleteJobPostSchema,
  JobParamsSchema,
  UpdateJobApplicationStatusSchema,
  UpdateJobPostSchema,
} from '@validation/schema/jobs/request';
import {
  ErrorResponseSchema,
  SuccessResponseSchema,
} from '@validation/schema/response';
import { authMiddleware } from '@middleware/validateSession';
import { createJobPost } from '@routes/v1/jobs/organization/posting/createJobPosting';
import { getJobPostings } from '@routes/v1/jobs/organization/posting/fetchJobPostings';
import { getJobApplications } from './application/fetchJobApplications';
import { updateJobApplicationStatus } from './application/updateJobApplicationStatus';
import { updateJobPost } from './posting/updateJobPosting';
import { deleteJobPost } from './posting/deleteJobPosting';
import {
  FetchJobApplicationsResponseSchema,
  FetchJobResponseSchema,
  JobPostingResponseSchema,
  UpdateJobApplicationStatusResponseSchema,
} from '@validation/schema/jobs/sucessResponse';

const jobsProvider: FastifyPluginAsyncZod = async function (fastify) {
  fastify.route({
    url: '/',
    method: 'GET',
    schema: {
      params: JobParamsSchema,
      tags: ['Provider'],
      response: {
        200: FetchJobResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
      },
    },
    preHandler: authMiddleware,
    handler: getJobPostings,
  });
  fastify.route({
    url: '/',
    method: 'POST',
    schema: {
      body: CreateJobPostSchema,
      params: JobParamsSchema,
      tags: ['Provider'],
      response: {
        201: JobPostingResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
      },
    },
    preHandler: authMiddleware,
    handler: createJobPost,
  });
  fastify.route({
    url: '/',
    method: 'PUT',
    schema: {
      body: UpdateJobPostSchema,
      params: JobParamsSchema,
      tags: ['Provider'],
      response: {
        200: JobPostingResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
      },
    },
    preHandler: authMiddleware,
    handler: updateJobPost,
  });
  fastify.route({
    url: '/',
    method: 'DELETE',
    schema: {
      body: DeleteJobPostSchema,
      params: JobParamsSchema,
      tags: ['Provider'],
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
      },
    },
    preHandler: authMiddleware,
    handler: deleteJobPost,
  });
  //applications
  fastify.route({
    url: '/applications',
    method: 'GET',
    schema: {
      params: JobParamsSchema,
      tags: ['Provider'],
      response: {
        200: FetchJobApplicationsResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
      },
    },
    preHandler: authMiddleware,
    handler: getJobApplications,
  });
  fastify.route({
    url: '/applications',
    method: 'POST',
    schema: {
      body: UpdateJobApplicationStatusSchema,
      params: JobParamsSchema,
      tags: ['Provider'],
      response: {
        201: UpdateJobApplicationStatusResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
      },
    },
    preHandler: authMiddleware,
    handler: updateJobApplicationStatus,
  });
};

export default jobsProvider;
