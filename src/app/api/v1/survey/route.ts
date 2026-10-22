import { NextResponse } from "next/server";
import { getActiveSurveySchema } from "@/lib/db/postgres";
import {
  REGIONES_SANITARIAS,
  MUNICIPIOS_PBA,
} from "@/lib/catalog/pba-municipios";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  try {
    const schema = await getActiveSurveySchema();
    return NextResponse.json(
      {
        ok: true,
        survey: schema,
        catalogs: {
          regionesSanitarias: REGIONES_SANITARIAS,
          municipiosPba: MUNICIPIOS_PBA,
        },
        serverTime: new Date().toISOString(),
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error in GET /api/v1/survey:", error);
    return NextResponse.json(
      { ok: false, error: "No se pudo obtener la configuración del relevamiento." },
      { status: 500, headers: corsHeaders }
    );
  }
}
