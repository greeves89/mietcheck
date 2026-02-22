"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Home, Edit2, Trash2, X, Loader2, AlertTriangle } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNavProvider } from "@/components/layout/mobile-nav-context";
import { Header } from "@/components/layout/header";
import { useContracts } from "@/hooks/use-contracts";
import { RentalContract } from "@/lib/types";
import { api, ApiError } from "@/lib/api";
import { cn, HEATING_TYPE_LABELS } from "@/lib/utils";

const inputClass = "w-full rounded-lg border border-foreground/[0.08] bg-foreground/[0.02] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 transition-colors";
const labelClass = "text-[11px] font-medium text-muted-foreground/70 mb-1.5 block";

interface ContractFormData {
  landlord_name: string;
  landlord_address: string;
  property_address: string;
  apartment_size_sqm: string;
  apartment_floor: string;
  monthly_advance_payment: string;
  tenants_count: string;
  heating_type: string;
  contract_start_date: string;
}

const emptyForm = (): ContractFormData => ({
  landlord_name: "", landlord_address: "", property_address: "",
  apartment_size_sqm: "", apartment_floor: "", monthly_advance_payment: "",
  tenants_count: "1", heating_type: "central", contract_start_date: "",
});

function ContractFormModal({
  open, onClose, onSaved, contract
}: { open: boolean; onClose: () => void; onSaved: () => void; contract?: RentalContract }) {
  const [form, setForm] = useState<ContractFormData>(contract ? {
    landlord_name: contract.landlord_name,
    landlord_address: contract.landlord_address || "",
    property_address: contract.property_address,
    apartment_size_sqm: contract.apartment_size_sqm,
    apartment_floor: contract.apartment_floor || "",
    monthly_advance_payment: contract.monthly_advance_payment || "",
    tenants_count: contract.tenants_count.toString(),
    heating_type: contract.heating_type,
    contract_start_date: contract.contract_start_date || "",
  } : emptyForm());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (k: keyof ContractFormData, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const payload = {
        landlord_name: form.landlord_name,
        landlord_address: form.landlord_address || null,
        property_address: form.property_address,
        apartment_size_sqm: parseFloat(form.apartment_size_sqm),
        apartment_floor: form.apartment_floor || null,
        monthly_advance_payment: form.monthly_advance_payment ? parseFloat(form.monthly_advance_payment) : null,
        tenants_count: parseInt(form.tenants_count),
        heating_type: form.heating_type,
        contract_start_date: form.contract_start_date || null,
      };
      if (contract) {
        await api.updateContract(contract.id, payload);
      } else {
        await api.createContract(payload);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Fehler beim Speichern");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-foreground/[0.06] bg-card shadow-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-base font-semibold">
              {contract ? "Mietverhältnis bearbeiten" : "Mietverhältnis hinzufügen"}
            </Dialog.Title>
            <Dialog.Close className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelClass}>Anschrift der Mietwohnung</label>
                <input type="text" value={form.property_address} onChange={e => update("property_address", e.target.value)} required className={inputClass} placeholder="Musterstraße 1, 10115 Berlin" />
              </div>
              <div>
                <label className={labelClass}>Wohnfläche (m²)</label>
                <input type="number" step="0.01" value={form.apartment_size_sqm} onChange={e => update("apartment_size_sqm", e.target.value)} required className={inputClass} placeholder="75.00" />
              </div>
              <div>
                <label className={labelClass}>Etage</label>
                <input type="text" value={form.apartment_floor} onChange={e => update("apartment_floor", e.target.value)} className={inputClass} placeholder="2. OG" />
              </div>
              <div>
                <label className={labelClass}>Vermieter / Verwaltung</label>
                <input type="text" value={form.landlord_name} onChange={e => update("landlord_name", e.target.value)} required className={inputClass} placeholder="Max Mustermann" />
              </div>
              <div>
                <label className={labelClass}>Anzahl Mieter</label>
                <input type="number" min="1" value={form.tenants_count} onChange={e => update("tenants_count", e.target.value)} className={inputClass} />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Adresse Vermieter</label>
                <input type="text" value={form.landlord_address} onChange={e => update("landlord_address", e.target.value)} className={inputClass} placeholder="Vermieterstraße 1, 12345 Stadt" />
              </div>
              <div>
                <label className={labelClass}>Monatliche Vorauszahlung (€)</label>
                <input type="number" step="0.01" value={form.monthly_advance_payment} onChange={e => update("monthly_advance_payment", e.target.value)} className={inputClass} placeholder="150.00" />
              </div>
              <div>
                <label className={labelClass}>Heizungsart</label>
                <select value={form.heating_type} onChange={e => update("heating_type", e.target.value)} className={inputClass}>
                  <option value="central">Zentralheizung</option>
                  <option value="individual">Einzelofenheizung</option>
                  <option value="district">Fernwärme</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Mietbeginn</label>
                <input type="date" value={form.contract_start_date} onChange={e => update("contract_start_date", e.target.value)} className={inputClass} />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <p className="text-[13px] text-red-400">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
                Abbrechen
              </button>
              <button type="submit" disabled={isLoading} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-70 transition-all">
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {contract ? "Speichern" : "Hinzufügen"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function ContractsPage() {
  const { contracts, isLoading, reload } = useContracts();
  const [showForm, setShowForm] = useState(false);
  const [editContract, setEditContract] = useState<RentalContract | undefined>();

  const handleDelete = async (id: number) => {
    if (!confirm("Mietverhältnis wirklich löschen? Alle zugehörigen Abrechnungen werden ebenfalls gelöscht.")) return;
    await api.deleteContract(id);
    reload();
  };

  return (
    <MobileNavProvider>
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 md:ml-[260px] flex flex-col min-h-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">Mietverhältnisse</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Verwalten Sie Ihre Mietobjekte</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
            >
              <Plus className="h-4 w-4" />
              Hinzufügen
            </button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map(i => <div key={i} className="h-36 rounded-xl bg-muted/30 animate-pulse" />)}
            </div>
          ) : contracts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-12 text-center">
              <Home className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm font-medium">Kein Mietverhältnis angelegt</p>
              <p className="text-[13px] text-muted-foreground">Legen Sie zunächst Ihr Mietverhältnis an.</p>
              <button onClick={() => setShowForm(true)} className="mt-1 flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
                <Plus className="h-4 w-4" />
                Erstes Mietverhältnis anlegen
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contracts.map((c, i) => (
                <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-foreground/[0.06] bg-card/80 backdrop-blur-sm p-5 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                        <Home className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{c.property_address}</p>
                        <p className="text-[12px] text-muted-foreground mt-0.5">{c.landlord_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditContract(c)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Fläche</p>
                      <p className="text-[13px] font-medium mt-0.5">{c.apartment_size_sqm} m²</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Mieter</p>
                      <p className="text-[13px] font-medium mt-0.5">{c.tenants_count}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Heizung</p>
                      <p className="text-[13px] font-medium mt-0.5">{HEATING_TYPE_LABELS[c.heating_type] || c.heating_type}</p>
                    </div>
                  </div>

                  {c.monthly_advance_payment && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <p className="text-[12px] text-muted-foreground">
                        Vorauszahlung: <span className="font-medium text-foreground">{parseFloat(c.monthly_advance_payment).toFixed(2)} €/Monat</span>
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </main>
      </div>

      <ContractFormModal
        open={showForm || !!editContract}
        onClose={() => { setShowForm(false); setEditContract(undefined); }}
        onSaved={reload}
        contract={editContract}
      />
    </div>
    </MobileNavProvider>
  );
}
