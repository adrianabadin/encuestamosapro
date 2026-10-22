import fs from "fs";
import path from "path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  registerUserAccount,
  authenticateUserAccount,
  approveUserAccount,
  listAllUsers,
  deleteTestUsersByEmailPrefix,
} from "../src/lib/auth/auth";
import { getPool } from "../src/lib/db/postgres";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

describe("Admin Authentication & First-User Approval Workflow (S11)", () => {
  const prefix = `vitest_auth_${Date.now()}_`;

  beforeAll(async () => {
    loadEnv();
    await deleteTestUsersByEmailPrefix("vitest_auth_");
  });

  afterAll(async () => {
    await deleteTestUsersByEmailPrefix("vitest_auth_");
  });

  it("auto-validates the very first registered user as admin when table is empty, and requires admin approval for subsequent users", async () => {
    const existingUsers = await listAllUsers();
    const firstEmail = `${prefix}first@mosapro.test`;
    const secondEmail = `${prefix}second@mosapro.test`;

    // Register first test user (if no users exist at all, it becomes admin & validated; otherwise we can pass forceFirstCheck in test or check behavior)
    const u1 = await registerUserAccount({
      email: firstEmail,
      password: "Password123!",
      nombre: "Admin Inicial",
      treatAsFirstIfNoAdmins: existingUsers.length === 0,
    });

    if (existingUsers.length === 0) {
      expect(u1.role).toBe("admin");
      expect(u1.isValidated).toBe(true);
    }

    // Register a second user -> must always be pending validation (isValidated = false)
    const u2 = await registerUserAccount({
      email: secondEmail,
      password: "Password456!",
      nombre: "Colaborador Pendiente",
    });
    expect(u2.isValidated).toBe(false);

    // Unvalidated user cannot log in yet
    const loginPending = await authenticateUserAccount(
      secondEmail,
      "Password456!"
    );
    expect(loginPending.ok).toBe(false);
    expect(loginPending.error).toContain("pendiente de validación");

    // Admin validates the second user
    const approved = await approveUserAccount(u2.id, true);
    expect(approved?.isValidated).toBe(true);

    // Now the second user can log in and receives a valid session token
    const loginSuccess = await authenticateUserAccount(
      secondEmail,
      "Password456!"
    );
    expect(loginSuccess.ok).toBe(true);
    expect(loginSuccess.user?.email).toBe(secondEmail);
    expect(loginSuccess.token).toBeTruthy();
  });
});
