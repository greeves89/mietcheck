import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "–";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(num);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "–";
  const d = new Date(dateStr);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function scoreColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return "text-muted-foreground";
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-yellow-400";
  return "text-red-400";
}

export function scoreBgColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return "bg-muted/50";
  if (score >= 80) return "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
  if (score >= 60) return "bg-yellow-500/10 border-yellow-500/20 text-yellow-400";
  return "bg-red-500/10 border-red-500/20 text-red-400";
}

export function severityColor(severity: string): string {
  switch (severity) {
    case "ok": return "text-emerald-400";
    case "warning": return "text-yellow-400";
    case "error": return "text-red-400";
    default: return "text-muted-foreground";
  }
}

export function severityBg(severity: string): string {
  switch (severity) {
    case "ok": return "bg-emerald-500/10 border-emerald-500/20";
    case "warning": return "bg-yellow-500/10 border-yellow-500/20";
    case "error": return "bg-red-500/10 border-red-500/20";
    default: return "bg-muted/30 border-border";
  }
}

export const CATEGORY_LABELS: Record<string, string> = {
  heating: "Heizung",
  hot_water: "Warmwasser",
  water_sewage: "Wasser/Abwasser",
  garbage: "Müllentsorgung",
  building_insurance: "Gebäudeversicherung",
  liability_insurance: "Haftpflichtversicherung",
  elevator: "Aufzug",
  garden: "Gartenpflege",
  cleaning: "Hausreinigung",
  caretaker: "Hausmeister",
  cable_tv: "Kabel/Antenne",
  building_lighting: "Hausbeleuchtung",
  other: "Sonstiges",
};

export const CHECK_TYPE_LABELS: Record<string, string> = {
  math: "Rechenprüfung",
  deadline: "Fristprüfung",
  plausibility: "Plausibilitätsprüfung",
  legal: "Rechtsprüfung",
  completeness: "Vollständigkeit",
};

export const HEATING_TYPE_LABELS: Record<string, string> = {
  central: "Zentralheizung",
  individual: "Einzelofenheizung",
  district: "Fernwärme",
};
