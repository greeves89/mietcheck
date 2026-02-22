"use client";

import { UtilityBill } from "@/lib/types";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface YearComparisonProps {
  bills: UtilityBill[];
}

interface YearSummary {
  year: number;
  totalCosts: number;
  billCount: number;
  avgScore: number | null;
}

export function YearComparison({ bills }: YearComparisonProps) {
  // Group by billing_year
  const yearMap = new Map<number, YearSummary>();

  for (const bill of bills) {
    const year = bill.billing_year;
    const existing = yearMap.get(year);
    const costs = bill.total_costs ? parseFloat(bill.total_costs) : 0;
    const score = bill.check_score ?? null;

    if (existing) {
      existing.totalCosts += costs;
      existing.billCount += 1;
      if (score !== null) {
        const currentAvg = existing.avgScore ?? 0;
        existing.avgScore = (currentAvg * (existing.billCount - 1) + score) / existing.billCount;
      }
    } else {
      yearMap.set(year, {
        year,
        totalCosts: costs,
        billCount: 1,
        avgScore: score,
      });
    }
  }

  const years = Array.from(yearMap.values()).sort((a, b) => a.year - b.year);

  if (years.length < 2) return null;

  const maxCosts = Math.max(...years.map((y) => y.totalCosts), 1);

  return (
    <div className="rounded-xl border border-foreground/[0.06] bg-card/80 backdrop-blur-sm p-5 mb-6">
      <h3 className="text-sm font-semibold mb-4">Jahresvergleich</h3>
      <div className="space-y-3">
        {years.map((yr, i) => {
          const prev = years[i - 1];
          const diff = prev ? yr.totalCosts - prev.totalCosts : null;
          const diffPct = prev && prev.totalCosts > 0 ? (diff! / prev.totalCosts) * 100 : null;
          const barW = (yr.totalCosts / maxCosts) * 100;

          const isUp = diff !== null && diff > 0;
          const isDown = diff !== null && diff < 0;

          return (
            <div key={yr.year} className="space-y-1">
              <div className="flex items-center justify-between text-[13px]">
                <span className="font-medium">{yr.year}</span>
                <div className="flex items-center gap-2">
                  {diffPct !== null && (
                    <span className={`flex items-center gap-0.5 text-[11px] font-medium ${
                      isUp ? "text-red-400" : isDown ? "text-emerald-400" : "text-muted-foreground"
                    }`}>
                      {isUp ? <TrendingUp className="h-3 w-3" /> : isDown ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                      {isUp ? "+" : ""}{diffPct.toFixed(1)}%
                    </span>
                  )}
                  <span className="font-semibold">
                    {yr.totalCosts.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                  </span>
                  {yr.avgScore !== null && (
                    <span className={`text-[11px] px-1.5 py-0.5 rounded-md ${
                      yr.avgScore >= 70 ? "bg-emerald-500/10 text-emerald-400" :
                      yr.avgScore >= 40 ? "bg-amber-500/10 text-amber-400" :
                      "bg-red-500/10 text-red-400"
                    }`}>
                      Score {Math.round(yr.avgScore)}
                    </span>
                  )}
                </div>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted/30">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    isUp ? "bg-red-400" : isDown ? "bg-emerald-400" : "bg-blue-500"
                  }`}
                  style={{ width: `${barW}%` }}
                />
              </div>
              {diff !== null && (
                <p className="text-[11px] text-muted-foreground">
                  {isUp
                    ? `+${Math.abs(diff).toLocaleString("de-DE", { style: "currency", currency: "EUR" })} teurer als ${prev!.year}`
                    : isDown
                    ? `-${Math.abs(diff).toLocaleString("de-DE", { style: "currency", currency: "EUR" })} günstiger als ${prev!.year}`
                    : `Gleiche Kosten wie ${prev!.year}`}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {years.length >= 3 && (() => {
        const first = years[0];
        const last = years[years.length - 1];
        const totalDiff = last.totalCosts - first.totalCosts;
        const totalPct = first.totalCosts > 0 ? (totalDiff / first.totalCosts) * 100 : 0;
        return (
          <div className="mt-4 pt-3 border-t border-border/50 text-[12px] text-muted-foreground">
            Gesamt {first.year}–{last.year}:{" "}
            <span className={`font-medium ${totalDiff > 0 ? "text-red-400" : "text-emerald-400"}`}>
              {totalDiff > 0 ? "+" : ""}{totalPct.toFixed(1)}% ({totalDiff > 0 ? "+" : ""}
              {totalDiff.toLocaleString("de-DE", { style: "currency", currency: "EUR" })})
            </span>
          </div>
        );
      })()}
    </div>
  );
}
