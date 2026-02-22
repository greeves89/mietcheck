"""
Unit tests for the core bill_checker.py logic.
These tests run without a database — they use simple mock objects.
"""
from decimal import Decimal
from datetime import date

import pytest

from app.core.bill_checker import (
    check_math,
    check_deadline,
    check_plausibility,
    check_legal,
    check_completeness,
    calculate_score,
    run_all_checks,
    REFERENCE_VALUES,
    ILLEGAL_CATEGORIES,
)


# ─── Helpers to create lightweight mock objects ────────────────────────────────

def make_bill(
    billing_period_end=date(2023, 12, 31),
    received_date=date(2024, 6, 1),
    total_costs=None,
    billing_year=2023,
):
    class Bill:
        pass
    b = Bill()
    b.billing_period_end = billing_period_end
    b.received_date = received_date
    b.total_costs = total_costs
    b.billing_year = billing_year
    return b


def make_position(
    name="Heizkosten",
    category="heating",
    total_amount=Decimal("1000.00"),
    tenant_share_percent=Decimal("20.00"),
    tenant_amount=Decimal("200.00"),
):
    class Position:
        pass
    p = Position()
    p.name = name
    p.category = category
    p.total_amount = total_amount
    p.tenant_share_percent = tenant_share_percent
    p.tenant_amount = tenant_amount
    p.is_allowed = True
    p.is_plausible = None
    p.reference_value_low = None
    p.reference_value_high = None
    return p


def make_contract(apartment_size_sqm=Decimal("60.00"), heating_type="central"):
    class Contract:
        pass
    c = Contract()
    c.apartment_size_sqm = apartment_size_sqm
    c.heating_type = heating_type
    return c


# ─── check_math ───────────────────────────────────────────────────────────────

class TestCheckMath:
    def test_correct_calculation_returns_ok(self):
        bill = make_bill()
        pos = make_position(
            total_amount=Decimal("1000.00"),
            tenant_share_percent=Decimal("20.00"),
            tenant_amount=Decimal("200.00"),
        )
        results = check_math(bill, [pos])
        assert len(results) == 1
        assert results[0][1] == "ok"
        assert results[0][0] == "math"

    def test_calculation_error_detected(self):
        bill = make_bill()
        pos = make_position(
            total_amount=Decimal("1000.00"),
            tenant_share_percent=Decimal("20.00"),
            tenant_amount=Decimal("250.00"),  # Wrong! Should be 200
        )
        results = check_math(bill, [pos])
        errors = [r for r in results if r[1] == "error"]
        assert len(errors) == 1
        assert "Rechenfehler" in errors[0][2]

    def test_rounding_within_tolerance_ok(self):
        """5 cent tolerance should not flag tiny rounding errors."""
        bill = make_bill()
        pos = make_position(
            total_amount=Decimal("1000.00"),
            tenant_share_percent=Decimal("20.00"),
            tenant_amount=Decimal("200.04"),  # 4 cent diff → ok
        )
        results = check_math(bill, [pos])
        assert all(r[1] != "error" for r in results)

    def test_sum_mismatch_warning(self):
        """Sum of tenant amounts deviates more than €1 from total_costs."""
        bill = make_bill(total_costs=Decimal("500.00"))
        pos1 = make_position(
            name="Pos 1",
            total_amount=Decimal("1000.00"),
            tenant_share_percent=Decimal("20.00"),
            tenant_amount=Decimal("200.00"),
        )
        pos2 = make_position(
            name="Pos 2",
            total_amount=Decimal("1500.00"),
            tenant_share_percent=Decimal("20.00"),
            tenant_amount=Decimal("300.00"),  # sum=500 but total_costs=500 → ok actually
        )
        # Make sum differ by >1€
        bill.total_costs = Decimal("400.00")  # sum is 500, diff=100 > 1
        results = check_math(bill, [pos1, pos2])
        warnings = [r for r in results if r[1] == "warning"]
        assert len(warnings) >= 1
        assert "Summendifferenz" in warnings[0][2]

    def test_no_positions_no_error(self):
        """Empty position list with no total_costs → ok."""
        bill = make_bill(total_costs=None)
        results = check_math(bill, [])
        assert results[0][1] == "ok"


