import type { EditorTenure } from "./types";

export type TenureBand = {
  name: string;
  shortLabel: string;
  startYear: number;
  visibleStart: number;
  endYear: number;
  institutionId: string;
};

export function editorLastName(name: string): string {
  const cleaned = name.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  return cleaned.split(" ").at(-1) ?? name;
}

export function tenureBands(
  editors: EditorTenure[],
  yearStart: number,
  yearEnd: number
): TenureBand[] {
  return editors
    .filter(
      (editor) =>
        editor.role !== "deputy" &&
        editor.institutionGroupId &&
        editor.startYear != null
    )
    .map((editor) => {
      const startYear = editor.startYear!;
      const endYear = Math.min(editor.endYear ?? yearEnd, yearEnd);
      const visibleStart = Math.max(startYear, yearStart);
      return {
        name: editor.name,
        shortLabel: `${editorLastName(editor.name)} ${startYear}`,
        startYear,
        visibleStart,
        endYear,
        institutionId: editor.institutionGroupId!,
      };
    })
    .filter((band) => band.visibleStart <= band.endYear);
}

export function yearToX(
  year: number,
  yearStart: number,
  yearEnd: number,
  left: number,
  width: number
): number {
  if (yearEnd === yearStart) return left + width / 2;
  return left + ((year - yearStart) / (yearEnd - yearStart)) * width;
}

export function shareToY(sharePct: number, yMax: number, top: number, height: number): number {
  const t = yMax <= 0 ? 0 : Math.max(0, Math.min(1, sharePct / yMax));
  return top + height - t * height;
}
