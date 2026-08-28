export const INSTITUTION_COLORS: Record<string, string> = {
  "johns-hopkins": "#1f4e79",
  "boston-university": "#b00020",
  "ucsf": "#0b6e4f",
  "harvard-brigham": "#a51c30",
  "harvard-hms": "#a51c30",
  "mount-sinai": "#221f73",
  "ucsd": "#182b49",
  "utsw": "#c45c12",
  "northwestern": "#4e2a84",
  "yale": "#00356b",
  zurich: "#003399",
  "cattolica-gemelli": "#8b1e3f",
  arizona: "#8b1a1a",
  leuven: "#1d4ed8",
  "ut-houston": "#bf5700",
  imperial: "#002147",
  "royal-brompton": "#0b3d2e",
  "umd-baltimore": "#e21833",
  loyola: "#922247",
  "colorado-denver": "#cfb87c",
  "weill-cornell": "#b31b1b",
  umass: "#881c1c",
  "cleveland-clinic": "#003865",
  "dana-farber": "#6f263d",
  penn: "#011f5b",
  bidmc: "#00629b",
  rochester: "#003b71",
  washington: "#4b2e83",
};

export function instColor(id: string): string {
  return INSTITUTION_COLORS[id] ?? "#334155";
}
