Objective: Build Phase 1 of the MOSAPRO territorial health survey platform (Next.js + PostgreSQL + offline-first PWA + dynamic survey schema & admin editor + unlinked contact form + Android-ready REST API).
Branch: feat/relevamiento-fase1 | Delivery strategy: single-pr | Test runner: npm test (vitest)

## Specs

- **S1 (Architecture, Offline & Phase 2 Android Readiness):** "vamos a armar un formulario web y una aplicacion de android para que se pueda completr offline y que luego se suba la informaccion a la nube cuando hay conectividad." "la fase 1 es el formulario web. la fase 2 la app de android pero deja todo preparado pra que la app de android pueda interactuar sobre el backend de la app web." "next js postgresql te voy a pasar un conection string para que puedas crear la base de datos ahi va a estr en un .env en este directorio DATABASE_URL="
- **S2 (Brand & Design Identity):** "te voy a pasar tambienn el sitio web de la institucion que va a hacer la encuesta para que tomes la paleta de colores y diseño y lo bases en eso. el sitio es https://www.mosapro.com.ar/" (Primary teal `#567c7f`, hover `#4f7478`, warm earth `#b99e93`, light surface `#f3f6f7`, Roboto typography).
- **S3 (Section 0 - Mandatory Consent):** "Sección 0. Consentimiento (obligatoria) 1. «Tu participación es voluntaria y anónima. No pedimos tu nombre. Las respuestas se analizan en forma agregada y solo las ve el equipo de sistematización del MOSAPRO. ¿Aceptás participar?» Sí, acepto / No (si responde No, el formulario termina)."
- **S4 (Section 1 - Main Task Location & Routing):** "Sección 1. ¿Dónde realizás tu tarea principal? (define a qué sección pasa cada persona) 1. Centro de salud o unidad sanitaria (primer nivel) → sección 2A. 2. Hospital municipal o provincial (segundo nivel) → sección 2B. 3. Sociedad de fomento, organización barrial, club, dispensario, CIC u otro espacio comunitario → sección 2C." + "seccion 1 Tarea principal agregar gestion sanitaria" → sección 2D ("Opción A: Crear Sección 2D 'Gestión sanitaria' + sumar 'Nacional' en 2B Hospital").
- **S5 (Sections 2A, 2B, 2C, 2D & 'Otra' Specifier):**
  - "Sección 2A. Primer nivel: 1. Tu tarea: profesional médico, otro profesional, enfermería, promotor de salud, administrativo, servicios de apoyo, otra."
  - "Sección 2B. Hospital: 1. Tipo de hospital: municipal o provincial." + "en 2b Gestion Nacional, provincial, municipal en 2b Hospital agregar un listado basico de servicios y permitir el completado manual si no lo encuentra. (osea un combo box que vaya filtrando de acuerdo lo que se va escribiendo pero que si no coincide permita dejar texto libre )" "2. Tu tarea: enfermería, técnico, administrativo, chofer, médico, otro profesional, servicios de apoyo (limpieza, mantenimiento, cocina, seguridad), otra. 3. Área o servicio donde trabajás (respuesta breve)."
  - "Sección 2C. Dispositivo comunitario: 1. Tipo de organización: sociedad de fomento, organización barrial, club, dispensario, CIC, otra. 2. Tu rol: referente o dirigente, trabajador rentado, voluntario, otro."
  - "Sección 2D. Gestión sanitaria: 1. Ámbito de gestión: Gestión Nacional, Gestión Provincial, Gestión Municipal. 2. Tu rol o función en gestión. 3. Área, dirección o programa donde trabajás."
  - User decision on "otra"/"otro": "Abrir campo de texto '¿Cuál?' (Recomendado)".
- **S6 (Section 3 - General Data & PBA Municipalities):**
  - "Sección 3. Datos generales (todos): 1. Región sanitaria (lista desplegable, I a XII). En los enlaces regionales ya viene completada. 2. Municipio (respuesta breve). 3. Antigüedad en la tarea: menos de 5 años, 5 a 10, 11 a 20, más de 20."
  - User decision on Municipio: "Buscador/Autocompletado de los 135 municipios PBA" filtered by Región Sanitaria.
