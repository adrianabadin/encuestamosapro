import crypto from "crypto";
import { NextRequest } from "next/server";
import { ensureDbInitialized, getPool } from "../db/postgres";

export interface MosaproUser {
  id: number;
  email: string;
  nombre: string;
  role: "admin" | "user";
  isValidated: boolean;
  createdAt: string;
}

export const AUTH_COOKIE_NAME = "mosapro_admin_token";

// Errors whose message is safe to show to the user (input validation).
// Anything else is internal and must not leak to the client.
export class AuthInputError extends Error {}

// Session tokens are HMAC-signed with this secret; anyone who knows it can
// forge an admin session, so it must be a dedicated random value.
function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET is not configured (min 32 chars). Generate one with: openssl rand -hex 32"
    );
  }
  return secret;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .scryptSync(password, salt, 64)
    .toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, key] = (storedHash || "").split(":");
  if (!salt || !key) return false;
  const hashBuffer = crypto.scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(key, "hex");
  if (hashBuffer.length !== keyBuffer.length) return false;
  return crypto.timingSafeEqual(hashBuffer, keyBuffer);
}

export function signSessionToken(user: MosaproUser): string {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  };
  const dataB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", getAuthSecret())
    .update(dataB64)
    .digest("base64url");
  return `${dataB64}.${sig}`;
}

export function verifySessionToken(
  token?: string | null
): { id: number; email: string; role: "admin" | "user" } | null {
  if (!token || !token.includes(".")) return null;
  const [dataB64, sig] = token.split(".");
  const expectedSig = crypto
    .createHmac("sha256", getAuthSecret())
    .update(dataB64)
    .digest("base64url");
  if (sig !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(dataB64, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return {
      id: payload.id,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export async function registerUserAccount(params: {
  email: string;
  password: string;
  nombre?: string;
  treatAsFirstIfNoAdmins?: boolean;
}): Promise<MosaproUser> {
  await ensureDbInitialized();
  const db = getPool();

  const cleanEmail = params.email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    throw new AuthInputError("El correo electrónico no es válido.");
  }
  if (!params.password || params.password.length < 6) {
    throw new AuthInputError("La contraseña debe tener al menos 6 caracteres.");
  }

  const existingEmail = await db.query(
    `SELECT id FROM mosapro_users WHERE email = $1`,
    [cleanEmail]
  );
  if (existingEmail.rowCount && existingEmail.rowCount > 0) {
    throw new AuthInputError("Ya existe un usuario registrado con ese correo electrónico.");
  }

  // Check if there are any users in mosapro_users yet
  const countRes = await db.query(
    `SELECT COUNT(*)::int AS cnt FROM mosapro_users`
  );
  const totalUsers = countRes.rows[0]?.cnt ?? 0;
  const isFirstUser = totalUsers === 0;

  const role: "admin" | "user" = isFirstUser ? "admin" : "user";
  const isValidated = isFirstUser;
  const pwdHash = hashPassword(params.password);

  const insertRes = await db.query(
    `INSERT INTO mosapro_users (email, nombre, password_hash, role, is_validated)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, nombre, role, is_validated, created_at`,
    [
      cleanEmail,
      (params.nombre || "").trim() || cleanEmail.split("@")[0],
      pwdHash,
      role,
      isValidated,
    ]
  );

  const row = insertRes.rows[0];
  return {
    id: row.id,
    email: row.email,
    nombre: row.nombre,
    role: row.role,
    isValidated: row.is_validated,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function authenticateUserAccount(
  email: string,
  password: string
): Promise<{
  ok: boolean;
  user?: MosaproUser;
  token?: string;
  error?: string;
}> {
  await ensureDbInitialized();
  const db = getPool();
  const cleanEmail = (email || "").trim().toLowerCase();

  const res = await db.query(
    `SELECT id, email, nombre, password_hash, role, is_validated, created_at
     FROM mosapro_users
     WHERE email = $1`,
    [cleanEmail]
  );
  if (!res.rowCount || res.rowCount === 0) {
    return { ok: false, error: "Credenciales inválidas." };
  }

  const row = res.rows[0];
  if (!verifyPassword(password, row.password_hash)) {
    return { ok: false, error: "Credenciales inválidas." };
  }

  if (!row.is_validated) {
    return {
      ok: false,
      error:
        "Tu cuenta fue creada pero está pendiente de validación por el administrador.",
    };
  }

  const user: MosaproUser = {
    id: row.id,
    email: row.email,
    nombre: row.nombre,
    role: row.role,
    isValidated: row.is_validated,
    createdAt: new Date(row.created_at).toISOString(),
  };

  const token = signSessionToken(user);
  return { ok: true, user, token };
}

export async function getUserById(id: number): Promise<MosaproUser | null> {
  await ensureDbInitialized();
  const db = getPool();
  const res = await db.query(
    `SELECT id, email, nombre, role, is_validated, created_at
     FROM mosapro_users WHERE id = $1`,
    [id]
  );
  if (!res.rowCount || res.rowCount === 0) return null;
  const row = res.rows[0];
  return {
    id: row.id,
    email: row.email,
    nombre: row.nombre,
    role: row.role,
    isValidated: row.is_validated,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function getAuthenticatedSessionUser(
  req: NextRequest
): Promise<MosaproUser | null> {
  const cookieToken = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const headerAuth = req.headers.get("authorization");
  const bearerToken = headerAuth?.startsWith("Bearer ")
    ? headerAuth.slice(7)
    : null;
  const decoded = verifySessionToken(cookieToken || bearerToken);
  if (!decoded) return null;

  const freshUser = await getUserById(decoded.id);
  if (!freshUser || !freshUser.isValidated) return null;
  return freshUser;
}

export async function listAllUsers(): Promise<MosaproUser[]> {
  await ensureDbInitialized();
  const db = getPool();
  const res = await db.query(
    `SELECT id, email, nombre, role, is_validated, created_at
     FROM mosapro_users
     ORDER BY created_at ASC`
  );
  return res.rows.map((row) => ({
    id: row.id,
    email: row.email,
    nombre: row.nombre,
    role: row.role,
    isValidated: row.is_validated,
    createdAt: new Date(row.created_at).toISOString(),
  }));
}

export async function approveUserAccount(
  userId: number,
  isValidated: boolean,
  role?: "admin" | "user"
): Promise<MosaproUser | null> {
  await ensureDbInitialized();
  const db = getPool();
  const res = role
    ? await db.query(
        `UPDATE mosapro_users
         SET is_validated = $2, role = $3
         WHERE id = $1
         RETURNING id, email, nombre, role, is_validated, created_at`,
        [userId, isValidated, role]
      )
    : await db.query(
        `UPDATE mosapro_users
         SET is_validated = $2
         WHERE id = $1
         RETURNING id, email, nombre, role, is_validated, created_at`,
        [userId, isValidated]
      );

  if (!res.rowCount || res.rowCount === 0) return null;
  const row = res.rows[0];
  return {
    id: row.id,
    email: row.email,
    nombre: row.nombre,
    role: row.role,
    isValidated: row.is_validated,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function deleteUserAccount(userId: number): Promise<void> {
  await ensureDbInitialized();
  const db = getPool();
  await db.query(`DELETE FROM mosapro_users WHERE id = $1`, [userId]);
}

export async function deleteTestUsersByEmailPrefix(
  prefix: string
): Promise<void> {
  await ensureDbInitialized();
  const db = getPool();
  await db.query(`DELETE FROM mosapro_users WHERE email LIKE $1`, [
    `${prefix}%`,
  ]);
}
