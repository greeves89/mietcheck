"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckSquare, Lock, Eye, EyeOff, AlertTriangle, Check } from "lucide-react";
import { api, ApiError } from "@/lib/api";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) setError("Ungültiger Link. Bitte fordern Sie einen neuen an.");
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== passwordConfirm) {
      setError("Die Passwörter stimmen nicht überein");
      return;
    }
    if (password.length < 8) {
      setError("Passwort muss mindestens 8 Zeichen lang sein");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await api.resetPassword(token!, password);
      setDone(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Fehler beim Zurücksetzen. Link möglicherweise abgelaufen.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-foreground/[0.08] bg-foreground/[0.03] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/50 transition-colors pl-10";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-lg shadow-primary/25">
            <CheckSquare className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">MietCheck</h1>
          <p className="text-sm text-muted-foreground mt-1">Neues Passwort vergeben</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
          {done ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Passwort geändert!</h2>
              <p className="text-muted-foreground text-sm">
                Ihr Passwort wurde erfolgreich geändert. Sie werden in Kürze weitergeleitet...
              </p>
              <Link href="/login" className="block w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold text-center hover:bg-primary/90 transition-colors">
                Jetzt anmelden
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-foreground mb-5">Neues Passwort</h2>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm mb-4">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Neues Passwort</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      placeholder="Mindestens 8 Zeichen"
                      className={inputClass + " pr-10"}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Passwort bestätigen</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      required
                      placeholder="Passwort wiederholen"
                      className={inputClass}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !token}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? "Wird gespeichert..." : "Passwort ändern"}
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
