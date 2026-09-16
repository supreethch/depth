from decimal import Decimal as D
import random

import pytest

from depth.engine import Level, normalize_book, parse_budget, simulate


def levels(*pairs):
    return tuple(Level(D(p), D(a)) for p, a in pairs)


def test_walks_in_price_order_and_computes_vwap():
    result = simulate(levels(("100", "1"), ("200", "2")), D("200"))
    assert result["quantity"] == "1.50000000"
    assert result["levels_used"] == 2
    assert D(result["average_price"]) == D("133.3333333333")
    assert D(result["price_impact_pct"]) == D("33.3333333333")
    assert result["total_debit"] == "200.00"


def test_does_not_invent_liquidity():
    result = simulate(levels(("100", "1")), D("1000"))
    assert result["status"] == "partial_depth"
    assert result["quantity"] == "1.00000000"
    assert result["unspent"] == "900.00"


def test_exact_depth_budget_is_filled():
    result = simulate(levels(("100", "1")), D("100"))
    assert result["status"] == "filled"
    assert result["depth_exhausted"]


def test_fee_reserved_inside_budget():
    result = simulate(levels(("100", "10")), D("101"), 100)
    assert result["quantity"] == "1.00000000"
    assert result["fee"] == "1.00"
    assert result["unspent"] == "0.00"


def test_subcent_fee_rounds_up_without_overspending():
    result = simulate(levels(("76000.13", "10")), D("1.00"), 1)
    assert D(result["total_debit"]) <= 1
    assert result["fee"] == "0.01"
    assert D(result["quantity"]) % D("0.00000001") == 0


@pytest.mark.parametrize(
    "value", ["0", "-1", "NaN", "Infinity", "1e3", "1.001", "10000001", "01", " 1", ""]
)
def test_invalid_budgets(value):
    with pytest.raises(ValueError):
        parse_budget(value)


def test_normalizes_order_and_duplicate_prices():
    bids, asks = normalize_book(
        {
            "bids": [{"price": "99", "amount": "1"}],
            "asks": [
                {"price": "101", "amount": "1"},
                {"price": "100", "amount": "2"},
                {"price": "100", "amount": "3"},
            ],
        }
    )
    assert asks == levels(("100", "5"), ("101", "1"))
    assert bids[0].price == 99


@pytest.mark.parametrize(
    "price,amount",
    [("NaN", "1"), ("100", "-1"), ("100.001", "1"), (100, "1"), ("100", "0.000000001")],
)
def test_rejects_malformed_market_values(price, amount):
    with pytest.raises(ValueError):
        normalize_book(
            {"bids": [{"price": "99", "amount": "1"}], "asks": [{"price": price, "amount": amount}]}
        )


def test_cash_conservation_and_liquidity_invariants():
    rng = random.Random(42)
    for _ in range(150):
        asks = levels(
            *[(str(75000 + i * 13), str(D(rng.randint(1, 100000)) / 1000000)) for i in range(8)]
        )
        budget = D(rng.randint(100, 10000000)) / 100
        result = simulate(asks, budget, rng.randint(0, 500))
        assert D(result["total_debit"]) + D(result["unspent"]) == budget
        assert D(result["total_debit"]) <= budget
        assert D(result["quantity"]) <= sum(x.amount for x in asks)
        assert D(result["quantity"]) == sum(D(x["quantity"]) for x in result["fills"])
        assert D(result["price_impact_pct"]) >= 0
        for fill, level in zip(result["fills"], asks):
            assert D(fill["quantity"]) <= level.amount
