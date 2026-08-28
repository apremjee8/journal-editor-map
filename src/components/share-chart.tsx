"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { instColor } from "@/lib/colors";
import { formatShare } from "@/lib/load-bundle";
import type { EditorTenure, InstitutionGroup, YearPoint } from "@/lib/types";

type Props = {
  series: YearPoint[];
  institutions: InstitutionGroup[];
  editors: EditorTenure[];
};

export function ShareChart({ series, institutions, editors }: Props) {
  const rows = series.map((p) => {
    const row: Record<string, number> = { year: p.year, journalArticles: p.journalArticles };
    for (const inst of institutions) {
      const cell = p.byInstitution[inst.id];
      row[`${inst.id}_share`] = (cell?.share ?? 0) * 100;
      row[`${inst.id}_articles`] = cell?.articles ?? 0;
    }
    return row;
  });

  const bands = editors.filter(
    (e) => e.institutionGroupId && e.startYear != null && e.role !== "deputy"
  );

  const maxShare = Math.max(
    4,
    ...rows.flatMap((r) =>
      institutions.map((inst) => r[`${inst.id}_share`] ?? 0)
    )
  );
  const yMax = Math.min(100, Math.ceil(maxShare / 2) * 2 + 2);

  return (
    <div className="h-[240px] w-full sm:h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e7e2d8" vertical={false} />
          {bands.map((e) => {
            const x1 = e.startYear!;
            const x2 = e.endYear ?? series[series.length - 1]?.year;
            if (x2 == null) return null;
            return (
              <ReferenceArea
                key={`${e.name}-${x1}`}
                x1={x1}
                x2={x2}
                fill={instColor(e.institutionGroupId!)}
                fillOpacity={0.06}
                ifOverflow="extendDomain"
              />
            );
          })}
          <XAxis
            dataKey="year"
            tick={{ fill: "#4b453c", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "#d6cfc2" }}
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis
            tickFormatter={(v) => `${v}%`}
            domain={[0, yMax]}
            tick={{ fill: "#4b453c", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={36}
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
                        <span className="font-medium" style={{ color: instColor(inst.id) }}>
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
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#3f3a33" }}
            formatter={(value) => value}
          />
          {institutions.map((inst) => (
            <Line
              key={`${inst.id}-share`}
              type="monotone"
              dataKey={`${inst.id}_share`}
              name={inst.label}
              stroke={instColor(inst.id)}
              strokeWidth={2.2}
              dot={false}
              activeDot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
