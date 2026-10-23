import { ensureDbInitialized, getPool } from "./postgres";
import {
  SurveySubmissionPayload,
  ContactSubmissionPayload,
  validateSurveySubmission,
  validateContactSubmission,
} from "../survey/validator";

export interface BatchSyncResult {
  accepted: string[];
  duplicates: string[];
  rejected: {
    clientSubmissionId: string;
    errors: string[];
  }[];
}

export interface StoredSurveyResponse {
  id: number;
  clientSubmissionId: string;
  surveyVersion: number;
  sourcePlatform: string;
  isComplete: boolean;
  currentStep: string;
  regionSanitaria: string;
  municipio: string;
  mainLocation: string;
  antiguedad: string;
  relacionZonal: string;
  interesaMesa: string;
  ofreceReferente: string | null;
  payload: SurveySubmissionPayload;
  createdAtClient: string | null;
  syncedAt: string;
}

export interface StoredContactSubmission {
  id: number;
  clientSubmissionId: string;
  sourcePlatform: string;
  nombre: string;
  telefono: string;
  email: string | null;
  regionSanitaria: string;
  municipio: string;
  organizacionEspacio: string | null;
  tematicasInteres: string[];
  ofreceReferente: boolean;
  horarios: string[];
  modalidad: string | null;
  comentarios: string | null;
  createdAtClient: string | null;
  syncedAt: string;
}

export interface SurveyStatsSummary {
  totalResponses: number;
  totalContacts: number;
  byRegion: Record<string, number>;
  byMainLocation: Record<string, number>;
  byInteresaMesa: Record<string, number>;
  byRelacionZonal: Record<string, number>;
  themeRankingScores: {
    themeId: string;
    themeLabel: string;
    rank1Count: number;
    top5Mentions: number;
    weightedScore: number; // 1°=5pts, 2°=4pts, 3°=3pts, 4°=2pts, 5°=1pt
  }[];
  customThemesSubmitted: {
    title: string;
    description: string;
    region: string;
    municipio: string;
  }[];
}

export async function syncSurveyResponsesBatch(
  items: Partial<SurveySubmissionPayload>[]
): Promise<BatchSyncResult> {
  await ensureDbInitialized();
  const db = getPool();

  const accepted: string[] = [];
  const duplicates: string[] = [];
  const rejected: { clientSubmissionId: string; errors: string[] }[] = [];

  for (const item of items) {
    const subId = item.clientSubmissionId || "unknown";
    const validation = validateSurveySubmission(item);
    if (!validation.valid) {
      rejected.push({
        clientSubmissionId: subId,
        errors: validation.errors,
      });
      continue;
    }

    const validItem = item as SurveySubmissionPayload;
    const isComplete = validItem.isComplete !== false;
    const currentStep = validItem.currentStep || (isComplete ? "S5" : "S0");
    const region = validItem.section3?.regionSanitaria || "";
    const municipio = validItem.section3?.municipio || "";
    const mainLoc = validItem.mainLocation || "";
    const antiguedad = validItem.section3?.antiguedad || "";
    const relacion = validItem.section4?.relacionZonal || "";
    const interesa = validItem.section5?.interesaMesa || "";
    const referente = validItem.section5?.ofreceReferente || null;

    const existing = await db.query(
      `SELECT id, is_complete FROM mosapro_survey_responses WHERE client_submission_id = $1`,
      [validItem.clientSubmissionId]
    );
    if (existing.rowCount && existing.rowCount > 0) {
      // A completed response is final: replays of it are acknowledged as
      // duplicates, but its stored data can no longer be overwritten.
      if (existing.rows[0].is_complete !== false) {
        accepted.push(validItem.clientSubmissionId);
        duplicates.push(validItem.clientSubmissionId);
        continue;
      }
      await db.query(
        `UPDATE mosapro_survey_responses
         SET survey_version = $2,
             source_platform = $3,
             is_complete = $4,
             current_step = $5,
             region_sanitaria = $6,
             municipio = $7,
             main_location = $8,
             antiguedad = $9,
             relacion_zonal = $10,
             interesa_mesa = $11,
             ofrece_referente = $12,
             payload_json = $13::jsonb,
             synced_at = NOW()
         WHERE client_submission_id = $1 AND is_complete = FALSE`,
        [
          validItem.clientSubmissionId,
          validItem.surveyVersion || 2,
          validItem.sourcePlatform || "web",
          isComplete,
          currentStep,
          region,
          municipio,
          mainLoc,
          antiguedad,
          relacion,
          interesa,
          referente,
          JSON.stringify(validItem),
        ]
      );
      accepted.push(validItem.clientSubmissionId);
      duplicates.push(validItem.clientSubmissionId);
      continue;
    }

    await db.query(
      `INSERT INTO mosapro_survey_responses (
        client_submission_id,
        survey_version,
        source_platform,
        is_complete,
        current_step,
        region_sanitaria,
        municipio,
        main_location,
        antiguedad,
        relacion_zonal,
        interesa_mesa,
        ofrece_referente,
        payload_json,
        created_at_client
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14)`,
      [
        validItem.clientSubmissionId,
        validItem.surveyVersion || 2,
        validItem.sourcePlatform || "web",
        isComplete,
        currentStep,
        region,
        municipio,
        mainLoc,
        antiguedad,
        relacion,
        interesa,
        referente,
        JSON.stringify(validItem),
        validItem.createdAtClient
          ? new Date(validItem.createdAtClient)
          : new Date(),
      ]
    );

    accepted.push(validItem.clientSubmissionId);
  }

  return { accepted, duplicates, rejected };
}

