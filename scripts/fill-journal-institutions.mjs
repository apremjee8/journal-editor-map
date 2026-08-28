#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "data");
const MAILTO = "akiff-editor-share@local.dev";
const UA = `editor-share/0.1 (mailto:${MAILTO})`;
const DELAY_MS = 400;
const MAX_RETRIES = 12;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  let lastErr;
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(30000),
      });
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`HTTP ${res.status} ${url}`);
        const wait = res.status === 429 ? 20000 * (i + 1) : 800 * 2 ** i;
        await sleep(wait);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      return res.json();
    } catch (err) {
      lastErr = err;
      await sleep(800 * 2 ** i);
    }
  }
  throw lastErr;
}

function sourceFilter(journal) {
  const ids = [journal.openAlexId, ...(journal.predecessorOpenAlexIds || [])];
  return ids.join("|");
}

async function fetchExact(journal, year, institutionId) {
  const filter = [
    `primary_location.source.id:${sourceFilter(journal)}`,
    `publication_year:${year}`,
    "type:article",
    `institutions.id:${institutionId}`,
  ].join(",");
  const url =
    `https://api.openalex.org/works?filter=${encodeURIComponent(filter)}&per-page=1`;
  const data = await getJson(url);
  return data.meta?.count ?? 0;
}

const journalId = process.argv[2];
const fillIds = process.argv.slice(3);
if (!journalId || !fillIds.length) {
  console.error("usage: node scripts/fill-journal-institutions.mjs <journalId> <openAlexId>…");
  process.exit(1);
}

const journalsFile = JSON.parse(await readFile(join(DATA, "journals.json"), "utf8"));
const institutionsFile = JSON.parse(await readFile(join(DATA, "institutions.json"), "utf8"));
const editorsFile = JSON.parse(await readFile(join(DATA, "editors.json"), "utf8"));
const journal = journalsFile.journals.find((j) => j.id === journalId);
if (!journal) {
  console.error(`unknown journal ${journalId}`);
  process.exit(1);
}

const yearStart = Math.max(journalsFile.yearStart, journal.firstYear);
const yearEnd = journalsFile.yearEnd;
const fillsPath = join(DATA, `${journalId}-institution-fills.json`);
let fills = { journalId, fetchedAt: null, cells: {} };
try {
  fills = JSON.parse(await readFile(fillsPath, "utf8"));
} catch {
  fills = { journalId, fetchedAt: null, cells: {} };
}

for (let year = yearStart; year <= yearEnd; year++) {
  const key = String(year);
  if (!fills.cells[key]) fills.cells[key] = {};
  for (const id of fillIds) {
    if (fills.cells[key][id] != null) continue;
    process.stdout.write(`exact ${journalId}|${year} ${id} … `);
    const n = await fetchExact(journal, year, id);
    fills.cells[key][id] = n;
    fills.fetchedAt = new Date().toISOString();
    await writeFile(fillsPath, JSON.stringify(fills, null, 2) + "\n");
    console.log(n);
    await sleep(DELAY_MS);
  }
}

const partPath = join(DATA, "bundle-parts", `${journalId}.json`);
const part = JSON.parse(await readFile(partPath, "utf8"));
const editors = editorsFile.byJournal[journalId] || [];
const groupById = Object.fromEntries(institutionsFile.groups.map((g) => [g.id, g]));
const usedGroupIds = [
  ...new Set(editors.map((e) => e.institutionGroupId).filter((id) => id && groupById[id])),
];
const trackedInstitutions = usedGroupIds.map((id) => groupById[id]);
const requested = new Set(fillIds);

function articlesForGroup(group, yearFills, existing, year) {
  const needed = group.members.filter((m) => requested.has(m.openAlexId));
  if (needed.length) {
    let articles = 0;
    for (const m of group.members) {
      const n = yearFills[m.openAlexId];
      if (n == null) {
        throw new Error(`missing fill for ${group.id} ${m.openAlexId} ${year}`);
      }
      articles += n;
    }
    return articles;
  }
  if (!existing) {
    throw new Error(`no existing series for ${group.id} ${year}`);
  }
  return existing.articles;
}

for (const pt of part.series) {
  const yearFills = fills.cells[String(pt.year)] || {};
  const next = {};
  for (const group of trackedInstitutions) {
    const existing = pt.byInstitution[group.id];
    const articles = articlesForGroup(group, yearFills, existing, pt.year);
    const share = pt.journalArticles > 0 ? articles / pt.journalArticles : 0;
    next[group.id] = {
      articles,
      share,
      controlArticles: existing?.controlArticles ?? 0,
      controlTotal: existing?.controlTotal ?? 0,
      controlShare: existing?.controlShare ?? 0,
    };
  }
  pt.byInstitution = next;
}

part.journal = journal;
part.editors = editors;
part.trackedInstitutions = trackedInstitutions;
await writeFile(partPath, JSON.stringify(part, null, 2) + "\n");

const metaPath = join(DATA, "bundle-parts", "meta.json");
const meta = JSON.parse(await readFile(metaPath, "utf8"));
meta.institutions = institutionsFile.groups;
if (fills.fetchedAt) meta.fetchedAt = fills.fetchedAt;
await writeFile(metaPath, JSON.stringify(meta, null, 2) + "\n");

console.log(`wrote ${partPath} and ${metaPath}`);
console.log(`fills ${fillsPath}`);
