#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { placeBandLabels, tenureBands, shareChartPlotWidth } = await import(
  "../src/lib/chart-marks.ts"
);

const WIDTHS = [
  { name: "desktop-1280", container: 928, fontSize: 11 },
  { name: "desktop-1440", container: 928, fontSize: 11 },
  { name: "phone-390", container: 342, fontSize: 10 },
];

const SPOT = {
  jacc: ["Parmley 1992", "Krumholz 2024"],
  "jama-im": ["Dalen 1988"],
  nejm: ["Drazen 2000"],
};

const errors = [];

function checkPlacement(journalId, widthName, plotWidth, fontSize, placed) {
  const right = plotWidth;
  for (const label of placed) {
    if (label.x < 8) {
      errors.push(`${journalId} ${widthName}: "${label.text}" left ${label.x} is flush with the clip`);
    }
    if (label.x + label.width > right - 8) {
      errors.push(
        `${journalId} ${widthName}: "${label.text}" right ${label.x + label.width} exceeds plot ${right}`
      );
    }
    if (label.x < 0 || label.x + label.width > right) {
      errors.push(`${journalId} ${widthName}: "${label.text}" is outside the plot`);
    }
  }
  for (let i = 0; i < placed.length; i += 1) {
    for (let j = i + 1; j < placed.length; j += 1) {
      const a = placed[i];
      const b = placed[j];
      if (a.row !== b.row) continue;
      const overlap = a.x < b.x + b.width + 8 && a.x + a.width + 8 > b.x;
      if (overlap) {
        errors.push(`${journalId} ${widthName}: "${a.text}" overlaps "${b.text}"`);
      }
    }
  }
  const wanted = SPOT[journalId] ?? [];
  for (const text of wanted) {
    if (!placed.some((label) => label.text === text)) {
      errors.push(`${journalId} ${widthName}: missing required label "${text}"`);
    }
  }
}

const ids = [
  "jama",
  "jama-im",
  "nejm",
  "jacc",
  "circulation",
  "jama-cardio",
  "ehj",
  "ajrccm",
  "chest",
  "jco",
  "lancet-onc",
  "jama-onc",
];

for (const id of ids) {
  const row = JSON.parse(await readFile(join(ROOT, `data/bundle-parts/${id}.json`), "utf8"));
  const yearStart = row.series[0]?.year ?? 0;
  const yearEnd = row.series.at(-1)?.year ?? yearStart;
  const bands = tenureBands(row.editors, yearStart, yearEnd);
  for (const width of WIDTHS) {
    const plotWidth = shareChartPlotWidth(width.container);
    const placed = placeBandLabels(bands, yearStart, yearEnd, { left: 0, width: plotWidth }, width.fontSize);
    checkPlacement(id, width.name, plotWidth, width.fontSize, placed);
  }
}

if (errors.length) {
  console.error("band labels fail the clip and overlap checks:");
  for (const line of errors) console.error(`  ${line}`);
  process.exit(1);
}

console.log("band labels stay inside the plot at 1280/1440/390 for all twelve journals");
