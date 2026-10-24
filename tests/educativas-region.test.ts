import { describe, it, expect } from "vitest";
import { DEFAULT_SURVEY_SCHEMA } from "../src/lib/survey/default-schema";
import { validateSurveySubmission } from "../src/lib/survey/validator";
import { getActiveSectionIds } from "../src/lib/survey/flow-helpers";
import {
  REGION_NO_CALIFICA,
  normalizeRegionCode,
} from "../src/lib/catalog/pba-municipios";
import { flattenSurveyResponseRow } from "../src/lib/export/exporter";
import type { StoredSurveyResponse } from "../src/lib/db/repository";

const s1 = DEFAULT_SURVEY_SCHEMA.sections.find((s) => s.id === "S1")!;
const q = (id: string) => s1.questions.find((x) => x.id === id);
const values = (id: string) => (q(id)?.options || []).map((o) => o.value);

const common = {
  clientSubmissionId: "edu-0001",
  consent: true,
  section3: {
    regionSanitaria: "XI",
    municipio: "La Plata",
    antiguedad: "5_a_10",
  },
  section4: {
    priorities: [
      { rank: 1, themeId: "fuerza_laboral", themeLabel: "Fuerza laboral" },
      { rank: 2, themeId: "financiamiento", themeLabel: "Financiamiento" },
      { rank: 3, themeId: "salud_mental", themeLabel: "Salud mental comunitaria" },
      { rank: 4, themeId: "salud_educacion", themeLabel: "Salud y educación" },
      { rank: 5, themeId: "agroecologia", themeLabel: "Agroecología" },
    ],
    customThemes: [],
    rank1Detail: { problema: "", propuesta: "" },
    rank2Detail: { problema: "", propuesta: "" },
    rank3Detail: { problema: "", propuesta: "" },
    relacionZonal: "regular",
  },
  section5: { interesaMesa: "no" as const },
};

const educativa = {
  ...common,
  mainLocation: "institucion_educativa" as const,
  sectionEducativa: {
    nivel: "secundario",
    jurisdiccion: "provincial",
    rol: "docente",
    rolOtro: "",
  },
};

describe("Instituciones educativas in Section 1 (S1, S2)", () => {
  it("adds the option and the nivel / jurisdicción / rol questions with the agreed values", () => {
    expect(values("q_main_location")).toContain("institucion_educativa");
    expect(
      q("q_main_location")?.options?.find((o) => o.value === "institucion_educativa")?.label
    ).toBe("Instituciones educativas");
    expect(values("q_1e_nivel")).toEqual([
      "primario",
      "secundario",
      "terciario",
      "universitario",
    ]);
    expect(values("q_1e_jurisdiccion")).toEqual([
      "municipal",
      "provincial",
      "nacional",
    ]);
    expect(values("q_1e_rol")).toEqual([
      "docente",
      "directivo",
      "equipo_orientacion",
      "no_docente",
      "estudiante",
      "otro",
    ]);
    expect(q("q_1e_rol")?.options?.find((o) => o.value === "otro")?.requiresSpecify).toBe(true);
    for (const id of ["q_1e_nivel", "q_1e_jurisdiccion", "q_1e_rol"]) {
      expect(q(id)?.condition).toEqual({
        dependsOnQuestionId: "q_main_location",
        allowedValues: ["institucion_educativa"],
      });
    }
    expect(DEFAULT_SURVEY_SCHEMA.version).toBe(3);
  });

  it("skips the Section 2 branch and goes from S1 straight to S3", () => {
    expect(getActiveSectionIds("institucion_educativa")).toEqual([
      "S0",
      "S1",
      "S3",
      "S4",
      "S5",
    ]);
  });

  it("accepts a complete educativa submission", () => {
    const res = validateSurveySubmission(educativa);
    expect(res.errors).toEqual([]);
    expect(res.valid).toBe(true);
  });

  it("rejects a missing jurisdicción and a rol «otro» without «¿Cuál?»", () => {
    const noJur = validateSurveySubmission({
      ...educativa,
      sectionEducativa: { ...educativa.sectionEducativa, jurisdiccion: "" },
    });
    expect(noJur.valid).toBe(false);
    expect(noJur.errors.some((e) => e.toLowerCase().includes("jurisdicción"))).toBe(true);

    const otroSinCual = validateSurveySubmission({
      ...educativa,
      sectionEducativa: { ...educativa.sectionEducativa, rol: "otro", rolOtro: "  " },
    });
    expect(otroSinCual.valid).toBe(false);
    expect(otroSinCual.errors.some((e) => e.includes("Cuál"))).toBe(true);
  });

  it("still accepts a partial step save with only consent", () => {
    expect(
      validateSurveySubmission({
        clientSubmissionId: "edu-partial",
        consent: true,
        isComplete: false,
        currentStep: "S1",
        mainLocation: "institucion_educativa",
      }).valid
    ).toBe(true);
  });
});

