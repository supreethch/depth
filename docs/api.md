# HTTP API

Base URL: https://depth-ah2s.onrender.com. Interactive schema: [/docs](https://depth-ah2s.onrender.com/docs).
All routes are public. Monetary values and bitcoin quantities are decimal strings.

| Route                       | Purpose                                           |
| --------------------------- | ------------------------------------------------- |
| `GET /api/health`           | Process health; does not call Gemini              |
| `GET /api/book?source=live` | Shared Gemini BTC/USD snapshot                    |
| `GET /api/book?source=demo` | Fixed synthetic book                              |
| `POST /api/simulate`        | Hypothetical purchase against a specific snapshot |

```json
{ "budget": "10000", "fee_bps": 0, "snapshot_id": "demo-v1" }
```

Budgets range from $1 to $10,000,000 with at most two decimal places. `fee_bps`
is an integer from 0 to 500; 100 basis points means 1%. The fee is included in
the budget. Unexpected fields and numeric budgets are rejected.

The result includes quantity, per-level fills, average price, price impact,
cash cost, fee, total debit, unspent budget, and the original snapshot. Status
is `filled`, `partial_depth`, or `below_precision`.

Snapshots include `id`, `source`, `status`, `fetched_at`, `age_seconds`, and
`max_age_seconds`. `fetched_at` is the server's receive time, not an exchange-wide
execution timestamp. Demo timestamps and ages are null. Use the server-reported
age to avoid depending on the visitor's wall clock.

- **422:** invalid budget, fee, source, or request shape.
- **409:** unknown or expired live snapshot. Fetch a new book before retrying.
- **503:** no usable live snapshot. Retry later or explicitly select demo mode.

Responses are not cached by the browser. The backend shares market snapshots
internally for ten seconds and retains a bounded ID history. Run one worker on
one instance; IDs do not persist through a restart or deployment.
