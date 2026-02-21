"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { FileSearch, ArrowRight, Calendar, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { UtilityBill } from "@/lib/types";
import { cn, formatCurrency, formatDate, scoreBgColor } from "@/lib/utils";

interface BillCardProps {
  bill: UtilityBill;
  index?: number;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "Ausstehend", color: "bg-muted/50 text-muted-foreground border-border" },
  checked: { label: "Geprüft", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  objection_sent: { label: "Widerspruch", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
};

export function BillCard({ bill, index = 0 }: BillCardProps) {
  const status = statusLabels[bill.status] || statusLabels.pending;
  const resultNum = bill.result_amount ? parseFloat(bill.result_amount) : null;
  const errorCount = bill.check_results.filter((r) => r.severity === "error").length;
  const warningCount = bill.check_results.filter((r) => r.severity === "warning").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/bills/${bill.id}`}>
        <div className="group rounded-xl border border-foreground/[0.06] bg-card/80 backdrop-blur-sm p-5 hover:border-primary/30 hover:bg-card transition-all duration-200 cursor-pointer">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                <FileSearch className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">Abrechnung {bill.billing_year}</p>
                  <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium", status.color)}>
                    {status.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDate(bill.billing_period_start)} – {formatDate(bill.billing_period_end)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Score */}
              {bill.check_score !== null && bill.check_score !== undefined && (
                <div className={cn("rounded-full border px-2.5 py-1 text-[12px] font-bold", scoreBgColor(bill.check_score))}>
                  {bill.check_score}/100
                </div>
              )}

              {/* Result */}
              {resultNum !== null && (
                <div className={cn(
                  "flex items-center gap-1 text-sm font-semibold",
                  resultNum > 0 ? "text-red-400" : resultNum < 0 ? "text-emerald-400" : "text-muted-foreground"
                )}>
                  {resultNum > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : resultNum < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                  {formatCurrency(Math.abs(resultNum))}
                </div>
              )}

              <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>

          {/* Check summary */}
          {bill.check_results.length > 0 && (
            <div className="mt-3 flex items-center gap-3">
              {errorCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] text-red-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                  {errorCount} Fehler
                </span>
              )}
              {warningCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] text-yellow-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                  {warningCount} Warnungen
                </span>
              )}
              {errorCount === 0 && warningCount === 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Keine Beanstandungen
                </span>
              )}
              {bill.total_costs && (
                <span className="ml-auto text-[11px] text-muted-foreground">
                  Gesamt: {formatCurrency(bill.total_costs)}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
