import { db } from "./db";
import {
  users, vehicles, rides, bookings, ratings,
  type User, type InsertUser, type InsertVehicle, type InsertRide, type InsertBooking, type Ride, type Booking, type Vehicle
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User
  getUser(id: number): Promise<User | undefined>;
  getUserByPhone(phoneNumber: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User>;
  
  // Vehicles
  getUserVehicles(userId: number): Promise<Vehicle[]>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  
  // Rides
  getRides(filters?: { origin?: string; destination?: string; date?: string }): Promise<(Ride & { driver: User; vehicle: Vehicle })[]>;
  getRide(id: number): Promise<(Ride & { driver: User; vehicle: Vehicle }) | undefined>;
  createRide(ride: InsertRide): Promise<Ride>;
  updateRideStatus(id: number, status: string): Promise<Ride>;
  updateRideSeats(id: number, availableSeats: number): Promise<void>;
  
  // Bookings
  getBookings(userId: number): Promise<(Booking & { ride: Ride & { driver: User } })[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBookingStatus(id: number, status: string): Promise<Booking>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByPhone(phoneNumber: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phoneNumber, phoneNumber));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return updated;
  }

  async getUserVehicles(userId: number): Promise<Vehicle[]> {
    return db.select().from(vehicles).where(eq(vehicles.userId, userId));
  }

  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    const [newVehicle] = await db.insert(vehicles).values(vehicle).returning();
    return newVehicle;
  }

  async getRides(filters?: { origin?: string; destination?: string; date?: string }): Promise<(Ride & { driver: User; vehicle: Vehicle })[]> {
    // Basic filter implementation - in production use proper query builder
    const result = await db.query.rides.findMany({
      orderBy: [desc(rides.departureTime)],
      with: {
        driver: true,
        vehicle: true
      }
    });
    
    // Simple in-memory filter for the "lite" version if needed, or refine query above
    // For now returning all for simplicity in demo
    return result;
  }

  async getRide(id: number): Promise<(Ride & { driver: User; vehicle: Vehicle }) | undefined> {
    return db.query.rides.findFirst({
      where: eq(rides.id, id),
      with: {
        driver: true,
        vehicle: true
      }
    });
  }

  async createRide(ride: InsertRide): Promise<Ride> {
    const [newRide] = await db.insert(rides).values({
      ...ride,
      availableSeats: ride.totalSeats // Initial available seats
    }).returning();
    return newRide;
  }

  async updateRideStatus(id: number, status: "scheduled" | "in_progress" | "completed" | "cancelled"): Promise<Ride> {
    const [updated] = await db.update(rides).set({ status }).where(eq(rides.id, id)).returning();
    return updated;
  }

  async updateRideSeats(id: number, availableSeats: number): Promise<void> {
    await db.update(rides).set({ availableSeats }).where(eq(rides.id, id));
  }

  async getBookings(userId: number): Promise<(Booking & { ride: Ride & { driver: User } })[]> {
    return db.query.bookings.findMany({
      where: eq(bookings.passengerId, userId),
      with: {
        ride: {
          with: {
            driver: true
          }
        }
      },
      orderBy: [desc(bookings.bookingTime)]
    });
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await db.insert(bookings).values(booking).returning();
    return newBooking;
  }

  async updateBookingStatus(id: number, status: "confirmed" | "cancelled" | "completed"): Promise<Booking> {
    const [updated] = await db.update(bookings).set({ status }).where(eq(bookings.id, id)).returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
