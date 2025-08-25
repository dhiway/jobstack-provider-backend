import * as z from 'zod/v4';
import {
  /* ContextSchema, */
  FulfillmentSchema,
  ItemSchema,
  LocationSchema,
  TimeRangeSchema,
} from '../base-spec';

const OnSelectOrderSchema = z.object({
  provider: z.object({
    id: z.string(),
    descriptor: z.object({
      name: z.string(),
    }),
    fulfillments: z.array(FulfillmentSchema),
    locations: z.array(LocationSchema),
  }),
  items: z.array(
    ItemSchema.extend({
      time: z.object({
        range: TimeRangeSchema,
      }),
    })
  ),
  fulfillments: z.array(FulfillmentSchema).optional(),
});

const OnSelectMessageSchema = z.object({
  order: OnSelectOrderSchema,
});

const OnSelectResponseSchema = z.object({
  /* context: ContextSchema, */
  message: OnSelectMessageSchema,
});

export default OnSelectResponseSchema;
