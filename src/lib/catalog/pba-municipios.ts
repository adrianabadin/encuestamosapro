export interface RegionSanitaria {
  code: string;
  name: string;
  sede: string;
}

export interface MunicipioPBA {
  name: string;
  regionCode: string;
}

// Selectable in the survey when the respondent's place does not belong to any
// PBA Región Sanitaria; the municipio is then a free-text localidad.
export const REGION_NO_CALIFICA = "no_califica";

export const REGIONES_SANITARIAS: RegionSanitaria[] = [
  { code: "I", name: "Región Sanitaria I", sede: "Bahía Blanca" },
  { code: "II", name: "Región Sanitaria II", sede: "Pehuajó" },
  { code: "III", name: "Región Sanitaria III", sede: "Junín" },
  { code: "IV", name: "Región Sanitaria IV", sede: "Pergamino" },
  { code: "V", name: "Región Sanitaria V", sede: "General San Martín" },
  { code: "VI", name: "Región Sanitaria VI", sede: "Lomas de Zamora" },
  { code: "VII", name: "Región Sanitaria VII", sede: "Morón" },
  { code: "VIII", name: "Región Sanitaria VIII", sede: "Mar del Plata" },
  { code: "IX", name: "Región Sanitaria IX", sede: "Azul" },
  { code: "X", name: "Región Sanitaria X", sede: "Chivilcoy" },
  { code: "XI", name: "Región Sanitaria XI", sede: "La Plata" },
  { code: "XII", name: "Región Sanitaria XII", sede: "La Matanza" },
];

const REGION_MUNICIPIOS_MAP: Record<string, string[]> = {
  // Región I (15)
  I: [
    "Adolfo Alsina",
    "Bahía Blanca",
    "Carmen de Patagones",
    "Coronel Dorrego",
    "Coronel Pringles",
    "Coronel Rosales",
    "Coronel Suárez",
    "Guaminí",
    "Monte Hermoso",
    "Pellegrini",
    "Puan",
    "Saavedra",
    "Tornquist",
    "Tres Arroyos",
    "Villarino",
  ],
  // Región II (12)
  II: [
    "9 de Julio",
    "Carlos Casares",
    "Carlos Tejedor",
    "Daireaux",
    "General Villegas",
    "Henderson (Hipólito Yrigoyen)",
    "Hipólito Yrigoyen",
    "Pehuajó",
    "Rivadavia",
    "Salliqueló",
    "Trenque Lauquen",
    "Tres Lomas",
  ],
  // Región III (8)
  III: [
    "Chacabuco",
    "Florentino Ameghino",
    "General Arenales",
    "General Pinto",
    "General Viamonte",
    "Junín",
    "Leandro N. Alem",
    "Lincoln",
  ],
  // Región IV (13)
  IV: [
    "Arrecifes",
    "Baradero",
    "Capitán Sarmiento",
    "Carmen de Areco",
    "Colón",
    "Pergamino",
    "Ramallo",
    "Rojas",
    "Salto",
    "San Andrés de Giles",
    "San Antonio de Areco",
    "San Nicolás",
    "San Pedro",
  ],
  // Región V (13)
  V: [
    "Campana",
    "Escobar",
    "Exaltación de la Cruz",
    "General San Martín",
    "José C. Paz",
    "Malvinas Argentinas",
    "Pilar",
    "San Fernando",
    "San Isidro",
    "San Miguel",
    "Tigre",
    "Vicente López",
    "Zárate",
  ],
  // Región VI (9)
  VI: [
    "Almirante Brown",
    "Avellaneda",
    "Berazategui",
    "Esteban Echeverría",
    "Ezeiza",
    "Florencio Varela",
    "Lanús",
    "Lomas de Zamora",
    "Quilmes",
  ],
  // Región VII (10)
  VII: [
    "General Las Heras",
    "General Rodríguez",
    "Hurlingham",
    "Ituzaingó",
    "Luján",
    "Marcos Paz",
    "Merlo",
    "Moreno",
    "Morón",
    "Tres de Febrero",
  ],
  // Región VIII (16)
  VIII: [
    "Ayacucho",
    "Balcarce",
    "General Alvarado",
    "General Guido",
    "General Juan Madariaga",
    "General Lavalle",
    "General Pueyrredón",
    "La Costa",
    "Lobería",
    "Maipú",
    "Mar Chiquita",
    "Necochea",
    "Pinamar",
    "San Cayetano",
    "Tandil",
    "Villa Gesell",
  ],
  // Región IX (10)
  IX: [
    "Adolfo Gonzales Chaves",
    "Azul",
    "Benito Juárez",
    "Bolívar",
    "General Alvear",
    "General La Madrid",
    "Laprida",
    "Las Flores",
    "Olavarría",
    "Tapalqué",
  ],
  // Región X (10)
  X: [
    "25 de Mayo",
    "Alberti",
    "Bragado",
    "Chivilcoy",
    "Lobos",
    "Mercedes",
    "Navarro",
    "Roque Pérez",
    "Saladillo",
    "Suipacha",
  ],
  // Región XI (18)
  XI: [
    "Berisso",
    "Brandsen",
    "Cañuelas",
    "Castelli",
    "Chascomús",
    "Dolores",
    "Ensenada",
    "General Belgrano",
    "General Paz",
    "La Plata",
    "Lezama",
    "Magdalena",
    "Monte",
    "Pila",
    "Presidente Perón",
    "Punta Indio",
    "San Vicente",
    "Tordillo",
  ],
  // Región XII (1)
  XII: ["La Matanza"],
};

export const MUNICIPIOS_PBA: MunicipioPBA[] = Object.entries(
  REGION_MUNICIPIOS_MAP
)
  .flatMap(([regionCode, names]) =>
    names.map((name) => ({ name, regionCode }))
  )
  .sort((a, b) => a.name.localeCompare(b.name, "es"));

export function getMunicipiosByRegion(regionCode?: string): MunicipioPBA[] {
  if (!regionCode) return MUNICIPIOS_PBA;
  const normalized = regionCode.trim().toUpperCase();
  const filtered = MUNICIPIOS_PBA.filter((m) => m.regionCode === normalized);
  return filtered.length > 0 ? filtered : MUNICIPIOS_PBA;
}

export function normalizeRegionCode(raw?: string | null): string {
  if (!raw) return "";
  const cleaned = raw
    .trim()
    .toUpperCase()
    .replace(/^REGI[OÓ]N(\s+SANITARIA)?\s*/i, "");
  const arabicMap: Record<string, string> = {
    "1": "I",
    "2": "II",
    "3": "III",
    "4": "IV",
    "5": "V",
    "6": "VI",
    "7": "VII",
    "8": "VIII",
    "9": "IX",
    "10": "X",
    "11": "XI",
    "12": "XII",
  };
  const candidate = arabicMap[cleaned] || cleaned;
  return REGIONES_SANITARIAS.some((r) => r.code === candidate) ? candidate : "";
}
