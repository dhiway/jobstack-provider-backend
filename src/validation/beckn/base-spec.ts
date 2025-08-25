import * as z from 'zod/v4';

// Base schemas
const DescriptorSchema = z.object({
  code: z.string(),
  name: z.string(),
});

const TagSchema = z.object({
  descriptor: DescriptorSchema,
  list: z.array(
    z.object({
      descriptor: DescriptorSchema,
      value: z.string(),
    })
  ),
});

const LocationSchema = z.object({
  gps: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  address: z.string(),
  city: z.object({
    name: z.string(),
    code: z.string(),
  }),
  state: z.object({
    name: z.string(),
    code: z.string(),
  }),
  country: z
    .object({
      name: z.string(),
      code: z.string(),
    })
    .optional(),
});

const MediaSchema = z.object({
  mimetype: z.string(),
  url: z.url(),
});

const QuantitySchema = z.object({
  available: z.object({
    count: z.number(),
  }),
});

const TimeRangeSchema = z.object({
  start: z.string(),
  end: z.string(),
});

const PersonSchema = z.looseObject({
  name: z.string().optional(),
  gender: z.string().optional(),
  age: z.string().optional(),
  skills: z
    .array(
      z.object({
        code: z.string(),
        name: z.string(),
      })
    )
    .optional(),
  languages: z
    .array(
      z.object({
        code: z.string(),
        name: z.string(),
      })
    )
    .optional(),
  tags: z.array(TagSchema).optional(),
});

const ContactSchema = z.object({
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.url().optional(),
});

const CustomerSchema = z.object({
  person: PersonSchema,
  contact: ContactSchema,
  location: LocationSchema,
});

const FulfillmentStateSchema = z.object({
  descriptor: DescriptorSchema,
  updated_at: z.string(),
});

const FulfillmentSchema = z.object({
  id: z.string(),
  type: z.string().optional(),
  state: FulfillmentStateSchema.optional(),
  customer: CustomerSchema.optional(),
  tags: z.array(TagSchema).optional(),
});

const ContextSchema = z.object({
  domain: z.string().optional(),
  action: z.string().optional(),
  version: z.string().optional(),
  bap_id: z.string().optional(),
  bap_uri: z.string().optional(),
  bpp_id: z.string().optional(),
  bpp_uri: z.string().optional(),
  transaction_id: z.string(),
  message_id: z.string().optional(),
  timestamp: z.string().optional(),
  ttl: z.string().optional(),
});

const ItemSchema = z.object({
  id: z.string(),
  descriptor: z.object({
    name: z.string(),
    long_desc: z.string(),
    media: z.array(MediaSchema).optional(),
  }),
  quantity: QuantitySchema,
  location_ids: z.array(z.string()),
  fulfillment_ids: z.array(z.string()),
  tags: z.array(TagSchema),
});

// Export all schemas
export {
  ContextSchema,
  DescriptorSchema,
  TagSchema,
  LocationSchema,
  MediaSchema,
  QuantitySchema,
  TimeRangeSchema,
  PersonSchema,
  ContactSchema,
  CustomerSchema,
  FulfillmentStateSchema,
  FulfillmentSchema,
  ItemSchema,
};
