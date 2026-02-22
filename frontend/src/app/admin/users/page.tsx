"use client";

import { useEffect, useState } from "react";
import { toast } from '@/hooks/use-toast';
import { motion } from "framer-motion";
import { Users, Shield, Crown, Ban, Check, Edit2, X, Loader2 } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNavProvider } from "@/components/layout/mobile-nav-context";
import { Header } from "@/components/layout/header";
import { api, ApiError } from "@/lib/api";
import { User } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editTier, setEditTier] = useState("free");
  const [editRole, setEditRole] = useState("member");
  const [editActive, setEditActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    api.getAdminUsers().then(setUsers).finally(() => setIsLoading(false));
  }, []);

  const openEdit = (u: User) => {
    setEditUser(u);
    setEditTier(u.subscription_tier);
    setEditRole(u.role);
    setEditActive(u.is_active);
  };

  const handleSave = async () => {
    if (!editUser) return;
    setIsSaving(true);
    try {
      const updated = await api.updateAdminUser(editUser.id, {
        role: editRole,
        is_active: editActive,
        subscription_tier: editTier,
      });
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      setEditUser(null);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Fehler beim Speichern", 'error')
    } finally {
      setIsSaving(false);
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
            <h2 className="text-xl font-bold">Nutzerverwaltung</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{users.length} Nutzer</p>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />)}
            </div>
          ) : (
            <div className="rounded-xl border border-foreground/[0.06] bg-card/80 backdrop-blur-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nutzer</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Rolle</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Abo</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Erstellt</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u, i) => (
                    <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="hover:bg-accent/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-[13px] font-medium">{u.name}</p>
                        <p className="text-[11px] text-muted-foreground">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                          u.role === "admin" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-muted/30 text-muted-foreground border-border"
                        )}>
                          {u.role === "admin" ? <Shield className="h-2.5 w-2.5" /> : null}
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                          u.subscription_tier === "premium" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-muted/30 text-muted-foreground border-border"
                        )}>
                          {u.subscription_tier === "premium" ? <Crown className="h-2.5 w-2.5" /> : null}
                          {u.subscription_tier}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                          u.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                        )}>
                          {u.is_active ? <Check className="h-2.5 w-2.5" /> : <Ban className="h-2.5 w-2.5" />}
                          {u.is_active ? "Aktiv" : "Gesperrt"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground">{formatDate(u.created_at)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => openEdit(u)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* Edit Modal */}
      <Dialog.Root open={!!editUser} onOpenChange={o => !o && setEditUser(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-foreground/[0.06] bg-card shadow-2xl p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-base font-semibold">Nutzer bearbeiten</Dialog.Title>
              <Dialog.Close className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>
            {editUser && (
              <div className="space-y-4">
                <p className="text-[13px] text-muted-foreground">{editUser.email}</p>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground/70 mb-1.5 block">Rolle</label>
                  <select value={editRole} onChange={e => setEditRole(e.target.value)} className="w-full rounded-lg border border-foreground/[0.08] bg-foreground/[0.02] px-3 py-2 text-sm">
                    <option value="member">member</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground/70 mb-1.5 block">Abonnement</label>
                  <select value={editTier} onChange={e => setEditTier(e.target.value)} className="w-full rounded-lg border border-foreground/[0.08] bg-foreground/[0.02] px-3 py-2 text-sm">
                    <option value="free">free</option>
                    <option value="premium">premium</option>
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editActive} onChange={e => setEditActive(e.target.checked)} />
                    <span className="text-[13px]">Konto aktiv</span>
                  </label>
                </div>
                <div className="flex gap-3 pt-2">
                  <Dialog.Close className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
                    Abbrechen
                  </Dialog.Close>
                  <button onClick={handleSave} disabled={isSaving} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-70 transition-all">
                    {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Speichern
                  </button>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
    </MobileNavProvider>
  );
}
