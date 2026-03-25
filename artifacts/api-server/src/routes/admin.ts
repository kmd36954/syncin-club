import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

/* Guard: sovereign only */
function requireSovereign(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!(req.user as any).isSovereign) { res.status(403).json({ error: "Admin access required" }); return; }
  next();
}

/* GET /api/admin/users — list all members */
router.get("/admin/users", requireSovereign, async (_req, res) => {
  try {
    const users = await db
      .select({
        id:           usersTable.id,
        firstName:    usersTable.firstName,
        lastName:     usersTable.lastName,
        email:        usersTable.email,
        jobTitle:     usersTable.jobTitle,
        companyName:  usersTable.companyName,
        linkedinUrl:  usersTable.linkedinUrl,
        cnicNumber:   usersTable.cnicNumber,
        mobileNumber: usersTable.mobileNumber,
        mobileVerified: usersTable.mobileVerified,
        profileComplete: usersTable.profileComplete,
        memberStatus: usersTable.memberStatus,
        vehicleRegNumber: usersTable.vehicleRegNumber,
        bio:          usersTable.bio,
        isSovereign:  usersTable.isSovereign,
        createdAt:    usersTable.createdAt,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt));

    res.json(users.map(u => ({
      ...u,
      createdAt: u.createdAt?.toISOString(),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

/* PATCH /api/admin/users/:id — update member status */
router.patch("/admin/users/:id", requireSovereign, async (req, res) => {
  const { memberStatus } = req.body;
  if (!["pending", "approved", "rejected"].includes(memberStatus)) {
    res.status(400).json({ error: "Invalid status. Must be pending, approved, or rejected." });
    return;
  }
  try {
    await db
      .update(usersTable)
      .set({ memberStatus, updatedAt: new Date() })
      .where(eq(usersTable.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

export default router;
