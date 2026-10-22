import { NextRequest, NextResponse } from "next/server";
import {
  getSurveyStats,
  getAllSurveyResponses,
  getAllContactSubmissions,
} from "@/lib/db/repository";
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
    const [stats, recentResponses, recentContacts] = await Promise.all([
      getSurveyStats(),
      getAllSurveyResponses(),
      getAllContactSubmissions(),
    ]);
    return NextResponse.json({
      ok: true,
      stats,
      recentResponses: recentResponses.slice(0, 100),
      recentContacts: recentContacts.slice(0, 100),
    });
  } catch (error) {
    console.error("Error in GET /api/v1/admin/stats:", error);
    return NextResponse.json(
      { ok: false, error: "No se pudieron obtener las estadísticas." },
      { status: 500 }
    );
  }
}
