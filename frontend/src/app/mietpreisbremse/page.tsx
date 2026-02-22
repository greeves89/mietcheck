"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNavProvider } from "@/components/layout/mobile-nav-context";
import { Header } from "@/components/layout/header";
import { Scale, AlertTriangle, CheckCircle, Info, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

const inputClass = "w-full rounded-lg border border-foreground/[0.08] bg-foreground/[0.02] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 transition-colors";
const labelClass = "text-[11px] font-medium text-muted-foreground/70 mb-1.5 block";

const CITIES = [
  { key: "berlin", label: "Berlin" },
  { key: "münchen", label: "München" },
  { key: "hamburg", label: "Hamburg" },
  { key: "frankfurt", label: "Frankfurt am Main" },
  { key: "köln", label: "Köln" },
  { key: "düsseldorf", label: "Düsseldorf" },
  { key: "stuttgart", label: "Stuttgart" },
  { key: "leipzig", label: "Leipzig" },
  { key: "dresden", label: "Dresden" },
  { key: "hannover", label: "Hannover" },
  { key: "nürnberg", label: "Nürnberg" },
  { key: "bonn", label: "Bonn" },
  { key: "mannheim", label: "Mannheim" },
  { key: "karlsruhe", label: "Karlsruhe" },
  { key: "augsburg", label: "Augsburg" },
  { key: "freiburg", label: "Freiburg im Breisgau" },
  { key: "kiel", label: "Kiel" },
  { key: "mainz", label: "Mainz" },
  { key: "wiesbaden", label: "Wiesbaden" },
  { key: "regensburg", label: "Regensburg" },
];

const CONSTRUCTION_YEARS = [
  { key: "before_1960", label: "Vor 1960" },
  { key: "1960_1979", label: "1960–1979" },
  { key: "1980_1999", label: "1980–1999" },
  { key: "2000_2009", label: "2000–2009" },
  { key: "after_2010", label: "Ab 2010" },
];

interface CheckResult {
  city_label: string;
  has_mietpreisbremse: boolean;
  apartment_size_sqm: number;
  current_rent_sqm: number;
  reference_rent_sqm: number;
  max_allowed_rent_sqm: number;
  current_monthly_rent: number;
  max_allowed_monthly_rent: number;
  overpayment_monthly: number;
  overpayment_yearly: number;
  exceeds_limit: boolean;
  percent_over_limit: number;
  is_exempt: boolean;
  exempt_reason?: string;
  legal_basis: string;
  recommendation: string;
}

function formatEuro(amount: number): string {
  return amount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export default function MietpreisbremseSeite() {
  const [form, setForm] = useState({
    city: "berlin",
    apartment_size_sqm: "",
    current_monthly_rent: "",
    construction_year: "1980_1999",
    is_furnished: false,
    is_modernized: false,
  });
  const [result, setResult] = useState<CheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await api.checkMietpreisbremse({
        city: form.city,
        apartment_size_sqm: parseFloat(form.apartment_size_sqm),
        current_monthly_rent: parseFloat(form.current_monthly_rent),
        construction_year: form.construction_year,
        is_furnished: form.is_furnished,
        is_modernized: form.is_modernized,
      });
      setResult(data as CheckResult);
    } catch (err: any) {
      setError(err.message || "Fehler bei der Prüfung.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MobileNavProvider>
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 md:ml-[260px] flex flex-col overflow-hidden">
        <Header
          title="Mietpreisbremse-Check"
          subtitle="Prüfen Sie ob Ihre Miete die zulässige Höchstgrenze gemäß §556d BGB überschreitet"
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Info Banner */}
            <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-200/30 bg-blue-500/5">
              <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-muted-foreground">
                <strong className="text-foreground">Was ist die Mietpreisbremse?</strong> Die Mietpreisbremse (§556d BGB) gilt in
                Gebieten mit angespanntem Wohnungsmarkt. Bei Neuvermietung darf die Miete die ortsübliche Vergleichsmiete
                nicht um mehr als 10% übersteigen.
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleCheck} className="rounded-2xl border border-border bg-card/50 p-6 space-y-5">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Scale className="w-4 h-4 text-primary" />
                Ihre Daten eingeben
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelClass}>Stadt *</label>
                  <select
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className={inputClass}
                    required
                  >
                    {CITIES.map((c) => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Wohnfläche (m²) *</label>
                  <input
                    type="number"
                    value={form.apartment_size_sqm}
                    onChange={(e) => setForm({ ...form, apartment_size_sqm: e.target.value })}
                    required min="10" max="500" step="0.1"
                    placeholder="z.B. 65"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Aktuelle Kaltmiete (€/Monat) *</label>
                  <input
                    type="number"
                    value={form.current_monthly_rent}
                    onChange={(e) => setForm({ ...form, current_monthly_rent: e.target.value })}
                    required min="0" step="0.01"
                    placeholder="z.B. 1200"
                    className={inputClass}
                  />
                </div>

                <div className="col-span-2">
                  <label className={labelClass}>Baujahr der Wohnung</label>
                  <select
                    value={form.construction_year}
                    onChange={(e) => setForm({ ...form, construction_year: e.target.value })}
                    className={inputClass}
                  >
                    {CONSTRUCTION_YEARS.map((y) => (
                      <option key={y.key} value={y.key}>{y.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_furnished}
                    onChange={(e) => setForm({ ...form, is_furnished: e.target.checked })}
                    className="w-4 h-4 rounded border-border accent-primary"
                  />
                  <span className="text-sm text-foreground">Möblierte Wohnung</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_modernized}
                    onChange={(e) => setForm({ ...form, is_modernized: e.target.checked })}
                    className="w-4 h-4 rounded border-border accent-primary"
                  />
                  <span className="text-sm text-foreground">
                    Umfassend modernisiert (§556f BGB – Ausnahme von der Mietpreisbremse)
                  </span>
                </label>
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
                {isLoading ? "Prüfe..." : "Mietpreisbremse prüfen"}
              </button>
            </form>

            {/* Result */}
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Verdict */}
                <div className={`rounded-2xl border p-5 ${
                  result.is_exempt
                    ? "border-blue-200/30 bg-blue-500/5"
                    : result.exceeds_limit
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-success/30 bg-success/5"
                }`}>
                  <div className="flex items-start gap-3">
                    {result.exceeds_limit && !result.is_exempt ? (
                      <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-semibold text-foreground mb-1">
                        {result.exceeds_limit && !result.is_exempt
                          ? `Mietpreisbremse überschritten! (+${result.percent_over_limit}%)`
                          : "Miete im gesetzlichen Rahmen"}
                      </p>
                      <p className="text-sm text-muted-foreground">{result.recommendation}</p>
                    </div>
                  </div>
                </div>

                {/* Numbers */}
                <div className="rounded-2xl border border-border bg-card/50 p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Berechnungsdetails – {result.city_label}</h3>
                  <div className="space-y-3">
                    {[
                      { label: "Ihre aktuelle Kaltmiete", value: formatEuro(result.current_monthly_rent), sub: `${result.current_rent_sqm.toFixed(2)} €/m²` },
                      { label: "Ortsübliche Vergleichsmiete", value: `${result.reference_rent_sqm.toFixed(2)} €/m²`, sub: null },
                      { label: "Zulässige Höchstmiete (+10%)", value: formatEuro(result.max_allowed_monthly_rent), sub: `${result.max_allowed_rent_sqm.toFixed(2)} €/m²`, highlight: true },
                    ].map((row) => (
                      <div key={row.label} className={`flex justify-between items-center py-2 border-b border-border/50 last:border-0 ${row.highlight ? "font-semibold" : ""}`}>
                        <span className="text-sm text-muted-foreground">{row.label}</span>
                        <div className="text-right">
                          <span className="text-sm text-foreground">{row.value}</span>
                          {row.sub && <p className="text-xs text-muted-foreground">{row.sub}</p>}
                        </div>
                      </div>
                    ))}
                    {result.exceeds_limit && !result.is_exempt && (
                      <>
                        <div className="flex justify-between items-center py-2 border-b border-destructive/20">
                          <span className="text-sm text-destructive font-medium">Zu viel gezahlte Miete / Monat</span>
                          <span className="text-sm text-destructive font-bold">{formatEuro(result.overpayment_monthly)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-destructive font-medium">Zu viel gezahlte Miete / Jahr</span>
                          <span className="text-sm text-destructive font-bold">{formatEuro(result.overpayment_yearly)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Legal basis */}
                <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    <strong>Rechtsgrundlage:</strong> {result.legal_basis}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Hinweis: Diese Berechnung basiert auf Durchschnittswerten und ersetzt keine Rechtsberatung.
                    Für eine verbindliche Prüfung wenden Sie sich an einen Mieterverein oder Rechtsanwalt.
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
