'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import {
  Scale,
  TrendingUp,
  Home,
  Key,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  ChevronDown,
  Copy,
  Check,
} from 'lucide-react'

const inputClass = 'w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const labelClass = 'text-sm font-medium text-foreground block mb-1.5'

type CheckType = 'mietwucher' | 'mieterhoehung' | 'kaution'

const TABS: { id: CheckType; label: string; icon: any; desc: string }[] = [
  {
    id: 'mietwucher',
    label: 'Mietwucher-Check',
    icon: Scale,
    desc: '§ 5 WiStG & § 556d BGB: Ist Ihre Miete zu hoch?',
  },
  {
    id: 'mieterhoehung',
    label: 'Mieterhöhungs-Check',
    icon: TrendingUp,
    desc: '§ 558 BGB: Ist die angekündigte Erhöhung zulässig?',
  },
  {
    id: 'kaution',
    label: 'Kautions-Assistent',
    icon: Key,
    desc: 'Kautionsrückforderung prüfen und Schreiben erstellen',
  },
]

export default function MietrechtPage() {
  const [activeTab, setActiveTab] = useState<CheckType>('mietwucher')
  const [staedte, setStaedte] = useState<{ key: string; name: string }[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  // Mietwucher form
  const [mwForm, setMwForm] = useState({
    stadt: 'berlin',
    wohnflaeche_qm: '',
    aktuelle_monatsmiete: '',
    baujahr: '',
    is_furnished: false,
    is_modernized: false,
  })

  // Mieterhöhung form
  const [meForm, setMeForm] = useState({
    stadt: 'berlin',
    wohnflaeche_qm: '',
    aktuelle_monatsmiete: '',
    neue_monatsmiete: '',
    letzte_erhoehung_datum: '',
    erhoehungsbegruendung: '',
  })

  // Kaution form
  const [kForm, setKForm] = useState({
    kaution_gezahlt: '',
    rueckgabedatum: '',
    betrag_einbehalten: '',
    grund_einbehalt: '',
    maengel_protokoll_vorhanden: false,
    wohnung_renoviert_uebergeben: false,
    schoenheitsreparaturen_vereinbart: false,
  })

  useEffect(() => {
    api.getMietrechtStaedte().then(setStaedte)
  }, [])

  const handleMietwucher = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setResult(null)
    try {
      const res = await api.checkMietwucher({
        ...mwForm,
        wohnflaeche_qm: parseFloat(mwForm.wohnflaeche_qm),
        aktuelle_monatsmiete: parseFloat(mwForm.aktuelle_monatsmiete),
        baujahr: mwForm.baujahr ? parseInt(mwForm.baujahr) : null,
      })
      setResult(res)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMieterhoehung = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setResult(null)
    try {
      const res = await api.checkMieterhoehung({
        ...meForm,
        wohnflaeche_qm: parseFloat(meForm.wohnflaeche_qm),
        aktuelle_monatsmiete: parseFloat(meForm.aktuelle_monatsmiete),
        neue_monatsmiete: parseFloat(meForm.neue_monatsmiete),
      })
      setResult(res)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKaution = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setResult(null)
    try {
      const res = await api.checkKaution({
        ...kForm,
        kaution_gezahlt: parseFloat(kForm.kaution_gezahlt),
        betrag_einbehalten: parseFloat(kForm.betrag_einbehalten) || 0,
      })
      setResult(res)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTabChange = (tab: CheckType) => {
    setActiveTab(tab)
    setResult(null)
  }

  const copyMustertext = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 ml-[260px] flex flex-col min-h-0">
        <Header
          title="Mietrecht-Checks"
          subtitle="Mietwucher, Mieterhöhung, Kaution – Ihre Rechte als Mieter"
        />

        <main className="flex-1 overflow-y-auto p-6">
          {/* Tab Navigation */}
          <div className="flex gap-3 mb-6">
            {TABS.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex-1 rounded-xl border p-4 text-left transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border bg-card hover:bg-secondary/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="text-sm font-semibold">{tab.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{tab.desc}</p>
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form */}
            <div className="rounded-xl border border-border bg-card p-6">
              <AnimatePresence mode="wait">
                {/* Mietwucher Form */}
                {activeTab === 'mietwucher' && (
                  <motion.form
                    key="mietwucher"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleMietwucher}
                    className="space-y-4"
                  >
                    <h2 className="text-base font-semibold">Mietwucher prüfen</h2>

                    <div>
                      <label className={labelClass}>Stadt</label>
                      <select
                        value={mwForm.stadt}
                        onChange={e => setMwForm({ ...mwForm, stadt: e.target.value })}
                        className={inputClass}
                      >
                        {staedte.map(s => (
                          <option key={s.key} value={s.key}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Wohnfläche (m²) *</label>
                        <input type="number" value={mwForm.wohnflaeche_qm}
                          onChange={e => setMwForm({ ...mwForm, wohnflaeche_qm: e.target.value })}
                          placeholder="65" className={inputClass} required />
                      </div>
                      <div>
                        <label className={labelClass}>Monatsmiete (kalt, €) *</label>
                        <input type="number" value={mwForm.aktuelle_monatsmiete}
                          onChange={e => setMwForm({ ...mwForm, aktuelle_monatsmiete: e.target.value })}
                          placeholder="800" className={inputClass} required step="0.01" />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Baujahr (optional)</label>
                      <input type="number" value={mwForm.baujahr}
                        onChange={e => setMwForm({ ...mwForm, baujahr: e.target.value })}
                        placeholder="z.B. 1985" className={inputClass} />
                    </div>

                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={mwForm.is_furnished}
                          onChange={e => setMwForm({ ...mwForm, is_furnished: e.target.checked })}
                          className="rounded" />
                        <span className="text-sm">Möbliert</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={mwForm.is_modernized}
                          onChange={e => setMwForm({ ...mwForm, is_modernized: e.target.checked })}
                          className="rounded" />
                        <span className="text-sm">Modernisiert</span>
                      </label>
                    </div>

                    <button type="submit" disabled={isLoading}
                      className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                      {isLoading ? 'Prüfe...' : 'Mietwucher prüfen'}
                    </button>
                  </motion.form>
                )}

                {/* Mieterhöhung Form */}
                {activeTab === 'mieterhoehung' && (
                  <motion.form
                    key="mieterhoehung"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleMieterhoehung}
                    className="space-y-4"
                  >
                    <h2 className="text-base font-semibold">Mieterhöhung prüfen</h2>

                    <div>
                      <label className={labelClass}>Stadt</label>
                      <select value={meForm.stadt}
                        onChange={e => setMeForm({ ...meForm, stadt: e.target.value })}
                        className={inputClass}>
                        {staedte.map(s => (
                          <option key={s.key} value={s.key}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>Wohnfläche (m²) *</label>
                      <input type="number" value={meForm.wohnflaeche_qm}
                        onChange={e => setMeForm({ ...meForm, wohnflaeche_qm: e.target.value })}
                        placeholder="65" className={inputClass} required />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Aktuelle Miete (€/Monat) *</label>
                        <input type="number" value={meForm.aktuelle_monatsmiete}
                          onChange={e => setMeForm({ ...meForm, aktuelle_monatsmiete: e.target.value })}
                          placeholder="800" className={inputClass} required step="0.01" />
                      </div>
                      <div>
                        <label className={labelClass}>Neue Miete (€/Monat) *</label>
                        <input type="number" value={meForm.neue_monatsmiete}
                          onChange={e => setMeForm({ ...meForm, neue_monatsmiete: e.target.value })}
                          placeholder="900" className={inputClass} required step="0.01" />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Datum der letzten Mieterhöhung</label>
                      <input type="date" value={meForm.letzte_erhoehung_datum}
                        onChange={e => setMeForm({ ...meForm, letzte_erhoehung_datum: e.target.value })}
                        className={inputClass} />
                    </div>

                    <div>
                      <label className={labelClass}>Begründung der Mieterhöhung</label>
                      <select value={meForm.erhoehungsbegruendung}
                        onChange={e => setMeForm({ ...meForm, erhoehungsbegruendung: e.target.value })}
                        className={inputClass}>
                        <option value="">-- Bitte wählen --</option>
                        <option value="mietspiegel">Mietspiegel</option>
                        <option value="gutachten">Sachverständigengutachten</option>
                        <option value="vergleichswohnungen">3 Vergleichswohnungen</option>
                      </select>
                    </div>

                    <button type="submit" disabled={isLoading}
                      className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                      {isLoading ? 'Prüfe...' : 'Mieterhöhung prüfen'}
                    </button>
                  </motion.form>
                )}

                {/* Kaution Form */}
                {activeTab === 'kaution' && (
                  <motion.form
                    key="kaution"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleKaution}
                    className="space-y-4"
                  >
                    <h2 className="text-base font-semibold">Kaution zurückfordern</h2>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Gezahlte Kaution (€) *</label>
                        <input type="number" value={kForm.kaution_gezahlt}
                          onChange={e => setKForm({ ...kForm, kaution_gezahlt: e.target.value })}
                          placeholder="1500" className={inputClass} required step="0.01" />
                      </div>
                      <div>
                        <label className={labelClass}>Einbehalten (€)</label>
                        <input type="number" value={kForm.betrag_einbehalten}
                          onChange={e => setKForm({ ...kForm, betrag_einbehalten: e.target.value })}
                          placeholder="0" className={inputClass} step="0.01" />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Datum der Wohnungsübergabe *</label>
                      <input type="date" value={kForm.rueckgabedatum}
                        onChange={e => setKForm({ ...kForm, rueckgabedatum: e.target.value })}
                        className={inputClass} required />
                    </div>

                    <div>
                      <label className={labelClass}>Begründung des Einbehalts</label>
                      <input type="text" value={kForm.grund_einbehalt}
                        onChange={e => setKForm({ ...kForm, grund_einbehalt: e.target.value })}
                        placeholder="z.B. Schönheitsreparaturen, Schäden..." className={inputClass} />
                    </div>

                    <div className="space-y-2">
                      {[
                        { field: 'maengel_protokoll_vorhanden', label: 'Übergabeprotokoll vorhanden' },
                        { field: 'wohnung_renoviert_uebergeben', label: 'Wohnung renoviert übergeben' },
                        { field: 'schoenheitsreparaturen_vereinbart', label: 'Schönheitsreparaturen im Mietvertrag vereinbart' },
                      ].map(({ field, label }) => (
                        <label key={field} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox"
                            checked={kForm[field as keyof typeof kForm] as boolean}
                            onChange={e => setKForm({ ...kForm, [field]: e.target.checked })}
                            className="rounded" />
                          <span className="text-sm">{label}</span>
                        </label>
                      ))}
                    </div>

                    <button type="submit" disabled={isLoading}
                      className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                      {isLoading ? 'Prüfe...' : 'Kaution prüfen'}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            {/* Result */}
            <div>
              {result ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Mietwucher Result */}
                  {activeTab === 'mietwucher' && (
                    <>
                      <div className={`rounded-xl border p-5 ${
                        result.ist_mietwucher ? 'border-destructive/30 bg-destructive/5' :
                        result.ist_mietpreisbremse ? 'border-amber-500/30 bg-amber-500/5' :
                        'border-green-500/30 bg-green-500/5'
                      }`}>
                        <div className="flex items-center gap-2 mb-3">
                          {result.ist_mietwucher ? (
                            <XCircle className="w-5 h-5 text-destructive" />
                          ) : result.ist_mietpreisbremse ? (
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                          ) : (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          )}
                          <span className="font-semibold text-sm">
                            {result.ist_mietwucher ? 'Mietwucher festgestellt (§ 5 WiStG)' :
                             result.ist_mietpreisbremse ? 'Mietpreisbremse verletzt (§ 556d BGB)' :
                             'Kein Verstoß erkennbar'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{result.empfehlung}</p>
                      </div>

                      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                        {[
                          { label: 'Vergleichsmiete (lokal)', value: `${result.vergleichsmiete_sqm.toFixed(2)} €/m²` },
                          { label: 'Ihre Miete', value: `${result.aktuelle_miete_sqm.toFixed(2)} €/m²` },
                          { label: 'Überschreitung', value: `${result.ueberschreitung_prozent > 0 ? '+' : ''}${result.ueberschreitung_prozent.toFixed(1)}%`, highlight: result.ueberschreitung_prozent > 10 },
                          { label: 'Zu viel pro Monat', value: `${result.ueberschreitung_monatlich.toFixed(2)} €`, highlight: result.ueberschreitung_monatlich > 0 },
                        ].map(({ label, value, highlight }) => (
                          <div key={label} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{label}</span>
                            <span className={`font-medium ${highlight ? 'text-destructive' : 'text-foreground'}`}>{value}</span>
                          </div>
                        ))}
                      </div>

                      {result.handlungsoptionen.length > 0 && (
                        <div className="rounded-xl border border-border bg-card p-4">
                          <p className="text-sm font-semibold mb-2">Ihre Optionen:</p>
                          <ul className="space-y-1">
                            {result.handlungsoptionen.map((h: string, i: number) => (
                              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                                <span className="text-primary font-medium">{i + 1}.</span>
                                {h}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="rounded-lg bg-secondary/30 p-3">
                        <p className="text-[11px] text-muted-foreground">
                          <strong>Rechtsgrundlage:</strong> {result.gesetzliche_grundlage}
                        </p>
                      </div>
                    </>
                  )}

                  {/* Mieterhöhung Result */}
                  {activeTab === 'mieterhoehung' && (
                    <>
                      <div className={`rounded-xl border p-5 ${
                        !result.ist_zulaessig ? 'border-destructive/30 bg-destructive/5' :
                        'border-green-500/30 bg-green-500/5'
                      }`}>
                        <div className="flex items-center gap-2 mb-3">
                          {!result.ist_zulaessig ? (
                            <XCircle className="w-5 h-5 text-destructive" />
                          ) : (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          )}
                          <span className="font-semibold text-sm">
                            {result.ist_zulaessig ? 'Mieterhöhung erscheint zulässig' : 'Mieterhöhung hat Probleme!'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{result.empfehlung}</p>
                      </div>

                      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                        {[
                          { label: 'Erhöhung absolut', value: `${result.erhoehung_absolut.toFixed(2)} €/Monat` },
                          { label: 'Erhöhung in Prozent', value: `${result.erhoehung_prozent.toFixed(1)}%`, highlight: result.erhoehung_prozent > result.kappungsgrenze_prozent },
                          { label: 'Kappungsgrenze', value: `${result.kappungsgrenze_prozent}% in 3 Jahren` },
                          { label: 'Max. zulässige Miete', value: `${result.max_zulaessige_miete.toFixed(2)} €/Monat` },
                        ].map(({ label, value, highlight }) => (
                          <div key={label} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{label}</span>
                            <span className={`font-medium ${highlight ? 'text-destructive' : 'text-foreground'}`}>{value}</span>
                          </div>
                        ))}
                        {result.beginn_fruehestens && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Frühestes Inkrafttreten</span>
                            <span className="font-medium text-foreground">{result.beginn_fruehestens}</span>
                          </div>
                        )}
                      </div>

                      {result.probleme.length > 0 && (
                        <div className="rounded-xl border border-destructive/20 bg-card p-4">
                          <p className="text-sm font-semibold text-destructive mb-2">Probleme ({result.probleme.length}):</p>
                          <ul className="space-y-2">
                            {result.probleme.map((p: string, i: number) => (
                              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                {p}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}

                  {/* Kaution Result */}
                  {activeTab === 'kaution' && (
                    <>
                      <div className={`rounded-xl border p-5 ${
                        result.rueckforderung > 0 ? 'border-primary/30 bg-primary/5' :
                        'border-border bg-card'
                      }`}>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-1">Rückforderungsanspruch</p>
                          <p className="text-3xl font-bold text-primary">{result.rueckforderung.toFixed(2)} €</p>
                          <p className="text-xs text-muted-foreground mt-1">{result.empfehlung}</p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border bg-card p-4">
                        <p className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Info className="w-4 h-4 text-primary" />
                          Frist-Info
                        </p>
                        <p className="text-sm text-muted-foreground">{result.frist_info}</p>
                      </div>

                      {result.probleme.length > 0 && (
                        <div className="rounded-xl border border-amber-500/20 bg-card p-4">
                          <p className="text-sm font-semibold mb-2">Wichtige Hinweise:</p>
                          <ul className="space-y-2">
                            {result.probleme.map((p: string, i: number) => (
                              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                {p}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Mustertext */}
                      <div className="rounded-xl border border-border bg-card p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-semibold">Musterschreiben</p>
                          <button
                            onClick={() => copyMustertext(result.mustertext)}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-border text-xs hover:bg-secondary/50"
                          >
                            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copied ? 'Kopiert!' : 'Kopieren'}
                          </button>
                        </div>
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed bg-secondary/30 rounded-lg p-3">
                          {result.mustertext}
                        </pre>
                      </div>
                    </>
                  )}
                </motion.div>
              ) : (
                <div className="rounded-xl border border-border bg-card p-8 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
                  <Scale className="w-12 h-12 text-muted-foreground/30 mb-4" />
                  <p className="font-medium text-foreground mb-1">Noch keine Prüfung</p>
                  <p className="text-sm text-muted-foreground">
                    Füllen Sie das Formular aus und klicken Sie auf "Prüfen"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Legal disclaimer */}
          <div className="mt-6 rounded-lg bg-secondary/30 border border-border p-3">
            <p className="text-xs text-muted-foreground">
              <strong>Rechtlicher Hinweis:</strong> Diese Prüfung basiert auf vereinfachten Berechnungen und dient nur als erste Orientierung.
              Sie ersetzt keine Rechtsberatung. Bei konkreten Rechtsfragen wenden Sie sich an einen Mieterverein oder Rechtsanwalt.
              Die angegebenen Vergleichsmieten sind Richtwerte und können vom lokalen Mietspiegel abweichen.
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
