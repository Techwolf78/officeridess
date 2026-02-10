import { z } from "zod";

// Firebase data types (adapted from original schema)
export interface FirebaseUser {
  uid: string;
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  gender?: "male" | "female" | "other";
  role: "passenger" | "driver";
  isDriverVerified: boolean;
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
  pricePerSeat: number;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  createdAt: Date;
  // New location fields
  originLatLng: { lat: number; lng: number };
  destLatLng: { lat: number; lng: number };
  route: { lat: number; lng: number }[]; // waypoints for the route
  stops: { lat: number; lng: number }[]; // intermediate stops
  distance: number; // in km
  eta: number; // estimated time in minutes
  // Populated fields
  driver?: FirebaseUser;
  vehicle?: FirebaseVehicle;
}

export interface FirebaseBooking {
  id: string;
  rideId: string;
  passengerId: string;
  seatsBooked: number;
  totalPrice: number;
  status: "confirmed" | "cancelled" | "completed";
  bookingTime: Date;
  // Cancellation tracking
  cancelledAt?: Date;
  cancelReason?: string;
  timeBeforeDeparture?: number; // minutes before departure when cancelled
  // Populated fields
  ride?: FirebaseRide;
  passenger?: FirebaseUser;
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

// Chat system types
export interface FirebaseChat {
  id: string;
  rideId: string;
  participants: string[]; // [driverId, passengerId]
  createdAt: Date;
  lastMessageAt: Date;
  lastMessage?: string;
  unreadCount: { [userId: string]: number };
}

export interface FirebaseMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'system';
  timestamp: Date;
  readBy: string[]; // user IDs who have read this message
}

// Zod schemas for validation
export const firebaseUserSchema = z.object({
  uid: z.string(),
  phoneNumber: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  role: z.enum(["passenger", "driver"]),
  isDriverVerified: z.boolean(),
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
  pricePerSeat: z.number().min(0, "Price must be positive"),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]),
  createdAt: z.date(),
  // New location fields
  originLatLng: z.object({ lat: z.number(), lng: z.number() }),
  destLatLng: z.object({ lat: z.number(), lng: z.number() }),
  route: z.array(z.object({ lat: z.number(), lng: z.number() })),
  stops: z.array(z.object({ lat: z.number(), lng: z.number() })),
  distance: z.number(),
  eta: z.number(),
});

export const firebaseBookingSchema = z.object({
  id: z.string(),
  rideId: z.string(),
  passengerId: z.string(),
  seatsBooked: z.number(),
  totalPrice: z.number().min(0),
  status: z.enum(["confirmed", "cancelled", "completed"]),
  bookingTime: z.date(),
});

// Chat system schemas
export const firebaseChatSchema = z.object({
  id: z.string(),
  rideId: z.string(),
  participants: z.array(z.string()),
  createdAt: z.date(),
  lastMessageAt: z.date(),
  lastMessage: z.string().optional(),
  unreadCount: z.record(z.string(), z.number()),
});

export const firebaseMessageSchema = z.object({
  id: z.string(),
  chatId: z.string(),
  senderId: z.string(),
  content: z.string(),
  type: z.enum(['text', 'image', 'system']),
  timestamp: z.date(),
  readBy: z.array(z.string()),
});

// Request types
export type LoginRequest = { phoneNumber: string };
export type VerifyOtpRequest = { confirmationResult: any; otp: string };
export type UpdateProfileRequest = Partial<Omit<FirebaseUser, 'uid' | 'phoneNumber' | 'createdAt'>>;
export type CreateRideRequest = Omit<FirebaseRide, 'id' | 'createdAt' | 'availableSeats' | 'driver' | 'vehicle'>;
export type CreateBookingRequest = { rideId: string; seats: number };
export type CancelBookingRequest = { bookingId: string; reason: string };
export type CreateVehicleRequest = Omit<FirebaseVehicle, 'id'>;
export type CreateChatRequest = { rideId: string; participants: string[] };
export type SendMessageRequest = { chatId: string; content: string; type?: 'text' | 'image' | 'system' };
export type MarkMessagesReadRequest = { chatId: string; messageIds: string[] };