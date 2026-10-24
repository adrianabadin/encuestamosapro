Objective: Add "Instituciones educativas" to Section 1 with an inline cascade (nivel → jurisdicción → rol), and in Región sanitaria add a tooltip with the municipalities of each region plus a "No califica" option (municipio becomes free text). Web and Android.
Branch: feat/educativas-region (from fix/security-hardening) | Delivery strategy: single-pr | Test runner: npm test (vitest)

## Specs

- **S1 (Section 1 option + cascade):** "quiero que agreguemos en las opciones de seccion 1 La Opcion de Instituciones Educativas de los 3 niveles(primario,secundario,terciario y universitario) y de las 3 jurisdicciones (municipal,provincial, nacional) quiero que las subopcionnes aparezcan dependiendo lo que se va seleccionando". User decision: "En la misma Sección 1, en cascada" — choosing «Instituciones educativas» reveals Nivel; choosing a nivel reveals Jurisdicción; choosing a jurisdicción reveals Rol; then Siguiente goes straight to Sección 3 (no Section 2 branch).
- **S2 (Rol):** user decision "Sí, agregar rol" — options: Docente, Directivo/a, Equipo de orientación escolar, Auxiliar / no docente, Estudiante, Otro (opens «¿Cuál?», required).
- **S3 (Región tooltip):** "que en las parte donde se selecciona la region sanitaria que 1) tenga un tooltip que diga que ciudades corresponden" — each Región sanitaria option shows which municipalities belong to it.
- **S4 (No califica):** "2) que se agregue la opcion no califica". User decision: "Municipio pasa a texto libre" — with «No califica» the municipio question becomes a required free-text field (localidad) instead of the PBA list.
- **S5 (Data, export, admin):** the new answers are stored, validated, exported to CSV/XLSX and counted in the admin stats like the other Section 1/2 branches.

## Contract (shared by web and Android)

- `mainLocation` new value `"institucion_educativa"`, label «Instituciones educativas». `MainLocationType` includes it; `getActiveSectionIds("institucion_educativa")` → `["S0","S1","S3","S4","S5"]`.
- Payload field `sectionEducativa?: { nivel: "primario"|"secundario"|"terciario"|"universitario"; jurisdiccion: "municipal"|"provincial"|"nacional"; rol: string; rolOtro?: string }`; required (all three, plus `rolOtro` when `rol === "otro"`) only when `mainLocation === "institucion_educativa"` and `isComplete !== false`.
- Schema questions in section S1, each with `condition: { dependsOnQuestionId: "q_main_location", allowedValues: ["institucion_educativa"] }`: `q_1e_nivel` (code 1.2), `q_1e_jurisdiccion` (1.3), `q_1e_rol` (1.4, specifyLabel «¿Cuál?», option `otro` requiresSpecify). Option values: nivel `primario|secundario|terciario|universitario`; jurisdicción `municipal|provincial|nacional`; rol `docente|directivo|equipo_orientacion|no_docente|estudiante|otro`.
- Región: new value `"no_califica"`, label «No califica», exported as `REGION_NO_CALIFICA` from `src/lib/catalog/pba-municipios.ts`. When selected, municipio is free text (still required).
- `DEFAULT_SURVEY_SCHEMA.version` → 3.
- Export columns: `S1E_Nivel_Educativo`, `S1E_Jurisdiccion`, `S1E_Rol`, `S1E_Rol_Otro`.

## Tasks

- **T1** [S1, S2, S3, S4, S5] (inline — gentle-ai-worker unavailable: "No API key found for xiaomi-token-plan-sgp"; user said "continua") — shared contract (schema, validator, flow-helpers, catalog constant), web wizard (cascade, region tooltip, No califica + free-text municipio), exporter, admin stats label, tests — `pending`
- **T2** [S1, S2, S3, S4] (inline — worker unavailable; after T1) — Android SurveyScreen cascade, region info + No califica + free-text municipio, contracts re-export — `pending`

## Log

- **L1 (2026-10-22):** User request: "antes de esto quiero que agreguemos en las opciones de seccion 1 La Opcion de Instituciones Educativas de los 3 niveles(primario,secundario,terciario y universitario) y de las 3 jurisdicciones (municipal,provincial, nacional) quiero que las subopcionnes aparezcan dependiendo lo que se va seleccionando y que en las parte donde se selecciona la region sanitaria que 1) tenga un tooltip que diga que ciudades corresponden 2) que se agregue la opcion no califica"
- **L2 (2026-10-22):** Decisions: "En la misma Sección 1, en cascada"; "Sí, agregar rol"; "Municipio pasa a texto libre".
- **L3 (2026-10-22):** Uncommitted privacy page (`src/app/privacidad/`, footer link in `src/app/page.tsx`) and Play icon (`android-app/store/`) belong to the previous small task; they stay out of this feature's commits.
