import { z } from "zod";

// Firebase data types (adapted from original schema)
export interface FirebaseUser {
  uid: string;
  phoneNumber: string;
  fullName?: string;
  role: "passenger" | "driver";
  isDriverVerified: boolean;
  walletBalance: number; // In cents
  homeAddress?: string;
  officeAddress?: string;
  profileImage?: string;
  createdAt: Date;
}

export interface FirebaseVehicle {
  id: string;
  userId: string;
  model: string;
  plateNumber: string;
  color: string;
  capacity: number;
}

export interface FirebaseRide {
  id: string;
  driverId: string;
  vehicleId: string;
  origin: string;
  destination: string;
  departureTime: Date;
  totalSeats: number;
  availableSeats: number;
  pricePerSeat: number; // In cents
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  createdAt: Date;
  // Populated fields
  driver?: FirebaseUser;
  vehicle?: FirebaseVehicle;
}

export interface FirebaseBooking {
  id: string;
  rideId: string;
  passengerId: string;
  seatsBooked: number;
  totalPrice: number; // In cents
  status: "confirmed" | "cancelled" | "completed";
  bookingTime: Date;
  // Populated fields
  ride?: FirebaseRide;
}

export interface FirebaseRating {
  id: string;
  rideId: string;
  fromUserId: string;
  toUserId: string;
  rating: number; // 1-5
  comment?: string;
  createdAt: Date;
}

// Zod schemas for validation
export const firebaseUserSchema = z.object({
  uid: z.string(),
  phoneNumber: z.string(),
  fullName: z.string().optional(),
  role: z.enum(["passenger", "driver"]),
  isDriverVerified: z.boolean(),
  walletBalance: z.number(),
  homeAddress: z.string().optional(),
  officeAddress: z.string().optional(),
  profileImage: z.string().optional(),
  createdAt: z.date(),
});

export const firebaseVehicleSchema = z.object({
  id: z.string(),
  userId: z.string(),
  model: z.string(),
  plateNumber: z.string(),
  color: z.string(),
  capacity: z.number(),
});

export const firebaseRideSchema = z.object({
  id: z.string(),
  driverId: z.string(),
  vehicleId: z.string(),
  origin: z.string(),
  destination: z.string(),
  departureTime: z.date(),
  totalSeats: z.number(),
  availableSeats: z.number(),
  pricePerSeat: z.number(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]),
  createdAt: z.date(),
});

export const firebaseBookingSchema = z.object({
  id: z.string(),
  rideId: z.string(),
  passengerId: z.string(),
  seatsBooked: z.number(),
  totalPrice: z.number(),
  status: z.enum(["confirmed", "cancelled", "completed"]),
  bookingTime: z.date(),
});

// Request types
export type LoginRequest = { phoneNumber: string };
export type VerifyOtpRequest = { confirmationResult: any; otp: string };
export type UpdateProfileRequest = Partial<Omit<FirebaseUser, 'uid' | 'phoneNumber' | 'createdAt'>>;
export type CreateRideRequest = Omit<FirebaseRide, 'id' | 'createdAt' | 'availableSeats'>;
export type CreateBookingRequest = { rideId: string; seats: number };
export type CreateVehicleRequest = Omit<FirebaseVehicle, 'id'>;