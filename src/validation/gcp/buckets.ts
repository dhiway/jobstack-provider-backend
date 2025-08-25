import * as z from 'zod/v4';

export const PresignedUrlInputSchema = z.object({
  contentType: z.string().min(1, "contentType is required"),
  bucketName: z.string().min(1, "bucketName is required"),
  objectKey: z.string().min(1, "objectKey is required"),
});

export const DeleteObjectInputSchema = z.object({
  bucketName: z.string(),
  objectKey: z.string(),
});