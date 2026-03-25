import { Router, type IRouter } from "express";
import { db, interestsTable, ridesTable, usersTable } from "@workspace/db";
import { eq, and, inArray, ne } from "drizzle-orm";

const router: IRouter = Router();

/* POST /rides/:id/interest — passenger expresses interest */
router.post("/rides/:id/interest", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Login required" }); return; }
  const rideId = Number(req.params.id);
  if (isNaN(rideId)) { res.status(400).json({ error: "Invalid ride ID" }); return; }

  try {
    const [ride] = await db.select().from(ridesTable).where(eq(ridesTable.id, rideId));
    if (!ride) { res.status(404).json({ error: "Ride not found" }); return; }
    if (ride.status === "cancelled") { res.status(400).json({ error: "This journey has been cancelled" }); return; }
    if (ride.seatsAvailable <= 0) { res.status(400).json({ error: "No seats available" }); return; }

    const user = req.user!;
    if (ride.driverId === user.id) {
      res.status(400).json({ error: "You cannot express interest in your own journey" }); return;
    }

    const existing = await db.select().from(interestsTable)
      .where(and(eq(interestsTable.rideId, rideId), eq(interestsTable.passengerId, user.id)));
    if (existing.length > 0) {
      res.status(400).json({ error: "You have already expressed interest in this journey" }); return;
    }

    /* Always fetch fresh user data from DB — session may be missing jobTitle/companyName */
    const [freshUser] = await db.select().from(usersTable).where(eq(usersTable.id, user.id)).limit(1);
    const src = freshUser ?? user as any;
    const passengerName =
      [src.firstName, src.lastName].filter(Boolean).join(" ") || src.email || src.username || "Passenger";

    const [interest] = await db.insert(interestsTable).values({
      rideId,
      passengerId: user.id,
      passengerName,
      passengerJobTitle: src.jobTitle ?? null,
      passengerCompany: src.companyName ?? null,
      passengerImage: src.profileImageUrl ?? src.profileImage ?? null,
      status: "pending",
    }).returning();

    res.status(201).json({ success: true, interestId: interest.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save interest" });
  }
});

/* GET /interests/incoming — host sees requests for their journeys */
router.get("/interests/incoming", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Login required" }); return; }
  try {
    const userId = req.user!.id;
    const myRides = await db
      .select({ id: ridesTable.id, startLocation: ridesTable.startLocation, destination: ridesTable.destination, status: ridesTable.status })
      .from(ridesTable).where(eq(ridesTable.driverId, userId));

    if (myRides.length === 0) { res.json({ interests: [], myRides: [] }); return; }

    const rideMap = Object.fromEntries(myRides.map(r => [r.id, r]));
    const rideIds = myRides.map(r => r.id);

    const allInterests = await Promise.all(
      rideIds.map(id => db.select().from(interestsTable).where(eq(interestsTable.rideId, id)))
    );
    const flat = allInterests.flat().filter(i => i.status === "pending");

    /* Enrich name + designation + company fresh from users table */
    const passengerIds = [...new Set(flat.map(i => i.passengerId))];
    const passengers = passengerIds.length > 0
      ? await db.select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName, jobTitle: usersTable.jobTitle, companyName: usersTable.companyName })
          .from(usersTable).where(inArray(usersTable.id, passengerIds))
      : [];
    const pMap = new Map(passengers.map(p => [p.id, p]));

    res.json({
      interests: flat.map(i => {
        const p = pMap.get(i.passengerId);
        const freshName = p ? [p.firstName, p.lastName].filter(Boolean).join(" ") : "";
        return {
          id: i.id,
          rideId: i.rideId,
          startLocation: rideMap[i.rideId]?.startLocation ?? "",
          destination: rideMap[i.rideId]?.destination ?? "",
          passengerId: i.passengerId,
          passengerName: freshName || i.passengerName || "Member",
          passengerJobTitle: p?.jobTitle ?? i.passengerJobTitle ?? undefined,
          passengerCompany: p?.companyName ?? i.passengerCompany ?? undefined,
          passengerImage: i.passengerImage ?? undefined,
          status: i.status,
          createdAt: i.createdAt.toISOString(),
        };
      }),
      myRides: myRides.map(r => ({
        id: r.id,
        startLocation: r.startLocation,
        destination: r.destination,
        status: r.status,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

/* GET /interests/outgoing — passenger sees their own interest requests + statuses */
router.get("/interests/outgoing", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Login required" }); return; }
  try {
    const userId = req.user!.id;
    const myInterests = await db.select().from(interestsTable)
      .where(and(eq(interestsTable.passengerId, userId), ne(interestsTable.status, "cancelled")));

    if (myInterests.length === 0) { res.json({ interests: [] }); return; }

    const rideIds = [...new Set(myInterests.map(i => i.rideId))];
    const rides = await Promise.all(
      rideIds.map(id => db.select().from(ridesTable).where(eq(ridesTable.id, id)).limit(1).then(r => r[0]))
    );
    const rideMap = Object.fromEntries(rides.filter(Boolean).map(r => [r.id, r]));

    const hostIds = [...new Set(Object.values(rideMap).map((r: any) => r.driverId))];
    const hosts = await Promise.all(
      hostIds.map(id => db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1).then(r => r[0]))
    );
    const hostMap = Object.fromEntries(hosts.filter(Boolean).map(h => [h.id, h]));

    res.json({
      interests: myInterests.map(i => {
        const ride = rideMap[i.rideId];
        const host = ride ? hostMap[ride.driverId] : null;
        const hostName = host ? [host.firstName, host.lastName].filter(Boolean).join(" ") || "Member" : "Member";

        return {
          id: i.id,
          rideId: i.rideId,
          startLocation: ride?.startLocation ?? "",
          destination: ride?.destination ?? "",
          hostId: ride?.driverId ?? undefined,
          hostName,
          hostJobTitle: host?.jobTitle ?? undefined,
          hostCompany: host?.companyName ?? undefined,
          status: i.status,
          whatsappUrl: i.passengerWhatsappUrl ?? undefined,
          createdAt: i.createdAt.toISOString(),
        };
      }),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch outgoing interests" });
  }
});

/* PATCH /interests/:id — host accepts or ignores a request */
router.patch("/interests/:id", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Login required" }); return; }
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const { status } = req.body;
  if (!["connected", "dismissed"].includes(status)) {
    res.status(400).json({ error: "Invalid status" }); return;
  }

  try {
    const [interest] = await db.select().from(interestsTable).where(eq(interestsTable.id, id));
    if (!interest) { res.status(404).json({ error: "Not found" }); return; }

    const [ride] = await db.select().from(ridesTable).where(eq(ridesTable.id, interest.rideId));
    if (!ride || ride.driverId !== req.user!.id) {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    const hostName = [req.user!.firstName, req.user!.lastName].filter(Boolean).join(" ") || req.user!.username || "Host";

    let hostWhatsappUrl: string | undefined;
    let passengerWhatsappUrl: string | undefined;

    if (status === "connected") {
      /* Look up both parties' mobile numbers for direct WhatsApp links */
      const [hostRow]      = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id)).limit(1);
      const [passengerRow] = await db.select().from(usersTable).where(eq(usersTable.id, interest.passengerId)).limit(1);

      const hostPhone      = (hostRow?.mobileNumber      ?? "").replace(/[\s\-()]/g, "");
      const passengerPhone = (passengerRow?.mobileNumber ?? "").replace(/[\s\-()]/g, "");

      const msg = encodeURIComponent("Hi, I am your SyncIn Club partner. Let\u2019s coordinate our journey!");
      hostWhatsappUrl      = passengerPhone ? `https://wa.me/${passengerPhone}?text=${msg}` : `https://wa.me/?text=${msg}`;
      passengerWhatsappUrl = hostPhone      ? `https://wa.me/${hostPhone}?text=${msg}`      : `https://wa.me/?text=${msg}`;
    }

    await db.update(interestsTable).set({
      status,
      ...(status === "connected" ? { hostWhatsappUrl, passengerWhatsappUrl } : {}),
    }).where(eq(interestsTable.id, id));

    res.json({ success: true, whatsappUrl: hostWhatsappUrl, partnerName: interest.passengerName });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update interest" });
  }
});

/* DELETE /interests/:id — co-traveler withdraws their interest */
router.delete("/interests/:id", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Login required" }); return; }
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  try {
    const [interest] = await db.select().from(interestsTable).where(eq(interestsTable.id, id));
    if (!interest) { res.status(404).json({ error: "Not found" }); return; }
    if (interest.passengerId !== req.user!.id) {
      res.status(403).json({ error: "You can only cancel your own requests" }); return;
    }

    await db.update(interestsTable)
      .set({ status: "cancelled" })
      .where(eq(interestsTable.id, id));

    res.json({ success: true, message: "Request cancelled" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to cancel request" });
  }
});

/* GET /co-travelers — all past journey mates for the current user */
router.get("/co-travelers", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Login required" }); return; }
  const userId = req.user!.id;

  try {
    const coTravelers: {
      id: string; name: string; jobTitle?: string; company?: string;
      image?: string; route: string; connectedAt: string; role: string;
    }[] = [];

    const myRides = await db.select().from(ridesTable).where(eq(ridesTable.driverId, userId));
    const myRideIds = myRides.map(r => r.id);

    if (myRideIds.length > 0) {
      const accepted = await db.select().from(interestsTable)
        .where(and(inArray(interestsTable.rideId, myRideIds), eq(interestsTable.status, "connected")));

      /* Enrich passenger names fresh from users table */
      const passengerIds = [...new Set(accepted.map(p => p.passengerId))];
      const passengers = passengerIds.length > 0
        ? await db.select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName })
            .from(usersTable).where(inArray(usersTable.id, passengerIds))
        : [];
      const pMap = new Map(passengers.map(p => [p.id, p]));

      for (const p of accepted) {
        const ride = myRides.find(r => r.id === p.rideId);
        const pu = pMap.get(p.passengerId);
        const freshName = pu ? [pu.firstName, pu.lastName].filter(Boolean).join(" ") : "";
        coTravelers.push({
          id: `pass-${p.id}`,
          name: freshName || p.passengerName || "Member",
          jobTitle: p.passengerJobTitle ?? undefined,
          company: p.passengerCompany ?? undefined,
          image: p.passengerImage ?? undefined,
          route: ride ? `${ride.startLocation} → ${ride.destination}` : "",
          connectedAt: p.createdAt.toISOString(),
          role: "passenger",
        });
      }
    }

    const myInterests = await db.select().from(interestsTable)
      .where(and(eq(interestsTable.passengerId, userId), eq(interestsTable.status, "connected")));

    if (myInterests.length > 0) {
      const rideIds = [...new Set(myInterests.map(i => i.rideId))];
      const rides = await Promise.all(
        rideIds.map(id => db.select().from(ridesTable).where(eq(ridesTable.id, id)).limit(1).then(r => r[0]))
      );
      const rideMap = Object.fromEntries(rides.filter(Boolean).map(r => [r.id, r]));

      /* Enrich host names fresh from users table */
      const hostIds = [...new Set(Object.values(rideMap).map((r: any) => r.driverId))];
      const hosts = hostIds.length > 0
        ? await db.select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName })
            .from(usersTable).where(inArray(usersTable.id, hostIds))
        : [];
      const hMap = new Map(hosts.map(h => [h.id, h]));

      for (const i of myInterests) {
        const ride = rideMap[i.rideId];
        if (ride) {
          const h = hMap.get((ride as any).driverId);
          const freshHostName = h ? [h.firstName, h.lastName].filter(Boolean).join(" ") : "";
          coTravelers.push({
            id: `host-${i.id}`,
            name: freshHostName || (ride as any).driverName || "Member",
            jobTitle: (ride as any).driverJobTitle ?? undefined,
            company: (ride as any).driverCompany ?? undefined,
            image: (ride as any).driverImage ?? undefined,
            route: `${(ride as any).startLocation} → ${(ride as any).destination}`,
            connectedAt: i.createdAt.toISOString(),
            role: "host",
          });
        }
      }
    }

    coTravelers.sort((a, b) => new Date(b.connectedAt).getTime() - new Date(a.connectedAt).getTime());
    res.json({ coTravelers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch co-travelers" });
  }
});

export default router;
