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
- `profiles` — one row per `auth.users` row (`id` FK, `username` citext unique **but nullable**, `total_points`, `is_admin`, plus the profile fields `first_name`/`last_name`/`birthdate`/`phone`/`email`/`avatar_url`/`whatsapp_opt_in`(+`_at`) and the one-shot bonus flags `profile_bonus_awarded`/`google_bonus_awarded`). Two `auth` triggers feed it: `handle_new_user` (AFTER INSERT ON `auth.users`) creates the row, and `handle_identity_linked` (AFTER INSERT ON `auth.identities`) fills `email`/`first_name`/`last_name`/`avatar_url` from a Google identity. **`username` is null until the user finishes signing up at `/bienvenida`** — an OAuth signup has no username to offer, which is why the column had to become nullable. **`profiles.email` is only ever written by `handle_identity_linked`**: there is no client-facing path to it, and that is what guarantees every stored email is Google-verified.
- `dynamics` — the redeemable "keyword campaigns" (`keyword`, `starts_at`/`ends_at`, `physical_stock`, `physical_redeemed`); a DB exclusion constraint (`dynamics_no_overlapping_keyword`, surfaced as Postgres error `23P01`) prevents two active dynamics from sharing a keyword over overlapping date ranges
- `coupons` — one per user per dynamic, `status` (`active`/`redeemed`/`expired`), `digital_awarded`/`physical_awarded` flags
- `ip_redemption_logs` — `(ip_hash, dynamic_id)` counter capping redemptions per IP per dynamic at 3; only a salted SHA-256 hash of the IP is ever stored (see the edge function below), never the raw IP
- RPCs (all `security definer`, executed via `supabase.rpc(...)` from the store): `redeem_keyword` (validates the active dynamic, enforces one-coupon-per-user-per-dynamic and the IP cap, awards +1 point, inserts the `Coupon`), `scan_coupon` (admin-only via `is_admin()`; validates coupon status/expiry/stock, marks it redeemed, awards +10 points, increments `physical_redeemed`), `get_leaderboard(period)` (`'all'` sorts by `profiles.total_points`; `'day'`/`'week'`/`'month'` instead sum points from coupons created within the cutoff window — digital=1, physical=10 — so per-period rankings can differ from all-time), `username_available`, `is_admin()`, `complete_signup` (the whole account creation in one transaction — username, phone and consent together; it refuses if the username is already set, so it cannot double as a rename tool), `update_my_profile` (the only way a user writes their own profile; **takes no email parameter on purpose** and never touches `total_points`/`is_admin`/`username`; awards a one-time +5 when name, last name, birthdate and phone are all filled), `claim_google_bonus` (one-time +5, verified against `auth.identities` rather than trusting the client)
- `supabase/functions/redeem-keyword/index.ts` — the only edge function; it's a thin wrapper that authenticates the caller (forwards their JWT), reads the request's `x-forwarded-for` IP, hashes it with a server-side pepper (`IP_HASH_PEPPER` secret), and calls the `redeem_keyword` RPC with that hash. The client never computes or sees the IP hash.

**`profiles.phone` is write-once and unique.** A partial unique index (`profiles_phone_key`, `where phone is not null`) stops one person registering several Gmail accounts against the same number to farm points off a single Live; `update_my_profile` returns `phone_immutable` for any later change, including clearing it. Legacy cadets have no phone yet, so they can still add one from `/perfil` — and it locks from then on. Corrections go through an admin, by design.

**Client state: `src/lib/store.ts`.** A Zustand store that's a thin async wrapper over Supabase — it holds `profile`, `isAdmin`, `authReady`, `identities`, `hasPassword`, `dynamics`, `coupons`, `profiles`, and calls out to Supabase Auth / Postgres / the edge function for every action (`login`/`logout`, `signInWithGoogle`/`linkGoogle`/`unlinkGoogle`, `completeSignup`/`updateMyProfile`/`setPassword`, `fetchDynamics`, `addDynamic`/`updateDynamic`/`deleteDynamic`, `redeemKeyword`, `scanCoupon`, `getUserCoupons`, `getLeaderboard`). Nothing is persisted to `localStorage` — `initAuth()` restores session state on load via `supabase.auth.getSession()`/`onAuthStateChange()`, so real auth state (not a mock store) is the source of truth across reloads.

