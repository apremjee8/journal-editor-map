import { instColor } from "@/lib/colors";
import { yearLabel } from "@/lib/load-bundle";
import type { EditorTenure } from "@/lib/types";

const ROLE_LABEL = {
  eic: "Editor-in-chief",
  deputy: "Deputy",
  "interim-eic": "Interim editor-in-chief",
} as const;

export function EditorTimeline({
  editors,
  labels,
  cohort,
}: {
  editors: EditorTenure[];
  labels: Record<string, string>;
  cohort: string[];
}) {
  const ordered = [...editors].sort((a, b) => {
    if (a.startYear == null && b.startYear == null) return 0;
    if (a.startYear == null) return 1;
    if (b.startYear == null) return -1;
    return a.startYear - b.startYear;
  });
  const sourced = ordered.filter((editor) => editor.sources.length);

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#6b6458]">
        Editor timeline
      </h3>
      <ol className="relative ml-2 border-l border-[#d6cfc2] pl-5">
        {ordered.map((editor, i) => (
          <li key={`${editor.name}-${i}`} className="relative pb-5 last:pb-0">
            <span
              className="absolute top-1.5 -left-[27px] h-2.5 w-2.5 rounded-full border-2 border-[#fffdf8]"
              style={{
                background: editor.institutionGroupId
                  ? instColor(editor.institutionGroupId, cohort)
                  : "#a39b8e",
              }}
            />
            <div className="text-xs tabular-nums text-[#6b6458]">
              {yearLabel(editor.startYear, editor.endYear)}
            </div>
            <div className="font-medium text-[#1c1915]">{editor.name}</div>
            <div className="text-sm text-[#3f3a33]">
              {editor.institutionGroupId ? (
                <span style={{ color: instColor(editor.institutionGroupId, cohort) }}>
                  {labels[editor.institutionGroupId]}
                </span>
              ) : (
                <span>No university home used for the share series</span>
              )}
            </div>
            <div className="text-xs text-[#6b6458]">{ROLE_LABEL[editor.role]}</div>
            {editor.gapReason ? (
              <p className="mt-1.5 rounded-md bg-[#f8f1d8] px-2 py-1.5 text-sm text-[#5c4a12]">
                Gap: {editor.gapReason}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
      {sourced.length ? (
        <details className="mt-3">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-[#3f3a33]">
            Sources
          </summary>
          <ul className="mt-1 flex flex-col gap-3 text-sm">
            {sourced.map((editor, i) => (
              <li key={`${editor.name}-src-${i}`}>
                <div className="font-medium text-[#1c1915]">{editor.name}</div>
                <ul className="mt-1 flex flex-col gap-1">
                  {editor.sources.map((source) => (
                    <li key={source.url}>
                      <a
                        href={source.url}
                        className="break-words text-[#1f4e79] underline underline-offset-2 hover:text-[#16385a]"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {source.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </details>
      ) : (
        <p className="mt-3 text-sm text-[#6b6458]">No source on file for these rows.</p>
      )}
    </div>
  );
}
