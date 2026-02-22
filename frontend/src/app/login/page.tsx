"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckSquare, Mail, Lock, AlertTriangle, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";

const inputClass = "w-full rounded-xl border border-foreground/[0.08] bg-foreground/[0.03] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/50 transition-colors pl-10";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { setUser } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const res = await api.login(email, password);
      setUser(res.user);
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Anmeldung fehlgeschlagen");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-cyan-500/5 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-xl shadow-blue-500/20 mb-4">
            <CheckSquare className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">MietCheck</h1>
          <p className="text-sm text-muted-foreground mt-1">Nebenkostenabrechnung prüfen</p>
        </div>

        <div className="rounded-2xl border border-foreground/[0.06] bg-card/80 backdrop-blur-xl p-6 shadow-xl">
          <h2 className="text-base font-semibold mb-5">Anmelden</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="E-Mail-Adresse"
                autoComplete="email"
                className={inputClass}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Passwort"
                autoComplete="current-password"
                className={inputClass}
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5"
              >
                <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <p className="text-[13px] text-red-400">{error}</p>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-70 transition-all"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isLoading ? "Anmelden..." : "Anmelden"}
            </button>
          </form>

          <div className="mt-4 flex flex-col items-center gap-2">
            <p className="text-center text-[13px] text-muted-foreground">
              Noch kein Konto?{" "}
              <Link href="/register" className="text-primary hover:underline font-medium">
                Registrieren
              </Link>
            </p>
            <Link href="/forgot-password" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">
              Passwort vergessen?
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
