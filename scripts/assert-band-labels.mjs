#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const {
  BAND_LABEL_HANG,
  BAND_LABEL_PAD,
  SHARE_OG_LAYOUT,
  clampBandRuleYear,
  fitOgBandLabels,
  fitShareChartBandLabels,
  shareChartPlotLeft,
  tenureBands,
  yearToX,
} = await import("../src/lib/chart-marks.ts");

const WIDTHS = [
  { name: "desktop-1280", container: 928, fontSize: 11 },
  { name: "desktop-1440", container: 928, fontSize: 11 },
  { name: "phone-390", container: 342, fontSize: 10 },
];

const SPOT = {
  jacc: ["Parmley", "DeMaria", "Fuster", "Krumholz"],
  "jama-im": ["Dalen", "Greenland", "Redberg", "Inouye"],
  nejm: ["Drazen", "Rubin"],
  cid: ["Gorbach", "Schooley", "Sax"],
  jasn: ["Tisher", "Couser", "Neilson", "Nath", "Briggs", "Mehrotra"],
  jco: ["Canellos", "Haller", "Cannistra", "Friedberg"],
  jama: ["DeAngelis", "Bauchner", "Fontanarosa", "Bibbins-Domingo"],
};

const errors = [];
const HANG_TOL = 0.6;

function bandForLabel(bands, text) {
  return bands.find((item) => item.shortLabel === text || item.shortLabel.startsWith(`${text} `));
}

function checkHang(journalId, widthName, plotLeft, plotWidth, yearStart, yearEnd, bands, placed) {
  for (const label of placed) {
    const band = bandForLabel(bands, label.text);
    const ruleX = band
      ? yearToX(clampBandRuleYear(band.startYear, yearStart), yearStart, yearEnd, plotLeft, plotWidth)
      : Number.NaN;
    if (!Number.isFinite(ruleX) || label.x + HANG_TOL < ruleX + BAND_LABEL_HANG) {
      errors.push(
        `${journalId} ${widthName}: "${label.text}" x ${label.x} is left of hang-right ${ruleX + BAND_LABEL_HANG}`
      );
    }
  }
}

function checkFrame(journalId, widthName, leftLimit, rightLimit, placed) {
  for (const label of placed) {
    if (label.x + 1e-6 < leftLimit + BAND_LABEL_PAD) {
      errors.push(`${journalId} ${widthName}: "${label.text}" left ${label.x} clips the first letter`);
    }
    if (label.x + label.width > rightLimit - BAND_LABEL_PAD + 1e-6) {
      errors.push(
        `${journalId} ${widthName}: "${label.text}" right ${label.x + label.width} clips past frame ${rightLimit}`
      );
    }
  }
}

function checkBaseline(journalId, widthName, placed) {
  if (!placed.length) return;
  const y0 = placed[0].y;
  for (const label of placed) {
    if (Math.abs(label.y - y0) > 1e-6 || label.row !== 0) {
      errors.push(
        `${journalId} ${widthName}: "${label.text}" y ${label.y} row ${label.row} is not on the shared baseline ${y0}`
      );
    }
  }
}

function checkOverlap(journalId, widthName, placed) {
  for (let i = 0; i < placed.length; i += 1) {
    for (let j = i + 1; j < placed.length; j += 1) {
      const a = placed[i];
      const b = placed[j];
      const overlap = a.x < b.x + b.width && a.x + a.width > b.x;
      if (overlap) {
        errors.push(`${journalId} ${widthName}: "${a.text}" overlaps "${b.text}"`);
      }
    }
  }
}

function checkSpot(journalId, widthName, placed) {
  for (const text of SPOT[journalId] ?? []) {
    if (!placed.some((label) => label.text === text || label.text.startsWith(`${text} `))) {
      errors.push(`${journalId} ${widthName}: missing required label "${text}"`);
    }
  }
}

function checkDomain(journalId, widthName, domainStart, yearStart) {
  if (domainStart !== yearStart) {
    errors.push(
      `${journalId} ${widthName}: domainStart ${domainStart} must equal series yearStart ${yearStart}`
    );
  }
}

function checkSourcedWindows(journalId, editors, yearStart, yearEnd, bands) {
  for (const editor of editors) {
    if (editor.role === "deputy" || editor.startYear == null || !editor.sources?.length) continue;
    const coverStart = Math.max(editor.startYear, yearStart);
    const coverEnd = Math.min(editor.endYear ?? yearEnd, yearEnd);
    if (coverStart > coverEnd) continue;
    const band = bands.find((item) => item.name === editor.name);
    if (!band) {
      errors.push(
        `${journalId}: sourced window "${editor.name}" ${coverStart}–${coverEnd} has no band`
      );
      continue;
    }
    if (band.visibleStart > coverStart || band.endYear < coverEnd) {
      errors.push(
        `${journalId}: band for "${editor.name}" is ${band.visibleStart}–${band.endYear}, expected to cover ${coverStart}–${coverEnd}`
      );
    }
  }
}

const ids = [
  "jama",
  "jama-im",
  "nejm",
  "jacc",
  "circulation",
  "ehj",
  "ajrccm",
  "chest",
  "jco",
  "cid",
  "jasn",
];

for (const id of ids) {
  const row = JSON.parse(await readFile(join(ROOT, `data/bundle-parts/${id}.json`), "utf8"));
  const yearStart = row.series[0]?.year ?? 0;
  const yearEnd = row.series.at(-1)?.year ?? yearStart;
  const bands = tenureBands(row.editors, yearStart, yearEnd);
  checkSourcedWindows(id, row.editors, yearStart, yearEnd, bands);
  for (const width of WIDTHS) {
    const fitted = fitShareChartBandLabels(bands, yearStart, yearEnd, width.container, width.fontSize);
    checkDomain(id, width.name, fitted.domainStart, yearStart);
    checkHang(id, width.name, 0, fitted.plotWidth, yearStart, yearEnd, bands, fitted.labels);
    checkFrame(id, width.name, 0, width.container - shareChartPlotLeft(), fitted.labels);
    checkBaseline(id, width.name, fitted.labels);
    checkOverlap(id, width.name, fitted.labels);
    checkSpot(id, width.name, fitted.labels);
  }
  const og = fitOgBandLabels(bands, yearStart, yearEnd);
  checkDomain(id, "og-card", og.domainStart, yearStart);
  checkHang(id, "og-card", SHARE_OG_LAYOUT.plotLeft, og.plotWidth, yearStart, yearEnd, bands, og.labels);
  checkFrame(id, "og-card", 0, SHARE_OG_LAYOUT.frameWidth, og.labels);
  checkBaseline(id, "og-card", og.labels);
  checkOverlap(id, "og-card", og.labels);
  checkSpot(id, "og-card", og.labels);
}

if (errors.length) {
  console.error("band labels fail the hang, clip, baseline, and overlap checks:");
  for (const line of errors) console.error(`  ${line}`);
  process.exit(1);
}

console.log(
  "band labels hang right of each clamped rule, share one baseline, do not overlap, keep the series domain, cover sourced windows including null-home, and stay inside the frame at 1280/1440/390 and on OG cards for all eleven journals"
);
