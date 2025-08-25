import * as z from 'zod/v4';
/* import { ContextSchema } from '../base-spec'; */

const OrderItemSchema = z.object({
  id: z.string(),
});

const OrderProviderSchema = z.object({
  id: z.string(),
});

const SelectOrderSchema = z.object({
  provider: OrderProviderSchema,
  items: z.array(OrderItemSchema),
});

const SelectMessageSchema = z.object({
  order: SelectOrderSchema,
});

const SelectRequestSchema = z.object({
  /* context: ContextSchema, */
  message: SelectMessageSchema,
});

export default SelectRequestSchema;
