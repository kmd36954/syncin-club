import { pgTable, serial, text, decimal, timestamp } from "drizzle-orm/pg-core";

export const journeyRequestsTable = pgTable("journey_requests", {
  id: serial("id").primaryKey(),
  passengerId:      text("passenger_id").notNull(),
  passengerName:    text("passenger_name").notNull(),
  passengerJobTitle: text("passenger_job_title"),
  passengerCompany: text("passenger_company"),
  passengerImage:   text("passenger_image"),
  startLocation:    text("start_location").notNull(),
  destination:      text("destination").notNull(),
  startLat: decimal("start_lat", { precision: 11, scale: 6 }),
  startLng: decimal("start_lng", { precision: 11, scale: 6 }),
  destLat:  decimal("dest_lat",  { precision: 11, scale: 6 }),
  destLng:  decimal("dest_lng",  { precision: 11, scale: 6 }),
  notes:     text("notes"),
  /* open | accepted | ignored | counter_offered | counter_accepted | counter_declined */
  status:    text("status").notNull().default("open"),
  acceptedByHostId:   text("accepted_by_host_id"),
  acceptedByHostName: text("accepted_by_host_name"),
  hostWhatsappUrl:     text("host_whatsapp_url"),
  passengerWhatsappUrl: text("passenger_whatsapp_url"),
  /* Counter offer fields — filled when a host sends a counter proposal */
  counterOfferText:    text("counter_offer_text"),
  counterOfferHostId:  text("counter_offer_host_id"),
  counterOfferHostName: text("counter_offer_host_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type JourneyRequest = typeof journeyRequestsTable.$inferSelect;
export type InsertJourneyRequest = typeof journeyRequestsTable.$inferInsert;