- **S7 (Section 4 - Priorities, Themes & Custom Theme Button):**
  - "Sección 4. Prioridades (todos): 1. Elegí las 5 temáticas que considerás prioritarias y ordenalas de 1.° (la más importante) a 5.°. Formato: cuadrícula de opción múltiple, con las temáticas como filas y los lugares 1.° a 5.° como columnas; activar «limitar a una respuesta por columna» y desactivar «requerir una respuesta en cada fila»."
  - Themes list (13 base themes): "Fuerza laboral", "Financiamiento", "Abordajes territoriales", "Redes integradas y articulación", "Salud mental comunitaria", "Sistemas de información, vigilancia epidemiológica y ASIS participativo", "Implementación de HSI (Historia de Salud Integrada)", "Gestión de insumos y equipamiento", "Salud y educación", "Comunicación social y estrategias mediáticas", "Agroecología", plus "Infraestructura, mantenimiento y red de emergencias" and "Cuidados, género, niñez y curso de vida / discapacidad".
  - User decision on "Otra (abierta)" in 4.1: "incluir otra en la grilla como un boton para agregar un tema y obligar de caulquier manera a describirlo tanto con un titulo como con una explicacion o descripcion de lo que aboda el tema".
  - User decision on 4.1 layout: "Grilla en PC + vista adaptada táctil en móvil/Android".
  - "2. Sobre la temática que ubicaste en 1.° lugar: ¿cuál es el principal problema que ves en tu trabajo o en tu barrio? Subpregunta que propuesta tenes para eese problema en particular"
  - "3. Lo mismo para la temática que ubicaste en 2.° lugar (respuesta abierta)."
  - "4. Lo mismo para la temática que ubicaste en 3.° lugar (respuesta abierta)."
  - User decision on 4.2–4.4: "Título dinámico + 2 campos separados (Problema / Propuesta)" + "seccion 4 que la falta de problemas no sea bloqueante." (non-blocking problem/proposal fields in Section 4.2–4.4).
  - "5. ¿Hay alguna temática que no esté en la lista y debería abordarse? (respuesta abierta, opcional)."
  - "6. ¿Cómo describirías hoy la relación entre el centro de salud, el hospital y las organizaciones de tu zona? Muy buena, buena, regular, mala, no sé."
- **S8 (Section 5 - Participation & Unlinked Contact Form):**
  - "Sección 5. Participación (todos): 1. ¿Te interesa integrar una mesa de trabajo? Sí / No / Tal vez. 2. ¿Sobre qué temáticas te gustaría trabajar? (casillas, podés marcar varias, con las temáticas). 3. ¿Te ofrecés como referente de mesa? Sí / No. 4. Horarios posibles para los encuentros (podés marcar varios): mañana, mediodía, tarde, noche. 5. Modalidad preferida: virtual, presencial, mixta."
  - User decision on 5.1: "Mostrar 5.2 a 5.5 solo si responde 'Sí' o 'Tal vez'".
  - "Mensaje final: «¡Gracias! Si querés que te convoquemos a una mesa, dejanos tus datos en este otro formulario, que no se vincula con tus respuestas: [insertar enlace al formulario de contacto].»" + "el boton de ir al formulario desvinculado esta descentrado ."
  - User decision on contact form: "Crear el formulario de contacto desvinculado en la app".
- **S9 (Dynamic Question Editor, Statistics & Excel/CSV Export):**
  - "quiero quue dejes una opcion para poder editar las preguntas y agregar nuevas preguntas."
  - User decision on Admin scope: "Solo Editor de formulario + Estadísticas + Exportación Excel".
- **S10 (Progressive Step-by-Step Database Upsert & Draft Recovery):**
  - "quiero que cada una de las respuestas se vaya actualizando en la base de datos para no perder informacion. en cada siguiente que se actualice la base de datos por detras. que permita volver atras y modificar pero que si se suspende la encuetra este la informacion que se llego a cargar."

## Tasks

- **T1** [S1, S6, S7] (inline — sequential foundation) — Initialize Next.js TypeScript project, configure PostgreSQL schema & automatic seeding (survey definition, 13 themes, 12 Regiones Sanitarias & 135 PBA municipalities), and unit-test validation/catalog logic — `done` (commit `1911219`, RED/GREEN `tests/survey-schema.test.ts` 10/10 passed, DB `mosapro` auto-created and seeded)
- **T2** [S1, S3, S4, S5, S6, S7, S8, S9] (inline — depends on T1 DB layer) — Build versioned REST API (`/api/v1/survey`, `/api/v1/sync/responses`, `/api/v1/sync/contacts`, `/api/v1/admin/survey`, `/api/v1/admin/stats`, `/api/v1/admin/export`) with idempotency (`client_submission_id`) and integration tests — `done` (commit `c61a93f`, RED/GREEN `tests/api-sync.test.ts` 3/3 passed)
- **T3** [S1, S2, S3, S4, S5, S6, S7, S8] (inline — fallback after `subagent_run` refused with `Writer session Git authority changed before admission` because `git init` was run mid-session) — Build MOSAPRO-branded public survey UI with conditional routing, PBA municipality autocomplete, 11+2 theme priority grid + "+ Agregar otra temática" modal/inline builder (mandatory title + description), dynamic 1°/2°/3° problem/proposal fields, offline IndexedDB queue & auto-sync, regional URL prefill (`?region=`), and unlinked `/contacto` page — `done` (commit `fa72211`, RED/GREEN `tests/ui-flow.test.ts` 3/3 passed)
- **T4** [S9] (inline — fallback after `subagent_run` Git authority admission refusal) — Build Admin Panel (`/admin`) to edit existing questions/themes, add new questions, view real-time statistics by Región Sanitaria / nivel / temáticas, and export responses & contacts to Excel/CSV — `done` (commit `8f35da1`, `npx tsc --noEmit` + `npm test` 16/16 passed)
- **T5** [S4, S5, S7, S8, S10] (inline — iterative requirement update) — Add 'Gestión sanitaria' (S1 -> S2D), add 'Gestión Nacional, Provincial, Municipal' & filterable free-text hospital services combobox in S2B, make S4.2-4.4 problem/proposal non-blocking, implement progressive background DB upsert on every step ('Siguiente'/'Anterior' with partial draft persistence), and center the unlinked contact CTA button — `done` (commit `3a7efcf`, RED/GREEN 18/18 tests passed)

