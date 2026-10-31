import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
} from "react-native";
import { randomUUID } from "expo-crypto";
import {
  DEFAULT_SURVEY_SCHEMA,
  DEFAULT_HOSPITAL_SERVICES,
  REGIONES_SANITARIAS,
  REGION_NO_CALIFICA,
  MUNICIPIOS_PBA,
  getMunicipiosByRegion,
  getActiveSectionIds,
  getRankThemeLabel,
  validateSurveySubmission,
  SurveySchema,
  SurveyQuestion,
  PriorityRankEntry,
  CustomThemeEntry,
  MainLocationType,
  SurveySubmissionPayload,
} from "../shared/contracts";

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

const RANKS = [1, 2, 3, 4, 5];

function makeUuid(): string {
  // Cryptographically secure UUID (expo-crypto); the `and_` prefix keeps ids
  // readable and stays valid for storage keys (alphanumeric, `.`, `-`, `_`).
  return `and_${randomUUID()}`;
}

interface SurveyScreenProps {
  schema: SurveySchema;
  defaultRegion: string;
  initialDraft: Record<string, unknown> | null;
  onSaveDraftAndSyncStep: (
    draftState: Record<string, unknown>,
    payload: SurveySubmissionPayload
  ) => Promise<{ syncedNow: boolean }>;
  onFinishSurvey: (
    payload: SurveySubmissionPayload
  ) => Promise<{ syncedNow: boolean }>;
  onExitToHome: () => void;
  onOpenUnlinkedContact: (prefillRegion: string) => void;
}

