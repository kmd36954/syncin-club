import * as oidc from "openid-client";
import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, pool, usersTable } from "@workspace/db";
import { GetCurrentAuthUserResponse } from "@workspace/api-zod";
import {
  clearSession,
  getOidcConfig,
  getSessionId,
  getSession,
  createSession,
  deleteSession,
  SESSION_COOKIE,
  SESSION_TTL,
  ISSUER_URL,
  type SessionData,
} from "../lib/auth";

const ExchangeMobileAuthorizationCodeBody = z.object({
  code: z.string(),
  code_verifier: z.string(),
  redirect_uri: z.string(),
  state: z.string(),
  nonce: z.string().optional(),
});

const ExchangeMobileAuthorizationCodeResponse = z.object({
  token: z.string(),
});

const LogoutMobileSessionResponse = z.object({
  success: z.boolean(),
});

const OIDC_COOKIE_TTL = 10 * 60 * 1000;

const router: IRouter = Router();

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host =
    req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

function setOidcCookie(res: Response, name: string, value: string) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: OIDC_COOKIE_TTL,
  });
}

function getSafeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

async function upsertUser(claims: Record<string, unknown>) {
  const id             = claims.sub as string;
  const email          = (claims.email as string) || null;
  const firstName      = (claims.first_name as string) || null;
  const lastName       = (claims.last_name as string) || null;
  const profileImageUrl = (claims.profile_image_url || claims.picture) as string | null;

  /* Use raw SQL so we only reference the 7 base columns that are guaranteed
     to exist in every version of the production database.  Drizzle's
     generated SELECT / INSERT lists every column in the schema, which
     would fail if the production DB hasn't been migrated yet. */

  let row: Record<string, unknown> | undefined;

  // Step 1 — look up by email (handles prior email/password registrations
  //           where the stored id differs from the Replit OIDC id).
  if (email) {
    const check = await pool.query<{ id: string }>(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [email],
    );
    if (check.rows.length > 0 && check.rows[0].id !== id) {
      const upd = await pool.query(
        `UPDATE users
            SET first_name        = COALESCE($1, first_name),
                last_name         = COALESCE($2, last_name),
                profile_image_url = COALESCE($3, profile_image_url),
                updated_at        = NOW()
          WHERE email = $4
          RETURNING id, email, first_name, last_name, profile_image_url`,
        [firstName, lastName, profileImageUrl, email],
      );
      row = upd.rows[0];
    }
  }

  // Step 2 — insert (or update on id conflict) if step 1 didn't match.
  if (!row) {
    const ups = await pool.query(
      `INSERT INTO users (id, email, first_name, last_name, profile_image_url)
            VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE
           SET email             = EXCLUDED.email,
               first_name        = EXCLUDED.first_name,
               last_name         = EXCLUDED.last_name,
               profile_image_url = COALESCE(EXCLUDED.profile_image_url, users.profile_image_url),
               updated_at        = NOW()
       RETURNING id, email, first_name, last_name, profile_image_url`,
      [id, email, firstName, lastName, profileImageUrl],
    );
    row = ups.rows[0];
  }

  // Return an object that satisfies the full Drizzle inferred type; extra
  // columns not present in the production DB simply default to null / false.
  return {
    id:               row["id"]                as string,
    email:            (row["email"]            as string | null) ?? null,
    firstName:        (row["first_name"]       as string | null) ?? null,
    lastName:         (row["last_name"]        as string | null) ?? null,
    profileImageUrl:  (row["profile_image_url"] as string | null) ?? null,
    mobileNumber:     null,
    mobileVerified:   false,
    mobileOtp:        null,
    mobileOtpExpiry:  null,
    companyName:      null,
    jobTitle:         null,
    bio:              null,
    passwordHash:     null,
    vehicleRegNumber: null,
    vehicleType:      null,
    vehicleMake:      null,
    vehicleModel:     null,
    vehicleYear:      null,
    linkedinUrl:      null,
    cnicNumber:       null,
    memberStatus:     "approved" as const,
    covenantAccepted: false,
    profileComplete:  false,
    isSovereign:      false,
    isBusiness:       false,
    invitationCode:   null,
    createdAt:        new Date(),
    updatedAt:        new Date(),
  } satisfies typeof usersTable.$inferSelect;
}

router.get("/auth/user", async (req: Request, res: Response) => {
  const authed = req.isAuthenticated();
  if (!authed || !req.user) {
    res.json(GetCurrentAuthUserResponse.parse({ authenticated: false }));
    return;
  }
  // Always fetch fresh isSovereign / isBusiness from DB so admin flag changes
  // are reflected immediately without requiring the user to log out and back in.
  const [dbUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, (req.user as any).id))
    .limit(1);

  const freshUser = dbUser
    ? {
        ...(req.user as any),
        firstName: dbUser.firstName ?? (req.user as any).firstName,
        lastName: dbUser.lastName ?? (req.user as any).lastName,
        email: dbUser.email ?? (req.user as any).email,
        mobileNumber:     dbUser.mobileNumber     ?? undefined,
        mobileVerified:   dbUser.mobileVerified   ?? false,
        bio:              dbUser.bio              ?? undefined,
        companyName:      dbUser.companyName      ?? undefined,
        jobTitle:         dbUser.jobTitle         ?? undefined,
        vehicleRegNumber: dbUser.vehicleRegNumber ?? undefined,
        vehicleType:      dbUser.vehicleType      ?? undefined,
        vehicleMake:      dbUser.vehicleMake      ?? undefined,
        vehicleModel:     dbUser.vehicleModel     ?? undefined,
        vehicleYear:      dbUser.vehicleYear      ?? undefined,
        linkedinUrl:      dbUser.linkedinUrl      ?? undefined,
        cnicNumber:       dbUser.cnicNumber       ?? undefined,
        memberStatus:     dbUser.memberStatus     ?? "approved",
        covenantAccepted: dbUser.covenantAccepted ?? false,
        profileComplete:  dbUser.profileComplete  ?? false,
        isSovereign:      dbUser.isSovereign      ?? false,
        isBusiness:       dbUser.isBusiness       ?? false,
        createdAt:        dbUser.createdAt?.toISOString() ?? undefined,
      }
    : req.user;

  console.log("[auth/user] id=%s isSovereign=%s isBusiness=%s",
    (freshUser as any).id,
    (freshUser as any).isSovereign,
    (freshUser as any).isBusiness,
  );

  // Use res.json directly (not Zod parse) to guarantee isSovereign/isBusiness
  // are never accidentally stripped by schema validation.
  res.json({ authenticated: true, user: freshUser });
});

