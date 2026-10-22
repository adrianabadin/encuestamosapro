"use client";

import React, { useState } from "react";
import { PlusCircle, Trash2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { SurveyTheme } from "@/lib/survey/default-schema";
import {
  PriorityRankEntry,
  CustomThemeEntry,
} from "@/lib/survey/validator";

interface PriorityGridProps {
  baseThemes: SurveyTheme[];
  customThemes: CustomThemeEntry[];
  priorities: PriorityRankEntry[];
  onChangePriorities: (next: PriorityRankEntry[]) => void;
  onChangeCustomThemes: (next: CustomThemeEntry[]) => void;
}

const RANKS = [1, 2, 3, 4, 5];

export function PriorityGrid({
  baseThemes,
  customThemes,
  priorities,
  onChangePriorities,
  onChangeCustomThemes,
}: PriorityGridProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  const allRows = [
    ...baseThemes
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

  const getRankForTheme = (themeId: string): number | null => {
    const found = priorities.find((p) => p.themeId === themeId);
    return found ? found.rank : null;
  };

  const handleAssignRank = (themeId: string, themeLabel: string, rank: number) => {
    // Enforce:
    // 1. At most one theme per column (rank 1..5)
    // 2. At most one rank per row (themeId)
    // Clicking the already selected cell unchecks it
    const existingSameCell = priorities.find(
      (p) => p.themeId === themeId && p.rank === rank
    );
    if (existingSameCell) {
      onChangePriorities(
        priorities.filter((p) => !(p.themeId === themeId && p.rank === rank))
      );
      return;
    }

    const filtered = priorities.filter(
      (p) => p.rank !== rank && p.themeId !== themeId
    );
    const next = [...filtered, { rank, themeId, themeLabel }].sort(
      (a, b) => a.rank - b.rank
    );
    onChangePriorities(next);
  };

  const handleAddCustomTheme = () => {
    const cleanTitle = newTitle.trim();
    const cleanDesc = newDescription.trim();
    if (!cleanTitle || !cleanDesc) {
      setModalError(
        "Es obligatorio ingresar tanto el título del tema como una breve descripción o explicación de lo que aborda."
      );
      return;
    }

    const id = `custom_${Date.now()}`;
    const updatedCustom = [
      ...customThemes,
      { id, title: cleanTitle, description: cleanDesc },
    ];
    onChangeCustomThemes(updatedCustom);

    // If there is an empty rank slot (1..5), automatically assign the first available rank
    const usedRanks = new Set(priorities.map((p) => p.rank));
    const freeRank = RANKS.find((r) => !usedRanks.has(r));
    if (freeRank) {
      handleAssignRank(id, cleanTitle, freeRank);
    }

    setNewTitle("");
    setNewDescription("");
    setModalError(null);
    setShowAddModal(false);
  };

  const handleRemoveCustomTheme = (id: string) => {
    onChangeCustomThemes(customThemes.filter((c) => c.id !== id));
    onChangePriorities(priorities.filter((p) => p.themeId !== id));
  };

  return (
    <div className="space-y-4">
      {/* Summary chips of selected 1° to 5° */}
      <div className="bg-[#f3f6f7] border border-[#d5e0e2] rounded-xl p-3.5">
        <div className="text-xs font-bold uppercase tracking-wider text-[#3f5f61] mb-2 flex items-center justify-between">
          <span>Tu orden de prioridades actual ({priorities.length}/5)</span>
          {priorities.length === 5 && (
            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold normal-case">
              <CheckCircle2 className="w-4 h-4" />
              5 prioridades completas
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          {RANKS.map((rank) => {
            const assigned = priorities.find((p) => p.rank === rank);
            return (
              <div
                key={rank}
                className={`rounded-lg p-2.5 text-xs border transition ${
                  assigned
                    ? "bg-white border-[#567c7f] shadow-xs"
                    : "bg-slate-100/80 border-dashed border-slate-300 text-slate-400"
                }`}
              >
                <div className="font-bold text-[#567c7f] mb-0.5">
                  {rank}.° Lugar
                </div>
                <div className="line-clamp-2 font-medium text-slate-800">
                  {assigned ? assigned.themeLabel : "Sin asignar"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop Table (md and up) */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[#567c7f] text-white">
              <th className="text-left py-3 px-4 font-semibold">
                Temática sanitaria
              </th>
              {RANKS.map((rank) => (
                <th
                  key={rank}
                  className="py-3 px-3 text-center font-bold w-20"
                >
                  {rank}.°
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {allRows.map((row, idx) => {
              const currentRank = getRankForTheme(row.id);
              return (
                <tr
                  key={row.id}
                  className={`${
                    currentRank
                      ? "bg-[#567c7f]/8"
                      : idx % 2 === 0
                      ? "bg-white"
                      : "bg-slate-50/60"
                  } hover:bg-[#567c7f]/12 transition`}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-medium text-slate-900">
                          {row.label}
                        </span>
                        {row.isCustom && (
                          <span className="ml-2 inline-block px-2 py-0.5 text-[11px] font-bold rounded bg-[#b99e93]/25 text-[#5a4f49]">
                            Otra temática agregada
                          </span>
                        )}
                        {row.description && (
                          <p className="text-xs text-slate-600 mt-0.5">
                            {row.description}
                          </p>
                        )}
                      </div>
                      {row.isCustom && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomTheme(row.id)}
                          className="text-red-600 hover:text-red-800 p-1 rounded cursor-pointer"
                          title="Quitar temática personalizada"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                  {RANKS.map((rank) => {
                    const isChecked = currentRank === rank;
                    return (
                      <td key={rank} className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            handleAssignRank(row.id, row.label, rank)
                          }
                          aria-label={`Asignar ${row.label} al puesto ${rank}`}
                          className={`w-9 h-9 rounded-full font-bold text-xs inline-flex items-center justify-center transition cursor-pointer ${
                            isChecked
                              ? "bg-[#567c7f] text-white ring-4 ring-[#567c7f]/25 scale-105"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300"
                          }`}
                        >
                          {rank}°
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile / Touch Adaptive Cards (below md) */}
      <div className="md:hidden space-y-2.5">
        {allRows.map((row) => {
          const currentRank = getRankForTheme(row.id);
          return (
            <div
              key={row.id}
              className={`rounded-xl border p-3.5 transition ${
                currentRank
                  ? "bg-[#567c7f]/8 border-[#567c7f]"
                  : "bg-white border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div>
                  <div className="font-semibold text-sm text-slate-900">
                    {row.label}
                  </div>
                  {row.description && (
                    <div className="text-xs text-slate-600 mt-0.5">
                      {row.description}
                    </div>
                  )}
                </div>
                {row.isCustom && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomTheme(row.id)}
                    className="text-red-600 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between gap-1.5">
                <span className="text-xs text-slate-500 font-medium">
                  Ubicación:
                </span>
                <div className="flex items-center gap-1.5">
                  {RANKS.map((rank) => {
                    const isChecked = currentRank === rank;
                    return (
                      <button
                        key={rank}
                        type="button"
                        onClick={() =>
                          handleAssignRank(row.id, row.label, rank)
                        }
                        className={`min-w-[44px] min-h-[40px] px-2.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                          isChecked
                            ? "bg-[#567c7f] text-white shadow-xs"
                            : "bg-slate-100 text-slate-700 border border-slate-300"
                        }`}
                      >
                        {rank}.°
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* "+ Agregar otra temática" Button & Inline/Modal Form */}
      <div className="pt-1">
        {!showAddModal ? (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-[#567c7f] text-[#567c7f] hover:bg-[#567c7f]/10 font-semibold text-sm transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Agregar otra temática (abierta) a la grilla</span>
          </button>
        ) : (
          <div className="rounded-xl border-2 border-[#567c7f] bg-white p-4 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-[#3f5f61]">
                Agregar otra temática a la grilla de prioridades
              </h4>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setModalError(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Título de la temática <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ej. Salud ambiental y acceso al agua segura"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-[#567c7f] outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Descripción o explicación de lo que aborda el tema{" "}
                <span className="text-red-600">*</span>
              </label>
              <textarea
                rows={2}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Describí brevemente qué abarca esta temática y por qué es importante incorporarla..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-[#567c7f] outline-none text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setModalError(null);
                }}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddCustomTheme}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-[#567c7f] hover:bg-[#4f7478] text-white transition cursor-pointer"
              >
                Guardar y agregar a la grilla
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
