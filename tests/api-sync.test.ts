import fs from "fs";
import path from "path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  syncSurveyResponsesBatch,
  syncContactSubmissionsBatch,
  getSurveyStats,
  getAllSurveyResponses,
  getAllContactSubmissions,
  deleteTestRecordsByPrefix,
} from "../src/lib/db/repository";
import {
  getActiveSurveySchema,
  updateActiveSurveySchema,
  getPool,
} from "../src/lib/db/postgres";
import { buildExcelBuffer, buildCsvString } from "../src/lib/export/exporter";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

describe("Repository, Batch Offline Sync, Dynamic Question Editor & Export (S1, S8, S9)", () => {
  const testPrefix = `vitest_${Date.now()}_`;

  beforeAll(async () => {
    loadEnv();
    await deleteTestRecordsByPrefix(testPrefix);
  });

  afterAll(async () => {
    await deleteTestRecordsByPrefix(testPrefix);
  });

  it("syncs survey responses idempotently (web & android offline queue) and rejects invalid items without losing valid ones", async () => {
    const validId = `${testPrefix}resp_1`;
    const invalidId = `${testPrefix}resp_invalid`;

    const result = await syncSurveyResponsesBatch([
      {
        clientSubmissionId: validId,
        sourcePlatform: "android",
        consent: true,
        mainLocation: "hospital",
        section2B: {
          tipoHospital: "provincial",
          tarea: "enfermeria",
          areaServicio: "Guardia General",
        },
        section3: {
          regionSanitaria: "XI",
          municipio: "La Plata",
          antiguedad: "11_a_20",
        },
        section4: {
          priorities: [
            { rank: 1, themeId: "fuerza_laboral", themeLabel: "Fuerza laboral" },
            { rank: 2, themeId: "infraestructura_emergencias", themeLabel: "Infraestructura, mantenimiento y red de emergencias" },
            { rank: 3, themeId: "salud_mental", themeLabel: "Salud mental comunitaria" },
            { rank: 4, themeId: "financiamiento", themeLabel: "Financiamiento" },
            { rank: 5, themeId: "implementacion_hsi", themeLabel: "Implementación de HSI (Historia de Salud Integrada)" },
          ],
          customThemes: [
            {
              id: "custom_1",
              title: "Condiciones edilicias de guardia",
              description: "Climatización y áreas de descanso para guardia activa",
            },
          ],
          rank1Detail: {
            problema: "Falta de enfermeros en turno noche",
            propuesta: "Concursos rápidos y pase a planta",
          },
          rank2Detail: {
            problema: "Demoras en ambulancias",
            propuesta: "Base SIES integrada al hospital",
          },
          rank3Detail: {
            problema: "Falta de camas de internación breve",
            propuesta: "Guardia interdisciplinaria 24hs",
          },
          otraTematicaAbierta: "Articulación con universidad",
          relacionZonal: "regular",
        },
        section5: {
          interesaMesa: "si",
          tematicasMesa: ["fuerza_laboral", "salud_mental"],
          ofreceReferente: "si",
          horarios: ["tarde", "noche"],
          modalidad: "mixta",
        },
      },
      {
        clientSubmissionId: invalidId,
        consent: false,
        mainLocation: "primer_nivel",
        section3: {
          regionSanitaria: "I",
          municipio: "Bahía Blanca",
          antiguedad: "menos_de_5",
        },
        section4: {
          priorities: [],
          rank1Detail: { problema: "", propuesta: "" },
          rank2Detail: { problema: "", propuesta: "" },
          rank3Detail: { problema: "", propuesta: "" },
          relacionZonal: "buena",
        },
        section5: {
          interesaMesa: "no",
        },
      },
    ]);

    expect(result.accepted).toContain(validId);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].clientSubmissionId).toBe(invalidId);

    // Re-syncing the same clientSubmissionId should update the existing record in place (progressive upsert S10)
    const retryResult = await syncSurveyResponsesBatch([
      {
        clientSubmissionId: validId,
        sourcePlatform: "android",
        isComplete: true,
        currentStep: "S5",
        consent: true,
        mainLocation: "hospital",
        section2B: {
          tipoHospital: "nacional",
          tarea: "enfermeria",
          areaServicio: "Terapia Intensiva",
        },
        section3: {
          regionSanitaria: "XI",
          municipio: "La Plata",
          antiguedad: "11_a_20",
        },
        section4: {
          priorities: [
            { rank: 1, themeId: "fuerza_laboral", themeLabel: "Fuerza laboral" },
            { rank: 2, themeId: "infraestructura_emergencias", themeLabel: "Infraestructura, mantenimiento y red de emergencias" },
            { rank: 3, themeId: "salud_mental", themeLabel: "Salud mental comunitaria" },
            { rank: 4, themeId: "financiamiento", themeLabel: "Financiamiento" },
            { rank: 5, themeId: "implementacion_hsi", themeLabel: "Implementación de HSI (Historia de Salud Integrada)" },
          ],
          rank1Detail: { problema: "", propuesta: "" },
          rank2Detail: { problema: "", propuesta: "" },
          rank3Detail: { problema: "", propuesta: "" },
          relacionZonal: "muy_buena",
        },
        section5: {
          interesaMesa: "no",
        },
      },
    ]);
    expect(retryResult.accepted).toContain(validId);

    // Also test saving a partial draft right after Step 1 (before S3/S4/S5 are filled) and then updating it when going back/forward
    const draftId = `${testPrefix}draft_progressive`;
    const step1Sync = await syncSurveyResponsesBatch([
      {
        clientSubmissionId: draftId,
        isComplete: false,
        currentStep: "S1",
        consent: true,
        mainLocation: "gestion_sanitaria",
      },
    ]);
    expect(step1Sync.accepted).toContain(draftId);

    const step2DSync = await syncSurveyResponsesBatch([
      {
        clientSubmissionId: draftId,
        isComplete: false,
        currentStep: "S2D",
        consent: true,
        mainLocation: "gestion_sanitaria",
        section2D: {
          ambitoGestion: "provincial",
          rolGestion: "direccion",
          areaEspacio: "Región Sanitaria VI",
        },
      },
    ]);
    expect(step2DSync.accepted).toContain(draftId);

    const allSaved = await getAllSurveyResponses();
    const savedDraft = allSaved.find((r) => r.clientSubmissionId === draftId);
    expect(savedDraft).toBeDefined();
    expect(savedDraft?.mainLocation).toBe("gestion_sanitaria");
    expect(savedDraft?.payload.section2D?.areaEspacio).toBe("Región Sanitaria VI");
    expect(savedDraft?.isComplete).toBe(false);
  });

  it("syncs unlinked contact submissions independently and aggregates stats + exports Excel/CSV", async () => {
    const contactId = `${testPrefix}contact_1`;
    const cRes = await syncContactSubmissionsBatch([
      {
        clientSubmissionId: contactId,
        sourcePlatform: "web",
        nombre: "Juan Pérez",
        telefono: "221-444-5555",
        email: "juan@mosapro.test",
        regionSanitaria: "XI",
        municipio: "La Plata",
        organizacionOEspacio: "Hospital San Martín",
        tematicasInteres: ["Fuerza laboral"],
        ofreceReferente: true,
        horarios: ["tarde"],
        modalidad: "mixta",
        comentarios: "Disponible los jueves",
      },
    ]);
    expect(cRes.accepted).toContain(contactId);

    const stats = await getSurveyStats();
    expect(stats.totalResponses).toBeGreaterThanOrEqual(1);
    expect(stats.totalContacts).toBeGreaterThanOrEqual(1);
    expect(stats.byRegion["XI"]).toBeGreaterThanOrEqual(1);

    const responses = await getAllSurveyResponses();
    const contacts = await getAllContactSubmissions();

    const csv = buildCsvString(responses);
    expect(csv).toContain("La Plata");
    expect(csv).toContain("Terapia Intensiva");

    const xlsxBuf = buildExcelBuffer(responses, contacts);
    expect(xlsxBuf.byteLength).toBeGreaterThan(100);
  });

  it("allows editing and adding questions/themes in the survey definition (S9)", async () => {
    const current = await getActiveSurveySchema();
    const originalVersion = current.version;

    // Add a custom question to Section 3 and update it, then restore
    const s3 = current.sections.find((s) => s.id === "S3")!;
    const addedQuestionId = `q_custom_${Date.now()}`;
    const modifiedSchema = {
      ...current,
      sections: current.sections.map((s) =>
        s.id === "S3"
          ? {
              ...s,
              questions: [
                ...s.questions,
                {
                  id: addedQuestionId,
                  sectionId: "S3",
                  code: "3.4",
                  label: "¿Participaste en encuentros previos del COSAPRO/MOSAPRO?",
                  type: "single_choice" as const,
                  required: false,
                  order: 4,
                  isCustom: true,
                  options: [
                    { value: "si", label: "Sí" },
                    { value: "no", label: "No" },
                  ],
                },
              ],
            }
          : s
      ),
    };

    const updated = await updateActiveSurveySchema(modifiedSchema);
    expect(updated.version).toBe(originalVersion + 1);
    const reloaded = await getActiveSurveySchema();
    expect(
      reloaded.sections
        .find((s) => s.id === "S3")
        ?.questions.some((q) => q.id === addedQuestionId)
    ).toBe(true);

    // Restore original questions
    await updateActiveSurveySchema({
      ...reloaded,
      sections: reloaded.sections.map((s) =>
        s.id === "S3" ? { ...s, questions: s3.questions } : s
      ),
    });
  });
});