router.get("/login", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;

  const returnTo = getSafeReturnTo(req.query.returnTo);

  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

  const redirectTo = oidc.buildAuthorizationUrl(config, {
    redirect_uri: callbackUrl,
    scope: "openid email profile offline_access",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "login consent",
    state,
    nonce,
  });

  setOidcCookie(res, "code_verifier", codeVerifier);
  setOidcCookie(res, "nonce", nonce);
  setOidcCookie(res, "state", state);
  setOidcCookie(res, "return_to", returnTo);

  res.redirect(redirectTo.href);
});

router.get("/callback", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;

  const codeVerifier = req.cookies?.code_verifier;
  const nonce = req.cookies?.nonce;
  const expectedState = req.cookies?.state;

  if (!codeVerifier || !expectedState) {
    res.redirect("/api/login");
    return;
  }

  const currentUrl = new URL(
    `${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`,
  );

  let tokens: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers;
  try {
    tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedNonce: nonce,
      expectedState,
      idTokenExpected: true,
    });
  } catch {
    res.redirect("/api/login");
    return;
  }

  const returnTo = getSafeReturnTo(req.cookies?.return_to);

  res.clearCookie("code_verifier", { path: "/" });
  res.clearCookie("nonce", { path: "/" });
  res.clearCookie("state", { path: "/" });
  res.clearCookie("return_to", { path: "/" });

  const claims = tokens.claims();
  if (!claims) {
    res.redirect("/api/login");
    return;
  }

  const dbUser = await upsertUser(claims as unknown as Record<string, unknown>);

  const now = Math.floor(Date.now() / 1000);
  const sessionData: SessionData = {
    user: {
      id: dbUser.id,
      username: dbUser.email || dbUser.id,
      firstName: dbUser.firstName ?? undefined,
      lastName: dbUser.lastName ?? undefined,
      profileImage: dbUser.profileImageUrl ?? undefined,
      companyName: dbUser.companyName ?? undefined,
      jobTitle: dbUser.jobTitle ?? undefined,
      isSovereign: dbUser.isSovereign ?? false,
      isBusiness: dbUser.isBusiness ?? false,
    },
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);
  res.redirect(returnTo);
});

router.get("/logout", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const origin = getOrigin(req);

  const sid = getSessionId(req);
  await clearSession(res, sid);

  const endSessionUrl = oidc.buildEndSessionUrl(config, {
    client_id: process.env.REPL_ID!,
    post_logout_redirect_uri: origin,
  });

  res.redirect(endSessionUrl.href);
});

router.post("/mobile-auth/token-exchange", async (req: Request, res: Response) => {
  const parsed = ExchangeMobileAuthorizationCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required parameters" });
    return;
  }

  const { code, code_verifier, redirect_uri, state, nonce } = parsed.data;

  try {
    const config = await getOidcConfig();

    const callbackUrl = new URL(redirect_uri);
    callbackUrl.searchParams.set("code", code);
    callbackUrl.searchParams.set("state", state);
    callbackUrl.searchParams.set("iss", ISSUER_URL);

    const tokens = await oidc.authorizationCodeGrant(config, callbackUrl, {
      pkceCodeVerifier: code_verifier,
      expectedNonce: nonce ?? undefined,
      expectedState: state,
      idTokenExpected: true,
    });

    const claims = tokens.claims();
    if (!claims) {
      res.status(401).json({ error: "No claims in ID token" });
      return;
    }

    const dbUser = await upsertUser(claims as unknown as Record<string, unknown>);

    const now = Math.floor(Date.now() / 1000);
    const sessionData: SessionData = {
      user: {
        id: dbUser.id,
        username: dbUser.email || dbUser.id,
        firstName: dbUser.firstName ?? undefined,
        lastName: dbUser.lastName ?? undefined,
        profileImage: dbUser.profileImageUrl ?? undefined,
      },
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
    };

    const sid = await createSession(sessionData);
    res.json(ExchangeMobileAuthorizationCodeResponse.parse({ token: sid }));
  } catch (err) {
    console.error("Mobile token exchange error:", err);
    res.status(500).json({ error: "Token exchange failed" });
  }
});

router.post("/mobile-auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (sid) {
    await deleteSession(sid);
  }
  res.json(LogoutMobileSessionResponse.parse({ success: true }));
});

/* ── Welcome email — fire-and-forget (no email gateway in dev) ─ */
router.post("/welcome-email", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (!sid) { res.status(401).json({ error: "Unauthorized" }); return; }
  /* In production this would send a transactional email.
     For now we just acknowledge and mark covenantAccepted. */
  try {
    const session = await getSession(sid);
    if (session?.userId) {
      await db.update(usersTable)
        .set({ covenantAccepted: true })
        .where(eq(usersTable.id, session.userId));
    }
    res.json({ ok: true });
  } catch {
    res.json({ ok: true }); /* silent — non-critical */
  }
});

export default router;
