import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import {
  ErrorResponseSchema,
  SuccessResponseSchema,
} from '@validation/schema/response';
import { authMiddleware } from '@middleware/validateSession';
import { addContact } from './createContact';
import {
  ContactInputSchema,
  UpdateContactSchema,
  DeleteContactSchema,
  ProfilePaginationQuerySchema,
  CreateContactResponseSchema,
  FetchUserContactsResponseSchema,
} from '@validation/common';
import { updateContact } from './updateContact';
import { deleteContact } from './deleteContact';
import { listContacts } from './listContacts';

const contact: FastifyPluginAsyncZod = async function (fastify) {
  fastify.route({
    url: '/',
    method: 'GET',
    schema: {
      querystring: ProfilePaginationQuerySchema,
      tags: ['Contact'],
      response: {
        200: FetchUserContactsResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
      },
    },
    preHandler: authMiddleware,
    handler: listContacts,
  });
  fastify.route({
    url: '/',
    method: 'POST',
    schema: {
      body: ContactInputSchema,
      tags: ['Contact'],
      response: {
        201: CreateContactResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
      },
    },
    preHandler: authMiddleware,
    handler: addContact,
  });
  fastify.route({
    url: '/',
    method: 'PUT',
    schema: {
      body: UpdateContactSchema,
      tags: ['Contact'],
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
      },
    },
    preHandler: authMiddleware,
    handler: updateContact,
  });
  fastify.route({
    url: '/',
    method: 'DELETE',
    schema: {
      body: DeleteContactSchema,
      tags: ['Contact'],
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
      },
    },
    preHandler: authMiddleware,
    handler: deleteContact,
  });
};

export default contact;
