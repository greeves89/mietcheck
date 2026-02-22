"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, FileSearch, FileText, MessageSquare, AlertTriangle, Mail, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNavProvider } from "@/components/layout/mobile-nav-context";
import { Header } from "@/components/layout/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { api, ApiError } from "@/lib/api";
import { AdminStats } from "@/lib/types";

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [smtpEmail, setSmtpEmail] = useState("");
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [smtpResult, setSmtpResult] = useState<boolean | null>(null);

  useEffect(() => {
    api.getAdminStats().then(setStats).finally(() => setIsLoading(false));
  }, []);

  const testSmtp = async () => {
    if (!smtpEmail) return;
    setSmtpLoading(true);
    setSmtpResult(null);
    try {
      const res = await api.testSmtp(smtpEmail);
      setSmtpResult(res.success);
    } catch {
      setSmtpResult(false);
    } finally {
      setSmtpLoading(false);
    }
  };

  return (
    <MobileNavProvider>
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 md:ml-[260px] flex flex-col min-h-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold">Admin-Dashboard</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Systemübersicht und Verwaltung</p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-xl bg-muted/30 animate-pulse" />)}
            </div>
          ) : stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatsCard title="Nutzer gesamt" value={stats.total_users} icon={Users} color="blue" index={0} description={`${stats.premium_users} Premium`} />
              <StatsCard title="Prüfungen gesamt" value={stats.total_bills} icon={FileSearch} color="green" index={1} />
              <StatsCard title="Widerspruchsbriefe" value={stats.total_objections} icon={FileText} color="purple" index={2} />
              <StatsCard title="Offenes Feedback" value={stats.pending_feedback} icon={MessageSquare} color="yellow" index={3} description={`${stats.total_feedback} gesamt`} />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Quick links */}
            <div className="rounded-xl border border-foreground/[0.06] bg-card/80 backdrop-blur-sm p-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">Verwaltung</p>
              <div className="space-y-2">
                <Link href="/admin/users" className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-accent/50 transition-colors text-[13px] font-medium">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10">
                    <Users className="h-4 w-4 text-blue-400" />
                  </div>
                  Nutzerverwaltung
                </Link>
                <Link href="/admin/feedback" className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-accent/50 transition-colors text-[13px] font-medium">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-500/10">
                    <MessageSquare className="h-4 w-4 text-yellow-400" />
                  </div>
                  Feedback verwalten
                  {stats && stats.pending_feedback > 0 && (
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500 text-[11px] font-bold text-black">
                      {stats.pending_feedback}
                    </span>
                  )}
                </Link>
              </div>
            </div>

            {/* SMTP Test */}
            <div className="rounded-xl border border-foreground/[0.06] bg-card/80 backdrop-blur-sm p-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">SMTP-Test</p>
              <p className="text-[13px] text-muted-foreground mb-3">Test-E-Mail versenden, um SMTP-Konfiguration zu prüfen.</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={smtpEmail}
                  onChange={e => setSmtpEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="flex-1 rounded-lg border border-foreground/[0.08] bg-foreground/[0.02] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
                <button
                  onClick={testSmtp}
                  disabled={smtpLoading || !smtpEmail}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-[13px] font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all"
                >
                  {smtpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Testen
                </button>
              </div>
              {smtpResult !== null && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`mt-2 flex items-center gap-2 text-[13px] ${smtpResult ? "text-emerald-400" : "text-red-400"}`}>
                  {smtpResult ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  {smtpResult ? "E-Mail erfolgreich gesendet" : "Fehler beim Senden – SMTP konfiguriert?"}
                </motion.div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
    </MobileNavProvider>
  );
}
