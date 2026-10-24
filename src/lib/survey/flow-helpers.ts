import { PriorityRankEntry } from "./validator";

export type MainLocationType =
  | "primer_nivel"
  | "hospital"
  | "comunitario"
  | "gestion_sanitaria"
  | "institucion_educativa"
  | "";

export function getActiveSectionIds(mainLocation?: MainLocationType): string[] {
  // Educational institutions answer nivel/jurisdicción/rol inline in S1 and
  // have no Section 2 branch.
  if (mainLocation === "institucion_educativa") {
    return ["S0", "S1", "S3", "S4", "S5"];
  }
  const branch =
    mainLocation === "primer_nivel"
      ? "S2A"
      : mainLocation === "hospital"
      ? "S2B"
      : mainLocation === "comunitario"
      ? "S2C"
      : mainLocation === "gestion_sanitaria"
      ? "S2D"
      : "S2A";
  return ["S0", "S1", branch, "S3", "S4", "S5"];
}

export function getRankThemeLabel(
  priorities: PriorityRankEntry[],
  rank: number
): string {
  const entry = priorities.find((p) => p.rank === rank);
  return entry?.themeLabel || "Pendiente de elegir";
}
