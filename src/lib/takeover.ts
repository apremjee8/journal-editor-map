import type { EditorTenure, YearPoint } from "./types";

export type TakeoverRow = {
  name: string;
  institutionId: string;
  institutionLabel: string;
  startYear: number;
  beforeShare: number | null;
  afterShare: number | null;
  window: string;
};

function mean(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function takeoverRows(
  editors: EditorTenure[],
  series: YearPoint[],
  labels: Record<string, string>
): TakeoverRow[] {
  const byYear = new Map(series.map((p) => [p.year, p]));
  const rows: TakeoverRow[] = [];

  for (const editor of editors) {
    if (editor.role === "deputy") continue;
    if (editor.startYear == null || !editor.institutionGroupId) continue;
    const start = editor.startYear;
    const beforeYears = [start - 2, start - 1].filter((y) => byYear.has(y));
    const afterYears = [start, start + 1, start + 2].filter((y) => byYear.has(y));
    if (!afterYears.length) continue;

    const pick = (years: number[]) =>
      mean(
        years
          .map((y) => byYear.get(y)?.byInstitution[editor.institutionGroupId!]?.share)
          .filter((n): n is number => typeof n === "number")
      );

    rows.push({
      name: editor.name,
      institutionId: editor.institutionGroupId,
      institutionLabel: labels[editor.institutionGroupId] ?? editor.institutionGroupId,
      startYear: start,
      beforeShare: pick(beforeYears),
      afterShare: pick(afterYears),
      window: `${beforeYears[0] ?? "n/a"}–${beforeYears.at(-1) ?? "n/a"} vs ${afterYears[0]}–${afterYears.at(-1)}`,
    });
  }
  return rows;
}

export function latestScoredHandover(rows: TakeoverRow[]): TakeoverRow | null {
  const scored = rows.filter(
    (row) => row.beforeShare != null && row.afterShare != null
  );
  if (!scored.length) return null;
  return scored.reduce((best, row) => (row.startYear >= best.startYear ? row : best));
}

export function handoverClaim(row: TakeoverRow, formatShare: (n: number) => string): string {
  return `When ${row.name} became EIC, ${row.institutionLabel} share went from ${formatShare(row.beforeShare!)} to ${formatShare(row.afterShare!)}.`;
}

export function handoverFallback(): string {
  return "Sourced EIC windows are shaded. This title has no before-and-after share in the series.";
}
