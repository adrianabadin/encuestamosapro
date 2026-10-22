import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  registerUserAccount,
  signSessionToken,
} from "@/lib/auth/auth";

export async function POST(req: NextRequest) {
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
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Error al registrar usuario.";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
