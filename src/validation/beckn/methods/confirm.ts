import * as z from 'zod/v4';
import { ContextSchema, FulfillmentSchema } from '../base-spec';

const ConfirmOrderItemSchema = z.object({
  id: z.string(),
  fulfillment_ids: z.array(z.string()).optional(),
});

const ConfirmOrderSchema = z.object({
  provider: z.object({
    id: z.string(),
  }),
  items: z.array(ConfirmOrderItemSchema),
  fulfillments: z.array(FulfillmentSchema).optional(),
});

const ConfirmMessageSchema = z.object({
  order: ConfirmOrderSchema,
});

const ConfirmRequestSchema = z.object({
  context: ContextSchema,
  message: ConfirmMessageSchema,
});

export default ConfirmRequestSchema;