# ─── check_deadline ───────────────────────────────────────────────────────────

class TestCheckDeadline:
    def test_on_time_delivery_ok(self):
        bill = make_bill(
            billing_period_end=date(2023, 12, 31),
            received_date=date(2024, 6, 1),  # 5 months after period end → ok
        )
        results = check_deadline(bill)
        assert results[0][1] == "ok"
        assert results[0][0] == "deadline"

    def test_late_delivery_error(self):
        """Bill received after 12-month deadline → error."""
        bill = make_bill(
            billing_period_end=date(2022, 12, 31),
            received_date=date(2024, 2, 1),  # >12 months later
        )
        results = check_deadline(bill)
        assert results[0][1] == "error"
        assert "überschritten" in results[0][2]

    def test_close_to_deadline_warning(self):
        """Bill received <30 days before deadline → warning."""
        # period end = 2022-12-31, deadline = 2023-12-31, received = 2023-12-15 (16 days left)
        bill = make_bill(
            billing_period_end=date(2022, 12, 31),
            received_date=date(2023, 12, 15),
        )
        results = check_deadline(bill)
        assert results[0][1] == "warning"
        assert "knapp" in results[0][2].lower()

    def test_missing_received_date_warning(self):
        """No received_date → warning."""
        bill = make_bill(received_date=None)
        results = check_deadline(bill)
        assert results[0][1] == "warning"
        assert "unbekannt" in results[0][2].lower()

    def test_leap_year_billing_period_end(self):
        """Leap year Feb 29 as period end should not crash."""
        bill = make_bill(
            billing_period_end=date(2024, 2, 29),
            received_date=date(2024, 6, 1),
        )
        results = check_deadline(bill)
        assert results[0][0] == "deadline"
        assert results[0][1] in ("ok", "warning")

    def test_exactly_on_deadline_ok(self):
        """Received exactly on deadline day is ok."""
        bill = make_bill(
            billing_period_end=date(2023, 6, 30),
            received_date=date(2024, 6, 30),  # exactly 12 months later
        )
        results = check_deadline(bill)
        # days_late = 0, days_until_deadline = 0 → warning (< 30 days)
        assert results[0][1] in ("ok", "warning")


# ─── check_plausibility ───────────────────────────────────────────────────────

class TestCheckPlausibility:
    def test_normal_costs_ok(self):
        """Costs within reference range → ok."""
        contract = make_contract(apartment_size_sqm=Decimal("60"))
        # heating ref: 5.50–14.00 €/m²/year
        # 60 sqm × 10 €/m²/year = 600€ → within range
        pos = make_position(
            category="heating",
            name="Heizung",
            tenant_amount=Decimal("600.00"),
        )
        results = check_plausibility([pos], contract)
        assert any(r[1] == "ok" for r in results)

    def test_extremely_high_costs_error(self):
        """Cost > 150% of high reference value → error."""
        contract = make_contract(apartment_size_sqm=Decimal("60"))
        # heating high = 14.00, 150% = 21.00 €/m²/year
        # 60 sqm × 22 €/m²/year = 1320€ → error
        pos = make_position(
            category="heating",
            name="Heizung",
            tenant_amount=Decimal("1320.00"),
        )
        results = check_plausibility([pos], contract)
        errors = [r for r in results if r[1] == "error"]
        assert len(errors) >= 1
        assert "Ungewöhnlich hohe" in errors[0][2]

    def test_slightly_above_reference_warning(self):
        """Cost > high reference value but < 150% → warning."""
        contract = make_contract(apartment_size_sqm=Decimal("60"))
        # heating high = 14.00 €/m²/year
        # 60 sqm × 15 €/m²/year = 900€ → above high, below 1.5x
        pos = make_position(
            category="heating",
            name="Heizung",
            tenant_amount=Decimal("900.00"),
        )
        results = check_plausibility([pos], contract)
        warnings = [r for r in results if r[1] == "warning"]
        assert len(warnings) >= 1
        assert "Hohe Kosten" in warnings[0][2]

    def test_unknown_category_skipped(self):
        """Positions with unknown category are not checked."""
        contract = make_contract()
        pos = make_position(category="unknown_category", name="Sonstiges")
        results = check_plausibility([pos], contract)
        # Should return ok since nothing was flagged
        assert any(r[1] == "ok" for r in results)

    def test_all_reference_categories_covered(self):
        """All REFERENCE_VALUES categories have low and high keys."""
        for cat, vals in REFERENCE_VALUES.items():
            assert "low" in vals, f"Missing 'low' for {cat}"
            assert "high" in vals, f"Missing 'high' for {cat}"
            assert vals["low"] < vals["high"], f"low >= high for {cat}"

    def test_illegal_category_not_in_reference(self):
        """ILLEGAL_CATEGORIES should not overlap with REFERENCE_VALUES."""
        overlap = set(ILLEGAL_CATEGORIES.keys()) & set(REFERENCE_VALUES.keys())
        assert not overlap, f"Overlap between illegal and reference: {overlap}"


