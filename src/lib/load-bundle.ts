import ajrccm from "../../data/bundle-parts/ajrccm.json";
import chest from "../../data/bundle-parts/chest.json";
import cid from "../../data/bundle-parts/cid.json";
import circulation from "../../data/bundle-parts/circulation.json";
import ehj from "../../data/bundle-parts/ehj.json";
import jacc from "../../data/bundle-parts/jacc.json";
import jama from "../../data/bundle-parts/jama.json";
import jamaIm from "../../data/bundle-parts/jama-im.json";
import jasn from "../../data/bundle-parts/jasn.json";
import jco from "../../data/bundle-parts/jco.json";
import meta from "../../data/bundle-parts/meta.json";
import nejm from "../../data/bundle-parts/nejm.json";
import { CATALOG_JOURNAL_ID_SET, type DataBundle, type JournalBundle, type JournalId } from "./types";

export const bundle = {
  ...meta,
  journals: [jama, jamaIm, nejm, jacc, circulation, ehj, ajrccm, chest, jco, cid, jasn],
} as DataBundle;

export function isJournalId(id: string): id is JournalId {
  return CATALOG_JOURNAL_ID_SET.has(id) && bundle.journals.some((j) => j.journal.id === id);
}

export function getJournal(id: JournalId): JournalBundle | undefined {
  return bundle.journals.find((j) => j.journal.id === id);
}

export function formatShare(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function yearLabel(start: number | null, end: number | null): string {
  if (start == null && end == null) return "unknown";
  if (start == null) return `–${end}`;
  if (end == null) return `${start}–`;
  if (start === end) return String(start);
  return `${start}–${end}`;
}
