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
} from "@/lib/survey/flow-helpers";
import { MunicipioAutocomplete } from "./MunicipioAutocomplete";
import { PriorityGrid } from "./PriorityGrid";

const BUILTIN_QUESTION_IDS = new Set([
  "q_consent",
  "q_main_location",
  "q_2a_tarea",
  "q_2b_tipo_hospital",
  "q_2b_tarea",
  "q_2b_area_servicio",
  "q_2c_tipo_org",
  "q_2c_rol",
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

interface SurveyWizardProps {
  initialRegion?: string;
}

export function SurveyWizard({ initialRegion }: SurveyWizardProps) {
  const searchParams = useSearchParams();
  const [schema, setSchema] = useState<SurveySchema>(DEFAULT_SURVEY_SCHEMA);
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
  const [mainLocation, setMainLocation] = useState<
    "primer_nivel" | "hospital" | "comunitario" | ""
  >("");

  // 2A
  const [s2aTarea, setS2aTarea] = useState("");
  const [s2aTareaOtra, setS2aTareaOtra] = useState("");

  // 2B
  const [s2bTipoHospital, setS2bTipoHospital] = useState("");
  const [s2bTarea, setS2bTarea] = useState("");
  const [s2bTareaOtra, setS2bTareaOtra] = useState("");
  const [s2bAreaServicio, setS2bAreaServicio] = useState("");

  // 2C
  const [s2cTipoOrg, setS2cTipoOrg] = useState("");
  const [s2cTipoOrgOtra, setS2cTipoOrgOtra] = useState("");
  const [s2cRol, setS2cRol] = useState("");
  const [s2cRolOtro, setS2cRolOtro] = useState("");

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
  const [interesaMesa, setInteresaMesa] = useState<"si" | "no" | "tal_vez" | "">("");
  const [tematicasMesa, setTematicasMesa] = useState<string[]>([]);
  const [ofreceReferente, setOfreceReferente] = useState<"si" | "no" | "">("");
  const [horarios, setHorarios] = useState<string[]>([]);
  const [modalidad, setModalidad] = useState<"virtual" | "presencial" | "mixta" | "">("");

  // Custom Admin Questions
  const [customAnswers, setCustomAnswers] = useState<
    Record<string, string | string[]>
  >({});

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

  const getQ = (id: string, fallbackLabel: string): SurveyQuestion => {
    for (const sec of schema.sections) {
      const q = sec.questions.find((item) => item.id === id);
      if (q) return q;
    }
    return {
      id,
      sectionId: currentSectionId,
      code: "",
      label: fallbackLabel,
      type: "short_text",
      required: true,
      order: 1,
    };
  };

  const extraSectionQuestions = (currentSection?.questions || []).filter(
    (q) => !BUILTIN_QUESTION_IDS.has(q.id)
  );

  const validateCurrentStep = (): boolean => {
    const errs: string[] = [];

    if (currentSectionId === "S0") {
      if (consent === null) {
        errs.push("Por favor seleccioná si aceptás participar.");
      }
    } else if (currentSectionId === "S1") {
      if (!mainLocation) {
        errs.push("Seleccioná dónde realizás tu tarea principal para continuar.");
      }
    } else if (currentSectionId === "S2A") {
      if (!s2aTarea) {
        errs.push("Seleccioná tu tarea en el primer nivel.");
      } else if (s2aTarea === "otra" && !s2aTareaOtra.trim()) {
        errs.push("Especificá ¿Cuál? en tu tarea.");
      }
    } else if (currentSectionId === "S2B") {
      if (!s2bTipoHospital) errs.push("Seleccioná el tipo de hospital.");
      if (!s2bTarea) {
        errs.push("Seleccioná tu tarea en el hospital.");
      } else if (s2bTarea === "otra" && !s2bTareaOtra.trim()) {
        errs.push("Especificá ¿Cuál? en tu tarea.");
      }
      if (!s2bAreaServicio.trim()) {
        errs.push("Completá el área o servicio donde trabajás.");
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
    } else if (currentSectionId === "S3") {
      if (!regionSanitaria) errs.push("Seleccioná tu Región Sanitaria.");
      if (!municipio.trim()) errs.push("Indicá tu Municipio.");
      if (!antiguedad) errs.push("Seleccioná tu antigüedad en la tarea.");
    } else if (currentSectionId === "S4") {
      if (priorities.length !== 5) {
        errs.push("Elegí y ordená las 5 temáticas prioritarias (1.° a 5.° lugar).");
      }
      if (!rank1Problema.trim() || !rank1Propuesta.trim()) {
        errs.push(
          "Completá tanto el problema principal como tu propuesta para la temática en 1.° lugar."
        );
      }
      if (!rank2Problema.trim() || !rank2Propuesta.trim()) {
        errs.push(
          "Completá tanto el problema principal como tu propuesta para la temática en 2.° lugar."
        );
      }
      if (!rank3Problema.trim() || !rank3Propuesta.trim()) {
        errs.push(
          "Completá tanto el problema principal como tu propuesta para la temática en 3.° lugar."
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
          errs.push("Seleccioná al menos una temática sobre la que te gustaría trabajar.");
        }
        if (!ofreceReferente) {
          errs.push("Indicá si te ofrecés como referente de mesa.");
        }
        if (horarios.length === 0) {
          errs.push("Seleccioná al menos un horario posible para los encuentros.");
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
    setStepIndex((prev) => Math.min(prev + 1, activeSectionIds.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setStepErrors([]);
    setStepIndex((prev) => Math.max(0, prev - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const buildSubmissionPayload = (): SurveySubmissionPayload => {
    const uuid =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `sub_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    return {
      clientSubmissionId: uuid,
      surveyVersion: schema.version || 1,
      createdAtClient: new Date().toISOString(),
      sourcePlatform: "web",
      consent: consent === true,
      mainLocation: (mainLocation || "primer_nivel") as
        | "primer_nivel"
        | "hospital"
        | "comunitario",
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

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;
    const payload = buildSubmissionPayload();
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
            <div className="bg-[#f3f1ee] border border-[#d7cfc7] rounded-xl p-5 text-left space-y-3">
              <p className="text-base font-medium text-[#1f2f40] leading-relaxed">
                {schema.finalMessage ||
                  "¡Gracias! Si querés que te convoquemos a una mesa, dejanos tus datos en este otro formulario, que no se vincula con tus respuestas:"}
              </p>
              <div className="pt-1">
                <Link
                  href={contactHref}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#567c7f] hover:bg-[#4f7478] text-white font-bold text-sm shadow-sm transition"
                >
                  <HeartHandshake className="w-5 h-5" />
                  <span>Ir al formulario de contacto (desvinculado y anónimo)</span>
                  <ArrowRight className="w-4 h-4" />
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
              Paso {stepIndex + 1} de {activeSectionIds.length}
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
              «{getQ("q_consent", DEFAULT_SURVEY_SCHEMA.sections[0].questions[0].label).label}»
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
              {getQ("q_main_location", "¿Dónde realizás tu tarea principal?").label}
            </label>
            <div className="space-y-3">
              {(
                getQ("q_main_location", "").options || [
                  {
                    value: "primer_nivel",
                    label: "Centro de salud o unidad sanitaria (primer nivel)",
                  },
                  {
                    value: "hospital",
                    label: "Hospital municipal o provincial (segundo nivel)",
                  },
                  {
                    value: "comunitario",
                    label:
                      "Sociedad de fomento, organización barrial, club, dispensario, CIC u otro espacio comunitario",
                  },
                ]
              ).map((opt) => {
                const selected = mainLocation === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setMainLocation(
                        opt.value as "primer_nivel" | "hospital" | "comunitario"
                      )
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
          </div>
        )}

        {/* SECTION 2A: Primer Nivel */}
        {currentSectionId === "S2A" && (
          <div className="space-y-4">
            <label className="block text-base font-bold text-slate-900">
              1. {getQ("q_2a_tarea", "Tu tarea:").label}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(
                getQ("q_2a_tarea", "").options ||
                DEFAULT_SURVEY_SCHEMA.sections[2].questions[0].options!
              ).map((opt) => {
                const selected = s2aTarea === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setS2aTarea(opt.value)}
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

            {s2aTarea === "otra" && (
              <div className="bg-[#f3f6f7] p-4 rounded-xl border border-[#567c7f]/30">
                <label className="block text-xs font-bold text-[#3f5f61] mb-1">
                  ¿Cuál? Especificá tu tarea <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={s2aTareaOtra}
                  onChange={(e) => setS2aTareaOtra(e.target.value)}
                  placeholder="Describí brevemente tu tarea..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white focus:border-[#567c7f] outline-none text-sm"
                />
              </div>
            )}
          </div>
        )}

        {/* SECTION 2B: Hospital */}
        {currentSectionId === "S2B" && (
          <div className="space-y-6">
            <div>
              <label className="block text-base font-bold text-slate-900 mb-2.5">
                1. {getQ("q_2b_tipo_hospital", "Tipo de hospital:").label}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { value: "municipal", label: "Municipal" },
                  { value: "provincial", label: "Provincial" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setS2bTipoHospital(opt.value)}
                    className={`p-3.5 rounded-xl border text-left text-sm transition cursor-pointer ${
                      s2bTipoHospital === opt.value
                        ? "border-[#567c7f] bg-[#567c7f] text-white font-bold"
                        : "border-slate-200 hover:border-[#567c7f] text-slate-800 font-medium"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-base font-bold text-slate-900 mb-2.5">
                2. {getQ("q_2b_tarea", "Tu tarea:").label}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(
                  getQ("q_2b_tarea", "").options ||
                  DEFAULT_SURVEY_SCHEMA.sections[3].questions[1].options!
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setS2bTarea(opt.value)}
                    className={`p-3.5 rounded-xl border text-left text-sm transition cursor-pointer ${
                      s2bTarea === opt.value
                        ? "border-[#567c7f] bg-[#567c7f] text-white font-bold"
                        : "border-slate-200 hover:border-[#567c7f] text-slate-800 font-medium"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {s2bTarea === "otra" && (
                <div className="mt-3 bg-[#f3f6f7] p-4 rounded-xl border border-[#567c7f]/30">
                  <label className="block text-xs font-bold text-[#3f5f61] mb-1">
                    ¿Cuál? Especificá tu tarea <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={s2bTareaOtra}
                    onChange={(e) => setS2bTareaOtra(e.target.value)}
                    placeholder="Describí brevemente tu tarea..."
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white focus:border-[#567c7f] outline-none text-sm"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-base font-bold text-slate-900 mb-1">
                3.{" "}
                {
                  getQ(
                    "q_2b_area_servicio",
                    "Área o servicio donde trabajás (respuesta breve):"
                  ).label
                }
              </label>
              <input
                type="text"
                value={s2bAreaServicio}
                onChange={(e) => setS2bAreaServicio(e.target.value)}
                placeholder="Ej. Guardia, Clínica Médica, Pediatría, Laboratorio, Mantenimiento..."
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[#567c7f] outline-none text-sm"
              />
            </div>
          </div>
        )}

        {/* SECTION 2C: Dispositivo Comunitario */}
        {currentSectionId === "S2C" && (
          <div className="space-y-6">
            <div>
              <label className="block text-base font-bold text-slate-900 mb-2.5">
                1. {getQ("q_2c_tipo_org", "Tipo de organización:").label}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(
                  getQ("q_2c_tipo_org", "").options ||
                  DEFAULT_SURVEY_SCHEMA.sections[4].questions[0].options!
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setS2cTipoOrg(opt.value)}
                    className={`p-3.5 rounded-xl border text-left text-sm transition cursor-pointer ${
                      s2cTipoOrg === opt.value
                        ? "border-[#567c7f] bg-[#567c7f] text-white font-bold"
                        : "border-slate-200 hover:border-[#567c7f] text-slate-800 font-medium"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {s2cTipoOrg === "otra" && (
                <div className="mt-3 bg-[#f3f6f7] p-4 rounded-xl border border-[#567c7f]/30">
                  <label className="block text-xs font-bold text-[#3f5f61] mb-1">
                    ¿Cuál? Especificá el tipo de organización{" "}
                    <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={s2cTipoOrgOtra}
                    onChange={(e) => setS2cTipoOrgOtra(e.target.value)}
                    placeholder="Describí el espacio u organización..."
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white focus:border-[#567c7f] outline-none text-sm"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-base font-bold text-slate-900 mb-2.5">
                2. {getQ("q_2c_rol", "Tu rol:").label}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(
                  getQ("q_2c_rol", "").options ||
                  DEFAULT_SURVEY_SCHEMA.sections[4].questions[1].options!
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setS2cRol(opt.value)}
                    className={`p-3.5 rounded-xl border text-left text-sm transition cursor-pointer ${
                      s2cRol === opt.value
                        ? "border-[#567c7f] bg-[#567c7f] text-white font-bold"
                        : "border-slate-200 hover:border-[#567c7f] text-slate-800 font-medium"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {s2cRol === "otro" && (
                <div className="mt-3 bg-[#f3f6f7] p-4 rounded-xl border border-[#567c7f]/30">
                  <label className="block text-xs font-bold text-[#3f5f61] mb-1">
                    ¿Cuál? Especificá tu rol <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={s2cRolOtro}
                    onChange={(e) => setS2cRolOtro(e.target.value)}
                    placeholder="Describí tu rol..."
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white focus:border-[#567c7f] outline-none text-sm"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION 3: Datos Generales */}
        {currentSectionId === "S3" && (
          <div className="space-y-6">
            <div>
              <label className="block text-base font-bold text-slate-900 mb-1">
                1. {getQ("q_3_region", "Región sanitaria (I a XII):").label}
              </label>
              {regionLockedFromLink && (
                <p className="text-xs text-[#567c7f] font-semibold mb-2">
                  Precargada automáticamente desde el enlace regional (podés cambiarla si corresponde).
                </p>
              )}
              <select
                value={regionSanitaria}
                onChange={(e) => setRegionSanitaria(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[#567c7f] bg-white outline-none text-base"
              >
                <option value="">Seleccioná una Región Sanitaria...</option>
                {REGIONES_SANITARIAS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name} — Sede {r.sede}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-base font-bold text-slate-900 mb-1">
                2. {getQ("q_3_municipio", "Municipio:").label}
              </label>
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
            </div>

            <div>
              <label className="block text-base font-bold text-slate-900 mb-2.5">
                3. {getQ("q_3_antiguedad", "Antigüedad en la tarea:").label}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { value: "menos_de_5", label: "Menos de 5 años" },
                  { value: "5_a_10", label: "5 a 10 años" },
                  { value: "11_a_20", label: "11 a 20 años" },
                  { value: "mas_de_20", label: "Más de 20 años" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAntiguedad(opt.value)}
                    className={`p-3.5 rounded-xl border text-left text-sm transition cursor-pointer ${
                      antiguedad === opt.value
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
                }
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

            {/* 4.2, 4.3, 4.4 Dynamic Problem + Proposal Pairs */}
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
                      {item.num}. Sobre la temática que ubicaste en {item.rank}.° lugar:
                    </h3>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#567c7f] text-white">
                      {item.rank}.° Prioridad: {chosenLabel}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">
                      ¿Cuál es el principal problema que ves en tu trabajo o en tu barrio?{" "}
                      <span className="text-red-600">*</span>
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
                      ¿Qué propuesta tenés para ese problema en particular?{" "}
                      <span className="text-red-600">*</span>
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
                <span className="text-xs font-normal text-slate-500">(Opcional)</span>
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
                }
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                {[
                  { value: "muy_buena", label: "Muy buena" },
                  { value: "buena", label: "Buena" },
                  { value: "regular", label: "Regular" },
                  { value: "mala", label: "Mala" },
                  { value: "no_se", label: "No sé" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRelacionZonal(opt.value)}
                    className={`p-3 rounded-xl border text-center text-sm transition cursor-pointer ${
                      relacionZonal === opt.value
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
                }
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
                    }
                  </label>
                  <p className="text-xs text-slate-500 mb-2.5">
                    Podés marcar varias temáticas.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {allParticipationThemes.map((th) => {
                      const checked = tematicasMesa.includes(th.id);
                      const isInTop5 = priorities.some((p) => p.themeId === th.id);
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
                    }
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
                    }
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
                    5. {getQ("q_5_modalidad", "Modalidad preferida:").label}
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
