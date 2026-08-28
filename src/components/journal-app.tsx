"use client";

import Link from "next/link";
import { useMemo } from "react";

import { ShareChart } from "@/components/share-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { instColor } from "@/lib/colors";
import { formatShare, yearLabel } from "@/lib/load-bundle";
import { CONTROL_LABEL } from "@/lib/site";
import { takeoverRows } from "@/lib/takeover";
import type { DataBundle, JournalId } from "@/lib/types";

const ROLE_LABEL = {
  eic: "Editor-in-chief",
  deputy: "Deputy",
  "interim-eic": "Interim editor-in-chief",
} as const;

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
  const takeovers = useMemo(
    () => takeoverRows(current.editors, current.series, labels),
    [current, labels]
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-3 py-6 sm:gap-8 sm:px-6 sm:py-10">
      <header className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-[0.14em] text-[#6b6458]">
          Editor home × journal share
        </p>
        <h1 className="max-w-3xl text-[1.65rem] font-semibold leading-tight tracking-tight text-[#1c1915] sm:text-4xl">
          When an editor takes over, does their institution publish more here?
        </h1>
        <p className="max-w-3xl text-[15px] leading-7 text-[#3f3a33]">
          Solid lines are that institution&apos;s share of OpenAlex articles in the
          selected journal. Dashed lines are the same institution&apos;s share in the
          other journals in this catalog that year. Shaded bands mark sourced
          editor-in-chief tenures. This is the raw series, not a causal estimate.
        </p>
      </header>

      <nav
        className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
        aria-label="Journals"
      >
        {bundle.journals.map((j) => {
          const selected = j.journal.id === current.journal.id;
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

      <section className="rounded-xl border border-[#d6cfc2] bg-[#fffdf8] p-3 sm:p-6">
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

        <ShareChart
          series={current.series}
          institutions={current.trackedInstitutions}
          editors={current.editors}
        />

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#6b6458]">
          <span>Solid: share in this journal</span>
          <span>Dashed: share in the {CONTROL_LABEL}</span>
          <span>Band: sourced EIC window</span>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#6b6458]">
            Editor timeline
          </h3>
          <ol className="flex flex-col gap-3">
            {current.editors.map((editor, i) => (
              <li
                key={`${editor.name}-${i}`}
                className="rounded-lg border border-[#d6cfc2] bg-[#fffdf8] p-3 sm:p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-[#d6cfc2] text-[#3f3a33]">
                    {ROLE_LABEL[editor.role]}
                  </Badge>
                  <span className="font-medium text-[#1c1915]">{editor.name}</span>
                  <span className="text-sm text-[#6b6458]">
                    {yearLabel(editor.startYear, editor.endYear)}
                  </span>
                </div>
                <div className="mt-1 text-sm text-[#3f3a33]">
                  {editor.institutionGroupId ? (
                    <span style={{ color: instColor(editor.institutionGroupId) }}>
                      {labels[editor.institutionGroupId]}
                    </span>
                  ) : (
                    <span>No university home used for the share series</span>
                  )}
                </div>
                {editor.gapReason ? (
                  <p className="mt-2 rounded-md bg-[#f8f1d8] px-2 py-1.5 text-sm text-[#5c4a12]">
                    Gap: {editor.gapReason}
                  </p>
                ) : null}
                {editor.sources.length ? (
                  <ul className="mt-2 flex flex-col gap-1 text-sm">
                    {editor.sources.map((s) => (
                      <li key={s.url}>
                        <a
                          href={s.url}
                          className="break-words text-[#1f4e79] underline underline-offset-2 hover:text-[#16385a]"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {s.label}
                        </a>
                        {s.quote ? (
                          <span className="block text-[#6b6458]">“{s.quote}”</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-[#6b6458]">No source on file for this row.</p>
                )}
              </li>
            ))}
          </ol>
        </div>

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
                    <div className="text-xs" style={{ color: instColor(row.institutionId) }}>
                      {row.institutionLabel} · {row.startYear}
                    </div>
                    <div className="text-xs text-[#6b6458]">{row.window}</div>
                    <dl className="mt-2 grid grid-cols-2 gap-2 tabular-nums">
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-[#6b6458]">Here</dt>
                        <dd>
                          {row.beforeShare == null ? "—" : formatShare(row.beforeShare)}
                          {" → "}
                          {row.afterShare == null ? "—" : formatShare(row.afterShare)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-[#6b6458]">
                          Other journals
                        </dt>
                        <dd className="text-[#6b6458]">
                          {row.beforeControl == null ? "—" : formatShare(row.beforeControl)}
                          {" → "}
                          {row.afterControl == null ? "—" : formatShare(row.afterControl)}
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
                      <th className="px-3 py-2 font-medium">Other journals</th>
                    </tr>
                  </thead>
                  <tbody>
                    {takeovers.map((row) => (
                      <tr key={`${row.name}-${row.startYear}`} className="border-t border-[#ece6da]">
                        <td className="px-3 py-2 align-top">
                          <div className="font-medium text-[#1c1915]">{row.name}</div>
                          <div className="text-xs" style={{ color: instColor(row.institutionId) }}>
                            {row.institutionLabel} · {row.startYear}
                          </div>
                          <div className="text-xs text-[#6b6458]">{row.window}</div>
                        </td>
                        <td className="px-3 py-2 align-top tabular-nums">
                          {row.beforeShare == null ? "—" : formatShare(row.beforeShare)}
                          {" → "}
                          {row.afterShare == null ? "—" : formatShare(row.afterShare)}
                        </td>
                        <td className="px-3 py-2 align-top tabular-nums text-[#6b6458]">
                          {row.beforeControl == null ? "—" : formatShare(row.beforeControl)}
                          {" → "}
                          {row.afterControl == null ? "—" : formatShare(row.afterControl)}
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
            A rise in this journal that does not also appear in the {CONTROL_LABEL} is
            the pattern people notice. Niche titles in this set show it more often
            than JAMA or NEJM. Topic mix, trial networks, and OpenAlex coverage can
            produce the same bump.
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
