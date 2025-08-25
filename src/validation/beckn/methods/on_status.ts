import * as z from 'zod/v4';
import {
  ContextSchema,
  FulfillmentSchema,
  ItemSchema,
  LocationSchema,
  TimeRangeSchema,
} from '../base-spec';

const OnStatusOrderSchema = z.object({
  id: z.string(),
  provider: z.object({
    id: z.string(),
    descriptor: z.object({
      name: z.string(),
    }),
    locations: z.array(LocationSchema),
  }),
  items: z.array(
    ItemSchema.extend({
      time: z.object({
        range: TimeRangeSchema,
      }),
    })
  ),
  fulfillments: z.array(FulfillmentSchema),
});

const OnStatusMessageSchema = z.object({
  order: OnStatusOrderSchema,
});

const OnStatusResponseSchema = z.object({
  context: ContextSchema,
  message: OnStatusMessageSchema,
});

export default OnStatusResponseSchema;
