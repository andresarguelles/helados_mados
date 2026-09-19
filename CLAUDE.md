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
- `profiles` — one row per `auth.users` row (`id` FK, `username` citext unique **but nullable**, `total_points`, `is_admin`, plus the profile fields `first_name`/`last_name`/`birthdate`/`phone`/`email`/`avatar_url`/`whatsapp_opt_in`(+`_at`), `age_confirmed_at`, and the one-shot bonus flags `profile_bonus_awarded`/`google_bonus_awarded`). Two `auth` triggers feed it: `handle_new_user` (AFTER INSERT ON `auth.users`) creates the row, and `handle_identity_linked` (AFTER INSERT ON `auth.identities`) fills `email`/`first_name`/`last_name`/`avatar_url` from a Google identity. **`username` is null until the user finishes signing up at `/bienvenida`** — an OAuth signup has no username to offer, which is why the column had to become nullable. **`profiles.email` is only ever written by `handle_identity_linked`**: there is no client-facing path to it, and that is what guarantees every stored email is Google-verified.
- `dynamics` — the redeemable "keyword campaigns" (`keyword`, `starts_at`/`ends_at`, `physical_stock`, `physical_redeemed`); a DB exclusion constraint (`dynamics_no_overlapping_keyword`, surfaced as Postgres error `23P01`) prevents two active dynamics from sharing a keyword over overlapping date ranges
- `coupons` — one per user per dynamic, `status` (`active`/`redeemed`/`expired`), `digital_awarded`/`physical_awarded` flags
- `ip_redemption_logs` — `(ip_hash, dynamic_id)` counter capping redemptions per IP per dynamic at 3; only a salted SHA-256 hash of the IP is ever stored (see the edge function below), never the raw IP
- RPCs (all `security definer`, executed via `supabase.rpc(...)` from the store): `redeem_keyword` (validates the active dynamic, enforces one-coupon-per-user-per-dynamic and the IP cap, awards +1 point, inserts the `Coupon`), `scan_coupon` (admin-only via `is_admin()`; validates coupon status/expiry/stock, marks it redeemed, awards +10 points, increments `physical_redeemed`), `get_leaderboard(period)` (`'all'` sorts by `profiles.total_points`; `'day'`/`'week'`/`'month'` instead sum points from coupons created within the cutoff window — digital=1, physical=10 — so per-period rankings can differ from all-time. **It returns `username`, `points` and `es_tu_fila` — never the user's UUID.** It is granted to `anon` for the public Top 5, so returning the id published every account's internal identifier to anyone; `es_tu_fila` is computed server-side against `auth.uid()` and wrapped in `coalesce(..., false)`, because a bare `id = null` yields NULL, and Kotlin throws when deserialising null into a non-nullable Boolean), `username_available`, `is_admin()`, `complete_signup` (the whole account creation in one transaction — username, phone, age declaration and legal acceptance together; it refuses if the username is already set, so it cannot double as a rename tool, and it rejects any legal version it does not recognise), `update_my_profile` (the only way a user writes their own profile; **takes no email parameter on purpose** and never touches `total_points`/`is_admin`/`username`; awards a one-time +5 when name, last name, birthdate and phone are all filled), `claim_google_bonus` (one-time +5, verified against `auth.identities` rather than trusting the client)
- `legal_versions` / `legal_acceptances` (migration `0022`) — which version of each legal document has been published, and who accepted what and when. `legal_acceptances` has **no FK to `profiles` on purpose**: it is the proof that consent existed, so it must survive account deletion. If it cascaded, deleting an account would destroy exactly the evidence. What is left is an orphan UUID that no longer resolves to anyone — the *bloqueo* the law contemplates, and the privacy notice declares it.
- `supabase/functions/redeem-keyword/index.ts` — it's a thin wrapper that authenticates the caller (forwards their JWT), reads the request's `x-forwarded-for` IP, hashes it with a server-side pepper (`IP_HASH_PEPPER` secret), and calls the `redeem_keyword` RPC with that hash. The client never computes or sees the IP hash.
- `account_deletions` (migration `0028`) — the log of deletions **executed by staff**. Self-deletion is deliberately **not** logged: the holder acted themselves, the act is the request, and there is no third party to defend against; keeping the UUID of someone who asked to disappear would be retention without a purpose. Neither uuid column has an FK, for two different reasons — `user_id` points at someone just deleted, and an FK on `executed_by` would let an admin's own deletion destroy the record of everything they did. The `via` vocabulary names the *grounds*, not the actor (`admin_a_peticion`, `admin_prueba`), leaving room for the `admin_sancion` that the terms already contemplate.
- `supabase/functions/delete-account/index.ts` — account deletion, the ARCO right of Cancellation and a hard Google Play requirement. It needs the service role to delete from `auth.users`, and that key cannot live in Postgres within reach of a client-invocable function. **Who is being deleted comes from the JWT, never from the body** — accepting an id from the client would turn it into a delete-anyone endpoint by changing one field. It also requires an exact confirmation string (insurance against a miswired client, not security) and refuses admins, since an admin who deletes themselves leaves the shop with nobody to scan coupons.
- `supabase/functions/admin-delete-account/index.ts` — the same deletion, executed by staff when someone asks by email. **A sibling function and not a branch inside the other one, on purpose.** `delete-account`'s invariant is not a promise but a property of its shape: there is no parameter through which a victim can enter, verifiable by reading the file. Adding an admin branch would make that depend on an `if` staying in the right order forever — in the endpoint every client invokes with any user's JWT. Here the invariant is stated differently: the victim comes from the body because there is no other way, but **who executes comes from the JWT and never from the body**, which is exactly what the log has to be able to assert. Business rejections return **200** with `{success:false, reason}`, following `redeem-keyword`, because `functions.invoke` swallows 4xx bodies and the admin needs the actual reason on screen. The confirmation is **the target's typed nickname**, not a fixed string: that makes the check depend on who is being deleted, so a client dragging a stale id cannot delete the wrong person.

