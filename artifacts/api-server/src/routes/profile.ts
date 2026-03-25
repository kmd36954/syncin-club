import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

/* PUT /profile — update the current user's profile */
router.put("/profile", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { firstName, lastName, email, mobileNumber, bio, companyName, jobTitle, vehicleRegNumber, vehicleType, vehicleMake, vehicleModel, vehicleYear, covenantAccepted, linkedinUrl, cnicNumber } = req.body;

  try {
    const updateData: Record<string, any> = { updatedAt: new Date() };

    if (firstName        !== undefined) updateData.firstName        = firstName        || null;
    if (lastName         !== undefined) updateData.lastName         = lastName         || null;
    if (email            !== undefined) updateData.email            = email            || null;
    if (mobileNumber     !== undefined) updateData.mobileNumber     = mobileNumber     || null;
    if (bio              !== undefined) updateData.bio              = bio              || null;
    if (companyName      !== undefined) updateData.companyName      = companyName      || null;
    if (jobTitle         !== undefined) updateData.jobTitle         = jobTitle         || null;
    if (vehicleRegNumber !== undefined) updateData.vehicleRegNumber = vehicleRegNumber || null;
    if (vehicleType      !== undefined) updateData.vehicleType      = vehicleType      || null;
    if (vehicleMake      !== undefined) updateData.vehicleMake      = vehicleMake      || null;
    if (vehicleModel     !== undefined) updateData.vehicleModel     = vehicleModel     || null;
    if (vehicleYear      !== undefined) updateData.vehicleYear      = vehicleYear      || null;
    if (covenantAccepted === true)      updateData.covenantAccepted = true;
    if (linkedinUrl !== undefined)      updateData.linkedinUrl  = linkedinUrl  || null;
    if (cnicNumber  !== undefined)      updateData.cnicNumber   = cnicNumber   || null;

    if (companyName && jobTitle) {
      updateData.profileComplete = true;
    }

    await db
      .update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, req.user!.id));

    const [updated] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.id))
      .limit(1);

    res.json({
      id:               updated.id,
      username:         updated.email || updated.id,
      firstName:        updated.firstName        ?? undefined,
      lastName:         updated.lastName         ?? undefined,
      profileImage:     updated.profileImageUrl  ?? undefined,
      mobileNumber:     updated.mobileNumber     ?? undefined,
      mobileVerified:   updated.mobileVerified   ?? false,
      bio:              updated.bio              ?? undefined,
      companyName:      updated.companyName      ?? undefined,
      jobTitle:         updated.jobTitle         ?? undefined,
      vehicleRegNumber: updated.vehicleRegNumber ?? undefined,
      vehicleType:      updated.vehicleType      ?? undefined,
      vehicleMake:      updated.vehicleMake      ?? undefined,
      vehicleModel:     updated.vehicleModel     ?? undefined,
      vehicleYear:      updated.vehicleYear      ?? undefined,
      linkedinUrl:      updated.linkedinUrl      ?? undefined,
      cnicNumber:       updated.cnicNumber       ?? undefined,
      covenantAccepted: updated.covenantAccepted ?? false,
      profileComplete:  updated.profileComplete  ?? false,
      isSovereign:      updated.isSovereign      ?? false,
      isBusiness:       updated.isBusiness       ?? false,
      createdAt:        updated.createdAt?.toISOString() ?? undefined,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

/* GET /users/:id — public profile view (authenticated users only) */
router.get("/users/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Login required" });
    return;
  }
  try {
    const [u] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.params.id))
      .limit(1);

    if (!u) { res.status(404).json({ error: "User not found" }); return; }

    res.json({
      id:               u.id,
      firstName:        u.firstName        ?? undefined,
      lastName:         u.lastName         ?? undefined,
      profileImage:     u.profileImageUrl  ?? undefined,
      jobTitle:         u.jobTitle         ?? undefined,
      companyName:      u.companyName      ?? undefined,
      mobileNumber:     u.mobileNumber     ?? undefined,
      vehicleRegNumber: u.vehicleRegNumber ?? undefined,
      vehicleType:      u.vehicleType      ?? undefined,
      vehicleMake:      u.vehicleMake      ?? undefined,
      vehicleModel:     u.vehicleModel     ?? undefined,
      linkedinUrl:      u.linkedinUrl      ?? undefined,
      mobileVerified:   u.mobileVerified   ?? false,
      createdAt:        u.createdAt?.toISOString() ?? undefined,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

export default router;
