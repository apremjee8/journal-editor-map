import { ImageResponse } from "next/og";

import { formatShare, getJournal, isJournalId, yearLabel } from "@/lib/load-bundle";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = isJournalId(id) ? getJournal(id) : undefined;
  const name = row?.journal.name ?? "Unknown journal";
  const shortName = row?.journal.shortName ?? "Journal";
  const current = row?.editors.find((e) => e.startYear != null && e.endYear == null);
  const last = row?.series.at(-1);
  const instId = current?.institutionGroupId;
  const inst = row?.trackedInstitutions.find((i) => i.id === instId);
  const cell = instId ? last?.byInstitution[instId] : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f6f1e7",
          color: "#1c1915",
          padding: 64,
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 22, letterSpacing: 3, textTransform: "uppercase", color: "#6b6458" }}>
            Editor home × journal share
          </div>
          <div style={{ fontSize: 58, lineHeight: 1.1, fontWeight: 700, maxWidth: 1040 }}>
            {name}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 30 }}>
          {current ? (
            <div style={{ display: "flex" }}>
              Current EIC {current.name}
              {current.startYear != null ? ` · ${yearLabel(current.startYear, current.endYear)}` : ""}
            </div>
          ) : (
            <div style={{ display: "flex" }}>No sitting academic EIC on the share series</div>
          )}
          {inst && cell && last ? (
            <div style={{ display: "flex", color: "#3f3a33" }}>
              {inst.label} share in {shortName} {last.year}: {formatShare(cell.share)}
            </div>
          ) : (
            <div style={{ display: "flex", color: "#3f3a33" }}>
              Institution share is plotted only when a university home is sourced.
            </div>
          )}
        </div>
        <div style={{ display: "flex", fontSize: 22, color: "#6b6458" }}>
          Raw share of OpenAlex articles. Not a causal estimate.
        </div>
      </div>
    ),
    size
  );
}
