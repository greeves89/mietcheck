'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNavProvider } from '@/components/layout/mobile-nav-context'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import {
  BookOpen,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  Calculator,
  TrendingUp,
  Euro,
} from 'lucide-react'

interface BetriebskostenArt {
  id: number
  key: string
  nummer: string
  name: string
  description: string
  typische_kosten: string
  haeufige_fehler: string[]
  unit: string
  plausibilitaet: { min: number; max: number; typical: number }
}

interface PositionInput {
  key: string
  betrag: string
  vorhanden: boolean
}

const inputClass = 'w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring'

const STEPS = ['Grunddaten', 'Kosten eingeben', 'Ergebnis']

export default function BetriebskostenAssistentPage() {
  const [step, setStep] = useState(0)
  const [arten, setArten] = useState<BetriebskostenArt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAnalysing, setIsAnalysing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [currentArtIndex, setCurrentArtIndex] = useState(0)

  const [grunddaten, setGrunddaten] = useState({
    wohnflaeche_qm: '',
    gesamtflaeche_qm: '',
    abrechnungsjahr: new Date().getFullYear() - 1,
  })
  const [positionen, setPositionen] = useState<Record<string, PositionInput>>({})

  useEffect(() => {
    api.getBetriebskostenArten().then((data: any) => {
      setArten(data.arten)
      // Init positionen
      const init: Record<string, PositionInput> = {}
      data.arten.forEach((a: BetriebskostenArt) => {
        init[a.key] = { key: a.key, betrag: '', vorhanden: true }
      })
      setPositionen(init)
      setIsLoading(false)
    })
  }, [])

  const handleAnalyse = async () => {
    setIsAnalysing(true)
    try {
      const posArray = Object.values(positionen).map(p => ({
        key: p.key,
        betrag: parseFloat(p.betrag) || 0,
        vorhanden: p.vorhanden,
      }))
      const res = await api.analysiereBetriebskosten({
        wohnflaeche_qm: parseFloat(grunddaten.wohnflaeche_qm),
        gesamtflaeche_qm: parseFloat(grunddaten.gesamtflaeche_qm),
        abrechnungsjahr: grunddaten.abrechnungsjahr,
        positionen: posArray,
      })
      setResult(res)
      setStep(2)
    } finally {
      setIsAnalysing(false)
    }
  }

  const currentArt = arten[currentArtIndex]
  const currentPos = currentArt ? positionen[currentArt.key] : null

  const updatePos = (key: string, field: keyof PositionInput, value: any) => {
    setPositionen(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }))
  }

  const totalEntered = Object.values(positionen).filter(p => p.vorhanden && parseFloat(p.betrag) > 0).length

  if (isLoading) {
    return (
      <MobileNavProvider>
    <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar />
        <div className="flex-1 md:ml-[260px] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
      </MobileNavProvider>
    )
  }

  return (
    <MobileNavProvider>
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 md:ml-[260px] flex flex-col min-h-0">
        <Header
          title="Betriebskosten-Assistent"
          subtitle="Schritt-für-Schritt durch alle 17 Betriebskostenarten gemäß § 2 BetrKV"
        />

        <main className="flex-1 overflow-y-auto p-6">
          {/* Progress Steps */}
          <div className="flex items-center gap-4 mb-8">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i < step ? 'bg-primary text-primary-foreground' :
                  i === step ? 'bg-primary/20 text-primary border-2 border-primary' :
                  'bg-secondary text-muted-foreground'
                }`}>
                  {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-sm font-medium ${i === step ? 'text-foreground' : 'text-muted-foreground'}`}>{s}</span>
                {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* Step 0: Grunddaten */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-lg"
              >
                <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    Grunddaten zur Abrechnung
                  </h2>

                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">
                      Ihre Wohnfläche (m²) *
                    </label>
                    <input
                      type="number"
                      value={grunddaten.wohnflaeche_qm}
                      onChange={e => setGrunddaten({ ...grunddaten, wohnflaeche_qm: e.target.value })}
                      placeholder="z.B. 65"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">
                      Gesamtfläche des Gebäudes (m²) *
                    </label>
                    <input
                      type="number"
                      value={grunddaten.gesamtflaeche_qm}
                      onChange={e => setGrunddaten({ ...grunddaten, gesamtflaeche_qm: e.target.value })}
                      placeholder="z.B. 350"
                      className={inputClass}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Steht in der Abrechnung oder im Mietvertrag. Dient zur Berechnung Ihres Anteils.
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">
                      Abrechnungsjahr
                    </label>
                    <input
                      type="number"
                      value={grunddaten.abrechnungsjahr}
                      onChange={e => setGrunddaten({ ...grunddaten, abrechnungsjahr: parseInt(e.target.value) })}
                      className={inputClass}
                    />
                  </div>

                  <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-3 flex gap-2">
                    <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      Der Assistent führt Sie durch alle 17 Betriebskostenarten und erklärt, was erlaubt ist und was nicht.
                      Geben Sie die Beträge aus Ihrer Abrechnung ein – wir prüfen die Plausibilität automatisch.
                    </p>
                  </div>

                  <button
                    onClick={() => setStep(1)}
                    disabled={!grunddaten.wohnflaeche_qm || !grunddaten.gesamtflaeche_qm}
                    className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    Weiter
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 1: Kosten eingeben */}
            {step === 1 && currentArt && currentPos && (
              <motion.div
                key={`step1-${currentArtIndex}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-2xl"
              >
                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Position {currentArtIndex + 1} von {arten.length}</span>
                    <span>{totalEntered} Positionen erfasst</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${((currentArtIndex + 1) / arten.length) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs text-primary font-medium">{currentArt.nummer}</span>
                      <h2 className="text-lg font-semibold mt-0.5">{currentArt.name}</h2>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-sm text-muted-foreground">In Abrechnung vorhanden</span>
                      <div
                        className={`w-10 h-5 rounded-full transition-colors cursor-pointer ${currentPos.vorhanden ? 'bg-primary' : 'bg-secondary'}`}
                        onClick={() => updatePos(currentArt.key, 'vorhanden', !currentPos.vorhanden)}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white mt-0.5 transition-transform shadow ${currentPos.vorhanden ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </div>
                    </label>
                  </div>

                  <p className="text-sm text-muted-foreground">{currentArt.description}</p>

                  {currentPos.vorhanden && (
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1.5">
                        Gesamtbetrag in der Abrechnung (€/Jahr)
                      </label>
                      <input
                        type="number"
                        value={currentPos.betrag}
                        onChange={e => updatePos(currentArt.key, 'betrag', e.target.value)}
                        placeholder="z.B. 450.00"
                        min="0"
                        step="0.01"
                        className={inputClass}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Typische Kosten: {currentArt.typische_kosten}
                      </p>
                    </div>
                  )}

                  {/* Häufige Fehler */}
                  <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
                    <p className="text-xs font-semibold text-amber-600 mb-2">Häufige Fehler bei dieser Position:</p>
                    <ul className="space-y-1">
                      {currentArt.haeufige_fehler.map((f, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                          <span className="text-amber-500 flex-shrink-0">•</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex justify-between pt-2">
                    <button
                      onClick={() => {
                        if (currentArtIndex > 0) setCurrentArtIndex(i => i - 1)
                        else setStep(0)
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Zurück
                    </button>

                    {currentArtIndex < arten.length - 1 ? (
                      <button
                        onClick={() => setCurrentArtIndex(i => i + 1)}
                        className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                      >
                        Weiter
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={handleAnalyse}
                        disabled={isAnalysing}
                        className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                      >
                        <Calculator className="w-4 h-4" />
                        {isAnalysing ? 'Analysiere...' : 'Jetzt analysieren'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick jump to positions */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {arten.map((a, i) => {
                    const pos = positionen[a.key]
                    const hasValue = pos?.vorhanden && parseFloat(pos?.betrag) > 0
                    return (
                      <button
                        key={a.key}
                        onClick={() => setCurrentArtIndex(i)}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                          i === currentArtIndex ? 'bg-primary text-primary-foreground' :
                          hasValue ? 'bg-primary/10 text-primary' :
                          'bg-secondary text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {i + 1}
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 2: Ergebnis */}
            {step === 2 && result && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="max-w-2xl space-y-4"
              >
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border bg-card p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Gesamtkosten</p>
                    <p className="text-xl font-bold text-foreground">{result.gesamtkosten.toFixed(2)} €</p>
                    <p className="text-[10px] text-muted-foreground">Abrechnung gesamt</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Ihr Anteil</p>
                    <p className="text-xl font-bold text-primary">{result.ihr_anteil.toFixed(2)} €</p>
                    <p className="text-[10px] text-muted-foreground">pro Jahr</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Pro m²/Monat</p>
                    <p className="text-xl font-bold text-foreground">{(result.kosten_pro_qm_monat).toFixed(2)} €</p>
                    <p className="text-[10px] text-muted-foreground">⌀ DE: 2,17 €</p>
                  </div>
                </div>

                {/* Empfehlung */}
                <div className={`rounded-xl border p-4 ${
                  result.auffaelligkeiten.length > 0
                    ? 'border-destructive/30 bg-destructive/5'
                    : result.warnungen.length > 0
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : 'border-green-500/30 bg-green-500/5'
                }`}>
                  <div className="flex items-start gap-2">
                    {result.auffaelligkeiten.length > 0 ? (
                      <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    ) : result.warnungen.length > 0 ? (
                      <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-1">Empfehlung</p>
                      <p className="text-sm text-muted-foreground">{result.empfehlung}</p>
                    </div>
                  </div>
                </div>

                {/* Warnungen */}
                {result.warnungen.length > 0 && (
                  <div className="rounded-xl border border-amber-500/20 bg-card p-4">
                    <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-amber-500" />
                      Hinweise
                    </p>
                    {result.warnungen.map((w: string, i: number) => (
                      <p key={i} className="text-sm text-muted-foreground">{w}</p>
                    ))}
                  </div>
                )}

                {/* Auffälligkeiten */}
                {result.auffaelligkeiten.length > 0 && (
                  <div className="rounded-xl border border-destructive/20 bg-card p-4">
                    <p className="text-sm font-semibold mb-2 flex items-center gap-2 text-destructive">
                      <AlertTriangle className="w-4 h-4" />
                      Auffälligkeiten ({result.auffaelligkeiten.length})
                    </p>
                    <ul className="space-y-1">
                      {result.auffaelligkeiten.map((a: string, i: number) => (
                        <li key={i} className="text-sm text-muted-foreground flex gap-2">
                          <span className="text-destructive">•</span>
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Positions Detail */}
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Euro className="w-4 h-4 text-primary" />
                    Positionsübersicht
                  </p>
                  <div className="space-y-2">
                    {result.positionen_analyse.map((p: any) => (
                      <div key={p.key} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                        <div className="flex items-center gap-2 min-w-0">
                          {p.fehler ? (
                            <XCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                          ) : !p.plausibel ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                          )}
                          <span className="text-sm text-foreground truncate">{p.name}</span>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <span className="text-sm font-medium text-foreground">{p.betrag.toFixed(2)} €</span>
                          {p.warnung && (
                            <p className="text-[10px] text-amber-600 max-w-[200px]">{p.warnung}</p>
                          )}
                          {p.fehler && (
                            <p className="text-[10px] text-destructive max-w-[200px]">{p.fehler}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setStep(0); setCurrentArtIndex(0); setResult(null) }}
                    className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-secondary/50"
                  >
                    Neue Prüfung
                  </button>
                  <a
                    href="/bills/new"
                    className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 text-center"
                  >
                    Vollständige Prüfung erstellen
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
    </MobileNavProvider>
  )
}
