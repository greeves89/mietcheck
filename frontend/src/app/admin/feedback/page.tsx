"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Clock, CheckCircle2, XCircle, Send, Loader2 } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { api, ApiError } from "@/lib/api";
import { Feedback } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

const statusConfig = {
  pending: { label: "Ausstehend", icon: Clock, color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
  approved: { label: "Beantwortet", icon: CheckCircle2, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  rejected: { label: "Abgelehnt", icon: XCircle, color: "text-red-400 bg-red-500/10 border-red-500/20" },
};
const typeLabels: Record<string, string> = { bug: "Fehler", feature: "Feature-Wunsch", general: "Allgemein" };

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("pending");
  const [responding, setResponding] = useState<number | null>(null);
  const [response, setResponse] = useState("");
  const [status, setStatus] = useState("approved");
  const [isSaving, setIsSaving] = useState(false);

  const load = () => {
    setIsLoading(true);
    api.getAdminFeedback(filter || undefined).then(setItems).finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  const handleRespond = async (id: number) => {
    setIsSaving(true);
    try {
      const updated = await api.updateAdminFeedback(id, { status, admin_response: response || null });
      setItems(prev => prev.map(f => f.id === updated.id ? updated : f));
      setResponding(null);
      setResponse("");
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Fehler");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 ml-[260px] flex flex-col min-h-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">Feedback-Verwaltung</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{items.length} Einträge</p>
            </div>
            <div className="flex gap-2">
              {["", "pending", "approved", "rejected"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "rounded-xl px-3 py-2 text-[13px] font-medium transition-all",
                    filter === f ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f === "" ? "Alle" : f === "pending" ? "Offen" : f === "approved" ? "Beantwortet" : "Abgelehnt"}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-muted/30 animate-pulse" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-12 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-[13px] text-muted-foreground">Kein Feedback gefunden</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, i) => {
                const s = statusConfig[item.status] || statusConfig.pending;
                const SIcon = s.icon;
                const isOpen = responding === item.id;
                return (
                  <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="rounded-xl border border-foreground/[0.06] bg-card/80 backdrop-blur-sm p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">{typeLabels[item.type] || item.type}</span>
                          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium", s.color)}>
                            <SIcon className="h-2.5 w-2.5" />
                            {s.label}
                          </span>
                          {item.user_name && <span className="text-[11px] text-muted-foreground">von {item.user_name} ({item.user_email})</span>}
                        </div>
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="text-[13px] text-muted-foreground mt-1">{item.message}</p>
                        {item.admin_response && (
                          <div className="mt-2 rounded-lg bg-primary/5 border border-primary/10 p-3">
                            <p className="text-[11px] text-primary font-medium">Antwort</p>
                            <p className="text-[12px] text-muted-foreground mt-0.5">{item.admin_response}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[11px] text-muted-foreground">{formatDate(item.created_at)}</span>
                        <button
                          onClick={() => { setResponding(isOpen ? null : item.id); setResponse(""); setStatus("approved"); }}
                          className="flex items-center gap-1.5 rounded-xl border border-border px-2.5 py-1.5 text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                        >
                          <Send className="h-3 w-3" />
                          Antworten
                        </button>
                      </div>
                    </div>

                    {isOpen && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 pt-4 border-t border-border space-y-3">
                        <div className="flex gap-2">
                          {["approved", "rejected"].map(st => (
                            <button key={st} onClick={() => setStatus(st)}
                              className={cn("rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-all",
                                status === st ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                              )}
                            >
                              {st === "approved" ? "Beantwortet" : "Abgelehnt"}
                            </button>
                          ))}
                        </div>
                        <textarea
                          value={response}
                          onChange={e => setResponse(e.target.value)}
                          rows={3}
                          placeholder="Antwort (optional)..."
                          className="w-full rounded-lg border border-foreground/[0.08] bg-foreground/[0.02] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => setResponding(null)} className="rounded-xl border border-border px-3 py-2 text-[13px] text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
                            Abbrechen
                          </button>
                          <button onClick={() => handleRespond(item.id)} disabled={isSaving}
                            className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-[13px] font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-70 transition-all"
                          >
                            {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            Speichern
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
