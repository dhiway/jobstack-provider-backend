import { auth } from '@lib/auth';
import { FastifyReply, FastifyRequest } from 'fastify';

export async function validateAPIKey(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const apiKey = request.headers['x-api-key'];
  if (typeof apiKey === 'string') {
    const verified = await auth.api.verifyApiKey({
      body: {
        key: apiKey,
        permissions: request.permissions || undefined,
      },
    });
    if (verified.error || !verified.valid) {
      return reply.status(403).send({
        statusCode: 403,
        code: 'INVALID_API_KEY',
        error: 'Forbidden',
        message: 'Invalid API key provided',
      });
    }
  } else {
    return reply.status(401).send({
      statusCode: 401,
      code: 'API_KEY_NOT_FOUND',
      error: 'Not Found',
      message: 'API key missing',
    });
  }
}
