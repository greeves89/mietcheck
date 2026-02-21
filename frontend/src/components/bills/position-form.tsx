"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { cn, CATEGORY_LABELS } from "@/lib/utils";

export interface PositionData {
  category: string;
  name: string;
  total_amount: string;
  distribution_key: string;
  tenant_share_percent: string;
  tenant_amount: string;
}

interface PositionFormProps {
  positions: PositionData[];
  onChange: (positions: PositionData[]) => void;
}

const emptyPosition = (): PositionData => ({
  category: "other",
  name: "",
  total_amount: "",
  distribution_key: "sqm",
  tenant_share_percent: "",
  tenant_amount: "",
});

const inputClass = "w-full rounded-lg border border-foreground/[0.08] bg-foreground/[0.02] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/50 transition-colors";
const labelClass = "text-[11px] font-medium text-muted-foreground/70 mb-1 block";

export function PositionForm({ positions, onChange }: PositionFormProps) {
  const addPosition = () => onChange([...positions, emptyPosition()]);

  const removePosition = (index: number) => {
    onChange(positions.filter((_, i) => i !== index));
  };

  const updatePosition = (index: number, field: keyof PositionData, value: string) => {
    const updated = positions.map((p, i) => {
      if (i !== index) return p;
      const next = { ...p, [field]: value };

      // Auto-calculate tenant_amount if percent and total are set
      if ((field === "tenant_share_percent" || field === "total_amount") && next.tenant_share_percent && next.total_amount) {
        const calc = (parseFloat(next.total_amount) * parseFloat(next.tenant_share_percent) / 100).toFixed(2);
        next.tenant_amount = calc;
      }
      // Auto-set name from category if name is empty
      if (field === "category" && !next.name) {
        next.name = CATEGORY_LABELS[value] || value;
      }
      return next;
    });
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {positions.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Noch keine Positionen hinzugefügt.</p>
          <p className="text-[12px] text-muted-foreground/60 mt-1">Klicken Sie auf "Position hinzufügen".</p>
        </div>
      )}

      {positions.map((pos, index) => (
        <div
          key={index}
          className="rounded-xl border border-foreground/[0.06] bg-card/60 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Position {index + 1}
            </span>
            <button
              type="button"
              onClick={() => removePosition(index)}
              className="flex items-center gap-1.5 text-[12px] text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Entfernen
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Kategorie</label>
              <select
                value={pos.category}
                onChange={(e) => updatePosition(index, "category", e.target.value)}
                className={inputClass}
              >
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Bezeichnung (wie auf Abrechnung)</label>
              <input
                type="text"
                value={pos.name}
                onChange={(e) => updatePosition(index, "name", e.target.value)}
                placeholder="z.B. Grundsteuer"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Gesamtbetrag (€)</label>
              <input
                type="number"
                step="0.01"
                value={pos.total_amount}
                onChange={(e) => updatePosition(index, "total_amount", e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Verteilerschlüssel</label>
              <select
                value={pos.distribution_key}
                onChange={(e) => updatePosition(index, "distribution_key", e.target.value)}
                className={inputClass}
              >
                <option value="sqm">Nach Wohnfläche (m²)</option>
                <option value="persons">Nach Personenzahl</option>
                <option value="units">Nach Einheiten</option>
                <option value="direct">Direktzuweisung</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Ihr Anteil (%)</label>
              <input
                type="number"
                step="0.01"
                max="100"
                value={pos.tenant_share_percent}
                onChange={(e) => updatePosition(index, "tenant_share_percent", e.target.value)}
                placeholder="z.B. 12.50"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Ihr Betrag (€) <span className="text-primary/60">(auto)</span></label>
              <input
                type="number"
                step="0.01"
                value={pos.tenant_amount}
                onChange={(e) => updatePosition(index, "tenant_amount", e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addPosition}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary hover:bg-primary/10 hover:border-primary/50 transition-all"
      >
        <Plus className="h-4 w-4" />
        Position hinzufügen
      </button>
    </div>
  );
}
