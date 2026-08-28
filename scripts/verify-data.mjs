#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REQUIRED = [
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

const PARTS = join(ROOT, "data/bundle-parts");
let bundle;
try {
  bundle = JSON.parse(await readFile(join(ROOT, "data/bundle.json"), "utf8"));
} catch {
  const meta = JSON.parse(await readFile(join(PARTS, "meta.json"), "utf8"));
  const ids = REQUIRED;
  bundle = {
    ...meta,
    journals: await Promise.all(
      ids.map(async (id) => JSON.parse(await readFile(join(PARTS, `${id}.json`), "utf8")))
    ),
  };
}
const errors = [];

if (bundle.workType !== "article") errors.push("workType must be article");
if (!bundle.fetchedAt) errors.push("missing fetchedAt");

const ids = bundle.journals.map((j) => j.journal.id);
for (const id of REQUIRED) {
  if (!ids.includes(id)) errors.push(`missing journal ${id}`);
}

for (const j of bundle.journals) {
  const label = j.journal.id;
  if (!j.journal.openAlexId || !j.journal.issnL) {
    errors.push(`${label}: missing OpenAlex id or issn_l`);
  }
  if (!j.series?.length) errors.push(`${label}: empty series`);
  const eics = (j.editors || []).filter((e) => e.role === "eic" || e.role === "interim-eic");
  if (!eics.length) errors.push(`${label}: no editor records`);
  const dated = eics.filter((e) => e.startYear != null || e.gapReason);
  if (dated.length !== eics.length) {
    errors.push(`${label}: editor without a year or a gapReason`);
  }
  for (const editor of eics) {
    if (editor.startYear == null) continue;
    const urls = (editor.sources || []).filter((s) => typeof s.url === "string" && s.url.startsWith("http"));
    if (!urls.length) errors.push(`${label}: ${editor.name} has a start year but no source URL`);
  }
  for (const pt of j.series) {
    if (typeof pt.journalArticles !== "number") {
      errors.push(`${label} ${pt.year}: bad journalArticles`);
    }
    for (const inst of j.trackedInstitutions) {
      const row = pt.byInstitution?.[inst.id];
      if (!row) errors.push(`${label} ${pt.year}: missing ${inst.id}`);
      else if (row.share < 0 || row.share > 1) errors.push(`${label} ${pt.year}: share out of range`);
    }
  }
  const zeros = j.series.filter((p) => p.journalArticles === 0).length;
  if (zeros === j.series.length) errors.push(`${label}: all years have zero articles`);
}

if (errors.length) {
  console.error("FAIL");
  for (const e of errors) console.error(" -", e);
  process.exit(1);
}

console.log("PASS");
console.log(`journals=${bundle.journals.length} fetchedAt=${bundle.fetchedAt}`);
for (const j of bundle.journals) {
  const years = `${j.series[0].year}-${j.series[j.series.length - 1].year}`;
  const eics = j.editors.filter((e) => e.startYear != null).map((e) => e.name).join("; ");
  console.log(`${j.journal.id} ${years} n=${j.series.length} editors=${eics}`);
}
