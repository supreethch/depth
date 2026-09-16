"""One shared bounded cache per server process. No polling without a visitor."""

from collections import OrderedDict
from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import json
import threading
import time

import httpx

from depth.engine import D, Level, normalize_book

TTL = 10
MAX_AGE = 120
URL = "https://api.gemini.com/v1/book/btcusd"


class MarketUnavailable(Exception):
    pass


class SnapshotExpired(Exception):
    pass


class UpstreamFailure(Exception):
    def __init__(self, retry_after=0):
        self.retry_after = retry_after


@dataclass(frozen=True)
class Snapshot:
    id: str
    source: str
    fetched_at: str | None
    created: float
    bids: tuple[Level, ...]
    asks: tuple[Level, ...]

    def json(self, now: float, degraded: bool = False):
        age = max(0, now - self.created) if self.source == "live" else None
        return {
            "id": self.id,
            "symbol": "BTCUSD",
            "source": self.source,
            "fetched_at": self.fetched_at,
            "age_seconds": round(age, 1) if age is not None else None,
            "status": "demo" if age is None else ("stale" if degraded or age >= TTL else "live"),
            "max_age_seconds": MAX_AGE,
            "refresh_seconds": TTL,
            "bids": [x.json() for x in self.bids],
            "asks": [x.json() for x in self.asks],
            "spread": str(self.asks[0].price - self.bids[0].price),
            "available_notional": str(sum((x.price * x.amount for x in self.asks), D(0))),
            "available_quantity": str(sum((x.amount for x in self.asks), D(0))),
        }


def fetch_book():
    try:
        response = httpx.get(
            URL,
            params={"limit_bids": 100, "limit_asks": 100},
            timeout=5,
            headers={"User-Agent": "Depth/1.0 public-market-simulator"},
        )
        if response.status_code == 429:
            try:
                retry = min(300, max(0, float(response.headers.get("Retry-After", "0"))))
            except ValueError:
                retry = 0
            raise UpstreamFailure(retry)
        response.raise_for_status()
        return response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise UpstreamFailure() from exc


def make_demo():
    # Synthetic, deterministic teaching fixture. Never represented as exchange data.
    asks = tuple(
        Level(D(76000 + i * 12), D(str(0.02 + (i % 7) * 0.015)).quantize(D("0.00000001")))
        for i in range(40)
    )
    bids = tuple(
        Level(D(75992 - i * 12), D(str(0.025 + (i % 5) * 0.018)).quantize(D("0.00000001")))
        for i in range(40)
    )
    return Snapshot("demo-v1", "demo", None, 0, bids, asks)


DEMO = make_demo()


class MarketCache:
    def __init__(self, fetch=fetch_book, clock=time.monotonic):
        self.fetch, self.clock = fetch, clock
        self.lock = threading.Lock()
        self.latest = None
        self.history: OrderedDict[str, Snapshot] = OrderedDict()
        self.next_attempt = 0.0
        self.failures = 0

    def get(self) -> tuple[Snapshot, bool]:
        # A lock coalesces simultaneous misses, including failed upstream fetches.
        with self.lock:
            now = self.clock()
            if now >= self.next_attempt:
                try:
                    raw = self.fetch()
                    bids, asks = normalize_book(raw)
                    fetched_at = datetime.now(timezone.utc).isoformat()
                    key = hashlib.sha256(
                        (json.dumps(raw, sort_keys=True) + fetched_at).encode()
                    ).hexdigest()[:20]
                    now = self.clock()
                    self.latest = Snapshot(key, "live", fetched_at, now, bids, asks)
                    self.history[key] = self.latest
                    while len(self.history) > 32:
                        self.history.popitem(last=False)
                    self.failures = 0
                    self.next_attempt = now + TTL
                except (UpstreamFailure, ValueError) as exc:
                    now = self.clock()
                    self.failures = min(6, self.failures + 1)
                    delay = max(
                        min(60, TTL * 2 ** (self.failures - 1)), getattr(exc, "retry_after", 0)
                    )
                    self.next_attempt = now + delay
            if self.latest and now - self.latest.created <= MAX_AGE:
                return self.latest, bool(self.failures)
            raise MarketUnavailable("Live data is unavailable. Retry shortly or explore the demo.")

    def by_id(self, snapshot_id: str):
        if snapshot_id == DEMO.id:
            return DEMO
        with self.lock:
            snapshot = self.history.get(snapshot_id)
            if not snapshot or self.clock() - snapshot.created > MAX_AGE:
                raise SnapshotExpired("This snapshot expired. Refresh the market and try again.")
            return snapshot
