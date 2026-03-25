import { Router, type IRouter } from "express";
import { db, ridesTable, bookingsTable, interestsTable, usersTable, rideIgnoresTable } from "@workspace/db";
import { eq, ne, and, inArray } from "drizzle-orm";

const router: IRouter = Router();

function formatRide(r: typeof ridesTable.$inferSelect) {
  return {
    id: r.id,
    driverId: r.driverId,
    driverName: r.driverName,
    driverImage: r.driverImage ?? undefined,
    driverCompany: r.driverCompany ?? undefined,
    driverJobTitle: r.driverJobTitle ?? undefined,
    startLocation: r.startLocation,
    destination: r.destination,
    departureTime: r.departureTime,
    price: Number(r.price),
    seatsAvailable: r.seatsAvailable,
    startLat: r.startLat != null ? Number(r.startLat) : undefined,
    startLng: r.startLng != null ? Number(r.startLng) : undefined,
    destLat: r.destLat != null ? Number(r.destLat) : undefined,
    destLng: r.destLng != null ? Number(r.destLng) : undefined,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  };
}

router.get("/rides", async (req, res) => {
  try {
    const currentUserId = req.isAuthenticated() ? req.user!.id : null;
    const whereClause = currentUserId
      ? and(eq(ridesTable.status, "active"), ne(ridesTable.driverId, currentUserId))
      : eq(ridesTable.status, "active");

    /* Single JOIN query — live names/title/company always from users table */
    const rows = await db.select({
      id:             ridesTable.id,
      driverId:       ridesTable.driverId,
      driverImage:    ridesTable.driverImage,
      startLocation:  ridesTable.startLocation,
      destination:    ridesTable.destination,
      departureTime:  ridesTable.departureTime,
      price:          ridesTable.price,
      seatsAvailable: ridesTable.seatsAvailable,
      startLat:       ridesTable.startLat,
      startLng:       ridesTable.startLng,
      destLat:        ridesTable.destLat,
      destLng:        ridesTable.destLng,
      status:         ridesTable.status,
      createdAt:      ridesTable.createdAt,
      uFirstName:     usersTable.firstName,
      uLastName:      usersTable.lastName,
      uJobTitle:      usersTable.jobTitle,
      uCompany:       usersTable.companyName,
    })
      .from(ridesTable)
      .innerJoin(usersTable, eq(ridesTable.driverId, usersTable.id))
      .where(whereClause)
      .orderBy(ridesTable.createdAt);

    res.json({
      rides: rows.map(r => ({
        id:             r.id,
        driverId:       r.driverId,
        driverName:     [r.uFirstName, r.uLastName].filter(Boolean).join(" ") || "Member",
        driverImage:    r.driverImage ?? undefined,
        driverJobTitle: r.uJobTitle ?? undefined,
        driverCompany:  r.uCompany ?? undefined,
        startLocation:  r.startLocation,
        destination:    r.destination,
        departureTime:  r.departureTime,
        price:          Number(r.price),
        seatsAvailable: r.seatsAvailable,
        startLat: r.startLat != null ? Number(r.startLat) : undefined,
        startLng: r.startLng != null ? Number(r.startLng) : undefined,
        destLat:  r.destLat  != null ? Number(r.destLat)  : undefined,
        destLng:  r.destLng  != null ? Number(r.destLng)  : undefined,
        status:   r.status,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch rides" });
  }
});

/* GET /rides/mine — host sees their own journeys (including cancelled) */
router.get("/rides/mine", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Login required" }); return; }
  try {
    const rides = await db.select().from(ridesTable)
      .where(eq(ridesTable.driverId, req.user!.id))
      .orderBy(ridesTable.createdAt);

    /* Enrich name + designation + company fresh from users table */
    const [freshDriver] = await db
      .select({ firstName: usersTable.firstName, lastName: usersTable.lastName, jobTitle: usersTable.jobTitle, companyName: usersTable.companyName })
      .from(usersTable).where(eq(usersTable.id, req.user!.id)).limit(1);
    const freshName = freshDriver ? [freshDriver.firstName, freshDriver.lastName].filter(Boolean).join(" ") : "";

    res.json({
      rides: rides.map(r => ({
        ...formatRide(r),
        driverName: freshName || r.driverName || "Member",
        driverJobTitle: freshDriver?.jobTitle ?? r.driverJobTitle ?? undefined,
        driverCompany: freshDriver?.companyName ?? r.driverCompany ?? undefined,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch your rides" });
  }
});

router.get("/rides/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ride ID" }); return; }
  try {
    const [ride] = await db.select().from(ridesTable).where(eq(ridesTable.id, id));
    if (!ride) { res.status(404).json({ error: "Ride not found" }); return; }
    res.json(formatRide(ride));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch ride" });
  }
});

router.post("/rides", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "You must be logged in to offer a ride" });
    return;
  }
  const { startLocation, destination, departureTime, price, seatsAvailable,
          startLat, startLng, destLat, destLng } = req.body;
  if (!startLocation || !destination || !departureTime || price === undefined || !seatsAvailable) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }
  try {
    const user = req.user!;
    /* Always fetch fresh user data from DB — session may be missing jobTitle/companyName */
    const [freshUser] = await db.select().from(usersTable).where(eq(usersTable.id, user.id)).limit(1);
    const src = freshUser ?? user as any;
    const driverName =
      [src.firstName, src.lastName].filter(Boolean).join(" ") || src.email || src.username || "Driver";
    const [ride] = await db
      .insert(ridesTable)
      .values({
        driverId: user.id,
        driverName,
        driverImage: src.profileImageUrl ?? src.profileImage ?? null,
        driverCompany: src.companyName ?? null,
        driverJobTitle: src.jobTitle ?? null,
        startLocation,
        destination,
        departureTime,
        price: String(price),
        seatsAvailable: Number(seatsAvailable),
        startLat: startLat != null ? String(startLat) : null,
        startLng: startLng != null ? String(startLng) : null,
        destLat: destLat != null ? String(destLat) : null,
        destLng: destLng != null ? String(destLng) : null,
        status: "active",
      })
      .returning();
    res.status(201).json(formatRide(ride));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create ride" });
  }
});

