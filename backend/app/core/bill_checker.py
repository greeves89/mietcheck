"""
Core bill checking logic for Nebenkostenabrechnung.
Implements 5 check types: math, deadline, plausibility, legal, completeness.
"""
from decimal import Decimal
from datetime import date, timedelta
from typing import List, Tuple
from app.models.utility_bill import UtilityBill
from app.models.bill_position import BillPosition
from app.models.rental_contract import RentalContract


# DMB Betriebskostenspiegel 2023 (€/m²/year)
REFERENCE_VALUES = {
    "heating": {"low": 5.50, "high": 14.00},
    "hot_water": {"low": 1.50, "high": 4.00},
    "water_sewage": {"low": 2.00, "high": 4.50},
    "garbage": {"low": 0.80, "high": 2.50},
    "building_insurance": {"low": 0.50, "high": 1.80},
    "liability_insurance": {"low": 0.10, "high": 0.40},
    "elevator": {"low": 0.80, "high": 2.50},
    "garden": {"low": 0.50, "high": 1.80},
    "cleaning": {"low": 0.50, "high": 2.20},
    "caretaker": {"low": 0.80, "high": 3.50},
    "cable_tv": {"low": 0.50, "high": 1.50},
    "building_lighting": {"low": 0.20, "high": 0.80},
}

# Categories that are NOT legally billable as Nebenkosten
ILLEGAL_CATEGORIES = {
    "bank_fees": "Bankgebühren sind keine umlegbaren Betriebskosten",
    "management_fees": "Verwaltungskosten sind nicht umlagefähig (§ 1 Abs. 2 BetrKV)",
    "repair": "Reparaturkosten sind Instandhaltung und nicht umlagefähig",
    "legal_fees": "Anwalts- und Gerichtskosten sind nicht umlegbar",
    "vacancy_costs": "Leerstandskosten dürfen nicht auf Mieter umgelegt werden",
}

CheckItem = Tuple[str, str, str, str, str]  # (check_type, severity, title, description, recommendation)


def check_math(
    bill: UtilityBill,
    positions: List[BillPosition],
) -> List[CheckItem]:
    """Verify mathematical correctness of all positions and totals."""
    results = []

    for pos in positions:
        if pos.tenant_share_percent is not None and pos.total_amount is not None and pos.tenant_amount is not None:
            expected = (pos.total_amount * pos.tenant_share_percent / Decimal("100")).quantize(Decimal("0.01"))
            actual = pos.tenant_amount.quantize(Decimal("0.01"))
            diff = abs(expected - actual)

            if diff > Decimal("0.05"):  # Allow 5 cent rounding tolerance
                results.append((
                    "math",
                    "error",
                    f"Rechenfehler: {pos.name}",
                    f"Der Anteil von {pos.tenant_share_percent}% von {pos.total_amount}€ ergibt {expected}€, "
                    f"aber abgerechnet wurden {actual}€ (Differenz: {diff}€).",
                    "Prüfen Sie diese Position genau und fordern Sie eine Korrektur.",
                ))

    # Check sum of positions vs total
    if bill.total_costs is not None and positions:
        sum_tenant_amounts = sum(
            (pos.tenant_amount or Decimal("0")) for pos in positions
        )
        diff = abs(sum_tenant_amounts - bill.total_costs)
        if diff > Decimal("1.00"):
            results.append((
                "math",
                "warning",
                "Summendifferenz",
                f"Die Summe der Einzelpositionen ({sum_tenant_amounts:.2f}€) weicht vom "
                f"Gesamtbetrag ({bill.total_costs:.2f}€) um {diff:.2f}€ ab.",
                "Bitten Sie den Vermieter um eine aufgeschlüsselte Abrechnung.",
            ))

    if not results:
        results.append((
            "math",
            "ok",
            "Rechnerische Prüfung bestanden",
            "Alle Berechnungen sind mathematisch korrekt.",
            None,
        ))

    return results


def check_deadline(bill: UtilityBill) -> List[CheckItem]:
    """Check § 556 BGB: bill must be received within 12 months after billing period end."""
    if bill.received_date is None:
        return [(
            "deadline",
            "warning",
            "Zugangsdatum unbekannt",
            "Das Datum des Zugangs der Abrechnung wurde nicht angegeben. "
            "Bitte nachtragen, um die Frist zu prüfen.",
            "Tragen Sie das Datum nach, an dem Sie die Abrechnung erhalten haben.",
        )]

    deadline = date(
        bill.billing_period_end.year + 1,
        bill.billing_period_end.month,
        bill.billing_period_end.day,
    )
    # Handle leap year edge case
    try:
        deadline = bill.billing_period_end.replace(year=bill.billing_period_end.year + 1)
    except ValueError:
        # Feb 29 -> Feb 28 next year
        deadline = bill.billing_period_end.replace(year=bill.billing_period_end.year + 1, day=28)

    days_late = (bill.received_date - deadline).days

    if days_late > 0:
        return [(
            "deadline",
            "error",
            f"Abrechnungsfrist überschritten ({days_late} Tage zu spät)",
            f"Die Abrechnung muss spätestens am {deadline.strftime('%d.%m.%Y')} zugegangen sein "
            f"(12 Monate nach Ende des Abrechnungszeitraums, § 556 Abs. 3 BGB). "
            f"Sie haben die Abrechnung erst am {bill.received_date.strftime('%d.%m.%Y')} erhalten.",
            "Sie müssen keine Nachzahlung leisten! Legen Sie unverzüglich schriftlich Widerspruch ein "
            "und fordern Sie die Rückerstattung eventueller Vorauszahlungen.",
        )]

    days_until_deadline = (deadline - bill.received_date).days
    if days_until_deadline < 30:
        return [(
            "deadline",
            "warning",
            f"Frist knapp eingehalten (noch {days_until_deadline} Tage)",
            f"Die Abrechnung wurde gerade noch rechtzeitig zugestellt. "
            f"Die Frist lief am {deadline.strftime('%d.%m.%Y')} ab.",
            None,
        )]

    return [(
        "deadline",
        "ok",
        "Abrechnungsfrist eingehalten",
        f"Die Abrechnung wurde fristgerecht zugestellt "
        f"(Frist: {deadline.strftime('%d.%m.%Y')}, erhalten: {bill.received_date.strftime('%d.%m.%Y')}).",
        None,
    )]


