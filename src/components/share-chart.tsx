"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  SHARE_CHART_LAYOUT,
  bandLabelStackHeight,
  fitShareChartBandLabels,
  shareChartPlotLeft,
  tenureBands,
} from "@/lib/chart-marks";
import { instColor } from "@/lib/colors";
import { formatShare } from "@/lib/load-bundle";
import type { EditorTenure, InstitutionGroup, YearPoint } from "@/lib/types";

type Props = {
  series: YearPoint[];
  institutions: InstitutionGroup[];
  editors: EditorTenure[];
};

export function ShareChart({ series, institutions, editors }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const sync = () => setContainerWidth(el.clientWidth);
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const cohort = institutions.map((inst) => inst.id);
  const rows = series.map((p) => {
    const row: Record<string, number> = { year: p.year, journalArticles: p.journalArticles };
    for (const inst of institutions) {
      const cell = p.byInstitution[inst.id];
      row[`${inst.id}_share`] = (cell?.share ?? 0) * 100;
      row[`${inst.id}_articles`] = cell?.articles ?? 0;
    }
    return row;
  });

  const dataStart = series[0]?.year ?? 0;
  const yearEnd = series[series.length - 1]?.year ?? dataStart;
  const bands = tenureBands(editors, dataStart, yearEnd);
  const fontSize = containerWidth > 0 && containerWidth < 500 ? 10 : 11;
  const fitted =
    containerWidth > 0
      ? fitShareChartBandLabels(bands, dataStart, yearEnd, containerWidth, fontSize)
      : {
          labels: [],
          plotWidth: 0,
          marginRight: SHARE_CHART_LAYOUT.marginRight,
          domainStart: dataStart,
          fontSize,
        };
  const domainStart = dataStart;
  const labels = fitted.labels;
  const labelFont = fitted.fontSize;
  const labelBand = bandLabelStackHeight(labels, labelFont);
  const marginTop = 8 + labelBand;
  const plotLeft = shareChartPlotLeft();

  const maxShare = Math.max(
    4,
    ...rows.flatMap((r) => institutions.map((inst) => r[`${inst.id}_share`] ?? 0))
  );
  const yMax = Math.min(100, Math.ceil(maxShare / 2) * 2 + 2);

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#3f3a33]" aria-label="Institutions">
        {institutions.map((inst) => (
          <li key={inst.id} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: instColor(inst.id, cohort) }}
            />
            {inst.label}
          </li>
        ))}
      </ul>
      <div ref={wrapRef} className="relative h-[260px] min-w-0 w-full sm:h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={rows}
            margin={{
              top: marginTop,
              right: fitted.marginRight,
              left: SHARE_CHART_LAYOUT.marginLeft,
              bottom: SHARE_CHART_LAYOUT.marginBottom,
            }}
          >
            <CartesianGrid stroke="#e7e2d8" vertical={false} />
            {bands.map((band) => (
              <ReferenceArea
                key={`${band.name}-band`}
                x1={band.visibleStart}
                x2={band.endYear}
                fill={instColor(band.institutionId, cohort)}
                fillOpacity={0.14}
                ifOverflow="hidden"
              />
            ))}
            {bands.map((band) => (
              <ReferenceLine
                key={`${band.name}-start`}
                x={band.visibleStart}
                stroke={instColor(band.institutionId, cohort)}
                strokeWidth={2.5}
                ifOverflow="hidden"
              />
            ))}
            <XAxis
              type="number"
              dataKey="year"
              domain={[domainStart, yearEnd]}
              allowDecimals={false}
              tick={{ fill: "#4b453c", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "#d6cfc2" }}
              interval="preserveStartEnd"
              minTickGap={28}
              tickMargin={8}
              padding={{ left: SHARE_CHART_LAYOUT.xPad, right: SHARE_CHART_LAYOUT.xPad }}
            />
            <YAxis
              tickFormatter={(v) => `${v}%`}
              domain={[0, yMax]}
              tick={{ fill: "#4b453c", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={SHARE_CHART_LAYOUT.yAxisWidth}
              tickMargin={6}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const year = Number(label);
                const point = series.find((p) => p.year === year);
                return (
                  <div className="rounded-md border border-[#d6cfc2] bg-[#fffdf8] px-3 py-2 text-xs shadow-sm">
                    <div className="mb-1 font-medium">{year}</div>
                    <div className="mb-2 text-[#6b6458]">{point?.journalArticles ?? "—"} articles</div>
                    {institutions.map((inst) => {
                      const cell = point?.byInstitution[inst.id];
                      return (
                        <div key={inst.id} className="mb-1">
                          <span className="font-medium" style={{ color: instColor(inst.id, cohort) }}>
                            {inst.label}
                          </span>
                          <div>
                            in this journal {cell ? formatShare(cell.share) : "—"} (
                            {cell?.articles ?? 0})
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              }}
            />
            {institutions.map((inst) => (
              <Line
                key={`${inst.id}-share`}
                type="linear"
                dataKey={`${inst.id}_share`}
                name={inst.label}
                stroke={instColor(inst.id, cohort)}
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
        {labels.map((label) => (
          <span
            key={`${label.text}-${label.row}`}
            className="pointer-events-none absolute whitespace-nowrap font-semibold"
            style={{
              left: plotLeft + label.x,
              top: 6 + label.y,
              fontSize: labelFont,
              color: instColor(label.institutionId, cohort),
            }}
          >
            {label.text}
          </span>
        ))}
      </div>
    </div>
  );
}
