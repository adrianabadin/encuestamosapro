import { NextRequest, NextResponse } from "next/server";
import { syncContactSubmissionsBatch } from "@/lib/db/repository";
import { ContactSubmissionPayload } from "@/lib/survey/validator";
import {
  MAX_SYNC_BATCH_ITEMS,
  RATE_LIMITS,
  checkRateLimit,
  getClientIp,
  readJsonWithLimit,
} from "@/lib/security/rate-limit";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const limit = checkRateLimit(RATE_LIMITS.sync, getClientIp(req));
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "Demasiadas solicitudes. Se reintentará automáticamente." },
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Retry-After": String(limit.retryAfterSeconds),
        },
      }
    );
  }

  try {
    const parsed = await readJsonWithLimit(req);
    if (!parsed.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            parsed.status === 413
              ? "La solicitud supera el tamaño máximo permitido."
              : "Cuerpo de la solicitud inválido.",
        },
        { status: parsed.status, headers: corsHeaders }
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = parsed.body as any;
    const allItems: Partial<ContactSubmissionPayload>[] = Array.isArray(body?.items)
      ? body.items
      : body?.contact
      ? [body.contact]
      : body?.clientSubmissionId
      ? [body]
      : [];
    const items = allItems.slice(0, MAX_SYNC_BATCH_ITEMS);
    const deferred = allItems.length - items.length;

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
        deferred,
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