def check_plausibility(
    positions: List[BillPosition],
    contract: RentalContract,
) -> List[CheckItem]:
    """Compare costs against DMB Betriebskostenspiegel reference values."""
    results = []
    sqm = float(contract.apartment_size_sqm)

    for pos in positions:
        if pos.category not in REFERENCE_VALUES:
            continue
        if pos.tenant_amount is None or sqm <= 0:
            continue

        ref = REFERENCE_VALUES[pos.category]
        cost_per_sqm = float(pos.tenant_amount) / sqm  # per year

        # Annotate position
        pos.reference_value_low = Decimal(str(ref["low"]))
        pos.reference_value_high = Decimal(str(ref["high"]))

        if cost_per_sqm > ref["high"] * 1.5:
            pos.is_plausible = False
            results.append((
                "plausibility",
                "error",
                f"Ungewöhnlich hohe Kosten: {pos.name}",
                f"Der Anteil beträgt {cost_per_sqm:.2f} €/m²/Jahr. "
                f"Der Betriebskostenspiegel 2023 gibt {ref['low']:.2f}–{ref['high']:.2f} €/m²/Jahr an. "
                f"Ihr Wert liegt {((cost_per_sqm/ref['high'])-1)*100:.0f}% über dem Höchstwert.",
                "Fordern Sie eine detaillierte Aufschlüsselung dieser Position vom Vermieter.",
            ))
        elif cost_per_sqm > ref["high"]:
            pos.is_plausible = False
            results.append((
                "plausibility",
                "warning",
                f"Hohe Kosten: {pos.name}",
                f"Der Anteil beträgt {cost_per_sqm:.2f} €/m²/Jahr. "
                f"Der Richtwert liegt bei {ref['low']:.2f}–{ref['high']:.2f} €/m²/Jahr.",
                "Vergleichen Sie mit ähnlichen Objekten in Ihrer Stadt.",
            ))
        else:
            pos.is_plausible = True

    if not any(r[1] in ("error", "warning") for r in results):
        results.append((
            "plausibility",
            "ok",
            "Kosten im Normbereich",
            "Alle geprüften Positionen liegen im Bereich des DMB Betriebskostenspiegels 2023.",
            None,
        ))

    return results


def check_legal(positions: List[BillPosition]) -> List[CheckItem]:
    """Flag positions that are not legally billable as Nebenkosten."""
    results = []

    for pos in positions:
        if pos.category in ILLEGAL_CATEGORIES:
            pos.is_allowed = False
            results.append((
                "legal",
                "error",
                f"Unzulässige Position: {pos.name}",
                ILLEGAL_CATEGORIES[pos.category],
                "Widersprechen Sie dieser Position schriftlich. Sie müssen diesen Betrag nicht zahlen.",
            ))

    if not results:
        results.append((
            "legal",
            "ok",
            "Keine unzulässigen Positionen",
            "Alle abgerechneten Positionen sind dem Grunde nach umlagefähig.",
            None,
        ))

    return results


def check_completeness(
    positions: List[BillPosition],
    contract: RentalContract,
    bill: UtilityBill,
) -> List[CheckItem]:
    """Check for missing required positions."""
    results = []
    categories = {pos.category for pos in positions}

    # Heating should be present if central heating
    if contract.heating_type == "central" and "heating" not in categories:
        results.append((
            "completeness",
            "warning",
            "Heizkosten fehlen",
            "Laut Mietverhältnis haben Sie eine Zentralheizung, aber die Abrechnung enthält keine Heizkosten.",
            "Fragen Sie den Vermieter, warum Heizkosten nicht separat abgerechnet werden.",
        ))

    # Water/sewage almost always required
    if "water_sewage" not in categories and len(positions) > 0:
        results.append((
            "completeness",
            "warning",
            "Wasser/Abwasser nicht separat ausgewiesen",
            "Wasser- und Abwasserkosten werden typischerweise separat ausgewiesen.",
            None,
        ))

    if not results:
        results.append((
            "completeness",
            "ok",
            "Vollständigkeit geprüft",
            "Die Abrechnung enthält alle erwarteten Positionen.",
            None,
        ))

    return results


def calculate_score(all_results: List[CheckItem]) -> int:
    """Calculate a 0-100 score based on check results."""
    if not all_results:
        return 100

    errors = sum(1 for r in all_results if r[1] == "error")
    warnings = sum(1 for r in all_results if r[1] == "warning")

    # Start at 100, deduct for issues
    score = 100
    score -= errors * 20
    score -= warnings * 5
    return max(0, min(100, score))


def run_all_checks(
    bill: UtilityBill,
    positions: List[BillPosition],
    contract: RentalContract,
) -> Tuple[List[CheckItem], int]:
    """Run all checks and return results with score."""
    all_results: List[CheckItem] = []

    all_results.extend(check_math(bill, positions))
    all_results.extend(check_deadline(bill))
    all_results.extend(check_plausibility(positions, contract))
    all_results.extend(check_legal(positions))
    all_results.extend(check_completeness(positions, contract, bill))

    score = calculate_score(all_results)
    return all_results, score
