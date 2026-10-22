import React, { Suspense } from "react";
import { MosaproHeader } from "@/components/MosaproHeader";
import { SurveyWizard } from "@/components/SurveyWizard";

export default function HomePage() {
  return (
    <div className="min-h-dvh flex flex-col">
      <MosaproHeader />
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="max-w-4xl mx-auto my-12 px-4 text-center text-slate-500">
              Cargando formulario de relevamiento...
            </div>
          }
        >
          <SurveyWizard />
        </Suspense>
      </main>
      <footer className="bg-[#567c7f] text-white py-6 px-4 text-center text-xs mt-auto">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-bold">
            MOSAPRO — Movimiento Sanitario Provincial
          </span>
          <span className="text-white/80">
            Relevamiento anónimo y confidencial · Funciona con o sin conexión a internet
          </span>
        </div>
      </footer>
    </div>
  );
}
