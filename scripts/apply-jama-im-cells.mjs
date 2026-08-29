#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "data");
const CELLS_PATH = process.argv[2] || "/tmp/openalex-hms/jama-im-cells.json";

const institutionsFile = JSON.parse(await readFile(join(DATA, "institutions.json"), "utf8"));
const editorsFile = JSON.parse(await readFile(join(DATA, "editors.json"), "utf8"));
const part = JSON.parse(await readFile(join(DATA, "bundle-parts/jama-im.json"), "utf8"));
const meta = JSON.parse(await readFile(join(DATA, "bundle-parts/meta.json"), "utf8"));
const cells = JSON.parse(await readFile(CELLS_PATH, "utf8"));

const groupById = Object.fromEntries(institutionsFile.groups.map((g) => [g.id, g]));
const editors = editorsFile.byJournal["jama-im"];
const usedGroupIds = [
  ...new Set(editors.map((e) => e.institutionGroupId).filter((id) => id && groupById[id])),
];
const trackedInstitutions = usedGroupIds.map((id) => groupById[id]);
const harvard = groupById["harvard-hms"];
if (!harvard) throw new Error("harvard-hms missing from institutions.json");
const harvardId = harvard.members[0].openAlexId;

const series = part.series.map((pt) => {
  const cell = cells[pt.year] || cells[String(pt.year)];
  if (!cell) throw new Error(`no cell for ${pt.year} in ${CELLS_PATH}`);
  const journalArticles = cell.totalArticles ?? pt.journalArticles;
  const byInstitution = {};
  for (const group of trackedInstitutions) {
    if (group.id === "harvard-hms") {
      let articles = 0;
      for (const m of group.members) articles += cell.institutions[m.openAlexId] || 0;
      byInstitution[group.id] = {
        articles,
        share: journalArticles > 0 ? articles / journalArticles : 0,
        controlArticles: 0,
        controlTotal: 0,
        controlShare: 0,
      };
      continue;
    }
    const prev = pt.byInstitution[group.id];
    if (!prev) throw new Error(`${pt.year} missing ${group.id}`);
    byInstitution[group.id] = prev;
  }
  return { year: pt.year, journalArticles, byInstitution };
});

const out = {
  journal: part.journal,
  editors,
  series,
  trackedInstitutions,
};

await writeFile(join(DATA, "bundle-parts/jama-im.json"), JSON.stringify(out, null, 2) + "\n");

meta.institutions = institutionsFile.groups;
meta.fetchedAt = new Date().toISOString();
await writeFile(join(DATA, "bundle-parts/meta.json"), JSON.stringify(meta, null, 2) + "\n");

const y23 = series.find((p) => p.year === 2023).byInstitution["harvard-hms"];
const y24 = series.find((p) => p.year === 2024).byInstitution["harvard-hms"];
console.log(`wrote jama-im.json harvard-hms ${harvardId} 2023=${y23.articles} 2024=${y24.articles}`);
if (y23.articles < 1 || y24.articles < 1) {
  console.error("Harvard JAMA IM counts must be non-zero in 2023 and 2024");
  process.exit(1);
}