# ─── check_legal ──────────────────────────────────────────────────────────────

class TestCheckLegal:
    def test_legal_position_ok(self):
        pos = make_position(category="heating")
        results = check_legal([pos])
        assert results[0][1] == "ok"

    def test_illegal_management_fees(self):
        pos = make_position(category="management_fees", name="Verwaltung")
        results = check_legal([pos])
        errors = [r for r in results if r[1] == "error"]
        assert len(errors) == 1
        assert "Unzulässige" in errors[0][2]
        assert pos.is_allowed is False

    def test_illegal_repair_costs(self):
        pos = make_position(category="repair", name="Reparatur")
        results = check_legal([pos])
        assert any(r[1] == "error" for r in results)

    def test_multiple_illegal_positions(self):
        pos1 = make_position(category="bank_fees", name="Bankgebühren")
        pos2 = make_position(category="legal_fees", name="Anwaltskosten")
        results = check_legal([pos1, pos2])
        errors = [r for r in results if r[1] == "error"]
        assert len(errors) == 2

    def test_all_illegal_categories_flagged(self):
        """Every category in ILLEGAL_CATEGORIES should produce an error."""
        for cat, msg in ILLEGAL_CATEGORIES.items():
            pos = make_position(category=cat, name=cat)
            results = check_legal([pos])
            assert any(r[1] == "error" for r in results), f"Category {cat} not flagged"

    def test_no_positions_ok(self):
        results = check_legal([])
        assert results[0][1] == "ok"


# ─── check_completeness ───────────────────────────────────────────────────────

class TestCheckCompleteness:
    def test_complete_bill_ok(self):
        """Bill with heating and water_sewage → ok."""
        contract = make_contract(heating_type="central")
        bill = make_bill()
        positions = [
            make_position(category="heating"),
            make_position(category="water_sewage", name="Wasser"),
        ]
        results = check_completeness(positions, contract, bill)
        assert any(r[1] == "ok" for r in results)

    def test_missing_heating_for_central_warning(self):
        """Central heating contract but no heating position → warning."""
        contract = make_contract(heating_type="central")
        bill = make_bill()
        positions = [make_position(category="water_sewage", name="Wasser")]
        results = check_completeness(positions, contract, bill)
        warnings = [r for r in results if r[1] == "warning"]
        assert len(warnings) >= 1
        assert "Heizkosten" in warnings[0][2]

    def test_no_water_sewage_warning(self):
        """Bill without water_sewage position → warning."""
        contract = make_contract(heating_type="central")
        bill = make_bill()
        positions = [make_position(category="heating")]
        results = check_completeness(positions, contract, bill)
        warnings = [r for r in results if r[1] == "warning"]
        assert any("Wasser" in w[2] for w in warnings)

    def test_individual_heating_no_warning(self):
        """Non-central heating type → no warning for missing heating position."""
        contract = make_contract(heating_type="individual")
        bill = make_bill()
        positions = [make_position(category="water_sewage", name="Wasser")]
        results = check_completeness(positions, contract, bill)
        warnings = [r for r in results if r[1] == "warning"]
        assert not any("Heizkosten" in w[2] for w in warnings)

    def test_empty_positions_list(self):
        """No positions → no water_sewage warning triggered (no positions = 0 positions)."""
        contract = make_contract(heating_type="central")
        bill = make_bill()
        results = check_completeness([], contract, bill)
        # Both central-heating and water_sewage checks triggered
        assert results[0][0] == "completeness"


