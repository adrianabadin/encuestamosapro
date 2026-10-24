import * as XLSX from "xlsx";
import { StoredSurveyResponse, StoredContactSubmission } from "../db/repository";

type CellValue = string | number;

// Spreadsheet apps evaluate cells starting with these characters as formulas
// (CSV/formula injection). Public submissions are free text, so prefix them
// with an apostrophe to force them to be read as plain text.
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

export function sanitizeSpreadsheetCell(value: CellValue): CellValue {
  if (typeof value !== "string") return value;
  return FORMULA_TRIGGER.test(value) ? `'${value}` : value;
}

function sanitizeRow(row: Record<string, CellValue>): Record<string, CellValue> {
  const out: Record<string, CellValue> = {};
  for (const [key, val] of Object.entries(row)) {
    out[sanitizeSpreadsheetCell(key) as string] = sanitizeSpreadsheetCell(val);
  }
  return out;
}

export function flattenSurveyResponseRow(r: StoredSurveyResponse): Record<string, CellValue> {
  const p = r.payload;
  const prio = (rank: number) =>
    p.section4?.priorities?.find((x) => x.rank === rank)?.themeLabel || "";

  const customThemesStr = (p.section4?.customThemes || [])
    .map((ct) => `${ct.title}: ${ct.description}`)
    .join(" | ");

  const customAnswersObj = p.customAnswers || {};
  const extraCols: Record<string, string> = {};
  for (const [key, val] of Object.entries(customAnswersObj)) {
    extraCols[`Pregunta_Extra_${key}`] = Array.isArray(val)
      ? val.join(", ")
      : String(val || "");
  }

  return sanitizeRow({
    ID: r.id,
    Submission_UUID: r.clientSubmissionId,
    Estado_Encuesta: r.isComplete ? "Completa" : `En curso (${r.currentStep})`,
    Plataforma: r.sourcePlatform,
    Fecha_Carga: r.createdAtClient || r.syncedAt,
    Fecha_Sincronizacion: r.syncedAt,
    Region_Sanitaria: r.regionSanitaria,
    Municipio: r.municipio,
    Antiguedad: r.antiguedad,
    Espacio_Principal_S1: r.mainLocation,
    S2A_Tarea_Primer_Nivel: p.section2A?.tarea || "",
    S2A_Tarea_Otra_Cual: p.section2A?.tareaOtra || "",
    S2B_Tipo_Hospital: p.section2B?.tipoHospital || "",
    S2B_Tarea_Hospital: p.section2B?.tarea || "",
    S2B_Tarea_Otra_Cual: p.section2B?.tareaOtra || "",
    S2B_Area_O_Servicio: p.section2B?.areaServicio || "",
    S2C_Tipo_Organizacion: p.section2C?.tipoOrganizacion || "",
    S2C_Tipo_Organizacion_Otra: p.section2C?.tipoOrganizacionOtra || "",
    S2C_Rol_Comunitario: p.section2C?.rol || "",
    S2C_Rol_Otro: p.section2C?.rolOtro || "",
    S2D_Ambito_Gestion: p.section2D?.ambitoGestion || "",
    S2D_Rol_Gestion: p.section2D?.rolGestion || "",
    S2D_Rol_Gestion_Otra: p.section2D?.rolGestionOtra || "",
    S2D_Area_O_Direccion: p.section2D?.areaEspacio || "",
    S1_Espacio_Otro: p.mainLocationOtro || "",
    S1E_Nivel_Educativo: p.sectionEducativa?.nivel || "",
    S1E_Jurisdiccion: p.sectionEducativa?.jurisdiccion || "",
    S1E_Rol: p.sectionEducativa?.rol || "",
    S1E_Rol_Otro: p.sectionEducativa?.rolOtro || "",
    Prioridad_1_Tematica: prio(1),
    Prioridad_1_Problema: p.section4?.rank1Detail?.problema || "",
    Prioridad_1_Propuesta: p.section4?.rank1Detail?.propuesta || "",
    Prioridad_2_Tematica: prio(2),
    Prioridad_2_Problema: p.section4?.rank2Detail?.problema || "",
    Prioridad_2_Propuesta: p.section4?.rank2Detail?.propuesta || "",
    Prioridad_3_Tematica: prio(3),
    Prioridad_3_Problema: p.section4?.rank3Detail?.problema || "",
    Prioridad_3_Propuesta: p.section4?.rank3Detail?.propuesta || "",
    Prioridad_4_Tematica: prio(4),
    Prioridad_5_Tematica: prio(5),
    Tematicas_Agregadas_En_Grilla: customThemesStr,
    S4_5_Otra_Tematica_Abierta: p.section4?.otraTematicaAbierta || "",
    S4_6_Relacion_Zonal: r.relacionZonal,
    S5_1_Interesa_Mesa: r.interesaMesa,
    S5_2_Tematicas_Mesa: (p.section5?.tematicasMesa || []).join(", "),
    S5_3_Ofrece_Referente: r.ofreceReferente || "",
    S5_4_Horarios: (p.section5?.horarios || []).join(", "),
    S5_5_Modalidad: p.section5?.modalidad || "",
    ...extraCols,
  });
}

export function flattenContactRow(c: StoredContactSubmission): Record<string, CellValue> {
  return sanitizeRow({
    ID: c.id,
    Fecha_Registro: c.createdAtClient || c.syncedAt,
    Plataforma: c.sourcePlatform,
    Nombre_Apellido: c.nombre,
    Telefono_WhatsApp: c.telefono,
    Email: c.email || "",
    Region_Sanitaria: c.regionSanitaria,
    Municipio: c.municipio,
    Organizacion_Espacio: c.organizacionEspacio || "",
    Tematicas_Mesa: (c.tematicasInteres || []).join(", "),
    Ofrece_Referente: c.ofreceReferente ? "Sí" : "No",
    Horarios: (c.horarios || []).join(", "),
    Modalidad: c.modalidad || "",
    Comentarios: c.comentarios || "",
  });
}

export function buildCsvString(responses: StoredSurveyResponse[]): string {
  const rows = responses.map(flattenSurveyResponseRow);
  const ws = XLSX.utils.json_to_sheet(rows);
  return XLSX.utils.sheet_to_csv(ws);
}

export function buildExcelBuffer(
  responses: StoredSurveyResponse[],
  contacts: StoredContactSubmission[]
): Buffer {
  const wb = XLSX.utils.book_new();
  const respRows = responses.map(flattenSurveyResponseRow);
  const contactRows = contacts.map(flattenContactRow);

  const wsResp = XLSX.utils.json_to_sheet(
    respRows.length > 0 ? respRows : [{ Estado: "Sin respuestas aún" }]
  );
  const wsContacts = XLSX.utils.json_to_sheet(
    contactRows.length > 0 ? contactRows : [{ Estado: "Sin contactos aún" }]
  );

  XLSX.utils.book_append_sheet(wb, wsResp, "Relevamiento_Anonimo");
  XLSX.utils.book_append_sheet(wb, wsContacts, "Contactos_Mesas");

  const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(out);
}
