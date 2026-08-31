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
    .filter((editor) => editor.role !== "deputy" && editor.startYear != null)
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
        institutionId: editor.institutionGroupId ?? "",
      };
    })
    .filter((band) => band.visibleStart <= band.endYear);
}

export function bandDrawEnd(
  band: TenureBand,
  yearEnd: number,
  next?: TenureBand
): number {
  if (band.endYear >= yearEnd) return yearEnd;
  if (next && next.visibleStart <= band.endYear) return band.endYear;
  return Math.min(yearEnd, band.endYear + 1);
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
  xPad: 14,
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

export const BAND_LABEL_PAD = 8;
export const BAND_LABEL_HANG = 10;
const LABEL_GUTTER = 2;
const WIDTH_PER_EM = 0.68;

export const SHARE_OG_LAYOUT = {
  frameWidth: 1104,
  frameHeight: 292,
  plotLeft: 28,
  plotTop: 10,
  plotWidth: 1040,
  plotHeight: 246,
  fontSize: 16,
} as const;

export function shareChartPlotLeft(): number {
  return SHARE_CHART_LAYOUT.marginLeft + SHARE_CHART_LAYOUT.yAxisWidth + SHARE_CHART_LAYOUT.xPad;
}

export function shareChartPlotWidth(
  containerWidth: number,
  marginRight: number = SHARE_CHART_LAYOUT.marginRight
): number {
  return Math.max(
    0,
    containerWidth -
      SHARE_CHART_LAYOUT.marginLeft -
      SHARE_CHART_LAYOUT.yAxisWidth -
      marginRight -
      SHARE_CHART_LAYOUT.xPad * 2
  );
}

export function estimateLabelWidth(text: string, fontSize: number): number {
  return Math.max(1, Math.round(Math.max(text.length, 1) * fontSize * WIDTH_PER_EM));
}

export function bandLabelStackHeight(placed: PlacedBandLabel[], fontSize: number): number {
  const rows = placed.reduce((n, label) => Math.max(n, label.row + 1), 1);
  return rows * (fontSize + 5);
}

export function labelDomainStart(_bands: TenureBand[], seriesStart: number): number {
  return seriesStart;
}

export function clampBandRuleYear(startYear: number, seriesStart: number): number {
  return Math.max(startYear, seriesStart);
}

function labelStem(text: string): string {
  return text.replace(/ \d{4}$/, "");
}

function labelsOverlap(labels: PlacedBandLabel[]): boolean {
  for (let i = 0; i < labels.length; i += 1) {
    for (let j = i + 1; j < labels.length; j += 1) {
      const a = labels[i];
      const b = labels[j];
      if (a.x < b.x + b.width && a.x + a.width > b.x) return true;
    }
  }
  return false;
}

function dropRightmostYear(texts: string[], labels: PlacedBandLabel[]): boolean {
  const colliding = new Set<number>();
  for (let i = 0; i < labels.length; i += 1) {
    for (let j = i + 1; j < labels.length; j += 1) {
      const a = labels[i];
      const b = labels[j];
      if (a.x < b.x + b.width && a.x + a.width > b.x) {
        colliding.add(i);
        colliding.add(j);
      }
    }
  }
  const idxs = [...colliding].sort((a, b) => b - a);
  for (const i of idxs) {
    const stem = labelStem(texts[i]);
    if (stem !== texts[i]) {
      texts[i] = stem;
      return true;
    }
  }
  return false;
}

function nudgeLabelsRight(labels: PlacedBandLabel[]): PlacedBandLabel[] {
  const ordered = [...labels].sort((a, b) => a.x - b.x || a.width - b.width);
  const placed: PlacedBandLabel[] = [];
  for (const label of ordered) {
    const prev = placed.at(-1);
    const minX = prev ? prev.x + prev.width + LABEL_GUTTER : label.x;
    placed.push({ ...label, x: Math.max(label.x, minX) });
  }
  return placed;
}

export function placeBandLabels(
  bands: TenureBand[],
  yearStart: number,
  yearEnd: number,
  plot: { left: number; width: number; top?: number },
  fontSize: number,
  texts: string[] = bands.map((band) => band.shortLabel)
): PlacedBandLabel[] {
  const top = plot.top ?? 0;
  return bands.map((band, i) => {
    const ruleX = yearToX(
      clampBandRuleYear(band.startYear, yearStart),
      yearStart,
      yearEnd,
      plot.left,
      plot.width
    );
    const text = texts[i] ?? band.shortLabel;
    return {
      text,
      institutionId: band.institutionId,
      x: ruleX + BAND_LABEL_HANG,
      y: top,
      width: estimateLabelWidth(text, fontSize),
      height: fontSize,
      row: 0,
    };
  });
}

function growSharePlot(
  bands: TenureBand[],
  domainStart: number,
  yearEnd: number,
  containerWidth: number,
  fontSize: number,
  texts: string[],
  marginRight: number,
  rightLimit: number
): { labels: PlacedBandLabel[]; plotWidth: number; marginRight: number } {
  let nextMargin = marginRight;
  let plotWidth = shareChartPlotWidth(containerWidth, nextMargin);
  let labels = placeBandLabels(bands, domainStart, yearEnd, { left: 0, width: plotWidth }, fontSize, texts);
  for (let i = 0; i < 8; i += 1) {
    const overflow = Math.max(
      0,
      ...labels.map((label) => label.x + label.width + BAND_LABEL_PAD - rightLimit)
    );
    if (overflow <= 1e-6) break;
    nextMargin += Math.ceil(overflow);
    plotWidth = shareChartPlotWidth(containerWidth, nextMargin);
    labels = placeBandLabels(bands, domainStart, yearEnd, { left: 0, width: plotWidth }, fontSize, texts);
  }
  return { labels, plotWidth, marginRight: nextMargin };
}

function fitShareChartBandLabelsAtFont(
  bands: TenureBand[],
  yearStart: number,
  yearEnd: number,
  containerWidth: number,
  fontSize: number
): { labels: PlacedBandLabel[]; plotWidth: number; marginRight: number; ok: boolean } {
  const texts = bands.map((band) => band.shortLabel);
  const rightLimit = containerWidth - shareChartPlotLeft();
  let marginRight: number = SHARE_CHART_LAYOUT.marginRight;
  let fitted = growSharePlot(
    bands,
    yearStart,
    yearEnd,
    containerWidth,
    fontSize,
    texts,
    marginRight,
    rightLimit
  );

  const overflowOf = (labels: PlacedBandLabel[]) =>
    Math.max(0, ...labels.map((label) => label.x + label.width + BAND_LABEL_PAD - rightLimit));

  for (let attempt = 0; attempt < 24; attempt += 1) {
    if (labelsOverlap(fitted.labels) && dropRightmostYear(texts, fitted.labels)) {
      fitted = growSharePlot(
        bands,
        yearStart,
        yearEnd,
        containerWidth,
        fontSize,
        texts,
        fitted.marginRight,
        rightLimit
      );
      continue;
    }
    let labels = labelsOverlap(fitted.labels) ? nudgeLabelsRight(fitted.labels) : fitted.labels;
    const overflow = overflowOf(labels);
    if (overflow > 1e-6) {
      const rightmost = [...labels].sort((a, b) => a.x + a.width - (b.x + b.width)).at(-1);
      const idx = rightmost ? texts.findIndex((text) => text === rightmost.text) : -1;
      if (idx >= 0 && labelStem(texts[idx]) !== texts[idx]) {
        texts[idx] = labelStem(texts[idx]);
        fitted = growSharePlot(
          bands,
          yearStart,
          yearEnd,
          containerWidth,
          fontSize,
          texts,
          fitted.marginRight,
          rightLimit
        );
        continue;
      }
      const nextMargin = fitted.marginRight + Math.ceil(overflow);
      if (nextMargin === fitted.marginRight || shareChartPlotWidth(containerWidth, nextMargin) <= 0) {
        return { labels, plotWidth: fitted.plotWidth, marginRight: fitted.marginRight, ok: false };
      }
      marginRight = nextMargin;
      fitted = growSharePlot(
        bands,
        yearStart,
        yearEnd,
        containerWidth,
        fontSize,
        texts,
        marginRight,
        rightLimit
      );
      continue;
    }
    if (!labelsOverlap(labels)) {
      return { labels, plotWidth: fitted.plotWidth, marginRight: fitted.marginRight, ok: true };
    }
    labels = nudgeLabelsRight(labels);
    if (!labelsOverlap(labels) && overflowOf(labels) <= 1e-6) {
      return { labels, plotWidth: fitted.plotWidth, marginRight: fitted.marginRight, ok: true };
    }
  }

  const labels = nudgeLabelsRight(fitted.labels);
  return {
    labels,
    plotWidth: fitted.plotWidth,
    marginRight: fitted.marginRight,
    ok: !labelsOverlap(labels) && overflowOf(labels) <= 1e-6,
  };
}

export function fitShareChartBandLabels(
  bands: TenureBand[],
  yearStart: number,
  yearEnd: number,
  containerWidth: number,
  fontSize: number
): {
  labels: PlacedBandLabel[];
  plotWidth: number;
  marginRight: number;
  domainStart: number;
  fontSize: number;
} {
  const domainStart = yearStart;
  let last = fitShareChartBandLabelsAtFont(bands, yearStart, yearEnd, containerWidth, fontSize);
  let usedFont = fontSize;
  while (!last.ok && usedFont > 8) {
    usedFont -= 1;
    last = fitShareChartBandLabelsAtFont(bands, yearStart, yearEnd, containerWidth, usedFont);
  }
  return {
    labels: last.labels,
    plotWidth: last.plotWidth,
    marginRight: last.marginRight,
    domainStart,
    fontSize: usedFont,
  };
}

export function fitOgBandLabels(
  bands: TenureBand[],
  yearStart: number,
  yearEnd: number
): { labels: PlacedBandLabel[]; plotWidth: number; domainStart: number } {
  const { plotLeft, plotTop, plotWidth: initialWidth, fontSize, frameWidth } = SHARE_OG_LAYOUT;
  const domainStart = yearStart;
  const texts = bands.map((band) => band.shortLabel);
  const rightLimit = frameWidth - BAND_LABEL_PAD;
  const plot = (width: number, nextTexts: string[]) =>
    placeBandLabels(
      bands,
      domainStart,
      yearEnd,
      { left: plotLeft, width, top: plotTop + 4 },
      fontSize,
      nextTexts
    );

  let plotWidth: number = initialWidth;
  let labels = plot(plotWidth, texts);
  const shrinkToFit = (nextTexts: string[]) => {
    for (let i = 0; i < 8; i += 1) {
      const overflow = Math.max(
        0,
        ...labels.map((label) => label.x + label.width + BAND_LABEL_PAD - rightLimit)
      );
      if (overflow <= 1e-6) break;
      plotWidth = Math.max(0, plotWidth - Math.ceil(overflow));
      labels = plot(plotWidth, nextTexts);
    }
  };
  shrinkToFit(texts);

  for (let attempt = 0; attempt < 16; attempt += 1) {
    if (!labelsOverlap(labels)) return { labels, plotWidth, domainStart };
    if (!dropRightmostYear(texts, labels)) break;
    labels = plot(plotWidth, texts);
    shrinkToFit(texts);
  }

  labels = nudgeLabelsRight(labels);
  for (let i = 0; i < 8; i += 1) {
    const overflow = Math.max(
      0,
      ...labels.map((label) => label.x + label.width + BAND_LABEL_PAD - rightLimit)
    );
    if (overflow <= 1e-6) break;
    plotWidth = Math.max(0, plotWidth - Math.ceil(overflow));
    labels = nudgeLabelsRight(plot(plotWidth, texts));
  }
  return { labels, plotWidth, domainStart };
}

export function shareToY(sharePct: number, yMax: number, top: number, height: number): number {
  const t = yMax <= 0 ? 0 : Math.max(0, Math.min(1, sharePct / yMax));
  return top + height - t * height;
}
