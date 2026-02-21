# MietCheck - Nebenkostenabrechnung prüfen

MietCheck ist eine SaaS-Anwendung für deutsche Mieter zur automatischen Prüfung der Nebenkostenabrechnung.

## Features

- **Mathematische Prüfung**: Sind alle Berechnungen korrekt?
- **Fristprüfung**: Wurde die Abrechnung rechtzeitig zugestellt? (§ 556 BGB)
- **Plausibilitätsprüfung**: Liegen die Kosten im normalen Bereich?
- **Rechtsprüfung**: Werden nur zulässige Kostenpositionen abgerechnet?
- **Widerspruchsbrief**: Automatische Erstellung eines formellen Widerspruchsschreibens (Premium)
- **Vergleichswerte**: DMB Betriebskostenspiegel 2023 (Premium)

## Tech Stack

- **Backend**: FastAPI + SQLAlchemy 2.0 async + PostgreSQL 16
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS + Radix UI
- **Reverse Proxy**: nginx
- **Containerization**: Docker Compose

## Schnellstart

```bash
# 1. Umgebungsvariablen konfigurieren
cp .env.example .env
# .env anpassen (SECRET_KEY, POSTGRES_PASSWORD, etc.)

# 2. Starten
docker compose up -d --build

# 3. Datenbank initialisieren (beim ersten Start automatisch)
# Migrations laufen automatisch beim Start des Backends

# 4. Öffnen
open http://localhost
```

## Erster Admin-Account

Der erste registrierte Nutzer erhält automatisch Admin-Rechte.

## DSGVO

- Datenlöschung: `DELETE /api/gdpr/delete-account`
- Datenexport: `GET /api/gdpr/export`
- Datenschutzerklärung: Bitte separat hinzufügen

## Preismodelle

- **Free**: 1 Abrechnung/Jahr, Basis-Prüfungen
- **Premium** (0,99€/Monat): Unbegrenzt, Vergleichswerte, Widerspruchsbriefe, PDF-Export