export async function syncContactSubmissionsBatch(
  items: Partial<ContactSubmissionPayload>[]
): Promise<BatchSyncResult> {
  await ensureDbInitialized();
  const db = getPool();

  const accepted: string[] = [];
  const duplicates: string[] = [];
  const rejected: { clientSubmissionId: string; errors: string[] }[] = [];

  for (const item of items) {
    const subId = item.clientSubmissionId || "unknown";
    const validation = validateContactSubmission(item);
    if (!validation.valid) {
      rejected.push({
        clientSubmissionId: subId,
        errors: validation.errors,
      });
      continue;
    }

    const validItem = item as ContactSubmissionPayload;
    const existing = await db.query(
      `SELECT id FROM mosapro_contact_submissions WHERE client_submission_id = $1`,
      [validItem.clientSubmissionId]
    );
    if (existing.rowCount && existing.rowCount > 0) {
      accepted.push(validItem.clientSubmissionId);
      duplicates.push(validItem.clientSubmissionId);
      continue;
    }

    await db.query(
      `INSERT INTO mosapro_contact_submissions (
        client_submission_id,
        source_platform,
        nombre,
        telefono,
        email,
        region_sanitaria,
        municipio,
        organizacion_espacio,
        tematicas_interes,
        ofrece_referente,
        horarios,
        modalidad,
        comentarios,
        created_at_client
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11::jsonb,$12,$13,$14)`,
      [
        validItem.clientSubmissionId,
        validItem.sourcePlatform || "web",
        validItem.nombre.trim(),
        validItem.telefono.trim(),
        validItem.email?.trim() || null,
        validItem.regionSanitaria,
        validItem.municipio,
        validItem.organizacionOEspacio?.trim() || null,
        JSON.stringify(validItem.tematicasInteres || []),
        Boolean(validItem.ofreceReferente),
        JSON.stringify(validItem.horarios || []),
        validItem.modalidad || null,
        validItem.comentarios?.trim() || null,
        validItem.createdAtClient ? new Date(validItem.createdAtClient) : new Date(),
      ]
    );

    accepted.push(validItem.clientSubmissionId);
  }

  return { accepted, duplicates, rejected };
}

export async function getAllSurveyResponses(): Promise<StoredSurveyResponse[]> {
  await ensureDbInitialized();
  const db = getPool();
  const res = await db.query(
    `SELECT * FROM mosapro_survey_responses ORDER BY synced_at DESC`
  );
  return res.rows.map((row) => ({
    id: row.id,
    clientSubmissionId: row.client_submission_id,
    surveyVersion: row.survey_version,
    sourcePlatform: row.source_platform,
    isComplete: row.is_complete !== false,
    currentStep: row.current_step || "S5",
    regionSanitaria: row.region_sanitaria,
    municipio: row.municipio,
    mainLocation: row.main_location,
    antiguedad: row.antiguedad,
    relacionZonal: row.relacion_zonal,
    interesaMesa: row.interesa_mesa,
    ofreceReferente: row.ofrece_referente,
    payload: row.payload_json as SurveySubmissionPayload,
    createdAtClient: row.created_at_client
      ? new Date(row.created_at_client).toISOString()
      : null,
    syncedAt: new Date(row.synced_at).toISOString(),
  }));
}

