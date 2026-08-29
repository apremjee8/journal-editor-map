import { takeoverRows, type TakeoverRow } from "./takeover";
import { CATALOG_JOURNAL_ID_SET, type DataBundle, type JournalId } from "./types";

export type HandoverDirection = "rose" | "fell" | "flat";

export type JournalHandover = TakeoverRow & {
  journalId: JournalId;
  journalShortName: string;
};

export type ScoredHandover = JournalHandover & {
  beforeShare: number;
  afterShare: number;
  delta: number;
  direction: HandoverDirection;
};

export type UnscoredHandover = JournalHandover & {
  direction: "unscored";
  reason: "no-before" | "no-after";
};

export type ClassifiedHandover = ScoredHandover | UnscoredHandover;

export type JournalTally = {
  journalId: JournalId;
  journalShortName: string;
  rose: number;
  fell: number;
  flat: number;
};

export type PooledScore = {
  rose: number;
  fell: number;
  flat: number;
  unscored: number;
  scored: ScoredHandover[];
  unclassified: UnscoredHandover[];
  byJournal: JournalTally[];
  strongest: JournalTally | null;
  weakest: JournalTally | null;
};

export function classifyHandover(row: JournalHandover): ClassifiedHandover {
  if (row.afterShare == null) {
    return { ...row, direction: "unscored", reason: "no-after" };
  }
  if (row.beforeShare == null) {
    return { ...row, direction: "unscored", reason: "no-before" };
  }
  const delta = row.afterShare - row.beforeShare;
  const direction: HandoverDirection =
    delta === 0 ? "flat" : delta > 0 ? "rose" : "fell";
  return {
    ...row,
    beforeShare: row.beforeShare,
    afterShare: row.afterShare,
    delta,
    direction,
  };
}

function rankKey(t: JournalTally): number {
  const n = t.rose + t.fell + t.flat;
  if (!n) return -1;
  return t.rose / n + t.rose / 1000;
}

export function poolHandovers(
  rows: JournalHandover[],
  journals: { id: JournalId; shortName: string }[] = []
): PooledScore {
  const catalogRows = rows.filter((row) => CATALOG_JOURNAL_ID_SET.has(row.journalId));
  const catalogJournals = journals.filter((j) => CATALOG_JOURNAL_ID_SET.has(j.id));
  const classified = catalogRows.map(classifyHandover);
  const scored = classified.filter((r): r is ScoredHandover => r.direction !== "unscored");
  const unclassified = classified.filter((r): r is UnscoredHandover => r.direction === "unscored");

  const byId = new Map<JournalId, JournalTally>();
  for (const j of catalogJournals) {
    byId.set(j.id, {
      journalId: j.id,
      journalShortName: j.shortName,
      rose: 0,
      fell: 0,
      flat: 0,
    });
  }
  for (const row of scored) {
    const cur = byId.get(row.journalId) ?? {
      journalId: row.journalId,
      journalShortName: row.journalShortName,
      rose: 0,
      fell: 0,
      flat: 0,
    };
    cur[row.direction] += 1;
    byId.set(row.journalId, cur);
  }
  const byJournal = [...byId.values()];
  const ranked = byJournal.filter((t) => t.rose + t.fell + t.flat > 0);
  ranked.sort((a, b) => rankKey(b) - rankKey(a));

  return {
    rose: scored.filter((r) => r.direction === "rose").length,
    fell: scored.filter((r) => r.direction === "fell").length,
    flat: scored.filter((r) => r.direction === "flat").length,
    unscored: unclassified.length,
    scored,
    unclassified,
    byJournal,
    strongest: ranked[0] ?? null,
    weakest: ranked.at(-1) ?? null,
  };
}

export function handoversFromBundle(bundle: DataBundle): JournalHandover[] {
  const labels = Object.fromEntries(bundle.institutions.map((i) => [i.id, i.label]));
  return bundle.journals
    .filter((j) => CATALOG_JOURNAL_ID_SET.has(j.journal.id))
    .flatMap((j) =>
      takeoverRows(j.editors, j.series, labels).map((row) => ({
        ...row,
        journalId: j.journal.id,
        journalShortName: j.journal.shortName,
      }))
    );
}
