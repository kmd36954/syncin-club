import { pgTable, serial, integer, varchar, timestamp } from "drizzle-orm/pg-core";

export const rideIgnoresTable = pgTable("ride_ignores", {
  id:        serial("id").primaryKey(),
  userId:    varchar("user_id").notNull(),
  rideId:    integer("ride_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RideIgnore = typeof rideIgnoresTable.$inferSelect;
