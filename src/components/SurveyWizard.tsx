"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  HeartHandshake,
  CloudOff,
  RotateCcw,
} from "lucide-react";
import {
  DEFAULT_SURVEY_SCHEMA,
  SurveySchema,
  SurveyQuestion,
} from "@/lib/survey/default-schema";
import {
  SurveySubmissionPayload,
  PriorityRankEntry,
  CustomThemeEntry,
  validateSurveySubmission,
} from "@/lib/survey/validator";
import {
  REGIONES_SANITARIAS,
  REGION_NO_CALIFICA,
  MUNICIPIOS_PBA,
  getMunicipiosByRegion,
  normalizeRegionCode,
} from "@/lib/catalog/pba-municipios";
import {
  enqueueOfflineResponse,
  flushOfflineQueues,
  getCachedSurveySchema,
  saveCachedSurveySchema,
} from "@/lib/offline/sync-queue";
import {
  getActiveSectionIds,
  getRankThemeLabel,
  MainLocationType,
} from "@/lib/survey/flow-helpers";
import { MunicipioAutocomplete } from "./MunicipioAutocomplete";
import { HospitalServiceCombobox } from "./HospitalServiceCombobox";
import { PriorityGrid } from "./PriorityGrid";

const ACTIVE_DRAFT_STORAGE_KEY = "mosapro_active_draft_v2";

const BUILTIN_QUESTION_IDS = new Set([
  "q_consent",
  "q_main_location",
  "q_1e_nivel",
  "q_1e_jurisdiccion",
  "q_1e_rol",
  "q_2a_tarea",
  "q_2b_tipo_hospital",
  "q_2b_tarea",
  "q_2b_area_servicio",
  "q_2c_tipo_org",
  "q_2c_rol",
  "q_2d_ambito",
  "q_2d_rol",
  "q_2d_area",
  "q_3_region",
  "q_3_municipio",
  "q_3_antiguedad",
  "q_4_priorities",
  "q_4_rank1_detail",
  "q_4_rank2_detail",
  "q_4_rank3_detail",
  "q_4_otra_tematica_abierta",
  "q_4_relacion_zonal",
  "q_5_interesa_mesa",
  "q_5_tematicas_mesa",
  "q_5_ofrece_referente",
  "q_5_horarios",
  "q_5_modalidad",
]);

function generateUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sub_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

interface SurveyWizardProps {
  initialRegion?: string;
}

