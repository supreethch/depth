from concurrent.futures import ThreadPoolExecutor
import time

import pytest

from depth.market import MarketCache, MarketUnavailable, SnapshotExpired, UpstreamFailure

RAW = {"bids": [{"price": "99", "amount": "1"}], "asks": [{"price": "100", "amount": "2"}]}


def test_concurrent_requests_share_one_fetch():
    calls = []

    def fetch():
        calls.append(1)
        time.sleep(0.02)
        return RAW

    cache = MarketCache(fetch)
    with ThreadPoolExecutor(max_workers=12) as pool:
        results = list(pool.map(lambda _: cache.get()[0].id, range(30)))
    assert len(calls) == 1
    assert len(set(results)) == 1


def test_ttl_stale_backoff_and_expiry():
    now, calls = [0], []

    def fetch():
        calls.append(1)
        if len(calls) > 1:
            raise UpstreamFailure()
        return RAW

    cache = MarketCache(fetch, lambda: now[0])
    original, stale = cache.get()
    now[0] = 9
    assert cache.get()[0] == original
    now[0] = 10
    assert cache.get() == (original, True)
    now[0] = 15
    cache.get()
    assert len(calls) == 2
    now[0] = 121
    with pytest.raises(MarketUnavailable):
        cache.get()
    with pytest.raises(SnapshotExpired):
        cache.by_id(original.id)


def test_cold_failure_backoff_respects_retry_after():
    now, calls = [0], []

    def fetch():
        calls.append(1)
        raise UpstreamFailure(90)

    cache = MarketCache(fetch, lambda: now[0])
    for tick in (0, 1, 10, 89):
        now[0] = tick
        with pytest.raises(MarketUnavailable):
            cache.get()
    assert len(calls) == 1


def test_malformed_payload_does_not_replace_good_snapshot():
    now, raw = [0], [RAW]
    cache = MarketCache(lambda: raw[0], lambda: now[0])
    first = cache.get()[0]
    now[0], raw[0] = 11, {"asks": []}
    assert cache.get() == (first, True)


def test_snapshot_id_pins_simulation_to_original_book():
    now = [0]
    cache = MarketCache(lambda: RAW, lambda: now[0])
    first = cache.get()[0]
    now[0] = 11
    second = cache.get()[0]
    assert second.id != first.id
    assert cache.by_id(first.id) == first
