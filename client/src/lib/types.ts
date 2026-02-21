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
  // New aggregated rating fields for search
  averageRating?: number;
  totalRatings?: number;
}

export interface FirebaseVehicle {
  id: string;
  userId: string;
  model: string;
  plateNumber: string;
  color: string;
  capacity: number;
  type?: 'car' | 'bike';
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
  routePolyline: string; // encoded polyline for efficient storage
  routeSteps: string[]; // step-by-step instructions
  routeRoads: string[]; // main road names
  stops: { lat: number; lng: number }[]; // intermediate stops
  distance: number; // in km
  eta: number; // estimated time in minutes
  originDisplayName?: string; // Shortened display name for origin
  destDisplayName?: string;   // Shortened display name for destination
  // New BlaBlaCar-style fields
  preferences?: {
    smoking: boolean;
    pets: boolean;
    music: boolean;
    ac: boolean;
  };
  vehicleComfort: 'basic' | 'comfort' | 'premium';
  instantBooking: boolean;
  returnTrip?: {
    date: Date;
    time: string;
  };
  driverRating?: number; // aggregated rating
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
  status: "confirmed" | "waiting" | "in_progress" | "completed" | "rated" | "cancelled";
  bookingTime: Date;
  
  // Ride lifecycle timestamps
  activatedAt?: Date;    // When ride date arrived (status → waiting)
  startedAt?: Date;      // When driver started ride (status → in_progress)
  completedAt?: Date;    // When driver marked destination
  confirmedAt?: Date;    // When passenger confirmed completion
  
  // Cancellation tracking
  cancelledAt?: Date;
  cancelReason?: string;
  timeBeforeDeparture?: number; // minutes before departure when cancelled
  cancelledBy?: 'driver' | 'passenger';
  
  // Rating references
  driverRatingId?: string;
  passengerRatingId?: string;
  
  // Rating values
  passengerRating?: number;
  driverRating?: number;
  
  // Populated fields
  ride?: FirebaseRide;
  passenger?: FirebaseUser;
}

export interface FirebaseRating {
  id: string;
  bookingId: string;
  fromUserId: string;
  toUserId: string;
  rating: number; // 1-5
  review?: string;
  categories?: {
    cleanliness?: number;
    behaviour?: number;
    communication?: number;
    punctuality?: number;
  };
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
  unreadCounts: { [userId: string]: number };
}

export interface FirebaseMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'system';
  timestamp: Date;
  readBy: string[]; // user IDs who have read this message
  readAtTimestamps?: { [userId: string]: Date }; // timestamp when each user read the message
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
  // New aggregated rating fields for search
  averageRating: z.number().min(0).max(5).optional(),
  totalRatings: z.number().min(0).optional(),
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
  routePolyline: z.string(),
  routeSteps: z.array(z.string()),
  routeRoads: z.array(z.string()),
  stops: z.array(z.object({ lat: z.number(), lng: z.number() })),
  distance: z.number(),
  eta: z.number(),
  // New BlaBlaCar-style fields
  preferences: z.object({
    smoking: z.boolean(),
    pets: z.boolean(),
    music: z.boolean(),
    ac: z.boolean(),
  }).optional(),
  vehicleComfort: z.enum(['basic', 'comfort', 'premium']),
  instantBooking: z.boolean(),
  returnTrip: z.object({
    date: z.date(),
    time: z.string(),
  }).optional(),
  driverRating: z.number().min(0).max(5).optional(),
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

// Support Ticket System
export interface SupportTicket {
  id: string;
  userId: string;
  issueType: 'account' | 'payment' | 'ride' | 'driver_verification' | 'technical' | 'other';
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: Date;
  updatedAt: Date;
  attachments?: string[]; // URLs to attached files
  notes?: string; // Internal notes from support team
}

export type CreateSupportTicketRequest = Omit<SupportTicket, 'id' | 'userId' | 'status' | 'createdAt' | 'updatedAt' | 'notes'>;

// Route option for multiple route selection
export interface RouteOption {
  polyline: string;
  distance: number; // km
  eta: number; // minutes
  steps: string[]; // step-by-step instructions
  roads: string[]; // main road names
  hasTolls: boolean;
}