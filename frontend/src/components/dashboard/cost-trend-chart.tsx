"use client";

import { UtilityBill } from "@/lib/types";

interface CostTrendChartProps {
  bills: UtilityBill[];
}

export function CostTrendChart({ bills }: CostTrendChartProps) {
  // Group total costs by billing year
  const yearMap = new Map<number, number>();
  for (const bill of bills) {
    if (!bill.total_costs) continue;
    const year = bill.billing_year;
    yearMap.set(year, (yearMap.get(year) || 0) + parseFloat(bill.total_costs));
  }

  const data = Array.from(yearMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, total]) => ({ year, total }));

  if (data.length === 0) {
    return (
      <div className="h-28 flex items-center justify-center text-sm text-muted-foreground">
        Noch keine Jahreskosten vorhanden
      </div>
    );
  }

  if (data.length === 1) {
    const d = data[0];
    return (
      <div className="flex flex-col items-center justify-center gap-1 py-4">
        <p className="text-2xl font-bold">{d.total.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</p>
        <p className="text-xs text-muted-foreground">Gesamtkosten {d.year}</p>
        <p className="text-[11px] text-muted-foreground mt-1">Mehrjähriger Vergleich ab 2 Abrechnungen</p>
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.total), 1);
  const chartH = 100;
  const barW = 32;
  const paddingX = 48;
  const paddingY = 12;
  const spacing = 20;
  const chartW = data.length * (barW + spacing) + paddingX + 8;

  const scale = (val: number) => chartH - (val / maxVal) * chartH;
  const ticks = [0, 0.5, 1].map((t) => ({
    val: maxVal * t,
    y: chartH - chartH * t + paddingY,
  }));

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${chartW} ${chartH + paddingY + 24}`}
        className="w-full"
        style={{ minWidth: `${Math.max(chartW, 200)}px` }}
      >
        {ticks.map((tick) => (
          <g key={tick.val}>
            <line
              x1={paddingX}
              y1={tick.y}
              x2={chartW - 4}
              y2={tick.y}
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeWidth={1}
            />
            <text
              x={paddingX - 4}
              y={tick.y + 4}
              textAnchor="end"
              fontSize={7}
              fill="currentColor"
              fillOpacity={0.4}
            >
              {tick.val >= 1000
                ? `${(tick.val / 1000).toFixed(1)}k`
                : tick.val.toFixed(0)}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const x = paddingX + i * (barW + spacing);
          const barH = (d.total / maxVal) * chartH;
          const prev = i > 0 ? data[i - 1].total : null;
          const isHigher = prev !== null && d.total > prev;
          const isLower = prev !== null && d.total < prev;
          const fill = isHigher ? "hsl(var(--destructive))" : isLower ? "hsl(var(--success))" : "#3b82f6";

          return (
            <g key={d.year}>
              <rect
                x={x}
                y={scale(d.total) + paddingY}
                width={barW}
                height={barH}
                rx={4}
                fill={fill}
                fillOpacity={0.75}
              />
              <text
                x={x + barW / 2}
                y={chartH + paddingY + 14}
                textAnchor="middle"
                fontSize={9}
                fill="currentColor"
                fillOpacity={0.5}
              >
                {d.year}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-emerald-500 opacity-75" />
          Günstiger als Vorjahr
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-destructive opacity-75" />
          Teurer als Vorjahr
        </div>
      </div>
    </div>
  );
}
