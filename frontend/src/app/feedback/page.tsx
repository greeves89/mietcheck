"use client";

import { motion } from "framer-motion";
import { MessageSquare, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNavProvider } from "@/components/layout/mobile-nav-context";
import { Header } from "@/components/layout/header";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Feedback } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

const statusConfig = {
  pending: { label: "Ausstehend", icon: Clock, color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
  approved: { label: "Beantwortet", icon: CheckCircle2, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  rejected: { label: "Abgelehnt", icon: XCircle, color: "text-red-400 bg-red-500/10 border-red-500/20" },
};

const typeLabels = { bug: "Fehler", feature: "Feature-Wunsch", general: "Allgemein" };

export default function FeedbackPage() {
  const [items, setItems] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    api.getFeedback().then(setItems).finally(() => setIsLoading(false));
  }, [refresh]);

  return (
    <MobileNavProvider>
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 md:ml-[260px] flex flex-col min-h-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold">Feedback</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Teilen Sie uns Ihre Meinung mit</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form */}
            <div>
              <div className="rounded-xl border border-foreground/[0.06] bg-card/80 backdrop-blur-sm p-5">
                <h3 className="text-sm font-semibold mb-4">Neues Feedback senden</h3>
                <FeedbackForm onSuccess={() => setRefresh(r => r + 1)} />
              </div>
            </div>

            {/* My Feedback */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Mein Feedback</h3>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => <div key={i} className="h-24 rounded-xl bg-muted/30 animate-pulse" />)}
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-10 text-center">
                  <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
                  <p className="text-[13px] text-muted-foreground">Noch kein Feedback gesendet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, i) => {
                    const status = statusConfig[item.status] || statusConfig.pending;
                    const StatusIcon = status.icon;
                    return (
                      <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                        className="rounded-xl border border-foreground/[0.06] bg-card/80 backdrop-blur-sm p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">
                                {typeLabels[item.type] || item.type}
                              </span>
                              <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium", status.color)}>
                                <StatusIcon className="h-2.5 w-2.5" />
                                {status.label}
                              </span>
                            </div>
                            <p className="text-sm font-medium">{item.title}</p>
                            <p className="text-[12px] text-muted-foreground mt-1 line-clamp-2">{item.message}</p>
                          </div>
                          <span className="text-[11px] text-muted-foreground flex-shrink-0">{formatDate(item.created_at)}</span>
                        </div>
                        {item.admin_response && (
                          <div className="mt-3 rounded-lg bg-primary/5 border border-primary/10 p-3">
                            <p className="text-[11px] text-primary font-medium mb-1">Antwort vom Team</p>
                            <p className="text-[12px] text-muted-foreground">{item.admin_response}</p>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
    </MobileNavProvider>
  );
}
