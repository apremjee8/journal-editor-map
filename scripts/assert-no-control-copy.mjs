#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const FILES = [
  "src/components/share-chart.tsx",
  "src/components/editor-timeline.tsx",
  "src/components/journal-app.tsx",
  "src/components/site-nav.tsx",
  "src/components/trends-page.tsx",
  "scripts/assert-band-labels.mjs",
  "src/app/j/[id]/page.tsx",
  "src/app/j/[id]/opengraph-image.tsx",
  "src/app/trends/page.tsx",
  "src/app/layout.tsx",
  "src/lib/site.ts",
  "src/lib/takeover.ts",
  "src/lib/trends.ts",
  "src/lib/chart-marks.ts",
  "src/lib/colors.ts",
  "README.md",
  "data/bundle-parts/meta.json",
  "scripts/fetch-openalex.mjs",
];

const FORBIDDEN = [
  /\bcontrol\b/i,
  /other journals/i,
  /\bdashed\b/i,
  /CONTROL_LABEL/,
];

const ALLOWED = [
  /controlArticles/,
  /controlTotal/,
  /controlShare/,
];

const errors = [];

for (const rel of FILES) {
  const text = await readFile(join(ROOT, rel), "utf8");
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    if (ALLOWED.some((re) => re.test(line)) && !/CONTROL_LABEL|other journals|dashed/i.test(line)) {
      return;
    }
    for (const re of FORBIDDEN) {
      if (re.test(line)) {
        errors.push(`${rel}:${i + 1}: ${line.trim()}`);
      }
    }
  });
}

if (errors.length) {
  console.error("visitor-facing control copy still present:");
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}

console.log("no visitor-facing control copy in page, chart, card, or README");