/* DELETE /rides/:id — host cancels their journey (soft cancel + notify interests) */
router.delete("/rides/:id", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ride ID" }); return; }
  try {
    const [ride] = await db.select().from(ridesTable).where(eq(ridesTable.id, id));
    if (!ride) { res.status(404).json({ error: "Ride not found" }); return; }
    if (ride.driverId !== req.user!.id) {
      res.status(403).json({ error: "You can only cancel your own rides" }); return;
    }
    await db.update(ridesTable).set({ status: "cancelled" }).where(eq(ridesTable.id, id));
    await db.update(interestsTable)
      .set({ status: "cancelled" })
      .where(eq(interestsTable.rideId, id));
    res.json({ success: true, message: "Journey cancelled" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to cancel ride" });
  }
});

router.post("/rides/:id/book", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "You must be logged in to book a ride" });
    return;
  }
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ride ID" }); return; }

  const { pickupDescription, pickupLat, pickupLng } = req.body;
  if (!pickupDescription) {
    res.status(400).json({ error: "Pickup description is required" });
    return;
  }

  try {
    const [ride] = await db.select().from(ridesTable).where(eq(ridesTable.id, id));
    if (!ride) { res.status(404).json({ error: "Ride not found" }); return; }
    if (ride.status === "cancelled") { res.status(400).json({ error: "This journey has been cancelled" }); return; }
    if (ride.seatsAvailable <= 0) {
      res.status(400).json({ error: "No seats available" }); return;
    }

    const user = req.user!;
    const riderName =
      [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "Rider";

    await db
      .update(ridesTable)
      .set({ seatsAvailable: ride.seatsAvailable - 1 })
      .where(eq(ridesTable.id, id));

    const [booking] = await db
      .insert(bookingsTable)
      .values({
        rideId: id,
        riderId: user.id,
        riderName,
        pickupDescription,
        pickupLat: pickupLat != null ? String(pickupLat) : null,
        pickupLng: pickupLng != null ? String(pickupLng) : null,
      })
      .returning();

    const riderCompany = user.companyName || "SyncIn";
    let pickupPin = "";
    if (pickupLat != null && pickupLng != null) {
      pickupPin = `https://www.google.com/maps/search/?api=1&query=${pickupLat},${pickupLng}`;
    } else {
      pickupPin = pickupDescription;
    }
    const waMessage = encodeURIComponent(
      `Hi ${ride.driverName}, I am ${riderName} from ${riderCompany}. I've booked a seat for your ride. Here is my pickup pin: ${pickupPin}`
    );
    const whatsappUrl = `https://wa.me/?text=${waMessage}`;

    res.json({
      success: true,
      bookingId: booking.id,
      driverName: ride.driverName,
      riderName,
      destination: ride.destination,
      pickupLat: pickupLat ?? undefined,
      pickupLng: pickupLng ?? undefined,
      whatsappUrl,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to book ride" });
  }
});

/* GET /rides/ignored — return all ride IDs this user has ignored */
router.get("/rides/ignored", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Login required" }); return; }
  try {
    const rows = await db.select({ rideId: rideIgnoresTable.rideId })
      .from(rideIgnoresTable)
      .where(eq(rideIgnoresTable.userId, req.user!.id));
    res.json({ rideIds: rows.map(r => r.rideId) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch ignored rides" });
  }
});

/* POST /rides/:id/ignore — persist an ignore for this user */
router.post("/rides/:id/ignore", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Login required" }); return; }
  const rideId = Number(req.params.id);
  if (!rideId) { res.status(400).json({ error: "Invalid ride id" }); return; }
  try {
    const existing = await db.select().from(rideIgnoresTable)
      .where(and(eq(rideIgnoresTable.userId, req.user!.id), eq(rideIgnoresTable.rideId, rideId)))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(rideIgnoresTable).values({ userId: req.user!.id, rideId });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to ignore ride" });
  }
});

export default router;
