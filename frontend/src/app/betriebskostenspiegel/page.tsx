"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNavProvider } from "@/components/layout/mobile-nav-context";
import { Header } from "@/components/layout/header";
import {
  BarChart3,
  Info,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";

const inputClass =
  "w-full rounded-lg border border-foreground/[0.08] bg-foreground/[0.02] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 transition-colors";
const labelClass = "text-[11px] font-medium text-muted-foreground/70 mb-1.5 block";

interface Stadt {
  key: string;
  label: string;
  bundesland: string;
  mietpreisgebiet: string;
  gesamt_avg: number;
}

interface Kategorie {
  key: string;
  label: string;
  avg: number;
  min: number;
  max: number;
}

interface VergleichResult {
  stadt: string;
  label: string;
  bundesland: string;
  mietpreisgebiet: string;
  gesamt_avg: number;
  gesamt_min: number;
  gesamt_max: number;
  kategorien: Kategorie[];
  hinweis: string;
  vergleich?: {
    eigene_kosten: number;
    abweichung: number;
    abweichung_prozent: number;
    bewertung: string;
  };
}

const BEWERTUNG_CONFIG: Record<string, { label: string; color: string; Icon: any }> = {
  deutlich_unter: {
    label: "Deutlich unter Durchschnitt",
    color: "text-success border-success/30 bg-success/5",
    Icon: TrendingDown,
  },
  unter: {
    label: "Unter Durchschnitt",
    color: "text-blue-400 border-blue-200/30 bg-blue-500/5",
    Icon: TrendingDown,
  },
  durchschnitt: {
    label: "Im Durchschnitt",
    color: "text-foreground border-border bg-card/50",
    Icon: Minus,
  },
  ueber: {
    label: "Über Durchschnitt",
    color: "text-amber-400 border-amber-200/30 bg-amber-500/5",
    Icon: TrendingUp,
  },
  deutlich_ueber: {
    label: "Deutlich über Durchschnitt",
    color: "text-destructive border-destructive/30 bg-destructive/5",
    Icon: TrendingUp,
  },
};

function formatCent(val: number): string {
  return val.toFixed(2).replace(".", ",") + " €/m²/Monat";
}

export default function BetriebskostenspiegelPage() {
  const [staedte, setStaedte] = useState<Stadt[]>([]);
  const [selectedStadt, setSelectedStadt] = useState("bundesweit");
  const [eigeneKosten, setEigeneKosten] = useState("");
  const [result, setResult] = useState<VergleichResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getBetriebskostenspiegelStaedte().then((data) => {
      setStaedte(data);
    });
  }, []);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setResult(null);
    try {
      const eigene = eigeneKosten ? parseFloat(eigeneKosten) : undefined;
      const data = await api.getBetriebskostenspiegelVergleich(selectedStadt, eigene);
      setResult(data as VergleichResult);
    } catch (err: any) {
      setError(err.message || "Fehler beim Laden der Vergleichsdaten.");
    } finally {
      setIsLoading(false);
    }
  };

  const bewertung = result?.vergleich
    ? BEWERTUNG_CONFIG[result.vergleich.bewertung] ?? BEWERTUNG_CONFIG.durchschnitt
    : null;

  return (
    <MobileNavProvider>
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 md:ml-[260px] flex flex-col overflow-hidden">
        <Header
          title="Regionaler Betriebskostenspiegel"
          subtitle="Vergleichen Sie Ihre Nebenkosten mit dem regionalen Durchschnitt (DMB Betriebskostenspiegel)"
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Info Banner */}
            <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-200/30 bg-blue-500/5">
              <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-muted-foreground">
                <strong className="text-foreground">Was ist der Betriebskostenspiegel?</strong> Der DMB Betriebskostenspiegel
                zeigt typische Nebenkosten nach Region. Vergleichen Sie Ihre eigenen Betriebskosten mit dem Durchschnitt
                Ihrer Stadt und erkennen Sie, ob Sie zu viel zahlen.
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleCheck} className="rounded-2xl border border-border bg-card/50 p-6 space-y-5">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Region auswählen & vergleichen
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelClass}>Region / Stadt *</label>
                  <select
                    value={selectedStadt}
                    onChange={(e) => setSelectedStadt(e.target.value)}
                    className={inputClass}
                    required
                  >
                    {staedte.length === 0 && (
                      <option value="bundesweit">Bundesweit (Durchschnitt)</option>
                    )}
                    {staedte.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                        {s.mietpreisgebiet === "angespannt" ? " (angespannter Markt)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className={labelClass}>
                    Ihre eigenen Betriebskosten (€/m²/Monat) – optional
                  </label>
                  <input
                    type="number"
                    value={eigeneKosten}
                    onChange={(e) => setEigeneKosten(e.target.value)}
                    min="0"
                    max="10"
                    step="0.01"
                    placeholder="z.B. 2.50 – leer lassen für reine Übersicht"
                    className={inputClass}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Tipp: Teilen Sie Ihre jährliche Nebenkostenabrechnung durch 12 und durch Ihre Wohnfläche.
                  </p>
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isLoading ? "Lade Vergleichsdaten..." : "Betriebskosten vergleichen"}
              </button>
            </form>

            {/* Result */}
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Personal comparison verdict */}
                {result.vergleich && bewertung && (
                  <div className={`rounded-2xl border p-5 ${bewertung.color}`}>
                    <div className="flex items-start gap-3">
                      <bewertung.Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-foreground mb-1">
                          {bewertung.label} ({result.vergleich.abweichung_prozent > 0 ? "+" : ""}
                          {result.vergleich.abweichung_prozent.toFixed(1)}%)
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Ihre Kosten:{" "}
                          <strong className="text-foreground">{formatCent(result.vergleich.eigene_kosten)}</strong>
                          {" · "}Durchschnitt {result.label}:{" "}
                          <strong className="text-foreground">{formatCent(result.gesamt_avg)}</strong>
                          {" · "}Abweichung:{" "}
                          <strong className="text-foreground">
                            {result.vergleich.abweichung > 0 ? "+" : ""}
                            {formatCent(result.vergleich.abweichung)}
                          </strong>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Regional overview */}
                <div className="rounded-2xl border border-border bg-card/50 p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-1">
                    Betriebskostenspiegel – {result.label}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    {result.bundesland} ·{" "}
                    {result.mietpreisgebiet === "angespannt"
                      ? "Angespannter Wohnungsmarkt"
                      : "Normaler Wohnungsmarkt"}
                  </p>

                  {/* Gesamtkosten summary */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                      { label: "Minimum", value: formatCent(result.gesamt_min) },
                      { label: "Durchschnitt", value: formatCent(result.gesamt_avg), highlight: true },
                      { label: "Maximum", value: formatCent(result.gesamt_max) },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className={`rounded-xl p-3 text-center border ${
                          item.highlight
                            ? "border-primary/30 bg-primary/5"
                            : "border-border bg-muted/20"
                        }`}
                      >
                        <p className="text-[11px] text-muted-foreground mb-1">{item.label}</p>
                        <p
                          className={`text-sm font-semibold ${
                            item.highlight ? "text-primary" : "text-foreground"
                          }`}
                        >
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Category breakdown */}
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Aufschlüsselung nach Kostenart
                  </h4>
                  <div className="space-y-2">
                    {result.kategorien.map((kat) => {
                      const barWidth = Math.min(100, (kat.avg / result.gesamt_avg) * 60);
                      return (
                        <div key={kat.key} className="flex items-center gap-3 py-1.5 border-b border-border/40 last:border-0">
                          <div className="w-44 flex-shrink-0">
                            <p className="text-xs text-foreground font-medium">{kat.label}</p>
                          </div>
                          <div className="flex-1 flex items-center gap-2">
                            <div className="flex-1 bg-muted/30 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full bg-primary/60 rounded-full"
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                            <span className="text-xs text-foreground font-medium w-16 text-right">
                              {kat.avg.toFixed(2)} €
                            </span>
                          </div>
                          <div className="w-28 text-right">
                            <span className="text-[10px] text-muted-foreground">
                              {kat.min.toFixed(2)}–{kat.max.toFixed(2)} €
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-3">
                    Alle Werte in €/m²/Monat. Bereich = typisches Min–Max im jeweiligen Gebiet.
                  </p>
                </div>

                {/* Source note */}
                <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    <strong>Quelle:</strong> {result.hinweis}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Hinweis: Diese Vergleichswerte basieren auf statistischen Durchschnittswerten und ersetzt keine
                    individuelle Nebenkostenprüfung. Nutzen Sie die <strong>Nebenkostenprüfung</strong> für eine
                    detaillierte Analyse Ihrer konkreten Abrechnung.
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </main>
      </div>
    </div>
    </MobileNavProvider>
  );
}
