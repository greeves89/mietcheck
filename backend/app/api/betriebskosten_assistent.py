"""
Betriebskosten-Assistent: Schritt-für-Schritt-Führung durch alle 17 Betriebskostenarten
gemäß § 2 BetrKV (Betriebskostenverordnung).
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from app.core.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/betriebskosten-assistent", tags=["betriebskosten-assistent"])

# Alle 17 Betriebskostenarten gemäß § 2 BetrKV
BETRIEBSKOSTEN_ARTEN = [
    {
        "id": 1,
        "key": "grundsteuer",
        "nummer": "§ 2 Nr. 1 BetrKV",
        "name": "Grundsteuer",
        "description": "Die von der Gemeinde erhobene Grundsteuer. Umlagefähig ist die Grundsteuer für das Grundstück, auf dem die Wohnung liegt.",
        "typische_kosten": "Variiert stark je nach Gemeinde und Grundstücksgröße",
        "haeufige_fehler": [
            "Grundsteuerbescheid nicht beigefügt",
            "Grundsteuer für Gewerbeflächen mitumgelegt",
            "Falscher Umlageschlüssel verwendet"
        ],
        "unit": "€/Jahr",
        "plausibilitaet": {"min": 50, "max": 500, "typical": 150}
    },
    {
        "id": 2,
        "key": "wasserversorgung",
        "nummer": "§ 2 Nr. 2 BetrKV",
        "name": "Wasserversorgung",
        "description": "Kosten für Kaltwasser inkl. Grundgebühr, Verbrauch, Wasserzählermiete und Wartung. Auch Kosten für Wasseraufbereitung und Entkalkung.",
        "typische_kosten": "1,50–3,50 €/m²/Monat",
        "haeufige_fehler": [
            "Warmwasserkosten hier eingetragen (gehört zu Nr. 4)",
            "Zählermiete fehlt oder doppelt berechnet",
            "Kosten für Hausanschluss (Investition) einbezogen"
        ],
        "unit": "€/Jahr",
        "plausibilitaet": {"min": 100, "max": 800, "typical": 300}
    },
    {
        "id": 3,
        "key": "entwasserung",
        "nummer": "§ 2 Nr. 3 BetrKV",
        "name": "Entwässerung",
        "description": "Kosten für Abwasser (Schmutzwasser und Niederschlagswasser). Kanalgebühren der Gemeinde, Kosten für Kleinkläranlagen oder Abflussgruben.",
        "typische_kosten": "0,80–2,00 €/m²/Monat",
        "haeufige_fehler": [
            "Regenwassergebühr fehlt",
            "Reparaturkosten an Entwässerungsanlagen einbezogen",
            "Falsche Berechnung bei Niederschlagswasser"
        ],
        "unit": "€/Jahr",
        "plausibilitaet": {"min": 50, "max": 600, "typical": 200}
    },
    {
        "id": 4,
        "key": "heizung",
        "nummer": "§ 2 Nr. 4 BetrKV",
        "name": "Heizung und Warmwasser",
        "description": "Kosten für Heizung und Warmwasser inkl. Brennstoffe, Bedienung, Wartung, Reinigung der Anlage, Messdienstkosten (z.B. Brunata, Techem).",
        "typische_kosten": "8–15 €/m²/Monat je nach Witterung",
        "haeufige_fehler": [
            "Heizkosten nicht nach Heizkostenverordnung abgerechnet (70/30 Pflicht)",
            "Warmwasserkosten fehlen oder werden separat abgerechnet ohne Verweis",
            "Messdienst-Grundgebühr fehlt",
            "Schornsteinfegerkosten hier falsch zugeordnet (gehört zu Nr. 13)"
        ],
        "unit": "€/Jahr",
        "plausibilitaet": {"min": 300, "max": 3000, "typical": 1200}
    },
    {
        "id": 5,
        "key": "aufzug",
        "nummer": "§ 2 Nr. 5 BetrKV",
        "name": "Aufzug",
        "description": "Kosten für Strom, Wartung, Prüfung (TÜV), Bedienung und Reinigung des Aufzugs. Nur umlagefähig wenn Aufzug vorhanden.",
        "typische_kosten": "400–1.500 €/Jahr für das gesamte Gebäude",
        "haeufige_fehler": [
            "Aufzugskosten auf Erdgeschossbewohner umgelegt",
            "Reparaturkosten am Aufzug einbezogen (nicht umlagefähig)",
            "TÜV-Prüfung fehlt in der Abrechnung"
        ],
        "unit": "€/Jahr",
        "plausibilitaet": {"min": 0, "max": 2000, "typical": 600}
    },
    {
        "id": 6,
        "key": "strassenreinigung",
        "nummer": "§ 2 Nr. 6 BetrKV",
        "name": "Straßenreinigung und Müllbeseitigung",
        "description": "Öffentliche Straßenreinigung (Gemeindegebühren), Mülltonnen-Miete und Leerung, Sperrmüllentsorgung nur wenn vertraglich vereinbart.",
        "typische_kosten": "0,50–1,50 €/m²/Monat",
        "haeufige_fehler": [
            "Sperrmüllentsorgung ohne Vereinbarung umgelegt",
            "Kosten für Sonderentsorgungen einbezogen",
            "Winterdienstkosten hier eingetragen (gehört zu Nr. 8)"
        ],
        "unit": "€/Jahr",
        "plausibilitaet": {"min": 50, "max": 500, "typical": 200}
    },
    {
        "id": 7,
        "key": "gebaeudereininung",
        "nummer": "§ 2 Nr. 7 BetrKV",
        "name": "Gebäudereinigung und Ungezieferbekämpfung",
        "description": "Kosten für Reinigung von Gemeinschaftsflächen (Treppenhaus, Keller, Tiefgarage), Reinigungsmittel, Ungezieferbekämpfung im Gemeinschaftsbereich.",
        "typische_kosten": "0,30–1,00 €/m²/Monat",
        "haeufige_fehler": [
            "Reinigung der Privatwohnung einbezogen",
            "Fensterreinigung außen (Investition) einbezogen",
            "Kosten für Hausmeister hier und bei Nr. 14 doppelt"
        ],
        "unit": "€/Jahr",
        "plausibilitaet": {"min": 50, "max": 600, "typical": 200}
    },
    {
        "id": 8,
        "key": "gartenpflege",
        "nummer": "§ 2 Nr. 8 BetrKV",
        "name": "Gartenpflege",
        "description": "Pflege von Gartenanlagen, Rasenmähen, Hecken schneiden, Bäume, Winterdienst (Schneeräumen, Streuen) auf gemeinschaftlichen Flächen.",
        "typische_kosten": "0,20–0,80 €/m²/Monat",
        "haeufige_fehler": [
            "Neuanlage von Gartenanlagen (Investition) einbezogen",
            "Winterdienst auf öffentlichem Gehweg (Pflicht des Eigentümers) auf Mieter umgelegt",
            "Kosten für Einzelmieter ohne Gartenzugang umgelegt"
        ],
        "unit": "€/Jahr",
        "plausibilitaet": {"min": 0, "max": 800, "typical": 200}
    },
    {
        "id": 9,
        "key": "beleuchtung",
        "nummer": "§ 2 Nr. 9 BetrKV",
        "name": "Beleuchtung",
        "description": "Strom für Außen- und Gemeinschaftsbeleuchtung (Treppenhaus, Keller, Tiefgarage, Außenanlagen), Leuchtmittel für Gemeinschaftsbereiche.",
        "typische_kosten": "0,10–0,40 €/m²/Monat",
        "haeufige_fehler": [
            "Strom für Wohnungsbeleuchtung einbezogen",
            "Kosten für Beleuchtungswartung nicht separat ausgewiesen",
            "Zu hohe Pauschalen ohne Belege"
        ],
        "unit": "€/Jahr",
        "plausibilitaet": {"min": 20, "max": 300, "typical": 80}
    },
    {
        "id": 10,
        "key": "schornsteinreinigung",
        "nummer": "§ 2 Nr. 10 BetrKV",
        "name": "Schornsteinreinigung",
        "description": "Kosten für Kehrgebühren und Abgasmessung durch den Schornsteinfeger. Nur wenn im Gebäude Schornsteine/Kamine vorhanden sind.",
        "typische_kosten": "20–100 €/Jahr pro Heizungsanlage",
        "haeufige_fehler": [
            "Kosten auch auf Wohnungen ohne Anschluss umgelegt",
            "Mehrfache Kehrung ohne Notwendigkeit",
            "Kosten für Sanierung des Schornsteins einbezogen"
        ],
        "unit": "€/Jahr",
        "plausibilitaet": {"min": 0, "max": 300, "typical": 60}
    },
    {
        "id": 11,
        "key": "sach_haftpflichtversicherung",
        "nummer": "§ 2 Nr. 11 BetrKV",
        "name": "Sach- und Haftpflichtversicherung",
        "description": "Gebäudeversicherung (Feuer, Wasser, Sturm), Haftpflichtversicherung für das Grundstück, Glasversicherung sofern vorhanden.",
        "typische_kosten": "0,20–0,60 €/m²/Monat",
        "haeufige_fehler": [
            "Rechtsschutzversicherung einbezogen (nicht umlagefähig)",
            "Mietausfallversicherung einbezogen (nicht umlagefähig)",
            "Hausratsversicherung des Vermieters einbezogen"
        ],
        "unit": "€/Jahr",
        "plausibilitaet": {"min": 50, "max": 800, "typical": 250}
    },
    {
        "id": 12,
        "key": "hausmeister",
        "nummer": "§ 2 Nr. 14 BetrKV",
        "name": "Hausmeister",
        "description": "Kosten für Hausmeisterdienste: Reinigung, Gartenpflege, Winterdienst etc. Achtung: Nur der Anteil, der nicht bereits unter anderen Positionen abgerechnet wird!",
        "typische_kosten": "0,30–1,00 €/m²/Monat",
        "haeufige_fehler": [
            "Doppelabrechnung: Hausmeister UND separate Gartenpflege/Reinigung",
            "Verwaltungsanteil des Hausmeisters einbezogen (nicht umlagefähig)",
            "Reparaturarbeiten durch Hausmeister einbezogen"
        ],
        "unit": "€/Jahr",
        "plausibilitaet": {"min": 0, "max": 1500, "typical": 400}
    },
    {
        "id": 13,
        "key": "gemeinschaftsantenne",
        "nummer": "§ 2 Nr. 15 BetrKV",
        "name": "Gemeinschaftsantenne / Kabelanschluss",
        "description": "Kosten für gemeinschaftliche Antennenanlage oder Kabelanschluss. Achtung: Seit 01.07.2024 nicht mehr umlagefähig! (Telekommunikationsmodernisierungsgesetz)",
        "typische_kosten": "8–20 €/Monat pro Einheit",
        "haeufige_fehler": [
            "ACHTUNG: Ab 01.07.2024 NICHT MEHR UMLAGEFÄHIG!",
            "Kosten für Instandhaltung der Anlage einbezogen",
            "Individuelle Streaming-Dienste einbezogen"
        ],
        "unit": "€/Jahr",
        "plausibilitaet": {"min": 0, "max": 300, "typical": 0}
    },
    {
        "id": 14,
        "key": "waschraum",
        "nummer": "§ 2 Nr. 16 BetrKV",
        "name": "Gemeinschaftswaschraum / Wäscheplatz",
        "description": "Kosten für Betrieb und Wartung von Gemeinschaftswaschmaschinen, Trockner, Mangeln sowie Wäscheplatz-Pflege.",
        "typische_kosten": "10–50 €/Jahr pro Einheit",
        "haeufige_fehler": [
            "Kosten für Reparatur der Maschinen einbezogen",
            "Kosten auch auf Wohnungen ohne Zugang umgelegt",
            "Anschaffungskosten für neue Geräte einbezogen"
        ],
        "unit": "€/Jahr",
        "plausibilitaet": {"min": 0, "max": 200, "typical": 50}
    },
    {
        "id": 15,
        "key": "sonstige",
        "nummer": "§ 2 Nr. 17 BetrKV",
        "name": "Sonstige Betriebskosten",
        "description": "Laufende Kosten, die im Mietvertrag ausdrücklich vereinbart wurden, z.B. Dachrinnenreinigung, Pools, Sauna, Parkanlage. Müssen im Mietvertrag einzeln aufgeführt sein!",
        "typische_kosten": "Variiert je nach Vereinbarung",
        "haeufige_fehler": [
            "Kosten ohne Vereinbarung im Mietvertrag umgelegt",
            "Verwaltungskosten hier versteckt (nie umlagefähig)",
            "Instandhaltungsrücklage einbezogen (nie umlagefähig)"
        ],
        "unit": "€/Jahr",
        "plausibilitaet": {"min": 0, "max": 500, "typical": 0}
    },
]

# Nicht umlagefähige Kosten (häufig fälschlich umgelegt)
NICHT_UMLAGEFAEHIG = [
    "Verwaltungskosten (Hausverwaltung)",
    "Instandhaltungs- und Reparaturkosten",
    "Instandhaltungsrücklage",
    "Leerstandskosten",
    "Mietausfallversicherung",
    "Rechtsschutzversicherung",
    "Finanzierungskosten (Zinsen, Tilgung)",
    "Kosten für Wohnungsbeschaffung",
    "Modernisierungskosten",
    "Kabelgebühren (ab 01.07.2024)",
]


class PositionInput(BaseModel):
    key: str
    betrag: float
    vorhanden: bool = True
    notizen: Optional[str] = None


class AssistentAnalyseRequest(BaseModel):
    wohnflaeche_qm: float
    gesamtflaeche_qm: float
    abrechnungsjahr: int
    positionen: List[PositionInput]


class PositionAnalyse(BaseModel):
    key: str
    name: str
    betrag: float
    kosten_pro_qm_monat: float
    plausibel: bool
    warnung: Optional[str] = None
    fehler: Optional[str] = None


class AssistentAnalyseResponse(BaseModel):
    gesamtkosten: float
    ihr_anteil: float
    kosten_pro_qm_monat: float
    positionen_analyse: List[PositionAnalyse]
    warnungen: List[str]
    auffaelligkeiten: List[str]
    empfehlung: str


@router.get("/arten")
async def get_betriebskosten_arten(
    current_user: User = Depends(get_current_user),
):
    """Alle 17 Betriebskostenarten gemäß § 2 BetrKV."""
    return {
        "arten": BETRIEBSKOSTEN_ARTEN,
        "nicht_umlagefaehig": NICHT_UMLAGEFAEHIG,
    }


@router.post("/analyse", response_model=AssistentAnalyseResponse)
async def analysiere_betriebskosten(
    data: AssistentAnalyseRequest,
    current_user: User = Depends(get_current_user),
):
    """Analysiere die eingegebenen Betriebskosten auf Plausibilität und häufige Fehler."""
    wohnflaeche = data.wohnflaeche_qm
    gesamtflaeche = data.gesamtflaeche_qm
    anteilsfaktor = wohnflaeche / gesamtflaeche if gesamtflaeche > 0 else 1.0

    # Lookup-Map für schnellen Zugriff
    arten_map = {art["key"]: art for art in BETRIEBSKOSTEN_ARTEN}

    positionen_analyse = []
    gesamtkosten = 0.0
    warnungen = []
    auffaelligkeiten = []

    for pos in data.positionen:
        if not pos.vorhanden or pos.betrag == 0:
            continue

        art = arten_map.get(pos.key)
        if not art:
            continue

        gesamtkosten += pos.betrag
        ihr_anteil = pos.betrag * anteilsfaktor
        kosten_pro_qm_monat = ihr_anteil / wohnflaeche / 12 if wohnflaeche > 0 else 0

        # Plausibilitätsprüfung
        plausibel = True
        warnung = None
        fehler = None

        plaus = art["plausibilitaet"]
        ihr_jahresanteil = pos.betrag * anteilsfaktor

        if pos.key == "gemeinschaftsantenne":
            fehler = "Kabelgebühren sind ab 01.07.2024 NICHT MEHR umlagefähig! Diese Position muss aus der Abrechnung entfernt werden."
            plausibel = False
            auffaelligkeiten.append(f"Kabelgebühren ({pos.betrag:.2f} €) sind seit Juli 2024 nicht mehr umlagefähig!")

        elif ihr_jahresanteil > plaus["max"]:
            warnung = f"Betrag erscheint ungewöhnlich hoch. Typischer Wert: {plaus['typical']} €/Jahr (Ihr Anteil)"
            plausibel = False
            auffaelligkeiten.append(f"{art['name']}: {ihr_jahresanteil:.0f} €/Jahr (Ihr Anteil) erscheint sehr hoch")

        elif ihr_jahresanteil < plaus["min"] and plaus["min"] > 0:
            warnung = f"Betrag erscheint ungewöhnlich niedrig. Prüfen Sie, ob alle Kosten erfasst wurden."
            auffaelligkeiten.append(f"{art['name']}: Betrag wirkt sehr niedrig")

        positionen_analyse.append(PositionAnalyse(
            key=pos.key,
            name=art["name"],
            betrag=pos.betrag,
            kosten_pro_qm_monat=round(kosten_pro_qm_monat, 4),
            plausibel=plausibel,
            warnung=warnung,
            fehler=fehler,
        ))

    ihr_anteil_gesamt = gesamtkosten * anteilsfaktor
    kosten_pro_qm_gesamt = ihr_anteil_gesamt / wohnflaeche / 12 if wohnflaeche > 0 else 0

    # Gesamtbewertung
    if kosten_pro_qm_gesamt > 4.0:
        warnungen.append(
            f"Ihre Gesamtbetriebskosten von {kosten_pro_qm_gesamt:.2f} €/m²/Monat sind "
            f"deutlich über dem Bundesdurchschnitt von ca. 2,17 €/m²/Monat (DMB 2023). "
            f"Eine detaillierte Prüfung ist empfehlenswert."
        )
    elif kosten_pro_qm_gesamt > 3.0:
        warnungen.append(
            f"Ihre Betriebskosten von {kosten_pro_qm_gesamt:.2f} €/m²/Monat liegen über "
            f"dem Bundesdurchschnitt. Einzelne Positionen sollten geprüft werden."
        )

    # Empfehlung
    fehler_count = sum(1 for p in positionen_analyse if not p.plausibel)
    if fehler_count > 0:
        empfehlung = (
            f"Es wurden {fehler_count} auffällige Position(en) gefunden. "
            f"Wir empfehlen dringend, diese Positionen zu prüfen und ggf. Widerspruch einzulegen. "
            f"Nutzen Sie unsere Widerspruchsbrief-Funktion, um professionell zu reagieren."
        )
    elif len(warnungen) > 0:
        empfehlung = (
            "Die Abrechnung enthält Positionen, die über dem Durchschnitt liegen. "
            "Prüfen Sie, ob Belege vorgelegt wurden und ob der Umlageschlüssel korrekt ist."
        )
    else:
        empfehlung = (
            "Die Betriebskosten sehen auf den ersten Blick plausibel aus. "
            "Prüfen Sie trotzdem, ob alle Positionen im Mietvertrag vereinbart sind "
            "und ob der Umlageschlüssel korrekt angewendet wurde."
        )

    return AssistentAnalyseResponse(
        gesamtkosten=round(gesamtkosten, 2),
        ihr_anteil=round(ihr_anteil_gesamt, 2),
        kosten_pro_qm_monat=round(kosten_pro_qm_gesamt, 4),
        positionen_analyse=positionen_analyse,
        warnungen=warnungen,
        auffaelligkeiten=auffaelligkeiten,
        empfehlung=empfehlung,
    )
