import { ImageResponse } from "next/og";

import { shareToY, tenureBands, yearToX } from "@/lib/chart-marks";
import { instColor } from "@/lib/colors";
import { formatShare, getJournal, isJournalId } from "@/lib/load-bundle";
import { handoverClaim, handoverFallback, latestScoredHandover, takeoverRows } from "@/lib/takeover";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PLOT = { left: 56, top: 8, width: 1040, height: 268 };

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = isJournalId(id) ? getJournal(id) : undefined;
  const name = row?.journal.name ?? "Unknown journal";
  const series = row?.series ?? [];
  const institutions = row?.trackedInstitutions ?? [];
  const editors = row?.editors ?? [];
  const cohort = institutions.map((inst) => inst.id);
  const yearStart = series[0]?.year ?? 2000;
  const yearEnd = series.at(-1)?.year ?? yearStart;
  const bands = tenureBands(editors, yearStart, yearEnd);
  const labels = Object.fromEntries(institutions.map((inst) => [inst.id, inst.label]));
  const claimRow = row ? latestScoredHandover(takeoverRows(editors, series, labels)) : null;
  const claim = claimRow ? handoverClaim(claimRow, formatShare) : handoverFallback();

  const maxShare = Math.max(
    4,
    ...series.flatMap((pt) => institutions.map((inst) => (pt.byInstitution[inst.id]?.share ?? 0) * 100))
  );
  const yMax = Math.min(100, Math.ceil(maxShare / 2) * 2 + 2);

  const polylines = institutions.map((inst) => {
    const points = series
      .map((pt) => {
        const x = yearToX(pt.year, yearStart, yearEnd, PLOT.left, PLOT.width);
        const y = shareToY((pt.byInstitution[inst.id]?.share ?? 0) * 100, yMax, PLOT.top, PLOT.height);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
    return { id: inst.id, label: inst.label, color: instColor(inst.id, cohort), points };
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#f6f1e7",
          color: "#1c1915",
          padding: "36px 48px 32px",
          fontFamily: "Georgia, Times New Roman, serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div
            style={{
              fontSize: 18,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#6b6458",
            }}
          >
            Editor home × journal share
          </div>
          <div style={{ fontSize: 44, lineHeight: 1.1, fontWeight: 700 }}>{name}</div>
        </div>

        <div
          style={{
            display: "flex",
            position: "relative",
            marginTop: 16,
            width: 1104,
            height: 292,
            background: "#fffdf8",
            border: "1px solid #d6cfc2",
            borderRadius: 12,
          }}
        >
          <svg width="1104" height="292" viewBox="0 0 1104 292">
            {bands.map((band) => {
              const x1 = yearToX(band.visibleStart, yearStart, yearEnd, PLOT.left, PLOT.width);
              const x2 = yearToX(band.endYear, yearStart, yearEnd, PLOT.left, PLOT.width);
              const color = instColor(band.institutionId, cohort);
              return (
                <g key={`${band.name}-band`}>
                  <rect
                    x={x1}
                    y={PLOT.top}
                    width={Math.max(2, x2 - x1)}
                    height={PLOT.height}
                    fill={color}
                    fillOpacity="0.16"
                  />
                  <line
                    x1={x1}
                    y1={PLOT.top}
                    x2={x1}
                    y2={PLOT.top + PLOT.height}
                    stroke={color}
                    strokeWidth="3"
                  />
                </g>
              );
            })}
            <line
              x1={PLOT.left}
              y1={PLOT.top + PLOT.height}
              x2={PLOT.left + PLOT.width}
              y2={PLOT.top + PLOT.height}
              stroke="#d6cfc2"
              strokeWidth="2"
            />
            {polylines.map((line) =>
              line.points ? (
                <polyline
                  key={line.id}
                  points={line.points}
                  fill="none"
                  stroke={line.color}
                  strokeWidth="4"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ) : null
            )}
          </svg>
          <div
            style={{
              position: "absolute",
              left: PLOT.left,
              top: PLOT.top,
              display: "flex",
              fontSize: 16,
              color: "#6b6458",
            }}
          >
            {yMax}%
          </div>
          <div
            style={{
              position: "absolute",
              left: PLOT.left,
              top: PLOT.top + PLOT.height - 18,
              display: "flex",
              fontSize: 16,
              color: "#6b6458",
            }}
          >
            0%
          </div>
          <div
            style={{
              position: "absolute",
              left: PLOT.left,
              top: PLOT.top + PLOT.height + 2,
              display: "flex",
              fontSize: 16,
              color: "#6b6458",
            }}
          >
            {yearStart}
          </div>
          <div
            style={{
              position: "absolute",
              left: PLOT.left + PLOT.width - 40,
              top: PLOT.top + PLOT.height + 2,
              display: "flex",
              fontSize: 16,
              color: "#6b6458",
            }}
          >
            {yearEnd}
          </div>
          {bands.map((band) => {
            const x = yearToX(band.visibleStart, yearStart, yearEnd, PLOT.left, PLOT.width);
            return (
              <div
                key={`${band.name}-label`}
                style={{
                  position: "absolute",
                  left: Math.min(x + 6, 980),
                  top: 10,
                  display: "flex",
                  fontSize: 16,
                  fontWeight: 700,
                  color: instColor(band.institutionId, cohort),
                }}
              >
                {band.shortLabel}
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            marginTop: 12,
            fontSize: 18,
            color: "#3f3a33",
          }}
        >
          {institutions.map((inst) => (
            <div key={inst.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 12,
                  background: instColor(inst.id, cohort),
                }}
              />
              {inst.label}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", marginTop: 10, fontSize: 26, lineHeight: 1.25, maxWidth: 1100 }}>
          {claim}
        </div>
      </div>
    ),
    size
  );
}
