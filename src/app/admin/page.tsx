"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart3,
  FileEdit,
  Download,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  CheckCircle2,
  Smartphone,
  Copy,
  Check,
  RotateCcw,
} from "lucide-react";
import { MosaproHeader } from "@/components/MosaproHeader";
import {
  DEFAULT_SURVEY_SCHEMA,
  SurveySchema,
  SurveyQuestion,
  QuestionType,
} from "@/lib/survey/default-schema";
import { REGIONES_SANITARIAS } from "@/lib/catalog/pba-municipios";
import type {
  SurveyStatsSummary,
  StoredSurveyResponse,
  StoredContactSubmission,
} from "@/lib/db/repository";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"stats" | "editor" | "export">(
    "stats"
  );
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SurveyStatsSummary | null>(null);
  const [recentResponses, setRecentResponses] = useState<StoredSurveyResponse[]>(
    []
  );
  const [recentContacts, setRecentContacts] = useState<
    StoredContactSubmission[]
  >([]);

  // Editor state
  const [schema, setSchema] = useState<SurveySchema>(DEFAULT_SURVEY_SCHEMA);
  const [savingSchema, setSavingSchema] = useState(false);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  // Add Theme inline state
  const [newThemeLabel, setNewThemeLabel] = useState("");
  const [newThemeDesc, setNewThemeDesc] = useState("");

  // Add Custom Question state
  const [targetSectionId, setTargetSectionId] = useState("S3");
  const [newQLabel, setNewQLabel] = useState("");
  const [newQHelper, setNewQHelper] = useState("");
  const [newQType, setNewQType] = useState<QuestionType>("short_text");
  const [newQRequired, setNewQRequired] = useState(false);
  const [newQOptionsText, setNewQOptionsText] = useState("");

  const [copiedRegion, setCopiedRegion] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [statsRes, surveyRes] = await Promise.all([
        fetch("/api/v1/admin/stats"),
        fetch("/api/v1/admin/survey"),
      ]);
      if (statsRes.ok) {
        const sData = await statsRes.json();
        setStats(sData.stats);
        setRecentResponses(sData.recentResponses || []);
        setRecentContacts(sData.recentContacts || []);
      }
      if (surveyRes.ok) {
        const qData = await surveyRes.json();
        if (qData.survey) setSchema(qData.survey);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSaveSchema = async () => {
    setSavingSchema(true);
    setSaveBanner(null);
    try {
      const res = await fetch("/api/v1/admin/survey", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ survey: schema }),
      });
      if (res.ok) {
        const data = await res.json();
        setSchema(data.survey);
        setSaveBanner(
          `Esquema guardado correctamente (Versión ${data.survey.version}). Ya está activo para Web y Android.`
        );
        setTimeout(() => setSaveBanner(null), 5000);
      }
    } finally {
      setSavingSchema(false);
    }
  };

  const handleResetDefaultSchema = async () => {
    if (
      !window.confirm(
        "¿Restaurar las preguntas y temáticas originales por defecto?"
      )
    ) {
      return;
    }
    setSavingSchema(true);
    try {
      const res = await fetch("/api/v1/admin/survey", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToDefault: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setSchema(data.survey);
        setSaveBanner("Se restauró el esquema original por defecto.");
      }
    } finally {
      setSavingSchema(false);
    }
  };

  const handleAddThemeToSchema = () => {
    if (!newThemeLabel.trim()) return;
    const slug =
      newThemeLabel
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "") +
      "_" +
      Date.now().toString().slice(-4);

    setSchema((prev) => ({
      ...prev,
      themes: [
        ...prev.themes,
        {
          id: slug,
          label: newThemeLabel.trim(),
          description: newThemeDesc.trim() || undefined,
          order: prev.themes.length + 1,
          active: true,
        },
      ],
    }));
    setNewThemeLabel("");
    setNewThemeDesc("");
  };

  const handleAddQuestionToSection = () => {
    if (!newQLabel.trim()) return;
    const qId = `q_custom_${Date.now()}`;
    const options =
      newQType === "single_choice" || newQType === "multi_choice"
        ? newQOptionsText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((label, idx) => ({
              value: `opt_${idx + 1}_${label
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "_")}`,
              label,
            }))
        : undefined;

    const newQuestion: SurveyQuestion = {
      id: qId,
      sectionId: targetSectionId,
      code: "Extra",
      label: newQLabel.trim(),
      helperText: newQHelper.trim() || undefined,
      type: newQType,
      required: newQRequired,
      options,
      order: 99,
      isCustom: true,
    };

    setSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) =>
        sec.id === targetSectionId
          ? { ...sec, questions: [...sec.questions, newQuestion] }
          : sec
      ),
    }));

    setNewQLabel("");
    setNewQHelper("");
    setNewQOptionsText("");
    setNewQRequired(false);
  };

  const handleCopyRegionalUrl = (code: string) => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/r/${code}`;
    navigator.clipboard.writeText(url);
    setCopiedRegion(code);
    setTimeout(() => setCopiedRegion(null), 2500);
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[#f3f6f7]">
      <MosaproHeader showAdminLink={false} />

      <main className="max-w-6xl w-full mx-auto px-4 py-8 space-y-6 flex-1">
        {/* Top Admin Header */}
        <div className="bg-[#567c7f] text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#b99e93] text-white mb-1.5">
              Equipo de Sistematización
            </span>
            <h1 className="text-2xl font-extrabold">
              Panel de Administración — Relevamiento MOSAPRO
            </h1>
            <p className="text-xs sm:text-sm text-white/90 mt-1">
              Estadísticas en tiempo real, editor dinámico de preguntas/temáticas y exportación a Excel/CSV.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>Actualizar datos</span>
            </button>
            <a
              href="/api/v1/admin/export?format=xlsx"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#b99e93] hover:bg-[#a6897d] text-white text-xs font-bold shadow-xs transition"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Excel (.xlsx)</span>
            </a>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("stats")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${
              activeTab === "stats"
                ? "bg-[#567c7f] text-white shadow-xs"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>1. Estadísticas y Respuestas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("editor")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${
              activeTab === "editor"
                ? "bg-[#567c7f] text-white shadow-xs"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <FileEdit className="w-4 h-4" />
            <span>2. Editar Preguntas y Temáticas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("export")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${
              activeTab === "export"
                ? "bg-[#567c7f] text-white shadow-xs"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>3. Exportación, Enlaces Regionales y API Android</span>
          </button>
        </div>

        {saveBanner && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl p-4 flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{saveBanner}</span>
          </div>
        )}

        {/* TAB 1: STATS & RESPONSES */}
        {activeTab === "stats" && (
          <div className="space-y-6">
            {/* Summary KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                <div className="text-xs font-bold uppercase text-slate-500">
                  Encuestas Anónimas
                </div>
                <div className="text-3xl font-black text-[#567c7f] mt-1">
                  {stats?.totalResponses ?? 0}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Sincronizadas en PostgreSQL
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                <div className="text-xs font-bold uppercase text-slate-500">
                  Inscriptos a Mesas (Contacto)
                </div>
                <div className="text-3xl font-black text-[#b99e93] mt-1">
                  {stats?.totalContacts ?? 0}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Base desvinculada (/contacto)
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                <div className="text-xs font-bold uppercase text-slate-500">
                  Interés en Mesas (Sí / Tal vez)
                </div>
                <div className="text-3xl font-black text-emerald-700 mt-1">
                  {(stats?.byInteresaMesa?.["si"] || 0) +
                    (stats?.byInteresaMesa?.["tal_vez"] || 0)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  En Sección 5.1 del relevamiento
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                <div className="text-xs font-bold uppercase text-slate-500">
                  Versión Activa del Formulario
                </div>
                <div className="text-3xl font-black text-slate-800 mt-1">
                  v{schema.version}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {schema.themes.filter((t) => t.active !== false).length} temáticas activas
                </div>
              </div>
            </div>

            {/* Theme Ranking Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
              <h2 className="text-lg font-bold text-[#567c7f] mb-1">
                Ranking de Temáticas Prioritarias (Sección 4.1)
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Puntaje ponderado (1.° lugar = 5 pts, 2.° = 4 pts, 3.° = 3 pts, 4.° = 2 pts, 5.° = 1 pt).
              </p>

              {!stats || stats.themeRankingScores.length === 0 ? (
                <div className="text-sm text-slate-500 py-6 text-center bg-slate-50 rounded-xl">
                  Todavía no hay respuestas cargadas.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#f3f6f7] text-slate-700 text-left">
                        <th className="py-2.5 px-3 font-bold">#</th>
                        <th className="py-2.5 px-3 font-bold">Temática</th>
                        <th className="py-2.5 px-3 font-bold text-center">
                          Veces en 1.° lugar
                        </th>
                        <th className="py-2.5 px-3 font-bold text-center">
                          Total menciones (Top 5)
                        </th>
                        <th className="py-2.5 px-3 font-bold text-right">
                          Puntaje Ponderado
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stats.themeRankingScores.map((row, idx) => (
                        <tr key={row.themeId}>
                          <td className="py-2.5 px-3 font-bold text-[#567c7f]">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            {row.themeLabel}
                          </td>
                          <td className="py-2.5 px-3 text-center font-semibold">
                            {row.rank1Count}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {row.top5Mentions}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-[#3f5f61]">
                            {row.weightedScore} pts
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Breakdown by Region & Main Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
                <h3 className="text-base font-bold text-[#567c7f] mb-3">
                  Respuestas por Región Sanitaria (I a XII)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {REGIONES_SANITARIAS.map((r) => {
                    const count = stats?.byRegion?.[r.code] || 0;
                    return (
                      <div
                        key={r.code}
                        className="p-3 rounded-xl bg-[#f3f6f7] border border-slate-200 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-bold text-[#567c7f]">
                            Región {r.code}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {r.sede}
                          </div>
                        </div>
                        <span className="text-lg font-black text-slate-800">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
                <h3 className="text-base font-bold text-[#567c7f]">
                  Distribución por Nivel / Espacio (Sección 1)
                </h3>
                <div className="space-y-2.5">
                  {[
                    {
                      key: "primer_nivel",
                      label: "Primer Nivel (CAPS / Unidad Sanitaria)",
                    },
                    {
                      key: "hospital",
                      label: "Segundo Nivel (Hospital Municipal / Provincial)",
                    },
                    {
                      key: "comunitario",
                      label: "Espacio u Organización Comunitaria",
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#f3f6f7] border border-slate-200"
                    >
                      <span className="text-sm font-medium text-slate-800">
                        {item.label}
                      </span>
                      <span className="text-lg font-black text-[#567c7f]">
                        {stats?.byMainLocation?.[item.key] || 0}
                      </span>
                    </div>
                  ))}
                </div>

                {stats && stats.customThemesSubmitted.length > 0 && (
                  <div className="pt-3 border-t border-slate-100">
                    <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">
                      Temáticas agregadas en botón «Otra» (Sección 4.1)
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {stats.customThemesSubmitted.map((ct, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-lg bg-[#f3f1ee] text-xs"
                        >
                          <div className="font-bold text-slate-900">
                            {ct.title}{" "}
                            <span className="font-normal text-slate-500">
                              ({ct.municipio}, Reg. {ct.region})
                            </span>
                          </div>
                          <div className="text-slate-700 mt-0.5">
                            {ct.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Responses Viewer */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
              <h3 className="text-base font-bold text-[#567c7f] mb-3">
                Últimas respuestas abiertas recibidas (Problemas y Propuestas)
              </h3>
              {recentResponses.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No hay respuestas registradas aún.
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {recentResponses.slice(0, 15).map((r) => {
                    const p1 = r.payload.section4?.priorities?.find(
                      (x) => x.rank === 1
                    );
                    return (
                      <div
                        key={r.id}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-slate-800">
                          <span>
                            #{r.id} · Región {r.regionSanitaria} ({r.municipio}) ·{" "}
                            {r.mainLocation}
                          </span>
                          <span className="text-slate-500 font-normal">
                            Plataforma: {r.sourcePlatform}
                          </span>
                        </div>
                        {p1 && (
                          <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                            <div className="font-bold text-[#567c7f]">
                              1.° Prioridad: {p1.themeLabel}
                            </div>
                            <div>
                              <strong>Problema:</strong>{" "}
                              {r.payload.section4?.rank1Detail?.problema}
                            </div>
                            <div>
                              <strong>Propuesta:</strong>{" "}
                              {r.payload.section4?.rank1Detail?.propuesta}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: QUESTION & THEME EDITOR (S9) */}
        {activeTab === "editor" && (
          <div className="space-y-6">
            {/* General Texts */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#567c7f]">
                  Encabezado y Mensaje Final del Formulario
                </h2>
                <button
                  type="button"
                  onClick={handleResetDefaultSchema}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar valores de fábrica</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Título del Relevamiento
                  </label>
                  <input
                    type="text"
                    value={schema.title}
                    onChange={(e) =>
                      setSchema({ ...schema, title: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Subtítulo
                  </label>
                  <input
                    type="text"
                    value={schema.subtitle}
                    onChange={(e) =>
                      setSchema({ ...schema, subtitle: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mensaje Final (antes del botón al formulario de contacto)
                </label>
                <textarea
                  rows={2}
                  value={schema.finalMessage}
                  onChange={(e) =>
                    setSchema({ ...schema, finalMessage: e.target.value })
                  }
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
            </div>

            {/* Themes List Editor */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
              <h2 className="text-lg font-bold text-[#567c7f]">
                Listado de Temáticas Prioritarias (Sección 4 y 5)
              </h2>
              <p className="text-xs text-slate-600">
                Podés editar el nombre de cualquier temática, desactivarla o sumar nuevas temáticas al listado general.
              </p>

              <div className="space-y-2">
                {schema.themes.map((th, idx) => (
                  <div
                    key={th.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50"
                  >
                    <span className="text-xs font-bold text-[#567c7f] w-7">
                      #{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={th.label}
                      onChange={(e) => {
                        const next = [...schema.themes];
                        next[idx] = { ...th, label: e.target.value };
                        setSchema({ ...schema, themes: next });
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm"
                    />
                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={th.active !== false}
                        onChange={(e) => {
                          const next = [...schema.themes];
                          next[idx] = { ...th, active: e.target.checked };
                          setSchema({ ...schema, themes: next });
                        }}
                        className="accent-[#567c7f]"
                      />
                      <span>Activa</span>
                    </label>
                  </div>
                ))}
              </div>

              {/* Add new theme */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newThemeLabel}
                  onChange={(e) => setNewThemeLabel(e.target.value)}
                  placeholder="Nueva temática para agregar al listado..."
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
                <input
                  type="text"
                  value={newThemeDesc}
                  onChange={(e) => setNewThemeDesc(e.target.value)}
                  placeholder="Descripción breve (opcional)"
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddThemeToSchema}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#567c7f] hover:bg-[#4f7478] text-white text-xs font-bold transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Sumar temática</span>
                </button>
              </div>
            </div>

            {/* Edit Existing Questions & Add New Custom Question */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              <h2 className="text-lg font-bold text-[#567c7f]">
                Preguntas por Sección (Editar o Agregar nuevas)
              </h2>

              <div className="space-y-4">
                {schema.sections.map((sec, sIdx) => (
                  <div
                    key={sec.id}
                    className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/50"
                  >
                    <div className="font-bold text-sm text-[#3f5f61]">
                      {sec.title}
                    </div>
                    <div className="space-y-2">
                      {sec.questions.map((q, qIdx) => (
                        <div
                          key={q.id}
                          className="flex items-start gap-2 bg-white p-3 rounded-lg border border-slate-200"
                        >
                          <span className="text-xs font-bold text-[#567c7f] mt-2 min-w-[40px]">
                            {q.code}
                          </span>
                          <div className="flex-1 space-y-1.5">
                            <input
                              type="text"
                              value={q.label}
                              onChange={(e) => {
                                const nextSections = [...schema.sections];
                                const nextQs = [...sec.questions];
                                nextQs[qIdx] = { ...q, label: e.target.value };
                                nextSections[sIdx] = {
                                  ...sec,
                                  questions: nextQs,
                                };
                                setSchema({ ...schema, sections: nextSections });
                              }}
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-medium"
                            />
                            {q.options && q.options.length > 0 && (
                              <div className="text-[11px] text-slate-500">
                                Opciones:{" "}
                                {q.options.map((o) => o.label).join(" · ")}
                              </div>
                            )}
                          </div>
                          {q.isCustom && (
                            <button
                              type="button"
                              onClick={() => {
                                const nextSections = [...schema.sections];
                                nextSections[sIdx] = {
                                  ...sec,
                                  questions: sec.questions.filter(
                                    (item) => item.id !== q.id
                                  ),
                                };
                                setSchema({ ...schema, sections: nextSections });
                              }}
                              className="text-red-600 hover:text-red-800 p-1.5 cursor-pointer"
                              title="Eliminar pregunta agregada"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Question Form */}
              <div className="rounded-xl border-2 border-[#567c7f] bg-[#f3f6f7] p-5 space-y-4">
                <h3 className="text-sm font-bold text-[#3f5f61]">
                  + Agregar una nueva pregunta al relevamiento
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Sección destino
                    </label>
                    <select
                      value={targetSectionId}
                      onChange={(e) => setTargetSectionId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                    >
                      {schema.sections.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Modalidad / Tipo de respuesta
                    </label>
                    <select
                      value={newQType}
                      onChange={(e) =>
                        setNewQType(e.target.value as QuestionType)
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                    >
                      <option value="short_text">Respuesta breve (texto corto)</option>
                      <option value="long_text">Respuesta abierta (párrafo)</option>
                      <option value="single_choice">Opción única (botones)</option>
                      <option value="multi_choice">Casillas múltiples</option>
                    </select>
                  </div>

                  <div className="flex items-end pb-2">
                    <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newQRequired}
                        onChange={(e) => setNewQRequired(e.target.checked)}
                        className="w-4 h-4 accent-[#567c7f]"
                      />
                      <span>Pregunta obligatoria</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Enunciado de la pregunta
                  </label>
                  <input
                    type="text"
                    value={newQLabel}
                    onChange={(e) => setNewQLabel(e.target.value)}
                    placeholder="Escribí el texto de la nueva pregunta..."
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                  />
                </div>

                {(newQType === "single_choice" ||
                  newQType === "multi_choice") && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Opciones separadas por coma
                    </label>
                    <input
                      type="text"
                      value={newQOptionsText}
                      onChange={(e) => setNewQOptionsText(e.target.value)}
                      placeholder="Ej. Sí, No, En proceso"
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                    />
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddQuestionToSection}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#567c7f] hover:bg-[#4f7478] text-white text-xs font-bold transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar pregunta a la sección</span>
                  </button>
                </div>
              </div>

              {/* Save All Changes CTA */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={savingSchema}
                  onClick={handleSaveSchema}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#567c7f] hover:bg-[#4f7478] text-white font-bold text-sm shadow-md transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {savingSchema
                      ? "Publicando cambios..."
                      : "Guardar y publicar cambios del formulario"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: EXPORT, REGIONAL LINKS & ANDROID API */}
        {activeTab === "export" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
              <h2 className="text-lg font-bold text-[#567c7f]">
                Exportación para Sistematización y Codificación
              </h2>
              <p className="text-xs text-slate-600">
                Descargá la base completa para trabajar en Excel, R, SPSS o Google Sheets. El archivo Excel incluye dos pestañas separadas: <strong>Relevamiento_Anonimo</strong> y <strong>Contactos_Mesas</strong>.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="/api/v1/admin/export?format=xlsx"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#567c7f] hover:bg-[#4f7478] text-white font-bold text-sm shadow-xs transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Libro Excel Completo (.xlsx)</span>
                </a>
                <a
                  href="/api/v1/admin/export?format=csv"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-[#567c7f] text-[#567c7f] hover:bg-[#f3f6f7] font-bold text-sm transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Respuestas en CSV (.csv)</span>
                </a>
              </div>
            </div>

            {/* Regional Links Generator (S6) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
              <h2 className="text-lg font-bold text-[#567c7f]">
                Enlaces Regionales con Región Sanitaria Precargada (Sección 3.1)
              </h2>
              <p className="text-xs text-slate-600">
                Compartí el enlace de cada Región Sanitaria por WhatsApp o redes: al abrirlo, la Región Sanitaria ya viene seleccionada y el buscador de municipios se filtra automáticamente.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {REGIONES_SANITARIAS.map((r) => (
                  <div
                    key={r.code}
                    className="p-3.5 rounded-xl border border-slate-200 bg-[#f3f6f7] flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-xs font-bold text-[#3f5f61]">
                        {r.name} ({r.sede})
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        /r/{r.code}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyRegionalUrl(r.code)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:border-[#567c7f] text-xs font-semibold text-slate-700 cursor-pointer"
                    >
                      {copiedRegion === r.code ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar link</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Android Phase 2 API Readiness */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-3">
              <h2 className="text-lg font-bold text-[#567c7f]">
                Endpoints REST API v1 listos para la App Android (Fase 2)
              </h2>
              <p className="text-xs text-slate-600">
                El backend ya está preparado con CORS, versionado de esquema e idempotencia por UUID (`clientSubmissionId`) para que la aplicación Android sincronice lotes offline sin duplicar registros:
              </p>
              <div className="space-y-2 text-xs font-mono bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto">
                <div>
                  <span className="text-emerald-400 font-bold">GET</span>{" "}
                  /api/v1/survey → Descarga esquema activo (v{schema.version}), preguntas, temáticas y catálogo de 135 municipios PBA.
                </div>
                <div>
                  <span className="text-amber-400 font-bold">POST</span>{" "}
                  /api/v1/sync/responses → Sincroniza lote offline de encuestas anónimas (`items: SurveySubmissionPayload[]`).
                </div>
                <div>
                  <span className="text-amber-400 font-bold">POST</span>{" "}
                  /api/v1/sync/contacts → Sincroniza lote offline de contactos desvinculados (`items: ContactSubmissionPayload[]`).
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
