# Depth

**See beyond the price.** A Bitcoin purchase simulator that shows how a dollar budget walks through Gemini's public order book—and why the average execution price can differ from the price at the top.

Built with **Python, FastAPI, Decimal, React, TypeScript, and SVG**. Public data only; no account or API keys required. No real trades, custody, paid APIs, or analytics.

![Depth desktop demo](docs/screenshot-desktop.png)

## What it demonstrates

- A precise execution engine with satoshi-sized fills, budget-inclusive example fees, and conservative cash rounding.
- A shared, concurrency-safe market cache with timeouts, stale-data limits, and failure backoff.
- Snapshot IDs that keep the displayed order book and simulation consistent.
- An interactive cumulative-depth chart, highlighted consumed asks, and a per-level execution breakdown.
- Explicit partial-depth results and a reproducible synthetic demo when live data is unavailable.
- Responsive design, keyboard-accessible controls, and plain-language explanations.

## Run locally

Requires Python 3.12+ and Node.js 22+.

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
pip install --no-deps -e .
npm ci --prefix frontend
uvicorn depth.app:app --host 127.0.0.1 --port 8000 --no-access-log
```

In a second terminal:

```sh
npm run dev --prefix frontend
```

Open **http://127.0.0.1:5173**. Choose **Demo** for a fixed synthetic book, or open **http://127.0.0.1:5173/?demo=1**. Live mode requests Gemini data only when someone refreshes; there is no background poller.

For a single local production server:

```sh
npm run build --prefix frontend
uvicorn depth.app:app --host 127.0.0.1 --port 8000 --workers 1 --no-access-log
```

Open **http://127.0.0.1:8000** after restarting the server. The build is served by FastAPI from the same origin.

## Verify

```sh
pytest -q
ruff check backend
ruff format --check backend
npm run build --prefix frontend
cd frontend && npx playwright install chromium && npm run test:e2e
```

The backend tests cover single/multiple levels, exact depth, insufficient depth, fee rounding, invalid decimals, sorted/duplicate prices, randomized cash/liquidity invariants, concurrent cache misses, upstream failure, backoff, snapshot expiry, and API validation. Browser checks cover live/demo purchases, invalid input, fee changes, partial fills, the explanation dialog, and a 390px mobile layout. See [verification](docs/verification.md) for checks actually run.

## API

| Route                       | Purpose                                                        |
| --------------------------- | -------------------------------------------------------------- |
| `GET /api/health`           | Process health; does not call Gemini                           |
| `GET /api/book?source=live` | Shared live snapshot; 503 when unavailable                     |
| `GET /api/book?source=demo` | Explicit synthetic fixture                                     |
| `POST /api/simulate`        | Body: `{"budget":"10000","fee_bps":0,"snapshot_id":"demo-v1"}` |

Amounts are JSON strings, not floating-point numbers. Live snapshot IDs expire after two minutes; refresh on HTTP 409. Interactive API documentation is at `/docs`.

## Assumptions and limitations

This is a frozen-book estimate, **not a guaranteed trade quote**. Price impact means the average fill price relative to the same snapshot's best ask. Actual slippage can include market movement, latency, and other traders. The app requests up to 100 levels per side and never assumes liquidity beyond those returned.

Bitcoin quantities round down to 8 decimal places. Total notional and any example fee each round up to cents. Example fees are not Gemini fee quotes. Trading minimums and order eligibility are not modeled. Demo values are synthetic. This project implements exchange-market software, not a blockchain.

The cache is intentionally **single process / single instance**. Do not deploy this backend across independent serverless instances without shared snapshot storage. See [architecture](docs/architecture.md) for the algorithm, cache, and scaling tradeoffs.

## Deployment and cost

A Dockerfile and a Render configuration are included. No hosting account, service, payment method, paid plan, or domain is created by running the app locally. Deployment requires a separately verified account: Render's free compute tier can still have account-dependent bandwidth/build charges. Do not deploy until the workspace's payment/overage settings satisfy your cost constraints. See [deployment](docs/deployment.md).

## Sources

- [Gemini public order-book documentation](https://developer.gemini.com/rest/market-data)
- [Gemini rate limits](https://developer.gemini.com/rate-limit): public endpoints document 120 requests/minute and recommend no more than one/second. This app uses at most one/10 seconds per process, plus backoff.

Independent educational project. Not affiliated with or endorsed by Gemini. Original implementation; no source code copied from other personal projects.
