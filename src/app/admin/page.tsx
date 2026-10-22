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
  Users,
  Lock,
  UserPlus,
  LogOut,
  ShieldCheck,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { MosaproHeader } from "@/components/MosaproHeader";
import {
  DEFAULT_SURVEY_SCHEMA,
  SurveySchema,
  SurveyQuestion,
  QuestionType,
  QuestionOption,
} from "@/lib/survey/default-schema";
import { REGIONES_SANITARIAS } from "@/lib/catalog/pba-municipios";
import type {
  SurveyStatsSummary,
  StoredSurveyResponse,
  StoredContactSubmission,
} from "@/lib/db/repository";
import type { MosaproUser } from "@/lib/auth/auth";

export default function AdminPage() {
  // Auth state
  const [authChecking, setAuthChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState<MosaproUser | null>(null);
  const [hasAnyUsers, setHasAnyUsers] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authNombre, setAuthNombre] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Admin Tabs
  const [activeTab, setActiveTab] = useState<
    "stats" | "editor" | "users" | "export"
  >("stats");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<SurveyStatsSummary | null>(null);
  const [recentResponses, setRecentResponses] = useState<StoredSurveyResponse[]>(
    []
  );
  const [recentContacts, setRecentContacts] = useState<
    StoredContactSubmission[]
  >([]);
  const [usersList, setUsersList] = useState<MosaproUser[]>([]);

  // Editor state
  const [schema, setSchema] = useState<SurveySchema>(DEFAULT_SURVEY_SCHEMA);
  const [savingSchema, setSavingSchema] = useState(false);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(
    null
  );
  const [newOptionLabelByQuestion, setNewOptionLabelByQuestion] = useState<
    Record<string, string>
  >({});

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

  const checkSessionAndLoad = async () => {
    setAuthChecking(true);
    try {
      const meRes = await fetch("/api/v1/auth/me");
      if (meRes.ok) {
        const meData = await meRes.json();
        setHasAnyUsers(Boolean(meData.hasAnyUsers));
        if (!meData.hasAnyUsers) {
          setAuthMode("register");
        }
        if (meData.authenticated && meData.user) {
          setCurrentUser(meData.user);
          await loadAdminData();
        } else {
          setCurrentUser(null);
        }
      }
    } finally {
      setAuthChecking(false);
    }
  };

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, surveyRes, usersRes] = await Promise.all([
        fetch("/api/v1/admin/stats"),
        fetch("/api/v1/admin/survey"),
        fetch("/api/v1/admin/users"),
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
      if (usersRes.ok) {
        const uData = await usersRes.json();
        setUsersList(uData.users || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSessionAndLoad();
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthNotice(null);
    setAuthSubmitting(true);

    try {
      const endpoint =
        authMode === "register"
          ? "/api/v1/auth/register"
          : "/api/v1/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: authEmail,
          password: authPassword,
          nombre: authNombre,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setAuthError(data.error || "No se pudo autenticar.");
        return;
      }

      if (authMode === "register") {
        if (data.user?.isValidated) {
          setCurrentUser(data.user);
          await loadAdminData();
        } else {
          setAuthNotice(
            data.message ||
              "Tu usuario fue creado y está pendiente de validación por un administrador."
          );
          setAuthMode("login");
          setAuthPassword("");
        }
      } else {
        setCurrentUser(data.user);
        await loadAdminData();
      }
    } catch {
      setAuthError("Error de conexión con el servidor.");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    setCurrentUser(null);
    setAuthPassword("");
  };

  const handleToggleUserValidation = async (
    u: MosaproUser,
    nextVal: boolean
  ) => {
    const res = await fetch("/api/v1/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.id, isValidated: nextVal }),
    });
    if (res.ok) {
      await loadAdminData();
    }
  };

  const handleToggleUserRole = async (
    u: MosaproUser,
    nextRole: "admin" | "user"
  ) => {
    const res = await fetch("/api/v1/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: u.id,
        isValidated: u.isValidated,
        role: nextRole,
      }),
    });
    if (res.ok) {
      await loadAdminData();
    }
  };

  const handleDeleteUser = async (u: MosaproUser) => {
    if (!window.confirm(`¿Eliminar el usuario ${u.email}?`)) return;
    const res = await fetch(`/api/v1/admin/users?userId=${u.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await loadAdminData();
    }
  };

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

  const updateQuestionInSection = (
    sectionIdx: number,
    questionIdx: number,
    updater: (q: SurveyQuestion) => SurveyQuestion
  ) => {
    setSchema((prev) => {
      const nextSections = [...prev.sections];
      const sec = nextSections[sectionIdx];
      const nextQs = [...sec.questions];
      nextQs[questionIdx] = updater(nextQs[questionIdx]);
      nextSections[sectionIdx] = { ...sec, questions: nextQs };
      return { ...prev, sections: nextSections };
    });
  };

  const handleAddQuestionToSection = () => {
    if (!newQLabel.trim()) return;
    const qId = `q_custom_${Date.now()}`;
    const options: QuestionOption[] | undefined =
      newQType === "single_choice" || newQType === "multi_choice"
        ? newQOptionsText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((label, idx) => ({
              value: `opt_${idx + 1}_${label
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
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

  // Loading auth state
  if (authChecking) {
    return (
      <div className="min-h-dvh flex flex-col bg-[#f3f6f7]">
        <MosaproHeader showAdminLink={false} />
        <div className="max-w-md mx-auto my-20 px-4 text-center text-slate-600 text-sm">
          Verificando acceso al panel de administración...
        </div>
      </div>
    );
  }

  // Unauthenticated Screen: Login / Register Gate (S11)
  if (!currentUser) {
    return (
      <div className="min-h-dvh flex flex-col bg-[#f3f6f7]">
        <MosaproHeader showAdminLink={false} />

        <main className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
            <div className="bg-[#567c7f] text-white p-6 text-center space-y-2">
              <img
                src="/logo-mosapro.png"
                alt="MOSAPRO"
                className="w-16 h-16 mx-auto object-contain bg-white/10 rounded-full p-1"
              />
              <h1 className="text-xl font-extrabold">
                Panel de Administración — MOSAPRO
              </h1>
              <p className="text-xs text-white/90">
                {!hasAnyUsers
                  ? "Todavía no hay usuarios registrados. El primer usuario que registres será Administrador validado automáticamente."
                  : authMode === "login"
                  ? "Ingresá con tu correo y contraseña validada."
                  : "Registrá tu cuenta. Luego deberá ser validada por un Administrador."}
              </p>
            </div>

            <div className="p-6 space-y-5">
              {/* Toggle Login / Register */}
              <div className="grid grid-cols-2 gap-2 bg-[#f3f6f7] p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setAuthError(null);
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    authMode === "login"
                      ? "bg-[#567c7f] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Iniciar Sesión</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("register");
                    setAuthError(null);
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    authMode === "register"
                      ? "bg-[#567c7f] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Registrar Usuario</span>
                </button>
              </div>

              {!hasAnyUsers && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>Primer registro del sistema:</strong> esta primera cuenta se activará automáticamente como <strong>Administrador principal</strong> y podrá validar a los demás usuarios.
                  </span>
                </div>
              )}

              {authError && (
                <div className="bg-red-50 border-l-4 border-red-600 p-3.5 rounded-r-xl text-xs text-red-700 flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              {authNotice && (
                <div className="bg-emerald-50 border-l-4 border-emerald-600 p-3.5 rounded-r-xl text-xs text-emerald-800 flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{authNotice}</span>
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authMode === "register" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nombre y Apellido
                    </label>
                    <input
                      type="text"
                      required
                      value={authNombre}
                      onChange={(e) => setAuthNombre(e.target.value)}
                      placeholder="Tu nombre y apellido"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#567c7f] outline-none text-sm"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="usuario@mosapro.com.ar"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#567c7f] outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#567c7f] outline-none text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="w-full py-3 rounded-xl bg-[#567c7f] hover:bg-[#4f7478] disabled:opacity-60 text-white font-bold text-sm shadow-sm transition cursor-pointer"
                >
                  {authSubmitting
                    ? "Procesando..."
                    : authMode === "register"
                    ? !hasAnyUsers
                      ? "Crear Primer Usuario Administrador"
                      : "Solicitar Registro de Usuario"
                    : "Ingresar al Panel"}
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const pendingUsersCount = usersList.filter((u) => !u.isValidated).length;

  return (
    <div className="min-h-dvh flex flex-col bg-[#f3f6f7]">
      <MosaproHeader showAdminLink={false} />

      <main className="max-w-6xl w-full mx-auto px-4 py-8 space-y-6 flex-1">
        {/* Top Admin Header */}
        <div className="bg-[#567c7f] text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#b99e93] text-white">
                {currentUser.role === "admin"
                  ? "Administrador Principal"
                  : "Equipo de Sistematización"}
              </span>
              <span className="text-xs text-white/85">
                Sesión: <strong>{currentUser.email}</strong>
              </span>
            </div>
            <h1 className="text-2xl font-extrabold">
              Panel de Administración — Relevamiento MOSAPRO
            </h1>
            <p className="text-xs sm:text-sm text-white/90 mt-1">
              Estadísticas en tiempo real, editor completo de preguntas/opciones/modalidad, gestión de usuarios y exportación Excel/CSV.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadAdminData}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition cursor-pointer"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              <span>Actualizar</span>
            </button>
            <a
              href="/api/v1/admin/export?format=xlsx"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#b99e93] hover:bg-[#a6897d] text-white text-xs font-bold shadow-xs transition"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Excel (.xlsx)</span>
            </a>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-900/40 hover:bg-red-900/60 text-white text-xs font-bold transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Salir</span>
            </button>
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
            <span>2. Editar Preguntas, Opciones y Modalidad</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${
              activeTab === "users"
                ? "bg-[#567c7f] text-white shadow-xs"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>3. Usuarios y Validación</span>
            {pendingUsersCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500 text-white font-black">
                {pendingUsersCount}
              </span>
            )}
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
            <span>4. Exportación, Enlaces y API Android</span>
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
                  {schema.themes.filter((t) => t.active !== false).length}{" "}
                  temáticas activas
                </div>
              </div>
            </div>

            {/* Theme Ranking Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
              <h2 className="text-lg font-bold text-[#567c7f] mb-1">
                Ranking de Temáticas Prioritarias (Sección 4.1)
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Puntaje ponderado (1.° lugar = 5 pts, 2.° = 4 pts, 3.° = 3 pts,
                4.° = 2 pts, 5.° = 1 pt).
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
                      label:
                        "Segundo Nivel (Hospital Nacional / Provincial / Municipal)",
                    },
                    {
                      key: "comunitario",
                      label: "Espacio u Organización Comunitaria",
                    },
                    {
                      key: "gestion_sanitaria",
                      label:
                        "Gestión Sanitaria (Nacional / Provincial / Municipal)",
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
              </div>
            </div>

            {/* Recent Responses Viewer */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
              <h3 className="text-base font-bold text-[#567c7f] mb-3">
                Últimas respuestas recibidas (Completas y En curso)
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
                            #{r.id} · Región {r.regionSanitaria || "S/D"} (
                            {r.municipio || "Sin municipio"}) ·{" "}
                            {r.mainLocation || "En inicio"}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              r.isComplete
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {r.isComplete
                              ? "Completa"
                              : `En curso (${r.currentStep})`}
                          </span>
                        </div>
                        {p1 && (
                          <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                            <div className="font-bold text-[#567c7f]">
                              1.° Prioridad: {p1.themeLabel}
                            </div>
                            {r.payload.section4?.rank1Detail?.problema && (
                              <div>
                                <strong>Problema:</strong>{" "}
                                {r.payload.section4?.rank1Detail?.problema}
                              </div>
                            )}
                            {r.payload.section4?.rank1Detail?.propuesta && (
                              <div>
                                <strong>Propuesta:</strong>{" "}
                                {r.payload.section4?.rank1Detail?.propuesta}
                              </div>
                            )}
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

        {/* TAB 2: QUESTION, OPTIONS & MODALITY EDITOR (S9) */}
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

            {/* Edit Questions, Options & Modality per Section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[#567c7f]">
                  Editor de Preguntas, Opciones y Modalidad por Sección
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  En cada pregunta podés editar el enunciado, cambiar su modalidad (<strong>Opción única</strong>, <strong>Múltiples opciones</strong>, <strong>Campo de texto breve</strong> o <strong>Texto libre largo</strong>) y editar, agregar o quitar sus opciones.
                </p>
              </div>

              <div className="space-y-5">
                {schema.sections.map((sec, sIdx) => (
                  <div
                    key={sec.id}
                    className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/60"
                  >
                    <div className="font-bold text-sm text-[#3f5f61]">
                      {sec.title}
                    </div>
                    <div className="space-y-3">
                      {sec.questions.map((q, qIdx) => {
                        const isExpanded = expandedQuestionId === q.id;
                        const canSwitchType = ![
                          "consent",
                          "region_select",
                          "municipio_autocomplete",
                          "priority_grid",
                          "priority_detail_pair",
                        ].includes(q.type);
                        const supportsOptions =
                          q.type === "single_choice" ||
                          q.type === "multi_choice" ||
                          q.type === "service_combobox";

                        return (
                          <div
                            key={q.id}
                            className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3 shadow-2xs"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                              <span className="text-xs font-bold text-[#567c7f] min-w-[44px]">
                                {q.code}
                              </span>
                              <input
                                type="text"
                                value={q.label}
                                onChange={(e) =>
                                  updateQuestionInSection(
                                    sIdx,
                                    qIdx,
                                    (curr) => ({
                                      ...curr,
                                      label: e.target.value,
                                    })
                                  )
                                }
                                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-medium"
                              />

                              {canSwitchType && (
                                <select
                                  value={q.type}
                                  onChange={(e) => {
                                    const nextType = e.target
                                      .value as QuestionType;
                                    updateQuestionInSection(
                                      sIdx,
                                      qIdx,
                                      (curr) => ({
                                        ...curr,
                                        type: nextType,
                                        options:
                                          (nextType === "single_choice" ||
                                            nextType === "multi_choice") &&
                                          (!curr.options ||
                                            curr.options.length === 0)
                                            ? [
                                                {
                                                  value: "opcion_1",
                                                  label: "Opción 1",
                                                },
                                                {
                                                  value: "opcion_2",
                                                  label: "Opción 2",
                                                },
                                              ]
                                            : curr.options,
                                      })
                                    );
                                    if (
                                      nextType === "single_choice" ||
                                      nextType === "multi_choice"
                                    ) {
                                      setExpandedQuestionId(q.id);
                                    }
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg border border-[#567c7f]/40 bg-[#f3f6f7] text-xs font-bold text-[#3f5f61]"
                                  title="Cambiar modalidad de la pregunta"
                                >
                                  <option value="single_choice">
                                    Opción única
                                  </option>
                                  <option value="multi_choice">
                                    Múltiples opciones
                                  </option>
                                  <option value="short_text">
                                    Campo libre breve
                                  </option>
                                  <option value="long_text">
                                    Campo libre párrafo
                                  </option>
                                  {q.id === "q_2b_area_servicio" && (
                                    <option value="service_combobox">
                                      Combobox Servicios + Libre
                                    </option>
                                  )}
                                </select>
                              )}

                              {supportsOptions && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedQuestionId(
                                      isExpanded ? null : q.id
                                    )
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 hover:border-[#567c7f] text-xs font-semibold text-slate-700 cursor-pointer"
                                >
                                  <span>
                                    Opciones ({(q.options || []).length})
                                  </span>
                                  {isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}

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
                                    setSchema({
                                      ...schema,
                                      sections: nextSections,
                                    });
                                  }}
                                  className="text-red-600 hover:text-red-800 p-1.5 cursor-pointer"
                                  title="Eliminar pregunta agregada"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>

                            {/* Expanded Options Editor for this question */}
                            {supportsOptions && isExpanded && (
                              <div className="bg-[#f3f6f7] rounded-xl p-3.5 border border-slate-200 space-y-2.5">
                                <div className="text-xs font-bold text-[#3f5f61]">
                                  Editar opciones de respuesta:
                                </div>
                                <div className="space-y-2">
                                  {(q.options || []).map((opt, optIdx) => (
                                    <div
                                      key={`${opt.value}_${optIdx}`}
                                      className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-white p-2 rounded-lg border border-slate-200"
                                    >
                                      <input
                                        type="text"
                                        value={opt.label}
                                        onChange={(e) => {
                                          updateQuestionInSection(
                                            sIdx,
                                            qIdx,
                                            (curr) => {
                                              const nextOpts = [
                                                ...(curr.options || []),
                                              ];
                                              nextOpts[optIdx] = {
                                                ...opt,
                                                label: e.target.value,
                                              };
                                              return {
                                                ...curr,
                                                options: nextOpts,
                                              };
                                            }
                                          );
                                        }}
                                        className="flex-1 px-2.5 py-1 rounded border border-slate-300 text-xs"
                                      />
                                      <label className="inline-flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer whitespace-nowrap">
                                        <input
                                          type="checkbox"
                                          checked={Boolean(opt.requiresSpecify)}
                                          onChange={(e) => {
                                            updateQuestionInSection(
                                              sIdx,
                                              qIdx,
                                              (curr) => {
                                                const nextOpts = [
                                                  ...(curr.options || []),
                                                ];
                                                nextOpts[optIdx] = {
                                                  ...opt,
                                                  requiresSpecify:
                                                    e.target.checked,
                                                };
                                                return {
                                                  ...curr,
                                                  options: nextOpts,
                                                };
                                              }
                                            );
                                          }}
                                          className="accent-[#567c7f]"
                                        />
                                        <span>Pide «¿Cuál?»</span>
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          updateQuestionInSection(
                                            sIdx,
                                            qIdx,
                                            (curr) => ({
                                              ...curr,
                                              options: (
                                                curr.options || []
                                              ).filter(
                                                (_, i) => i !== optIdx
                                              ),
                                            })
                                          );
                                        }}
                                        className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                                        title="Quitar opción"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>

                                {/* Add new option to this question */}
                                <div className="flex items-center gap-2 pt-1">
                                  <input
                                    type="text"
                                    value={
                                      newOptionLabelByQuestion[q.id] || ""
                                    }
                                    onChange={(e) =>
                                      setNewOptionLabelByQuestion((prev) => ({
                                        ...prev,
                                        [q.id]: e.target.value,
                                      }))
                                    }
                                    placeholder="Nueva opción..."
                                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const raw = (
                                        newOptionLabelByQuestion[q.id] || ""
                                      ).trim();
                                      if (!raw) return;
                                      const valSlug =
                                        raw
                                          .toLowerCase()
                                          .normalize("NFD")
                                          .replace(/[\u0300-\u036f]/g, "")
                                          .replace(/[^a-z0-9]+/g, "_")
                                          .replace(/^_|_$/g, "") ||
                                        `opt_${Date.now()}`;
                                      updateQuestionInSection(
                                        sIdx,
                                        qIdx,
                                        (curr) => ({
                                          ...curr,
                                          options: [
                                            ...(curr.options || []),
                                            {
                                              value: valSlug,
                                              label: raw,
                                              requiresSpecify:
                                                valSlug === "otra" ||
                                                valSlug === "otro",
                                            },
                                          ],
                                        })
                                      );
                                      setNewOptionLabelByQuestion((prev) => ({
                                        ...prev,
                                        [q.id]: "",
                                      }));
                                    }}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#567c7f] text-white text-xs font-bold cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Agregar opción</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
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
                      <option value="short_text">
                        Respuesta breve (texto corto)
                      </option>
                      <option value="long_text">
                        Respuesta abierta (párrafo)
                      </option>
                      <option value="single_choice">
                        Opción única (botones)
                      </option>
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

        {/* TAB 3: USERS & VALIDATION (S11) */}
        {activeTab === "users" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#567c7f]">
                Gestión y Validación de Usuarios del Panel
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                El primer usuario registrado es Administrador validado. Todo nuevo usuario que se registra queda en estado <strong>Pendiente</strong> hasta que un Administrador lo valide aquí.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#f3f6f7] text-slate-700 text-left">
                    <th className="py-2.5 px-3 font-bold">Nombre</th>
                    <th className="py-2.5 px-3 font-bold">Email</th>
                    <th className="py-2.5 px-3 font-bold">Rol</th>
                    <th className="py-2.5 px-3 font-bold">Estado</th>
                    <th className="py-2.5 px-3 font-bold text-right">
                      Acciones (Solo Admin)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usersList.map((u) => (
                    <tr key={u.id}>
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {u.nombre}
                      </td>
                      <td className="py-3 px-3 text-slate-700">{u.email}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            u.role === "admin"
                              ? "bg-[#567c7f]/15 text-[#3f5f61]"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {u.role === "admin" ? "Administrador" : "Colaborador"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {u.isValidated ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Validado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                            Pendiente de aprobación
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right space-x-2">
                        {currentUser.role === "admin" && (
                          <>
                            {!u.isValidated ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleUserValidation(u, true)
                                }
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                              >
                                Validar acceso
                              </button>
                            ) : (
                              u.id !== currentUser.id && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleUserValidation(u, false)
                                  }
                                  className="px-3 py-1.5 rounded-lg border border-amber-600 text-amber-700 hover:bg-amber-50 text-xs font-bold cursor-pointer"
                                >
                                  Suspender
                                </button>
                              )
                            )}

                            {u.id !== currentUser.id && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleUserRole(
                                    u,
                                    u.role === "admin" ? "user" : "admin"
                                  )
                                }
                                className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                              >
                                {u.role === "admin"
                                  ? "Pasar a Colaborador"
                                  : "Hacer Admin"}
                              </button>
                            )}

                            {u.id !== currentUser.id && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u)}
                                className="text-red-600 hover:text-red-800 p-1.5 cursor-pointer"
                                title="Eliminar usuario"
                              >
                                <Trash2 className="w-4 h-4 inline" />
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: EXPORT, REGIONAL LINKS & ANDROID API */}
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

            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-3">
              <h2 className="text-lg font-bold text-[#567c7f]">
                Endpoints REST API v1 listos para la App Android (Fase 2)
              </h2>
              <p className="text-xs text-slate-600">
                El backend ya está preparado con CORS, versionado de esquema e idempotencia/upsert progresivo por UUID (`clientSubmissionId`):
              </p>
              <div className="space-y-2 text-xs font-mono bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto">
                <div>
                  <span className="text-emerald-400 font-bold">GET</span>{" "}
                  /api/v1/survey → Descarga esquema activo (v{schema.version}),
                  preguntas, opciones, temáticas y catálogo de 135 municipios PBA.
                </div>
                <div>
                  <span className="text-amber-400 font-bold">POST</span>{" "}
                  /api/v1/sync/responses → Sincroniza/actualiza lote de encuestas
                  anónimas (completas o en curso paso a paso).
                </div>
                <div>
                  <span className="text-amber-400 font-bold">POST</span>{" "}
                  /api/v1/sync/contacts → Sincroniza lote offline de contactos
                  desvinculados.
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
