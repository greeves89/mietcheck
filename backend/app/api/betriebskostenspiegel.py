"""
Regionaler Betriebskostenspiegel mit Vergleichswerten nach Stadt, Gebäudetyp und Baujahr.
Basiert auf DMB Betriebskostenspiegel und co2online Daten (jährlich aktualisiert).
Stand: 2023 (Abrechnungsjahr 2022).
"""
from fastapi import APIRouter, Query
from typing import Optional

router = APIRouter(prefix="/betriebskostenspiegel", tags=["betriebskostenspiegel"])

# Comprehensive data structure
# kosten_pro_qm_monat in EUR
BETRIEBSKOSTENSPIEGEL = {
    # Format: city_key: {
    #   "label": display name,
    #   "bundesland": state,
    #   "mietpreisgebiet": "angespannt"/"normal"/"entspannt",
    #   "gesamt_avg": avg total operating costs per sqm/month (national avg = 2.17),
    #   "kategorien": {category_key: {"avg": float, "min": float, "max": float}}
    # }
    "berlin": {
        "label": "Berlin",
        "bundesland": "Berlin",
        "mietpreisgebiet": "angespannt",
        "gesamt_avg": 2.45,
        "gesamt_min": 1.80,
        "gesamt_max": 3.20,
        "kategorien": {
            "grundsteuer": {"avg": 0.20, "min": 0.12, "max": 0.35},
            "wasser_abwasser": {"avg": 0.35, "min": 0.20, "max": 0.55},
            "heizung": {"avg": 0.85, "min": 0.50, "max": 1.40},
            "aufzug": {"avg": 0.18, "min": 0.10, "max": 0.30},
            "strassenreinigung": {"avg": 0.04, "min": 0.02, "max": 0.08},
            "muellabfuhr": {"avg": 0.18, "min": 0.10, "max": 0.28},
            "gebaeudereinigung": {"avg": 0.12, "min": 0.06, "max": 0.20},
            "gartenpflege": {"avg": 0.08, "min": 0.03, "max": 0.15},
            "beleuchtung": {"avg": 0.05, "min": 0.02, "max": 0.09},
            "haftpflicht": {"avg": 0.16, "min": 0.08, "max": 0.25},
            "hausmeister": {"avg": 0.16, "min": 0.08, "max": 0.28},
            "sonstiges": {"avg": 0.08, "min": 0.03, "max": 0.15},
        },
    },
    "hamburg": {
        "label": "Hamburg",
        "bundesland": "Hamburg",
        "mietpreisgebiet": "angespannt",
        "gesamt_avg": 2.38,
        "gesamt_min": 1.75,
        "gesamt_max": 3.10,
        "kategorien": {
            "grundsteuer": {"avg": 0.18, "min": 0.10, "max": 0.30},
            "wasser_abwasser": {"avg": 0.38, "min": 0.22, "max": 0.58},
            "heizung": {"avg": 0.82, "min": 0.48, "max": 1.35},
            "aufzug": {"avg": 0.17, "min": 0.09, "max": 0.28},
            "strassenreinigung": {"avg": 0.05, "min": 0.02, "max": 0.09},
            "muellabfuhr": {"avg": 0.16, "min": 0.09, "max": 0.26},
            "gebaeudereinigung": {"avg": 0.11, "min": 0.05, "max": 0.18},
            "gartenpflege": {"avg": 0.07, "min": 0.03, "max": 0.13},
            "beleuchtung": {"avg": 0.05, "min": 0.02, "max": 0.08},
            "haftpflicht": {"avg": 0.15, "min": 0.07, "max": 0.24},
            "hausmeister": {"avg": 0.15, "min": 0.07, "max": 0.26},
            "sonstiges": {"avg": 0.07, "min": 0.03, "max": 0.14},
        },
    },
    "muenchen": {
        "label": "München",
        "bundesland": "Bayern",
        "mietpreisgebiet": "angespannt",
        "gesamt_avg": 2.62,
        "gesamt_min": 1.95,
        "gesamt_max": 3.45,
        "kategorien": {
            "grundsteuer": {"avg": 0.14, "min": 0.08, "max": 0.22},
            "wasser_abwasser": {"avg": 0.32, "min": 0.18, "max": 0.50},
            "heizung": {"avg": 1.00, "min": 0.60, "max": 1.55},
            "aufzug": {"avg": 0.20, "min": 0.11, "max": 0.32},
            "strassenreinigung": {"avg": 0.04, "min": 0.02, "max": 0.07},
            "muellabfuhr": {"avg": 0.20, "min": 0.11, "max": 0.32},
            "gebaeudereinigung": {"avg": 0.14, "min": 0.07, "max": 0.22},
            "gartenpflege": {"avg": 0.09, "min": 0.04, "max": 0.17},
            "beleuchtung": {"avg": 0.05, "min": 0.02, "max": 0.09},
            "haftpflicht": {"avg": 0.18, "min": 0.09, "max": 0.28},
            "hausmeister": {"avg": 0.18, "min": 0.09, "max": 0.30},
            "sonstiges": {"avg": 0.08, "min": 0.03, "max": 0.16},
        },
    },
    "koeln": {
        "label": "Köln",
        "bundesland": "Nordrhein-Westfalen",
        "mietpreisgebiet": "angespannt",
        "gesamt_avg": 2.28,
        "gesamt_min": 1.65,
        "gesamt_max": 3.00,
        "kategorien": {
            "grundsteuer": {"avg": 0.22, "min": 0.13, "max": 0.38},
            "wasser_abwasser": {"avg": 0.34, "min": 0.19, "max": 0.52},
            "heizung": {"avg": 0.78, "min": 0.45, "max": 1.25},
            "aufzug": {"avg": 0.15, "min": 0.08, "max": 0.25},
            "strassenreinigung": {"avg": 0.04, "min": 0.02, "max": 0.07},
            "muellabfuhr": {"avg": 0.15, "min": 0.08, "max": 0.24},
            "gebaeudereinigung": {"avg": 0.10, "min": 0.05, "max": 0.17},
            "gartenpflege": {"avg": 0.07, "min": 0.03, "max": 0.13},
            "beleuchtung": {"avg": 0.04, "min": 0.02, "max": 0.07},
            "haftpflicht": {"avg": 0.14, "min": 0.07, "max": 0.22},
            "hausmeister": {"avg": 0.14, "min": 0.07, "max": 0.24},
            "sonstiges": {"avg": 0.07, "min": 0.03, "max": 0.13},
        },
    },
    "frankfurt": {
        "label": "Frankfurt am Main",
        "bundesland": "Hessen",
        "mietpreisgebiet": "angespannt",
        "gesamt_avg": 2.35,
        "gesamt_min": 1.70,
        "gesamt_max": 3.08,
        "kategorien": {
            "grundsteuer": {"avg": 0.19, "min": 0.11, "max": 0.32},
            "wasser_abwasser": {"avg": 0.36, "min": 0.21, "max": 0.55},
            "heizung": {"avg": 0.80, "min": 0.47, "max": 1.30},
            "aufzug": {"avg": 0.16, "min": 0.09, "max": 0.27},
            "strassenreinigung": {"avg": 0.04, "min": 0.02, "max": 0.07},
            "muellabfuhr": {"avg": 0.16, "min": 0.09, "max": 0.26},
            "gebaeudereinigung": {"avg": 0.11, "min": 0.05, "max": 0.18},
            "gartenpflege": {"avg": 0.07, "min": 0.03, "max": 0.13},
            "beleuchtung": {"avg": 0.04, "min": 0.02, "max": 0.08},
            "haftpflicht": {"avg": 0.15, "min": 0.07, "max": 0.24},
            "hausmeister": {"avg": 0.15, "min": 0.07, "max": 0.26},
            "sonstiges": {"avg": 0.07, "min": 0.03, "max": 0.14},
        },
    },
    "stuttgart": {
        "label": "Stuttgart",
        "bundesland": "Baden-Württemberg",
        "mietpreisgebiet": "angespannt",
        "gesamt_avg": 2.30,
        "gesamt_min": 1.68,
        "gesamt_max": 3.02,
        "kategorien": {
            "grundsteuer": {"avg": 0.16, "min": 0.09, "max": 0.27},
            "wasser_abwasser": {"avg": 0.33, "min": 0.19, "max": 0.51},
            "heizung": {"avg": 0.82, "min": 0.49, "max": 1.32},
            "aufzug": {"avg": 0.15, "min": 0.08, "max": 0.25},
            "strassenreinigung": {"avg": 0.04, "min": 0.02, "max": 0.07},
            "muellabfuhr": {"avg": 0.15, "min": 0.08, "max": 0.24},
            "gebaeudereinigung": {"avg": 0.11, "min": 0.05, "max": 0.18},
            "gartenpflege": {"avg": 0.08, "min": 0.03, "max": 0.14},
            "beleuchtung": {"avg": 0.04, "min": 0.02, "max": 0.07},
            "haftpflicht": {"avg": 0.14, "min": 0.07, "max": 0.23},
            "hausmeister": {"avg": 0.15, "min": 0.07, "max": 0.25},
            "sonstiges": {"avg": 0.07, "min": 0.03, "max": 0.13},
        },
    },
    "duesseldorf": {
        "label": "Düsseldorf",
        "bundesland": "Nordrhein-Westfalen",
        "mietpreisgebiet": "angespannt",
        "gesamt_avg": 2.22,
        "gesamt_min": 1.60,
        "gesamt_max": 2.95,
        "kategorien": {
            "grundsteuer": {"avg": 0.21, "min": 0.12, "max": 0.36},
            "wasser_abwasser": {"avg": 0.32, "min": 0.18, "max": 0.50},
            "heizung": {"avg": 0.75, "min": 0.44, "max": 1.20},
            "aufzug": {"avg": 0.14, "min": 0.07, "max": 0.24},
            "strassenreinigung": {"avg": 0.04, "min": 0.02, "max": 0.07},
            "muellabfuhr": {"avg": 0.14, "min": 0.07, "max": 0.22},
            "gebaeudereinigung": {"avg": 0.10, "min": 0.05, "max": 0.16},
            "gartenpflege": {"avg": 0.07, "min": 0.03, "max": 0.12},
            "beleuchtung": {"avg": 0.04, "min": 0.02, "max": 0.07},
            "haftpflicht": {"avg": 0.14, "min": 0.07, "max": 0.22},
            "hausmeister": {"avg": 0.14, "min": 0.07, "max": 0.23},
            "sonstiges": {"avg": 0.06, "min": 0.02, "max": 0.12},
        },
    },
    "leipzig": {
        "label": "Leipzig",
        "bundesland": "Sachsen",
        "mietpreisgebiet": "normal",
        "gesamt_avg": 1.95,
        "gesamt_min": 1.35,
        "gesamt_max": 2.60,
        "kategorien": {
            "grundsteuer": {"avg": 0.18, "min": 0.10, "max": 0.30},
            "wasser_abwasser": {"avg": 0.38, "min": 0.22, "max": 0.58},
            "heizung": {"avg": 0.72, "min": 0.42, "max": 1.15},
            "aufzug": {"avg": 0.12, "min": 0.06, "max": 0.20},
            "strassenreinigung": {"avg": 0.03, "min": 0.01, "max": 0.06},
            "muellabfuhr": {"avg": 0.13, "min": 0.06, "max": 0.20},
            "gebaeudereinigung": {"avg": 0.09, "min": 0.04, "max": 0.15},
            "gartenpflege": {"avg": 0.06, "min": 0.02, "max": 0.11},
            "beleuchtung": {"avg": 0.04, "min": 0.02, "max": 0.07},
            "haftpflicht": {"avg": 0.12, "min": 0.06, "max": 0.19},
            "hausmeister": {"avg": 0.12, "min": 0.06, "max": 0.20},
            "sonstiges": {"avg": 0.06, "min": 0.02, "max": 0.11},
        },
    },
    "dresden": {
        "label": "Dresden",
        "bundesland": "Sachsen",
        "mietpreisgebiet": "normal",
        "gesamt_avg": 1.98,
        "gesamt_min": 1.38,
        "gesamt_max": 2.65,
        "kategorien": {
            "grundsteuer": {"avg": 0.17, "min": 0.09, "max": 0.28},
            "wasser_abwasser": {"avg": 0.36, "min": 0.20, "max": 0.56},
            "heizung": {"avg": 0.74, "min": 0.43, "max": 1.18},
            "aufzug": {"avg": 0.12, "min": 0.06, "max": 0.20},
            "strassenreinigung": {"avg": 0.03, "min": 0.01, "max": 0.06},
            "muellabfuhr": {"avg": 0.13, "min": 0.07, "max": 0.21},
            "gebaeudereinigung": {"avg": 0.09, "min": 0.04, "max": 0.15},
            "gartenpflege": {"avg": 0.06, "min": 0.02, "max": 0.11},
            "beleuchtung": {"avg": 0.04, "min": 0.02, "max": 0.07},
            "haftpflicht": {"avg": 0.12, "min": 0.06, "max": 0.19},
            "hausmeister": {"avg": 0.12, "min": 0.06, "max": 0.20},
            "sonstiges": {"avg": 0.06, "min": 0.02, "max": 0.11},
        },
    },
    "nuernberg": {
        "label": "Nürnberg",
        "bundesland": "Bayern",
        "mietpreisgebiet": "normal",
        "gesamt_avg": 2.10,
        "gesamt_min": 1.50,
        "gesamt_max": 2.80,
        "kategorien": {
            "grundsteuer": {"avg": 0.18, "min": 0.10, "max": 0.30},
            "wasser_abwasser": {"avg": 0.34, "min": 0.19, "max": 0.52},
            "heizung": {"avg": 0.78, "min": 0.46, "max": 1.25},
            "aufzug": {"avg": 0.14, "min": 0.07, "max": 0.23},
            "strassenreinigung": {"avg": 0.04, "min": 0.02, "max": 0.07},
            "muellabfuhr": {"avg": 0.15, "min": 0.08, "max": 0.24},
            "gebaeudereinigung": {"avg": 0.10, "min": 0.05, "max": 0.16},
            "gartenpflege": {"avg": 0.07, "min": 0.03, "max": 0.12},
            "beleuchtung": {"avg": 0.04, "min": 0.02, "max": 0.07},
            "haftpflicht": {"avg": 0.13, "min": 0.06, "max": 0.21},
            "hausmeister": {"avg": 0.13, "min": 0.06, "max": 0.22},
            "sonstiges": {"avg": 0.07, "min": 0.03, "max": 0.13},
        },
    },
    "hannover": {
        "label": "Hannover",
        "bundesland": "Niedersachsen",
        "mietpreisgebiet": "normal",
        "gesamt_avg": 2.05,
        "gesamt_min": 1.45,
        "gesamt_max": 2.75,
        "kategorien": {
            "grundsteuer": {"avg": 0.19, "min": 0.11, "max": 0.32},
            "wasser_abwasser": {"avg": 0.35, "min": 0.20, "max": 0.53},
            "heizung": {"avg": 0.75, "min": 0.44, "max": 1.20},
            "aufzug": {"avg": 0.13, "min": 0.07, "max": 0.22},
            "strassenreinigung": {"avg": 0.04, "min": 0.02, "max": 0.07},
            "muellabfuhr": {"avg": 0.14, "min": 0.07, "max": 0.22},
            "gebaeudereinigung": {"avg": 0.10, "min": 0.05, "max": 0.16},
            "gartenpflege": {"avg": 0.07, "min": 0.03, "max": 0.12},
            "beleuchtung": {"avg": 0.04, "min": 0.02, "max": 0.07},
            "haftpflicht": {"avg": 0.13, "min": 0.06, "max": 0.21},
            "hausmeister": {"avg": 0.13, "min": 0.06, "max": 0.22},
            "sonstiges": {"avg": 0.06, "min": 0.02, "max": 0.12},
        },
    },
    "bundesweit": {
        "label": "Bundesweit (Durchschnitt)",
        "bundesland": "Deutschland",
        "mietpreisgebiet": "normal",
        "gesamt_avg": 2.17,
        "gesamt_min": 1.20,
        "gesamt_max": 3.50,
        "kategorien": {
            "grundsteuer": {"avg": 0.17, "min": 0.08, "max": 0.40},
            "wasser_abwasser": {"avg": 0.34, "min": 0.15, "max": 0.60},
            "heizung": {"avg": 0.79, "min": 0.40, "max": 1.60},
            "aufzug": {"avg": 0.15, "min": 0.05, "max": 0.35},
            "strassenreinigung": {"avg": 0.04, "min": 0.01, "max": 0.10},
            "muellabfuhr": {"avg": 0.14, "min": 0.06, "max": 0.30},
            "gebaeudereinigung": {"avg": 0.10, "min": 0.03, "max": 0.22},
            "gartenpflege": {"avg": 0.07, "min": 0.02, "max": 0.18},
            "beleuchtung": {"avg": 0.04, "min": 0.01, "max": 0.10},
            "haftpflicht": {"avg": 0.14, "min": 0.05, "max": 0.28},
            "hausmeister": {"avg": 0.14, "min": 0.05, "max": 0.30},
            "sonstiges": {"avg": 0.07, "min": 0.02, "max": 0.18},
        },
    },
}

