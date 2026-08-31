import { ImageResponse } from "next/og";

import { SHARE_OG_LAYOUT, fitOgBandLabels, shareToY, tenureBands, yearToX } from "@/lib/chart-marks";
import { instColor } from "@/lib/colors";
import { formatShare, getJournal, isJournalId } from "@/lib/load-bundle";
import { handoverClaim, handoverFallback, latestScoredHandover, takeoverRows } from "@/lib/takeover";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FRAME = { width: SHARE_OG_LAYOUT.frameWidth, height: SHARE_OG_LAYOUT.frameHeight };
const PLOT = {
  left: SHARE_OG_LAYOUT.plotLeft,
  top: SHARE_OG_LAYOUT.plotTop,
  height: SHARE_OG_LAYOUT.plotHeight,
};

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = isJournalId(id) ? getJournal(id) : undefined;
  const name = row?.journal.name ?? "Unknown journal";
  const series = row?.series ?? [];
  const institutions = row?.trackedInstitutions ?? [];
  const editors = row?.editors ?? [];
  const cohort = institutions.map((inst) => inst.id);
  const dataStart = series[0]?.year ?? 2000;
  const yearEnd = series.at(-1)?.year ?? dataStart;
  const bands = tenureBands(editors, dataStart, yearEnd);
  const ogMarks = fitOgBandLabels(bands, dataStart, yearEnd);
  const domainStart = dataStart;
  const plotWidth = ogMarks.plotWidth;
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
        const x = yearToX(pt.year, domainStart, yearEnd, PLOT.left, plotWidth);
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
            width: FRAME.width,
            height: FRAME.height,
            background: "#fffdf8",
            border: "1px solid #d6cfc2",
            borderRadius: 12,
          }}
        >
          <svg width={FRAME.width} height={FRAME.height} viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}>
            {bands.map((band) => {
              const x1 = yearToX(band.visibleStart, domainStart, yearEnd, PLOT.left, plotWidth);
              const x2 = yearToX(band.endYear, domainStart, yearEnd, PLOT.left, plotWidth);
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
              x2={PLOT.left + plotWidth}
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
              left: PLOT.left + 8,
              top: PLOT.top + PLOT.height + 8,
              display: "flex",
              fontSize: 16,
              lineHeight: 1,
              color: "#6b6458",
            }}
          >
            {domainStart}
          </div>
          <div
            style={{
              position: "absolute",
              left: PLOT.left + plotWidth - 40,
              top: PLOT.top + PLOT.height + 8,
              display: "flex",
              fontSize: 16,
              lineHeight: 1,
              color: "#6b6458",
            }}
          >
            {yearEnd}
          </div>
          {ogMarks.labels.map((label) => (
            <div
              key={`${label.text}-${label.row}`}
              style={{
                position: "absolute",
                left: label.x,
                top: label.y,
                display: "flex",
                fontSize: 16,
                fontWeight: 700,
                color: instColor(label.institutionId, cohort),
              }}
            >
              {label.text}
            </div>
          ))}
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
