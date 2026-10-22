import React, { Suspense } from "react";
import { MosaproHeader } from "@/components/MosaproHeader";
import { SurveyWizard } from "@/components/SurveyWizard";

interface RegionalPageProps {
  params: Promise<{ region: string }>;
}

export default async function RegionalSurveyPage({ params }: RegionalPageProps) {
  const { region } = await params;

  return (
    <div className="min-h-dvh flex flex-col">
      <MosaproHeader />
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="max-w-4xl mx-auto my-12 px-4 text-center text-slate-500">
              Cargando relevamiento regional...
            </div>
          }
        >
          <SurveyWizard initialRegion={region} />
        </Suspense>
      </main>
    </div>
  );
}
