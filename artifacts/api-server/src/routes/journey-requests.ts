import { Router, type IRouter } from "express";
import { db, journeyRequestsTable, usersTable } from "@workspace/db";
import { eq, ne, desc, and, inArray, isNull, or } from "drizzle-orm";

const router: IRouter = Router();

/* ── helpers ──────────────────────────────────────────────── */
async function buildWhatsappUrls(hostId: string, passengerId: string) {
  const [hostRow]      = await db.select().from(usersTable).where(eq(usersTable.id, hostId)).limit(1);
  const [passengerRow] = await db.select().from(usersTable).where(eq(usersTable.id, passengerId)).limit(1);
  const clean = (n: string | null | undefined) => (n ?? "").replace(/[\s\-()]/g, "");
  const msg   = encodeURIComponent("Hi, I am your SyncIn Club partner. Let\u2019s coordinate our journey!");
  const hostPhone      = clean(hostRow?.mobileNumber);
  const passengerPhone = clean(passengerRow?.mobileNumber);
  return {
    hostWhatsappUrl:      passengerPhone ? `https://wa.me/${passengerPhone}?text=${msg}` : `https://wa.me/?text=${msg}`,
    passengerWhatsappUrl: hostPhone      ? `https://wa.me/${hostPhone}?text=${msg}`      : `https://wa.me/?text=${msg}`,
  };
}

/* ── POST /journey-requests — passenger broadcasts a request ── */
router.post("/journey-requests", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Login required" }); return; }
  const { startLocation, destination, startLat, startLng, destLat, destLng, notes } = req.body;
  if (!startLocation || !destination) {
    res.status(400).json({ error: "Start and destination required" }); return;
  }
  const u = req.user!;
  try {
    /* Always fetch fresh user data from DB — session may be missing jobTitle/companyName */
    const [freshUser] = await db.select().from(usersTable).where(eq(usersTable.id, u.id)).limit(1);
    const src = freshUser ?? u as any;
    const passengerName = [src.firstName, src.lastName].filter(Boolean).join(" ") || src.email || src.username || "Member";
    const [row] = await db.insert(journeyRequestsTable).values({
      passengerId:      u.id,
      passengerName,
      passengerJobTitle: src.jobTitle   ?? null,
      passengerCompany:  src.companyName ?? null,
      passengerImage:    src.profileImageUrl ?? src.profileImage ?? null,
      startLocation:     String(startLocation).trim(),
      destination:       String(destination).trim(),
      startLat:  startLat  ?? null,
      startLng:  startLng  ?? null,
      destLat:   destLat   ?? null,
      destLng:   destLng   ?? null,
      notes:     notes     ?? null,
      status: "open",
    }).returning();
    res.json({ request: row });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to post request" });
  }
});

