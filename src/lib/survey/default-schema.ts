export interface SurveyTheme {
  id: string;
  label: string;
  description?: string;
  order: number;
  active: boolean;
}

export interface QuestionOption {
  value: string;
  label: string;
  nextSection?: string;
  requiresSpecify?: boolean;
}

export type QuestionType =
  | "consent"
  | "single_choice"
  | "multi_choice"
  | "short_text"
  | "long_text"
  | "region_select"
  | "municipio_autocomplete"
  | "service_combobox"
  | "priority_grid"
  | "priority_detail_pair";

export const DEFAULT_HOSPITAL_SERVICES: string[] = [
  "Guardia / Emergencias",
  "Clínica Médica",
  "Pediatría / Neonatología",
  "Ginecología y Obstetricia / Maternidad",
  "Cirugía / Quirófano",
  "Terapia Intensiva (UTI / UCIP)",
  "Salud Mental",
  "Enfermería",
  "Consultorios Externos",
  "Diagnóstico por Imágenes (Rayos, Ecografía, Tomografía)",
  "Laboratorio / Hemoterapia",
  "Farmacia / Esterilización",
  "Kinesiología y Rehabilitación",
  "Trabajo Social / Servicio Social",
  "Epidemiología / Estadística",
  "Docencia e Investigación / Residencias",
  "Administración / Admisión / Turnos / Facturación (SAMO)",
  "Mantenimiento / Limpieza / Cocina / Camilleros / Seguridad",
  "Traslados / Choferes / SIES",
  "Dirección / Gestión Hospitalaria",
];

export interface SurveyQuestion {
  id: string;
  sectionId: string;
  code: string;
  label: string;
  helperText?: string;
  type: QuestionType;
  required: boolean;
  options?: QuestionOption[];
  specifyLabel?: string;
  condition?: {
    dependsOnQuestionId: string;
    allowedValues: string[];
  };
  order: number;
  isCustom?: boolean;
}

export interface SurveySection {
  id: string;
  title: string;
  description?: string;
  condition?: {
    dependsOnQuestionId: string;
    allowedValues: string[];
  };
  order: number;
  questions: SurveyQuestion[];
}

export interface SurveySchema {
  version: number;
  title: string;
  subtitle: string;
  finalMessage: string;
  contactFormPath: string;
  themes: SurveyTheme[];
  sections: SurveySection[];
}

export const DEFAULT_THEMES: SurveyTheme[] = [
  { id: "fuerza_laboral", label: "Fuerza laboral", order: 1, active: true },
  { id: "financiamiento", label: "Financiamiento", order: 2, active: true },
  {
    id: "abordajes_territoriales",
    label: "Abordajes territoriales",
    order: 3,
    active: true,
  },
  {
    id: "redes_integradas",
    label: "Redes integradas y articulación",
    order: 4,
    active: true,
  },
  {
    id: "salud_mental",
    label: "Salud mental comunitaria",
    order: 5,
    active: true,
  },
  {
    id: "sistemas_informacion_asis",
    label:
      "Sistemas de información, vigilancia epidemiológica y ASIS participativo",
    order: 6,
    active: true,
  },
  {
    id: "implementacion_hsi",
    label: "Implementación de HSI (Historia de Salud Integrada)",
    order: 7,
    active: true,
  },
  {
    id: "insumos_equipamiento",
    label: "Gestión de insumos y equipamiento",
    order: 8,
    active: true,
  },
  {
    id: "salud_educacion",
    label: "Salud y educación",
    order: 9,
    active: true,
  },
  {
    id: "comunicacion_social",
    label: "Comunicación social y estrategias mediáticas",
    order: 10,
    active: true,
  },
  { id: "agroecologia", label: "Agroecología", order: 11, active: true },
  {
    id: "infraestructura_emergencias",
    label: "Infraestructura, mantenimiento y red de emergencias",
    order: 12,
    active: true,
  },
  {
    id: "cuidados_genero_curso_vida",
    label: "Cuidados, género, niñez y curso de vida / discapacidad",
    order: 13,
    active: true,
  },
];

