import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const interestsTable = pgTable("interests", {
  id: serial("id").primaryKey(),
  rideId: integer("ride_id").notNull(),
  passengerId: text("passenger_id").notNull(),
  passengerName: text("passenger_name").notNull(),
  passengerJobTitle: text("passenger_job_title"),
  passengerCompany: text("passenger_company"),
  passengerImage: text("passenger_image"),
  status: text("status").notNull().default("pending"),
  hostWhatsappUrl: text("host_whatsapp_url"),
  passengerWhatsappUrl: text("passenger_whatsapp_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Interest = typeof interestsTable.$inferSelect;