/* ── GET /journey-requests — open requests from other passengers (visible to hosts) ── */
router.get("/journey-requests", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Login required" }); return; }
  try {
    const currentUserId = req.user!.id;

    /* Single JOIN query — live names/title/company always from users table,
       excludes current user's own requests (passenger_id != currentUserId) */
    const rows = await db.select({
      id:                   journeyRequestsTable.id,
      passengerId:          journeyRequestsTable.passengerId,
      passengerImage:       journeyRequestsTable.passengerImage,
      startLocation:        journeyRequestsTable.startLocation,
      destination:          journeyRequestsTable.destination,
      startLat:             journeyRequestsTable.startLat,
      startLng:             journeyRequestsTable.startLng,
      destLat:              journeyRequestsTable.destLat,
      destLng:              journeyRequestsTable.destLng,
      notes:                journeyRequestsTable.notes,
      status:               journeyRequestsTable.status,
      acceptedByHostId:     journeyRequestsTable.acceptedByHostId,
      acceptedByHostName:   journeyRequestsTable.acceptedByHostName,
      hostWhatsappUrl:      journeyRequestsTable.hostWhatsappUrl,
      passengerWhatsappUrl: journeyRequestsTable.passengerWhatsappUrl,
      counterOfferText:     journeyRequestsTable.counterOfferText,
      counterOfferHostId:   journeyRequestsTable.counterOfferHostId,
      counterOfferHostName: journeyRequestsTable.counterOfferHostName,
      createdAt:            journeyRequestsTable.createdAt,
      pFirstName:           usersTable.firstName,
      pLastName:            usersTable.lastName,
      pJobTitle:            usersTable.jobTitle,
      pCompany:             usersTable.companyName,
    })
      .from(journeyRequestsTable)
      .innerJoin(usersTable, eq(journeyRequestsTable.passengerId, usersTable.id))
      .where(
        and(
          eq(journeyRequestsTable.status, "open"),
          ne(journeyRequestsTable.passengerId, currentUserId),
          or(
            isNull(journeyRequestsTable.acceptedByHostId),
            ne(journeyRequestsTable.acceptedByHostId, currentUserId),
          ),
        )
      )
      .orderBy(desc(journeyRequestsTable.createdAt));

    res.json({
      requests: rows.map(r => ({
        id:                   r.id,
        passengerId:          r.passengerId,
        passengerName:        [r.pFirstName, r.pLastName].filter(Boolean).join(" ") || "Member",
        passengerJobTitle:    r.pJobTitle ?? undefined,
        passengerCompany:     r.pCompany ?? undefined,
        passengerImage:       r.passengerImage ?? undefined,
        startLocation:        r.startLocation,
        destination:          r.destination,
        startLat:   r.startLat != null ? Number(r.startLat) : undefined,
        startLng:   r.startLng != null ? Number(r.startLng) : undefined,
        destLat:    r.destLat  != null ? Number(r.destLat)  : undefined,
        destLng:    r.destLng  != null ? Number(r.destLng)  : undefined,
        notes:                r.notes ?? undefined,
        status:               r.status,
        acceptedByHostId:     r.acceptedByHostId ?? undefined,
        acceptedByHostName:   r.acceptedByHostName ?? undefined,
        hostWhatsappUrl:      r.hostWhatsappUrl ?? undefined,
        passengerWhatsappUrl: r.passengerWhatsappUrl ?? undefined,
        counterOfferText:     r.counterOfferText ?? undefined,
        counterOfferHostId:   r.counterOfferHostId ?? undefined,
        counterOfferHostName: r.counterOfferHostName ?? undefined,
        createdAt:            r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});

/* ── GET /journey-requests/mine — passenger's own requests (all statuses) ── */
router.get("/journey-requests/mine", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Login required" }); return; }
  try {
    const rows = await db.select().from(journeyRequestsTable)
      .where(eq(journeyRequestsTable.passengerId, req.user!.id))
      .orderBy(desc(journeyRequestsTable.createdAt));

    /* Enrich host names from users table (counterOfferHostId / acceptedByHostId) */
    const hostIds = [...new Set(
      rows.flatMap(r => [r.counterOfferHostId, r.acceptedByHostId].filter(Boolean) as string[])
    )];
    const hosts = hostIds.length > 0
      ? await db.select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName })
          .from(usersTable).where(inArray(usersTable.id, hostIds))
      : [];
    const hMap = new Map(hosts.map(h => [h.id, h]));
    const enriched = rows.map(r => {
      const hostId = r.counterOfferHostId || r.acceptedByHostId;
      const h = hostId ? hMap.get(hostId) : undefined;
      const freshHostName = h ? [h.firstName, h.lastName].filter(Boolean).join(" ") : "";
      return {
        ...r,
        counterOfferHostName: freshHostName || r.counterOfferHostName || "Member",
        acceptedByHostName:   freshHostName || r.acceptedByHostName  || "Member",
      };
    });
    res.json({ requests: enriched });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch your requests" });
  }
});

/* ── GET /journey-requests/my-counter-offers — pending counter offers made by this host ── */
router.get("/journey-requests/my-counter-offers", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Login required" }); return; }
  try {
    const rows = await db.select().from(journeyRequestsTable)
      .where(
        and(
          eq(journeyRequestsTable.counterOfferHostId, req.user!.id),
          eq(journeyRequestsTable.status, "counter_offered")
        )
      )
      .orderBy(desc(journeyRequestsTable.createdAt));

    /* Enrich passenger name + designation + company fresh from users table */
    const pIds = [...new Set(rows.map(r => r.passengerId))];
    const passengers = pIds.length > 0
      ? await db.select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName, jobTitle: usersTable.jobTitle, companyName: usersTable.companyName })
          .from(usersTable).where(inArray(usersTable.id, pIds))
      : [];
    const pMap = new Map(passengers.map(p => [p.id, p]));
    const enriched = rows.map(r => {
      const p = pMap.get(r.passengerId);
      const freshName = p ? [p.firstName, p.lastName].filter(Boolean).join(" ") : "";
      return {
        ...r,
        passengerName: freshName || r.passengerName || "Member",
        passengerJobTitle: p?.jobTitle ?? r.passengerJobTitle ?? undefined,
        passengerCompany: p?.companyName ?? r.passengerCompany ?? undefined,
      };
    });
    res.json({ requests: enriched });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch counter offers" });
  }
});

