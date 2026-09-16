"""Pure, deterministic order-book walking. No floats, I/O, or exchange order submission."""

from dataclasses import dataclass
from decimal import Decimal, ROUND_CEILING, ROUND_DOWN, localcontext
import re

D = Decimal
SATOSHI = D("0.00000001")
CENT = D("0.01")
INPUT = re.compile(r"^(?:0|[1-9]\d{0,8})(?:\.\d{1,2})?$")


@dataclass(frozen=True)
class Level:
    price: Decimal
    amount: Decimal

    def json(self):
        return {"price": str(self.price), "amount": str(self.amount)}


def money_up(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_CEILING)


def parse_budget(value: str) -> Decimal:
    if not INPUT.fullmatch(value):
        raise ValueError("Use a dollar amount with at most two decimal places.")
    amount = D(value)
    if not D("1") <= amount <= D("10000000"):
        raise ValueError("Choose a budget from $1 to $10,000,000.")
    return amount


def normalize_book(raw: dict) -> tuple[tuple[Level, ...], tuple[Level, ...]]:
    """Reject malformed data; aggregate equal prices and sort defensively."""
    sides = []
    for name in ("bids", "asks"):
        rows = raw.get(name)
        if not isinstance(rows, list) or not 1 <= len(rows) <= 100:
            raise ValueError("Missing or oversized order-book side")
        grouped: dict[Decimal, Decimal] = {}
        for row in rows:
            if not isinstance(row, dict):
                raise ValueError("Invalid order-book level")
            price, amount = row.get("price"), row.get("amount")
            if not all(isinstance(x, str) and len(x) <= 32 for x in (price, amount)):
                raise ValueError("Market values must be decimal strings")
            try:
                p, a = D(price), D(amount)
                if not p.is_finite() or not a.is_finite():
                    raise ValueError("Nonfinite market value")
                if not D("0.01") <= p <= D("100000000") or not 0 < a <= D("1000000"):
                    raise ValueError("Market value out of range")
                if p != p.quantize(CENT) or a != a.quantize(SATOSHI):
                    raise ValueError("Unsupported market precision")
            except ArithmeticError as exc:
                raise ValueError("Invalid decimal") from exc
            grouped[p] = grouped.get(p, D(0)) + a
        sides.append(tuple(Level(p, grouped[p]) for p in sorted(grouped, reverse=name == "bids")))
    bids, asks = sides
    if bids[0].price >= asks[0].price:
        raise ValueError("Crossed or locked snapshot")
    return bids, asks


def simulate(asks: tuple[Level, ...], budget: Decimal, fee_bps: int = 0) -> dict:
    """Buy satoshi-sized quantities, reserving a user-selected fee inside the budget.

    Settlement rounds total notional and fee up to cents separately. Binary search
    per price level makes the total cash debit <= budget, including rounding.
    """
    if not asks or not budget.is_finite() or budget < 1 or budget > 10000000:
        raise ValueError("Invalid budget or empty asks")
    if not isinstance(fee_bps, int) or isinstance(fee_bps, bool) or not 0 <= fee_bps <= 500:
        raise ValueError("Fee must be between 0 and 500 basis points.")
    with localcontext() as ctx:
        ctx.prec = 40
        rate = D(fee_bps) / 10000
        cost, quantity = D(0), D(0)
        fills = []

        def debit(notional):
            return money_up(notional) + money_up(notional * rate)

        for level in asks:
            units = int((level.amount / SATOSHI).to_integral_value(rounding=ROUND_DOWN))
            low, high = 0, units
            while low < high:
                mid = (low + high + 1) // 2
                if debit(cost + level.price * SATOSHI * mid) <= budget:
                    low = mid
                else:
                    high = mid - 1
            acquired = SATOSHI * low
            if acquired:
                level_cost = level.price * acquired
                cost += level_cost
                quantity += acquired
                fills.append(
                    {
                        "price": str(level.price),
                        "quantity": f"{acquired:.8f}",
                        "notional": str(level_cost),
                    }
                )
            if low < units:
                break

        available = sum((level.amount for level in asks), D(0))
        exhausted = quantity == available
        remaining = budget - debit(cost)
        partial = exhausted and debit(cost + asks[-1].price * SATOSHI) <= budget
        average = cost / quantity if quantity else None
        impact = ((average / asks[0].price) - 1) * 100 if average else None
        return {
            "budget": f"{budget:.2f}",
            "fee_bps": fee_bps,
            "quantity": f"{quantity:.8f}",
            "notional": str(cost),
            "cash_for_bitcoin": f"{money_up(cost):.2f}",
            "fee": f"{money_up(cost * rate):.2f}",
            "total_debit": f"{debit(cost):.2f}",
            "unspent": f"{remaining:.2f}",
            "average_price": f"{average:.10f}" if average is not None else None,
            "best_ask": str(asks[0].price),
            "price_impact_pct": f"{impact:.10f}" if impact is not None else None,
            "last_price": fills[-1]["price"] if fills else None,
            "levels_used": len(fills),
            "fills": fills,
            "depth_exhausted": exhausted,
            "status": "partial_depth" if partial else ("filled" if quantity else "below_precision"),
            "available_quantity": str(available),
            "available_notional": str(sum((x.price * x.amount for x in asks), D(0))),
        }
