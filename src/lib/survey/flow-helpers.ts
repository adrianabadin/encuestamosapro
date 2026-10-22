import { PriorityRankEntry } from "./validator";

export type MainLocationType =
  | "primer_nivel"
  | "hospital"
  | "comunitario"
  | "gestion_sanitaria"
  | "";

export function getActiveSectionIds(mainLocation?: MainLocationType): string[] {
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
