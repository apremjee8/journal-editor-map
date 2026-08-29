"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { DataBundle, JournalId } from "@/lib/types";

export function SiteNav({
  bundle,
  current,
}: {
  bundle: DataBundle;
  current: JournalId | "trends";
}) {
  return (
    <nav
      className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      aria-label="Journals and trends"
    >
      <Button
        asChild
        variant={current === "trends" ? "default" : "outline"}
        size="sm"
        className={
          current === "trends"
            ? "shrink-0 bg-[#1c1915] text-[#fffdf8] hover:bg-[#1c1915]/90"
            : "shrink-0 border-[#d6cfc2] bg-[#fffdf8] text-[#1c1915] hover:bg-[#f3eee4]"
        }
      >
        <Link href="/trends" aria-current={current === "trends" ? "page" : undefined}>
          Trends
        </Link>
      </Button>
      {bundle.journals.map((j) => {
        const selected = j.journal.id === current;
        return (
          <Button
            key={j.journal.id}
            asChild
            variant={selected ? "default" : "outline"}
            size="sm"
            className={
              selected
                ? "shrink-0 bg-[#1c1915] text-[#fffdf8] hover:bg-[#1c1915]/90"
                : "shrink-0 border-[#d6cfc2] bg-[#fffdf8] text-[#1c1915] hover:bg-[#f3eee4]"
            }
          >
            <Link href={`/j/${j.journal.id}`} aria-current={selected ? "page" : undefined}>
              {j.journal.shortName}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}
