import { z } from 'zod';
import { insertUserSchema, insertVehicleSchema, insertRideSchema, insertRatingSchema, users, vehicles, rides, bookings, ratings } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login',
      input: z.object({ phoneNumber: z.string() }),
      responses: {
        200: z.object({ message: z.string(), requireOtp: z.boolean() }),
      },
    },
    verify: {
      method: 'POST' as const,
      path: '/api/auth/verify',
      input: z.object({ phoneNumber: z.string(), otp: z.string() }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout',
      responses: {
        200: z.void(),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/user',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  user: {
    update: {
      method: 'PATCH' as const,
      path: '/api/user',
      input: insertUserSchema.partial(),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
      },
    },
    vehicles: {
      list: {
        method: 'GET' as const,
        path: '/api/user/vehicles',
        responses: {
          200: z.array(z.custom<typeof vehicles.$inferSelect>()),
        },
      },
      create: {
        method: 'POST' as const,
        path: '/api/user/vehicles',
        input: insertVehicleSchema.omit({ userId: true }),
        responses: {
          201: z.custom<typeof vehicles.$inferSelect>(),
        },
      },
    },
  },
  rides: {
    list: {
      method: 'GET' as const,
      path: '/api/rides',
      input: z.object({
        origin: z.string().optional(),
        destination: z.string().optional(),
        date: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof rides.$inferSelect & { driver: typeof users.$inferSelect; vehicle: typeof vehicles.$inferSelect }>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/rides/:id',
      responses: {
        200: z.custom<typeof rides.$inferSelect & { driver: typeof users.$inferSelect; vehicle: typeof vehicles.$inferSelect }>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/rides',
      input: insertRideSchema.omit({ driverId: true }),
      responses: {
        201: z.custom<typeof rides.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/rides/:id/status',
      input: z.object({ status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]) }),
      responses: {
        200: z.custom<typeof rides.$inferSelect>(),
      },
    },
  },
  bookings: {
    list: {
      method: 'GET' as const,
      path: '/api/bookings',
      responses: {
        200: z.array(z.custom<typeof bookings.$inferSelect & { ride: typeof rides.$inferSelect & { driver: typeof users.$inferSelect } }>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/bookings',
      input: z.object({ rideId: z.number(), seats: z.number() }),
      responses: {
        201: z.custom<typeof bookings.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    cancel: {
      method: 'PATCH' as const,
      path: '/api/bookings/:id/cancel',
      responses: {
        200: z.custom<typeof bookings.$inferSelect>(),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
