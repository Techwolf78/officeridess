import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").notNull().unique(),
  fullName: text("full_name"),
  role: text("role", { enum: ["passenger", "driver"] }).default("passenger").notNull(),
  isDriverVerified: boolean("is_driver_verified").default(false),
  walletBalance: integer("wallet_balance").default(0).notNull(), // In cents/smallest currency unit
  homeAddress: text("home_address"),
  officeAddress: text("office_address"),
  profileImage: text("profile_image"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  model: text("model").notNull(),
  plateNumber: text("plate_number").notNull(),
  color: text("color").notNull(),
  capacity: integer("capacity").notNull(),
});

export const rides = pgTable("rides", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").references(() => users.id).notNull(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id).notNull(),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  departureTime: timestamp("departure_time").notNull(),
  totalSeats: integer("total_seats").notNull(),
  availableSeats: integer("available_seats").notNull(),
  pricePerSeat: integer("price_per_seat").notNull(), // In cents
  status: text("status", { enum: ["scheduled", "in_progress", "completed", "cancelled"] }).default("scheduled").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  rideId: integer("ride_id").references(() => rides.id).notNull(),
  passengerId: integer("passenger_id").references(() => users.id).notNull(),
  seatsBooked: integer("seats_booked").notNull(),
  totalPrice: integer("total_price").notNull(), // In cents
  status: text("status", { enum: ["confirmed", "cancelled", "completed"] }).default("confirmed").notNull(),
  bookingTime: timestamp("booking_time").defaultNow(),
});

export const ratings = pgTable("ratings", {
  id: serial("id").primaryKey(),
  rideId: integer("ride_id").references(() => rides.id).notNull(),
  fromUserId: integer("from_user_id").references(() => users.id).notNull(),
  toUserId: integer("to_user_id").references(() => users.id).notNull(),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertVehicleSchema = createInsertSchema(vehicles).omit({ id: true });
export const insertRideSchema = createInsertSchema(rides).omit({ id: true, createdAt: true, availableSeats: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, bookingTime: true });
export const insertRatingSchema = createInsertSchema(ratings).omit({ id: true, createdAt: true });

// === TYPES ===

export type User = typeof users.$inferSelect;
export type Vehicle = typeof vehicles.$inferSelect;
export type Ride = typeof rides.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Rating = typeof ratings.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type InsertRide = z.infer<typeof insertRideSchema>;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type InsertRating = z.infer<typeof insertRatingSchema>;

// Request Types
export type LoginRequest = { phoneNumber: string; otp?: string };
export type CreateRideRequest = InsertRide;
export type CreateBookingRequest = { rideId: number; seats: number };
export type UpdateProfileRequest = Partial<InsertUser>;
