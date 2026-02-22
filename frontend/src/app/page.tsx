'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth'
import {
  CheckSquare, FileSearch, AlertTriangle, FileText, BarChart3, Shield, Star,
  Check, ArrowRight, Mail, Calculator
} from 'lucide-react'

const features = [
  { icon: FileSearch, title: 'Automatische Prüfung', desc: 'Ihre Nebenkostenabrechnung wird automatisch auf Rechenfehler, unzulässige Positionen und Fristversäumnisse geprüft.' },
  { icon: AlertTriangle, title: 'Fehler aufdecken', desc: 'Erkennt überhöhte Heizkosten, falsche Verteilerschlüssel, unzulässige Verwaltungskosten und mehr.' },
  { icon: FileText, title: 'Widerspruchsbrief', desc: 'Bei Fehlern generieren wir automatisch einen rechtssicheren Widerspruchsbrief für Ihren Vermieter.' },
  { icon: Calculator, title: 'Nachzahlung prüfen', desc: 'Ist die Nachzahlung korrekt berechnet? Wir rechnen nach und zeigen Ihnen, was Sie wirklich schulden.' },
  { icon: BarChart3, title: 'Jahresvergleich', desc: 'Vergleichen Sie Ihre Abrechnungen über mehrere Jahre und erkennen Sie Kostensteigerungen.' },
  { icon: Shield, title: 'DSGVO-konform', desc: 'Ihre Daten bleiben bei uns. Datenexport und Löschung jederzeit in den Einstellungen.' },
]

const pricing = [
  {
    name: 'Kostenlos',
    price: '0 €',
    period: 'für immer',
    features: ['1 Prüfung pro Jahr', 'Grundauswertung', 'Fehlerübersicht', 'E-Mail-Support'],
    cta: 'Kostenlos starten',
    href: '/register',
    highlight: false,
  },
  {
    name: 'Premium',
    price: '0,99 €',
    period: 'pro Monat',
    features: ['Unbegrenzte Prüfungen', 'Widerspruchsbriefe', 'PDF-Export', 'Jahresvergleich', 'Prioritäts-Support'],
    cta: 'Premium starten',
    href: '/register',
    highlight: true,
  },
]

export default function HomePage() {
  const router = useRouter()
  const { user } = useAuthStore()

  useEffect(() => {
    if (user) router.push('/dashboard')
  }, [user, router])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 z-40 bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <CheckSquare className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-foreground">MietCheck</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Anmelden</Link>
            <Link href="/register" className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
              Kostenlos starten
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-6">
            <Star className="w-3 h-3" />
            Kostenlos starten – Premium ab 0,99 €/Monat
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Nebenkostenabrechnung<br /><span className="text-primary">automatisch prüfen</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Zu viel gezahlt? MietCheck prüft Ihre Nebenkostenabrechnung automatisch auf Fehler und erstellt bei Bedarf einen rechtssicheren Widerspruchsbrief.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register" className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors text-sm">
              Jetzt kostenlos prüfen <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/login" className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-border text-foreground font-medium hover:bg-secondary/50 transition-colors text-sm">
              Bereits registriert? Anmelden
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-3">Was MietCheck prüft</h2>
          <p className="text-muted-foreground">Durchschnittlich 30 % der Nebenkostenabrechnungen enthalten Fehler.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-3">Einfache Preise</h2>
          <p className="text-muted-foreground">Kein Kleingedrucktes. Jederzeit kündbar.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {pricing.map((plan) => (
            <div key={plan.name} className={`rounded-2xl border p-8 ${plan.highlight ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border bg-card'}`}>
              {plan.highlight && (
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
                  <Star className="w-3 h-3" /> Empfohlen
                </div>
              )}
              <h3 className="text-xl font-bold text-foreground mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                <span className="text-muted-foreground text-sm">/{plan.period}</span>
              </div>
              <ul className="space-y-2.5 my-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-2.5 h-2.5 text-green-500" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href={plan.href} className={`block w-full py-2.5 rounded-xl text-center font-medium text-sm transition-colors ${plan.highlight ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-secondary text-foreground hover:bg-secondary/80'}`}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="bg-primary/10 border border-primary/20 rounded-3xl p-12 text-center">
          <Mail className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-foreground mb-3">Bereit Geld zurückzuholen?</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">Kostenlos registrieren – keine Kreditkarte erforderlich. Erste Prüfung in wenigen Minuten.</p>
          <Link href="/register" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
            Jetzt kostenlos prüfen <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">© 2026 MietCheck</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/impressum" className="hover:text-foreground transition-colors">Impressum</Link>
            <Link href="/datenschutz" className="hover:text-foreground transition-colors">Datenschutz</Link>
            <Link href="/agb" className="hover:text-foreground transition-colors">AGB</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