**Auth: new accounts are Google-only; password login survives for legacy users.** Signup with a password is gone from the client *and* locked server-side by turning off "Allow new users to sign up" on the Email provider — that toggle blocks `signUp` but not `signInWithPassword`, which is exactly what keeps the 175 pre-existing cadets working. There is no username/password table: `usernameToEmail()` in `store.ts` maps a username to a synthetic email (`<username>@accounts.helados-mados.app`) because GoTrue requires an email and rejects reserved test TLDs.

Two kinds of primary email now coexist: the synthetic one for legacy cadets, and a real Gmail for anyone born through Google. So **the login field accepts a nickname *or* an email** — `toLoginEmail()` passes anything containing `@` straight through and synthesizes the rest. A Google-native user who sets a password via `setPassword()` therefore signs in with their *email*, not their nickname; the password modal says so explicitly, because that is the single most confusing part of the flow.

A legacy cadet links Google from `/perfil` via `linkIdentity()` (needs Manual Linking enabled in the dashboard), which attaches the identity to the *same* `auth.users` row, so points and coupons are preserved. **Beware the reverse order:** a legacy cadet who signs in with Google *before* linking gets a brand-new empty account, because Supabase automatic linking matches on email and a synthetic address never matches a Gmail. `/login` and `/bienvenida` both carry warnings about this; there is no clean technical fix.

`profiles.is_admin` (not a Supabase Auth role) is what `ProtectedAdmin` and the RPCs' `is_admin()` check gate on.

**Data model & types: `src/lib/types.ts` + `src/lib/database.types.ts`.** `database.types.ts` is the generated Supabase schema (regenerate with the Supabase CLI/MCP after any migration); `types.ts` derives the app-level `Profile`/`Dynamic`/`Coupon` types from it.

**Routing: `src/App.tsx`.** Plain `react-router-dom` `BrowserRouter`. Admin routes (`/admin/dashboard`, `/admin/scanner`, `/admin/users`) are wrapped in a local `ProtectedAdmin` guard that checks `useStore(s => s.isAdmin)` (waiting on `authReady` first) and redirects to `/admin` otherwise — the client-side guard is UX only; the real boundary is Postgres RLS + the RPCs' `is_admin()` checks. `ProtectedMember` additionally bounces anyone whose `profile.username` is null to `/bienvenida`; `redeem_keyword` enforces the same rule server-side (reason `no_username`), since a route guard alone would not stop a direct visit to `/canjear`. `/auth/callback` (`AuthCallback.tsx`) is where every Google redirect lands — it claims the Google bonus, then routes to `/bienvenida`, a resumed `/canjear`, or `next`.

**`/bienvenida` is the whole signup form, not just a nickname picker.** It collects the three things Google cannot supply and the account is useless without: the nickname, the WhatsApp number, and explicit consent to be messaged. All three are mandatory and land in one `complete_signup` call, so a taken nickname can never end up on an account with no number. Consent is required to create the account but stays revocable from `/perfil` afterwards — the privacy notice in `/terminos` promises that, and Mexican data-protection law requires it. Note this screen already sees real drop-off, so anything added here costs signups.

**Two independent auth entry points:** `src/pages/Login.tsx` (standalone login, Google first and the legacy password form below it) and the auth step embedded inside the multi-step flow of `src/pages/Redeem.tsx` (`keyword` → `choice` → `auth` → `success`), which exists only to finish an in-flight redemption. Both call the same store `login` action and render the same `GoogleButton`; keep them in sync if auth behavior changes. `Redeem`'s "Inicia sesión primero" shortcut deliberately links to `/login` rather than rendering a third variant inline — someone who wants to sign in without redeeming should get the real login screen, with both methods on it.

**The OAuth `redirectTo` must never carry a query string.** Supabase matches it against the Redirect
URLs allow-list by comparing the *whole* URL, query string included, so a `?next=...` fails to match an
exact allow-list entry. GoTrue then silently discards the `redirect_to` and falls back to the Site URL,
which is production — the symptom is a local login landing on the live site. `oauthRedirectTo()` in
`store.ts` therefore returns a bare `<origin>/auth/callback`, and anything that must survive the round
trip goes through `sessionStorage`: `src/lib/authIntent.ts` for the post-login destination, and
`src/lib/pendingRedeem.ts` for an in-flight redemption. That module pair is also why `AuthCallback`
takes no `next` parameter from the URL, which removes the open-redirect surface entirely.

**Any change of origin breaks the match the same silent way**, and the symptom never varies: a local
login lands on the live site. A dev server drifting to port 3001 does it, hence `strictPort: true`.

