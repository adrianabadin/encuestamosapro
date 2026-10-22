import { describe, it, expect } from "vitest";
import { normalizeRegionCode } from "../src/lib/catalog/pba-municipios";
import {
  getActiveSectionIds,
  getRankThemeLabel,
} from "../src/lib/survey/flow-helpers";

describe("Survey UI Flow & Regional Prefill Helpers (S3, S4, S5, S6, S7, S8)", () => {
  it("normalizes regional link codes from Roman or Arabic numerals (S6)", () => {
    expect(normalizeRegionCode("VI")).toBe("VI");
    expect(normalizeRegionCode("vi")).toBe("VI");
    expect(normalizeRegionCode("6")).toBe("VI");
    expect(normalizeRegionCode("Región XII")).toBe("XII");
    expect(normalizeRegionCode("12")).toBe("XII");
    expect(normalizeRegionCode("invalid")).toBe("");
  });

  it("computes the active section path based on Section 1 mainLocation (S4)", () => {
    expect(getActiveSectionIds("primer_nivel")).toEqual([
      "S0",
      "S1",
      "S2A",
      "S3",
      "S4",
      "S5",
    ]);
    expect(getActiveSectionIds("hospital")).toEqual([
      "S0",
      "S1",
      "S2B",
      "S3",
      "S4",
      "S5",
    ]);
    expect(getActiveSectionIds("comunitario")).toEqual([
      "S0",
      "S1",
      "S2C",
      "S3",
      "S4",
      "S5",
    ]);
  });

  it("resolves dynamic theme labels for 1.°, 2.° and 3.° place in Section 4.2-4.4 (S7)", () => {
    const priorities = [
      { rank: 1, themeId: "fuerza_laboral", themeLabel: "Fuerza laboral" },
      { rank: 2, themeId: "custom_1", themeLabel: "Salud ambiental" },
      { rank: 3, themeId: "agroecologia", themeLabel: "Agroecología" },
    ];
    expect(getRankThemeLabel(priorities, 1)).toBe("Fuerza laboral");
    expect(getRankThemeLabel(priorities, 2)).toBe("Salud ambiental");
    expect(getRankThemeLabel(priorities, 3)).toBe("Agroecología");
    expect(getRankThemeLabel(priorities, 4)).toBe("Pendiente de elegir");
  });
});
