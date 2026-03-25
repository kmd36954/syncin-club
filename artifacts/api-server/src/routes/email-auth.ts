import { Router, type IRouter } from "express";
import { db, usersTable, interestsTable, ridesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createSession, SESSION_COOKIE, SESSION_TTL } from "../lib/auth";

const router: IRouter = Router();

const RegisterBody = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
});

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function makeSessionCookie(res: any, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

/* POST /auth/email/register */
router.post("/auth/email/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input" });
    return;
  }
  const { email, password, firstName, lastName } = parsed.data;

  try {
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing) {
      res.status(409).json({ error: "An account with this email already exists. Please sign in instead." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [user] = await db.insert(usersTable).values({
      email,
      passwordHash,
      firstName: firstName?.trim() || null,
      lastName: lastName?.trim() || null,
    }).returning();

    const sid = await createSession({
      user: {
        id: user.id,
        username: user.email || user.id,
        firstName: user.firstName ?? undefined,
        lastName: user.lastName ?? undefined,
      },
      access_token: "email-auth",
    });

    makeSessionCookie(res, sid);
    res.json({ success: true });
  } catch (err) {
    console.error("[email-auth/register]", err);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

/* POST /auth/email/login */
router.post("/auth/email/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please enter a valid email and password" });
    return;
  }
  const { email, password } = parsed.data;

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

    if (!user || !user.passwordHash) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const sid = await createSession({
      user: {
        id: user.id,
        username: user.email || user.id,
        firstName: user.firstName ?? undefined,
        lastName: user.lastName ?? undefined,
      },
      access_token: "email-auth",
    });

    makeSessionCookie(res, sid);
    res.json({ success: true });
  } catch (err) {
    console.error("[email-auth/login]", err);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

/* DELETE /auth/account — permanently delete account + all data */
router.delete("/auth/account", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "You must be logged in to delete your account" });
    return;
  }
  const userId = req.user!.id;

  try {
    await db.delete(interestsTable).where(eq(interestsTable.passengerId, userId));
    const myRides = await db.select({ id: ridesTable.id }).from(ridesTable).where(eq(ridesTable.driverId, userId));
    for (const ride of myRides) {
      await db.delete(interestsTable).where(eq(interestsTable.rideId, ride.id));
    }
    await db.delete(ridesTable).where(eq(ridesTable.driverId, userId));
    await db.delete(usersTable).where(eq(usersTable.id, userId));

    res.clearCookie(SESSION_COOKIE, { path: "/" });
    res.json({ success: true, message: "Account deleted successfully" });
  } catch (err) {
    console.error("[auth/delete-account]", err);
    res.status(500).json({ error: "Failed to delete account. Please try again." });
  }
});

export default router;
