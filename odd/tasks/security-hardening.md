Objective: Fix the security review findings 1-8 and 10 for the MOSAPRO web app and Android app (finding 9 accepted as intended: validated collaborators may export and edit the survey).
Branch: fix/security-hardening | Delivery strategy: single-pr | Test runner: npm test (vitest)

## Specs

- **S1 (#1 first-user admin race):** keep "el primer regiistro genera un usuario admin que luego seguira validando el resto de los usuarios." (L4 of phase 1) but make the first-user check and insert atomic so concurrent registrations on an empty table cannot create two admins.
- **S2 (#2 AUTH_SECRET):** session tokens must be signed only with a dedicated `AUTH_SECRET` (min 32 chars); no fallback to `DATABASE_URL` or a hardcoded default. (adopted staged change)
- **S3 (#3 timing-safe signature):** session token HMAC signature comparison must be constant-time and must not throw on length mismatch.
- **S4 (#4 response overwrite):** a completed survey response can no longer be overwritten through the public sync endpoint; replays are acknowledged as duplicates; drafts may still be updated. (adopted staged change)
- **S5 (#5 predictable ids, Android):** Android `clientSubmissionId` values for surveys and contacts must come from a cryptographically secure UUID generator, not `Date.now()` + `Math.random()`.
- **S6 (#6 formula injection):** exported CSV/XLSX cells starting with `=`, `+`, `-`, `@`, tab or carriage return are neutralized. (adopted staged change)
- **S7 (#7 public sync abuse):** public sync endpoints enforce per-IP rate limiting (adopted), a per-request item cap whose overflow stays in the client queue (adopted), and a maximum request body size (HTTP 413).
- **S8 (#8 Android PII at rest):** pending contact submissions (nombre, telefono, email, comentarios) are not stored in plain `AsyncStorage`; they go to encrypted device storage (`expo-secure-store`).
- **S9 (#10 cookie Secure flag):** the admin session cookie set by login and register carries `Secure` in production.
- **S10 (adopted extras):** login/register rate limiting, internal errors not leaked to clients, `xlsx` moved to the maintained SheetJS 0.20.3 build.

## Tasks

- **T1** [S2, S4, S6, S7, S10] (inline — adopt staged changes of unknown origin approved by user) — review and verify the pre-staged hardening — `done` (commit `1bfc94d`; tsc 0, suite 27/27)
- **T2** [S1, S3, S7, S9] (inline — small web changes) — atomic first admin, constant-time signature check, body size limit, Secure cookie — `done` (commit `cdb51bc`; RED 5 failing in `tests/security-web.test.ts` → GREEN 7/7, tsc 0, suite 38/38; S3 had no meaningful RED (behaviour already rejected tampered tokens, change is constant-time comparison); S1 race not unit-tested: needs an empty users table, verified by code (transaction + `pg_advisory_xact_lock`) and existing `tests/admin-auth.test.ts` still green)
- **T3** [S5, S8] (delegated `gentle-ai-worker` — context backstop) — Android secure UUIDs and encrypted pending-contact storage — `done` (commit `c407a44`; worker RED 3 failing → GREEN 6/6, android tsc 0, Android export 651 modules; parent added `expo-secure-store` plugin and removed `StatusBar backgroundColor` prop rejected by SDK 58 types)

## Log

- **L1 (2026-10-22):** User: "quiero que corras una revision de seguridad de la app web y android de este repositorio" → read-only review produced findings 1-19.
- **L2 (2026-10-22):** User decisions: "1 si 2 si 3 puede" — admin already registered in production; fix findings 1-8 and 10; collaborators may export and edit (finding 9 not a defect).
- **L3 (2026-10-22):** Found pre-staged hardening of unknown origin (AUTH_SECRET required, completed responses immutable, formula neutralization, rate limiting, batch cap, xlsx 0.20.3, tests/security.test.ts). User chose "Sí, adoptarlos y completar lo que falta". `.planning/` unstaged from the commit.
- **L4 (2026-10-22):** Delivery: single PR for branch `fix/security-hardening` (commits `1bfc94d`, `c407a44`, `cdb51bc`); branch exceeds ~400 authored lines because it holds three independent hardening units. Finding 9 not changed per user decision. Residual risks: draft responses can still be updated by anyone holding the draft id (now an unguessable UUID); rate limiting is in-memory per container; `SERVER_URL` still accepts http; CORS `*` and security headers (findings 16-17) not addressed.