export const DEFAULT_SURVEY_SCHEMA: SurveySchema = {
  version: 3,
  title: "Relevamiento Sanitario Territorial — MOSAPRO",
  subtitle:
    "Movimiento Sanitario Provincial · Hacia una construcción colectiva del sistema de salud bonaerense",
  finalMessage:
    "¡Gracias! Si querés que te convoquemos a una mesa, dejanos tus datos en este otro formulario, que no se vincula con tus respuestas:",
  contactFormPath: "/contacto",
  themes: DEFAULT_THEMES,
  sections: [
    {
      id: "S0",
      title: "Sección 0. Consentimiento",
      description: "Participación voluntaria y confidencialidad de los datos.",
      order: 0,
      questions: [
        {
          id: "q_consent",
          sectionId: "S0",
          code: "0.1",
          label:
            "Tu participación es voluntaria y anónima. No pedimos tu nombre. Las respuestas se analizan en forma agregada y solo las ve el equipo de sistematización del MOSAPRO. ¿Aceptás participar?",
          type: "consent",
          required: true,
          order: 1,
          options: [
            { value: "si", label: "Sí, acepto" },
            { value: "no", label: "No" },
          ],
        },
      ],
    },
    {
      id: "S1",
      title: "Sección 1. ¿Dónde realizás tu tarea principal?",
      description: "Seleccioná el espacio donde desarrollás tu actividad principal.",
      order: 1,
      questions: [
        {
          id: "q_main_location",
          sectionId: "S1",
          code: "1.1",
          label: "¿Dónde realizás tu tarea principal?",
          type: "single_choice",
          required: true,
          order: 1,
          specifyLabel: "¿Cuál?",
          options: [
            {
              value: "primer_nivel",
              label: "Centro de salud o unidad sanitaria (primer nivel)",
              nextSection: "S2A",
            },
            {
              value: "hospital",
              label: "Hospital municipal o provincial (segundo nivel)",
              nextSection: "S2B",
            },
            {
              value: "comunitario",
              label:
                "Sociedad de fomento, organización barrial, club, dispensario, CIC u otro espacio comunitario",
              nextSection: "S2C",
            },
            {
              value: "gestion_sanitaria",
              label: "Gestión sanitaria",
              nextSection: "S2D",
            },
            {
              value: "institucion_educativa",
              label: "Instituciones educativas",
              nextSection: "S3",
            },
            {
              value: "otro",
              label: "Otros",
              nextSection: "S3",
              requiresSpecify: true,
            },
          ],
        },
        {
          id: "q_1e_nivel",
          sectionId: "S1",
          code: "1.2",
          label: "Nivel educativo:",
          type: "single_choice",
          required: true,
          order: 2,
          condition: {
            dependsOnQuestionId: "q_main_location",
            allowedValues: ["institucion_educativa"],
          },
          options: [
            { value: "primario", label: "Primario" },
            { value: "secundario", label: "Secundario" },
            { value: "terciario", label: "Terciario" },
            { value: "universitario", label: "Universitario" },
          ],
        },
        {
          id: "q_1e_jurisdiccion",
          sectionId: "S1",
          code: "1.3",
          label: "Jurisdicción de la institución:",
          type: "single_choice",
          required: true,
          order: 3,
          condition: {
            dependsOnQuestionId: "q_main_location",
            allowedValues: ["institucion_educativa"],
          },
          options: [
            { value: "municipal", label: "Municipal" },
            { value: "provincial", label: "Provincial" },
            { value: "nacional", label: "Nacional" },
          ],
        },
        {
          id: "q_1e_rol",
          sectionId: "S1",
          code: "1.4",
          label: "Tu rol en la institución:",
          type: "single_choice",
          required: true,
          order: 4,
          specifyLabel: "¿Cuál?",
          condition: {
            dependsOnQuestionId: "q_main_location",
            allowedValues: ["institucion_educativa"],
          },
          options: [
            { value: "docente", label: "Docente" },
            { value: "directivo", label: "Directivo/a" },
            {
              value: "equipo_orientacion",
              label: "Equipo de orientación escolar",
            },
            { value: "no_docente", label: "Auxiliar / no docente" },
            { value: "estudiante", label: "Estudiante" },
            { value: "otro", label: "Otro", requiresSpecify: true },
          ],
        },
      ],
    },
    {
      id: "S2A",
      title: "Sección 2A. Primer nivel",
      description: "Centro de salud o unidad sanitaria (primer nivel de atención).",
      order: 2,
      condition: {
        dependsOnQuestionId: "q_main_location",
        allowedValues: ["primer_nivel"],
      },
      questions: [
        {
          id: "q_2a_tarea",
          sectionId: "S2A",
          code: "2A.1",
          label: "Tu tarea:",
          type: "single_choice",
          required: true,
          order: 1,
          specifyLabel: "¿Cuál?",
          options: [
            { value: "profesional_medico", label: "Profesional médico" },
            { value: "otro_profesional", label: "Otro profesional" },
            { value: "enfermeria", label: "Enfermería" },
            { value: "promotor_salud", label: "Promotor de salud" },
            { value: "administrativo", label: "Administrativo" },
            { value: "servicios_apoyo", label: "Servicios de apoyo" },
            { value: "otra", label: "Otra", requiresSpecify: true },
          ],
        },
      ],
    },
    {
      id: "S2B",
      title: "Sección 2B. Hospital",
      description: "Hospital nacional, provincial o municipal (segundo nivel).",
      order: 3,
      condition: {
        dependsOnQuestionId: "q_main_location",
        allowedValues: ["hospital"],
      },
      questions: [
        {
          id: "q_2b_tipo_hospital",
          sectionId: "S2B",
          code: "2B.1",
          label: "Dependencia / Gestión del hospital:",
          type: "single_choice",
          required: true,
          order: 1,
          options: [
            { value: "nacional", label: "Gestión Nacional" },
            { value: "provincial", label: "Gestión Provincial" },
            { value: "municipal", label: "Gestión Municipal" },
          ],
        },
        {
          id: "q_2b_tarea",
          sectionId: "S2B",
          code: "2B.2",
          label: "Tu tarea:",
          type: "single_choice",
          required: true,
          order: 2,
          specifyLabel: "¿Cuál?",
          options: [
            { value: "enfermeria", label: "Enfermería" },
            { value: "tecnico", label: "Técnico" },
            { value: "administrativo", label: "Administrativo" },
            { value: "chofer", label: "Chofer" },
            { value: "medico", label: "Médico" },
            { value: "otro_profesional", label: "Otro profesional" },
            {
              value: "servicios_apoyo",
              label:
                "Servicios de apoyo (limpieza, mantenimiento, cocina, seguridad)",
            },
            { value: "otra", label: "Otra", requiresSpecify: true },
          ],
        },
        {
          id: "q_2b_area_servicio",
          sectionId: "S2B",
          code: "2B.3",
          label: "Área o servicio donde trabajás:",
          helperText:
            "Podés elegir de la lista filtrando al escribir o dejar escrito manualmente tu servicio.",
          type: "service_combobox",
          required: true,
          order: 3,
        },
      ],
    },
    {
      id: "S2C",
      title: "Sección 2C. Dispositivo comunitario",
      description:
        "Sociedad de fomento, organización barrial, club, dispensario, CIC u otro espacio comunitario.",
      order: 4,
      condition: {
        dependsOnQuestionId: "q_main_location",
        allowedValues: ["comunitario"],
      },
      questions: [
        {
          id: "q_2c_tipo_org",
          sectionId: "S2C",
          code: "2C.1",
          label: "Tipo de organización:",
          type: "single_choice",
          required: true,
          order: 1,
          specifyLabel: "¿Cuál?",
          options: [
            { value: "sociedad_fomento", label: "Sociedad de fomento" },
            { value: "organizacion_barrial", label: "Organización barrial" },
            { value: "club", label: "Club" },
            { value: "dispensario", label: "Dispensario" },
            { value: "cic", label: "CIC" },
            { value: "otra", label: "Otra", requiresSpecify: true },
          ],
        },
        {
          id: "q_2c_rol",
          sectionId: "S2C",
          code: "2C.2",
          label: "Tu rol:",
          type: "single_choice",
          required: true,
          order: 2,
          specifyLabel: "¿Cuál?",
          options: [
            { value: "referente_dirigente", label: "Referente o dirigente" },
            { value: "trabajador_rentado", label: "Trabajador rentado" },
            { value: "voluntario", label: "Voluntario" },
            { value: "otro", label: "Otro", requiresSpecify: true },
          ],
        },
      ],
    },
    {
      id: "S2D",
      title: "Sección 2D. Gestión sanitaria",
      description:
        "Espacios de gestión sanitaria nacional, provincial o municipal.",
      order: 5,
      condition: {
        dependsOnQuestionId: "q_main_location",
        allowedValues: ["gestion_sanitaria"],
      },
      questions: [
        {
          id: "q_2d_ambito",
          sectionId: "S2D",
          code: "2D.1",
          label: "Ámbito de gestión:",
          type: "single_choice",
          required: true,
          order: 1,
          options: [
            { value: "nacional", label: "Gestión Nacional" },
            { value: "provincial", label: "Gestión Provincial" },
            { value: "municipal", label: "Gestión Municipal" },
          ],
        },
        {
          id: "q_2d_rol",
          sectionId: "S2D",
          code: "2D.2",
          label: "Tu función o rol:",
          type: "single_choice",
          required: true,
          order: 2,
          specifyLabel: "¿Cuál?",
          options: [
            {
              value: "direccion_conduccion",
              label: "Dirección / Secretaría / Coordinación",
            },
            {
              value: "equipo_tecnico",
              label: "Equipo técnico / profesional de gestión",
            },
            {
              value: "supervision_programa",
              label: "Referente de programa o red territorial",
            },
            {
              value: "administrativo_logistica",
              label: "Administración / compras / sistemas / logística",
            },
            { value: "otra", label: "Otra", requiresSpecify: true },
          ],
        },
        {
          id: "q_2d_area",
          sectionId: "S2D",
          code: "2D.3",
          label: "Área, dirección, secretaría o Región Sanitaria donde desempeñás tu tarea:",
          helperText: "Respuesta breve.",
          type: "short_text",
          required: true,
          order: 3,
        },
      ],
    },
    {
      id: "S3",
      title: "Sección 3. Datos generales",
      description: "Información territorial y antigüedad en la tarea.",
      order: 5,
      questions: [
        {
          id: "q_3_region",
          sectionId: "S3",
          code: "3.1",
          label: "Región sanitaria (I a XII):",
          helperText: "Si ingresaste desde un enlace regional, ya viene completada.",
          type: "region_select",
          required: true,
          order: 1,
        },
        {
          id: "q_3_municipio",
          sectionId: "S3",
          code: "3.2",
          label: "Municipio:",
          helperText:
            "Buscá y seleccioná tu municipio de la Provincia de Buenos Aires.",
          type: "municipio_autocomplete",
          required: true,
          order: 2,
        },
        {
          id: "q_3_antiguedad",
          sectionId: "S3",
          code: "3.3",
          label: "Antigüedad en la tarea:",
          type: "single_choice",
          required: true,
          order: 3,
          options: [
            { value: "menos_de_5", label: "Menos de 5 años" },
            { value: "5_a_10", label: "5 a 10 años" },
            { value: "11_a_20", label: "11 a 20 años" },
            { value: "mas_de_20", label: "Más de 20 años" },
          ],
        },
      ],
    },
    {
      id: "S4",
      title: "Sección 4. Prioridades",
      description:
        "Identificación de problemáticas prioritarias y propuestas desde el territorio.",
      order: 6,
      questions: [
        {
          id: "q_4_priorities",
          sectionId: "S4",
          code: "4.1",
          label:
            "Elegí las 5 temáticas que considerás prioritarias y ordenalas de 1.° (la más importante) a 5.°.",
          helperText:
            "Un solo tema por puesto (1.° a 5.°). Podés sumar una temática propia con el botón «+ Agregar otra temática» indicando su título y descripción.",
          type: "priority_grid",
          required: true,
          order: 1,
        },
        {
          id: "q_4_rank1_detail",
          sectionId: "S4",
          code: "4.2",
          label:
            "Sobre la temática que ubicaste en 1.° lugar: ¿cuál es el principal problema que ves en tu trabajo o en tu barrio y qué propuesta tenés?",
          type: "priority_detail_pair",
          required: false,
          order: 2,
        },
        {
          id: "q_4_rank2_detail",
          sectionId: "S4",
          code: "4.3",
          label:
            "Sobre la temática que ubicaste en 2.° lugar: ¿cuál es el principal problema que ves en tu trabajo o en tu barrio y qué propuesta tenés?",
          type: "priority_detail_pair",
          required: false,
          order: 3,
        },
        {
          id: "q_4_rank3_detail",
          sectionId: "S4",
          code: "4.4",
          label:
            "Sobre la temática que ubicaste en 3.° lugar: ¿cuál es el principal problema que ves en tu trabajo o en tu barrio y qué propuesta tenés?",
          type: "priority_detail_pair",
          required: false,
          order: 4,
        },
        {
          id: "q_4_otra_tematica_abierta",
          sectionId: "S4",
          code: "4.5",
          label:
            "¿Hay alguna temática que no esté en la lista y debería abordarse?",
          helperText: "Respuesta abierta, opcional.",
          type: "long_text",
          required: false,
          order: 5,
        },
        {
          id: "q_4_relacion_zonal",
          sectionId: "S4",
          code: "4.6",
          label:
            "¿Cómo describirías hoy la relación entre el centro de salud, el hospital y las organizaciones de tu zona?",
          type: "single_choice",
          required: true,
          order: 6,
          options: [
            { value: "muy_buena", label: "Muy buena" },
            { value: "buena", label: "Buena" },
            { value: "regular", label: "Regular" },
            { value: "mala", label: "Mala" },
            { value: "no_se", label: "No sé" },
          ],
        },
      ],
    },
    {
      id: "S5",
      title: "Sección 5. Participación",
      description: "Espacios de encuentro y mesas de trabajo del MOSAPRO.",
      order: 7,
      questions: [
        {
          id: "q_5_interesa_mesa",
          sectionId: "S5",
          code: "5.1",
          label: "¿Te interesa integrar una mesa de trabajo?",
          type: "single_choice",
          required: true,
          order: 1,
          options: [
            { value: "si", label: "Sí" },
            { value: "no", label: "No" },
            { value: "tal_vez", label: "Tal vez" },
          ],
        },
        {
          id: "q_5_tematicas_mesa",
          sectionId: "S5",
          code: "5.2",
          label: "¿Sobre qué temáticas te gustaría trabajar?",
          helperText: "Podés marcar varias opciones.",
          type: "multi_choice",
          required: true,
          order: 2,
          condition: {
            dependsOnQuestionId: "q_5_interesa_mesa",
            allowedValues: ["si", "tal_vez"],
          },
        },
        {
          id: "q_5_ofrece_referente",
          sectionId: "S5",
          code: "5.3",
          label: "¿Te ofrecés como referente de mesa?",
          type: "single_choice",
          required: true,
          order: 3,
          condition: {
            dependsOnQuestionId: "q_5_interesa_mesa",
            allowedValues: ["si", "tal_vez"],
          },
          options: [
            { value: "si", label: "Sí" },
            { value: "no", label: "No" },
          ],
        },
        {
          id: "q_5_horarios",
          sectionId: "S5",
          code: "5.4",
          label: "Horarios posibles para los encuentros:",
          helperText: "Podés marcar varios horarios.",
          type: "multi_choice",
          required: true,
          order: 4,
          condition: {
            dependsOnQuestionId: "q_5_interesa_mesa",
            allowedValues: ["si", "tal_vez"],
          },
          options: [
            { value: "manana", label: "Mañana" },
            { value: "mediodia", label: "Mediodía" },
            { value: "tarde", label: "Tarde" },
            { value: "noche", label: "Noche" },
          ],
        },
        {
          id: "q_5_modalidad",
          sectionId: "S5",
          code: "5.5",
          label: "Modalidad preferida:",
          type: "single_choice",
          required: true,
          order: 5,
          condition: {
            dependsOnQuestionId: "q_5_interesa_mesa",
            allowedValues: ["si", "tal_vez"],
          },
          options: [
            { value: "virtual", label: "Virtual" },
            { value: "presencial", label: "Presencial" },
            { value: "mixta", label: "Mixta" },
          ],
        },
      ],
    },
  ],
};
