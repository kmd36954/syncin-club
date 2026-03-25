# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Auth**: Replit Auth (OIDC + PKCE via `openid-client`)

## Application: SyncIn Club (ShareTheRide)

A professional carpooling and networking app for Pakistan. Economy tier is live. Sovereign/Business tiers are "Coming Soon" with no active routing.

### Entry Flow (MODAL-BASED — no page redirects for gates)
1. `/` — SyncIn Club landing page (Lobby). Luxury car hero + Host/Request journey cards.
2. `/login` — Split layout login: left panel = car image + dark overlay + PuzzleLogo branding; right panel = LinkedIn/Email auth.
3. `/dashboard` — Economy Dashboard. Authenticated users land here immediately. Clicking "Host" or "Request" opens `JourneyFlowModal`.
4. **JourneyFlowModal** (multi-step, in-modal):
   - Step 1: Profile (skipped if `profileComplete=true`)
   - Step 2: OTP verify (skipped if `mobileVerified=true`; bypass code: `1234`)
   - Step 3: Car Registration (Host mode only; skipped if `vehicleRegNumber` set)
   - Smart skip: if all gates pass, modal is bypassed and user navigates directly.
5. `/offer-ride` — Host a journey form (Leaflet map, Photon autocomplete, center needle, OSRM routing, PoliciesModal gate).
6. `/find-rides` — Request a Journey BROADCAST form. Identical UX to OfferRide: full-screen Leaflet map, center needle (green=pickup, red=dest), Photon autocomplete, Nominatim reverse geocode on drag, OSRM route + distance in bottom sheet, optional notes field. Submits to POST /api/journey-requests which broadcasts to all Host dashboards.
7. **PoliciesModal** — intercepts "Host Journey" submit in OfferRide. User must accept 4 articles before journey publishes. Welcome email fires on first accept.

### Features
- **Auth**: LinkedIn (Replit OIDC) + Email/Password (bcryptjs). Sessions persist 7 days.
- **Logo**: Custom `PuzzleLogo` SVG — two interlocking rectangle puzzle pieces. Left piece: Bronze Gold `#B8860B`; Right piece: Champagne Gold `#D4AF37`. Text: "Sync" white + "In" silver `#BDC3C7`, bold serif, NO dot.
- **Landing page (Lobby)**: Mercedes luxury car hero image. Host card (Midnight Navy) + Request card (Deep Sapphire). Clean Light Grey (`#F3F4F6`) page background.
- **Login page**: Mercedes hero image on left panel, dark grey overlay. PuzzleLogo branding. LinkedIn/Email form on right.
- **Complete Profile**: White card, explicit bg-white, beige page bg. Dark text. Mandatory gate.
- **Mobile OTP (/verify-mobile)**: Enter mobile → receive 6-digit OTP (shown in UI in dev mode) → verify → dashboard unlocked. `mobileVerified` flag set on DB.
- **Vehicle Registration (/register-vehicle)**: Make, Model, Year, Type, License Plate form. Navy panel + white inputs. Gold CTA button. Redirects to /offer-ride on success.
- **Dashboard**: Full-width Mercedes hero with dark-grey overlay. Host/Request navy cards centered on mobile (max-w-md mx-auto). Host card shows "Register Vehicle to Host" button if no vehicle registered. Safety Protocol (dark navy certificate style — PERMANENT, never delete).
- **Host Gate**: Lobby "Host a Journey" → if no vehicle registered → redirect to /register-vehicle. Dashboard "Host a Journey" card shows gold "Register Vehicle" CTA if vehicle missing.
- **THEME**: Page bg `#F3F4F6` (Clean Light Grey), Host card `#0B132B` (Midnight Navy), Request card `#172554` (Deep Sapphire), List cards `#0F1A3A`, Navbar `#0B132B`, CTA `#3A86FF`, Gold `#D4AF37`, Dashboard hero overlay dark-grey (`rgba(17,24,39,...)`).
- **Form inputs (INP)**: Always `background: #F8F9FA`, `border: 1.5px solid #E2E8F0`, `color: #0B132B` — light inputs on dark navy panels.
- **Back arrows**: All sub-pages (Host Journey, Find Journey, Complete Profile) have back navigation.
- **Host a Journey (OfferRide)**: Form with two compact Leaflet maps + address search (Nominatim). Back arrow → Dashboard.
- **Find a Journey (FindRides)**: Split map+list view. Co-travelers can express interest. Back arrow → Dashboard.
- **Interests handshake**: Co-traveler expresses interest → host sees requests → Accept (reveals WhatsApp button) or Decline.
- **Navbar account dropdown**: Profile progress, Co-Traveler history, Invite a Colleague (WhatsApp green button), Account Settings, Sign Out.
- **WhatsApp Invite Engine**: Pre-composed invite message with app URL (wa.me format).
- **Safety Protocol**: ID Verification + Private Agreement instructions on Dashboard.
- **Terminology**: All display text uses "Journey" (not Ride), "Co-traveler" (not Passenger), "Host" (not Driver).
- **Professional Exchange**: Post a Job, Open to Work, Connect networking modals.

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── share-the-ride/     # React + Vite frontend (ShareTheRide)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   └── replit-auth-web/    # Browser auth hook (useAuth)
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## DB Schema

- `users` — profile fields: `mobileNumber`, `mobileVerified` (bool), `mobileOtp`, `mobileOtpExpiry`, `companyName`, `jobTitle`, `bio`, `vehicleRegNumber`, `vehicleType`, `vehicleMake`, `vehicleModel`, `vehicleYear`, `linkedinUrl`, `cnicNumber`, `profileComplete` (bool), `isSovereign`, `isBusiness`, `covenantAccepted`, `createdAt`
- `sessions` — Replit Auth sessions (7-day TTL)
- `rides` — carpooling offers: `driverId`, `startLocation`, `destination`, `departureTime`, `price`, `seatsAvailable`, plus `startLat/Lng`, `destLat/Lng` for map pins
- `interests` — passenger interest records: `rideId`, `passengerId`, status (pending/connected/dismissed), `whatsappUrl`
- `journey_requests` — passenger requests: `passengerId`, `startLocation`, `destination`, status

## DB Push Command
`pnpm --filter @workspace/db run push` (NOT npm run db:push)

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only emit `.d.ts` files during typecheck

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/share-the-ride` (`@workspace/share-the-ride`)

React + Vite frontend for ShareTheRide. Tailwind CSS, shadcn/ui components.

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/`.

- `src/routes/rides.ts` — CRUD for rides + booking
- `src/routes/auth.ts` — Replit OIDC auth routes
- `src/middlewares/authMiddleware.ts` — session-based auth

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

- `src/schema/auth.ts` — users + sessions tables
- `src/schema/rides.ts` — rides table

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec and Orval codegen config.

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/replit-auth-web` (`@workspace/replit-auth-web`)

Browser auth hook. Use `useAuth()` in React components for login state.
