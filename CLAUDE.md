# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Vite dev server on port 3000 (auto-opens browser)
- `npm run build` — type-check (`tsc`) then production build via `vite build`
- `npm run preview` — preview the production build locally

There is no test suite and no lint script configured in this repo. Type errors surface via `npm run build` (or `tsc` directly); there is no separate lint step.

## Architecture

Helados Mados is a client-only React SPA (no backend) for a TikTok Live ice cream shop promo: viewers redeem a "secret keyword" for a digital point + QR coupon, then redeem the QR in-store for physical stock and bonus points. Everything — auth, coupon issuance, stock, leaderboard — is simulated entirely in the browser.

**All app state and business logic lives in one Zustand store: `src/lib/store.ts`.** This is the most important file to read before making changes — it owns:
- `users`, `dynamics` (the redeemable "keyword campaigns"), `coupons`, `ipLogs`
- Auth (`login`/`register`/`logout`) — plaintext password compare against in-memory users, no real hashing (mock only)
- `redeemKeyword` — validates a keyword against the currently active `Dynamic`, enforces one-coupon-per-user-per-dynamic and a max-3-redemptions-per-IP cap, awards +1 point, and creates a `Coupon`
- `scanCoupon` — used by the admin QR scanner; validates coupon status/expiry/stock, marks it redeemed, awards +10 points, increments `physical_redeemed`
- `getLeaderboard(period)` — `'all'` sorts by `total_points`; `'day'`/`'week'` instead recompute points from coupons created within the cutoff window (digital=1, physical=10), so per-period rankings can differ from all-time rankings
- The whole store is persisted to `localStorage` via `zustand/middleware`'s `persist` (key: `helados-mados-store`), so state survives reloads; `reset()` restores the seed data from `mock-data.ts`

**Data model & seed data: `src/lib/mock-data.ts`.** Defines the `User`, `Dynamic`, `Coupon`, `IpLog` types and `INITIAL_*` seed arrays used both as the store's initial state and as `reset()`'s target. A `Dynamic` is "active" only when `now` falls between `starts_at` and `ends_at` (see `isDynamicActive`/`getActiveDynamic`) — expired/upcoming dynamics exist in seed data specifically to exercise those states.

**Routing: `src/App.tsx`.** Plain `react-router-dom` `BrowserRouter`. Admin routes (`/admin/dashboard`, `/admin/scanner`) are wrapped in a local `ProtectedAdmin` guard that checks `useStore(s => s.isAdmin)` and redirects to `/admin` otherwise — this is client-side only and not a real auth boundary.

**Two independent auth entry points:** `src/pages/Login.tsx` (standalone login) and the auth step embedded inside `src/pages/Redeem.tsx`'s multi-step flow (`keyword` → `auth` → `success`). Both call the same store `login`/`register` actions; keep them in sync if auth behavior changes.

**Admin flow:** `AdminLogin.tsx` → `AdminDashboard.tsx` (manage `Dynamic` campaigns via `addDynamic`/`updateDynamic`/`deleteDynamic`) → `AdminScanner.tsx` (camera-based QR scanning via `html5-qrcode`, calls `scanCoupon`). The scanner has a manual UUID-entry fallback (`<details>` block) for testing without a camera/second device.

**Styling:** Tailwind with a custom brand palette (`brand.navy/coral/lemon/cream/mint/pink`) defined in `tailwind.config.ts`, plus shared component classes (`.btn-coral`, `.btn-navy`, `.glass-card`, `.field-input`, `.qr-card`, `.points-chip`, etc.) defined in `src/index.css` under `@layer components`. Prefer these existing classes over ad hoc utility strings when building new UI. `cn()` in `src/lib/utils.ts` (clsx + tailwind-merge) is the standard way to compose conditional class names.

**UI copy is in Spanish** (user-facing strings, error messages, route paths like `/canjear`, `/cuenta`, `/terminos`) — match this when adding new user-facing text.

**Points economy:** +1 point for digital keyword redemption, +10 points for physical in-store redemption (QR scan). This split is duplicated in a few places (`store.ts`'s `redeemKeyword`/`scanCoupon`/`getLeaderboard`, and UI copy) — keep them consistent if the economy changes.
