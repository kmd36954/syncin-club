import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const DEV_BYPASS = "1234";

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/* POST /api/auth/otp/request — generate and "send" OTP for mobile verification */
router.post("/auth/otp/request", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { mobileNumber } = req.body;
  if (!mobileNumber || typeof mobileNumber !== "string" || mobileNumber.trim().length < 7) {
    res.status(400).json({ error: "A valid mobile number is required" });
    return;
  }

  const otp = generateOtp();
  const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  try {
    await db
      .update(usersTable)
      .set({
        mobileNumber: mobileNumber.trim(),
        mobileOtp: otp,
        mobileOtpExpiry: expiry,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, req.user!.id));

    console.log(`[OTP] User ${req.user!.id} → mobile ${mobileNumber} → OTP: ${otp}`);

    res.json({
      success: true,
      message: "OTP sent",
      devOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
    });
  } catch (err) {
    console.error("[otp/request]", err);
    res.status(500).json({ error: "Failed to generate OTP" });
  }
});

/* POST /api/auth/otp/verify — verify the entered OTP
   Accepts field name "otp" OR "code" (frontend compat).
   DEV BYPASS: code "1234" always succeeds in any environment. */
router.post("/auth/otp/verify", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  /* Accept both "otp" and "code" field names for compat */
  const raw = req.body.otp ?? req.body.code ?? "";
  const entered = typeof raw === "string" ? raw.trim() : "";

  if (!entered) {
    res.status(400).json({ error: "OTP is required" });
    return;
  }

  try {
    /* ── HARD BYPASS: 1234 always succeeds ── */
    if (entered === DEV_BYPASS) {
      await db
        .update(usersTable)
        .set({ mobileVerified: true, mobileOtp: null, mobileOtpExpiry: null, updatedAt: new Date() })
        .where(eq(usersTable.id, req.user!.id));
      res.json({ success: true, message: "Mobile number verified (dev bypass)" });
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.id))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (!user.mobileOtp || !user.mobileOtpExpiry) {
      res.status(400).json({ error: "No OTP requested. Please request a new one." });
      return;
    }

    if (new Date() > user.mobileOtpExpiry) {
      res.status(400).json({ error: "OTP has expired. Please request a new one." });
      return;
    }

    if (user.mobileOtp !== entered) {
      res.status(400).json({ error: "Incorrect OTP. Please try again." });
      return;
    }

    await db
      .update(usersTable)
      .set({ mobileVerified: true, mobileOtp: null, mobileOtpExpiry: null, updatedAt: new Date() })
      .where(eq(usersTable.id, req.user!.id));

    const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Professional";
    const email = user.email;
    if (email) {
      console.log(`[WELCOME EMAIL] To: ${email} — Welcome to SyncIn Club, ${name}!`);
    }

    res.json({ success: true, message: "Mobile number verified successfully" });
  } catch (err) {
    console.error("[otp/verify]", err);
    res.status(500).json({ error: "Verification failed" });
  }
});

export default router;
