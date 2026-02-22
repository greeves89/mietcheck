"use client";

import { UtilityBill } from "@/lib/types";

interface CostBreakdownChartProps {
  bills: UtilityBill[];
}

const COLORS = [
  "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b",
  "#ef4444", "#ec4899", "#14b8a6", "#6b7280",
];

export function CostBreakdownChart({ bills }: CostBreakdownChartProps) {
  // Aggregate positions by category across all bills
  const categoryMap = new Map<string, number>();
  for (const bill of bills) {
    for (const pos of bill.positions) {
      const cat = pos.category || "Sonstiges";
      const amount = parseFloat(pos.tenant_amount || pos.total_amount || "0");
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + amount);
    }
  }

  const sorted = Array.from(categoryMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, amount], i) => ({ name, amount, color: COLORS[i % COLORS.length] }));

  if (sorted.length === 0) {
    return (
      <div className="h-28 flex items-center justify-center text-sm text-muted-foreground">
        Noch keine Kostendaten vorhanden
      </div>
    );
  }

  const total = sorted.reduce((s, c) => s + c.amount, 0);
  const size = 90;
  const cx = size / 2;
  const cy = size / 2;
  const r = 34;
  const innerR = 20;

  let angle = -Math.PI / 2;
  const paths = sorted.map((slice) => {
    const portion = slice.amount / total;
    const startAngle = angle;
    const endAngle = angle + portion * 2 * Math.PI;
    angle = endAngle;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const ix1 = cx + innerR * Math.cos(startAngle);
    const iy1 = cy + innerR * Math.sin(startAngle);
    const ix2 = cx + innerR * Math.cos(endAngle);
    const iy2 = cy + innerR * Math.sin(endAngle);
    const largeArc = portion > 0.5 ? 1 : 0;

    const d = [
      `M ${x1} ${y1}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${ix2} ${iy2}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1}`,
      "Z",
    ].join(" ");

    return { ...slice, d, portion };
  });

  return (
    <div className="flex items-start gap-4">
      <svg width={size} height={size} className="flex-shrink-0">
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill={p.color} fillOpacity={0.85} />
        ))}
      </svg>
      <div className="flex-1 min-w-0 space-y-1">
        {sorted.map((cat, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: cat.color }} />
            <span className="text-muted-foreground truncate flex-1">{cat.name}</span>
            <span className="font-medium text-foreground flex-shrink-0">
              {((cat.amount / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
        <div className="pt-1 border-t border-border/50">
          <span className="text-xs text-muted-foreground">Gesamt: </span>
          <span className="text-xs font-medium">{total.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</span>
        </div>
      </div>
    </div>
  );
}
