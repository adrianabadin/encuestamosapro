import { NextRequest, NextResponse } from "next/server";
import {
  getAllSurveyResponses,
  getAllContactSubmissions,
} from "@/lib/db/repository";
import { buildCsvString, buildExcelBuffer } from "@/lib/export/exporter";
import { getAuthenticatedSessionUser } from "@/lib/auth/auth";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedSessionUser(req);
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "No autorizado. Iniciá sesión en el panel." },
      { status: 401 }
    );
  }
  try {
    const format = req.nextUrl.searchParams.get("format") || "xlsx";
    const [responses, contacts] = await Promise.all([
      getAllSurveyResponses(),
      getAllContactSubmissions(),
    ]);

    const dateStamp = new Date().toISOString().slice(0, 10);

    if (format === "csv") {
      const csv = buildCsvString(responses);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="mosapro-relevamiento-${dateStamp}.csv"`,
        },
      });
    }

    const buffer = buildExcelBuffer(responses, contacts);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="mosapro-relevamiento-${dateStamp}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/v1/admin/export:", error);
    return NextResponse.json(
      { ok: false, error: "No se pudo generar la exportación." },
      { status: 500 }
    );
  }
}
