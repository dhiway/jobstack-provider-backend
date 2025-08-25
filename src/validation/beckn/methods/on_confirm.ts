import * as z from 'zod/v4';
import {
  ContextSchema,
  FulfillmentSchema,
  ItemSchema,
  LocationSchema,
  TimeRangeSchema,
} from '../base-spec';

const OnConfirmOrderSchema = z.object({
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
  fulfillments: z.array(FulfillmentSchema).optional(),
});

const OnConfirmMessageSchema = z.object({
  order: OnConfirmOrderSchema,
});

const OnConfirmResponseSchema = z.object({
  context: ContextSchema,
  message: OnConfirmMessageSchema,
});

export default OnConfirmResponseSchema;