export function SurveyScreen({
  schema,
  defaultRegion,
  initialDraft,
  onSaveDraftAndSyncStep,
  onFinishSurvey,
  onExitToHome,
  onOpenUnlinkedContact,
}: SurveyScreenProps) {
  const [submissionId, setSubmissionId] = useState<string>(
    (initialDraft?.submissionId as string) || makeUuid()
  );
  const [stepIndex, setStepIndex] = useState<number>(
    typeof initialDraft?.stepIndex === "number" ? initialDraft.stepIndex : 0
  );
  const [declinedConsent, setDeclinedConsent] = useState(false);
  const [finishedState, setFinishedState] = useState<{
    done: boolean;
    syncedNow: boolean;
  }>({ done: false, syncedNow: false });
  const [stepErrors, setStepErrors] = useState<string[]>([]);

  // Form fields
  const [consent, setConsent] = useState<boolean | null>(
    typeof initialDraft?.consent === "boolean" ? initialDraft.consent : null
  );
  const [mainLocation, setMainLocation] = useState<MainLocationType>(
    (initialDraft?.mainLocation as MainLocationType) || ""
  );

  // 2A
  const [s2aTarea, setS2aTarea] = useState(
    (initialDraft?.s2aTarea as string) || ""
  );
  const [s2aTareaOtra, setS2aTareaOtra] = useState(
    (initialDraft?.s2aTareaOtra as string) || ""
  );

  // 2B
  const [s2bTipoHospital, setS2bTipoHospital] = useState(
    (initialDraft?.s2bTipoHospital as string) || ""
  );
  const [s2bTarea, setS2bTarea] = useState(
    (initialDraft?.s2bTarea as string) || ""
  );
  const [s2bTareaOtra, setS2bTareaOtra] = useState(
    (initialDraft?.s2bTareaOtra as string) || ""
  );
  const [s2bAreaServicio, setS2bAreaServicio] = useState(
    (initialDraft?.s2bAreaServicio as string) || ""
  );

  // 2C
  const [s2cTipoOrg, setS2cTipoOrg] = useState(
    (initialDraft?.s2cTipoOrg as string) || ""
  );
  const [s2cTipoOrgOtra, setS2cTipoOrgOtra] = useState(
    (initialDraft?.s2cTipoOrgOtra as string) || ""
  );
  const [s2cRol, setS2cRol] = useState((initialDraft?.s2cRol as string) || "");
  const [s2cRolOtro, setS2cRolOtro] = useState(
    (initialDraft?.s2cRolOtro as string) || ""
  );

  // 2D
  const [s2dAmbito, setS2dAmbito] = useState(
    (initialDraft?.s2dAmbito as string) || ""
  );
  const [s2dRol, setS2dRol] = useState((initialDraft?.s2dRol as string) || "");
  const [s2dRolOtra, setS2dRolOtra] = useState(
    (initialDraft?.s2dRolOtra as string) || ""
  );
  const [s2dArea, setS2dArea] = useState(
    (initialDraft?.s2dArea as string) || ""
  );

  // Section 1 «Otros» free text
  const [mainLocationOtro, setMainLocationOtro] = useState(
    (initialDraft?.mainLocationOtro as string) || ""
  );

  // 1E (Instituciones educativas, inline cascade in Section 1)
  const [eduNivel, setEduNivel] = useState(
    (initialDraft?.eduNivel as string) || ""
  );
  const [eduJurisdiccion, setEduJurisdiccion] = useState(
    (initialDraft?.eduJurisdiccion as string) || ""
  );
  const [eduRol, setEduRol] = useState((initialDraft?.eduRol as string) || "");
  const [eduRolOtro, setEduRolOtro] = useState(
    (initialDraft?.eduRolOtro as string) || ""
  );

  // Section 3
  const [regionSanitaria, setRegionSanitaria] = useState(
    (initialDraft?.regionSanitaria as string) || defaultRegion || ""
  );
  const [municipio, setMunicipio] = useState(
    (initialDraft?.municipio as string) || ""
  );
  const [municipioSearch, setMunicipioSearch] = useState(
    (initialDraft?.municipio as string) || ""
  );
  const [antiguedad, setAntiguedad] = useState(
    (initialDraft?.antiguedad as string) || ""
  );

  // Section 4
  const [priorities, setPriorities] = useState<PriorityRankEntry[]>(
    (initialDraft?.priorities as PriorityRankEntry[]) || []
  );
  const [customThemes, setCustomThemes] = useState<CustomThemeEntry[]>(
    (initialDraft?.customThemes as CustomThemeEntry[]) || []
  );
  const [showAddThemeBox, setShowAddThemeBox] = useState(false);
  const [newThemeTitle, setNewThemeTitle] = useState("");
  const [newThemeDesc, setNewThemeDesc] = useState("");
  const [themeBoxError, setThemeBoxError] = useState<string | null>(null);

  const [rank1Problema, setRank1Problema] = useState(
    (initialDraft?.rank1Problema as string) || ""
  );
  const [rank1Propuesta, setRank1Propuesta] = useState(
    (initialDraft?.rank1Propuesta as string) || ""
  );
  const [rank2Problema, setRank2Problema] = useState(
    (initialDraft?.rank2Problema as string) || ""
  );
  const [rank2Propuesta, setRank2Propuesta] = useState(
    (initialDraft?.rank2Propuesta as string) || ""
  );
  const [rank3Problema, setRank3Problema] = useState(
    (initialDraft?.rank3Problema as string) || ""
  );
  const [rank3Propuesta, setRank3Propuesta] = useState(
    (initialDraft?.rank3Propuesta as string) || ""
  );
  const [otraTematicaAbierta, setOtraTematicaAbierta] = useState(
    (initialDraft?.otraTematicaAbierta as string) || ""
  );
  const [relacionZonal, setRelacionZonal] = useState(
    (initialDraft?.relacionZonal as string) || ""
  );

  // Section 5
  const [interesaMesa, setInteresaMesa] = useState<"si" | "no" | "tal_vez" | "">(
    (initialDraft?.interesaMesa as "si" | "no" | "tal_vez" | "") || ""
  );
  const [tematicasMesa, setTematicasMesa] = useState<string[]>(
    (initialDraft?.tematicasMesa as string[]) || []
  );
  const [ofreceReferente, setOfreceReferente] = useState<"si" | "no" | "">(
    (initialDraft?.ofreceReferente as "si" | "no" | "") || ""
  );
  const [horarios, setHorarios] = useState<string[]>(
    (initialDraft?.horarios as string[]) || []
  );
  const [modalidad, setModalidad] = useState<
    "virtual" | "presencial" | "mixta" | ""
  >((initialDraft?.modalidad as "virtual" | "presencial" | "mixta" | "") || "");

  const [customAnswers, setCustomAnswers] = useState<
    Record<string, string | string[]>
  >((initialDraft?.customAnswers as Record<string, string | string[]>) || {});

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

  const filteredServices = useMemo(() => {
    const q = s2bAreaServicio.trim().toLowerCase();
    if (!q) return DEFAULT_HOSPITAL_SERVICES;
    return DEFAULT_HOSPITAL_SERVICES.filter((s) =>
      s.toLowerCase().includes(q)
    );
  }, [s2bAreaServicio]);

  const eduOptions = (id: string) => {
    const q = getQ(
      id,
      "",
      DEFAULT_SURVEY_SCHEMA.sections
        .find((s) => s.id === "S1")
        ?.questions.find((x) => x.id === id)?.options
    );
    return q.options || [];
  };

  // Leaving «No califica» drops a free-text localidad that is not a PBA
  // municipality so the municipio search starts clean.
  const selectRegion = (code: string) => {
    if (
      regionSanitaria === REGION_NO_CALIFICA &&
      code !== REGION_NO_CALIFICA &&
      !MUNICIPIOS_PBA.some(
        (m) => m.name.toLowerCase() === municipio.trim().toLowerCase()
      )
    ) {
      setMunicipio("");
      setMunicipioSearch("");
    }
    setRegionSanitaria(code);
  };

  const filteredMunicipios = useMemo(() => {
    const base = regionSanitaria
      ? getMunicipiosByRegion(regionSanitaria)
      : MUNICIPIOS_PBA;
    const q = municipioSearch.trim().toLowerCase();
    if (!q) return base.slice(0, 25);
    return base.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 25);
  }, [regionSanitaria, municipioSearch]);

  const allThemeRows = [
    ...schema.themes
      .filter((t) => t.active !== false)
      .map((t) => ({
        id: t.id,
        label: t.label,
        description: t.description || "",
        isCustom: false,
      })),
    ...customThemes.map((ct) => ({
      id: ct.id,
      label: ct.title,
      description: ct.description,
      isCustom: true,
    })),
  ];

  const buildPayload = (
    isComplete: boolean,
    stepCode: string
  ): SurveySubmissionPayload => ({
    clientSubmissionId: submissionId,
    surveyVersion: schema.version || 2,
    createdAtClient: new Date().toISOString(),
    sourcePlatform: "android",
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
    mainLocationOtro: mainLocation === "otro" ? mainLocationOtro : undefined,
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
    sectionEducativa:
      mainLocation === "institucion_educativa"
        ? {
            nivel: eduNivel,
            jurisdiccion: eduJurisdiccion,
            rol: eduRol,
            rolOtro: eduRol === "otro" ? eduRolOtro : "",
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
      rank1Detail: { problema: rank1Problema, propuesta: rank1Propuesta },
      rank2Detail: { problema: rank2Problema, propuesta: rank2Propuesta },
      rank3Detail: { problema: rank3Problema, propuesta: rank3Propuesta },
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
  });

  const buildDraftSnapshot = (nextStepIndex: number) => ({
    submissionId,
    stepIndex: nextStepIndex,
    currentStep: activeSectionIds[nextStepIndex] || currentSectionId,
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
  });

  const validateCurrentStep = (): boolean => {
    const errs: string[] = [];
    if (currentSectionId === "S0") {
      if (consent === null) errs.push("Seleccioná si aceptás participar.");
    } else if (currentSectionId === "S1") {
      if (!mainLocation)
        errs.push("Seleccioná dónde realizás tu tarea principal.");
      else if (mainLocation === "otro" && !mainLocationOtro.trim())
        errs.push("Especificá ¿Cuál? es tu espacio de trabajo.");
      else if (mainLocation === "institucion_educativa") {
        if (!eduNivel) errs.push("Seleccioná el nivel de la institución educativa.");
        if (!eduJurisdiccion)
          errs.push("Seleccioná la jurisdicción (Municipal, Provincial o Nacional).");
        if (!eduRol) errs.push("Seleccioná tu rol en la institución educativa.");
        else if (eduRol === "otro" && !eduRolOtro.trim())
          errs.push("Especificá ¿Cuál? en tu rol.");
      }
    } else if (currentSectionId === "S2A") {
      if (!s2aTarea) errs.push("Seleccioná tu tarea en el primer nivel.");
      else if (s2aTarea === "otra" && !s2aTareaOtra.trim())
        errs.push("Especificá ¿Cuál? en tu tarea.");
    } else if (currentSectionId === "S2B") {
      if (!s2bTipoHospital)
        errs.push("Seleccioná la gestión del hospital (Nacional, Provincial o Municipal).");
      if (!s2bTarea) errs.push("Seleccioná tu tarea en el hospital.");
      else if (s2bTarea === "otra" && !s2bTareaOtra.trim())
        errs.push("Especificá ¿Cuál? en tu tarea.");
      if (!s2bAreaServicio.trim())
        errs.push("Seleccioná o escribí el área o servicio donde trabajás.");
    } else if (currentSectionId === "S2C") {
      if (!s2cTipoOrg) errs.push("Seleccioná el tipo de organización.");
      else if (s2cTipoOrg === "otra" && !s2cTipoOrgOtra.trim())
        errs.push("Especificá ¿Cuál? en el tipo de organización.");
      if (!s2cRol) errs.push("Seleccioná tu rol.");
      else if (s2cRol === "otro" && !s2cRolOtro.trim())
        errs.push("Especificá ¿Cuál? en tu rol.");
    } else if (currentSectionId === "S2D") {
      if (!s2dAmbito) errs.push("Seleccioná el ámbito de gestión.");
      if (!s2dRol) errs.push("Seleccioná tu función o rol.");
      else if (s2dRol === "otra" && !s2dRolOtra.trim())
        errs.push("Especificá ¿Cuál? en tu rol.");
      if (!s2dArea.trim())
        errs.push("Completá el área, dirección o espacio donde trabajás.");
    } else if (currentSectionId === "S3") {
      if (!regionSanitaria)
        errs.push("Seleccioná la Región Sanitaria o «No califica».");
      if (!municipio.trim())
        errs.push(
          regionSanitaria === REGION_NO_CALIFICA
            ? "Escribí tu localidad."
            : "Seleccioná o escribí el Municipio."
        );
      if (!antiguedad) errs.push("Seleccioná tu antigüedad.");
    } else if (currentSectionId === "S4") {
      if (priorities.length !== 5)
        errs.push("Elegí y ordená las 5 temáticas prioritarias (1.° a 5.°).");
      if (!relacionZonal)
        errs.push("Seleccioná cómo describirías la relación zonal (4.6).");
    } else if (currentSectionId === "S5") {
      if (!interesaMesa)
        errs.push("Respondé si te interesa integrar una mesa de trabajo.");
      else if (interesaMesa === "si" || interesaMesa === "tal_vez") {
        if (tematicasMesa.length === 0)
          errs.push("Seleccioná al menos una temática para la mesa.");
        if (!ofreceReferente)
          errs.push("Indicá si te ofrecés como referente de mesa.");
        if (horarios.length === 0)
          errs.push("Seleccioná al menos un horario posible.");
        if (!modalidad) errs.push("Seleccioná la modalidad preferida.");
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
    const nextSec = activeSectionIds[nextIdx] || currentSectionId;
    setStepIndex(nextIdx);

    if (consent === true) {
      onSaveDraftAndSyncStep(
        buildDraftSnapshot(nextIdx),
        buildPayload(false, nextSec)
      );
    }
  };

  const handleBack = () => {
    setStepErrors([]);
    const prevIdx = Math.max(0, stepIndex - 1);
    const prevSec = activeSectionIds[prevIdx] || currentSectionId;
    setStepIndex(prevIdx);
    if (consent === true) {
      onSaveDraftAndSyncStep(
        buildDraftSnapshot(prevIdx),
        buildPayload(false, prevSec)
      );
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;
    const payload = buildPayload(true, "S5");
    const check = validateSurveySubmission(payload);
    if (!check.valid) {
      setStepErrors(check.errors);
      return;
    }
    const res = await onFinishSurvey(payload);
    setFinishedState({ done: true, syncedNow: res.syncedNow });
  };

  const handleAssignRank = (themeId: string, themeLabel: string, rank: number) => {
    const same = priorities.find(
      (p) => p.themeId === themeId && p.rank === rank
    );
    if (same) {
      setPriorities(
        priorities.filter((p) => !(p.themeId === themeId && p.rank === rank))
      );
      return;
    }
    const filtered = priorities.filter(
      (p) => p.rank !== rank && p.themeId !== themeId
    );
    setPriorities(
      [...filtered, { rank, themeId, themeLabel }].sort(
        (a, b) => a.rank - b.rank
      )
    );
  };

  const handleAddCustomTheme = () => {
    if (!newThemeTitle.trim() || !newThemeDesc.trim()) {
      setThemeBoxError(
        "Es obligatorio ingresar tanto el título como la descripción de lo que aborda la temática."
      );
      return;
    }
    const id = `custom_${Date.now()}`;
    const title = newThemeTitle.trim();
    const desc = newThemeDesc.trim();
    setCustomThemes([...customThemes, { id, title, description: desc }]);

    const usedRanks = new Set(priorities.map((p) => p.rank));
    const freeRank = RANKS.find((r) => !usedRanks.has(r));
    if (freeRank) {
      handleAssignRank(id, title, freeRank);
    }
    setNewThemeTitle("");
    setNewThemeDesc("");
    setThemeBoxError(null);
    setShowAddThemeBox(false);
  };

  if (declinedConsent) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.doneTitle}>Relevamiento finalizado</Text>
        <Text style={styles.doneSub}>
          Elegiste no participar. No se guardó ningún dato.
        </Text>
        <Pressable onPress={onExitToHome} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>Volver a la Bandeja</Text>
        </Pressable>
      </View>
    );
  }

  if (finishedState.done) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <View style={styles.doneCard}>
          <Text style={styles.doneTitle}>¡Encuesta registrada con éxito!</Text>
          <Text style={styles.doneSub}>
            {finishedState.syncedNow
              ? "✓ Sincronizada inmediatamente con el servidor en la nube."
              : "Guardada en la cola offline del teléfono: se subirá sola apenas el dispositivo detecte conexión."}
          </Text>

          <View style={styles.contactInviteBox}>
            <Text style={styles.contactInviteText}>
              {schema.finalMessage ||
                "¡Gracias! Si querés que te convoquemos a una mesa, dejanos tus datos en este otro formulario, que no se vincula con tus respuestas:"}
            </Text>
            <Pressable
              onPress={() => onOpenUnlinkedContact(regionSanitaria)}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>
                Ir al formulario de contacto (desvinculado)
              </Text>
            </Pressable>
          </View>

          <Pressable onPress={onExitToHome} style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>
              Volver a la Bandeja de Relevador
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Step Header */}
      <View style={styles.stepHeader}>
        <View style={styles.stepRow}>
          <Text style={styles.stepBadge}>
            Paso {stepIndex + 1} de {activeSectionIds.length} · Auto-guardado
          </Text>
          <Pressable onPress={onExitToHome}>
            <Text style={styles.exitLink}>Guardar y salir a bandeja</Text>
          </Pressable>
        </View>
        <Text style={styles.sectionTitle}>{currentSection?.title}</Text>
        <Text style={styles.helperNote}>
          Los campos marcados con * son obligatorios.
        </Text>
      </View>

      {stepErrors.length > 0 && (
        <View style={styles.errorBox}>
          {stepErrors.map((err, i) => (
            <Text key={i} style={styles.errorText}>
              • {err}
            </Text>
          ))}
        </View>
      )}

      <View style={styles.card}>
        {/* S0 Consent */}
        {currentSectionId === "S0" && (
          <View style={styles.fieldGroup}>
            <Text style={styles.promptQuote}>
              «
              {
                getQ(
                  "q_consent",
                  DEFAULT_SURVEY_SCHEMA.sections[0].questions[0].label
                ).label
              }
              »
            </Text>
            <Pressable
              onPress={() => setConsent(true)}
              style={[
                styles.optionBtn,
                consent === true && styles.optionBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.optionBtnText,
                  consent === true && styles.optionBtnTextActive,
                ]}
              >
                Sí, acepto participar
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setConsent(false)}
              style={[
                styles.optionBtn,
                consent === false && styles.optionBtnDanger,
              ]}
            >
              <Text
                style={[
                  styles.optionBtnText,
                  consent === false && styles.optionBtnTextActive,
                ]}
              >
                No (finaliza el formulario)
              </Text>
            </Pressable>
          </View>
        )}

        {/* S1 Main Location */}
        {currentSectionId === "S1" && (
          <View style={styles.fieldGroup}>
            <Text style={styles.questionLabel}>
              ¿Dónde realizás tu tarea principal? *
            </Text>
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
              const active = mainLocation === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setMainLocation(opt.value as MainLocationType)}
                  style={[styles.optionBtn, active && styles.optionBtnActive]}
                >
                  <Text
                    style={[
                      styles.optionBtnText,
                      active && styles.optionBtnTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}

            {mainLocation === "otro" && (
              <View style={styles.cascadeBox}>
                <Text style={styles.questionLabel}>¿Cuál? *</Text>
                <TextInput
                  value={mainLocationOtro}
                  onChangeText={setMainLocationOtro}
                  maxLength={200}
                  placeholder="Describí dónde realizás tu tarea principal..."
                  style={styles.input}
                />
              </View>
            )}

            {/* Instituciones educativas: nivel → jurisdicción → rol in cascade */}
            {mainLocation === "institucion_educativa" && (
              <View style={styles.cascadeBox}>
                <Text style={styles.questionLabel}>
                  {getQ("q_1e_nivel", "Nivel educativo:").label}{" *"}
                </Text>
                <View style={styles.chipsWrap}>
                  {eduOptions("q_1e_nivel").map((opt) => {
                    const active = eduNivel === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => {
                          if (opt.value !== eduNivel) {
                            setEduJurisdiccion("");
                            setEduRol("");
                            setEduRolOtro("");
                          }
                          setEduNivel(opt.value);
                        }}
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {eduNivel ? (
                  <>
                    <Text style={styles.questionLabel}>
                      {
                        getQ("q_1e_jurisdiccion", "Jurisdicción de la institución:")
                          .label
                      }{" *"}
                    </Text>
                    <View style={styles.chipsWrap}>
                      {eduOptions("q_1e_jurisdiccion").map((opt) => {
                        const active = eduJurisdiccion === opt.value;
                        return (
                          <Pressable
                            key={opt.value}
                            onPress={() => {
                              if (opt.value !== eduJurisdiccion) {
                                setEduRol("");
                                setEduRolOtro("");
                              }
                              setEduJurisdiccion(opt.value);
                            }}
                            style={[styles.chip, active && styles.chipActive]}
                          >
                            <Text
                              style={[styles.chipText, active && styles.chipTextActive]}
                            >
                              {opt.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                ) : null}

                {eduNivel && eduJurisdiccion ? (
                  <>
                    <Text style={styles.questionLabel}>
                      {getQ("q_1e_rol", "Tu rol en la institución:").label}{" *"}
                    </Text>
                    {eduOptions("q_1e_rol").map((opt) => {
                      const active = eduRol === opt.value;
                      return (
                        <Pressable
                          key={opt.value}
                          onPress={() => setEduRol(opt.value)}
                          style={[styles.optionBtn, active && styles.optionBtnActive]}
                        >
                          <Text
                            style={[
                              styles.optionBtnText,
                              active && styles.optionBtnTextActive,
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                    {eduRol === "otro" && (
                      <TextInput
                        value={eduRolOtro}
                        onChangeText={setEduRolOtro}
                        maxLength={120}
                        placeholder="¿Cuál? Describí tu rol..."
                        style={styles.input}
                      />
                    )}
                  </>
                ) : null}
              </View>
            )}
          </View>
        )}

        {/* S2A Primer Nivel */}
        {currentSectionId === "S2A" && (
          <View style={styles.fieldGroup}>
            <Text style={styles.questionLabel}>1. Tu tarea: *</Text>
            {(
              getQ("q_2a_tarea", "Tu tarea:").options ||
              DEFAULT_SURVEY_SCHEMA.sections[2].questions[0].options!
            ).map((opt) => {
              const active = s2aTarea === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setS2aTarea(opt.value)}
                  style={[styles.optionBtn, active && styles.optionBtnActive]}
                >
                  <Text
                    style={[
                      styles.optionBtnText,
                      active && styles.optionBtnTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
            {s2aTarea === "otra" && (
              <TextInput
                value={s2aTareaOtra}
                onChangeText={setS2aTareaOtra}
                placeholder="¿Cuál? Especificá tu tarea..."
                style={styles.input}
              />
            )}
          </View>
        )}

        {/* S2B Hospital */}
        {currentSectionId === "S2B" && (
          <View style={styles.fieldGroup}>
            <Text style={styles.questionLabel}>
              1. Dependencia / Gestión del hospital: *
            </Text>
            {[
              { value: "nacional", label: "Gestión Nacional" },
              { value: "provincial", label: "Gestión Provincial" },
              { value: "municipal", label: "Gestión Municipal" },
            ].map((opt) => {
              const active = s2bTipoHospital === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setS2bTipoHospital(opt.value)}
                  style={[styles.optionBtn, active && styles.optionBtnActive]}
                >
                  <Text
                    style={[
                      styles.optionBtnText,
                      active && styles.optionBtnTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}

            <Text style={[styles.questionLabel, { marginTop: 12 }]}>
              2. Tu tarea: *
            </Text>
            {(
              getQ("q_2b_tarea", "Tu tarea:").options ||
              DEFAULT_SURVEY_SCHEMA.sections[3].questions[1].options!
            ).map((opt) => {
              const active = s2bTarea === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setS2bTarea(opt.value)}
                  style={[styles.optionBtn, active && styles.optionBtnActive]}
                >
                  <Text
                    style={[
                      styles.optionBtnText,
                      active && styles.optionBtnTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
            {s2bTarea === "otra" && (
              <TextInput
                value={s2bTareaOtra}
                onChangeText={setS2bTareaOtra}
                placeholder="¿Cuál? Especificá tu tarea..."
                style={styles.input}
              />
            )}

            <Text style={[styles.questionLabel, { marginTop: 12 }]}>
              3. Área o servicio donde trabajás (filtrá de la lista o escribí libremente): *
            </Text>
            <TextInput
              value={s2bAreaServicio}
              onChangeText={setS2bAreaServicio}
              placeholder="Escribí o tocá un servicio de la lista..."
              style={styles.input}
            />
            <View style={styles.chipsWrap}>
              {filteredServices.slice(0, 12).map((srv) => {
                const active = s2bAreaServicio === srv;
                return (
                  <Pressable
                    key={srv}
                    onPress={() => setS2bAreaServicio(srv)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text
                      style={[styles.chipText, active && styles.chipTextActive]}
                    >
                      {srv}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* S2C Comunitario */}
        {currentSectionId === "S2C" && (
          <View style={styles.fieldGroup}>
            <Text style={styles.questionLabel}>1. Tipo de organización: *</Text>
            {(
              getQ("q_2c_tipo_org", "").options ||
              DEFAULT_SURVEY_SCHEMA.sections[4].questions[0].options!
            ).map((opt) => {
              const active = s2cTipoOrg === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setS2cTipoOrg(opt.value)}
                  style={[styles.optionBtn, active && styles.optionBtnActive]}
                >
                  <Text
                    style={[
                      styles.optionBtnText,
                      active && styles.optionBtnTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
            {s2cTipoOrg === "otra" && (
              <TextInput
                value={s2cTipoOrgOtra}
                onChangeText={setS2cTipoOrgOtra}
                placeholder="¿Cuál? Especificá el tipo de organización..."
                style={styles.input}
              />
            )}

            <Text style={[styles.questionLabel, { marginTop: 12 }]}>
              2. Tu rol: *
            </Text>
            {(
              getQ("q_2c_rol", "").options ||
              DEFAULT_SURVEY_SCHEMA.sections[4].questions[1].options!
            ).map((opt) => {
              const active = s2cRol === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setS2cRol(opt.value)}
                  style={[styles.optionBtn, active && styles.optionBtnActive]}
                >
                  <Text
                    style={[
                      styles.optionBtnText,
                      active && styles.optionBtnTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
            {s2cRol === "otro" && (
              <TextInput
                value={s2cRolOtro}
                onChangeText={setS2cRolOtro}
                placeholder="¿Cuál? Especificá tu rol..."
                style={styles.input}
              />
            )}
          </View>
        )}

        {/* S2D Gestión Sanitaria */}
        {currentSectionId === "S2D" && (
          <View style={styles.fieldGroup}>
            <Text style={styles.questionLabel}>1. Ámbito de gestión: *</Text>
            {[
              { value: "nacional", label: "Gestión Nacional" },
              { value: "provincial", label: "Gestión Provincial" },
              { value: "municipal", label: "Gestión Municipal" },
            ].map((opt) => {
              const active = s2dAmbito === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setS2dAmbito(opt.value)}
                  style={[styles.optionBtn, active && styles.optionBtnActive]}
                >
                  <Text
                    style={[
                      styles.optionBtnText,
                      active && styles.optionBtnTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}

            <Text style={[styles.questionLabel, { marginTop: 12 }]}>
              2. Tu función o rol: *
            </Text>
            {[
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
              { value: "otra", label: "Otra" },
            ].map((opt) => {
              const active = s2dRol === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setS2dRol(opt.value)}
                  style={[styles.optionBtn, active && styles.optionBtnActive]}
                >
                  <Text
                    style={[
                      styles.optionBtnText,
                      active && styles.optionBtnTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
            {s2dRol === "otra" && (
              <TextInput
                value={s2dRolOtra}
                onChangeText={setS2dRolOtra}
                placeholder="¿Cuál? Especificá tu función..."
                style={styles.input}
              />
            )}

            <Text style={[styles.questionLabel, { marginTop: 12 }]}>
              3. Área, dirección, secretaría o Región Sanitaria: *
            </Text>
            <TextInput
              value={s2dArea}
              onChangeText={setS2dArea}
              placeholder="Escribí el área o dirección..."
              style={styles.input}
            />
          </View>
        )}

        {/* S3 Datos Generales */}
        {currentSectionId === "S3" && (
          <View style={styles.fieldGroup}>
            <Text style={styles.questionLabel}>
              1. Región Sanitaria (I a XII): *
            </Text>
            <Text style={styles.helperNote}>
              Tocá una región para ver qué municipios le corresponden.
            </Text>
            <View style={styles.chipsWrap}>
              {REGIONES_SANITARIAS.map((r) => {
                const active = regionSanitaria === r.code;
                return (
                  <Pressable
                    key={r.code}
                    onPress={() => selectRegion(r.code)}
                    accessibilityHint={`Municipios: ${getMunicipiosByRegion(r.code)
                      .map((m) => m.name)
                      .join(", ")}`}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text
                      style={[styles.chipText, active && styles.chipTextActive]}
                    >
                      {r.code} ({r.sede})
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => selectRegion(REGION_NO_CALIFICA)}
                style={[
                  styles.chip,
                  regionSanitaria === REGION_NO_CALIFICA && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    regionSanitaria === REGION_NO_CALIFICA && styles.chipTextActive,
                  ]}
                >
                  No califica
                </Text>
              </Pressable>
            </View>
            {regionSanitaria && regionSanitaria !== REGION_NO_CALIFICA ? (
              <View style={styles.regionInfoBox}>
                <Text style={styles.regionInfoText}>
                  <Text style={{ fontWeight: "800" }}>
                    Municipios de la Región {regionSanitaria}:{" "}
                  </Text>
                  {getMunicipiosByRegion(regionSanitaria)
                    .map((m) => m.name)
                    .join(", ")}
                </Text>
              </View>
            ) : null}

            <Text style={[styles.questionLabel, { marginTop: 12 }]}>
              {regionSanitaria === REGION_NO_CALIFICA
                ? "2. Localidad:"
                : "2. Municipio (135 municipios PBA):"}{" *"}
            </Text>
            <TextInput
              value={municipioSearch}
              onChangeText={(txt) => {
                setMunicipioSearch(txt);
                setMunicipio(txt);
              }}
              maxLength={120}
              placeholder={
                regionSanitaria === REGION_NO_CALIFICA
                  ? "Escribí tu localidad (ciudad y provincia)..."
                  : "Buscá tu municipio..."
              }
              style={styles.input}
            />
            <View style={styles.chipsWrap}>
              {(regionSanitaria === REGION_NO_CALIFICA
                ? []
                : filteredMunicipios
              ).map((m) => {
                const active = municipio === m.name;
                return (
                  <Pressable
                    key={m.name}
                    onPress={() => {
                      setMunicipio(m.name);
                      setMunicipioSearch(m.name);
                      if (!regionSanitaria) setRegionSanitaria(m.regionCode);
                    }}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text
                      style={[styles.chipText, active && styles.chipTextActive]}
                    >
                      {m.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.questionLabel, { marginTop: 12 }]}>
              3. Antigüedad en la tarea: *
            </Text>
            {[
              { value: "menos_de_5", label: "Menos de 5 años" },
              { value: "5_a_10", label: "5 a 10 años" },
              { value: "11_a_20", label: "11 a 20 años" },
              { value: "mas_de_20", label: "Más de 20 años" },
            ].map((opt) => {
              const active = antiguedad === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setAntiguedad(opt.value)}
                  style={[styles.optionBtn, active && styles.optionBtnActive]}
                >
                  <Text
                    style={[
                      styles.optionBtnText,
                      active && styles.optionBtnTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* S4 Prioridades */}
        {currentSectionId === "S4" && (
          <View style={styles.fieldGroup}>
            <Text style={styles.questionLabel}>
              1. Elegí 5 temáticas prioritarias y ordenalas de 1.° a 5.° ({priorities.length}/5): *
            </Text>

            {allThemeRows.map((row) => {
              const currentRank =
                priorities.find((p) => p.themeId === row.id)?.rank || null;
              return (
                <View key={row.id} style={styles.themeRowCard}>
                  <Text style={styles.themeRowTitle}>{row.label}</Text>
                  {row.description ? (
                    <Text style={styles.themeRowDesc}>{row.description}</Text>
                  ) : null}
                  <View style={styles.rankButtonsRow}>
                    {RANKS.map((rk) => {
                      const active = currentRank === rk;
                      return (
                        <Pressable
                          key={rk}
                          onPress={() =>
                            handleAssignRank(row.id, row.label, rk)
                          }
                          style={[
                            styles.rankBtn,
                            active && styles.rankBtnActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.rankBtnText,
                              active && styles.rankBtnTextActive,
                            ]}
                          >
                            {rk}.°
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}

            {!showAddThemeBox ? (
              <Pressable
                onPress={() => setShowAddThemeBox(true)}
                style={styles.secondaryBtn}
              >
                <Text style={styles.secondaryBtnText}>
                  + Agregar otra temática (abierta) a la grilla
                </Text>
              </Pressable>
            ) : (
              <View style={styles.addThemeBox}>
                <Text style={styles.questionLabel}>
                  Nueva temática (Título y descripción obligatorios)
                </Text>
                {themeBoxError && (
                  <Text style={styles.errorText}>{themeBoxError}</Text>
                )}
                <TextInput
                  value={newThemeTitle}
                  onChangeText={setNewThemeTitle}
                  placeholder="Título de la temática..."
                  style={styles.input}
                />
                <TextInput
                  value={newThemeDesc}
                  onChangeText={setNewThemeDesc}
                  placeholder="Descripción o explicación de lo que aborda..."
                  multiline
                  style={[styles.input, { minHeight: 65 }]}
                />
                <View style={styles.stepRow}>
                  <Pressable
                    onPress={() => setShowAddThemeBox(false)}
                    style={styles.secondaryBtn}
                  >
                    <Text style={styles.secondaryBtnText}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleAddCustomTheme}
                    style={styles.primaryBtn}
                  >
                    <Text style={styles.primaryBtnText}>Guardar temática</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* 4.2 - 4.4 Non-blocking Problem & Proposal pairs */}
            {[
              {
                rank: 1,
                prob: rank1Problema,
                setProb: setRank1Problema,
                prop: rank1Propuesta,
                setProp: setRank1Propuesta,
              },
              {
                rank: 2,
                prob: rank2Problema,
                setProb: setRank2Problema,
                prop: rank2Propuesta,
                setProp: setRank2Propuesta,
              },
              {
                rank: 3,
                prob: rank3Problema,
                setProb: setRank3Problema,
                prop: rank3Propuesta,
                setProp: setRank3Propuesta,
              },
            ].map((item) => {
              const label = getRankThemeLabel(priorities, item.rank);
              return (
                <View key={item.rank} style={styles.detailCard}>
                  <Text style={styles.questionLabel}>
                    Sobre tu {item.rank}.° prioridad ({label}) — Opcional:
                  </Text>
                  <TextInput
                    value={item.prob}
                    onChangeText={item.setProb}
                    placeholder="¿Cuál es el principal problema que ves?"
                    multiline
                    style={[styles.input, { minHeight: 60 }]}
                  />
                  <TextInput
                    value={item.prop}
                    onChangeText={item.setProp}
                    placeholder="¿Qué propuesta tenés para ese problema?"
                    multiline
                    style={[styles.input, { minHeight: 60 }]}
                  />
                </View>
              );
            })}

            <Text style={styles.questionLabel}>
              5. ¿Hay alguna temática que no esté en la lista y debería abordarse? (Opcional)
            </Text>
            <TextInput
              value={otraTematicaAbierta}
              onChangeText={setOtraTematicaAbierta}
              placeholder="Respuesta abierta opcional..."
              multiline
              style={[styles.input, { minHeight: 60 }]}
            />

            <Text style={styles.questionLabel}>
              6. ¿Cómo describirías hoy la relación entre el centro de salud, el hospital y las organizaciones de tu zona? *
            </Text>
            {[
              { value: "muy_buena", label: "Muy buena" },
              { value: "buena", label: "Buena" },
              { value: "regular", label: "Regular" },
              { value: "mala", label: "Mala" },
              { value: "no_se", label: "No sé" },
            ].map((opt) => {
              const active = relacionZonal === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setRelacionZonal(opt.value)}
                  style={[styles.optionBtn, active && styles.optionBtnActive]}
                >
                  <Text
                    style={[
                      styles.optionBtnText,
                      active && styles.optionBtnTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* S5 Participación */}
        {currentSectionId === "S5" && (
          <View style={styles.fieldGroup}>
            <Text style={styles.questionLabel}>
              1. ¿Te interesa integrar una mesa de trabajo? *
            </Text>
            {[
              { value: "si", label: "Sí" },
              { value: "no", label: "No" },
              { value: "tal_vez", label: "Tal vez" },
            ].map((opt) => {
              const active = interesaMesa === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() =>
                    setInteresaMesa(opt.value as "si" | "no" | "tal_vez")
                  }
                  style={[styles.optionBtn, active && styles.optionBtnActive]}
                >
                  <Text
                    style={[
                      styles.optionBtnText,
                      active && styles.optionBtnTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}

            {(interesaMesa === "si" || interesaMesa === "tal_vez") && (
              <View style={styles.fieldGroup}>
                <Text style={styles.questionLabel}>
                  2. ¿Sobre qué temáticas te gustaría trabajar? (marcá varias): *
                </Text>
                {allThemeRows.map((th) => {
                  const checked = tematicasMesa.includes(th.id);
                  return (
                    <Pressable
                      key={th.id}
                      onPress={() =>
                        setTematicasMesa((prev) =>
                          prev.includes(th.id)
                            ? prev.filter((x) => x !== th.id)
                            : [...prev, th.id]
                        )
                      }
                      style={[
                        styles.optionBtn,
                        checked && styles.optionBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionBtnText,
                          checked && styles.optionBtnTextActive,
                        ]}
                      >
                        {checked ? "☑ " : "☐ "}
                        {th.label}
                      </Text>
                    </Pressable>
                  );
                })}

                <Text style={styles.questionLabel}>
                  3. ¿Te ofrecés como referente de mesa? *
                </Text>
                {[
                  { value: "si", label: "Sí" },
                  { value: "no", label: "No" },
                ].map((opt) => {
                  const active = ofreceReferente === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() =>
                        setOfreceReferente(opt.value as "si" | "no")
                      }
                      style={[
                        styles.optionBtn,
                        active && styles.optionBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionBtnText,
                          active && styles.optionBtnTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}

                <Text style={styles.questionLabel}>
                  4. Horarios posibles (marcá varios): *
                </Text>
                <View style={styles.chipsWrap}>
                  {[
                    { value: "manana", label: "Mañana" },
                    { value: "mediodia", label: "Mediodía" },
                    { value: "tarde", label: "Tarde" },
                    { value: "noche", label: "Noche" },
                  ].map((opt) => {
                    const checked = horarios.includes(opt.value);
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() =>
                          setHorarios((prev) =>
                            prev.includes(opt.value)
                              ? prev.filter((x) => x !== opt.value)
                              : [...prev, opt.value]
                          )
                        }
                        style={[styles.chip, checked && styles.chipActive]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            checked && styles.chipTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.questionLabel}>5. Modalidad preferida: *</Text>
                {[
                  { value: "virtual", label: "Virtual" },
                  { value: "presencial", label: "Presencial" },
                  { value: "mixta", label: "Mixta" },
                ].map((opt) => {
                  const active = modalidad === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() =>
                        setModalidad(
                          opt.value as "virtual" | "presencial" | "mixta"
                        )
                      }
                      style={[
                        styles.optionBtn,
                        active && styles.optionBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionBtnText,
                          active && styles.optionBtnTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Navigation Footer */}
        <View style={styles.navFooter}>
          {stepIndex > 0 ? (
            <Pressable onPress={handleBack} style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>← Anterior</Text>
            </Pressable>
          ) : (
            <View />
          )}

          {stepIndex < activeSectionIds.length - 1 ? (
            <Pressable onPress={handleNext} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Siguiente →</Text>
            </Pressable>
          ) : (
            <Pressable onPress={handleSubmit} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Finalizar y Guardar</Text>
            </Pressable>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f6f7" },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  stepHeader: {
    backgroundColor: "#567c7f",
    borderRadius: 14,
    padding: 14,
  },
  stepRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  stepBadge: {
    color: "#e2e8f0",
    fontSize: 11,
    fontWeight: "700",
  },
  exitLink: {
    color: "#fde68a",
    fontSize: 12,
    fontWeight: "700",
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "800",
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderLeftWidth: 4,
    borderLeftColor: "#dc2626",
    padding: 12,
    borderRadius: 10,
  },
  errorText: {
    color: "#991b1b",
    fontSize: 12,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e6e9",
    gap: 14,
  },
  fieldGroup: { gap: 10 },
  promptQuote: {
    backgroundColor: "#f3f6f7",
    padding: 14,
    borderRadius: 12,
    fontSize: 14,
    lineHeight: 20,
    color: "#1f2f40",
    fontWeight: "600",
  },
  questionLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1f2f40",
  },
  optionBtn: {
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: "#ffffff",
  },
  optionBtnActive: {
    backgroundColor: "#567c7f",
    borderColor: "#567c7f",
  },
  optionBtnDanger: {
    backgroundColor: "#dc2626",
    borderColor: "#dc2626",
  },
  optionBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1e293b",
  },
  optionBtnTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    backgroundColor: "#ffffff",
    color: "#1e293b",
  },
  cascadeBox: {
    marginTop: 4,
    marginLeft: 8,
    paddingLeft: 12,
    borderLeftWidth: 4,
    borderLeftColor: "rgba(86,124,127,0.4)",
    gap: 10,
  },
  helperNote: {
    fontSize: 12,
    color: "#64748b",
  },
  regionInfoBox: {
    backgroundColor: "#f3f6f7",
    borderRadius: 10,
    padding: 10,
  },
  regionInfoText: {
    fontSize: 12,
    color: "#334155",
    lineHeight: 17,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  chipActive: {
    backgroundColor: "#567c7f",
    borderColor: "#567c7f",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  chipTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
  themeRowCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 8,
  },
  themeRowTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  themeRowDesc: {
    fontSize: 11,
    color: "#475569",
  },
  rankButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  rankBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
  },
  rankBtnActive: {
    backgroundColor: "#567c7f",
    borderColor: "#567c7f",
  },
  rankBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  rankBtnTextActive: {
    color: "#ffffff",
  },
  addThemeBox: {
    backgroundColor: "#f3f6f7",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#567c7f",
    gap: 8,
  },
  detailCard: {
    backgroundColor: "#f3f6f7",
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  navFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  primaryBtn: {
    backgroundColor: "#567c7f",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: "#567c7f",
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: "#567c7f",
    fontSize: 13,
    fontWeight: "700",
  },
  doneCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    gap: 16,
    alignItems: "center",
  },
  doneTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#567c7f",
    textAlign: "center",
  },
  doneSub: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
  },
  contactInviteBox: {
    backgroundColor: "#f3f1ee",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    width: "100%",
    alignItems: "center",
  },
  contactInviteText: {
    fontSize: 13,
    color: "#1f2f40",
    textAlign: "center",
    lineHeight: 19,
    fontWeight: "600",
  },
});
