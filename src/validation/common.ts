import z from 'zod/v4';

export const GpsSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const LocationInputSchema = z.object({
  tag: z.string(),
  address: z
    .string()
    .min(5, 'Address must be at least 5 characters')
    .max(200, 'Address cannot exceed 200 characters'),
  city: z
    .string()
    .min(2, 'City must be at least 2 characters')
    .max(100, 'City cannot exceed 100 characters')
    .optional(),
  state: z
    .string()
    .min(2, 'State must be at least 2 characters')
    .max(100, 'State cannot exceed 100 characters')
    .optional(),
  country: z
    .string()
    .min(2, 'Country must be at least 2 characters')
    .max(100, 'Country cannot exceed 100 characters')
    .optional(),
  pincode: z.string().optional(),
  gps: GpsSchema.optional(),
});

export const ContactInputSchema = z.object({
  tag: z.string(),
  email: z.email().optional(),
  phoneNumber: z.string().array(),
  website: z.url().array().optional(),
});

// profile requests
export const CreateUserProfileSchema = z.object({
  type: z.enum(['personal', 'client']),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
  location: LocationInputSchema.optional(),
  locationId: z.uuid().optional(),
  locationTag: z.string().optional(),
  contact: ContactInputSchema.optional(),
  contactId: z.uuid().optional(),
  contactTag: z.string().optional(),
});

export const UpdateProfileSchema = z.object({
  profileId: z.uuid(),
  type: z.enum(['personal', 'client']).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const DeleteProfileSchema = z.object({
  profileId: z.uuid(),
});

// location requests
export const UpdateLocationSchema = LocationInputSchema.extend({
  id: z.uuid(),
});

export const DeleteLocationSchema = z.object({
  id: z.uuid(),
});

// contact requests
export const UpdateContactSchema = ContactInputSchema.extend({
  id: z.uuid(),
});

export const DeleteContactSchema = z.object({
  id: z.uuid(),
});

export const ProfilePaginationQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  tag: z.string().optional(),
  type: z.enum(['personal', 'client']).optional(), // only for profiles
  sortBy: z.enum(['createdAt', 'updatedAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const PaginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
});

// profile success response

export const profileTypeEnum = z.enum(['personal', 'client']);

export const locationSchema = z.object({
  id: z.uuid(),
  tag: z.string(),
  userId: z.string(),
  address: z.string(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  pincode: z.string().nullable().optional(),
  gps: GpsSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const contactSchema = z.object({
  id: z.uuid(),
  tag: z.string(),
  userId: z.string(),
  email: z.email().nullable().optional(),
  phoneNumber: z.string().array(),
  website: z.url().array().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const profileSchema = z.object({
  id: z.uuid(),
  userId: z.string(),
  type: profileTypeEnum,
  metadata: z.record(z.string(), z.any()).nullable().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export const FetchUserProfilesResponseSchema = z.object({
  statusCode: z.number().default(200),
  message: z.string(),
  data: profileSchema.array(),
});

export const CreateUserProfileResponseSchema = z.object({
  statusCode: z.number().default(200),
  message: z.string(),
  data: z.object({
    profileId: z.uuid(),
    locationId: z.uuid(),
    contactId: z.uuid(),
  }),
});

export const FetchUserContactsResponseSchema = z.object({
  statusCode: z.number().default(200),
  message: z.string(),
  data: contactSchema.array(),
});

export const CreateContactResponseSchema = z.object({
  statusCode: z.number().default(200),
  message: z.string(),
  data: z.object({
    id: z.uuid(),
  }),
});

export const FetchUserLocationsResponseSchema = z.object({
  statusCode: z.number().default(200),
  message: z.string(),
  data: locationSchema.array(),
});

export const CreateLocationResponseSchema = z.object({
  statusCode: z.number().default(200),
  message: z.string(),
  data: z.object({
    id: z.uuid(),
  }),
});
