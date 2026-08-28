import ajrccm from "../../data/bundle-parts/ajrccm.json";
import chest from "../../data/bundle-parts/chest.json";
import circulation from "../../data/bundle-parts/circulation.json";
import ehj from "../../data/bundle-parts/ehj.json";
import jacc from "../../data/bundle-parts/jacc.json";
import jama from "../../data/bundle-parts/jama.json";
import jamaCardio from "../../data/bundle-parts/jama-cardio.json";
import jamaIm from "../../data/bundle-parts/jama-im.json";
import jamaOnc from "../../data/bundle-parts/jama-onc.json";
import jco from "../../data/bundle-parts/jco.json";
import lancetOnc from "../../data/bundle-parts/lancet-onc.json";
import meta from "../../data/bundle-parts/meta.json";
import nejm from "../../data/bundle-parts/nejm.json";
import type { DataBundle, JournalBundle, JournalId } from "./types";

export const bundle = {
  ...meta,
  journals: [
    jama,
    jamaIm,
    nejm,
    jacc,
    circulation,
    jamaCardio,
    ehj,
    ajrccm,
    chest,
    jco,
    lancetOnc,
    jamaOnc,
  ],
} as DataBundle;

export function isJournalId(id: string): id is JournalId {
  return bundle.journals.some((j) => j.journal.id === id);
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
