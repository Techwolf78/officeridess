import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import MemoryStore from "memorystore";

const SessionStore = MemoryStore(session);

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: { id: number; phoneNumber: string; role: string };
      session: session.Session & { userId?: number };
    }
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Session setup
  app.use(
    session({
      store: new SessionStore({ checkPeriod: 86400000 }),
      secret: process.env.SESSION_SECRET || "default_secret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: app.get("env") === "production" },
    })
  );

  // Auth Middleware
  const isAuthenticated = async (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "User not found" });
    }
    req.user = user;
    next();
  };

  // === AUTH ===
  
  app.post(api.auth.login.path, async (req, res) => {
    const { phoneNumber } = api.auth.login.input.parse(req.body);
    // In a real app, send OTP here.
    // For demo: verify if user exists or not, but always say "OTP sent"
    res.json({ message: "OTP sent", requireOtp: true });
  });

  app.post(api.auth.verify.path, async (req, res) => {
    const { phoneNumber, otp } = api.auth.verify.input.parse(req.body);
    
    // Dummy OTP check
    if (otp !== "1234") {
      return res.status(401).json({ message: "Invalid OTP" });
    }

    let user = await storage.getUserByPhone(phoneNumber);
    if (!user) {
      user = await storage.createUser({
        phoneNumber,
        role: "passenger",
        walletBalance: 10000, // $100.00 start
        fullName: "New User",
        isDriverVerified: false
      });
    }

    req.session.userId = user.id;
    res.json(user);
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get(api.auth.me.path, isAuthenticated, (req, res) => {
    res.json(req.user);
  });

  // === USER ===

  app.patch(api.user.update.path, isAuthenticated, async (req, res) => {
    const input = api.user.update.input.parse(req.body);
    const updated = await storage.updateUser(req.user!.id, input);
    res.json(updated);
  });

  app.get(api.user.vehicles.list.path, isAuthenticated, async (req, res) => {
    const vehicles = await storage.getUserVehicles(req.user!.id);
    res.json(vehicles);
  });

  app.post(api.user.vehicles.create.path, isAuthenticated, async (req, res) => {
    const input = api.user.vehicles.create.input.parse(req.body);
    const vehicle = await storage.createVehicle({ ...input, userId: req.user!.id });
    res.status(201).json(vehicle);
  });

  // === RIDES ===

  app.get(api.rides.list.path, async (req, res) => {
    const rides = await storage.getRides(req.query as any);
    res.json(rides);
  });

  app.post(api.rides.create.path, isAuthenticated, async (req, res) => {
    const input = api.rides.create.input.parse(req.body);
    
    // Ensure user is verified driver? For demo, we might skip strict verification
    // but let's check if they have a vehicle
    const vehicle = (await storage.getUserVehicles(req.user!.id)).find(v => v.id === input.vehicleId);
    if (!vehicle) {
      return res.status(400).json({ message: "Vehicle not found or not owned by user" });
    }

    const ride = await storage.createRide({ ...input, driverId: req.user!.id, availableSeats: input.totalSeats });
    res.status(201).json(ride);
  });

  app.get(api.rides.get.path, async (req, res) => {
    const ride = await storage.getRide(Number(req.params.id));
    if (!ride) return res.status(404).json({ message: "Ride not found" });
    res.json(ride);
  });

  app.patch(api.rides.updateStatus.path, isAuthenticated, async (req, res) => {
    const { status } = api.rides.updateStatus.input.parse(req.body);
    const ride = await storage.getRide(Number(req.params.id));
    if (!ride || ride.driverId !== req.user!.id) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const updated = await storage.updateRideStatus(ride.id, status as any);
    res.json(updated);
  });

  // === BOOKINGS ===

  app.get(api.bookings.list.path, isAuthenticated, async (req, res) => {
    const bookings = await storage.getBookings(req.user!.id);
    res.json(bookings);
  });

  app.post(api.bookings.create.path, isAuthenticated, async (req, res) => {
    const input = api.bookings.create.input.parse(req.body);
    const ride = await storage.getRide(input.rideId);
    
    if (!ride) return res.status(404).json({ message: "Ride not found" });
    if (ride.availableSeats < input.seats) {
      return res.status(400).json({ message: "Not enough seats available" });
    }

    const totalPrice = ride.pricePerSeat * input.seats;
    
    // Check wallet
    if (req.user!.walletBalance < totalPrice) {
      return res.status(400).json({ message: "Insufficient wallet balance" });
    }

    // Deduct from wallet
    await storage.updateUser(req.user!.id, { walletBalance: req.user!.walletBalance - totalPrice });
    
    // Create booking
    const booking = await storage.createBooking({
      rideId: ride.id,
      passengerId: req.user!.id,
      seatsBooked: input.seats,
      totalPrice,
      status: "confirmed"
    });

    // Update ride seats
    await storage.updateRideSeats(ride.id, ride.availableSeats - input.seats);

    res.status(201).json(booking);
  });

  app.patch(api.bookings.cancel.path, isAuthenticated, async (req, res) => {
    // Implement cancellation logic (refunds etc.)
    // For demo, just update status
    const bookingId = Number(req.params.id);
    const updated = await storage.updateBookingStatus(bookingId, "cancelled");
    res.json(updated);
  });

  // Seed Data
  seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existingUsers = await storage.getUserByPhone("555-0100");
  if (!existingUsers) {
    // Driver
    const driver = await storage.createUser({
      phoneNumber: "555-0100",
      fullName: "Alice Driver",
      role: "driver",
      isDriverVerified: true,
      walletBalance: 5000,
      officeAddress: "Tech Park, Building A",
      homeAddress: "Suburban Heights"
    });
    
    const vehicle = await storage.createVehicle({
      userId: driver.id,
      model: "Toyota Prius",
      plateNumber: "ECO-2024",
      color: "White",
      capacity: 4
    });

    // Ride
    await storage.createRide({
      driverId: driver.id,
      vehicleId: vehicle.id,
      origin: "Suburban Heights",
      destination: "Tech Park",
      departureTime: new Date(Date.now() + 86400000), // Tomorrow
      totalSeats: 3,
      pricePerSeat: 500, // $5.00
    });
  }
}