export function SurveyWizard({ initialRegion }: SurveyWizardProps) {
  const searchParams = useSearchParams();
  const [schema, setSchema] = useState<SurveySchema>(DEFAULT_SURVEY_SCHEMA);
  const [submissionId, setSubmissionId] = useState<string>("");
  const [stepIndex, setStepIndex] = useState(0);
  const [declinedConsent, setDeclinedConsent] = useState(false);
  const [submittedState, setSubmittedState] = useState<{
    done: boolean;
    savedOffline: boolean;
  }>({ done: false, savedOffline: false });
  const [submitting, setSubmitting] = useState(false);
  const [stepErrors, setStepErrors] = useState<string[]>([]);

  // Form State
  const [consent, setConsent] = useState<boolean | null>(null);
  const [mainLocation, setMainLocation] = useState<MainLocationType>("");

  // 2A
  const [s2aTarea, setS2aTarea] = useState("");
  const [s2aTareaOtra, setS2aTareaOtra] = useState("");

  // 2B (Hospital)
  const [s2bTipoHospital, setS2bTipoHospital] = useState("");
  const [s2bTarea, setS2bTarea] = useState("");
  const [s2bTareaOtra, setS2bTareaOtra] = useState("");
  const [s2bAreaServicio, setS2bAreaServicio] = useState("");

  // 2C (Comunitario)
  const [s2cTipoOrg, setS2cTipoOrg] = useState("");
  const [s2cTipoOrgOtra, setS2cTipoOrgOtra] = useState("");
  const [s2cRol, setS2cRol] = useState("");
  const [s2cRolOtro, setS2cRolOtro] = useState("");

  // 2D (Gestión Sanitaria)
  const [s2dAmbito, setS2dAmbito] = useState("");
  const [s2dRol, setS2dRol] = useState("");
  const [s2dRolOtra, setS2dRolOtra] = useState("");
  const [s2dArea, setS2dArea] = useState("");

  // Section 1 «Otros» free text
  const [mainLocationOtro, setMainLocationOtro] = useState("");

  // 1E (Instituciones educativas, inline cascade in Section 1)
  const [eduNivel, setEduNivel] = useState("");
  const [eduJurisdiccion, setEduJurisdiccion] = useState("");
  const [eduRol, setEduRol] = useState("");
  const [eduRolOtro, setEduRolOtro] = useState("");

  // Section 3
  const [regionSanitaria, setRegionSanitaria] = useState("");
  const [regionLockedFromLink, setRegionLockedFromLink] = useState(false);
  const [municipio, setMunicipio] = useState("");
  const [antiguedad, setAntiguedad] = useState("");

  // Section 4
  const [priorities, setPriorities] = useState<PriorityRankEntry[]>([]);
  const [customThemes, setCustomThemes] = useState<CustomThemeEntry[]>([]);
  const [rank1Problema, setRank1Problema] = useState("");
  const [rank1Propuesta, setRank1Propuesta] = useState("");
  const [rank2Problema, setRank2Problema] = useState("");
  const [rank2Propuesta, setRank2Propuesta] = useState("");
  const [rank3Problema, setRank3Problema] = useState("");
  const [rank3Propuesta, setRank3Propuesta] = useState("");
  const [otraTematicaAbierta, setOtraTematicaAbierta] = useState("");
  const [relacionZonal, setRelacionZonal] = useState("");

  // Section 5
  const [interesaMesa, setInteresaMesa] = useState<"si" | "no" | "tal_vez" | "">(
    ""
  );
  const [tematicasMesa, setTematicasMesa] = useState<string[]>([]);
  const [ofreceReferente, setOfreceReferente] = useState<"si" | "no" | "">("");
  const [horarios, setHorarios] = useState<string[]>([]);
  const [modalidad, setModalidad] = useState<
    "virtual" | "presencial" | "mixta" | ""
  >("");

  // Custom Admin Questions
  const [customAnswers, setCustomAnswers] = useState<
    Record<string, string | string[]>
  >({});

  // Restore unfinished draft from localStorage or initialize a stable submissionId
  useEffect(() => {
    try {
      const rawDraft = window.localStorage.getItem(ACTIVE_DRAFT_STORAGE_KEY);
      if (rawDraft) {
        const parsed = JSON.parse(rawDraft);
        if (parsed && parsed.submissionId && !parsed.done) {
          setSubmissionId(parsed.submissionId);
          if (typeof parsed.stepIndex === "number")
            setStepIndex(parsed.stepIndex);
          if (typeof parsed.consent === "boolean") setConsent(parsed.consent);
          if (parsed.mainLocation) setMainLocation(parsed.mainLocation);
          if (parsed.s2aTarea) setS2aTarea(parsed.s2aTarea);
          if (parsed.s2aTareaOtra) setS2aTareaOtra(parsed.s2aTareaOtra);
          if (parsed.s2bTipoHospital)
            setS2bTipoHospital(parsed.s2bTipoHospital);
          if (parsed.s2bTarea) setS2bTarea(parsed.s2bTarea);
          if (parsed.s2bTareaOtra) setS2bTareaOtra(parsed.s2bTareaOtra);
          if (parsed.s2bAreaServicio)
            setS2bAreaServicio(parsed.s2bAreaServicio);
          if (parsed.s2cTipoOrg) setS2cTipoOrg(parsed.s2cTipoOrg);
          if (parsed.s2cTipoOrgOtra) setS2cTipoOrgOtra(parsed.s2cTipoOrgOtra);
          if (parsed.s2cRol) setS2cRol(parsed.s2cRol);
          if (parsed.s2cRolOtro) setS2cRolOtro(parsed.s2cRolOtro);
          if (parsed.s2dAmbito) setS2dAmbito(parsed.s2dAmbito);
          if (parsed.s2dRol) setS2dRol(parsed.s2dRol);
          if (parsed.s2dRolOtra) setS2dRolOtra(parsed.s2dRolOtra);
          if (parsed.s2dArea) setS2dArea(parsed.s2dArea);
          if (parsed.mainLocationOtro)
            setMainLocationOtro(parsed.mainLocationOtro);
          if (parsed.eduNivel) setEduNivel(parsed.eduNivel);
          if (parsed.eduJurisdiccion)
            setEduJurisdiccion(parsed.eduJurisdiccion);
          if (parsed.eduRol) setEduRol(parsed.eduRol);
          if (parsed.eduRolOtro) setEduRolOtro(parsed.eduRolOtro);
          if (parsed.regionSanitaria)
            setRegionSanitaria(parsed.regionSanitaria);
          if (parsed.municipio) setMunicipio(parsed.municipio);
          if (parsed.antiguedad) setAntiguedad(parsed.antiguedad);
          if (Array.isArray(parsed.priorities))
            setPriorities(parsed.priorities);
          if (Array.isArray(parsed.customThemes))
            setCustomThemes(parsed.customThemes);
          if (parsed.rank1Problema) setRank1Problema(parsed.rank1Problema);
          if (parsed.rank1Propuesta) setRank1Propuesta(parsed.rank1Propuesta);
          if (parsed.rank2Problema) setRank2Problema(parsed.rank2Problema);
          if (parsed.rank2Propuesta) setRank2Propuesta(parsed.rank2Propuesta);
          if (parsed.rank3Problema) setRank3Problema(parsed.rank3Problema);
          if (parsed.rank3Propuesta) setRank3Propuesta(parsed.rank3Propuesta);
          if (parsed.otraTematicaAbierta)
            setOtraTematicaAbierta(parsed.otraTematicaAbierta);
          if (parsed.relacionZonal) setRelacionZonal(parsed.relacionZonal);
          if (parsed.interesaMesa) setInteresaMesa(parsed.interesaMesa);
          if (Array.isArray(parsed.tematicasMesa))
            setTematicasMesa(parsed.tematicasMesa);
          if (parsed.ofreceReferente)
            setOfreceReferente(parsed.ofreceReferente);
          if (Array.isArray(parsed.horarios)) setHorarios(parsed.horarios);
          if (parsed.modalidad) setModalidad(parsed.modalidad);
          if (parsed.customAnswers) setCustomAnswers(parsed.customAnswers);
          return;
        }
      }
    } catch {
      // ignore corrupted draft
    }
    setSubmissionId(generateUuid());
  }, []);

  // Load schema from API or local cache
  useEffect(() => {
    setSchema(getCachedSurveySchema());
    fetch("/api/v1/survey")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.ok && data.survey) {
          setSchema(data.survey);
          saveCachedSurveySchema(data.survey);
        }
      })
      .catch(() => {
        // Offline: keep cached schema
      });
  }, []);

  // Prefill region from prop or query param (?region=VI)
  useEffect(() => {
    const queryRegion =
      initialRegion ||
      searchParams.get("region") ||
      searchParams.get("r") ||
      "";
    const normalized = normalizeRegionCode(queryRegion);
    if (normalized) {
      setRegionSanitaria(normalized);
      setRegionLockedFromLink(true);
    }
  }, [initialRegion, searchParams]);

  const activeSectionIds = getActiveSectionIds(mainLocation);
  const currentSectionId = activeSectionIds[stepIndex] || "S0";
  const currentSection =
    schema.sections.find((s) => s.id === currentSectionId) ||
    DEFAULT_SURVEY_SCHEMA.sections[0];

  const getQ = (
    id: string,
    fallbackLabel: string,
    fallbackOptions?: {
      value: string;
      label: string;
      requiresSpecify?: boolean;
    }[]
  ): SurveyQuestion => {
    for (const sec of schema.sections) {
      const q = sec.questions.find((item) => item.id === id);
      if (q) return q;
    }
    return {
      id,
      sectionId: currentSectionId,
      code: "",
      label: fallbackLabel,
      type: fallbackOptions ? "single_choice" : "short_text",
      required: true,
      order: 1,
      options: fallbackOptions,
    };
  };

  // Flexible question renderer that respects admin changes to options or modality (single_choice, multi_choice, short_text, long_text)
  const renderFlexibleQuestionControl = (params: {
    questionId: string;
    fallbackLabel: string;
    fallbackOptions?: {
      value: string;
      label: string;
      requiresSpecify?: boolean;
    }[];
    value: string;
    onChange: (val: string) => void;
    specifyValue?: string;
    onChangeSpecify?: (val: string) => void;
    specifyPlaceholder?: string;
    gridCols?: string;
  }) => {
    const q = getQ(
      params.questionId,
      params.fallbackLabel,
      params.fallbackOptions
    );
    const opts =
      q.options && q.options.length > 0
        ? q.options
        : params.fallbackOptions || [];

    if (q.type === "short_text") {
      return (
        <input
          type="text"
          value={params.value}
          onChange={(e) => params.onChange(e.target.value)}
          placeholder="Escribí tu respuesta..."
          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[#567c7f] outline-none text-sm bg-white"
        />
      );
    }

    if (q.type === "long_text") {
      return (
        <textarea
          rows={3}
          value={params.value}
          onChange={(e) => params.onChange(e.target.value)}
          placeholder="Escribí tu respuesta..."
          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[#567c7f] outline-none text-sm bg-white"
        />
      );
    }

    if (q.type === "multi_choice") {
      const selectedList = params.value
        ? params.value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
      const needsSpecify = opts.some(
        (o) =>
          selectedList.includes(o.value) &&
          (o.requiresSpecify || o.value === "otra" || o.value === "otro")
      );
      return (
        <div className="space-y-3">
          <div
            className={
              params.gridCols || "grid grid-cols-1 sm:grid-cols-2 gap-2.5"
            }
          >
            {opts.map((opt) => {
              const checked = selectedList.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    const next = checked
                      ? selectedList.filter((x) => x !== opt.value)
                      : [...selectedList, opt.value];
                    params.onChange(next.join(", "));
                  }}
                  className={`p-3.5 rounded-xl border text-left text-sm flex items-center justify-between gap-2 transition cursor-pointer ${
                    checked
                      ? "border-[#567c7f] bg-[#567c7f]/12 text-[#1f2f40] font-bold"
                      : "border-slate-200 hover:border-[#567c7f] text-slate-800 font-medium"
                  }`}
                >
                  <span>{opt.label}</span>
                  <input
                    type="checkbox"
                    checked={checked}
                    readOnly
                    className="w-4 h-4 accent-[#567c7f] pointer-events-none"
                  />
                </button>
              );
            })}
          </div>
          {needsSpecify && params.onChangeSpecify && (
            <div className="bg-[#f3f6f7] p-4 rounded-xl border border-[#567c7f]/30">
              <label className="block text-xs font-bold text-[#3f5f61] mb-1">
                {q.specifyLabel || "¿Cuál?"}{" "}
                <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={params.specifyValue || ""}
                onChange={(e) => params.onChangeSpecify!(e.target.value)}
                placeholder={params.specifyPlaceholder || "Especificá ¿Cuál?..."}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white focus:border-[#567c7f] outline-none text-sm"
              />
            </div>
          )}
        </div>
      );
    }

    // Default: single_choice
    const selectedOpt = opts.find((o) => o.value === params.value);
    const needsSpecify =
      selectedOpt?.requiresSpecify ||
      params.value === "otra" ||
      params.value === "otro";

    return (
      <div className="space-y-3">
        <div
          className={
            params.gridCols || "grid grid-cols-1 sm:grid-cols-2 gap-2.5"
          }
        >
          {opts.map((opt) => {
            const selected = params.value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => params.onChange(opt.value)}
                className={`p-3.5 rounded-xl border text-left text-sm transition cursor-pointer ${
                  selected
                    ? "border-[#567c7f] bg-[#567c7f] text-white font-bold shadow-xs"
                    : "border-slate-200 hover:border-[#567c7f] text-slate-800 font-medium"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {needsSpecify && params.onChangeSpecify && (
          <div className="bg-[#f3f6f7] p-4 rounded-xl border border-[#567c7f]/30">
            <label className="block text-xs font-bold text-[#3f5f61] mb-1">
              {q.specifyLabel || "¿Cuál?"}{" "}
              <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={params.specifyValue || ""}
              onChange={(e) => params.onChangeSpecify!(e.target.value)}
              placeholder={params.specifyPlaceholder || "Especificá ¿Cuál?..."}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white focus:border-[#567c7f] outline-none text-sm"
            />
          </div>
        )}
      </div>
    );
  };

  // Selecting a region. Leaving «No califica» drops a free-text localidad that
  // is not a PBA municipality so the autocomplete starts clean.
  const selectRegion = (code: string) => {
    if (
      regionSanitaria === REGION_NO_CALIFICA &&
      code !== REGION_NO_CALIFICA &&
      !MUNICIPIOS_PBA.some(
        (m) => m.name.toLowerCase() === municipio.trim().toLowerCase()
      )
    ) {
      setMunicipio("");
    }
    setRegionSanitaria(code);
  };

  const extraSectionQuestions = (currentSection?.questions || []).filter(
    (q) => !BUILTIN_QUESTION_IDS.has(q.id)
  );

  // Persist local draft state whenever fields change
  useEffect(() => {
    if (!submissionId || submittedState.done) return;
    try {
      window.localStorage.setItem(
        ACTIVE_DRAFT_STORAGE_KEY,
        JSON.stringify({
          submissionId,
          stepIndex,
          consent,
          mainLocation,
          s2aTarea,
          s2aTareaOtra,
          s2bTipoHospital,
          s2bTarea,
          s2bTareaOtra,
          s2bAreaServicio,
          s2cTipoOrg,
          s2cTipoOrgOtra,
          s2cRol,
          s2cRolOtro,
          s2dAmbito,
          s2dRol,
          s2dRolOtra,
          s2dArea,
          mainLocationOtro,
          eduNivel,
          eduJurisdiccion,
          eduRol,
          eduRolOtro,
          regionSanitaria,
          municipio,
          antiguedad,
          priorities,
          customThemes,
          rank1Problema,
          rank1Propuesta,
          rank2Problema,
          rank2Propuesta,
          rank3Problema,
          rank3Propuesta,
          otraTematicaAbierta,
          relacionZonal,
          interesaMesa,
          tematicasMesa,
          ofreceReferente,
          horarios,
          modalidad,
          customAnswers,
          done: false,
        })
      );
    } catch {
      // ignore storage quota errors
    }
  }, [
    submissionId,
    stepIndex,
    consent,
    mainLocation,
    s2aTarea,
    s2aTareaOtra,
    s2bTipoHospital,
    s2bTarea,
    s2bTareaOtra,
    s2bAreaServicio,
    s2cTipoOrg,
    s2cTipoOrgOtra,
    s2cRol,
    s2cRolOtro,
    s2dAmbito,
    s2dRol,
    s2dRolOtra,
    s2dArea,
    mainLocationOtro,
    eduNivel,
    eduJurisdiccion,
    eduRol,
    eduRolOtro,
    regionSanitaria,
    municipio,
    antiguedad,
    priorities,
    customThemes,
    rank1Problema,
    rank1Propuesta,
    rank2Problema,
    rank2Propuesta,
    rank3Problema,
    rank3Propuesta,
    otraTematicaAbierta,
    relacionZonal,
    interesaMesa,
    tematicasMesa,
    ofreceReferente,
    horarios,
    modalidad,
    customAnswers,
    submittedState.done,
  ]);

  const buildSubmissionPayload = (
    isComplete: boolean,
    stepCode: string
  ): SurveySubmissionPayload => {
    const id = submissionId || generateUuid();
    if (!submissionId) setSubmissionId(id);

    return {
      clientSubmissionId: id,
      surveyVersion: schema.version || 2,
      createdAtClient: new Date().toISOString(),
      sourcePlatform: "web",
      isComplete,
      currentStep: stepCode,
      consent: consent === true,
      mainLocation: (mainLocation || undefined) as
        | "primer_nivel"
        | "hospital"
        | "comunitario"
        | "gestion_sanitaria"
        | "institucion_educativa"
        | "otro"
        | undefined,
      mainLocationOtro:
        mainLocation === "otro" ? mainLocationOtro : undefined,
      sectionEducativa:
        mainLocation === "institucion_educativa"
          ? {
              nivel: eduNivel,
              jurisdiccion: eduJurisdiccion,
              rol: eduRol,
              rolOtro: eduRol === "otro" ? eduRolOtro : "",
            }
          : undefined,
      section2A:
        mainLocation === "primer_nivel"
          ? { tarea: s2aTarea, tareaOtra: s2aTareaOtra }
          : undefined,
      section2B:
        mainLocation === "hospital"
          ? {
              tipoHospital: s2bTipoHospital,
              tarea: s2bTarea,
              tareaOtra: s2bTareaOtra,
              areaServicio: s2bAreaServicio,
            }
          : undefined,
      section2C:
        mainLocation === "comunitario"
          ? {
              tipoOrganizacion: s2cTipoOrg,
              tipoOrganizacionOtra: s2cTipoOrgOtra,
              rol: s2cRol,
              rolOtro: s2cRolOtro,
            }
          : undefined,
      section2D:
        mainLocation === "gestion_sanitaria"
          ? {
              ambitoGestion: s2dAmbito,
              rolGestion: s2dRol,
              rolGestionOtra: s2dRolOtra,
              areaEspacio: s2dArea,
            }
          : undefined,
      section3: {
        regionSanitaria,
        municipio,
        antiguedad,
      },
      section4: {
        priorities,
        customThemes,
        rank1Detail: {
          problema: rank1Problema,
          propuesta: rank1Propuesta,
        },
        rank2Detail: {
          problema: rank2Problema,
          propuesta: rank2Propuesta,
        },
        rank3Detail: {
          problema: rank3Problema,
          propuesta: rank3Propuesta,
        },
        otraTematicaAbierta,
        relacionZonal,
      },
      section5: {
        interesaMesa: (interesaMesa || "no") as "si" | "no" | "tal_vez",
        tematicasMesa:
          interesaMesa === "si" || interesaMesa === "tal_vez"
            ? tematicasMesa
            : [],
        ofreceReferente:
          interesaMesa === "si" || interesaMesa === "tal_vez"
            ? (ofreceReferente as "si" | "no")
            : undefined,
        horarios:
          interesaMesa === "si" || interesaMesa === "tal_vez" ? horarios : [],
        modalidad:
          interesaMesa === "si" || interesaMesa === "tal_vez"
            ? (modalidad as "virtual" | "presencial" | "mixta")
            : undefined,
      },
      customAnswers,
    };
  };

  // Progressive background sync (non-blocking) on every step transition (S10)
  const syncPartialProgressInBackground = (nextStepId: string) => {
    if (consent !== true) return;
    const partialPayload = buildSubmissionPayload(false, nextStepId);
    enqueueOfflineResponse(partialPayload)
      .then(() => {
        window.dispatchEvent(new Event("mosapro-queue-updated"));
        return flushOfflineQueues();
      })
      .then(() => {
        window.dispatchEvent(new Event("mosapro-queue-updated"));
      })
      .catch(() => {
        // Offline queue retains the partial state until connection returns
      });
  };

  const validateCurrentStep = (): boolean => {
    const errs: string[] = [];

    if (currentSectionId === "S0") {
      if (consent === null) {
        errs.push("Por favor seleccioná si aceptás participar.");
      }
    } else if (currentSectionId === "S1") {
      if (!mainLocation) {
        errs.push(
          "Seleccioná dónde realizás tu tarea principal para continuar."
        );
      } else if (mainLocation === "otro" && !mainLocationOtro.trim()) {
        errs.push("Especificá ¿Cuál? es tu espacio de trabajo.");
      } else if (mainLocation === "institucion_educativa") {
        if (!eduNivel) errs.push("Seleccioná el nivel de la institución educativa.");
        if (!eduJurisdiccion)
          errs.push(
            "Seleccioná la jurisdicción de la institución (Municipal, Provincial o Nacional)."
          );
        if (!eduRol) {
          errs.push("Seleccioná tu rol en la institución educativa.");
        } else if (eduRol === "otro" && !eduRolOtro.trim()) {
          errs.push("Especificá ¿Cuál? en tu rol.");
        }
      }
    } else if (currentSectionId === "S2A") {
      if (!s2aTarea) {
        errs.push("Seleccioná tu tarea en el primer nivel.");
      } else if (s2aTarea === "otra" && !s2aTareaOtra.trim()) {
        errs.push("Especificá ¿Cuál? en tu tarea.");
      }
    } else if (currentSectionId === "S2B") {
      if (!s2bTipoHospital)
        errs.push(
          "Seleccioná la dependencia/gestión del hospital (Nacional, Provincial o Municipal)."
        );
      if (!s2bTarea) {
        errs.push("Seleccioná tu tarea en el hospital.");
      } else if (s2bTarea === "otra" && !s2bTareaOtra.trim()) {
        errs.push("Especificá ¿Cuál? en tu tarea.");
      }
      if (!s2bAreaServicio.trim()) {
        errs.push("Completá o seleccioná el área o servicio donde trabajás.");
      }
    } else if (currentSectionId === "S2C") {
      if (!s2cTipoOrg) {
        errs.push("Seleccioná el tipo de organización comunitaria.");
      } else if (s2cTipoOrg === "otra" && !s2cTipoOrgOtra.trim()) {
        errs.push("Especificá ¿Cuál? en el tipo de organización.");
      }
      if (!s2cRol) {
        errs.push("Seleccioná tu rol en la organización.");
      } else if (s2cRol === "otro" && !s2cRolOtro.trim()) {
        errs.push("Especificá ¿Cuál? en tu rol.");
      }
    } else if (currentSectionId === "S2D") {
      if (!s2dAmbito) {
        errs.push(
          "Seleccioná el ámbito de gestión (Nacional, Provincial o Municipal)."
        );
      }
      if (!s2dRol) {
        errs.push("Seleccioná tu función o rol en gestión sanitaria.");
      } else if (s2dRol === "otra" && !s2dRolOtra.trim()) {
        errs.push("Especificá ¿Cuál? en tu función o rol.");
      }
      if (!s2dArea.trim()) {
        errs.push(
          "Completá el área, dirección, secretaría o Región Sanitaria donde desempeñás tu tarea."
        );
      }
    } else if (currentSectionId === "S3") {
      if (!regionSanitaria) errs.push("Seleccioná tu Región Sanitaria o «No califica».");
      if (!municipio.trim())
        errs.push(
          regionSanitaria === REGION_NO_CALIFICA
            ? "Escribí tu localidad."
            : "Indicá tu Municipio."
        );
      if (!antiguedad) errs.push("Seleccioná tu antigüedad en la tarea.");
    } else if (currentSectionId === "S4") {
      // Note: 4.2, 4.3, 4.4 problem/proposal are NOT blocking per user requirement
      if (priorities.length !== 5) {
        errs.push(
          "Elegí y ordená las 5 temáticas prioritarias (1.° a 5.° lugar)."
        );
      }
      if (!relacionZonal) {
        errs.push(
          "Seleccioná cómo describirías hoy la relación entre el centro de salud, el hospital y las organizaciones de tu zona."
        );
      }
    } else if (currentSectionId === "S5") {
      if (!interesaMesa) {
        errs.push("Indicá si te interesa integrar una mesa de trabajo.");
      } else if (interesaMesa === "si" || interesaMesa === "tal_vez") {
        if (tematicasMesa.length === 0) {
          errs.push(
            "Seleccioná al menos una temática sobre la que te gustaría trabajar."
          );
        }
        if (!ofreceReferente) {
          errs.push("Indicá si te ofrecés como referente de mesa.");
        }
        if (horarios.length === 0) {
          errs.push(
            "Seleccioná al menos un horario posible para los encuentros."
          );
        }
        if (!modalidad) {
          errs.push("Seleccioná tu modalidad preferida.");
        }
      }
    }

    // Validate required custom admin questions in this section
    for (const cq of extraSectionQuestions) {
      if (cq.required) {
        const val = customAnswers[cq.id];
        const empty = Array.isArray(val)
          ? val.length === 0
          : !val || !String(val).trim();
        if (empty) {
          errs.push(`Completá la pregunta obligatoria: «${cq.label}»`);
        }
      }
    }

    setStepErrors(errs);
    return errs.length === 0;
  };

  const handleNext = () => {
    if (currentSectionId === "S0" && consent === false) {
      setDeclinedConsent(true);
      return;
    }
    if (!validateCurrentStep()) return;
    setStepErrors([]);
    const nextIdx = Math.min(stepIndex + 1, activeSectionIds.length - 1);
    const nextSecId = activeSectionIds[nextIdx] || currentSectionId;
    setStepIndex(nextIdx);
    syncPartialProgressInBackground(nextSecId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setStepErrors([]);
    const prevIdx = Math.max(0, stepIndex - 1);
    const prevSecId = activeSectionIds[prevIdx] || currentSectionId;
    setStepIndex(prevIdx);
    syncPartialProgressInBackground(prevSecId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;
    const payload = buildSubmissionPayload(true, "S5");
    const fullCheck = validateSurveySubmission(payload);
    if (!fullCheck.valid) {
      setStepErrors(fullCheck.errors);
      return;
    }

    setSubmitting(true);
    try {
      await enqueueOfflineResponse(payload);
      window.dispatchEvent(new Event("mosapro-queue-updated"));

      const flushRes = await flushOfflineQueues();
      window.dispatchEvent(new Event("mosapro-queue-updated"));

      try {
        window.localStorage.removeItem(ACTIVE_DRAFT_STORAGE_KEY);
      } catch {
        // ignore
      }

      setSubmittedState({
        done: true,
        savedOffline: flushRes.remainingResponses > 0,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setStepErrors([
        "Ocurrió un problema al guardar la respuesta localmente. Intentá nuevamente.",
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetNewSurvey = () => {
    try {
      window.localStorage.removeItem(ACTIVE_DRAFT_STORAGE_KEY);
    } catch {
      // ignore
    }
    setSubmissionId(generateUuid());
    setConsent(null);
    setDeclinedConsent(false);
    setMainLocation("");
    setS2aTarea("");
    setS2aTareaOtra("");
    setS2bTipoHospital("");
    setS2bTarea("");
    setS2bTareaOtra("");
    setS2bAreaServicio("");
    setS2cTipoOrg("");
    setS2cTipoOrgOtra("");
    setS2cRol("");
    setS2cRolOtro("");
    setS2dAmbito("");
    setS2dRol("");
    setS2dRolOtra("");
    setS2dArea("");
    setMainLocationOtro("");
    setEduNivel("");
    setEduJurisdiccion("");
    setEduRol("");
    setEduRolOtro("");
    if (!regionLockedFromLink) setRegionSanitaria("");
    setMunicipio("");
    setAntiguedad("");
    setPriorities([]);
    setCustomThemes([]);
    setRank1Problema("");
    setRank1Propuesta("");
    setRank2Problema("");
    setRank2Propuesta("");
    setRank3Problema("");
    setRank3Propuesta("");
    setOtraTematicaAbierta("");
    setRelacionZonal("");
    setInteresaMesa("");
    setTematicasMesa([]);
    setOfreceReferente("");
    setHorarios([]);
    setModalidad("");
    setCustomAnswers({});
    setStepIndex(0);
    setSubmittedState({ done: false, savedOffline: false });
  };

  // Declined Consent Screen (S3)
  if (declinedConsent) {
    return (
      <div className="max-w-2xl mx-auto my-10 px-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-[#f3f1ee] text-[#567c7f] flex items-center justify-center mx-auto">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-[#1f2f40]">
            Relevamiento finalizado
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            Elegiste no participar del relevamiento. No se guardó ningún dato.
            ¡Muchas gracias por tu tiempo!
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setDeclinedConsent(false);
                setConsent(null);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#567c7f] hover:bg-[#4f7478] text-white font-semibold text-sm transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Volver al inicio del formulario</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Final Thank-you + Unlinked Contact Invitation Screen (S8)
  if (submittedState.done) {
    const contactHref = regionSanitaria
      ? `${schema.contactFormPath || "/contacto"}?region=${encodeURIComponent(
          regionSanitaria
        )}`
      : schema.contactFormPath || "/contacto";

    return (
      <div className="max-w-2xl mx-auto my-10 px-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
          <div className="bg-[#567c7f] text-white px-6 py-6 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-emerald-200" />
            <h2 className="text-2xl font-extrabold">
              ¡Respuesta registrada con éxito!
            </h2>
            {submittedState.savedOffline ? (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs bg-amber-900/50 border border-amber-300/40 px-3 py-1 rounded-full text-amber-100">
                <CloudOff className="w-3.5 h-3.5" />
                Guardada en memoria offline del dispositivo: se subirá automáticamente
                apenas haya conectividad.
              </p>
            ) : (
              <p className="mt-1 text-sm text-white/90">
                Tus respuestas anónimas ya fueron sincronizadas con el servidor del MOSAPRO.
              </p>
            )}
          </div>

          <div className="p-6 sm:p-8 space-y-6 text-center">
            <div className="bg-[#f3f1ee] border border-[#d7cfc7] rounded-xl p-6 text-center space-y-4">
              <p className="text-base font-medium text-[#1f2f40] leading-relaxed">
                {schema.finalMessage ||
                  "¡Gracias! Si querés que te convoquemos a una mesa, dejanos tus datos en este otro formulario, que no se vincula con tus respuestas:"}
              </p>
              <div className="pt-1 flex justify-center">
                <Link
                  href={contactHref}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#567c7f] hover:bg-[#4f7478] text-white font-bold text-sm shadow-sm transition"
                >
                  <HeartHandshake className="w-5 h-5 shrink-0" />
                  <span>Ir al formulario de contacto (desvinculado y anónimo)</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </Link>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-center">
              <button
                type="button"
                onClick={handleResetNewSurvey}
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-[#567c7f] px-4 py-2 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Cargar otra encuesta en este dispositivo</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const allParticipationThemes = [
    ...schema.themes
      .filter((t) => t.active !== false)
      .map((t) => ({ id: t.id, label: t.label })),
    ...customThemes.map((ct) => ({ id: ct.id, label: ct.title })),
  ];

  return (
    <div className="max-w-4xl mx-auto my-6 px-4 pb-16">
      {/* Banner Header */}
      <div className="bg-[#567c7f] text-white rounded-2xl p-6 sm:p-8 shadow-md mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="inline-block px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#b99e93] text-white">
            Relevamiento Provincial
          </span>
          {regionSanitaria && (
            <span className="inline-block px-3 py-0.5 rounded-full text-xs font-semibold bg-white/15 text-white">
              Región Sanitaria {regionSanitaria}
            </span>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          {schema.title}
        </h1>
        <p className="text-sm sm:text-base text-white/90 mt-1.5">
          {schema.subtitle}
        </p>

        {/* Step Progress Indicator */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs text-white/85 mb-1.5 font-medium">
            <span>{currentSection?.title}</span>
            <span>
              Paso {stepIndex + 1} de {activeSectionIds.length} · Guardado automático activo
            </span>
          </div>
          <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#b99e93] transition-all duration-300"
              style={{
                width: `${((stepIndex + 1) / activeSectionIds.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Section Card */}
      <div className="bg-white rounded-2xl border border-[#e2e6e9] shadow-sm p-6 sm:p-8 space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-xl font-bold text-[#567c7f]">
            {currentSection?.title}
          </h2>
          {currentSection?.description && (
            <p className="text-sm text-slate-600 mt-1">
              {currentSection.description}
            </p>
          )}
          <p className="text-xs text-slate-500 mt-2">
            Los campos marcados con <span className="text-red-600 font-bold">*</span> son obligatorios.
          </p>
        </div>

        {stepErrors.length > 0 && (
          <div
            role="alert"
            className="bg-red-50 border-l-4 border-red-600 p-4 rounded-r-xl space-y-1"
          >
            <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Revisá los siguientes campos para continuar:</span>
            </div>
            <ul className="list-disc list-inside text-xs text-red-700 space-y-0.5">
              {stepErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* SECTION 0: Consent */}
        {currentSectionId === "S0" && (
          <div className="space-y-5">
            <div className="bg-[#f3f6f7] border-l-4 border-[#567c7f] p-5 rounded-r-xl text-base leading-relaxed text-[#1f2f40] font-medium">
              «
              {
                getQ(
                  "q_consent",
                  DEFAULT_SURVEY_SCHEMA.sections[0].questions[0].label
                ).label
              }
              »
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <button
                type="button"
                onClick={() => setConsent(true)}
                className={`p-4 rounded-xl border-2 text-left font-bold transition flex items-center justify-between cursor-pointer ${
                  consent === true
                    ? "border-[#567c7f] bg-[#567c7f]/10 text-[#3f5f61]"
                    : "border-slate-200 hover:border-[#567c7f]/50 text-slate-800"
                }`}
              >
                <span>Sí, acepto participar</span>
                <span
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    consent === true
                      ? "border-[#567c7f] bg-[#567c7f]"
                      : "border-slate-300"
                  }`}
                >
                  {consent === true && (
                    <span className="w-2 h-2 rounded-full bg-white" />
                  )}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setConsent(false)}
                className={`p-4 rounded-xl border-2 text-left font-bold transition flex items-center justify-between cursor-pointer ${
                  consent === false
                    ? "border-red-600 bg-red-50 text-red-900"
                    : "border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                <span>No (finaliza el formulario)</span>
                <span
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    consent === false
                      ? "border-red-600 bg-red-600"
                      : "border-slate-300"
                  }`}
                >
                  {consent === false && (
                    <span className="w-2 h-2 rounded-full bg-white" />
                  )}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* SECTION 1: Main Task Location */}
        {currentSectionId === "S1" && (
          <div className="space-y-4">
            <label className="block text-base font-bold text-slate-900">
              {
                getQ(
                  "q_main_location",
                  "¿Dónde realizás tu tarea principal?"
                ).label
              }{" "}
              <span className="text-red-600">*</span>
            </label>
            <div className="space-y-3">
              {[
                {
                  value: "primer_nivel",
                  label: "Centro de salud o unidad sanitaria (primer nivel)",
                },
                {
                  value: "hospital",
                  label:
                    "Hospital nacional, provincial o municipal (segundo nivel)",
                },
                {
                  value: "comunitario",
                  label:
                    "Sociedad de fomento, organización barrial, club, dispensario, CIC u otro espacio comunitario",
                },
                {
                  value: "gestion_sanitaria",
                  label: "Gestión sanitaria",
                },
                {
                  value: "institucion_educativa",
                  label: "Instituciones educativas",
                },
                {
                  value: "otro",
                  label: "Otros",
                },
              ].map((opt) => {
                const selected = mainLocation === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setMainLocation(opt.value as MainLocationType)
                    }
                    className={`w-full p-4 rounded-xl border-2 text-left transition flex items-center justify-between gap-3 cursor-pointer ${
                      selected
                        ? "border-[#567c7f] bg-[#567c7f]/10 text-[#1f2f40] font-bold"
                        : "border-slate-200 hover:border-[#567c7f]/50 text-slate-800 font-medium"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span
                      className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center ${
                        selected
                          ? "border-[#567c7f] bg-[#567c7f]"
                          : "border-slate-300"
                      }`}
                    >
                      {selected && (
                        <span className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {mainLocation === "otro" && (
              <div className="ml-2 sm:ml-6 pl-4 border-l-4 border-[#567c7f]/40 pt-1">
                <label className="block text-sm font-bold text-slate-900 mb-1">
                  {getQ("q_main_location", "").specifyLabel || "¿Cuál?"}{" "}
                  <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={mainLocationOtro}
                  onChange={(e) => setMainLocationOtro(e.target.value)}
                  maxLength={200}
                  placeholder="Describí dónde realizás tu tarea principal..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[#567c7f] outline-none text-sm bg-white"
                />
              </div>
            )}

            {/* Instituciones educativas: nivel → jurisdicción → rol, revealed in cascade */}
            {mainLocation === "institucion_educativa" && (
              <div className="ml-2 sm:ml-6 pl-4 border-l-4 border-[#567c7f]/40 space-y-5 pt-1">
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">
                    {getQ("q_1e_nivel", "Nivel educativo:").label}{" "}
                    <span className="text-red-600">*</span>
                  </label>
                  {renderFlexibleQuestionControl({
                    questionId: "q_1e_nivel",
                    fallbackLabel: "Nivel educativo:",
                    fallbackOptions: DEFAULT_SURVEY_SCHEMA.sections
                      .find((s) => s.id === "S1")
                      ?.questions.find((x) => x.id === "q_1e_nivel")?.options,
                    value: eduNivel,
                    onChange: (v) => {
                      if (v !== eduNivel) {
                        setEduJurisdiccion("");
                        setEduRol("");
                        setEduRolOtro("");
                      }
                      setEduNivel(v);
                    },
                    gridCols: "grid grid-cols-2 sm:grid-cols-4 gap-2.5",
                  })}
                </div>

                {eduNivel && (
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-2">
                      {
                        getQ("q_1e_jurisdiccion", "Jurisdicción de la institución:")
                          .label
                      }{" "}
                      <span className="text-red-600">*</span>
                    </label>
                    {renderFlexibleQuestionControl({
                      questionId: "q_1e_jurisdiccion",
                      fallbackLabel: "Jurisdicción de la institución:",
                      fallbackOptions: DEFAULT_SURVEY_SCHEMA.sections
                        .find((s) => s.id === "S1")
                        ?.questions.find((x) => x.id === "q_1e_jurisdiccion")
                        ?.options,
                      value: eduJurisdiccion,
                      onChange: (v) => {
                        if (v !== eduJurisdiccion) {
                          setEduRol("");
                          setEduRolOtro("");
                        }
                        setEduJurisdiccion(v);
                      },
                      gridCols: "grid grid-cols-1 sm:grid-cols-3 gap-2.5",
                    })}
                  </div>
                )}

                {eduNivel && eduJurisdiccion && (
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-2">
                      {getQ("q_1e_rol", "Tu rol en la institución:").label}{" "}
                      <span className="text-red-600">*</span>
                    </label>
                    {renderFlexibleQuestionControl({
                      questionId: "q_1e_rol",
                      fallbackLabel: "Tu rol en la institución:",
                      fallbackOptions: DEFAULT_SURVEY_SCHEMA.sections
                        .find((s) => s.id === "S1")
                        ?.questions.find((x) => x.id === "q_1e_rol")?.options,
                      value: eduRol,
                      onChange: setEduRol,
                      specifyValue: eduRolOtro,
                      onChangeSpecify: setEduRolOtro,
                      specifyPlaceholder: "Describí tu rol en la institución...",
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SECTION 2A: Primer Nivel */}
        {currentSectionId === "S2A" && (
          <div className="space-y-4">
            <label className="block text-base font-bold text-slate-900">
              1. {getQ("q_2a_tarea", "Tu tarea:").label}{" "}
              <span className="text-red-600">*</span>
            </label>
            {renderFlexibleQuestionControl({
              questionId: "q_2a_tarea",
              fallbackLabel: "Tu tarea:",
              fallbackOptions:
                DEFAULT_SURVEY_SCHEMA.sections.find((s) => s.id === "S2A")
                  ?.questions[0].options,
              value: s2aTarea,
              onChange: setS2aTarea,
              specifyValue: s2aTareaOtra,
              onChangeSpecify: setS2aTareaOtra,
              specifyPlaceholder: "Describí brevemente tu tarea...",
            })}
          </div>
        )}

        {/* SECTION 2B: Hospital */}
        {currentSectionId === "S2B" && (
          <div className="space-y-6">
            <div>
              <label className="block text-base font-bold text-slate-900 mb-2.5">
                1.{" "}
                {
                  getQ(
                    "q_2b_tipo_hospital",
                    "Dependencia / Gestión del hospital:"
                  ).label
                }{" "}
                <span className="text-red-600">*</span>
              </label>
              {renderFlexibleQuestionControl({
                questionId: "q_2b_tipo_hospital",
                fallbackLabel: "Dependencia / Gestión del hospital:",
                fallbackOptions: [
                  { value: "nacional", label: "Gestión Nacional" },
                  { value: "provincial", label: "Gestión Provincial" },
                  { value: "municipal", label: "Gestión Municipal" },
                ],
                value: s2bTipoHospital,
                onChange: setS2bTipoHospital,
                gridCols: "grid grid-cols-1 sm:grid-cols-3 gap-3",
              })}
            </div>

            <div>
              <label className="block text-base font-bold text-slate-900 mb-2.5">
                2. {getQ("q_2b_tarea", "Tu tarea:").label}{" "}
                <span className="text-red-600">*</span>
              </label>
              {renderFlexibleQuestionControl({
                questionId: "q_2b_tarea",
                fallbackLabel: "Tu tarea:",
                fallbackOptions:
                  DEFAULT_SURVEY_SCHEMA.sections.find((s) => s.id === "S2B")
                    ?.questions[1].options,
                value: s2bTarea,
                onChange: setS2bTarea,
                specifyValue: s2bTareaOtra,
                onChangeSpecify: setS2bTareaOtra,
                specifyPlaceholder: "Describí brevemente tu tarea...",
              })}
            </div>

            <div>
              <label className="block text-base font-bold text-slate-900 mb-1">
                3.{" "}
                {
                  getQ(
                    "q_2b_area_servicio",
                    "Área o servicio donde trabajás:"
                  ).label
                }{" "}
                <span className="text-red-600">*</span>
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Podés buscar en el listado básico de servicios o escribir libremente si el tuyo no está en la lista.
              </p>
              <HospitalServiceCombobox
                value={s2bAreaServicio}
                onChange={setS2bAreaServicio}
                options={
                  getQ("q_2b_area_servicio", "").options?.length
                    ? getQ("q_2b_area_servicio", "").options!.map((o) => o.label)
                    : undefined
                }
              />
            </div>
          </div>
        )}

        {/* SECTION 2C: Dispositivo Comunitario */}
        {currentSectionId === "S2C" && (
          <div className="space-y-6">
            <div>
              <label className="block text-base font-bold text-slate-900 mb-2.5">
                1. {getQ("q_2c_tipo_org", "Tipo de organización:").label}{" "}
              <span className="text-red-600">*</span>
              </label>
              {renderFlexibleQuestionControl({
                questionId: "q_2c_tipo_org",
                fallbackLabel: "Tipo de organización:",
                fallbackOptions:
                  DEFAULT_SURVEY_SCHEMA.sections.find((s) => s.id === "S2C")
                    ?.questions[0].options,
                value: s2cTipoOrg,
                onChange: setS2cTipoOrg,
                specifyValue: s2cTipoOrgOtra,
                onChangeSpecify: setS2cTipoOrgOtra,
                specifyPlaceholder: "Describí el espacio u organización...",
              })}
            </div>

            <div>
              <label className="block text-base font-bold text-slate-900 mb-2.5">
                2. {getQ("q_2c_rol", "Tu rol:").label}{" "}
              <span className="text-red-600">*</span>
              </label>
              {renderFlexibleQuestionControl({
                questionId: "q_2c_rol",
                fallbackLabel: "Tu rol:",
                fallbackOptions:
                  DEFAULT_SURVEY_SCHEMA.sections.find((s) => s.id === "S2C")
                    ?.questions[1].options,
                value: s2cRol,
                onChange: setS2cRol,
                specifyValue: s2cRolOtro,
                onChangeSpecify: setS2cRolOtro,
                specifyPlaceholder: "Describí tu rol...",
              })}
            </div>
          </div>
        )}

        {/* SECTION 2D: Gestión Sanitaria */}
        {currentSectionId === "S2D" && (
          <div className="space-y-6">
            <div>
              <label className="block text-base font-bold text-slate-900 mb-2.5">
                1. {getQ("q_2d_ambito", "Ámbito de gestión:").label}{" "}
              <span className="text-red-600">*</span>
              </label>
              {renderFlexibleQuestionControl({
                questionId: "q_2d_ambito",
                fallbackLabel: "Ámbito de gestión:",
                fallbackOptions: [
                  { value: "nacional", label: "Gestión Nacional" },
                  { value: "provincial", label: "Gestión Provincial" },
                  { value: "municipal", label: "Gestión Municipal" },
                ],
                value: s2dAmbito,
                onChange: setS2dAmbito,
                gridCols: "grid grid-cols-1 sm:grid-cols-3 gap-3",
              })}
            </div>

            <div>
              <label className="block text-base font-bold text-slate-900 mb-2.5">
                2. {getQ("q_2d_rol", "Tu función o rol:").label}{" "}
              <span className="text-red-600">*</span>
              </label>
              {renderFlexibleQuestionControl({
                questionId: "q_2d_rol",
                fallbackLabel: "Tu función o rol:",
                fallbackOptions:
                  DEFAULT_SURVEY_SCHEMA.sections.find((s) => s.id === "S2D")
                    ?.questions[1].options,
                value: s2dRol,
                onChange: setS2dRol,
                specifyValue: s2dRolOtra,
                onChangeSpecify: setS2dRolOtra,
                specifyPlaceholder: "Describí tu función en gestión...",
              })}
            </div>

            <div>
              <label className="block text-base font-bold text-slate-900 mb-1">
                3.{" "}
                {
                  getQ(
                    "q_2d_area",
                    "Área, dirección, secretaría o Región Sanitaria donde desempeñás tu tarea:"
                  ).label
                }{" "}
                <span className="text-red-600">*</span>
              </label>
              {renderFlexibleQuestionControl({
                questionId: "q_2d_area",
                fallbackLabel: "Área, dirección, secretaría o Región Sanitaria:",
                value: s2dArea,
                onChange: setS2dArea,
              })}
            </div>
          </div>
        )}

        {/* SECTION 3: Datos Generales */}
        {currentSectionId === "S3" && (
          <div className="space-y-6">
            <div>
              <label className="block text-base font-bold text-slate-900 mb-1">
                1. {getQ("q_3_region", "Región sanitaria (I a XII):").label}{" "}
                <span className="text-red-600">*</span>
              </label>
              {regionLockedFromLink && (
                <p className="text-xs text-[#567c7f] font-semibold mb-2">
                  Precargada automáticamente desde el enlace regional (podés cambiarla si corresponde).
                </p>
              )}
              <p className="text-xs text-slate-500 mb-2">
                Pasá el mouse o enfocá cada región para ver qué municipios le corresponden.
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {REGIONES_SANITARIAS.map((r) => {
                  const selected = regionSanitaria === r.code;
                  const munis = getMunicipiosByRegion(r.code)
                    .map((m) => m.name)
                    .join(", ");
                  return (
                    <div key={r.code} className="relative group">
                      <button
                        type="button"
                        title={`Región ${r.code} (sede ${r.sede}): ${munis}`}
                        aria-describedby={`region-tip-${r.code}`}
                        onClick={() => selectRegion(r.code)}
                        className={`w-full py-2.5 rounded-xl border text-sm transition cursor-pointer ${
                          selected
                            ? "border-[#567c7f] bg-[#567c7f] text-white font-bold"
                            : "border-slate-200 hover:border-[#567c7f] text-slate-800 font-medium"
                        }`}
                      >
                        Región {r.code}
                      </button>
                      <div
                        id={`region-tip-${r.code}`}
                        role="tooltip"
                        className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 z-30 rounded-lg bg-[#1f2f40] text-white text-xs leading-snug p-3 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition"
                      >
                        <span className="font-bold">
                          Región {r.code} · sede {r.sede}
                        </span>
                        <br />
                        {munis}
                      </div>
                    </div>
                  );
                })}
                <button
                  type="button"
                  title="Mi lugar de trabajo no pertenece a ninguna Región Sanitaria de la Provincia de Buenos Aires"
                  onClick={() => selectRegion(REGION_NO_CALIFICA)}
                  className={`col-span-3 sm:col-span-2 py-2.5 rounded-xl border text-sm transition cursor-pointer ${
                    regionSanitaria === REGION_NO_CALIFICA
                      ? "border-[#567c7f] bg-[#567c7f] text-white font-bold"
                      : "border-slate-200 hover:border-[#567c7f] text-slate-800 font-medium"
                  }`}
                >
                  No califica
                </button>
              </div>
              {regionSanitaria && regionSanitaria !== REGION_NO_CALIFICA && (
                <p className="mt-2 text-xs text-slate-600 bg-[#f3f6f7] rounded-lg p-2.5">
                  <span className="font-bold text-[#3f5f61]">
                    Municipios de la Región {regionSanitaria}:
                  </span>{" "}
                  {getMunicipiosByRegion(regionSanitaria)
                    .map((m) => m.name)
                    .join(", ")}
                </p>
              )}
            </div>

            <div>
              <label className="block text-base font-bold text-slate-900 mb-1">
                2.{" "}
                {regionSanitaria === REGION_NO_CALIFICA
                  ? "Localidad:"
                  : getQ("q_3_municipio", "Municipio:").label}{" "}
                <span className="text-red-600">*</span>
              </label>
              {regionSanitaria === REGION_NO_CALIFICA ? (
                <input
                  type="text"
                  value={municipio}
                  onChange={(e) => setMunicipio(e.target.value)}
                  maxLength={120}
                  placeholder="Escribí tu localidad (por ejemplo, ciudad y provincia)"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[#567c7f] outline-none text-base bg-white"
                />
              ) : (
                <MunicipioAutocomplete
                  regionCode={regionSanitaria}
                  value={municipio}
                  onChange={(mun, detectedReg) => {
                    setMunicipio(mun);
                    if (!regionSanitaria && detectedReg) {
                      setRegionSanitaria(detectedReg);
                    }
                  }}
                />
              )}
            </div>

            <div>
              <label className="block text-base font-bold text-slate-900 mb-2.5">
                3. {getQ("q_3_antiguedad", "Antigüedad en la tarea:").label}{" "}
                <span className="text-red-600">*</span>
              </label>
              {renderFlexibleQuestionControl({
                questionId: "q_3_antiguedad",
                fallbackLabel: "Antigüedad en la tarea:",
                fallbackOptions: [
                  { value: "menos_de_5", label: "Menos de 5 años" },
                  { value: "5_a_10", label: "5 a 10 años" },
                  { value: "11_a_20", label: "11 a 20 años" },
                  { value: "mas_de_20", label: "Más de 20 años" },
                ],
                value: antiguedad,
                onChange: setAntiguedad,
              })}
            </div>
          </div>
        )}

        {/* SECTION 4: Prioridades */}
        {currentSectionId === "S4" && (
          <div className="space-y-8">
            <div>
              <label className="block text-base font-bold text-slate-900 mb-1">
                1.{" "}
                {
                  getQ(
                    "q_4_priorities",
                    "Elegí las 5 temáticas que considerás prioritarias y ordenalas de 1.° (la más importante) a 5.°."
                  ).label
                }{" "}
                <span className="text-red-600">*</span>
              </label>
              <p className="text-xs text-slate-600 mb-3">
                Seleccioná una temática por columna (del 1.° al 5.° lugar). Si querés sumar un eje no listado, usá el botón «+ Agregar otra temática» indicando título y descripción.
              </p>
              <PriorityGrid
                baseThemes={schema.themes}
                customThemes={customThemes}
                priorities={priorities}
                onChangePriorities={setPriorities}
                onChangeCustomThemes={setCustomThemes}
              />
            </div>

            {/* 4.2, 4.3, 4.4 Dynamic Problem + Proposal Pairs (Non-blocking) */}
            {[
              {
                num: "2",
                rank: 1,
                problema: rank1Problema,
                setProblema: setRank1Problema,
                propuesta: rank1Propuesta,
                setPropuesta: setRank1Propuesta,
              },
              {
                num: "3",
                rank: 2,
                problema: rank2Problema,
                setProblema: setRank2Problema,
                propuesta: rank2Propuesta,
                setPropuesta: setRank2Propuesta,
              },
              {
                num: "4",
                rank: 3,
                problema: rank3Problema,
                setProblema: setRank3Problema,
                propuesta: rank3Propuesta,
                setPropuesta: setRank3Propuesta,
              },
            ].map((item) => {
              const chosenLabel = getRankThemeLabel(priorities, item.rank);
              return (
                <div
                  key={item.rank}
                  className="bg-[#f3f6f7] border border-[#d5e0e2] rounded-xl p-5 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-[#1f2f40]">
                      {item.num}. Sobre la temática que ubicaste en {item.rank}.° lugar{" "}
                      <span className="text-xs font-normal text-slate-500">
                        (Opcional)
                      </span>
                    </h3>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#567c7f] text-white">
                      {item.rank}.° Prioridad: {chosenLabel}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">
                      ¿Cuál es el principal problema que ves en tu trabajo o en tu barrio?
                    </label>
                    <textarea
                      rows={3}
                      value={item.problema}
                      onChange={(e) => item.setProblema(e.target.value)}
                      placeholder={`Describí el principal problema vinculado a «${chosenLabel}»...`}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white focus:border-[#567c7f] outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">
                      ¿Qué propuesta tenés para ese problema en particular?
                    </label>
                    <textarea
                      rows={3}
                      value={item.propuesta}
                      onChange={(e) => item.setPropuesta(e.target.value)}
                      placeholder={`¿Qué acción, medida o herramienta proponés para abordar este problema en «${chosenLabel}»?...`}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white focus:border-[#567c7f] outline-none text-sm"
                    />
                  </div>
                </div>
              );
            })}

            {/* 4.5 Optional Open Theme */}
            <div>
              <label className="block text-base font-bold text-slate-900 mb-1">
                5.{" "}
                {
                  getQ(
                    "q_4_otra_tematica_abierta",
                    "¿Hay alguna temática que no esté en la lista y debería abordarse?"
                  ).label
                }{" "}
                <span className="text-xs font-normal text-slate-500">
                  (Opcional)
                </span>
              </label>
              <textarea
                rows={3}
                value={otraTematicaAbierta}
                onChange={(e) => setOtraTematicaAbierta(e.target.value)}
                placeholder="Podés ampliar sobre otras temáticas o problemáticas emergentes..."
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[#567c7f] outline-none text-sm"
              />
            </div>

            {/* 4.6 Zonal Relationship */}
            <div>
              <label className="block text-base font-bold text-slate-900 mb-2.5">
                6.{" "}
                {
                  getQ(
                    "q_4_relacion_zonal",
                    "¿Cómo describirías hoy la relación entre el centro de salud, el hospital y las organizaciones de tu zona?"
                  ).label
                }{" "}
                <span className="text-red-600">*</span>
              </label>
              {renderFlexibleQuestionControl({
                questionId: "q_4_relacion_zonal",
                fallbackLabel: "Relación zonal:",
                fallbackOptions: [
                  { value: "muy_buena", label: "Muy buena" },
                  { value: "buena", label: "Buena" },
                  { value: "regular", label: "Regular" },
                  { value: "mala", label: "Mala" },
                  { value: "no_se", label: "No sé" },
                ],
                value: relacionZonal,
                onChange: setRelacionZonal,
                gridCols: "grid grid-cols-1 sm:grid-cols-5 gap-2.5",
              })}
            </div>
          </div>
        )}

        {/* SECTION 5: Participación */}
        {currentSectionId === "S5" && (
          <div className="space-y-6">
            <div>
              <label className="block text-base font-bold text-slate-900 mb-2.5">
                1.{" "}
                {
                  getQ(
                    "q_5_interesa_mesa",
                    "¿Te interesa integrar una mesa de trabajo?"
                  ).label
                }{" "}
                <span className="text-red-600">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { value: "si", label: "Sí" },
                  { value: "no", label: "No" },
                  { value: "tal_vez", label: "Tal vez" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setInteresaMesa(opt.value as "si" | "no" | "tal_vez")
                    }
                    className={`p-3.5 rounded-xl border text-center text-sm transition cursor-pointer ${
                      interesaMesa === opt.value
                        ? "border-[#567c7f] bg-[#567c7f] text-white font-bold"
                        : "border-slate-200 hover:border-[#567c7f] text-slate-800 font-medium"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {(interesaMesa === "si" || interesaMesa === "tal_vez") && (
              <div className="space-y-6 pt-2 border-t border-slate-100">
                {/* 5.2 Themes Checkboxes */}
                <div>
                  <label className="block text-base font-bold text-slate-900 mb-1">
                    2.{" "}
                    {
                      getQ(
                        "q_5_tematicas_mesa",
                        "¿Sobre qué temáticas te gustaría trabajar?"
                      ).label
                    }{" "}
                    <span className="text-red-600">*</span>
                  </label>
                  <p className="text-xs text-slate-500 mb-2.5">
                    Podés marcar varias temáticas.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {allParticipationThemes.map((th) => {
                      const checked = tematicasMesa.includes(th.id);
                      const isInTop5 = priorities.some(
                        (p) => p.themeId === th.id
                      );
                      return (
                        <button
                          key={th.id}
                          type="button"
                          onClick={() => {
                            setTematicasMesa((prev) =>
                              prev.includes(th.id)
                                ? prev.filter((x) => x !== th.id)
                                : [...prev, th.id]
                            );
                          }}
                          className={`p-3 rounded-xl border text-left text-sm flex items-center justify-between gap-2 transition cursor-pointer ${
                            checked
                              ? "border-[#567c7f] bg-[#567c7f]/10 text-[#1f2f40] font-bold"
                              : "border-slate-200 hover:border-[#567c7f]/50 text-slate-800"
                          }`}
                        >
                          <div>
                            <span>{th.label}</span>
                            {isInTop5 && (
                              <span className="ml-2 inline-block px-1.5 py-0.5 text-[10px] font-bold rounded bg-[#b99e93]/30 text-[#5a4f49]">
                                En tu Top 5
                              </span>
                            )}
                          </div>
                          <input
                            type="checkbox"
                            checked={checked}
                            readOnly
                            className="w-4 h-4 accent-[#567c7f] pointer-events-none"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5.3 Referente */}
                <div>
                  <label className="block text-base font-bold text-slate-900 mb-2.5">
                    3.{" "}
                    {
                      getQ(
                        "q_5_ofrece_referente",
                        "¿Te ofrecés como referente de mesa?"
                      ).label
                    }{" "}
                    <span className="text-red-600">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3 max-w-md">
                    {[
                      { value: "si", label: "Sí" },
                      { value: "no", label: "No" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setOfreceReferente(opt.value as "si" | "no")
                        }
                        className={`p-3.5 rounded-xl border text-center text-sm transition cursor-pointer ${
                          ofreceReferente === opt.value
                            ? "border-[#567c7f] bg-[#567c7f] text-white font-bold"
                            : "border-slate-200 hover:border-[#567c7f] text-slate-800 font-medium"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5.4 Horarios */}
                <div>
                  <label className="block text-base font-bold text-slate-900 mb-2">
                    4.{" "}
                    {
                      getQ(
                        "q_5_horarios",
                        "Horarios posibles para los encuentros (podés marcar varios):"
                      ).label
                    }{" "}
                    <span className="text-red-600">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { value: "manana", label: "Mañana" },
                      { value: "mediodia", label: "Mediodía" },
                      { value: "tarde", label: "Tarde" },
                      { value: "noche", label: "Noche" },
                    ].map((opt) => {
                      const checked = horarios.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            setHorarios((prev) =>
                              prev.includes(opt.value)
                                ? prev.filter((x) => x !== opt.value)
                                : [...prev, opt.value]
                            )
                          }
                          className={`p-3 rounded-xl border text-center text-sm transition cursor-pointer ${
                            checked
                              ? "border-[#567c7f] bg-[#567c7f] text-white font-bold"
                              : "border-slate-200 hover:border-[#567c7f] text-slate-800 font-medium"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5.5 Modalidad */}
                <div>
                  <label className="block text-base font-bold text-slate-900 mb-2">
                    5. {getQ("q_5_modalidad", "Modalidad preferida:").label}{" "}
                    <span className="text-red-600">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                      { value: "virtual", label: "Virtual" },
                      { value: "presencial", label: "Presencial" },
                      { value: "mixta", label: "Mixta" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setModalidad(
                            opt.value as "virtual" | "presencial" | "mixta"
                          )
                        }
                        className={`p-3 rounded-xl border text-center text-sm transition cursor-pointer ${
                          modalidad === opt.value
                            ? "border-[#567c7f] bg-[#567c7f] text-white font-bold"
                            : "border-slate-200 hover:border-[#567c7f] text-slate-800 font-medium"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Render any Custom Admin-added Questions for this Section */}
        {extraSectionQuestions.length > 0 && (
          <div className="pt-6 border-t border-slate-200 space-y-5">
            {extraSectionQuestions.map((cq) => {
              const currentVal = customAnswers[cq.id];
              return (
                <div key={cq.id} className="space-y-2">
                  <label className="block text-base font-bold text-slate-900">
                    {cq.label}{" "}
                    {cq.required && <span className="text-red-600">*</span>}
                  </label>
                  {cq.helperText && (
                    <p className="text-xs text-slate-500">{cq.helperText}</p>
                  )}

                  {cq.type === "short_text" && (
                    <input
                      type="text"
                      value={String(currentVal || "")}
                      onChange={(e) =>
                        setCustomAnswers((prev) => ({
                          ...prev,
                          [cq.id]: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-[#567c7f] outline-none text-sm"
                    />
                  )}

                  {cq.type === "long_text" && (
                    <textarea
                      rows={3}
                      value={String(currentVal || "")}
                      onChange={(e) =>
                        setCustomAnswers((prev) => ({
                          ...prev,
                          [cq.id]: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-[#567c7f] outline-none text-sm"
                    />
                  )}

                  {cq.type === "single_choice" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {(cq.options || []).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            setCustomAnswers((prev) => ({
                              ...prev,
                              [cq.id]: opt.value,
                            }))
                          }
                          className={`p-3 rounded-xl border text-left text-sm transition cursor-pointer ${
                            currentVal === opt.value
                              ? "border-[#567c7f] bg-[#567c7f] text-white font-bold"
                              : "border-slate-200 hover:border-[#567c7f] text-slate-800"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {cq.type === "multi_choice" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {(cq.options || []).map((opt) => {
                        const arr = Array.isArray(currentVal) ? currentVal : [];
                        const checked = arr.includes(opt.value);
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              const nextArr = checked
                                ? arr.filter((x) => x !== opt.value)
                                : [...arr, opt.value];
                              setCustomAnswers((prev) => ({
                                ...prev,
                                [cq.id]: nextArr,
                              }));
                            }}
                            className={`p-3 rounded-xl border text-left text-sm transition cursor-pointer ${
                              checked
                                ? "border-[#567c7f] bg-[#567c7f]/15 text-[#1f2f40] font-bold"
                                : "border-slate-200 hover:border-[#567c7f] text-slate-800"
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Navigation Footer */}
        <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
          {stepIndex > 0 ? (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-300 hover:border-[#567c7f] text-slate-700 font-semibold text-sm transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>
          ) : (
            <div />
          )}

          {stepIndex < activeSectionIds.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#567c7f] hover:bg-[#4f7478] text-white font-bold text-sm shadow-sm transition cursor-pointer"
            >
              <span>Siguiente</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#567c7f] hover:bg-[#4f7478] disabled:opacity-60 text-white font-bold text-sm shadow-md transition cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>
                {submitting ? "Guardando respuesta..." : "Enviar relevamiento"}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
