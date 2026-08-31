"use client";

import { useMemo } from "react";

import { EditorTimeline } from "@/components/editor-timeline";
import { ShareChart } from "@/components/share-chart";
import { SiteNav } from "@/components/site-nav";
import { instColor } from "@/lib/colors";
import { formatShare } from "@/lib/load-bundle";
import { takeoverRows } from "@/lib/takeover";
import type { DataBundle, JournalId } from "@/lib/types";

export function JournalApp({
  bundle,
  journalId,
}: {
  bundle: DataBundle;
  journalId: JournalId;
}) {
  const current = bundle.journals.find((j) => j.journal.id === journalId) ?? bundle.journals[0];
  const labels = Object.fromEntries(
    current.trackedInstitutions.map((i) => [i.id, i.label])
  );
  const cohort = current.trackedInstitutions.map((i) => i.id);
  const takeovers = useMemo(
    () => takeoverRows(current.editors, current.series, labels),
    [current, labels]
  );

  return (
    <div className="mx-auto flex min-w-0 w-full max-w-5xl flex-col gap-6 overflow-x-clip px-2 py-6 sm:gap-8 sm:px-6 sm:py-10">
      <header className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-[0.14em] text-[#6b6458]">
          Editor home × journal share
        </p>
        <h1 className="max-w-3xl text-[1.65rem] font-semibold leading-tight tracking-tight text-[#1c1915] sm:text-4xl">
          When an editor takes over, does their institution publish more here?
        </h1>
        <p className="max-w-3xl text-[15px] leading-7 text-[#3f3a33]">
          Solid lines are that institution&apos;s share of OpenAlex articles in the
          selected journal. Shaded bands mark sourced editor-in-chief tenures.
          This is the raw series, not a causal estimate.
        </p>
      </header>

      <SiteNav bundle={bundle} current={current.journal.id} />

      <section className="min-w-0 rounded-xl border border-[#d6cfc2] bg-[#fffdf8] px-2 py-3 sm:p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#1c1915]">{current.journal.name}</h2>
            <p className="text-sm text-[#6b6458]">
              OpenAlex {current.journal.openAlexId} · issn_l {current.journal.issnL} ·
              articles {current.journal.firstYear}–{bundle.yearEnd}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#6b6458]">
            <span>Fetched {new Date(bundle.fetchedAt).toISOString().slice(0, 10)}</span>
            <a
              href={`/j/${current.journal.id}/opengraph-image`}
              className="underline underline-offset-2"
              download={`${current.journal.id}-share-card.png`}
            >
              Download share card
            </a>
          </div>
        </div>

        {current.journal.predecessorNote ? (
          <p className="mb-3 rounded-md bg-[#f3eee4] px-3 py-2 text-sm text-[#3f3a33]">
            {current.journal.predecessorNote}
          </p>
        ) : null}

        <div className="-mx-2 sm:mx-0">
          <ShareChart
            series={current.series}
            institutions={current.trackedInstitutions}
            editors={current.editors}
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <EditorTimeline editors={current.editors} labels={labels} cohort={cohort} />

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#6b6458]">
            What moved at a handover
          </h3>
          {takeovers.length ? (
            <>
              <ul className="flex flex-col gap-3 sm:hidden">
                {takeovers.map((row) => (
                  <li
                    key={`${row.name}-${row.startYear}`}
                    className="rounded-lg border border-[#d6cfc2] bg-[#fffdf8] p-3 text-sm"
                  >
                    <div className="font-medium text-[#1c1915]">{row.name}</div>
                    <div className="text-xs" style={{ color: instColor(row.institutionId, cohort) }}>
                      {row.institutionLabel} · {row.startYear}
                    </div>
                    <div className="text-xs text-[#6b6458]">{row.window}</div>
                    <dl className="mt-2 tabular-nums">
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-[#6b6458]">Here</dt>
                        <dd>
                          {row.beforeShare == null ? "—" : formatShare(row.beforeShare)}
                          {" → "}
                          {row.afterShare == null ? "—" : formatShare(row.afterShare)}
                        </dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto rounded-lg border border-[#d6cfc2] bg-[#fffdf8] sm:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#f3eee4] text-xs uppercase tracking-wide text-[#6b6458]">
                    <tr>
                      <th className="px-3 py-2 font-medium">Editor</th>
                      <th className="px-3 py-2 font-medium">Here</th>
                    </tr>
                  </thead>
                  <tbody>
                    {takeovers.map((row) => (
                      <tr key={`${row.name}-${row.startYear}`} className="border-t border-[#ece6da]">
                        <td className="px-3 py-2 align-top">
                          <div className="font-medium text-[#1c1915]">{row.name}</div>
                          <div className="text-xs" style={{ color: instColor(row.institutionId, cohort) }}>
                            {row.institutionLabel} · {row.startYear}
                          </div>
                          <div className="text-xs text-[#6b6458]">{row.window}</div>
                        </td>
                        <td className="px-3 py-2 align-top tabular-nums">
                          {row.beforeShare == null ? "—" : formatShare(row.beforeShare)}
                          {" → "}
                          {row.afterShare == null ? "—" : formatShare(row.afterShare)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-sm text-[#6b6458]">
              No dated editor with a mapped institution in the series window.
            </p>
          )}
          <p className="mt-3 text-sm leading-6 text-[#3f3a33]">
            A rise after a handover is the pattern people notice. Topic mix, trial
            networks, and OpenAlex coverage can produce the same bump.
          </p>
        </div>
      </section>

      <section className="text-sm leading-6 text-[#3f3a33]">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#6b6458]">
          Sources and limits
        </h3>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          {current.journal.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
          {bundle.caveats.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
