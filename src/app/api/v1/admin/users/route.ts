import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedSessionUser,
  listAllUsers,
  approveUserAccount,
  deleteUserAccount,
} from "@/lib/auth/auth";

export async function GET(req: NextRequest) {
  const currentUser = await getAuthenticatedSessionUser(req);
  if (!currentUser) {
    return NextResponse.json(
      { ok: false, error: "No autorizado." },
      { status: 401 }
    );
  }
  const users = await listAllUsers();
  return NextResponse.json({ ok: true, users, currentUser });
}

export async function PATCH(req: NextRequest) {
  const currentUser = await getAuthenticatedSessionUser(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json(
      {
        ok: false,
        error: "Solo un usuario con rol Administrador puede validar o modificar usuarios.",
      },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const userId = Number(body?.userId);
    const isValidated = Boolean(body?.isValidated);
    const role =
      body?.role === "admin" || body?.role === "user" ? body.role : undefined;

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Falta userId." },
        { status: 400 }
      );
    }

    const updated = await approveUserAccount(userId, isValidated, role);
    return NextResponse.json({ ok: true, user: updated });
  } catch {
    return NextResponse.json(
      { ok: false, error: "No se pudo actualizar el usuario." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const currentUser = await getAuthenticatedSessionUser(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: "Solo un administrador puede eliminar usuarios." },
      { status: 403 }
    );
  }

  const userId = Number(req.nextUrl.searchParams.get("userId"));
  if (!userId || userId === currentUser.id) {
    return NextResponse.json(
      { ok: false, error: "No podés eliminar tu propio usuario administrador activo." },
      { status: 400 }
    );
  }

  await deleteUserAccount(userId);
  return NextResponse.json({ ok: true });
}
