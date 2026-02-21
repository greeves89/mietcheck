"use client";

import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { CheckResult } from "@/lib/types";
import { cn, severityBg, severityColor, CHECK_TYPE_LABELS } from "@/lib/utils";

interface CheckResultsProps {
  results: CheckResult[];
  score: number;
}

const SeverityIcon = ({ severity }: { severity: string }) => {
  if (severity === "ok") return <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />;
  if (severity === "warning") return <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0" />;
  return <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />;
};

export function CheckResults({ results, score }: CheckResultsProps) {
  const [expanded, setExpanded] = useState<number[]>([]);

  const toggleExpand = (id: number) => {
    setExpanded((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  // Group by check_type
  const grouped = results.reduce((acc, r) => {
    if (!acc[r.check_type]) acc[r.check_type] = [];
    acc[r.check_type].push(r);
    return acc;
  }, {} as Record<string, CheckResult[]>);

  const scoreColor = score >= 80 ? "text-emerald-400" : score >= 60 ? "text-yellow-400" : "text-red-400";
  const scoreBg = score >= 80
    ? "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30"
    : score >= 60
    ? "from-yellow-500/20 to-yellow-500/5 border-yellow-500/30"
    : "from-red-500/20 to-red-500/5 border-red-500/30";

  return (
    <div className="space-y-4">
      {/* Score */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn("rounded-xl border p-5 bg-gradient-to-br", scoreBg)}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">Prüfscore</p>
            <p className={cn("text-4xl font-bold mt-1", scoreColor)}>{score}<span className="text-lg text-muted-foreground">/100</span></p>
            <p className="text-sm text-muted-foreground mt-1">
              {score >= 80 ? "Abrechnung weitgehend korrekt" : score >= 60 ? "Einige Auffälligkeiten gefunden" : "Erhebliche Probleme gefunden"}
            </p>
          </div>
          <div className="relative h-20 w-20">
            <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/30" />
              <circle
                cx="18" cy="18" r="15.9" fill="none" strokeWidth="2.5"
                stroke={score >= 80 ? "#34d399" : score >= 60 ? "#fbbf24" : "#f87171"}
                strokeDasharray={`${score} 100`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
          </div>
        </div>
      </motion.div>

      {/* Results by type */}
      {Object.entries(grouped).map(([type, typeResults], gi) => (
        <motion.div
          key={type}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: gi * 0.05 }}
          className="rounded-xl border border-foreground/[0.06] bg-card/80 backdrop-blur-sm overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{CHECK_TYPE_LABELS[type] || type}</p>
              <div className="flex items-center gap-2">
                {typeResults.map((r) => (
                  <SeverityIcon key={r.id} severity={r.severity} />
                ))}
              </div>
            </div>
          </div>
          <div className="divide-y divide-border">
            {typeResults.map((result) => (
              <div key={result.id} className={cn("transition-colors", severityBg(result.severity), "border-l-2")}>
                <button
                  onClick={() => toggleExpand(result.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/20 transition-colors"
                >
                  <SeverityIcon severity={result.severity} />
                  <span className="flex-1 text-[13px] font-medium">{result.title}</span>
                  {expanded.includes(result.id) ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {expanded.includes(result.id) && (
                  <div className="px-4 pb-3 pl-11 space-y-2">
                    <p className="text-[13px] text-muted-foreground">{result.description}</p>
                    {result.recommendation && (
                      <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
                        <p className="text-[12px] font-medium text-primary">Empfehlung</p>
                        <p className="text-[12px] text-muted-foreground mt-1">{result.recommendation}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
