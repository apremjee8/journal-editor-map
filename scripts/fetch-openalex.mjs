#!/usr/bin/env node
/**
 * Fetch article counts from OpenAlex for each journal × year, then
 * assemble institution-share series. Safe to rerun. Writes:
 *   data/openalex-cache.json
 *   data/bundle.json
 */

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
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(20000),
    });
    if (res.status === 429 || res.status >= 500) {
      lastErr = new Error(`HTTP ${res.status} ${url}`);
      const wait = res.status === 429 ? 20000 * (i + 1) : 800 * 2 ** i;
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
    return res.json();
  }
  throw lastErr;
}

function sourceFilter(journal) {
  const ids = [journal.openAlexId, ...(journal.predecessorOpenAlexIds || [])];
  return ids.join("|");
}

function cellKey(journalId, year) {
  return `${journalId}|${year}`;
}

async function fetchCell(journal, year) {
  const filter = [
    `primary_location.source.id:${sourceFilter(journal)}`,
    `publication_year:${year}`,
    "type:article",
  ].join(",");
  const url =
    `https://api.openalex.org/works?filter=${encodeURIComponent(filter)}` +
    `&group_by=authorships.institutions.id&per-page=200`;
  const data = await getJson(url);
  const institutions = {};
  for (const g of data.group_by || []) {
    const id = String(g.key || "").replace("https://openalex.org/", "");
    if (id) institutions[id] = g.count;
  }
  return {
    sourceIds: [journal.openAlexId, ...(journal.predecessorOpenAlexIds || [])],
    totalArticles: data.meta?.count ?? 0,
    institutions,
    groupsReturned: (data.group_by || []).length,
  };
}

async function fetchExact(journal, year, institutionId) {
  const filter = [
    `primary_location.source.id:${sourceFilter(journal)}`,
    `publication_year:${year}`,
    "type:article",
    `institutions.id:${institutionId}`,
  ].join(",");
  const url = `https://api.openalex.org/works?filter=${encodeURIComponent(filter)}&per-page=1`;
  const data = await getJson(url);
  return data.meta?.count ?? 0;
}

function tenureCovers(editor, year) {
  if (editor.startYear == null && editor.endYear == null) return false;
  if (editor.institutionGroupId == null) return false;
  const start = editor.startYear ?? -Infinity;
  const end = editor.endYear ?? Infinity;
  return year >= start && year <= end;
}

