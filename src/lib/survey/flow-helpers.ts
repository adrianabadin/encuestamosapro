import { PriorityRankEntry } from "./validator";

export function getActiveSectionIds(
  mainLocation?: "primer_nivel" | "hospital" | "comunitario" | ""
): string[] {
  const branch =
    mainLocation === "primer_nivel"
      ? "S2A"
      : mainLocation === "hospital"
      ? "S2B"
      : mainLocation === "comunitario"
      ? "S2C"
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