**Supabase also rejects any `http://` destination whose host is not `localhost` or `127.0.0.1`, even
when that exact URL is in the allow list.** This was verified directly against the project: of four
allow-listed URLs, `http://localhost:3000/auth/callback`, `http://127.0.0.1:3000/auth/callback` and
`https://heladosmados.com/auth/callback` were accepted while `http://192.168.1.80:3000/auth/callback`
was rejected. So opening the dev server from a phone over the LAN IP can never work, and adding that
IP to the allow list does nothing — `npm run phone` is the answer instead (see below).

Because the failure leaves no trace in the browser, `vite.config.ts` carries a plugin that prints, on
every `npm run dev`, which of the origins it serves are actually usable and which are not. To confirm a
suspicion from the server side, `auth.flow_state.referrer` stores the destination GoTrue *resolved* for
each attempt: the allow-listed URL means accepted, the bare Site URL means rejected and fell back.

**`npm run phone` (`scripts/phone-link.mjs`) is how the app gets tested on a real phone.** It uses
Android wireless debugging: it locates `adb` (which winget installs *without* putting on the PATH),
discovers the phone over mDNS, connects, and runs `adb reverse tcp:3000 tcp:3000` so the phone's own
`localhost:3000` points at this machine's dev server. The phone then browses to `http://localhost:3000`
— an origin Supabase accepts. Pairing is once per phone (`npm run phone -- --pair <ip:port> <code>`,
and the phone's pairing screen must stay open while it runs, or `adb pair` dies with `protocol fault`).

That also fixes a second problem for free: a LAN-IP origin is not a secure context, so `crypto.subtle`
is gone (PKCE quietly downgrades from `s256` to `plain`) and `getUserMedia` is blocked outright.
Reaching the phone through `localhost` restores both, so the QR scanner's camera works there.
`AdminScanner` still checks `window.isSecureContext` up front and points at its manual-UUID fallback,
because the raw camera failure reads as a permissions problem and sends you hunting in the wrong place.

One more: the PKCE `code` is single-use, so reloading a spent callback URL yields
`flow_state_already_used` — that is the link being used twice, not a bug.

**The OAuth redirect destroys the state of `Redeem`.** `keyword` and `step` live only in React state, so `src/lib/pendingRedeem.ts` stashes the keyword in `sessionStorage` before the browser leaves for Google; `AuthCallback` routes back to `/canjear` and `Redeem` rehydrates and finishes the redemption on its own. Anything new that sends a user through OAuth mid-flow needs the same treatment.

**Admin flow:** `AdminLogin.tsx` → `AdminDashboard.tsx` (manage `Dynamic` campaigns via `addDynamic`/`updateDynamic`/`deleteDynamic`) and `AdminUsers.tsx` (browse `profiles` via `fetchAllProfiles`) → `AdminScanner.tsx` (camera-based QR scanning via `html5-qrcode`, calls `scanCoupon`). The scanner has a manual UUID-entry fallback (`<details>` block) for testing without a camera/second device.

**Styling:** Tailwind with a custom brand palette (`brand.navy/coral/lemon/cream/mint/pink`) defined in `tailwind.config.ts`, plus shared component classes (`.btn-coral`, `.btn-navy`, `.glass-card`, `.field-input`, `.qr-card`, `.points-chip`, etc.) defined in `src/index.css` under `@layer components`. Prefer these existing classes over ad hoc utility strings when building new UI. `cn()` in `src/lib/utils.ts` (clsx + tailwind-merge) is the standard way to compose conditional class names.

**UI copy is in Spanish** (user-facing strings, error messages, route paths like `/canjear`, `/cuenta`, `/terminos`) — match this when adding new user-facing text.

**Points economy:** +1 point for digital keyword redemption, +10 for physical in-store redemption (QR scan), plus two one-time onboarding bonuses of +5 — completing the profile (`update_my_profile`) and linking Google (`claim_google_bonus`), each guarded by its own `*_bonus_awarded` flag. All of it is enforced server-side in the RPCs and duplicated in `get_leaderboard` and UI copy — keep them consistent if the economy changes, and remember a migration is required (client-only edits will not touch enforcement).

Note one deliberate asymmetry: `get_leaderboard('all')` reads `profiles.total_points`, so the +5 bonuses count there, while the `day`/`week`/`month` branches sum from `coupons` and therefore exclude them. That is intended — those periods measure activity in the window, not balance.
