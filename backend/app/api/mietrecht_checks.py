"""
Weitere Mietrecht-Checks:
- Mietwucher-Check (§ 5 WiStG): >20% über ortsüblicher Vergleichsmiete
- Mieterhöhungsprüfung (§ 558 BGB): Kappungsgrenze, Begründung
- Kautionsrückforderungs-Assistent: Prüfung Rückbehalt, Frist, Schreiben
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import date
from app.core.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/mietrecht", tags=["mietrecht"])

# Referenz-Mietspiegel: Durchschnittliche Nettokaltmiete €/m²/Monat (vereinfacht)
# Gleiche Städte wie im Mietpreisbremse-Check
STADTMIETEN = {
    "berlin": {"name": "Berlin", "avg_rent_sqm": 12.0, "kappungsgrenze": 15},
    "hamburg": {"name": "Hamburg", "avg_rent_sqm": 13.5, "kappungsgrenze": 15},
    "muenchen": {"name": "München", "avg_rent_sqm": 19.0, "kappungsgrenze": 15},
    "koeln": {"name": "Köln", "avg_rent_sqm": 12.5, "kappungsgrenze": 15},
    "frankfurt": {"name": "Frankfurt am Main", "avg_rent_sqm": 14.5, "kappungsgrenze": 15},
    "stuttgart": {"name": "Stuttgart", "avg_rent_sqm": 14.0, "kappungsgrenze": 15},
    "duesseldorf": {"name": "Düsseldorf", "avg_rent_sqm": 13.0, "kappungsgrenze": 15},
    "leipzig": {"name": "Leipzig", "avg_rent_sqm": 8.5, "kappungsgrenze": 20},
    "dresden": {"name": "Dresden", "avg_rent_sqm": 9.0, "kappungsgrenze": 20},
    "dortmund": {"name": "Dortmund", "avg_rent_sqm": 8.0, "kappungsgrenze": 20},
    "essen": {"name": "Essen", "avg_rent_sqm": 7.5, "kappungsgrenze": 20},
    "bremen": {"name": "Bremen", "avg_rent_sqm": 9.0, "kappungsgrenze": 20},
    "hannover": {"name": "Hannover", "avg_rent_sqm": 10.0, "kappungsgrenze": 20},
    "nuernberg": {"name": "Nürnberg", "avg_rent_sqm": 11.5, "kappungsgrenze": 20},
    "duisburg": {"name": "Duisburg", "avg_rent_sqm": 7.0, "kappungsgrenze": 20},
    "bochum": {"name": "Bochum", "avg_rent_sqm": 8.0, "kappungsgrenze": 20},
    "wuppertal": {"name": "Wuppertal", "avg_rent_sqm": 7.5, "kappungsgrenze": 20},
    "bielefeld": {"name": "Bielefeld", "avg_rent_sqm": 8.5, "kappungsgrenze": 20},
    "bonn": {"name": "Bonn", "avg_rent_sqm": 12.0, "kappungsgrenze": 15},
    "mannheim": {"name": "Mannheim", "avg_rent_sqm": 11.5, "kappungsgrenze": 20},
}


# ─────────────────────────────────────────────────────────────
# Mietwucher-Check (§ 5 WiStG)
# ─────────────────────────────────────────────────────────────
class MietwucherRequest(BaseModel):
    stadt: str
    wohnflaeche_qm: float
    aktuelle_monatsmiete: float
    baujahr: Optional[int] = None
    is_furnished: bool = False
    is_modernized: bool = False


class MietwucherResponse(BaseModel):
    vergleichsmiete_sqm: float
    vergleichsmiete_gesamt: float
    aktuelle_miete_sqm: float
    ueberschreitung_prozent: float
    ueberschreitung_monatlich: float
    ist_mietwucher: bool
    ist_mietpreisbremse: bool
    gesetzliche_grundlage: str
    empfehlung: str
    handlungsoptionen: List[str]


@router.get("/staedte")
async def get_staedte(current_user: User = Depends(get_current_user)):
    """Liste aller verfügbaren Städte."""
    return [{"key": k, "name": v["name"]} for k, v in STADTMIETEN.items()]


@router.post("/mietwucher-check", response_model=MietwucherResponse)
async def check_mietwucher(
    data: MietwucherRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Prüft ob die Miete gegen § 5 WiStG (Mietwucher: >20% über Vergleichsmiete)
    oder § 556d BGB (Mietpreisbremse: >10%) verstößt.
    """
    stadt_data = STADTMIETEN.get(data.stadt.lower(), {"avg_rent_sqm": 10.0, "kappungsgrenze": 20})
    basis_sqm = stadt_data["avg_rent_sqm"]

    # Baujahr-Anpassungen
    anpassung = 0.0
    if data.baujahr:
        if data.baujahr < 1960:
            anpassung = -2.0
        elif data.baujahr < 1980:
            anpassung = -1.0
        elif data.baujahr >= 2000:
            anpassung = 1.5
        elif data.baujahr >= 1990:
            anpassung = 0.5

    if data.is_furnished:
        anpassung += 2.5
    if data.is_modernized:
        anpassung += 1.5

    vergleichsmiete_sqm = max(basis_sqm + anpassung, basis_sqm * 0.6)
    vergleichsmiete_gesamt = vergleichsmiete_sqm * data.wohnflaeche_qm
    aktuelle_sqm = data.aktuelle_monatsmiete / data.wohnflaeche_qm

    ueberschreitung = (aktuelle_sqm - vergleichsmiete_sqm) / vergleichsmiete_sqm * 100
    ueberschreitung_monatlich = max(data.aktuelle_monatsmiete - vergleichsmiete_gesamt, 0)

    ist_mietwucher = ueberschreitung > 20.0
    ist_mietpreisbremse = ueberschreitung > 10.0

    if ist_mietwucher:
        gesetz = "§ 5 WiStG (Wirtschaftsstrafgesetz): Mietwucher liegt vor wenn die Miete die ortsübliche Vergleichsmiete um mehr als 20% übersteigt."
        empfehlung = (
            f"Ihre Miete überschreitet die ortsübliche Vergleichsmiete um {ueberschreitung:.1f}% "
            f"(= {ueberschreitung_monatlich:.0f} €/Monat zu viel). Dies erfüllt den Tatbestand des "
            f"Mietwuchers nach § 5 WiStG. Sie können: (1) Mietanpassung verlangen, "
            f"(2) Zu viel gezahlte Miete zurückfordern (bis zu 3 Jahre rückwirkend), "
            f"(3) Anzeige bei der Behörde erstatten."
        )
    elif ist_mietpreisbremse:
        gesetz = "§ 556d BGB (Mietpreisbremse): Miete überschreitet die ortsübliche Vergleichsmiete um mehr als 10%."
        empfehlung = (
            f"Ihre Miete überschreitet die Mietpreisbremse (§ 556d BGB) um {ueberschreitung - 10:.1f}% "
            f"(= {ueberschreitung_monatlich:.0f} €/Monat zu viel). "
            f"Sie haben Anspruch auf Mietreduzierung und Rückzahlung der zu viel gezahlten Beträge."
        )
    elif ueberschreitung > 0:
        gesetz = "Ortsübliche Vergleichsmiete (Mietspiegel)"
        empfehlung = (
            f"Ihre Miete liegt {ueberschreitung:.1f}% über der Vergleichsmiete, "
            f"aber noch unter der 10%-Grenze der Mietpreisbremse. "
            f"Kein unmittelbarer Verstoß, aber bei der nächsten Mieterhöhung sollten Sie die Grenzen kennen."
        )
    else:
        gesetz = "Ortsübliche Vergleichsmiete (Mietspiegel)"
        empfehlung = "Ihre Miete liegt unter der ortsüblichen Vergleichsmiete. Kein Verstoß erkennbar."

    handlungsoptionen = []
    if ist_mietwucher or ist_mietpreisbremse:
        handlungsoptionen = [
            "Rügeschreiben an Vermieter senden (Voraussetzung für Rückforderung)",
            "Miete auf zulässiges Niveau kürzen (nach anwaltlicher Beratung)",
            "Zu viel gezahlte Miete zurückfordern (3 Jahre rückwirkend möglich)",
            "Mieterverein oder Rechtsanwalt einschalten",
            "Bei offensichtlichem Mietwucher: Anzeige bei Ordnungsamt/Staatsanwaltschaft",
        ]
    else:
        handlungsoptionen = [
            "Aktuelle Rechtslage bei nächster Mieterhöhung im Blick behalten",
            "Mietspiegel Ihrer Stadt regelmäßig prüfen",
        ]

    return MietwucherResponse(
        vergleichsmiete_sqm=round(vergleichsmiete_sqm, 2),
        vergleichsmiete_gesamt=round(vergleichsmiete_gesamt, 2),
        aktuelle_miete_sqm=round(aktuelle_sqm, 2),
        ueberschreitung_prozent=round(ueberschreitung, 1),
        ueberschreitung_monatlich=round(ueberschreitung_monatlich, 2),
        ist_mietwucher=ist_mietwucher,
        ist_mietpreisbremse=ist_mietpreisbremse,
        gesetzliche_grundlage=gesetz,
        empfehlung=empfehlung,
        handlungsoptionen=handlungsoptionen,
    )


