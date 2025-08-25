import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import {
  CreateLocationResponseSchema,
  DeleteLocationSchema,
  FetchUserLocationsResponseSchema,
  LocationInputSchema,
  ProfilePaginationQuerySchema,
  UpdateLocationSchema,
} from '@validation/common';
import {
  ErrorResponseSchema,
  SuccessResponseSchema,
} from '@validation/schema/response';
import { authMiddleware } from '@middleware/validateSession';
import { addLocation } from './createLocation';
import { updateLocation } from './updateLocation';
import { deleteLocation } from './deleteLocation';
import { listLocations } from './listLocations';

const location: FastifyPluginAsyncZod = async function (fastify) {
  fastify.route({
    url: '/',
    method: 'GET',
    schema: {
      querystring: ProfilePaginationQuerySchema,
      tags: ['Location'],
      response: {
        200: FetchUserLocationsResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
      },
    },
    preHandler: authMiddleware,
    handler: listLocations,
  });
  fastify.route({
    url: '/',
    method: 'POST',
    schema: {
      body: LocationInputSchema,
      tags: ['Location'],
      response: {
        201: CreateLocationResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
      },
    },
    preHandler: authMiddleware,
    handler: addLocation,
  });
  fastify.route({
    url: '/',
    method: 'PUT',
    schema: {
      body: UpdateLocationSchema,
      tags: ['Location'],
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
      },
    },
    preHandler: authMiddleware,
    handler: updateLocation,
  });
  fastify.route({
    url: '/',
    method: 'DELETE',
    schema: {
      body: DeleteLocationSchema,
      tags: ['Location'],
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
      },
    },
    preHandler: authMiddleware,
    handler: deleteLocation,
  });
};

export default location;
