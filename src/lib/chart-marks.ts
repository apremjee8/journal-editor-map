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

export const SHARE_CHART_LAYOUT = {
  marginRight: 12,
  marginBottom: 28,
  marginLeft: 8,
  yAxisWidth: 48,
  xPad: 8,
} as const;

export type PlacedBandLabel = {
  text: string;
  institutionId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  row: number;
};

const LABEL_PAD = 4;
const LABEL_HANG = 8;
const LABEL_GUTTER = 10;
const WIDTH_PER_EM = 0.68;

export function shareChartPlotLeft(): number {
  return SHARE_CHART_LAYOUT.marginLeft + SHARE_CHART_LAYOUT.yAxisWidth + SHARE_CHART_LAYOUT.xPad;
}

export function shareChartPlotWidth(containerWidth: number): number {
  return Math.max(
    0,
    containerWidth -
      SHARE_CHART_LAYOUT.marginLeft -
      SHARE_CHART_LAYOUT.yAxisWidth -
      SHARE_CHART_LAYOUT.marginRight -
      SHARE_CHART_LAYOUT.xPad * 2
  );
}

export function estimateLabelWidth(text: string, fontSize: number): number {
  return Math.ceil(Math.max(text.length, 1) * fontSize * WIDTH_PER_EM);
}

export function bandLabelStackHeight(placed: PlacedBandLabel[], fontSize: number): number {
  const rows = placed.reduce((n, label) => Math.max(n, label.row + 1), 1);
  return rows * (fontSize + 5);
}

export function placeBandLabels(
  bands: TenureBand[],
  yearStart: number,
  yearEnd: number,
  plot: { left: number; width: number; top?: number },
  fontSize: number
): PlacedBandLabel[] {
  const top = plot.top ?? 0;
  const line = fontSize + 5;
  const plotRight = plot.left + plot.width;
  const drafts = bands.map((band) => {
    const ruleX = yearToX(band.visibleStart, yearStart, yearEnd, plot.left, plot.width);
    const width = estimateLabelWidth(band.shortLabel, fontSize);
    let x = ruleX + LABEL_HANG;
    if (x + width > plotRight - LABEL_PAD) {
      x = ruleX - LABEL_HANG - width;
    }
    if (x < plot.left + LABEL_PAD) x = plot.left + LABEL_PAD;
    if (x + width > plotRight - LABEL_PAD) {
      x = Math.max(plot.left + LABEL_PAD, plotRight - LABEL_PAD - width);
    }
    return {
      text: band.shortLabel,
      institutionId: band.institutionId,
      x,
      width,
      height: fontSize,
      ruleX,
    };
  });

  const placed: PlacedBandLabel[] = [];
  const ordered = [...drafts].sort((a, b) => a.ruleX - b.ruleX || a.x - b.x);
  for (const item of ordered) {
    let row = 0;
    while (row < 8) {
      const overlaps = placed.some(
        (other) =>
          other.row === row &&
          item.x < other.x + other.width + LABEL_GUTTER &&
          item.x + item.width + LABEL_GUTTER > other.x
      );
      if (!overlaps) break;
      row += 1;
    }
    placed.push({ ...item, y: top + row * line, row });
  }
  return placed;
}

export function shareToY(sharePct: number, yMax: number, top: number, height: number): number {
  const t = yMax <= 0 ? 0 : Math.max(0, Math.min(1, sharePct / yMax));
  return top + height - t * height;
}