## Log

- **L1 (2025-05-14):** User original request:
  "bueno, vamos a armar un formulario web y una aplicacion de android para que se pueda completr offline y que luego se suba la informaccion a la nube cuando hay conectividad. te voy a pasar las preguntas, te voy a pasar un listado de temas y vamos a iterar primero sobre cada pregunta que modalidad va a tener . la fase 1 es el formulario web. la fase 2 la app de android pero deja todo preparado pra que la app de android pueda interactuar sobre el backend de la app web. conceptualmente es un formulario de relevamiento tiene preguntas abiertas que van luego a ser codificadas una vez que esten establecidad y un listado de tematicas que se ordennaran por interes. te voy a pasar tambienn el sitio web de la institucion que va a hacer la encuesta para que tomes la paleta de colores y diseño y lo bases en eso. el sitio es https://www.mosapro.com.ar/ Sección 0. Consentimiento (obligatoria) ... quiero quue dejes una opcion para poder editar las preguntas y agregar nuevas preguntas."
- **L2 (2025-05-14):** User clarifications and theme list:
  - Stack: "next js postgresql te voy a pasar un conection string para que puedas crear la base de datos ahi va a estr en un .env en este directorio DATABASE_URL="
  - 'Otra' option: "Abrir campo de texto '¿Cuál?' (Recomendado)"
  - Municipio: "Buscador/Autocompletado de los 135 municipios PBA"
  - Priority Grid 4.1: "Grilla en PC + vista adaptada táctil en móvil/Android"
  - P4.2–4.4: "Título dinámico + 2 campos separados (Problema / Propuesta)"
  - Section 5.1: "Mostrar 5.2 a 5.5 solo si responde 'Sí' o 'Tal vez'"
  - Unlinked contact form: "Crear el formulario de contacto desvinculado en la app"
  - Themes provided: Fuerza laboral; Financiamiento; Abordajes territoriales; Redes integradas y articulación; Salud mental comunitaria; Sistemas de información, vigilancia epidemiológica y ASIS participativo; Implementación de HSI (Historia de Salud Integrada); Gestión de insumos y equipamiento; Salud y educación; Comunicación social y estrategias mediáticas; Agroecología; plus 2 accepted additions: "Infraestructura, mantenimiento y red de emergencias" and "Cuidados, género, niñez y curso de vida / discapacidad".
  - Custom theme in 4.1: "incluir otra en la grilla como un boton para agregar un tema y obligar de caulquier manera a describirlo tanto con un titulo como con una explicacion o descripcion de lo que aboda el tema"
  - Admin scope: "Solo Editor de formulario + Estadísticas + Exportación Excel"
- **L3 (2026-10-22):** User requirement updates:
  "seccion 1 Tarea principal agregar gestion sanitaria y en 2b Gestion Nacional, provincial, municipal en 2b Hospital agregar un listado basico de servicios y permitir el completado manual si no lo encuentra. (osea un combo box que vaya filtrando de acuerdo lo que se va escribiendo pero que si no coincide permita dejar texto libre ) seccion 4 que la falta de problemas no sea bloqueante. quiero que cada una de las respuestas se vaya actualizando en la base de datos para no perder informacion. en cada siguiente que se actualice la base de datos por detras. que permita volver atras y modificar pero que si se suspende la encuetra este la informacion que se llego a cargar. el boton de ir al formulario desvinculado esta descentrado ."
  Clarification: "Opción A: Crear Sección 2D 'Gestión sanitaria' + sumar 'Nacional' en 2B Hospital".
