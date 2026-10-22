import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedSessionUser,
  listAllUsers,
} from "@/lib/auth/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedSessionUser(req);
    const allUsers = await listAllUsers();
    return NextResponse.json({
      ok: true,
      authenticated: Boolean(user),
      user,
      hasAnyUsers: allUsers.length > 0,
    });
  } catch {
    return NextResponse.json(
      { ok: false, authenticated: false, user: null, hasAnyUsers: false },
      { status: 500 }
    );
  }
}
