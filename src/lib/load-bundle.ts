import bundleJson from "../../data/bundle.json";
import type { DataBundle, JournalBundle, JournalId } from "./types";

export const bundle = bundleJson as DataBundle;

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
