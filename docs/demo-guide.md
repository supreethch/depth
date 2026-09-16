# A five-minute walkthrough

1. Open **Demo**. Explain that the numbers are synthetic, so the same inputs produce the same output.
2. Simulate **$1,000**, then **$100,000**, with fees excluded. Notice how the larger budget consumes more price levels and increases the average price relative to the best ask.
3. Open **View execution breakdown**. Each row is a fill: price multiplied by bitcoin quantity contributes to the total notional.
4. Enter **$1,000,000**. The demo has only 2.525 BTC available. Depth fills that amount and leaves $807,497.90 unspent instead of pretending the remaining purchase can execute.
5. Switch to **Live market**, refresh, and simulate. The timestamp is when this server received Gemini's snapshot. Refreshing is explicit so the graph and result describe the same frozen moment.

## Explain the engineering

**Why Python Decimal?** Money and quantities arrive as exact decimal strings. Binary floats can introduce rounding differences. The calculation uses decimal arithmetic and satoshi-sized quantities; only display charts use JavaScript numbers.

**Why a cache?** Every visitor should not trigger their own Gemini request. One cache and lock share a snapshot across concurrent users. Failed requests back off, and stale snapshots are visibly labeled and expire.

**Why snapshot IDs?** Otherwise the graph could show one book while the purchase calculation silently uses a newer one. Sending the ID binds the result to what the user saw.

**Why one server?** The cache and IDs live in memory. Multiple replicas would not share them. Scaling would require shared snapshot storage and coordinated fetching, which is a deliberate future tradeoff.

**What does price impact mean?** Here it is `(average fill price / best ask - 1) × 100`, for the same snapshot. It is not a prediction of future price movement or all real-world slippage.

**What did the tests prove?** They check conservation of cash, liquidity bounds, rounding, invalid input, snapshot consistency, and failures. They do not prove real exchange execution, trading profitability, or production throughput.

## Truthful résumé language

- Built a Bitcoin purchase simulator with Python/FastAPI and React/TypeScript that walks Gemini public order-book snapshots using decimal arithmetic and visualizes fills, average execution price, and price impact.
- Implemented shared snapshot caching, concurrent-request coalescing, failure backoff, and explicit stale/partial-depth states; verified calculation and cache invariants with automated tests.

Be ready to explain the code and its assumptions. This project demonstrates exchange-market software, not blockchain development, custody, or real order execution.
