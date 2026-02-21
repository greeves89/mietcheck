"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Send, CheckCircle2, AlertTriangle } from "lucide-react";
import { api, ApiError } from "@/lib/api";

const inputClass = "w-full rounded-lg border border-foreground/[0.08] bg-foreground/[0.02] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/50 transition-colors";
const labelClass = "text-[11px] font-medium text-muted-foreground/70 mb-1.5 block";

export function FeedbackForm({ onSuccess }: { onSuccess?: () => void }) {
  const [type, setType] = useState<"bug" | "feature" | "general">("general");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await api.createFeedback({ type, title, message });
      setSuccess(true);
      setTitle("");
      setMessage("");
      onSuccess?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Fehler beim Senden");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center"
      >
        <CheckCircle2 className="h-10 w-10 text-emerald-400" />
        <p className="text-sm font-semibold">Feedback gesendet!</p>
        <p className="text-[13px] text-muted-foreground">Vielen Dank. Wir melden uns bei Ihnen.</p>
        <button
          onClick={() => setSuccess(false)}
          className="mt-2 text-[13px] text-primary hover:underline"
        >
          Weiteres Feedback senden
        </button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>Art des Feedbacks</label>
        <div className="flex gap-2">
          {(["bug", "feature", "general"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 rounded-lg border px-3 py-2 text-[13px] font-medium transition-all ${
                type === t
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
              }`}
            >
              {t === "bug" ? "Fehler" : t === "feature" ? "Feature" : "Allgemein"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelClass}>Titel</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className={inputClass}
          placeholder="Kurze Beschreibung..."
        />
      </div>

      <div>
        <label className={labelClass}>Nachricht</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={5}
          className={inputClass}
          placeholder="Beschreiben Sie das Problem oder Ihren Vorschlag..."
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
          <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-[13px] text-red-400">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || !title || !message}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        <Send className="h-4 w-4" />
        {isLoading ? "Senden..." : "Feedback senden"}
      </button>
    </form>
  );
}
