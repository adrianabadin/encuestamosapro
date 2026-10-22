import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  authenticateUserAccount,
} from "@/lib/auth/auth";

export async function POST(req: NextRequest) {
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
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Error al iniciar sesión.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
