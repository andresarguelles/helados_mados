# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Vite dev server on port 3000 (auto-opens browser)
- `npm run build` — type-check (`tsc`) then production build via `vite build`
- `npm run preview` — preview the production build locally

There is no test suite and no lint script configured in this repo. Type errors surface via `npm run build` (or `tsc` directly); there is no separate lint step.

Requires a `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see `.env.example`) — `src/lib/supabaseClient.ts` throws at import time if either is missing.

## Architecture

Helados Mados is a React SPA for a TikTok Live ice cream shop promo, backed by a real Supabase project (Postgres + Auth + Edge Functions): viewers redeem a "secret keyword" for a digital point + QR coupon, then redeem the QR in-store for physical stock and bonus points. Business logic that must be trustworthy (points, redemption limits, admin actions) lives in Postgres (RLS + `security definer` RPCs), not in client code.

**Backend: `supabase/migrations/*.sql` (applied in filename order) and `supabase/functions/`.** This is the source of truth for the data model and rules — read the migrations before assuming client code enforces anything:
- `profiles` — one row per `auth.users` row (`id` FK, `username` citext unique, `total_points`, `is_admin`); a trigger creates it on signup
- `dynamics` — the redeemable "keyword campaigns" (`keyword`, `starts_at`/`ends_at`, `physical_stock`, `physical_redeemed`); a DB exclusion constraint (`dynamics_no_overlapping_keyword`, surfaced as Postgres error `23P01`) prevents two active dynamics from sharing a keyword over overlapping date ranges
- `coupons` — one per user per dynamic, `status` (`active`/`redeemed`/`expired`), `digital_awarded`/`physical_awarded` flags
- `ip_redemption_logs` — `(ip_hash, dynamic_id)` counter capping redemptions per IP per dynamic at 3; only a salted SHA-256 hash of the IP is ever stored (see the edge function below), never the raw IP
- RPCs (all `security definer`, executed via `supabase.rpc(...)` from the store): `redeem_keyword` (validates the active dynamic, enforces one-coupon-per-user-per-dynamic and the IP cap, awards +1 point, inserts the `Coupon`), `scan_coupon` (admin-only via `is_admin()`; validates coupon status/expiry/stock, marks it redeemed, awards +10 points, increments `physical_redeemed`), `get_leaderboard(period)` (`'all'` sorts by `profiles.total_points`; `'day'`/`'week'`/`'month'` instead sum points from coupons created within the cutoff window — digital=1, physical=10 — so per-period rankings can differ from all-time), `username_available`, `is_admin()`
- `supabase/functions/redeem-keyword/index.ts` — the only edge function; it's a thin wrapper that authenticates the caller (forwards their JWT), reads the request's `x-forwarded-for` IP, hashes it with a server-side pepper (`IP_HASH_PEPPER` secret), and calls the `redeem_keyword` RPC with that hash. The client never computes or sees the IP hash.

**Client state: `src/lib/store.ts`.** A Zustand store that's a thin async wrapper over Supabase — it holds `profile`, `isAdmin`, `authReady`, `dynamics`, `coupons`, `profiles`, and calls out to Supabase Auth / Postgres / the edge function for every action (`login`/`register`/`logout`, `fetchDynamics`, `addDynamic`/`updateDynamic`/`deleteDynamic`, `redeemKeyword`, `scanCoupon`, `getUserCoupons`, `getLeaderboard`). Nothing is persisted to `localStorage` — `initAuth()` restores session state on load via `supabase.auth.getSession()`/`onAuthStateChange()`, so real auth state (not a mock store) is the source of truth across reloads.

**Auth is real Supabase Auth, disguised as username/password.** There's no separate username/password table — `usernameToEmail()` in `store.ts` maps a username to a synthetic email (`<username>@accounts.helados-mados.app`) because GoTrue requires an email and rejects reserved test TLDs. `login`/`register` call `supabase.auth.signInWithPassword`/`signUp` with that synthetic email; `register` first checks the `username_available` RPC to avoid a confusing duplicate-email error. `profiles.is_admin` (not a Supabase Auth role) is what `ProtectedAdmin` and the RPCs' `is_admin()` check gate on.

**Data model & types: `src/lib/types.ts` + `src/lib/database.types.ts`.** `database.types.ts` is the generated Supabase schema (regenerate with the Supabase CLI/MCP after any migration); `types.ts` derives the app-level `Profile`/`Dynamic`/`Coupon` types from it.

**Routing: `src/App.tsx`.** Plain `react-router-dom` `BrowserRouter`. Admin routes (`/admin/dashboard`, `/admin/scanner`, `/admin/users`) are wrapped in a local `ProtectedAdmin` guard that checks `useStore(s => s.isAdmin)` (waiting on `authReady` first) and redirects to `/admin` otherwise — the client-side guard is UX only; the real boundary is Postgres RLS + the RPCs' `is_admin()` checks.

**Two independent auth entry points:** `src/pages/Login.tsx` (standalone login) and the auth step embedded inside `src/pages/Redeem.tsx`'s multi-step flow (`keyword` → `auth` → `success`). Both call the same store `login`/`register` actions; keep them in sync if auth behavior changes.

**Admin flow:** `AdminLogin.tsx` → `AdminDashboard.tsx` (manage `Dynamic` campaigns via `addDynamic`/`updateDynamic`/`deleteDynamic`) and `AdminUsers.tsx` (browse `profiles` via `fetchAllProfiles`) → `AdminScanner.tsx` (camera-based QR scanning via `html5-qrcode`, calls `scanCoupon`). The scanner has a manual UUID-entry fallback (`<details>` block) for testing without a camera/second device.

**Styling:** Tailwind with a custom brand palette (`brand.navy/coral/lemon/cream/mint/pink`) defined in `tailwind.config.ts`, plus shared component classes (`.btn-coral`, `.btn-navy`, `.glass-card`, `.field-input`, `.qr-card`, `.points-chip`, etc.) defined in `src/index.css` under `@layer components`. Prefer these existing classes over ad hoc utility strings when building new UI. `cn()` in `src/lib/utils.ts` (clsx + tailwind-merge) is the standard way to compose conditional class names.

**UI copy is in Spanish** (user-facing strings, error messages, route paths like `/canjear`, `/cuenta`, `/terminos`) — match this when adding new user-facing text.

**Points economy:** +1 point for digital keyword redemption, +10 points for physical in-store redemption (QR scan). This is enforced server-side in the `redeem_keyword`/`scan_coupon` RPCs and duplicated in `get_leaderboard` and UI copy — keep them consistent if the economy changes, and remember a migration is required (client-only edits won't touch enforcement).
