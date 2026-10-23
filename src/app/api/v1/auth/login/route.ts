import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  authenticateUserAccount,
} from "@/lib/auth/auth";
import {
  RATE_LIMITS,
  checkRateLimit,
  getClientIp,
} from "@/lib/security/rate-limit";

export async function POST(req: NextRequest) {
  const limit = checkRateLimit(RATE_LIMITS.login, getClientIp(req));
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "Demasiados intentos de inicio de sesión. Probá de nuevo en unos minutos.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      }
    );
  }

  try {
    const body = await req.json();
    const result = await authenticateUserAccount(
      body?.email || "",
      body?.password || ""
    );

    if (!result.ok || !result.user || !result.token) {
      return NextResponse.json(
        { ok: false, error: result.error || "Credenciales inválidas." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      ok: true,
      user: result.user,
    });

    response.cookies.set(AUTH_COOKIE_NAME, result.token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Error in POST /api/v1/auth/login:", error);
    return NextResponse.json(
      { ok: false, error: "Error al iniciar sesión." },
      { status: 500 }
    );
  }
}
