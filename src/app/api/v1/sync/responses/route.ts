import { NextRequest, NextResponse } from "next/server";
import { syncSurveyResponsesBatch } from "@/lib/db/repository";
import { SurveySubmissionPayload } from "@/lib/survey/validator";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items: Partial<SurveySubmissionPayload>[] = Array.isArray(body?.items)
      ? body.items
      : body?.submission
      ? [body.submission]
      : body?.clientSubmissionId
      ? [body]
      : [];

    if (items.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No se recibieron respuestas para sincronizar." },
        { status: 400, headers: corsHeaders }
      );
    }

    const result = await syncSurveyResponsesBatch(items);
    const hasAccepted = result.accepted.length > 0;
    const status = hasAccepted || result.rejected.length === 0 ? 200 : 422;

    return NextResponse.json(
      {
        ok: result.rejected.length === 0,
        ...result,
        syncedAt: new Date().toISOString(),
      },
      { status, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error in POST /api/v1/sync/responses:", error);
    return NextResponse.json(
      { ok: false, error: "Error interno al sincronizar respuestas." },
      { status: 500, headers: corsHeaders }
    );
  }
}
