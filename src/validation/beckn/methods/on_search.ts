import * as z from 'zod/v4';
import {
  /* ContextSchema, */
  FulfillmentSchema,
  ItemSchema,
  LocationSchema,
  MediaSchema,
} from '../base-spec';

const ProviderSchema = z.object({
  id: z.string(),
  descriptor: z.object({
    name: z.string(),
    short_desc: z.string().optional(),
    images: z.array(MediaSchema).optional(),
  }),
  fulfillments: z.array(FulfillmentSchema),
  locations: z.array(LocationSchema),
  items: z.array(ItemSchema),
});

const CatalogSchema = z.object({
  descriptor: z.object({
    name: z.string(),
  }),
  providers: z.array(ProviderSchema),
});

const OnSearchMessageSchema = z.object({
  catalog: CatalogSchema,
});

const OnSearchResponseSchema = z.object({
  /* context: ContextSchema, */
  message: OnSearchMessageSchema,
});

export default OnSearchResponseSchema;