/* ── PATCH /journey-requests/:id — host or passenger updates status ── */
router.patch("/journey-requests/:id", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Login required" }); return; }
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const { status, counterOfferText } = req.body;
  const validStatuses = ["accepted", "ignored", "counter_offered", "counter_accepted", "counter_declined"];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: "Invalid status" }); return;
  }

  try {
    const [request] = await db.select().from(journeyRequestsTable)
      .where(eq(journeyRequestsTable.id, id)).limit(1);
    if (!request) { res.status(404).json({ error: "Request not found" }); return; }

    const actor = req.user!;
    const actorName = [actor.firstName, actor.lastName].filter(Boolean).join(" ") || actor.username || "Member";

    /* ── HOST ACTIONS: accepted | ignored | counter_offered ── */
    if (status === "accepted" || status === "ignored" || status === "counter_offered") {
      /* Must not be the passenger acting as a host on their own request */
      if (actor.id === request.passengerId) {
        res.status(403).json({ error: "Cannot act as host on your own request" }); return;
      }
      if (!["open", "counter_declined"].includes(request.status)) {
        res.status(409).json({ error: "Request already processed" }); return;
      }

      if (status === "accepted") {
        const urls = await buildWhatsappUrls(actor.id, request.passengerId);
        await db.update(journeyRequestsTable).set({
          status: "accepted",
          acceptedByHostId:   actor.id,
          acceptedByHostName: actorName,
          hostWhatsappUrl:      urls.hostWhatsappUrl,
          passengerWhatsappUrl: urls.passengerWhatsappUrl,
        }).where(eq(journeyRequestsTable.id, id));
        res.json({ success: true, whatsappUrl: urls.hostWhatsappUrl, partnerName: request.passengerName });
        return;
      }

      if (status === "ignored") {
        await db.update(journeyRequestsTable).set({ status: "ignored" })
          .where(eq(journeyRequestsTable.id, id));
        res.json({ success: true });
        return;
      }

      if (status === "counter_offered") {
        if (!counterOfferText?.trim()) {
          res.status(400).json({ error: "Counter offer text is required" }); return;
        }
        await db.update(journeyRequestsTable).set({
          status:              "counter_offered",
          counterOfferText:    String(counterOfferText).trim(),
          counterOfferHostId:  actor.id,
          counterOfferHostName: actorName,
        }).where(eq(journeyRequestsTable.id, id));
        res.json({ success: true });
        return;
      }
    }

    /* ── PASSENGER ACTIONS: counter_accepted | counter_declined ── */
    if (status === "counter_accepted" || status === "counter_declined") {
      if (actor.id !== request.passengerId) {
        res.status(403).json({ error: "Only the passenger can respond to a counter offer" }); return;
      }
      if (request.status !== "counter_offered") {
        res.status(409).json({ error: "No pending counter offer on this request" }); return;
      }

      if (status === "counter_accepted") {
        const hostId = request.counterOfferHostId!;
        const urls   = await buildWhatsappUrls(hostId, actor.id);
        await db.update(journeyRequestsTable).set({
          status:             "accepted",
          acceptedByHostId:   hostId,
          acceptedByHostName: request.counterOfferHostName,
          hostWhatsappUrl:      urls.hostWhatsappUrl,
          passengerWhatsappUrl: urls.passengerWhatsappUrl,
        }).where(eq(journeyRequestsTable.id, id));
        res.json({ success: true, whatsappUrl: urls.passengerWhatsappUrl, partnerName: request.counterOfferHostName });
        return;
      }

      if (status === "counter_declined") {
        /* Passenger declines → request reopens so other hosts can respond */
        await db.update(journeyRequestsTable).set({
          status:              "open",
          counterOfferText:    null,
          counterOfferHostId:  null,
          counterOfferHostName: null,
        }).where(eq(journeyRequestsTable.id, id));
        res.json({ success: true });
        return;
      }
    }

    res.status(400).json({ error: "Unhandled status transition" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update request" });
  }
});

/* ── DELETE /journey-requests/:id — passenger cancels their own request ── */
router.delete("/journey-requests/:id", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Login required" }); return; }
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  try {
    const [r] = await db.select().from(journeyRequestsTable)
      .where(eq(journeyRequestsTable.id, id)).limit(1);
    if (!r) { res.status(404).json({ error: "Not found" }); return; }
    if (r.passengerId !== req.user!.id) { res.status(403).json({ error: "Forbidden" }); return; }
    await db.delete(journeyRequestsTable).where(eq(journeyRequestsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete request" });
  }
});

export default router;
