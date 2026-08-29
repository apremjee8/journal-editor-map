const PALETTE = [
  "#b91c1c",
  "#1d4ed8",
  "#0f766e",
  "#7c3aed",
  "#c2410c",
  "#166534",
  "#be185d",
  "#0e7490",
];

export const INSTITUTION_COLORS: Record<string, string> = {
  "johns-hopkins": "#1d4ed8",
  "boston-university": "#b91c1c",
  ucsf: "#0f766e",
  "harvard-brigham": "#9f1239",
  "harvard-hms": "#9f1239",
  "hebrew-seniorlife": "#7c3aed",
  "mount-sinai": "#6d28d9",
  ucsd: "#0e7490",
  utsw: "#c2410c",
  northwestern: "#5b21b6",
  yale: "#1e3a8a",
  zurich: "#1d4ed8",
  "cattolica-gemelli": "#9f1239",
  arizona: "#9a3412",
  leuven: "#1d4ed8",
  "ut-houston": "#c2410c",
  imperial: "#1e3a8a",
  "royal-brompton": "#166534",
  "umd-baltimore": "#be185d",
  loyola: "#9f1239",
  "colorado-denver": "#b45309",
  "weill-cornell": "#b91c1c",
  umass: "#9f1239",
  "cleveland-clinic": "#1e3a8a",
  "dana-farber": "#9f1239",
  penn: "#1e3a8a",
  bidmc: "#0e7490",
  rochester: "#7c3aed",
  washington: "#4c1d95",
};

export function instColor(id: string, cohort: string[] = []): string {
  if (cohort.length > 1) {
    const i = cohort.indexOf(id);
    if (i >= 0) return PALETTE[i % PALETTE.length];
  }
  return INSTITUTION_COLORS[id] ?? PALETTE[0];
}
