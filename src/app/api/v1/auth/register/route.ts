import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  AuthInputError,
  registerUserAccount,
  signSessionToken,
} from "@/lib/auth/auth";
import {
  RATE_LIMITS,
  checkRateLimit,
  getClientIp,
} from "@/lib/security/rate-limit";

export async function POST(req: NextRequest) {
  const limit = checkRateLimit(RATE_LIMITS.register, getClientIp(req));
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "Demasiados registros desde esta conexión. Probá de nuevo más tarde.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      }
    );
  }

  try {
    const body = await req.json();
    const user = await registerUserAccount({
      email: body?.email || "",
      password: body?.password || "",
      nombre: body?.nombre || "",
    });

    const response = NextResponse.json({
      ok: true,
      user,
      message: user.isValidated
        ? "Fuiste registrado como el primer usuario Administrador y tu cuenta ya está validada."
        : "Usuario registrado correctamente. Tu cuenta quedó pendiente de validación por un administrador.",
    });

    if (user.isValidated) {
      const token = signSessionToken(user);
      response.cookies.set(AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return response;
  } catch (error) {
    if (error instanceof AuthInputError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      );
    }
    console.error("Error in POST /api/v1/auth/register:", error);
    return NextResponse.json(
      { ok: false, error: "Error al registrar usuario." },
      { status: 500 }
    );
  }
}