async function main() {
  const journalsFile = JSON.parse(await readFile(join(DATA, "journals.json"), "utf8"));
  const institutionsFile = JSON.parse(await readFile(join(DATA, "institutions.json"), "utf8"));
  const editorsFile = JSON.parse(await readFile(join(DATA, "editors.json"), "utf8"));

  const yearStart = journalsFile.yearStart;
  const yearEnd = journalsFile.yearEnd;
  const journals = journalsFile.journals;
  const groups = institutionsFile.groups;

  const allTrackedIds = new Set();
  for (const journal of journals) {
    for (const editor of editorsFile.byJournal[journal.id] || []) {
      const group = groups.find((g) => g.id === editor.institutionGroupId);
      if (!group) continue;
      for (const m of group.members) allTrackedIds.add(m.openAlexId);
    }
  }

  /** @type {Record<string, {sourceIds: string[], totalArticles: number, institutions: Record<string, number>, groupsReturned: number}>} */
  let cache = {};
  try {
    const prev = JSON.parse(await readFile(join(DATA, "openalex-cache.json"), "utf8"));
    cache = prev.cells || {};
    console.log(`Loaded ${Object.keys(cache).length} cached cells`);
  } catch {
    cache = {};
  }

  async function persistCache() {
    const cacheOut = {
      fetchedAt: new Date().toISOString(),
      userAgent: UA,
      workType: "article",
      yearStart,
      yearEnd,
      cells: cache,
    };
    await writeFile(join(DATA, "openalex-cache.json"), JSON.stringify(cacheOut, null, 2) + "\n");
    return cacheOut;
  }

  for (const journal of journals) {
    const start = Math.max(yearStart, journal.firstYear);
    for (let year = start; year <= yearEnd; year++) {
      const key = cellKey(journal.id, year);
      if (cache[key]?.totalArticles != null && cache[key].institutions) {
        continue;
      }
      process.stdout.write(`fetch ${key} … `);
      const cell = await fetchCell(journal, year);
      cache[key] = cell;
      console.log(`${cell.totalArticles} articles, ${cell.groupsReturned} inst groups`);
      await persistCache();
      await sleep(DELAY_MS);
    }
  }

  try {
    const replay = JSON.parse(await readFile("/tmp/exact-replay.json", "utf8"));
    let applied = 0;
    for (const [key, insts] of Object.entries(replay)) {
      if (!cache[key]) continue;
      for (const [id, n] of Object.entries(insts)) {
        if (cache[key].institutions[id] == null) {
          cache[key].institutions[id] = n;
          applied += 1;
        }
      }
    }
    console.log(`Replayed ${applied} exact fills from prior run`);
    if (applied) await persistCache();
  } catch {
    /* no replay file */
  }

  const missing = [];
  for (const journal of journals) {
    const start = Math.max(yearStart, journal.firstYear);
    for (let year = start; year <= yearEnd; year++) {
      const cell = cache[cellKey(journal.id, year)];
      for (const id of allTrackedIds) {
        if (cell.institutions[id] != null) continue;
        if (cell.groupsReturned < 200) {
          cell.institutions[id] = 0;
          continue;
        }
        missing.push({ journal, year, id });
      }
    }
  }

  console.log(`Filling ${missing.length} institution cells absent from group_by top 200`);
  let filled = 0;
  let skipped = 0;
  if (process.env.ASSEMBLE_ONLY === "1") {
    console.log("assemble-only: skipped exact fills");
    missing.length = 0;
  }
  for (const { journal, year, id } of missing) {
    const key = cellKey(journal.id, year);
    process.stdout.write(`exact ${key} ${id} … `);
    try {
      const n = await fetchExact(journal, year, id);
      cache[key].institutions[id] = n;
      filled += 1;
      console.log(n);
    } catch (err) {
      skipped += 1;
      console.log(`skip ${err.message.slice(0, 80)}`);
    }
    if ((filled + skipped) % 10 === 0) await persistCache();
    await sleep(DELAY_MS);
  }
  if (skipped) console.log(`Skipped ${skipped} exact fills after retries`);

  const cacheOut = await persistCache();

  const groupById = Object.fromEntries(groups.map((g) => [g.id, g]));

  const journalBundles = journals.map((journal) => {
    const editors = editorsFile.byJournal[journal.id] || [];
    const usedGroupIds = [
      ...new Set(
        editors.map((e) => e.institutionGroupId).filter((id) => id && groupById[id])
      ),
    ];
    const trackedInstitutions = usedGroupIds.map((id) => groupById[id]);
    const start = Math.max(yearStart, journal.firstYear);
    const series = [];

    for (let year = start; year <= yearEnd; year++) {
      const cell = cache[cellKey(journal.id, year)];
      const byInstitution = {};
      for (const group of trackedInstitutions) {
        let articles = 0;
        for (const m of group.members) {
          articles += cell.institutions[m.openAlexId] || 0;
        }
        const share = cell.totalArticles > 0 ? articles / cell.totalArticles : 0;

        let controlArticles = 0;
        let controlTotal = 0;
        for (const other of journals) {
          if (other.id === journal.id) continue;
          const otherYear = year < other.firstYear ? null : cache[cellKey(other.id, year)];
          if (!otherYear) continue;
          controlTotal += otherYear.totalArticles;
          for (const m of group.members) {
            controlArticles += otherYear.institutions[m.openAlexId] || 0;
          }
        }
        const controlShare = controlTotal > 0 ? controlArticles / controlTotal : 0;
        byInstitution[group.id] = {
          articles,
          share,
          controlArticles,
          controlTotal,
          controlShare,
        };
      }
      series.push({
        year,
        journalArticles: cell.totalArticles,
        byInstitution,
      });
    }

    return { journal, editors, series, trackedInstitutions };
  });

  const bundle = {
    fetchedAt: cacheOut.fetchedAt,
    yearStart,
    yearEnd,
    workType: "article",
    journals: journalBundles,
    institutions: groups,
    caveats: [
      "Counts are OpenAlex works with type=article and the journal as primary location. Editorials, letters, and news items are excluded so an editor's own commentary does not inflate the home-institution line.",
      "A paper counts for every distinct OpenAlex institution among its authors. Multi-center trials raise several institutions at once.",
      "Institution groups sum campus and hospital records that OpenAlex keeps separate (Harvard + Brigham, Zurich + University Hospital Zurich, and the rest).",
      "The dashed control is that same institution group's share of articles in the other journals in this catalog, same year. It is not a topic-matched or author-fixed control. A raw bump that also appears in the control is more likely a field-wide shift.",
      "Editor years come from mastheads, publisher announcements, and journal editorials. Missing windows are labeled on the chart. Dates were not invented.",
      "This chart is not a causal estimate of editorial homophily.",
    ],
  };

  await writeFile(join(DATA, "bundle.json"), JSON.stringify(bundle, null, 2) + "\n");
  console.log(`Wrote data/bundle.json with ${journalBundles.length} journals`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