**`profiles.phone` is write-once and unique.** A partial unique index (`profiles_phone_key`, `where phone is not null`) stops one person registering several Gmail accounts against the same number to farm points off a single Live; `update_my_profile` returns `phone_immutable` for any later change, including clearing it. Legacy cadets have no phone yet, so they can still add one from `/perfil` — and it locks from then on. Corrections go through an admin, by design.

**What counts as a valid phone lives in `public.phone_is_valid()` (migration `0021`), and nowhere else on the server.** The CHECK `profiles_phone_valid`, `complete_signup` and `update_my_profile` all call it, so the rule cannot drift between them. It is a whitelist by dialing code — today only `+52` followed by exactly 10 digits, the first of which must be 2-9 (no Mexican area code starts with 0 or 1, which also rejects the obsolete `+521` mobile prefix WhatsApp still displays). Adding a country is one `when` branch. Beware that a CHECK calling a function does **not** re-validate stored rows when the function changes: widening is safe, tightening needs a manual `validate constraint`.

The client mirror is `PHONE_COUNTRIES` in `src/lib/phone.ts`, consumed by the shared `PhoneField` component that both `/bienvenida` and `ProfileDataModal` render — **the two definitions change together**, and like the points economy, editing only the client changes nothing that is actually enforced. `PhoneField` keeps the dialing code as a fixed prefix and takes only the national digits, because the previous single free-text field made `+52` plus 9 digits indistinguishable from a valid number — that is exactly how one got stored. `phone.ts` also strips the stray leading `1` of a pasted `+52 1 ...`, since rejecting it would read as a bug; the server stays strict and only ever stores the canonical 10.

**Client state: `src/lib/store.ts`.** A Zustand store that's a thin async wrapper over Supabase — it holds `profile`, `isAdmin`, `authReady`, `identities`, `hasPassword`, `dynamics`, `coupons`, `profiles`, and calls out to Supabase Auth / Postgres / the edge function for every action (`login`/`logout`, `signInWithGoogle`/`linkGoogle`/`unlinkGoogle`, `completeSignup`/`updateMyProfile`/`setPassword`, `fetchDynamics`, `addDynamic`/`updateDynamic`/`deleteDynamic`, `redeemKeyword`, `scanCoupon`, `getUserCoupons`, `getLeaderboard`, `getLegalStatus`/`acceptLegal`, `deleteMyAccount`). Nothing is persisted to `localStorage` — `initAuth()` restores session state on load via `supabase.auth.getSession()`/`onAuthStateChange()`, so real auth state (not a mock store) is the source of truth across reloads.

**Auth: new accounts are Google-only; password login survives for legacy users.** Signup with a password is gone from the client *and* locked server-side — but by the `before_user_created` auth hook (migration `0020`, `public.hook_google_only_signup`), **not** by any dashboard toggle. The hook rejects any user creation whose `app_metadata.provider` is not `google`, and it only ever runs when a user is about to be created, so it leaves `signInWithPassword`, `linkIdentity()` and `setPassword()` untouched. There is no username/password table: `usernameToEmail()` in `store.ts` maps a username to a synthetic email (`<username>@accounts.helados-mados.app`) because GoTrue requires an email and rejects reserved test TLDs.

