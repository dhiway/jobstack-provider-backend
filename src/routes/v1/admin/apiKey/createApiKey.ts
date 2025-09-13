import { auth } from '@lib/auth';
import { CreateApiKeyRequestSchema } from '@validation/schema/admin/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod/v4';

type CreateApiKeyRequestInput = z.infer<typeof CreateApiKeyRequestSchema>;

export async function createApiKey(
  request: FastifyRequest<{ Body: CreateApiKeyRequestInput }>,
  reply: FastifyReply
) {
  const user = request.user;
  const isAdmin = user?.role === 'admin';

  if (!isAdmin) {
    return reply.status(403).send({
      statusCode: 403,
      code: 'FORBIDDEN',
      error: 'Forbidden',
      message: 'Only admins are allowed to create API keys',
    });
  }

  const {
    name,
    expiresIn,
    metadata,
    prefix = 'jobs_',
    userId,
    remaining,
    refillAmount,
    refillInterval,
    rateLimitTimeWindow,
    rateLimitMax,
    rateLimitEnabled = true,
    permissions,
  } = request.body;

  const effectiveRateLimit = {
    remaining: remaining ?? 1000,
    refillAmount: refillAmount ?? 1000,
    refillInterval: refillInterval ?? 6 * 1000, // seconds
    rateLimitTimeWindow: rateLimitTimeWindow ?? 6 * 1000, // 60 seconds = 1 minute
    rateLimitMax: rateLimitMax ?? 1000,
  };

  const apiKeyUserId = isAdmin && typeof userId === 'string' ? userId : user.id;
  const hasPermissions = permissions && Object.keys(permissions).length > 0;

  try {
    const result = await auth.api.createApiKey({
      body: {
        name,
        expiresIn,
        metadata,
        prefix,
        userId: apiKeyUserId,
        permissions: hasPermissions ? permissions : undefined,
        rateLimitEnabled,
        ...effectiveRateLimit,
      },
    });

    return reply.status(201).send({
      statusCode: 201,
      message: 'API key created successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Failed to create API key:', error);

    return reply.status(500).send({
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
      error: 'Internal Server Error',
      message: error.message ?? 'Something went wrong',
    });
  }
}
