import * as z from 'zod/v4';
import { ContextSchema } from '../base-spec';

const StatusOrderSchema = z.object({
  id: z.string(),
});

const StatusMessageSchema = z.object({
  order: StatusOrderSchema,
});

const StatusRequestSchema = z.object({
  context: ContextSchema,
  message: StatusMessageSchema,
});

export default StatusRequestSchema;
