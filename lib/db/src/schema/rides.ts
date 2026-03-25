import { pgTable, text, serial, integer, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ridesTable = pgTable("rides", {
  id: serial("id").primaryKey(),
  driverId: text("driver_id").notNull(),
  driverName: text("driver_name").notNull(),
  driverImage: text("driver_image"),
  driverCompany: text("driver_company"),
  driverJobTitle: text("driver_job_title"),
  startLocation: text("start_location").notNull(),
  destination: text("destination").notNull(),
  departureTime: text("departure_time").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  seatsAvailable: integer("seats_available").notNull().default(1),
  startLat: decimal("start_lat", { precision: 11, scale: 6 }),
  startLng: decimal("start_lng", { precision: 11, scale: 6 }),
  destLat: decimal("dest_lat", { precision: 11, scale: 6 }),
  destLng: decimal("dest_lng", { precision: 11, scale: 6 }),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRideSchema = createInsertSchema(ridesTable).omit({
  id: true,
  createdAt: true,
  status: true,
});

export type InsertRide = z.infer<typeof insertRideSchema>;
export type Ride = typeof ridesTable.$inferSelect;
