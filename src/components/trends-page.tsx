"use client";

import Link from "next/link";
import { useMemo } from "react";

import { SiteNav } from "@/components/site-nav";
import { formatShare } from "@/lib/load-bundle";
import { instColor } from "@/lib/colors";
import { handoversFromBundle, poolHandovers } from "@/lib/trends";
import type { DataBundle } from "@/lib/types";

export function TrendsPage({ bundle }: { bundle: DataBundle }) {
  const score = useMemo(
    () =>
      poolHandovers(
        handoversFromBundle(bundle),
        bundle.journals.map((j) => ({ id: j.journal.id, shortName: j.journal.shortName }))
      ),
    [bundle]
  );
  const scoredN = score.rose + score.fell + score.flat;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 overflow-x-clip px-3 py-6 sm:gap-8 sm:px-6 sm:py-10">
      <header className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-[0.14em] text-[#6b6458]">
          Editor home × journal share
        </p>
        <h1 className="max-w-3xl text-[1.65rem] font-semibold leading-tight tracking-tight text-[#1c1915] sm:text-4xl">
          Do editor changes line up with more papers from home?
        </h1>
        <p className="max-w-3xl text-[15px] leading-7 text-[#3f3a33]">
          Each scored handover is a sourced editor-in-chief start with a mapped
          institution and years on both sides of the takeover window. The number
          is that institution&apos;s share of OpenAlex articles in that journal,
          before versus after. This is not a causal estimate.
        </p>
      </header>

      <SiteNav bundle={bundle} current="trends" />

      <section className="rounded-xl border border-[#d6cfc2] bg-[#fffdf8] p-3 sm:p-6">
        <p className="text-xs uppercase tracking-wide text-[#6b6458]">
          Sourced handovers across eleven journals
        </p>
        <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-[#1c1915] sm:text-4xl">
          {score.rose} rose
          <span className="mx-2 text-[#c4b8a4]">·</span>
          {score.fell} fell
          <span className="mx-2 text-[#c4b8a4]">·</span>
          {score.flat} flat
        </p>
        <p className="mt-1 text-sm text-[#6b6458]">
          {scoredN} scored
          {score.unscored ? ` · ${score.unscored} skipped (no before years in the series)` : ""}
        </p>
        <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[#3f3a33]">
          The home-institution share rose after {score.rose} of {scoredN} sourced
          starts and fell after {score.fell}.
          {score.strongest && score.weakest
            ? ` ${score.strongest.journalShortName} is the strongest title in this set (${score.strongest.rose} rose, ${score.strongest.fell} fell). ${score.weakest.journalShortName} is the weakest (${score.weakest.rose} rose, ${score.weakest.fell} fell).`
            : ""}{" "}
          Niche journals show the bump more often than JAMA and NEJM. That is an
          association in OpenAlex article shares, not proof that the editor caused
          the change. Topic mix, trial networks, and coverage gaps can move the
          same line.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#6b6458]">
          By journal
        </h2>
        <ul className="flex flex-col gap-2">
          {score.byJournal.map((row) => (
            <li
              key={row.journalId}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-lg border border-[#d6cfc2] bg-[#fffdf8] px-3 py-2 text-sm"
            >
              <Link href={`/j/${row.journalId}`} className="font-medium text-[#1c1915] underline-offset-2 hover:underline">
                {row.journalShortName}
              </Link>
              <span className="shrink-0 tabular-nums text-[#3f3a33]">
                {row.rose} rose · {row.fell} fell · {row.flat} flat
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#6b6458]">
          Each scored handover
        </h2>
        <ul className="flex flex-col gap-3">
          {score.scored.map((row) => (
            <li
              key={`${row.journalId}-${row.name}-${row.startYear}`}
              className="rounded-lg border border-[#d6cfc2] bg-[#fffdf8] p-3 text-sm"
            >
              <div className="font-medium text-[#1c1915]">{row.name}</div>
              <div className="text-xs" style={{ color: instColor(row.institutionId) }}>
                {row.journalShortName} · {row.institutionLabel} · {row.startYear}
              </div>
              <div className="text-xs text-[#6b6458]">{row.window}</div>
              <div className="mt-1 tabular-nums text-[#3f3a33]">
                {formatShare(row.beforeShare)} → {formatShare(row.afterShare)} · {row.direction}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="text-sm leading-6 text-[#3f3a33]">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#6b6458]">
          How this is counted
        </h2>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>
            The window is two years before the sourced start versus the start year
            and the next two years, the same rule as each journal page.
          </li>
          <li>
            Deputies, missing start years, and editors with no institution are
            skipped. Starts with no later year in the series are skipped. Starts
            with no earlier year are listed as unscored.
          </li>
          <li>Dates come from the sourced editor file. None were invented.</li>
          <li>
            A rise here is not a result you can attribute to the editor. The
            product does not estimate a cause.
          </li>
        </ul>
      </section>
    </div>
  );
}
