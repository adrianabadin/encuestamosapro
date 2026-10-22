import { describe, it, expect } from "vitest";
import {
  REGIONES_SANITARIAS,
  MUNICIPIOS_PBA,
  getMunicipiosByRegion,
} from "../src/lib/catalog/pba-municipios";
import {
  DEFAULT_SURVEY_SCHEMA,
  DEFAULT_THEMES,
} from "../src/lib/survey/default-schema";
import {
  validateSurveySubmission,
  validateContactSubmission,
} from "../src/lib/survey/validator";

describe("PBA Regiones Sanitarias & 135 Municipios Catalog (S6)", () => {
  it("contains all 12 Regiones Sanitarias (I to XII) and exactly 135 PBA municipalities", () => {
    expect(REGIONES_SANITARIAS).toHaveLength(12);
    expect(REGIONES_SANITARIAS.map((r) => r.code)).toEqual([
      "I",
      "II",
      "III",
      "IV",
      "V",
      "VI",
      "VII",
      "VIII",
      "IX",
      "X",
      "XI",
      "XII",
    ]);
    expect(MUNICIPIOS_PBA).toHaveLength(135);
    const uniqueNames = new Set(MUNICIPIOS_PBA.map((m) => m.name));
    expect(uniqueNames.size).toBe(135);
  });

  it("filters municipalities by Región Sanitaria correctly (e.g., XII -> La Matanza, VI -> Avellaneda/Lanús/Lomas)", () => {
    const rXII = getMunicipiosByRegion("XII");
    expect(rXII).toHaveLength(1);
    expect(rXII[0].name).toBe("La Matanza");

    const rVI = getMunicipiosByRegion("VI");
    expect(rVI.map((m) => m.name)).toContain("Avellaneda");
    expect(rVI.map((m) => m.name)).toContain("Lomas de Zamora");
    expect(rVI.map((m) => m.name)).toContain("Quilmes");
  });
});

describe("Default Survey Schema & 13 Themes (S3, S4, S5, S6, S7, S8)", () => {
  it("defines the 13 initial themes (11 original + 2 accepted additions)", () => {
    expect(DEFAULT_THEMES).toHaveLength(13);
    const labels = DEFAULT_THEMES.map((t) => t.label);
    expect(labels).toContain("Fuerza laboral");
    expect(labels).toContain("Financiamiento");
    expect(labels).toContain("Abordajes territoriales");
    expect(labels).toContain("Redes integradas y articulación");
    expect(labels).toContain("Salud mental comunitaria");
    expect(labels).toContain(
      "Sistemas de información, vigilancia epidemiológica y ASIS participativo"
    );
    expect(labels).toContain("Implementación de HSI (Historia de Salud Integrada)");
    expect(labels).toContain("Gestión de insumos y equipamiento");
    expect(labels).toContain("Salud y educación");
    expect(labels).toContain("Comunicación social y estrategias mediáticas");
    expect(labels).toContain("Agroecología");
    expect(labels).toContain("Infraestructura, mantenimiento y red de emergencias");
    expect(labels).toContain(
      "Cuidados, género, niñez y curso de vida / discapacidad"
    );
  });

  it("includes Sections 0, 1, 2A, 2B, 2C, 2D, 3, 4, 5 with exact prompts", () => {
    const sectionIds = DEFAULT_SURVEY_SCHEMA.sections.map((s) => s.id);
    expect(sectionIds).toEqual([
      "S0",
      "S1",
      "S2A",
      "S2B",
      "S2C",
      "S2D",
      "S3",
      "S4",
      "S5",
    ]);
  });

  it("includes 'gestion_sanitaria' in Section 1 and 'nacional', 'provincial', 'municipal' in 2B", () => {
    const s1 = DEFAULT_SURVEY_SCHEMA.sections.find((s) => s.id === "S1")!;
    const s1Values = s1.questions[0].options?.map((o) => o.value) || [];
    expect(s1Values).toContain("gestion_sanitaria");

    const s2b = DEFAULT_SURVEY_SCHEMA.sections.find((s) => s.id === "S2B")!;
    const s2bHospitalTypes = s2b.questions[0].options?.map((o) => o.value) || [];
    expect(s2bHospitalTypes).toEqual(["nacional", "provincial", "municipal"]);
  });
});

