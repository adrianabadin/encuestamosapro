# Changelog — MOSAPRO Relevamiento

## v1.1.0 (web 0.2.0 / android versionCode 2) — Mejoras de formulario

### Cambios
- **Renombrada la temática "Fuerza laboral" a "Fuerza de trabajo"** en todo el
  relevamiento, tanto en la app web como en la app Android (schema compartido).
- **Campos obligatorios claramente marcados** con un asterisco rojo (`*`) en cada
  pregunta requerida del formulario (web y Android).
- **Nueva aclaración** en cada paso del formulario: "Los campos marcados con * son
  obligatorios", para que la persona sepa qué debe completar antes de continuar.
- **Reemplazada la leyenda técnica "(No bloqueante)"** de los campos de
  problema/propuesta por **"(Opcional)"**, dejando en claro que esos campos no son
  obligatorios (web y Android).

### Notas
- No cambia la estructura de datos ni la lógica de validación: la temática conserva
  su identificador interno (`fuerza_laboral`), por lo que las respuestas previas y
  las exportaciones siguen siendo compatibles.
- Suben las versiones: web `0.1.0 → 0.2.0`; Android `1.0.0 → 1.1.0`
  (`versionCode 1 → 2`) para habilitar la nueva publicación en la tienda.