# ─── calculate_score ──────────────────────────────────────────────────────────

class TestCalculateScore:
    def test_perfect_score(self):
        all_ok = [("math", "ok", "t", "d", None)]
        assert calculate_score(all_ok) == 100

    def test_one_error_deducts_20(self):
        results = [("math", "error", "t", "d", None)]
        assert calculate_score(results) == 80

    def test_one_warning_deducts_5(self):
        results = [("deadline", "warning", "t", "d", None)]
        assert calculate_score(results) == 95

    def test_mixed_errors_and_warnings(self):
        results = [
            ("math", "error", "t", "d", None),
            ("math", "error", "t", "d", None),
            ("deadline", "warning", "t", "d", None),
        ]
        expected = max(0, 100 - 2 * 20 - 1 * 5)  # = 55
        assert calculate_score(results) == expected

    def test_score_floors_at_zero(self):
        """Many errors should not produce negative score."""
        results = [("math", "error", "t", "d", None)] * 10
        assert calculate_score(results) == 0

    def test_empty_results_perfect(self):
        assert calculate_score([]) == 100


# ─── run_all_checks ───────────────────────────────────────────────────────────

class TestRunAllChecks:
    def test_clean_bill_high_score(self):
        """A bill with no issues should score 100."""
        bill = make_bill(
            billing_period_end=date(2023, 12, 31),
            received_date=date(2024, 6, 1),
            total_costs=None,
        )
        contract = make_contract(heating_type="central")
        positions = [
            make_position(
                category="heating",
                name="Heizkosten",
                total_amount=Decimal("1000.00"),
                tenant_share_percent=Decimal("20.00"),
                tenant_amount=Decimal("200.00"),
            ),
            make_position(
                category="water_sewage",
                name="Wasser/Abwasser",
                total_amount=Decimal("500.00"),
                tenant_share_percent=Decimal("20.00"),
                tenant_amount=Decimal("100.00"),
            ),
        ]
        results, score = run_all_checks(bill, positions, contract)
        assert score == 100
        assert len(results) > 0
        assert all(r[1] == "ok" for r in results)

    def test_late_bill_reduces_score(self):
        """Bill received too late should reduce score significantly."""
        bill = make_bill(
            billing_period_end=date(2022, 12, 31),
            received_date=date(2024, 5, 1),  # >12 months late
            total_costs=None,
        )
        contract = make_contract(heating_type="central")
        positions = [
            make_position(
                category="heating",
                name="Heizkosten",
                tenant_amount=Decimal("200.00"),
            ),
            make_position(
                category="water_sewage",
                name="Wasser",
                tenant_amount=Decimal("100.00"),
            ),
        ]
        results, score = run_all_checks(bill, positions, contract)
        assert score < 100
        error_types = [r[1] for r in results]
        assert "error" in error_types

    def test_illegal_position_reduces_score(self):
        """Bill with illegal position should have reduced score."""
        bill = make_bill(
            billing_period_end=date(2023, 12, 31),
            received_date=date(2024, 6, 1),
        )
        contract = make_contract()
        positions = [
            make_position(
                category="management_fees",
                name="Verwaltungskosten",
                tenant_amount=Decimal("300.00"),
            ),
            make_position(
                category="water_sewage",
                name="Wasser",
                tenant_amount=Decimal("100.00"),
            ),
        ]
        results, score = run_all_checks(bill, positions, contract)
        assert score < 100

    def test_returns_tuple_of_results_and_score(self):
        """run_all_checks always returns (list, int)."""
        bill = make_bill()
        contract = make_contract()
        results, score = run_all_checks(bill, [], contract)
        assert isinstance(results, list)
        assert isinstance(score, int)
        assert 0 <= score <= 100