describe("Survey Submission Validation Rules (S3-S8)", () => {
  const baseValidSubmission = {
    clientSubmissionId: "11111111-1111-4111-8111-111111111111",
    consent: true,
    mainLocation: "primer_nivel" as const,
    section2A: {
      tarea: "enfermeria",
      tareaOtra: "",
    },
    section3: {
      regionSanitaria: "VI",
      municipio: "Avellaneda",
      antiguedad: "5_a_10",
    },
    section4: {
      priorities: [
        { rank: 1, themeId: "fuerza_laboral", themeLabel: "Fuerza laboral" },
        { rank: 2, themeId: "financiamiento", themeLabel: "Financiamiento" },
        { rank: 3, themeId: "salud_mental", themeLabel: "Salud mental comunitaria" },
        { rank: 4, themeId: "abordajes_territoriales", themeLabel: "Abordajes territoriales" },
        { rank: 5, themeId: "agroecologia", themeLabel: "Agroecología" },
      ],
      customThemes: [],
      rank1Detail: {
        problema: "Falta de personal en guardias y CAPS",
        propuesta: "Carrera sanitaria con dedicación exclusiva",
      },
      rank2Detail: {
        problema: "Demora en partidas municipales",
        propuesta: "Fondo compensador regional",
      },
      rank3Detail: {
        problema: "Alta demanda de consumos problemáticos",
        propuesta: "Equipos interdisciplinarios barriales",
      },
      otraTematicaAbierta: "",
      relacionZonal: "buena",
    },
    section5: {
      interesaMesa: "si" as const,
      tematicasMesa: ["fuerza_laboral", "salud_mental"],
      ofreceReferente: "si" as const,
      horarios: ["manana", "tarde"],
      modalidad: "mixta" as const,
    },
    customAnswers: {},
  };

  it("accepts a valid complete submission for Primer Nivel (2A) and interest='si'", () => {
    const res = validateSurveySubmission(baseValidSubmission);
    expect(res.valid).toBe(true);
    expect(res.errors).toEqual([]);
  });

  it("requires '¿Cuál?' specification when 'otra' is chosen in Section 2A/2B/2C (S5)", () => {
    const invalidOtra = {
      ...baseValidSubmission,
      section2A: {
        tarea: "otra",
        tareaOtra: "   ",
      },
    };
    const res = validateSurveySubmission(invalidOtra);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("Cuál"))).toBe(true);
  });

  it("enforces exactly 5 distinct priority ranks (1° to 5°) without duplicate columns or themes (S7)", () => {
    const duplicateTheme = {
      ...baseValidSubmission,
      section4: {
        ...baseValidSubmission.section4,
        priorities: [
          { rank: 1, themeId: "fuerza_laboral", themeLabel: "Fuerza laboral" },
          { rank: 2, themeId: "fuerza_laboral", themeLabel: "Fuerza laboral" },
          { rank: 3, themeId: "salud_mental", themeLabel: "Salud mental comunitaria" },
          { rank: 4, themeId: "abordajes_territoriales", themeLabel: "Abordajes territoriales" },
          { rank: 5, themeId: "agroecologia", themeLabel: "Agroecología" },
        ],
      },
    };
    const res = validateSurveySubmission(duplicateTheme);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.toLowerCase().includes("temática"))).toBe(true);
  });

  it("requires both a title and a description when adding a custom theme via 'Otra' button in 4.1 (S7)", () => {
    const missingCustomDesc = {
      ...baseValidSubmission,
      section4: {
        ...baseValidSubmission.section4,
        customThemes: [
          {
            id: "custom_1",
            title: "Salud ambiental",
            description: "",
          },
        ],
        priorities: [
          { rank: 1, themeId: "custom_1", themeLabel: "Salud ambiental" },
          ...baseValidSubmission.section4.priorities.slice(1),
        ],
      },
    };
    const res = validateSurveySubmission(missingCustomDesc);
    expect(res.valid).toBe(false);
    expect(
      res.errors.some((e) => e.toLowerCase().includes("descripción") || e.toLowerCase().includes("explicación"))
    ).toBe(true);

    const validCustom = {
      ...missingCustomDesc,
      section4: {
        ...missingCustomDesc.section4,
        customThemes: [
          {
            id: "custom_1",
            title: "Salud ambiental",
            description: "Impacto de basurales y agua segura en barrios populares",
          },
        ],
      },
    };
    expect(validateSurveySubmission(validCustom).valid).toBe(true);
  });

  it("does NOT block submission when Section 4.2-4.4 problem or proposal fields are left blank (S7 update)", () => {
    const withoutProblemText = {
      ...baseValidSubmission,
      section4: {
        ...baseValidSubmission.section4,
        rank1Detail: { problema: "", propuesta: "" },
        rank2Detail: { problema: "", propuesta: "" },
        rank3Detail: { problema: "", propuesta: "" },
      },
    };
    const res = validateSurveySubmission(withoutProblemText);
    expect(res.valid).toBe(true);
  });

  it("accepts a valid submission for Gestión Sanitaria (Section 2D)", () => {
    const gestionSubmission = {
      ...baseValidSubmission,
      mainLocation: "gestion_sanitaria" as const,
      section2D: {
        ambitoGestion: "provincial",
        rolGestion: "equipo_tecnico",
        rolGestionOtra: "",
        areaEspacio: "Dirección de Redes",
      },
    };
    const res = validateSurveySubmission(gestionSubmission);
    expect(res.valid).toBe(true);
  });

  it("validates unlinked contact submission independently without survey response id (S8)", () => {
    const validContact = validateContactSubmission({
      clientSubmissionId: "22222222-2222-4222-8222-222222222222",
      nombre: "María Gómez",
      telefono: "11-5555-4444",
      email: "maria@example.com",
      regionSanitaria: "VI",
      municipio: "Lanús",
      tematicasInteres: ["Salud mental comunitaria"],
      comentarios: "Quiero sumarme a la mesa regional",
    });
    expect(validContact.valid).toBe(true);
  });
});
