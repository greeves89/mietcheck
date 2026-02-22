"""
Mietpreisbremse-Check gemäß §556d BGB
Prüft ob die Grundmiete die ortsübliche Vergleichsmiete um mehr als 10% übersteigt.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from decimal import Decimal

from app.models.user import User
from app.core.auth import get_current_user

router = APIRouter(prefix="/mietpreisbremse", tags=["mietpreisbremse"])

# Statische Mietspiegel-Vergleichswerte (€/m² Kaltmiete, Durchschnitt 2024/2025)
# In production: use real Mietspiegel database
CITY_RENTS: dict[str, dict] = {
    "berlin": {"label": "Berlin", "avg_rent_sqm": 14.50, "has_mietpreisbremse": True},
    "münchen": {"label": "München", "avg_rent_sqm": 21.50, "has_mietpreisbremse": True},
    "hamburg": {"label": "Hamburg", "avg_rent_sqm": 14.00, "has_mietpreisbremse": True},
    "frankfurt": {"label": "Frankfurt am Main", "avg_rent_sqm": 15.50, "has_mietpreisbremse": True},
    "köln": {"label": "Köln", "avg_rent_sqm": 12.50, "has_mietpreisbremse": True},
    "düsseldorf": {"label": "Düsseldorf", "avg_rent_sqm": 12.00, "has_mietpreisbremse": True},
    "stuttgart": {"label": "Stuttgart", "avg_rent_sqm": 14.50, "has_mietpreisbremse": True},
    "leipzig": {"label": "Leipzig", "avg_rent_sqm": 9.50, "has_mietpreisbremse": True},
    "dresden": {"label": "Dresden", "avg_rent_sqm": 9.00, "has_mietpreisbremse": True},
    "hannover": {"label": "Hannover", "avg_rent_sqm": 10.00, "has_mietpreisbremse": True},
    "nürnberg": {"label": "Nürnberg", "avg_rent_sqm": 11.50, "has_mietpreisbremse": True},
    "bonn": {"label": "Bonn", "avg_rent_sqm": 12.50, "has_mietpreisbremse": True},
    "mannheim": {"label": "Mannheim", "avg_rent_sqm": 10.50, "has_mietpreisbremse": True},
    "karlsruhe": {"label": "Karlsruhe", "avg_rent_sqm": 11.00, "has_mietpreisbremse": True},
    "augsburg": {"label": "Augsburg", "avg_rent_sqm": 12.00, "has_mietpreisbremse": True},
    "freiburg": {"label": "Freiburg im Breisgau", "avg_rent_sqm": 13.50, "has_mietpreisbremse": True},
    "kiel": {"label": "Kiel", "avg_rent_sqm": 9.50, "has_mietpreisbremse": True},
    "mainz": {"label": "Mainz", "avg_rent_sqm": 12.50, "has_mietpreisbremse": True},
    "wiesbaden": {"label": "Wiesbaden", "avg_rent_sqm": 12.00, "has_mietpreisbremse": True},
    "regensburg": {"label": "Regensburg", "avg_rent_sqm": 12.00, "has_mietpreisbremse": True},
}

# Adjustment factors for floor, year of construction, furnishing
YEAR_ADJUSTMENTS = {
    "before_1960": -2.0,
    "1960_1979": -1.0,
    "1980_1999": 0.0,
    "2000_2009": 1.0,
    "after_2010": 2.0,
}


class MietpreisbremseRequest(BaseModel):
    city: str  # e.g. "berlin"
    apartment_size_sqm: float
    current_monthly_rent: float  # Kaltmiete
    construction_year: Optional[str] = None  # e.g. "1980_1999"
    is_furnished: bool = False
    is_modernized: bool = False  # Umfassende Modernisierung nach §556f


class MietpreisbremseResult(BaseModel):
    city_label: str
    has_mietpreisbremse: bool
    apartment_size_sqm: float
    current_rent_sqm: float
    reference_rent_sqm: float
    max_allowed_rent_sqm: float  # Vergleichsmiete + 10%
    current_monthly_rent: float
    max_allowed_monthly_rent: float
    overpayment_monthly: float
    overpayment_yearly: float
    exceeds_limit: bool
    percent_over_limit: float
    is_exempt: bool  # Ausnahmen: Neubau, Modernisierung
    exempt_reason: Optional[str]
    legal_basis: str
    recommendation: str
    cities_available: list


@router.get("/cities")
async def list_cities():
    """Return all cities with available rent data."""
    return [
        {"key": k, "label": v["label"], "avg_rent_sqm": v["avg_rent_sqm"], "has_mietpreisbremse": v["has_mietpreisbremse"]}
        for k, v in CITY_RENTS.items()
    ]


@router.post("/check", response_model=MietpreisbremseResult)
async def check_mietpreisbremse(
    data: MietpreisbremseRequest,
    current_user: User = Depends(get_current_user),
):
    city_key = data.city.lower().strip()
    if city_key not in CITY_RENTS:
        raise HTTPException(
            status_code=400,
            detail=f"Stadt '{data.city}' nicht in unserer Datenbank. Verfügbare Städte: {', '.join(CITY_RENTS.keys())}"
        )

    city_data = CITY_RENTS[city_key]

    # Calculate reference rent with adjustments
    base_rent_sqm = city_data["avg_rent_sqm"]
    adjustment = 0.0

    if data.construction_year and data.construction_year in YEAR_ADJUSTMENTS:
        adjustment += YEAR_ADJUSTMENTS[data.construction_year]

    if data.is_furnished:
        adjustment += 1.5

    reference_rent_sqm = max(base_rent_sqm + adjustment, 4.0)

    # Max allowed = Vergleichsmiete + 10%
    max_allowed_sqm = reference_rent_sqm * 1.10

    current_rent_sqm = data.current_monthly_rent / data.apartment_size_sqm
    max_allowed_monthly = max_allowed_sqm * data.apartment_size_sqm

    overpayment_monthly = max(data.current_monthly_rent - max_allowed_monthly, 0)
    overpayment_yearly = overpayment_monthly * 12

    exceeds_limit = current_rent_sqm > max_allowed_sqm
    percent_over = ((current_rent_sqm - max_allowed_sqm) / max_allowed_sqm * 100) if exceeds_limit else 0.0

    # Check exemptions §556f BGB
    is_exempt = False
    exempt_reason = None

    if data.is_modernized:
        is_exempt = True
        exempt_reason = "Umfassende Modernisierung nach §556f BGB – Mietpreisbremse gilt nicht für modernisierte Wohnungen"

    # Recommendation
    if not city_data["has_mietpreisbremse"]:
        recommendation = "In Ihrer Stadt gilt keine Mietpreisbremse gemäß §556d BGB."
    elif is_exempt:
        recommendation = f"Die Wohnung ist von der Mietpreisbremse ausgenommen. {exempt_reason}"
    elif exceeds_limit:
        recommendation = (
            f"Ihre Miete übersteigt die zulässige Höchstmiete um {percent_over:.1f}% ({overpayment_monthly:.2f}€/Monat). "
            f"Sie können die Miete schriftlich rügen und die Rückzahlung zu viel gezahlter Miete verlangen "
            f"(§556g BGB, rückwirkend ab Rüge). Wenden Sie sich an einen Mieterverein."
        )
    else:
        recommendation = "Ihre Miete liegt innerhalb der gesetzlichen Grenzen der Mietpreisbremse. Kein Handlungsbedarf."

    return MietpreisbremseResult(
        city_label=city_data["label"],
        has_mietpreisbremse=city_data["has_mietpreisbremse"],
        apartment_size_sqm=data.apartment_size_sqm,
        current_rent_sqm=round(current_rent_sqm, 2),
        reference_rent_sqm=round(reference_rent_sqm, 2),
        max_allowed_rent_sqm=round(max_allowed_sqm, 2),
        current_monthly_rent=data.current_monthly_rent,
        max_allowed_monthly_rent=round(max_allowed_monthly, 2),
        overpayment_monthly=round(overpayment_monthly, 2),
        overpayment_yearly=round(overpayment_yearly, 2),
        exceeds_limit=exceeds_limit,
        percent_over_limit=round(percent_over, 1),
        is_exempt=is_exempt,
        exempt_reason=exempt_reason,
        legal_basis="§556d–§556g BGB (Mietrechtsnovellierungsgesetz 2015)",
        recommendation=recommendation,
        cities_available=list(CITY_RENTS.keys()),
    )
