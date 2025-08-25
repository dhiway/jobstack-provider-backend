import * as z from 'zod/v4';
import { ContextSchema, FulfillmentSchema } from '../base-spec';

const InitOrderItemSchema = z.object({
  id: z.string(),
  fulfillment_ids: z.array(z.string()).optional(),
});

const InitOrderSchema = z.object({
  provider: z.object({
    id: z.string(),
  }),
  items: z.array(InitOrderItemSchema),
  fulfillments: z.array(FulfillmentSchema).optional(),
});

const InitMessageSchema = z.object({
  order: InitOrderSchema,
});

const InitRequestSchema = z.object({
  context: ContextSchema,
  message: InitMessageSchema,
});

export default InitRequestSchema;
