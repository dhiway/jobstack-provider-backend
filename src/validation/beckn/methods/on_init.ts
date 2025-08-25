import * as z from 'zod/v4';
import {
  ContextSchema,
  FulfillmentSchema,
  ItemSchema,
  LocationSchema,
  TimeRangeSchema,
} from '../base-spec';

const OnInitOrderSchema = z.object({
  provider: z.object({
    id: z.string().optional(),
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

const OnInitMessageSchema = z.object({
  order: OnInitOrderSchema,
});

const OnInitResponseSchema = z.object({
  context: ContextSchema,
  message: OnInitMessageSchema,
});

export default OnInitResponseSchema;
