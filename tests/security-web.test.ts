import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  sessionCookieOptions,
  signSessionToken,
  verifySessionToken,
} from "../src/lib/auth/auth";
import { POST as postResponses } from "../src/app/api/v1/sync/responses/route";
import { POST as postContacts } from "../src/app/api/v1/sync/contacts/route";
import {
  MAX_SYNC_BODY_BYTES,
  resetRateLimits,
} from "../src/lib/security/rate-limit";

beforeEach(() => {
  resetRateLimits();
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    process.env.AUTH_SECRET = "test_secret_value_that_is_long_enough_123456";
  }
});

describe("Session cookie flags (S9)", () => {
  it("marks the session cookie Secure, HttpOnly and SameSite=lax in production", () => {
    const opts = sessionCookieOptions("production");
    expect(opts.secure).toBe(true);
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe("lax");
    expect(opts.path).toBe("/");
  });

  it("does not force Secure outside production so local http dev keeps working", () => {
    expect(sessionCookieOptions("development").secure).toBe(false);
  });
});

describe("Session token signature check (S3)", () => {
  const user = {
    id: 7,
    email: "a@b.test",
    nombre: "A",
    role: "admin" as const,
    isValidated: true,
    createdAt: new Date().toISOString(),
  };

  it("accepts an untampered token", () => {
    expect(verifySessionToken(signSessionToken(user))?.id).toBe(7);
  });

  it("rejects tampered signatures of equal and different length without throwing", () => {
    const token = signSessionToken(user);
    const [data, sig] = token.split(".");
    const flipped = sig.slice(0, -1) + (sig.endsWith("A") ? "B" : "A");
    expect(verifySessionToken(`${data}.${flipped}`)).toBeNull();
    expect(verifySessionToken(`${data}.short`)).toBeNull();
    expect(verifySessionToken(`${data}.`)).toBeNull();
  });
});

describe("Public sync body size limit (S7)", () => {
  const oversized = JSON.stringify({
    items: [{ clientSubmissionId: "x", filler: "a".repeat(MAX_SYNC_BODY_BYTES) }],
  });

  it("rejects an oversized /sync/responses body with 413 before touching the database", async () => {
    const req = new NextRequest("http://localhost/api/v1/sync/responses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: oversized,
    });
    const res = await postResponses(req);
    expect(res.status).toBe(413);
    expect((await res.json()).ok).toBe(false);
  });

  it("rejects an oversized /sync/contacts body with 413 before touching the database", async () => {
    const req = new NextRequest("http://localhost/api/v1/sync/contacts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: oversized,
    });
    const res = await postContacts(req);
    expect(res.status).toBe(413);
  });

  it("rejects early when the declared content-length is over the limit", async () => {
    const req = new NextRequest("http://localhost/api/v1/sync/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(MAX_SYNC_BODY_BYTES + 1),
      },
      body: "{}",
    });
    const res = await postResponses(req);
    expect(res.status).toBe(413);
  });
});
