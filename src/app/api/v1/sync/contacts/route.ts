import { NextRequest, NextResponse } from "next/server";
import { syncContactSubmissionsBatch } from "@/lib/db/repository";
import { ContactSubmissionPayload } from "@/lib/survey/validator";

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
    const items: Partial<ContactSubmissionPayload>[] = Array.isArray(body?.items)
      ? body.items
      : body?.contact
      ? [body.contact]
      : body?.clientSubmissionId
      ? [body]
      : [];

    if (items.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No se recibieron datos de contacto para sincronizar." },
        { status: 400, headers: corsHeaders }
      );
    }

    const result = await syncContactSubmissionsBatch(items);
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
    console.error("Error in POST /api/v1/sync/contacts:", error);
    return NextResponse.json(
      { ok: false, error: "Error interno al guardar el contacto." },
      { status: 500, headers: corsHeaders }
    );
  }
}
