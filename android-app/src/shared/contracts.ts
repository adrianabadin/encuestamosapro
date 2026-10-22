export {
  REGIONES_SANITARIAS,
  MUNICIPIOS_PBA,
  getMunicipiosByRegion,
  normalizeRegionCode,
} from "../../../src/lib/catalog/pba-municipios";

export {
  DEFAULT_SURVEY_SCHEMA,
  DEFAULT_THEMES,
  DEFAULT_HOSPITAL_SERVICES,
} from "../../../src/lib/survey/default-schema";

export type {
  SurveySchema,
  SurveySection,
  SurveyQuestion,
  SurveyTheme,
  QuestionOption,
  QuestionType,
} from "../../../src/lib/survey/default-schema";

export {
  validateSurveySubmission,
  validateContactSubmission,
} from "../../../src/lib/survey/validator";

export type {
  SurveySubmissionPayload,
  ContactSubmissionPayload,
  PriorityRankEntry,
  CustomThemeEntry,
  PriorityDetailPair,
} from "../../../src/lib/survey/validator";

export {
  getActiveSectionIds,
  getRankThemeLabel,
} from "../../../src/lib/survey/flow-helpers";

export type { MainLocationType } from "../../../src/lib/survey/flow-helpers";
