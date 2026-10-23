import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  checkRateLimit,
  getClientIp,
  resetRateLimits,
} from "../src/lib/security/rate-limit";
import {
  flattenContactRow,
  sanitizeSpreadsheetCell,
} from "../src/lib/export/exporter";

describe("Rate limiting", () => {
  beforeEach(() => resetRateLimits());

  it("blocks requests over the limit within the window and reports retry-after", () => {
    const rule = { name: "t", limit: 2, windowMs: 1000 };
    expect(checkRateLimit(rule, "ip1", 0).allowed).toBe(true);
    expect(checkRateLimit(rule, "ip1", 10).allowed).toBe(true);
    const blocked = checkRateLimit(rule, "ip1", 20);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(1);
  });

  it("tracks keys independently and resets after the window", () => {
    const rule = { name: "t", limit: 1, windowMs: 1000 };
    expect(checkRateLimit(rule, "ip1", 0).allowed).toBe(true);
    expect(checkRateLimit(rule, "ip2", 0).allowed).toBe(true);
    expect(checkRateLimit(rule, "ip1", 500).allowed).toBe(false);
    expect(checkRateLimit(rule, "ip1", 1000).allowed).toBe(true);
  });

  it("uses the proxy-appended (right-most) X-Forwarded-For entry", () => {
    const req = new NextRequest("http://localhost/api", {
      headers: { "x-forwarded-for": "6.6.6.6, 10.0.0.5" },
    });
    expect(getClientIp(req)).toBe("10.0.0.5");
  });
});

describe("Spreadsheet formula injection", () => {
  it("neutralizes cells starting with formula trigger characters", () => {
    expect(sanitizeSpreadsheetCell("=HYPERLINK(\"http://x\")")).toBe(
      "'=HYPERLINK(\"http://x\")"
    );
    expect(sanitizeSpreadsheetCell("+54 221")).toBe("'+54 221");
    expect(sanitizeSpreadsheetCell("-1+1")).toBe("'-1+1");
    expect(sanitizeSpreadsheetCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(sanitizeSpreadsheetCell("\t=1")).toBe("'\t=1");
  });

  it("leaves normal text and numbers untouched", () => {
    expect(sanitizeSpreadsheetCell("La Plata")).toBe("La Plata");
    expect(sanitizeSpreadsheetCell("221-444-5555")).toBe("221-444-5555");
    expect(sanitizeSpreadsheetCell(42)).toBe(42);
  });

  it("applies to exported contact rows", () => {
    const row = flattenContactRow({
      id: 1,
      clientSubmissionId: "c1",
      sourcePlatform: "web",
      nombre: "=cmd|'/C calc'!A0",
      telefono: "221-444-5555",
      email: null,
      regionSanitaria: "XI",
      municipio: "La Plata",
      organizacionEspacio: null,
      tematicasInteres: [],
      ofreceReferente: false,
      horarios: [],
      modalidad: null,
      comentarios: "@evil",
      createdAtClient: null,
      syncedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(row.Nombre_Apellido).toBe("'=cmd|'/C calc'!A0");
    expect(row.Comentarios).toBe("'@evil");
    expect(row.Telefono_WhatsApp).toBe("221-444-5555");
    expect(row.ID).toBe(1);
  });
});