**Three auth settings in the hosted dashboard must stay ON, and two of them were once turned off with the whole login as collateral.** *Enable Email provider* is how all 175 legacy cadets sign in — turning it off does not merely close email signup, it makes GoTrue reject `signInWithPassword` outright with `422 email_provider_disabled`, before it ever looks at the password. The global *Allow new users to sign up* is instance-wide, not per-provider: off, it also kills brand-new Google signups with `422 "Signups not allowed for this instance"` at `/callback`, which fails silently in the UI and costs signups every Live. *Allow manual linking* is what lets a legacy cadet keep their points. The same trap is spelled out in `supabase/config.toml`, whose `[auth.email] enable_signup` maps to `external_email_enabled` (the *Enable Email provider* toggle) — so a `supabase config push` with it set to `false` locks the legacy cadets out again.

Diagnosing this class of bug: the client sees only a generic failure, so read `auth_logs` instead — `select log_attributes['error'] from logs where source = 'auth_logs' and log_attributes['path'] in ('/token','/callback')`. `login` in `store.ts` does single out `email_provider_disabled` as `reason: 'provider_disabled'`, and `loginErrorMessage()` (exported from the same file, shared by `Login.tsx`, `Redeem.tsx` and `AdminLogin.tsx`) says so instead of blaming the password.

Two kinds of primary email now coexist: the synthetic one for legacy cadets, and a real Gmail for anyone born through Google. So **the login field accepts a nickname *or* an email** — `toLoginEmail()` passes anything containing `@` straight through and synthesizes the rest. A Google-native user who sets a password via `setPassword()` therefore signs in with their *email*, not their nickname; the password modal says so explicitly, because that is the single most confusing part of the flow.

A legacy cadet links Google from `/perfil` via `linkIdentity()` (needs Manual Linking enabled in the dashboard), which attaches the identity to the *same* `auth.users` row, so points and coupons are preserved. **Beware the reverse order:** a legacy cadet who signs in with Google *before* linking gets a brand-new empty account, because Supabase automatic linking matches on email and a synthetic address never matches a Gmail. `/login` and `/bienvenida` both carry warnings about this; there is no clean technical fix.

`profiles.is_admin` (not a Supabase Auth role) is what `ProtectedAdmin` and the RPCs' `is_admin()` check gate on.

**Data model & types: `src/lib/types.ts` + `src/lib/database.types.ts`.** `database.types.ts` is the generated Supabase schema (regenerate with the Supabase CLI/MCP after any migration); `types.ts` derives the app-level `Profile`/`Dynamic`/`Coupon` types from it.

**Routing: `src/App.tsx`.** Plain `react-router-dom` `BrowserRouter`. Admin routes (`/admin/dashboard`, `/admin/scanner`, `/admin/users`) are wrapped in a local `ProtectedAdmin` guard that checks `useStore(s => s.isAdmin)` (waiting on `authReady` first) and redirects to `/admin` otherwise — the client-side guard is UX only; the real boundary is Postgres RLS + the RPCs' `is_admin()` checks. `ProtectedMember` additionally bounces anyone whose `profile.username` is null to `/bienvenida`; `redeem_keyword` enforces the same rule server-side (reason `no_username`), since a route guard alone would not stop a direct visit to `/canjear`. `ProtectedMember` also wraps its children in `LegalGate`, which blocks on a pending legal version. It sits **inside** the guard rather than around the routes so `/terminos` and `/privacidad` stay reachable while the gate is up — otherwise it would be asking people to accept blind. If the status query fails it does **not** block: this is a legal requirement, not a security control, and bricking the app over a network blip is far worse than showing a new version late. `/terminos`, `/privacidad` and `/eliminar-cuenta` are public and unguarded on purpose: the notice has to be readable before an account exists, and Google Play requires a deletion URL reachable without installing the app.

`/auth/callback` (`AuthCallback.tsx`) is where every Google redirect lands — it claims the Google bonus, then routes to `/bienvenida`, a resumed `/canjear`, or `next`.

**`/bienvenida` is the whole signup form, not just a nickname picker.** It collects the nickname, the WhatsApp number, a declaration of being 18+, and acceptance of the two legal documents. All of it lands in one `complete_signup` call, so a taken nickname can never end up on an account with no number, and no account can exist without a record of which text its owner accepted. Note this screen already sees real drop-off, so anything added here costs signups.

