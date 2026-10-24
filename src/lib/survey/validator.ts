export interface PriorityRankEntry {
  rank: number; // 1 to 5
  themeId: string;
  themeLabel: string;
}

export interface CustomThemeEntry {
  id: string;
  title: string;
  description: string;
}

export interface PriorityDetailPair {
  problema: string;
  propuesta: string;
}

export interface SurveySubmissionPayload {
  clientSubmissionId: string;
  surveyVersion?: number;
  createdAtClient?: string;
  sourcePlatform?: "web" | "android";
  isComplete?: boolean;
  currentStep?: string;
  consent: boolean;
  mainLocation?:
    | "primer_nivel"
    | "hospital"
    | "comunitario"
    | "gestion_sanitaria"
    | "institucion_educativa"
    | "otro";
  mainLocationOtro?: string;
  sectionEducativa?: {
    nivel: string;
    jurisdiccion: string;
    rol: string;
    rolOtro?: string;
  };
  section2A?: {
    tarea: string;
    tareaOtra?: string;
  };
  section2B?: {
    tipoHospital: string;
    tarea: string;
    tareaOtra?: string;
    areaServicio: string;
  };
  section2C?: {
    tipoOrganizacion: string;
    tipoOrganizacionOtra?: string;
    rol: string;
    rolOtro?: string;
  };
  section2D?: {
    ambitoGestion: string;
    rolGestion: string;
    rolGestionOtra?: string;
    areaEspacio: string;
  };
  section3?: {
    regionSanitaria: string;
    municipio: string;
    antiguedad: string;
  };
  section4?: {
    priorities: PriorityRankEntry[];
    customThemes?: CustomThemeEntry[];
    rank1Detail: PriorityDetailPair;
    rank2Detail: PriorityDetailPair;
    rank3Detail: PriorityDetailPair;
    otraTematicaAbierta?: string;
    relacionZonal: string;
  };
  section5?: {
    interesaMesa: "si" | "no" | "tal_vez";
    tematicasMesa?: string[];
    ofreceReferente?: "si" | "no";
    horarios?: string[];
    modalidad?: "virtual" | "presencial" | "mixta";
  };
  customAnswers?: Record<string, string | string[]>;
}