describe("Región sanitaria «No califica» (S4)", () => {
  it("exports the constant and accepts it with a free-text municipio", () => {
    expect(REGION_NO_CALIFICA).toBe("no_califica");
    const res = validateSurveySubmission({
      ...educativa,
      section3: {
        regionSanitaria: REGION_NO_CALIFICA,
        municipio: "Rosario (Santa Fe)",
        antiguedad: "menos_de_5",
      },
    });
    expect(res.valid).toBe(true);
  });

  it("never prefills «No califica» from a regional link", () => {
    expect(normalizeRegionCode("no_califica")).toBe("");
  });
});

describe("Export of the educativa answers (S5)", () => {
  it("adds the four S1E columns with the stored values", () => {
    const stored: StoredSurveyResponse = {
      id: 1,
      clientSubmissionId: "edu-0001",
      surveyVersion: 3,
      sourcePlatform: "web",
      isComplete: true,
      currentStep: "S5",
      regionSanitaria: "XI",
      municipio: "La Plata",
      mainLocation: "institucion_educativa",
      antiguedad: "5_a_10",
      relacionZonal: "regular",
      interesaMesa: "no",
      ofreceReferente: null,
      payload: {
        ...educativa,
        sectionEducativa: {
          nivel: "universitario",
          jurisdiccion: "nacional",
          rol: "otro",
          rolOtro: "Investigadora",
        },
      },
      createdAtClient: null,
      syncedAt: new Date().toISOString(),
    };
    const row = flattenSurveyResponseRow(stored);
    expect(row.S1E_Nivel_Educativo).toBe("universitario");
    expect(row.S1E_Jurisdiccion).toBe("nacional");
    expect(row.S1E_Rol).toBe("otro");
    expect(row.S1E_Rol_Otro).toBe("Investigadora");
  });
});

describe("Existing branches keep their behaviour", () => {
  it("hospital flow and validation are unchanged", () => {
    expect(getActiveSectionIds("hospital")).toEqual(["S0", "S1", "S2B", "S3", "S4", "S5"]);
    const hospital = validateSurveySubmission({
      ...common,
      mainLocation: "hospital",
      section2B: {
        tipoHospital: "provincial",
        tarea: "medico",
        areaServicio: "Guardia / Emergencias",
      },
    });
    expect(hospital.valid).toBe(true);
    const hospitalMissing = validateSurveySubmission({
      ...common,
      mainLocation: "hospital",
    });
    expect(hospitalMissing.valid).toBe(false);
  });
});

describe("Section 1 «Otros» with free text (S6)", () => {
  const otros = {
    ...common,
    mainLocation: "otro" as const,
    mainLocationOtro: "Hogar de ancianos",
  };

  it("adds the «Otros» option with a «¿Cuál?» specifier", () => {
    const opt = q("q_main_location")?.options?.find((o) => o.value === "otro");
    expect(opt?.label).toBe("Otros");
    expect(opt?.requiresSpecify).toBe(true);
    expect(q("q_main_location")?.specifyLabel).toBe("¿Cuál?");
  });

  it("goes from S1 straight to S3", () => {
    expect(getActiveSectionIds("otro")).toEqual(["S0", "S1", "S3", "S4", "S5"]);
  });

  it("requires the free text when «Otros» is chosen", () => {
    expect(validateSurveySubmission(otros).valid).toBe(true);
    const empty = validateSurveySubmission({ ...otros, mainLocationOtro: "  " });
    expect(empty.valid).toBe(false);
    expect(empty.errors.some((e) => e.includes("Cuál"))).toBe(true);
  });

  it("exports the free text in S1_Espacio_Otro", () => {
    const row = flattenSurveyResponseRow({
      id: 2,
      clientSubmissionId: "otro-1",
      surveyVersion: 3,
      sourcePlatform: "web",
      isComplete: true,
      currentStep: "S5",
      regionSanitaria: "XI",
      municipio: "La Plata",
      mainLocation: "otro",
      antiguedad: "5_a_10",
      relacionZonal: "regular",
      interesaMesa: "no",
      ofreceReferente: null,
      payload: otros,
      createdAtClient: null,
      syncedAt: new Date().toISOString(),
    });
    expect(row.S1_Espacio_Otro).toBe("Hogar de ancianos");
  });
});