**Two checkboxes, and the split between them is the whole point.** The first bundles *18 años cumplidos* with *accepting both documents* — both are contract terms, neither is separable. The second, permission to message you on WhatsApp, is separate and **optional**: it is data processing for advertising, and until migration `0023` it was mandatory to create an account. That made the consent not *free* in the sense of LFPDPPP art. 2, and a consent that is not free is not consent — it would have dragged the whole privacy notice down with it. `complete_signup` no longer returns `consent_required`; it returns `age_required`, `legal_required`, `legal_incomplete` and `unknown_version` instead. **Never re-bundle the WhatsApp checkbox with anything mandatory.**

The `aviso de privacidad simplificado` renders right above the checkboxes, at the point of collection, where Mexican law wants it. It comes from the same source as `/privacidad`, so it cannot drift from it.

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

**Legal text: `legal/*.md` is the single source, and it feeds BOTH repos.**

There are two documents — Términos y Condiciones and Aviso de Privacidad — plus an `aviso simplificado` marked `rol=simplificado` inside the privacy one. Mexican law treats the privacy notice as a separate instrument from the terms, which is why `/privacidad` exists as its own route.

The Markdown is never rendered: it is **compiled**. `scripts/lib/legal.mjs` parses a closed grammar (specified in `legal/README.md`) into an AST, and emits TypeScript here (`src/content/legal/generated/`) and Kotlin into the Android repo, plus a `legal.lock.json` that must be byte-identical in both roots. Neither platform has a Markdown parser and Android's version catalogue is frozen, so a structured AST was the only option; Markdown is just the authoring format, chosen so the `git diff` of a legal change reads as prose.

- `npm run legal:build` regenerates both repos. `npm run legal:check -- --cross` verifies. `prebuild` runs the check before every production build.
- **Never edit anything under a `generated/` directory.** Change the `.md`, bump `version`, regenerate. The checker fails loudly if you don't.
- **`:::alcance web|android` labels a block, it never hides it.** A `web` block still renders on Android, with a pill saying it doesn't apply there. That is what makes the hash mean something: with filtering, it would only prove the platforms agree on the parts each chose to show. The parser rejects any hiding syntax.
- The scope pill paints only when the scope **changes** from the previous block — a `:::alcance` fence flattens over several paragraphs, and without that rule the cookies section showed three identical pills. It is presentation derived from the AST, mirrored in both renderers. **Change it in one, change it in the other.**
- Both renderers are exhaustive by compiler: `const _exhaustive: never` in TypeScript, `when` as an expression over a sealed interface in Kotlin. The hash proves the data is identical; this proves both sides paint all of it.
- Publishing a version means seeding `legal_versions` with its `(doc_id, version, ast_hash)` — the generator prints the `insert`. **This is not the last step, it is a prerequisite**: `complete_signup` rejects any version it cannot find, so an unseeded version breaks every signup.
- `prebuild` refuses to build while the text still contains `«PENDIENTE: ...»` markers. They render literally on the page, and a notice that doesn't identify the responsable doesn't comply. `npm run dev` still works; `LEGAL_PERMITIR_PENDIENTES=1` is the escape hatch.

The Android repo's path is resolved via `.legalrc.json` (or `--android`, or `MADOS_ANDROID_REPO`). `.gitattributes` pins the legal files to LF in both repos, because the lock is compared byte for byte and the hashes are computed over LF.

**Cookies and analytics.** GA4 is no longer in `index.html`: `src/lib/analytics.ts` loads the tag lazily and only after consent, so with a clean `localStorage` there are zero requests to Google. Consent Mode v2 was rejected because it still downloads the tag while denied, and the privacy notice promises the tool only loads if you accept — a promise that has to be checkable in the Network tab.

**UI copy is in Spanish** (user-facing strings, error messages, route paths like `/canjear`, `/cuenta`, `/terminos`, `/privacidad`, `/eliminar-cuenta`) — match this when adding new user-facing text.

**Points economy:** +1 point for digital keyword redemption, +10 for physical in-store redemption (QR scan), plus two one-time onboarding bonuses of +5 — completing the profile (`update_my_profile`) and linking Google (`claim_google_bonus`), each guarded by its own `*_bonus_awarded` flag. All of it is enforced server-side in the RPCs and duplicated in `get_leaderboard` and UI copy — keep them consistent if the economy changes, and remember a migration is required (client-only edits will not touch enforcement).

Note one deliberate asymmetry: `get_leaderboard('all')` reads `profiles.total_points`, so the +5 bonuses count there, while the `day`/`week`/`month` branches sum from `coupons` and therefore exclude them. That is intended — those periods measure activity in the window, not balance.
