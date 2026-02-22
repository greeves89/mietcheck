"""
Mietvertragprüfung: Prüfung auf unzulässige Klauseln im Mietvertrag.
Basierend auf BGH-Rechtsprechung und aktueller Mietrechtslage.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from app.core.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/mietvertrag", tags=["mietvertrag"])


# Häufig verwendete, oft unwirksame Mietvertragsklauseln
KLAUSEL_CHECKS = [
    {
        "id": "schoenheitsreparaturen_starre_fristen",
        "kategorie": "Schönheitsreparaturen",
        "klausel_bezeichnung": "Starre Renovierungsfristen",
        "beispiel": "Die Wohnung ist alle 3 Jahre in Küche und Bad, alle 5 Jahre in Wohn- und Schlafräumen zu streichen",
        "bgh_urteil": "BGH VIII ZR 199/03 (2004), BGH VIII ZR 361/03 (2004)",
        "unwirksam_wenn": "Wenn die Fristen 'starr' sind (z.B. 'alle 3 Jahre') ohne Rücksicht auf tatsächlichen Renovierungsbedarf",
        "folge": "Gesamte Schönheitsreparaturklausel wird unwirksam",
        "frage": "Enthält der Mietvertrag starre Renovierungsfristen (z.B. 'alle 3 Jahre muss gestrichen werden')?",
    },
    {
        "id": "schoenheitsreparaturen_unrenoviert",
        "kategorie": "Schönheitsreparaturen",
        "klausel_bezeichnung": "Renovierungspflicht bei unrenoviert übernommener Wohnung",
        "beispiel": "Der Mieter übernimmt die Wohnung im renovierten Zustand und verpflichtet sich, sie renoviert zurückzugeben",
        "bgh_urteil": "BGH VIII ZR 185/14 (2015)",
        "unwirksam_wenn": "Wenn die Wohnung bei Mietbeginn unrenoviert oder mit Gebrauchsspuren übergeben wurde",
        "folge": "Schönheitsreparaturklausel unwirksam, Mieter muss nicht renovieren",
        "frage": "Wurde die Wohnung unrenoviert oder mit sichtbaren Gebrauchsspuren übergeben?",
    },
    {
        "id": "abgeltungsklausel",
        "kategorie": "Schönheitsreparaturen",
        "klausel_bezeichnung": "Abgeltungsklausel / Quotenhaftung",
        "beispiel": "Bei Auszug sind anteilige Kosten für noch nicht fällige Schönheitsreparaturen zu zahlen (z.B. 50% bei halb abgelaufener Frist)",
        "bgh_urteil": "BGH VIII ZR 152/05 (2006)",
        "unwirksam_wenn": "Immer – Abgeltungsklauseln sind generell unwirksam nach BGH-Rechtsprechung",
        "folge": "Klausel unwirksam, keine anteiligen Renovierungskosten",
        "frage": "Enthält der Mietvertrag eine Klausel zur anteiligen Kostenbeteiligung bei Auszug (Quoten- oder Abgeltungsklausel)?",
    },
    {
        "id": "endrenovierung",
        "kategorie": "Schönheitsreparaturen",
        "klausel_bezeichnung": "Endrenovierungsklausel",
        "beispiel": "Bei Auszug ist die Wohnung vollständig zu renovieren, unabhängig vom Zustand",
        "bgh_urteil": "BGH VIII ZR 316/05 (2006)",
        "unwirksam_wenn": "Wenn sie zur Doppelbelastung führt (Schönheitsreparaturen + Endrenovierung)",
        "folge": "Klausel unwirksam",
        "frage": "Verlangt der Mietvertrag bei Auszug eine vollständige Endrenovierung unabhängig vom aktuellen Zustand?",
    },
    {
        "id": "kuendigungsfrist_mieter",
        "kategorie": "Kündigungsfristen",
        "klausel_bezeichnung": "Verlängerte Kündigungsfrist für Mieter",
        "beispiel": "Der Mieter kann mit einer Frist von 6 Monaten kündigen",
        "bgh_urteil": "§ 573c BGB, BGH VIII ZR 80/04",
        "unwirksam_wenn": "Wenn die Kündigungsfrist für den Mieter länger als 3 Monate ist",
        "folge": "Klausel unwirksam, gesetzliche 3-Monats-Frist gilt",
        "frage": "Ist im Mietvertrag für den Mieter eine Kündigungsfrist von mehr als 3 Monaten vereinbart?",
    },
    {
        "id": "mindestvermietungsdauer",
        "kategorie": "Kündigungsfristen",
        "klausel_bezeichnung": "Mindestmietdauer / Kündigunsausschluss",
        "beispiel": "Eine Kündigung durch den Mieter ist in den ersten 2 Jahren ausgeschlossen",
        "bgh_urteil": "BGH VIII ZR 307/04, § 575 BGB",
        "unwirksam_wenn": "Wenn Ausschluss länger als 4 Jahre und/oder einseitig zugunsten Vermieter",
        "folge": "Bei Unwirksamkeit gilt die ordentliche Kündigungsfrist",
        "frage": "Gibt es eine Mindestmietdauer oder einen beidseitigen Kündigungsausschluss von mehr als 4 Jahren?",
    },
    {
        "id": "kleinreparaturklausel_zu_hoch",
        "kategorie": "Kleinreparaturen",
        "klausel_bezeichnung": "Kleinreparaturklausel mit zu hohen Beträgen",
        "beispiel": "Kleinreparaturen bis 200 EUR trägt der Mieter selbst",
        "bgh_urteil": "BGH VIII ZR 308/09 (2010)",
        "unwirksam_wenn": "Wenn der Einzelbetrag über 75-100 EUR oder der Jahresbetrag über 8% der Jahresmiete liegt",
        "folge": "Klausel unwirksam, Vermieter muss alle Reparaturen zahlen",
        "frage": "Enthält der Mietvertrag eine Kleinreparaturklausel mit Einzelbeträgen über 100 EUR?",
    },
    {
        "id": "tierhaltungsverbot",
        "kategorie": "Tierhaltung",
        "klausel_bezeichnung": "Generelles Tierhaltungsverbot",
        "beispiel": "Jegliche Tierhaltung ist untersagt",
        "bgh_urteil": "BGH VIII ZR 168/12 (2013)",
        "unwirksam_wenn": "Wenn es auch Kleintiere umfasst (Hamster, Vögel, etc.)",
        "folge": "Klausel für Kleintiere unwirksam; bei Hunden/Katzen Abwägung im Einzelfall",
        "frage": "Enthält der Mietvertrag ein generelles Tierhaltungsverbot (auch für Kleintiere)?",
    },
    {
        "id": "kaution_ueberhoeht",
        "kategorie": "Kaution",
        "klausel_bezeichnung": "Überhöhte Mietkaution",
        "beispiel": "Der Mieter leistet eine Kaution in Höhe von 4 Monatsmieten",
        "bgh_urteil": "§ 551 BGB",
        "unwirksam_wenn": "Wenn die Kaution mehr als 3 Nettokaltmieten beträgt",
        "folge": "Nur maximal 3 Monatsmieten sind zulässig; zu viel Gezahltes kann zurückgefordert werden",
        "frage": "Beträgt die vereinbarte Kaution mehr als 3 Nettokaltmieten?",
    },
    {
        "id": "betriebskosten_pauschal_ohne_abrechnung",
        "kategorie": "Betriebskosten",
        "klausel_bezeichnung": "Betriebskostenpauschale ohne Abrechnung",
        "beispiel": "Nebenkosten werden als Pauschale von 200 EUR ohne Abrechnung vereinbart",
        "bgh_urteil": "§ 556 BGB",
        "unwirksam_wenn": "Nur wenn gleichzeitig auch Nachforderungen möglich sein sollen – entweder Pauschale ODER Vorauszahlung mit Abrechnung",
        "folge": "Bei vereinbarter Pauschale: keine Nachzahlung möglich; bei vereinbarter Vorauszahlung: Abrechnung Pflicht",
        "frage": "Sind Betriebskosten als Pauschale vereinbart, aber der Vermieter fordert trotzdem Nachzahlungen?",
    },
    {
        "id": "hausordnung_vertragsbestandteil",
        "kategorie": "Hausordnung",
        "klausel_bezeichnung": "Einseitige Änderung der Hausordnung",
        "beispiel": "Der Vermieter ist berechtigt, die Hausordnung jederzeit zu ändern",
        "bgh_urteil": "BGH VIII ZR 129/03",
        "unwirksam_wenn": "Wenn Änderungen ohne Zustimmung des Mieters möglich sein sollen",
        "folge": "Klausel unwirksam, Hausordnungsänderungen brauchen Zustimmung",
        "frage": "Darf der Vermieter laut Mietvertrag die Hausordnung einseitig ändern?",
    },
    {
        "id": "besichtigungsrecht_ohne_ankuendigung",
        "kategorie": "Besichtigung",
        "klausel_bezeichnung": "Besichtigungsrecht ohne Ankündigung",
        "beispiel": "Der Vermieter ist berechtigt, die Wohnung jederzeit zu besichtigen",
        "bgh_urteil": "Art. 13 GG (Unverletzlichkeit der Wohnung)",
        "unwirksam_wenn": "Immer – Besichtigungen müssen ausreichend angekündigt werden (mind. 24h)",
        "folge": "Klausel unwirksam, Mieter muss unangemeldeten Zutritt verweigern dürfen",
        "frage": "Darf der Vermieter laut Mietvertrag die Wohnung ohne vorherige Ankündigung besichtigen?",
    },
]


class KlauselAntwort(BaseModel):
    klausel_id: str
    vorhanden: bool
    notizen: Optional[str] = None


class MietvertragCheckRequest(BaseModel):
    antworten: List[KlauselAntwort]


class KlauselErgebnis(BaseModel):
    id: str
    kategorie: str
    klausel_bezeichnung: str
    vorhanden: bool
    unwirksam: bool
    bgh_urteil: str
    folge: str
    empfehlung: str


class MietvertragCheckResponse(BaseModel):
    gesamtbewertung: str
    unwirksame_klauseln: int
    gesamte_klauseln_geprueft: int
    ergebnisse: List[KlauselErgebnis]
    zusammenfassung: str
    handlungsempfehlung: str


@router.get("/klauseln")
async def get_klauseln(current_user: User = Depends(get_current_user)):
    """Gibt alle prüfbaren Klauseltypen zurück."""
    return {
        "klauseln": [
            {
                "id": k["id"],
                "kategorie": k["kategorie"],
                "klausel_bezeichnung": k["klausel_bezeichnung"],
                "beispiel": k["beispiel"],
                "frage": k["frage"],
            }
            for k in KLAUSEL_CHECKS
        ]
    }


@router.post("/check", response_model=MietvertragCheckResponse)
async def check_mietvertrag(
    data: MietvertragCheckRequest,
    current_user: User = Depends(get_current_user),
):
    """Prüft die angegebenen Mietvertragsklauseln auf Unwirksamkeit."""
    antworten_map = {a.klausel_id: a for a in data.antworten}
    ergebnisse = []
    unwirksame_count = 0

    for klausel in KLAUSEL_CHECKS:
        antwort = antworten_map.get(klausel["id"])
        if not antwort:
            continue

        vorhanden = antwort.vorhanden
        unwirksam = False
        empfehlung = ""

        if vorhanden:
            unwirksam = True
            unwirksame_count += 1
            empfehlung = (
                f"Diese Klausel ist nach {klausel['bgh_urteil']} unwirksam. "
                f"Folge: {klausel['folge']}. "
                f"Handlung: Fordern Sie den Vermieter schriftlich auf, die Klausel zu streichen "
                f"oder bestätigen Sie schriftlich, dass Sie hieran nicht festhalten."
            )
        else:
            empfehlung = "Kein Problem festgestellt."

        ergebnisse.append(KlauselErgebnis(
            id=klausel["id"],
            kategorie=klausel["kategorie"],
            klausel_bezeichnung=klausel["klausel_bezeichnung"],
            vorhanden=vorhanden,
            unwirksam=unwirksam,
            bgh_urteil=klausel["bgh_urteil"],
            folge=klausel["folge"],
            empfehlung=empfehlung,
        ))

    geprueft = len(ergebnisse)

    if unwirksame_count == 0:
        gesamtbewertung = "gut"
        zusammenfassung = "Keine offensichtlich unwirksamen Klauseln gefunden. Ihr Mietvertrag scheint in den geprüften Bereichen rechtlich korrekt zu sein."
        handlungsempfehlung = "Kein unmittelbarer Handlungsbedarf. Lassen Sie den Vertrag bei Zweifeln durch einen Mieterverein prüfen."
    elif unwirksame_count <= 2:
        gesamtbewertung = "verbesserungswuerdig"
        zusammenfassung = f"{unwirksame_count} möglicherweise unwirksame Klausel(n) gefunden. Diese können Sie anfechten."
        handlungsempfehlung = (
            f"Schreiben Sie dem Vermieter bezüglich der {unwirksame_count} problematischen Klausel(n). "
            "Ein Mieterverein kann Ihnen helfen, die Klauseln rechtssicher anzufechten."
        )
    else:
        gesamtbewertung = "problematisch"
        zusammenfassung = f"Achtung: {unwirksame_count} möglicherweise unwirksame Klauseln gefunden! Dieser Mietvertrag hat erhebliche rechtliche Mängel."
        handlungsempfehlung = (
            f"Dieser Mietvertrag enthält {unwirksame_count} problematische Klauseln. "
            "Wenden Sie sich dringend an einen Mieterverein oder Rechtsanwalt. "
            "Viele der Klauseln können Sie ignorieren, da sie unwirksam sind."
        )

    return MietvertragCheckResponse(
        gesamtbewertung=gesamtbewertung,
        unwirksame_klauseln=unwirksame_count,
        gesamte_klauseln_geprueft=geprueft,
        ergebnisse=ergebnisse,
        zusammenfassung=zusammenfassung,
        handlungsempfehlung=handlungsempfehlung,
    )
