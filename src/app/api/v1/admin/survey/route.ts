import { NextRequest, NextResponse } from "next/server";
import {
  getActiveSurveySchema,
  updateActiveSurveySchema,
} from "@/lib/db/postgres";
import { DEFAULT_SURVEY_SCHEMA, SurveySchema } from "@/lib/survey/default-schema";

export async function GET() {
  try {
    const schema = await getActiveSurveySchema();
    return NextResponse.json({ ok: true, survey: schema });
  } catch (error) {
    console.error("Error in GET /api/v1/admin/survey:", error);
    return NextResponse.json(
      { ok: false, error: "No se pudo cargar la configuración del relevamiento." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (body?.resetToDefault === true) {
      const current = await getActiveSurveySchema();
      const restored = await updateActiveSurveySchema({
        ...DEFAULT_SURVEY_SCHEMA,
        version: current.version,
      });
      return NextResponse.json({ ok: true, survey: restored });
    }

    const incoming: SurveySchema = body?.survey || body;
    if (
      !incoming ||
      !Array.isArray(incoming.sections) ||
      !Array.isArray(incoming.themes)
    ) {
      return NextResponse.json(
        { ok: false, error: "Formato de esquema inválido." },
        { status: 400 }
      );
    }

    const updated = await updateActiveSurveySchema(incoming);
    return NextResponse.json({ ok: true, survey: updated });
  } catch (error) {
    console.error("Error in PUT /api/v1/admin/survey:", error);
    return NextResponse.json(
      { ok: false, error: "No se pudo actualizar el esquema del formulario." },
      { status: 500 }
    );
  }
}
