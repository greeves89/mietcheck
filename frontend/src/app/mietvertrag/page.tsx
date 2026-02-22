'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import {
  FileSearch,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react'

interface Klausel {
  id: string
  kategorie: string
  klausel_bezeichnung: string
  beispiel: string
  frage: string
}

interface Ergebnis {
  id: string
  kategorie: string
  klausel_bezeichnung: string
  vorhanden: boolean
  unwirksam: boolean
  bgh_urteil: string
  folge: string
  empfehlung: string
}

const KATEGORIEN_COLORS: Record<string, string> = {
  'Schönheitsreparaturen': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'Kündigungsfristen': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  'Kleinreparaturen': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  'Tierhaltung': 'bg-green-500/10 text-green-600 border-green-500/20',
  'Kaution': 'bg-red-500/10 text-red-600 border-red-500/20',
  'Betriebskosten': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  'Hausordnung': 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  'Besichtigung': 'bg-teal-500/10 text-teal-600 border-teal-500/20',
}

export default function MietvertragPage() {
  const [klauseln, setKlauseln] = useState<Klausel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isChecking, setIsChecking] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [antworten, setAntworten] = useState<Record<string, boolean | null>>({})
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    api.getMietvertragKlauseln().then((data: any) => {
      setKlauseln(data.klauseln)
      // Init all to null (not answered)
      const init: Record<string, boolean | null> = {}
      data.klauseln.forEach((k: Klausel) => { init[k.id] = null })
      setAntworten(init)
      setIsLoading(false)
    })
  }, [])

  const handleCheck = async () => {
    setIsChecking(true)
    try {
      const antwortArray = Object.entries(antworten)
        .filter(([, v]) => v !== null)
        .map(([klausel_id, vorhanden]) => ({ klausel_id, vorhanden }))

      const res = await api.checkMietvertrag({ antworten: antwortArray })
      setResult(res)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setIsChecking(false)
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Group klauseln by category
  const kategorien = Array.from(new Set(klauseln.map(k => k.kategorie)))

  const answeredCount = Object.values(antworten).filter(v => v !== null).length
  const canCheck = answeredCount > 0

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar />
        <div className="flex-1 ml-[260px] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 ml-[260px] flex flex-col min-h-0">
        <Header
          title="Mietvertragprüfung"
          subtitle="Prüfung auf unwirksame Klauseln nach aktueller BGH-Rechtsprechung"
        />

        <main className="flex-1 overflow-y-auto p-6">
          {/* Result Banner */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-6 rounded-xl border p-5 ${
                result.gesamtbewertung === 'gut'
                  ? 'border-green-500/30 bg-green-500/5'
                  : result.gesamtbewertung === 'verbesserungswuerdig'
                  ? 'border-amber-500/30 bg-amber-500/5'
                  : 'border-destructive/30 bg-destructive/5'
              }`}
            >
              <div className="flex items-start gap-3">
                {result.gesamtbewertung === 'gut' ? (
                  <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                ) : result.gesamtbewertung === 'verbesserungswuerdig' ? (
                  <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />
                ) : (
                  <XCircle className="w-6 h-6 text-destructive flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-foreground">
                      {result.unwirksame_klauseln === 0
                        ? 'Kein Problem gefunden'
                        : `${result.unwirksame_klauseln} möglicherweise unwirksame Klausel(n) gefunden`}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {result.gesamte_klauseln_geprueft} Klauseln geprüft
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{result.zusammenfassung}</p>
                  <p className="text-sm font-medium text-foreground">{result.handlungsempfehlung}</p>
                </div>
              </div>

              {/* Detailed Results */}
              {result.ergebnisse.filter((e: Ergebnis) => e.unwirksam).length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Problematische Klauseln:</p>
                  {result.ergebnisse.filter((e: Ergebnis) => e.unwirksam).map((e: Ergebnis) => (
                    <div key={e.id} className="rounded-lg border border-destructive/20 bg-background/50 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className={`text-xs px-1.5 py-0.5 rounded border ${KATEGORIEN_COLORS[e.kategorie] || 'bg-secondary text-muted-foreground border-border'}`}>
                            {e.kategorie}
                          </span>
                          <p className="text-sm font-medium text-foreground mt-1">{e.klausel_bezeichnung}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">BGH: {e.bgh_urteil}</p>
                          <p className="text-xs text-destructive mt-1">Folge: {e.folge}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setResult(null)}
                className="mt-4 text-sm text-muted-foreground hover:text-foreground underline"
              >
                Neue Prüfung starten
              </button>
            </motion.div>
          )}

          {/* Intro */}
          {!result && (
            <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-4 mb-6 flex gap-3">
              <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground mb-1">So funktioniert die Mietvertragprüfung</p>
                <p className="text-sm text-muted-foreground">
                  Beantworten Sie die Fragen zu Ihrem Mietvertrag. Für jede zutreffende Klausel prüfen wir,
                  ob sie nach aktueller BGH-Rechtsprechung wirksam ist. Beantworten Sie nur die Fragen,
                  zu denen Sie etwas in Ihrem Vertrag finden.
                </p>
              </div>
            </div>
          )}

          {/* Questions by category */}
          <div className="space-y-4">
            {kategorien.map(kat => {
              const katKlauseln = klauseln.filter(k => k.kategorie === kat)
              return (
                <div key={kat} className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="px-5 py-3 border-b border-border bg-secondary/20">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${KATEGORIEN_COLORS[kat] || 'bg-secondary text-muted-foreground border-border'}`}>
                      {kat}
                    </span>
                  </div>
                  <div className="divide-y divide-border">
                    {katKlauseln.map(klausel => (
                      <div key={klausel.id} className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{klausel.frage}</p>
                            <button
                              onClick={() => toggleExpand(klausel.id)}
                              className="text-xs text-muted-foreground hover:text-foreground mt-1 flex items-center gap-1"
                            >
                              Beispiel
                              {expandedIds.has(klausel.id) ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                            <AnimatePresence>
                              {expandedIds.has(klausel.id) && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="mt-2 text-xs text-muted-foreground italic bg-secondary/30 rounded p-2"
                                >
                                  Beispiel: „{klausel.beispiel}"
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={() => setAntworten(prev => ({ ...prev, [klausel.id]: true }))}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                antworten[klausel.id] === true
                                  ? 'bg-destructive text-white border-destructive'
                                  : 'border-border text-muted-foreground hover:border-destructive hover:text-destructive'
                              }`}
                            >
                              Ja
                            </button>
                            <button
                              onClick={() => setAntworten(prev => ({ ...prev, [klausel.id]: false }))}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                antworten[klausel.id] === false
                                  ? 'bg-green-500 text-white border-green-500'
                                  : 'border-border text-muted-foreground hover:border-green-500 hover:text-green-600'
                              }`}
                            >
                              Nein
                            </button>
                            {antworten[klausel.id] !== null && (
                              <button
                                onClick={() => setAntworten(prev => ({ ...prev, [klausel.id]: null }))}
                                className="px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground border border-transparent hover:border-border"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Submit button */}
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {answeredCount} von {klauseln.length} Klauseln beantwortet
            </p>
            <button
              onClick={handleCheck}
              disabled={!canCheck || isChecking}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileSearch className="w-4 h-4" />
              {isChecking ? 'Prüfe...' : 'Mietvertrag jetzt prüfen'}
            </button>
          </div>

          {/* Disclaimer */}
          <div className="mt-6 rounded-lg bg-secondary/30 border border-border p-3">
            <p className="text-xs text-muted-foreground">
              <strong>Rechtlicher Hinweis:</strong> Diese Prüfung basiert auf bekannter BGH-Rechtsprechung und dient nur als erste Orientierung.
              Jeder Einzelfall kann von der allgemeinen Rechtslage abweichen. Für rechtssichere Auskunft wenden Sie sich an einen Mieterverein
              (ca. 80–120 €/Jahr Mitgliedsbeitrag) oder Rechtsanwalt. Die Unwirksamkeit einer Klausel muss ggf. gerichtlich festgestellt werden.
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