export interface ContactSubmissionPayload {
  clientSubmissionId: string;
  createdAtClient?: string;
  sourcePlatform?: "web" | "android";
  nombre: string;
  telefono: string;
  email?: string;
  regionSanitaria: string;
  municipio: string;
  organizacionOEspacio?: string;
  tematicasInteres: string[];
  ofreceReferente?: boolean;
  horarios?: string[];
  modalidad?: string;
  comentarios?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateSurveySubmission(
  payload: Partial<SurveySubmissionPayload>
): ValidationResult {
  const errors: string[] = [];

  if (!payload.clientSubmissionId || !payload.clientSubmissionId.trim()) {
    errors.push("Falta el identificador de envío (clientSubmissionId).");
  }

  if (payload.consent !== true) {
    errors.push(
      "El consentimiento (Sección 0) es obligatorio para guardar o enviar el relevamiento."
    );
    return { valid: false, errors };
  }

  // If this is a progressive partial save (isComplete === false), only require clientSubmissionId + consent === true
  if (payload.isComplete === false) {
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  if (
    !payload.mainLocation ||
    ![
      "primer_nivel",
      "hospital",
      "comunitario",
      "gestion_sanitaria",
      "institucion_educativa",
      "otro",
    ].includes(payload.mainLocation)
  ) {
    errors.push(
      "Debés seleccionar dónde realizás tu tarea principal (Sección 1)."
    );
  }

  // Validate branch Section 2
  if (payload.mainLocation === "primer_nivel") {
    const s2a = payload.section2A;
    if (!s2a || !s2a.tarea?.trim()) {
      errors.push(
        "En Sección 2A debés seleccionar tu tarea en el primer nivel."
      );
    } else if (s2a.tarea === "otra" && !s2a.tareaOtra?.trim()) {
      errors.push("En Sección 2A elegiste «Otra»: por favor especificá ¿Cuál?.");
    }
  } else if (payload.mainLocation === "hospital") {
    const s2b = payload.section2B;
    if (!s2b) {
      errors.push("Faltan completar los datos de Sección 2B (Hospital).");
    } else {
      if (!s2b.tipoHospital?.trim()) {
        errors.push(
          "En Sección 2B debés indicar el ámbito de gestión del hospital (Nacional, Provincial o Municipal)."
        );
      }
      if (!s2b.tarea?.trim()) {
        errors.push("En Sección 2B debés indicar tu tarea.");
      } else if (s2b.tarea === "otra" && !s2b.tareaOtra?.trim()) {
        errors.push(
          "En Sección 2B elegiste «Otra» en tu tarea: por favor especificá ¿Cuál?."
        );
      }
      if (!s2b.areaServicio?.trim()) {
        errors.push(
          "En Sección 2B debés completar el área o servicio donde trabajás."
        );
      }
    }
  } else if (payload.mainLocation === "comunitario") {
    const s2c = payload.section2C;
    if (!s2c) {
      errors.push(
        "Faltan completar los datos de Sección 2C (Dispositivo comunitario)."
      );
    } else {
      if (!s2c.tipoOrganizacion?.trim()) {
        errors.push("En Sección 2C debés indicar el tipo de organización.");
      } else if (
        s2c.tipoOrganizacion === "otra" &&
        !s2c.tipoOrganizacionOtra?.trim()
      ) {
        errors.push(
          "En Sección 2C elegiste «Otra» en tipo de organización: por favor especificá ¿Cuál?."
        );
      }
      if (!s2c.rol?.trim()) {
        errors.push("En Sección 2C debés indicar tu rol.");
      } else if (s2c.rol === "otro" && !s2c.rolOtro?.trim()) {
        errors.push(
          "En Sección 2C elegiste «Otro» en tu rol: por favor especificá ¿Cuál?."
        );
      }
    }
  } else if (payload.mainLocation === "otro") {
    if (!payload.mainLocationOtro?.trim()) {
      errors.push(
        "En Sección 1 elegiste «Otros»: por favor especificá ¿Cuál? es tu espacio de trabajo."
      );
    }
  } else if (payload.mainLocation === "institucion_educativa") {
    const edu = payload.sectionEducativa;
    if (!edu?.nivel?.trim()) {
      errors.push("En Sección 1 debés indicar el nivel de la institución educativa.");
    }
    if (!edu?.jurisdiccion?.trim()) {
      errors.push(
        "En Sección 1 debés indicar la jurisdicción de la institución educativa (municipal, provincial o nacional)."
      );
    }
    if (!edu?.rol?.trim()) {
      errors.push("En Sección 1 debés indicar tu rol en la institución educativa.");
    } else if (edu.rol === "otro" && !edu.rolOtro?.trim()) {
      errors.push(
        "En Sección 1 elegiste «Otro» en tu rol: por favor especificá ¿Cuál?."
      );
    }
  } else if (payload.mainLocation === "gestion_sanitaria") {
    const s2d = payload.section2D;
    if (!s2d) {
      errors.push(
        "Faltan completar los datos de Sección 2D (Gestión sanitaria)."
      );
    } else {
      if (!s2d.ambitoGestion?.trim()) {
        errors.push(
          "En Sección 2D debés indicar el ámbito de gestión (Nacional, Provincial o Municipal)."
        );
      }
      if (!s2d.rolGestion?.trim()) {
        errors.push("En Sección 2D debés indicar tu función o rol.");
      } else if (s2d.rolGestion === "otra" && !s2d.rolGestionOtra?.trim()) {
        errors.push(
          "En Sección 2D elegiste «Otra» en tu rol: por favor especificá ¿Cuál?."
        );
      }
      if (!s2d.areaEspacio?.trim()) {
        errors.push(
          "En Sección 2D debés completar el área, dirección o espacio donde trabajás."
        );
      }
    }
  }

  // Validate Section 3
  const s3 = payload.section3;
  if (!s3) {
    errors.push("Faltan completar los datos generales (Sección 3).");
  } else {
    if (!s3.regionSanitaria?.trim()) {
      errors.push("Debés seleccionar la Región Sanitaria (Sección 3.1).");
    }
    if (!s3.municipio?.trim()) {
      errors.push("Debés indicar el Municipio (Sección 3.2).");
    }
    if (!s3.antiguedad?.trim()) {
      errors.push("Debés seleccionar tu antigüedad en la tarea (Sección 3.3).");
    }
  }

  // Validate Section 4 (note: 4.2, 4.3, 4.4 problem/proposal are non-blocking per user request)
  const s4 = payload.section4;
  if (!s4) {
    errors.push("Faltan completar las prioridades (Sección 4).");
  } else {
    if (Array.isArray(s4.customThemes)) {
      for (const ct of s4.customThemes) {
        if (!ct.title?.trim() || !ct.description?.trim()) {
          errors.push(
            "Para cada temática agregada en «Otra», es obligatorio completar tanto el título como la descripción/explicación de lo que aborda el tema."
          );
        }
      }
    }

    const priorities = s4.priorities || [];
    if (priorities.length !== 5) {
      errors.push(
        "Debés elegir exactamente 5 temáticas prioritarias ordenadas del 1.° al 5.° lugar (Sección 4.1)."
      );
    } else {
      const ranks = priorities.map((p) => p.rank).sort((a, b) => a - b);
      if (ranks.join(",") !== "1,2,3,4,5") {
        errors.push(
          "Cada columna del 1.° al 5.° lugar debe tener exactamente una temática asignada."
        );
      }
      const uniqueThemes = new Set(priorities.map((p) => p.themeId));
      if (uniqueThemes.size !== 5) {
        errors.push(
          "No podés repetir la misma temática en más de un puesto de prioridad."
        );
      }
    }

    if (!s4.relacionZonal?.trim()) {
      errors.push(
        "Debés describir cómo ves la relación entre el centro de salud, el hospital y las organizaciones de tu zona (Sección 4.6)."
      );
    }
  }

  // Validate Section 5
  const s5 = payload.section5;
  if (!s5 || !["si", "no", "tal_vez"].includes(s5.interesaMesa || "")) {
    errors.push(
      "Debés responder si te interesa integrar una mesa de trabajo (Sección 5.1)."
    );
  } else if (s5.interesaMesa === "si" || s5.interesaMesa === "tal_vez") {
    if (!Array.isArray(s5.tematicasMesa) || s5.tematicasMesa.length === 0) {
      errors.push(
        "Seleccioná al menos una temática sobre la que te gustaría trabajar (Sección 5.2)."
      );
    }
    if (!s5.ofreceReferente || !["si", "no"].includes(s5.ofreceReferente)) {
      errors.push("Indicá si te ofrecés como referente de mesa (Sección 5.3).");
    }
    if (!Array.isArray(s5.horarios) || s5.horarios.length === 0) {
      errors.push(
        "Seleccioná al menos un horario posible para los encuentros (Sección 5.4)."
      );
    }
    if (
      !s5.modalidad ||
      !["virtual", "presencial", "mixta"].includes(s5.modalidad)
    ) {
      errors.push(
        "Seleccioná tu modalidad preferida para los encuentros (Sección 5.5)."
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateContactSubmission(
  payload: Partial<ContactSubmissionPayload>
): ValidationResult {
  const errors: string[] = [];

  if (!payload.clientSubmissionId?.trim()) {
    errors.push("Falta el identificador de envío (clientSubmissionId).");
  }
  if (!payload.nombre?.trim()) {
    errors.push("Por favor ingresá tu nombre y apellido.");
  }
  if (!payload.telefono?.trim() && !payload.email?.trim()) {
    errors.push(
      "Ingresá al menos un teléfono/WhatsApp o correo electrónico de contacto."
    );
  }
  if (!payload.regionSanitaria?.trim()) {
    errors.push("Seleccioná tu Región Sanitaria.");
  }
  if (!payload.municipio?.trim()) {
    errors.push("Seleccioná tu Municipio.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
