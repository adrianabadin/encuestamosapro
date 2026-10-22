"use client";

import React, { useMemo, useState } from "react";
import { Search, MapPin, Check } from "lucide-react";
import {
  MUNICIPIOS_PBA,
  getMunicipiosByRegion,
} from "@/lib/catalog/pba-municipios";

interface MunicipioAutocompleteProps {
  regionCode: string;
  value: string;
  onChange: (municipio: string, detectedRegionCode?: string) => void;
}

export function MunicipioAutocomplete({
  regionCode,
  value,
  onChange,
}: MunicipioAutocompleteProps) {
  const [query, setQuery] = useState(value || "");
  const [isOpen, setIsOpen] = useState(false);
  const [showAllRegions, setShowAllRegions] = useState(false);

  const candidates = useMemo(() => {
    const baseList =
      regionCode && !showAllRegions
        ? getMunicipiosByRegion(regionCode)
        : MUNICIPIOS_PBA;
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return baseList;
    return baseList.filter((m) =>
      m.name.toLowerCase().includes(normalizedQuery)
    );
  }, [regionCode, query, showAllRegions]);

  const handleSelect = (name: string, mRegion: string) => {
    setQuery(name);
    onChange(name, mRegion);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <div className="text-xs text-slate-600 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-[#567c7f]" />
          {regionCode && !showAllRegions ? (
            <span>
              Mostrando municipios de <strong>Región {regionCode}</strong>
            </span>
          ) : (
            <span>Mostrando los 135 municipios de la Provincia de Buenos Aires</span>
          )}
        </div>
        {regionCode && (
          <button
            type="button"
            onClick={() => setShowAllRegions((prev) => !prev)}
            className="text-xs font-semibold text-[#567c7f] hover:underline self-start sm:self-auto cursor-pointer"
          >
            {showAllRegions
              ? `Filtrar solo Región ${regionCode}`
              : "Ver los 135 municipios de PBA"}
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setIsOpen(true);
          }}
          placeholder="Escribí o seleccioná tu municipio (ej. La Plata, Avellaneda, Junín...)"
          className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:border-[#567c7f] focus:ring-2 focus:ring-[#567c7f]/20 outline-none text-base bg-white transition"
        />
      </div>

      {isOpen && (
        <div className="mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg z-30 divide-y divide-slate-100">
          {candidates.length === 0 ? (
            <div className="p-3 text-sm text-slate-500 flex items-center justify-between">
              <span>No se encontró en la región seleccionada.</span>
              {!showAllRegions && regionCode && (
                <button
                  type="button"
                  onClick={() => setShowAllRegions(true)}
                  className="text-xs font-semibold text-[#567c7f] underline cursor-pointer"
                >
                  Buscar en toda la Provincia
                </button>
              )}
            </div>
          ) : (
            candidates.map((m) => {
              const selected = value === m.name;
              return (
                <button
                  key={`${m.regionCode}-${m.name}`}
                  type="button"
                  onClick={() => handleSelect(m.name, m.regionCode)}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-[#f3f6f7] transition cursor-pointer ${
                    selected ? "bg-[#567c7f]/10 font-semibold text-[#3f5f61]" : ""
                  }`}
                >
                  <span>{m.name}</span>
                  <span className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                      Región {m.regionCode}
                    </span>
                    {selected && <Check className="w-4 h-4 text-[#567c7f]" />}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