# ─────────────────────────────────────────────────────────────
# Mieterhöhungsprüfung (§ 558 BGB)
# ─────────────────────────────────────────────────────────────
class MieterhoehungRequest(BaseModel):
    stadt: str
    wohnflaeche_qm: float
    aktuelle_monatsmiete: float
    neue_monatsmiete: float
    letzte_erhoehung_datum: Optional[str] = None  # ISO date string
    mietbeginn_datum: Optional[str] = None
    erhoehungsbegruendung: Optional[str] = None  # "mietspiegel" | "gutachten" | "vergleichswohnungen"


class MieterhoehungResponse(BaseModel):
    erhoehung_absolut: float
    erhoehung_prozent: float
    kappungsgrenze_prozent: int
    kappungsgrenze_absolut: float
    max_zulaessige_miete: float
    ist_zulaessig: bool
    beginn_fruehestens: Optional[str]
    probleme: List[str]
    empfehlung: str


@router.post("/mieterhoehung-check", response_model=MieterhoehungResponse)
async def check_mieterhoehung(
    data: MieterhoehungRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Prüft ob eine Mieterhöhung zulässig ist (§ 558 BGB):
    - Kappungsgrenze (15% in angespannten Märkten, 20% sonst in 3 Jahren)
    - Wartefristen
    - Begründungspflicht
    """
    from datetime import date, timedelta

    stadt_data = STADTMIETEN.get(data.stadt.lower(), {"avg_rent_sqm": 10.0, "kappungsgrenze": 20})
    kappungsgrenze = stadt_data["kappungsgrenze"]

    erhoehung_absolut = data.neue_monatsmiete - data.aktuelle_monatsmiete
    erhoehung_prozent = (erhoehung_absolut / data.aktuelle_monatsmiete * 100) if data.aktuelle_monatsmiete > 0 else 0

    # Kappungsgrenze: X% in 3 Jahren
    max_zulaessige_erhoehung = data.aktuelle_monatsmiete * kappungsgrenze / 100
    max_zulaessige_miete = data.aktuelle_monatsmiete + max_zulaessige_erhoehung

    ist_zulaessig = erhoehung_prozent <= kappungsgrenze
    probleme = []

    # Fristen prüfen
    beginn_fruehestens = None
    if data.letzte_erhoehung_datum:
        try:
            letzte = date.fromisoformat(data.letzte_erhoehung_datum)
            # Mieterhöhung erst 12 Monate nach letzter Erhöhung möglich
            fruehester_zeitpunkt = letzte.replace(year=letzte.year + 1)
            # Außerdem: nach Ankündigung noch 2 Monate Frist
            beginn_fruehestens = (fruehester_zeitpunkt + timedelta(days=60)).isoformat()
            if fruehester_zeitpunkt > date.today():
                probleme.append(
                    f"Sperrfrist nicht abgelaufen: Nächste Mieterhöhung erst ab {fruehester_zeitpunkt} möglich "
                    f"(12 Monate seit letzter Erhöhung am {data.letzte_erhoehung_datum})"
                )
                ist_zulaessig = False
        except ValueError:
            pass

    # Kappungsgrenze
    if erhoehung_prozent > kappungsgrenze:
        probleme.append(
            f"Kappungsgrenze überschritten: In {stadt_data.get('name', data.stadt)} gilt eine Kappungsgrenze von "
            f"{kappungsgrenze}% in 3 Jahren. Die geforderte Erhöhung von {erhoehung_prozent:.1f}% "
            f"überschreitet diesen Wert. Maximal zulässig: {max_zulaessige_miete:.2f} €/Monat."
        )
        ist_zulaessig = False

    # Begründungspflicht
    if not data.erhoehungsbegruendung:
        probleme.append(
            "Keine Begründung angegeben. Eine Mieterhöhung muss nach § 558a BGB begründet werden: "
            "durch Mietspiegel, Sachverständigengutachten oder drei Vergleichswohnungen."
        )
    elif data.erhoehungsbegruendung == "vergleichswohnungen":
        probleme.append(
            "Bei Begründung mit Vergleichswohnungen müssen mindestens 3 konkrete Wohnungen "
            "mit Adresse und aktueller Miete genannt werden."
        )

    # Vergleichsmiete prüfen
    stadt_sqm = stadt_data["avg_rent_sqm"]
    neue_sqm = data.neue_monatsmiete / data.wohnflaeche_qm
    if neue_sqm > stadt_sqm * 1.1:
        probleme.append(
            f"Die neue Miete von {neue_sqm:.2f} €/m² übersteigt die ortsübliche Vergleichsmiete "
            f"von ca. {stadt_sqm:.2f} €/m² (Mietpreisbremse-Grenze: {stadt_sqm * 1.1:.2f} €/m²)."
        )

    if ist_zulaessig and len(probleme) == 0:
        empfehlung = (
            f"Die Mieterhöhung auf {data.neue_monatsmiete:.2f} €/Monat ({erhoehung_prozent:.1f}% Erhöhung) "
            f"erscheint formal zulässig. Prüfen Sie dennoch, ob der Mietspiegel korrekt angewendet wurde "
            f"und ob die Begründung vollständig ist."
        )
    elif len(probleme) > 0:
        empfehlung = (
            f"Es wurden {len(probleme)} Problem(e) mit der Mieterhöhung festgestellt. "
            f"Sie können innerhalb von 2 Monaten nach Zugang des Erhöhungsverlangens widersprechen. "
            f"Wenden Sie sich an einen Mieterverein oder Rechtsanwalt."
        )
    else:
        empfehlung = "Die Mieterhöhung scheint zulässig zu sein."

    return MieterhoehungResponse(
        erhoehung_absolut=round(erhoehung_absolut, 2),
        erhoehung_prozent=round(erhoehung_prozent, 1),
        kappungsgrenze_prozent=kappungsgrenze,
        kappungsgrenze_absolut=round(max_zulaessige_erhoehung, 2),
        max_zulaessige_miete=round(max_zulaessige_miete, 2),
        ist_zulaessig=ist_zulaessig,
        beginn_fruehestens=beginn_fruehestens,
        probleme=probleme,
        empfehlung=empfehlung,
    )


# ─────────────────────────────────────────────────────────────
# Kautionsrückforderungs-Assistent
# ─────────────────────────────────────────────────────────────
class KautionRequest(BaseModel):
    kaution_gezahlt: float
    rueckgabedatum: str  # ISO date: Datum der Wohnungsübergabe
    betrag_einbehalten: float
    grund_einbehalt: Optional[str] = None
    maengel_protokoll_vorhanden: bool = False
    wohnung_renoviert_uebergeben: bool = False
    schoenheitsreparaturen_vereinbart: bool = False


class KautionResponse(BaseModel):
    kaution_gesamt: float
    einbehalt: float
    rueckforderung: float
    frist_abgelaufen: bool
    frist_info: str
    einbehalt_plausibel: bool
    probleme: List[str]
    empfehlung: str
    mustertext: str


@router.post("/kaution-check", response_model=KautionResponse)
async def check_kaution(
    data: KautionRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Prüft ob der Kautionseinbehalt des Vermieters berechtigt ist
    und erstellt einen Mustertext zur Rückforderung.
    """
    from datetime import date, timedelta

    rueckgabe = date.fromisoformat(data.rueckgabedatum)
    heute = date.today()
    tage_seit_rueckgabe = (heute - rueckgabe).days

    # Vermieter hat typisch 3-6 Monate Zeit für Abrechnung
    frist_abgelaufen = tage_seit_rueckgabe > 180  # 6 Monate als Richtwert
    frist_info = ""
    if tage_seit_rueckgabe < 90:
        frist_info = (
            f"Seit der Übergabe sind erst {tage_seit_rueckgabe} Tage vergangen. "
            f"Dem Vermieter steht eine angemessene Prüfungsfrist zu (typisch 3-6 Monate). "
            f"Eine Forderung jetzt ist möglich, aber der Vermieter könnte auf die Prüfungsfrist verweisen."
        )
    elif tage_seit_rueckgabe < 180:
        frist_info = (
            f"Seit der Übergabe sind {tage_seit_rueckgabe} Tage vergangen. "
            f"Der Vermieter hat in der Regel noch bis zu 6 Monate Zeit zur Abrechnung, "
            f"kann dies aber nicht beliebig verzögern. Sie können zur Rückgabe auffordern."
        )
    else:
        frist_info = (
            f"Seit der Übergabe sind {tage_seit_rueckgabe} Tage ({tage_seit_rueckgabe // 30} Monate) vergangen. "
            f"Die Abrechnungsfrist des Vermieters ist abgelaufen. "
            f"Sie haben jetzt einen fälligen Rückforderungsanspruch mit Verzugszinsen."
        )

    rueckforderung = max(data.kaution_gezahlt - data.betrag_einbehalten, 0)
    probleme = []
    einbehalt_plausibel = True

    # Max. Kaution prüfen
    if data.kaution_gezahlt > 0:
        # Hier können wir nicht die Monatsmiete prüfen, aber wir können auf § 551 hinweisen
        pass

    # Einbehalt prüfen
    if data.betrag_einbehalten > data.kaution_gezahlt:
        probleme.append(
            f"Der einbehaltene Betrag ({data.betrag_einbehalten:.2f} €) übersteigt die gezahlte Kaution "
            f"({data.kaution_gezahlt:.2f} €). Der Vermieter kann keine über die Kaution hinausgehenden "
            f"Beträge aus der Kaution entnehmen (weitere Ansprüche müssen separat geltend gemacht werden)."
        )
        einbehalt_plausibel = False

    # Schönheitsreparaturen
    if data.schoenheitsreparaturen_vereinbart and data.betrag_einbehalten > 0:
        probleme.append(
            "Viele Schönheitsreparaturklauseln in Mietverträgen sind unwirksam (BGH-Urteile)! "
            "Prüfen Sie, ob die Klausel 'starre Fristen' enthält (z.B. 'alle 3 Jahre streichen') – "
            "dann ist sie nichtig und der Einbehalt unrechtmäßig."
        )

    if not data.maengel_protokoll_vorhanden and data.betrag_einbehalten > 0:
        probleme.append(
            "Kein Übergabeprotokoll vorhanden. Ohne dokumentierte Mängel kann der Vermieter "
            "Schadensersatzansprüche schwer nachweisen. Fordern Sie eine schriftliche Aufstellung "
            "der behaupteten Schäden mit Belegen."
        )

    if data.wohnung_renoviert_uebergeben and data.betrag_einbehalten > 0:
        probleme.append(
            "Sie haben die Wohnung renoviert übergeben. Reparaturkosten für normale Abnutzung "
            "können nicht vom Mieter verlangt werden. Nur außergewöhnliche Beschädigungen "
            "jenseits normaler Abnutzung sind ersatzpflichtig."
        )

    # Empfehlung
    if rueckforderung > 0 and (len(probleme) > 0 or frist_abgelaufen):
        empfehlung = (
            f"Sie haben starke Argumente für die Rückforderung von {rueckforderung:.2f} €. "
            f"Senden Sie dem Vermieter ein Aufforderungsschreiben mit Fristsetzung (14 Tage). "
            f"Danach können Sie eine Mahnklage beim Amtsgericht einreichen (bis 5.000 € ohne Anwalt möglich)."
        )
    elif rueckforderung > 0:
        empfehlung = (
            f"Sie können {rueckforderung:.2f} € zurückfordern. "
            f"Setzen Sie dem Vermieter eine schriftliche Frist von 14 Tagen zur Rückzahlung."
        )
    else:
        empfehlung = "Der Vermieter hat die volle Kaution einbehalten. Prüfen Sie die Berechtigung jedes Einbehalts."

    # Mustertext für Rückforderungsschreiben
    mustertext = f"""Sehr geehrte/r Vermieter/in,

ich beziehe mich auf die Rückgabe der Mietwohnung am {data.rueckgabedatum}.

Ich fordere Sie hiermit auf, die von mir geleistete Mietkaution in Höhe von {data.kaution_gezahlt:.2f} € {"vollständig" if data.betrag_einbehalten == 0 else f"abzüglich nachgewiesener Ansprüche"} bis zum [DATUM, 14 Tage ab heute] auf mein Konto [KONTONUMMER/IBAN] zurückzuüberweisen.

{"Der von Ihnen einbehaltene Betrag in Höhe von " + f"{data.betrag_einbehalten:.2f} €" + " ist nach meiner Einschätzung nicht berechtigt, da: " + (data.grund_einbehalt or "die geltend gemachten Mängel nicht auf nachgewiesenen Schäden beruhen") + "." if data.betrag_einbehalten > 0 else ""}

Sollten Sie berechtigte Ansprüche haben, bitte ich um eine schriftliche Aufstellung mit Belegen (Rechnungen, Kostenvoranschläge) bis zu o.g. Frist.

Nach fruchtlosem Ablauf der Frist werde ich rechtliche Schritte einleiten.

Mit freundlichen Grüßen,
[Ihr Name]
[Ihre Anschrift]"""

    return KautionResponse(
        kaution_gesamt=data.kaution_gezahlt,
        einbehalt=data.betrag_einbehalten,
        rueckforderung=round(rueckforderung, 2),
        frist_abgelaufen=frist_abgelaufen,
        frist_info=frist_info,
        einbehalt_plausibel=einbehalt_plausibel,
        probleme=probleme,
        empfehlung=empfehlung,
        mustertext=mustertext,
    )
