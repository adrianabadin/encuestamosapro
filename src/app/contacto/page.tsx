"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  CloudOff,
  Send,
} from "lucide-react";
import { MosaproHeader } from "@/components/MosaproHeader";
import { MunicipioAutocomplete } from "@/components/MunicipioAutocomplete";
import {
  REGIONES_SANITARIAS,
  normalizeRegionCode,
} from "@/lib/catalog/pba-municipios";
import { DEFAULT_THEMES, SurveyTheme } from "@/lib/survey/default-schema";
import { validateContactSubmission } from "@/lib/survey/validator";
import {
  enqueueOfflineContact,
  flushOfflineQueues,
  getCachedSurveySchema,
} from "@/lib/offline/sync-queue";

function ContactFormContent() {
  const searchParams = useSearchParams();
  const [themes, setThemes] = useState<SurveyTheme[]>(DEFAULT_THEMES);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [regionSanitaria, setRegionSanitaria] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [organizacionOEspacio, setOrganizacionOEspacio] = useState("");
  const [tematicasInteres, setTematicasInteres] = useState<string[]>([]);
  const [ofreceReferente, setOfreceReferente] = useState(false);
  const [horarios, setHorarios] = useState<string[]>([]);
  const [modalidad, setModalidad] = useState("mixta");
  const [comentarios, setComentarios] = useState("");

  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [doneState, setDoneState] = useState<{
    done: boolean;
    savedOffline: boolean;
  }>({ done: false, savedOffline: false });

  useEffect(() => {
    const cached = getCachedSurveySchema();
    if (cached?.themes?.length) {
      setThemes(cached.themes.filter((t) => t.active !== false));
    }
    const r = normalizeRegionCode(searchParams.get("region"));
    if (r) setRegionSanitaria(r);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const uuid =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `cnt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const payload = {
      clientSubmissionId: uuid,
      createdAtClient: new Date().toISOString(),
      sourcePlatform: "web" as const,
      nombre,
      telefono,
      email,
      regionSanitaria,
      municipio,
      organizacionOEspacio,
      tematicasInteres,
      ofreceReferente,
      horarios,
      modalidad,
      comentarios,
    };

    const validation = validateContactSubmission(payload);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    setErrors([]);
    try {
      await enqueueOfflineContact(payload);
      window.dispatchEvent(new Event("mosapro-queue-updated"));
      const flushRes = await flushOfflineQueues();
      window.dispatchEvent(new Event("mosapro-queue-updated"));

      setDoneState({
        done: true,
        savedOffline: flushRes.remainingContacts > 0,
      });
    } catch {
      setErrors(["No se pudo registrar el contacto. Intentá nuevamente."]);
    } finally {
      setSubmitting(false);
    }
  };

  if (doneState.done) {
    return (
      <div className="max-w-2xl mx-auto my-10 px-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-[#567c7f] mx-auto" />
          <h2 className="text-2xl font-extrabold text-[#1f2f40]">
            ¡Tus datos de contacto fueron registrados!
          </h2>
          {doneState.savedOffline ? (
            <p className="inline-flex items-center gap-1.5 text-xs bg-amber-100 text-amber-900 px-3 py-1.5 rounded-full font-semibold">
              <CloudOff className="w-4 h-4" />
              Guardado en modo offline: se enviará apenas el dispositivo tenga conexión.
            </p>
          ) : (
            <p className="text-sm text-slate-600">
              El equipo del MOSAPRO te convocará para las mesas de trabajo de tu región.
            </p>
          )}
          <div className="pt-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#567c7f] hover:bg-[#4f7478] text-white font-semibold text-sm transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al inicio</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto my-8 px-4 pb-16">
      <div className="bg-[#567c7f] text-white rounded-2xl p-6 sm:p-8 shadow-md mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-bold mb-3">
          <ShieldCheck className="w-4 h-4" />
          <span>Formulario independiente — No se vincula con tus respuestas</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold">
          Inscripción a Mesas de Trabajo del MOSAPRO
        </h1>
        <p className="text-sm text-white/90 mt-1.5">
          Dejanos tus datos para convocarte a los encuentros regionales y temáticos. Este registro se guarda en una base separada para garantizar el anonimato del relevamiento.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6"
      >
        {errors.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-r-xl text-xs text-red-700 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-sm text-red-800">
              <AlertCircle className="w-4 h-4" />
              <span>Por favor verificá los campos:</span>
            </div>
            <ul className="list-disc list-inside">
              {errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">
              Nombre y Apellido <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre y apellido"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#567c7f] outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">
              Teléfono / WhatsApp <span className="text-red-600">*</span>
            </label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Ej. 221 555-1234"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#567c7f] outline-none text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">
              Correo electrónico (opcional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#567c7f] outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">
              Espacio, CAPS, Hospital u Organización (opcional)
            </label>
            <input
              type="text"
              value={organizacionOEspacio}
              onChange={(e) => setOrganizacionOEspacio(e.target.value)}
              placeholder="Dónde participás o trabajás"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#567c7f] outline-none text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">
            Región Sanitaria <span className="text-red-600">*</span>
          </label>
          <select
            value={regionSanitaria}
            onChange={(e) => setRegionSanitaria(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#567c7f] bg-white outline-none text-sm"
          >
            <option value="">Seleccioná tu Región Sanitaria...</option>
            {REGIONES_SANITARIAS.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name} ({r.sede})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">
            Municipio <span className="text-red-600">*</span>
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
          <label className="block text-sm font-bold text-slate-800 mb-2">
            Mesas temáticas de interés:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {themes.map((th) => {
              const checked = tematicasInteres.includes(th.label);
              return (
                <button
                  key={th.id}
                  type="button"
                  onClick={() =>
                    setTematicasInteres((prev) =>
                      prev.includes(th.label)
                        ? prev.filter((x) => x !== th.label)
                        : [...prev, th.label]
                    )
                  }
                  className={`p-2.5 rounded-xl border text-left text-xs font-medium flex items-center justify-between gap-2 transition cursor-pointer ${
                    checked
                      ? "border-[#567c7f] bg-[#567c7f]/10 text-[#1f2f40] font-bold"
                      : "border-slate-200 hover:border-[#567c7f]/50 text-slate-700"
                  }`}
                >
                  <span>{th.label}</span>
                  <input
                    type="checkbox"
                    checked={checked}
                    readOnly
                    className="w-4 h-4 accent-[#567c7f]"
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 bg-[#f3f6f7] p-3.5 rounded-xl">
          <input
            id="chk-referente"
            type="checkbox"
            checked={ofreceReferente}
            onChange={(e) => setOfreceReferente(e.target.checked)}
            className="w-4 h-4 accent-[#567c7f]"
          />
          <label
            htmlFor="chk-referente"
            className="text-sm font-semibold text-slate-800 cursor-pointer"
          >
            Me ofrezco como referente o impulsor/a de mesa en mi territorio
          </label>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">
            Comentarios o disponibilidad horaria (opcional)
          </label>
          <textarea
            rows={2}
            value={comentarios}
            onChange={(e) => setComentarios(e.target.value)}
            placeholder="Horarios preferidos, propuestas o comentarios..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#567c7f] outline-none text-sm"
          />
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <Link
            href="/"
            className="text-xs font-semibold text-slate-600 hover:text-[#567c7f]"
          >
            ← Volver al relevamiento
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#567c7f] hover:bg-[#4f7478] text-white font-bold text-sm shadow-sm transition cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>
              {submitting ? "Guardando..." : "Registrar mis datos de contacto"}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ContactoPage() {
  return (
    <div className="min-h-dvh flex flex-col">
      <MosaproHeader />
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="max-w-2xl mx-auto my-12 px-4 text-center text-slate-500">
              Cargando formulario de contacto...
            </div>
          }
        >
          <ContactFormContent />
        </Suspense>
      </main>
    </div>
  );
}