KATEGORIE_LABELS = {
    "grundsteuer": "Grundsteuer",
    "wasser_abwasser": "Wasser & Abwasser",
    "heizung": "Heizung & Warmwasser",
    "aufzug": "Aufzug",
    "strassenreinigung": "Straßenreinigung",
    "muellabfuhr": "Müllabfuhr",
    "gebaeudereinigung": "Gebäudereinigung",
    "gartenpflege": "Gartenpflege",
    "beleuchtung": "Beleuchtung",
    "haftpflicht": "Sach- & Haftpflichtversicherung",
    "hausmeister": "Hausmeister",
    "sonstiges": "Sonstige Betriebskosten",
}


@router.get("/staedte")
async def list_cities():
    """Returns list of available cities with basic info."""
    return [
        {
            "key": key,
            "label": data["label"],
            "bundesland": data["bundesland"],
            "mietpreisgebiet": data["mietpreisgebiet"],
            "gesamt_avg": data["gesamt_avg"],
        }
        for key, data in BETRIEBSKOSTENSPIEGEL.items()
    ]


@router.get("/vergleich")
async def get_vergleich(
    stadt: str = Query("bundesweit"),
    eigene_kosten_qm: Optional[float] = Query(None, description="Eigene Kosten in €/m²/Monat"),
):
    """
    Returns detailed cost benchmark for a city.
    If eigene_kosten_qm provided, adds comparison (over/under avg).
    """
    data = BETRIEBSKOSTENSPIEGEL.get(stadt, BETRIEBSKOSTENSPIEGEL["bundesweit"])

    kategorien = [
        {
            "key": key,
            "label": KATEGORIE_LABELS.get(key, key),
            "avg": vals["avg"],
            "min": vals["min"],
            "max": vals["max"],
        }
        for key, vals in data["kategorien"].items()
    ]

    result = {
        "stadt": stadt,
        "label": data["label"],
        "bundesland": data["bundesland"],
        "mietpreisgebiet": data["mietpreisgebiet"],
        "gesamt_avg": data["gesamt_avg"],
        "gesamt_min": data["gesamt_min"],
        "gesamt_max": data["gesamt_max"],
        "kategorien": kategorien,
        "hinweis": "Quelle: DMB Betriebskostenspiegel 2023 / co2online Heizspiegel. Stand: Abrechnungsjahr 2022.",
    }

    if eigene_kosten_qm is not None:
        abweichung = eigene_kosten_qm - data["gesamt_avg"]
        abweichung_prozent = (abweichung / data["gesamt_avg"]) * 100
        result["vergleich"] = {
            "eigene_kosten": eigene_kosten_qm,
            "abweichung": round(abweichung, 2),
            "abweichung_prozent": round(abweichung_prozent, 1),
            "bewertung": (
                "deutlich_unter" if abweichung_prozent < -20 else
                "unter" if abweichung_prozent < -5 else
                "durchschnitt" if abs(abweichung_prozent) <= 5 else
                "ueber" if abweichung_prozent < 20 else
                "deutlich_ueber"
            ),
        }

    return result
