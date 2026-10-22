Objective: Build Phase 2 of the MOSAPRO territorial health survey platform — React Native (Expo) Android offline-first app (`android-app/`) with Field Surveyor Tray ("Modo Relevador en Terreno"), step-by-step local persistence, automatic online background sync (`NetInfo` + step/interval triggers) against the Phase 1 REST API v1 (`/api/v1/survey`, `/api/v1/sync/responses`, `/api/v1/sync/contacts`), dynamic question/options/modality support, and unlinked contact registration.
Branch: main | Delivery strategy: single-pr | Test runner: npm test (vitest)

## Specs

- **S1 (Stack & Project Structure):** "React Native (Expo) en carpeta /android-app (Recomendado)" interacting with the Phase 1 backend (`GET /api/v1/survey`, `POST /api/v1/sync/responses` with `sourcePlatform: "android"`, `POST /api/v1/sync/contacts` with `sourcePlatform: "android"`).
- **S2 (Field Surveyor Mode + Automatic Online Sync):** "opcion 1 pero que vaya haciendo sync online cuando conecte" — Home screen with Field Surveyor Tray ("Modo Relevador en Terreno": shows pending/in-progress/synced counts, default Región Sanitaria selector, configurable backend server URL defaulting to port `3082`, manual "Sincronizar ahora" button, and "Nueva encuesta" / "Continuar encuesta en curso" actions) PLUS automatic background synchronization whenever connectivity is available or restored (`NetInfo` listener + automatic sync on every step advance "Siguiente"/"Anterior" and on final submit).
- **S3 (Full Survey Flow Parity & Dynamic Schema):**
  - Downloads and caches the active `SurveySchema` (v2+ including admin edits to questions, options, and modalities `single_choice`, `multi_choice`, `short_text`, `long_text`) and catalogs (12 Regiones Sanitarias + 135 PBA Municipalities + 20 Hospital Services).
  - Supports **Sección 0** (mandatory consent; "No" terminates without saving), **Sección 1** (`primer_nivel` -> 2A, `hospital` -> 2B, `comunitario` -> 2C, `gestion_sanitaria` -> 2D), **Secciones 2A / 2B / 2C / 2D** (including `¿Cuál?` specifier on `otra`/`otro`, `Gestión Nacional/Provincial/Municipal`, and filterable + free-text Hospital Services combobox in 2B.3), **Sección 3** (Región Sanitaria I-XII, 135 PBA Municipalities search/autocomplete filtered by region, Antigüedad), **Sección 4** (touch-optimized 1° to 5° priority ranking across the 13+ themes, `+ Agregar otra temática` requiring both title and description, non-blocking dynamic 1°/2°/3° Problem + Proposal pairs, optional open theme 4.5, and zonal relationship 4.6), and **Sección 5** (`interesaMesa` conditional 5.2-5.5).
- **S4 (Unlinked Contact Form in Android App):** After finishing a survey (or directly from the home tray), allows opening the unlinked Contact Form (`ContactSubmissionPayload` without any link to the anonymous survey UUID), queuing it locally if offline and auto-syncing to `/api/v1/sync/contacts` when online.
- **S5 (MOSAPRO Brand Identity & Assets):** Official MOSAPRO palette (`#567c7f` primary teal, `#b99e93` warm earth, `#f3f6f7` surface), official MOSAPRO logo/icon (`logo-mosapro.png`) configured for Expo Android adaptive icon and header.

## Tasks

- **T1** [S1, S2, S3, S4] (inline — shared core & tests) — Create Android offline storage & auto-sync engine (`android-app/src/sync/offlineStore.ts`) + catalog/validator modules and unit tests (`tests/android-sync.test.ts`) verifying offline queueing, step-by-step draft updates, and automatic online batch flush — `done` (RED/GREEN `tests/android-sync.test.ts` 2/2 passed)
- **T2** [S1, S2, S3, S4, S5] (inline — Expo app & UI screens) — Scaffold `android-app/` (`package.json`, `app.json`, `eas.json`, `tsconfig.json`, `App.tsx`) with MOSAPRO branding, Field Surveyor Home Tray (`HomeScreen.tsx`), full step-by-step `SurveyScreen.tsx` (with auto-sync on step & connectivity restore), and unlinked `ContactScreen.tsx` — `done` (commit `2fba537`, verified `npx tsc --noEmit` + `npm test` 21/21 passed)

## Log

- **L1 (2026-10-22):** User requested Phase 2:
  "bien continuemos la dase 2"
  Clarifications:
  1. Stack Android: "React Native (Expo) en carpeta /android-app (Recomendado)"
  2. Modo Campo: "opcion 1 pero que vaya haciendo sync online cuando conecte" (Modo Relevador en Terreno con bandeja offline + sincronización automática en segundo plano apenas haya o recupere conexión).
- **L2 (2026-10-22):** Fixed `npm run start` in `android-app/` (added missing `expo-asset`, `metro.config.js` with `watchFolders` for shared contracts, and `babel.config.js`; verified `Android Bundled 568 modules` via `expo export --platform android`) and updated root `package.json` `start` script to compatible standalone server runner.
- **L3 (2026-10-22):** Upgraded `android-app/` from Expo SDK 52 to **Expo SDK 58** (`expo@~58.0.17`, `react@19.3.0`, `react-native@0.88.0`, `expo-asset@~58.0.18`, `expo-status-bar@~58.0.4`, `@react-native-async-storage/async-storage@2.2.0`, `@react-native-community/netinfo@12.0.1`, `babel-preset-expo@~58.0.10`) and verified clean Android Hermes bundle (`Android Bundled 3133ms (576 modules)`).
