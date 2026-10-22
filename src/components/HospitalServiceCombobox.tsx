"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import { Search, ChevronDown, Check, Sparkles } from "lucide-react";
import { DEFAULT_HOSPITAL_SERVICES } from "@/lib/survey/default-schema";

interface HospitalServiceComboboxProps {
  value: string;
  onChange: (nextValue: string) => void;
  options?: string[];
}

export function HospitalServiceCombobox({
  value,
  onChange,
  options = DEFAULT_HOSPITAL_SERVICES,
}: HospitalServiceComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = (value || "").trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={value}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          placeholder="Elegí de la lista o escribí manualmente tu área o servicio..."
          className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-300 focus:border-[#567c7f] focus:ring-2 focus:ring-[#567c7f]/20 outline-none text-sm bg-white transition"
        />
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label="Mostrar listado de servicios"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-[#567c7f] cursor-pointer"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {isOpen && (
        <div className="mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg z-30 divide-y divide-slate-100">
          {filtered.map((srv) => {
            const isSelected = value.trim().toLowerCase() === srv.toLowerCase();
            return (
              <button
                key={srv}
                type="button"
                onClick={() => {
                  onChange(srv);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-[#f3f6f7] transition cursor-pointer ${
                  isSelected
                    ? "bg-[#567c7f]/10 font-bold text-[#3f5f61]"
                    : "text-slate-800"
                }`}
              >
                <span>{srv}</span>
                {isSelected && <Check className="w-4 h-4 text-[#567c7f]" />}
              </button>
            );
          })}

          {value.trim().length > 0 &&
            !options.some(
              (o) => o.toLowerCase() === value.trim().toLowerCase()
            ) && (
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full text-left px-4 py-2.5 text-xs bg-[#f3f1ee] text-[#3f5f61] font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#567c7f] shrink-0" />
                <span>
                  Usar texto libre ingresado: <strong>«{value.trim()}»</strong>
                </span>
              </button>
            )}
        </div>
      )}
    </div>
  );
}
