import * as z from 'zod/v4';
import { LocationSchema, TagSchema } from '../base-spec';

// Search API schemas
const SearchIntentSchema = z.object({
  item: z
    .object({
      descriptor: z
        .object({
          name: z.string(),
        })
        .optional(),
      tags: z.array(TagSchema).optional(),
    })
    .optional(),
  provider: z
    .object({
      descriptor: z
        .object({
          id: z.string().optional(),
          name: z.string(),
        })
        .optional(),
      locations: z.array(LocationSchema).optional(),
    })
    .optional(),
  fulfillment: z
    .object({
      customer: z
        .object({
          person: z.object({
            age: z.string().optional(),
            gender: z.string().optional(),
            skills: z
              .array(
                z.object({
                  code: z.string(),
                  name: z.string(),
                })
              )
              .optional(),
          }),
        })
        .optional(),
    })
    .optional(),
});

const SearchMessageSchema = z.object({
  intent: SearchIntentSchema,
});

const SearchRequestSchema = z.object({
  /* context: ContextSchema, */
  message: SearchMessageSchema,
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
  }),
});

export type a = z.infer<typeof SearchRequestSchema>;
export default SearchRequestSchema;
