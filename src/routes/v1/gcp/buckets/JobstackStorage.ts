import { FastifyRequest, FastifyReply } from 'fastify';
import * as z from 'zod/v4';
import { Storage } from '@google-cloud/storage';
import path from 'path';
import {
  DeleteObjectInputSchema,
  PresignedUrlInputSchema,
} from '@validation/gcp/buckets';

export type PresignedUrlInputType = z.infer<typeof PresignedUrlInputSchema>;
export type DeleteObjectInputType = z.infer<typeof DeleteObjectInputSchema>;

const keyFilePath = path.resolve(
  process.cwd(),
  'credentials/gcp/gcp-service-account.json'
);
const {
  PROJECT_ID = 'velvety-calling-462806-n3',
  STORAGE_BASE_URL = 'https://storage.googleapis.com',
} = process.env;

export const storage = new Storage({
  projectId: PROJECT_ID,
  keyFilename: keyFilePath,
});

export async function generatePresignedUrlHandler(
  request: FastifyRequest<{ Body: PresignedUrlInputType }>,
  reply: FastifyReply
) {
  try {
    const body = PresignedUrlInputSchema.parse(request.body);

    const file = storage.bucket(body.bucketName).file(body.objectKey);

    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000,
      contentType: body.contentType,
    });

    const accessUrl = `${STORAGE_BASE_URL}/${body.bucketName}/${body.objectKey}`;

    return reply.code(200).send({
      uploadUrl,
      accessUrl,
      expiresIn: 900,
      objectKey: body.objectKey,
    });
  } catch (error) {
    console.error(error);
    return reply.code(500).send({
      statusCode: 500,
      code: 'InternalServerError',
      error: 'InternalServerError',
      message: 'Could not generate presigned URL',
    });
  }
}

export async function deleteObjectHandler(
  request: FastifyRequest<{ Body: DeleteObjectInputType }>,
  reply: FastifyReply
) {
  try {
    const body = request.body;

    const file = storage.bucket(body.bucketName).file(body.objectKey);

    await file.delete();

    return reply.code(200).send({
      objectKey: body.objectKey,
    });
  } catch (error: any) {
    if (error.code && error.errors && Array.isArray(error.errors)) {
      const statusCode = Number(error.code) || 500;
      return reply.code(statusCode).send({
        statusCode,
        code: error.errors[0]?.reason || 'GCPError',
        error: 'GCPError',
        message:
          error.errors[0]?.message || error.message || 'Unknown GCP error',
      });
    }
    return reply.code(500).send({
      statusCode: 500,
      code: 'InternalServerError',
      error: 'InternalServerError',
      message: error.message ?? 'Could not delete object',
    });
  }
}