export async function getAllContactSubmissions(): Promise<
  StoredContactSubmission[]
> {
  await ensureDbInitialized();
  const db = getPool();
  const res = await db.query(
    `SELECT * FROM mosapro_contact_submissions ORDER BY synced_at DESC`
  );
  return res.rows.map((row) => ({
    id: row.id,
    clientSubmissionId: row.client_submission_id,
    sourcePlatform: row.source_platform,
    nombre: row.nombre,
    telefono: row.telefono,
    email: row.email,
    regionSanitaria: row.region_sanitaria,
    municipio: row.municipio,
    organizacionEspacio: row.organizacion_espacio,
    tematicasInteres: row.tematicas_interes || [],
    ofreceReferente: row.ofrece_referente,
    horarios: row.horarios || [],
    modalidad: row.modalidad,
    comentarios: row.comentarios,
    createdAtClient: row.created_at_client
      ? new Date(row.created_at_client).toISOString()
      : null,
    syncedAt: new Date(row.synced_at).toISOString(),
  }));
}

export async function getSurveyStats(): Promise<SurveyStatsSummary> {
  const responses = await getAllSurveyResponses();
  const contacts = await getAllContactSubmissions();

  const byRegion: Record<string, number> = {};
  const byMainLocation: Record<string, number> = {};
  const byInteresaMesa: Record<string, number> = {};
  const byRelacionZonal: Record<string, number> = {};

  const themeMap = new Map<
    string,
    {
      themeId: string;
      themeLabel: string;
      rank1Count: number;
      top5Mentions: number;
      weightedScore: number;
    }
  >();

  const customThemesSubmitted: {
    title: string;
    description: string;
    region: string;
    municipio: string;
  }[] = [];

  for (const r of responses) {
    byRegion[r.regionSanitaria] = (byRegion[r.regionSanitaria] || 0) + 1;
    byMainLocation[r.mainLocation] = (byMainLocation[r.mainLocation] || 0) + 1;
    byInteresaMesa[r.interesaMesa] = (byInteresaMesa[r.interesaMesa] || 0) + 1;
    byRelacionZonal[r.relacionZonal] =
      (byRelacionZonal[r.relacionZonal] || 0) + 1;

    const priorities = r.payload?.section4?.priorities || [];
    for (const p of priorities) {
      const current = themeMap.get(p.themeId) || {
        themeId: p.themeId,
        themeLabel: p.themeLabel,
        rank1Count: 0,
        top5Mentions: 0,
        weightedScore: 0,
      };
      if (p.rank === 1) current.rank1Count += 1;
      current.top5Mentions += 1;
      const weight = Math.max(0, 6 - p.rank);
      current.weightedScore += weight;
      themeMap.set(p.themeId, current);
    }

    const customList = r.payload?.section4?.customThemes || [];
    for (const ct of customList) {
      customThemesSubmitted.push({
        title: ct.title,
        description: ct.description,
        region: r.regionSanitaria,
        municipio: r.municipio,
      });
    }
  }

  const themeRankingScores = Array.from(themeMap.values()).sort(
    (a, b) => b.weightedScore - a.weightedScore
  );

  return {
    totalResponses: responses.length,
    totalContacts: contacts.length,
    byRegion,
    byMainLocation,
    byInteresaMesa,
    byRelacionZonal,
    themeRankingScores,
    customThemesSubmitted,
  };
}

export async function deleteTestRecordsByPrefix(prefix: string): Promise<void> {
  await ensureDbInitialized();
  const db = getPool();
  await db.query(
    `DELETE FROM mosapro_survey_responses WHERE client_submission_id LIKE $1`,
    [`${prefix}%`]
  );
  await db.query(
    `DELETE FROM mosapro_contact_submissions WHERE client_submission_id LIKE $1`,
    [`${prefix}%`]
  );
}
