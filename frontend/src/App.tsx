import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  FlaskConical,
  Layers3,
  RefreshCw,
  ShieldCheck,
  Waves,
  X,
} from "lucide-react";
import { request, usd } from "./api";
import type { Book, Result } from "./api";
import DepthChart from "./DepthChart";

export default function App() {
  const [source, setSource] = useState<"live" | "demo">(
    new URLSearchParams(location.search).get("demo") === "1" ? "demo" : "live",
  );
  const [book, setBook] = useState<Book | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [budget, setBudget] = useState("10000");
  const [fee, setFee] = useState("0");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [learn, setLearn] = useState(false);
  const [now, setNow] = useState(performance.now());
  const epoch = useRef(0);
  const inputRevision = useRef(0);
  const receivedAt = useRef(performance.now());
  const dialog = useRef<HTMLDialogElement>(null);

  async function refresh() {
    const current = ++epoch.current;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const next = await request<Book>(`/api/book?source=${source}`);
      if (current === epoch.current) {
        receivedAt.current = performance.now();
        setNow(receivedAt.current);
        setBook(next);
      }
    } catch (e) {
      if (current === epoch.current) {
        setError((e as Error).message);
        setBook(null);
      }
    } finally {
      if (current === epoch.current) setLoading(false);
    }
  }
  useEffect(() => {
    setBook(null);
    setBusy(false);
    void refresh();
    return () => {
      epoch.current++;
    };
  }, [source]); // explicit snapshot refresh preserves reproducibility
  useEffect(() => {
    const id = setInterval(() => setNow(performance.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (learn) dialog.current?.showModal();
    else dialog.current?.close();
  }, [learn]);
  // Server age + elapsed browser time avoids depending on the visitor's clock.
  const age =
    book?.source === "live"
      ? Math.max(
          0,
          Math.floor(
            (book.age_seconds ?? 0) + (now - receivedAt.current) / 1000,
          ),
        )
      : 0;
  const expired = source === "live" && age > (book?.max_age_seconds ?? 120);
  const stale = book?.status === "stale" || (source === "live" && age >= 10);
  const visibleResult = result;
  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!book) return;
    const current = epoch.current;
    const revision = inputRevision.current;
    setResult(null);
    setBusy(true);
    setError("");
    try {
      const next = await request<Result>("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budget,
          fee_bps: Number(fee),
          snapshot_id: book.id,
        }),
      });
      if (current === epoch.current && revision === inputRevision.current)
        setResult(next);
    } catch (e) {
      if (current === epoch.current) setError((e as Error).message);
    } finally {
      if (current === epoch.current) setBusy(false);
    }
  }
  function changeBudget(value: string) {
    inputRevision.current++;
    setResult(null);
    setBudget(value);
    setError("");
  }

  return (
    <div className="app-shell">
      <header className="header">
        <a className="brand" href="/" aria-label="Depth home">
          <Waves size={27} />
          <span>
            depth<span className="brand-dot">.</span>
          </span>
        </a>
        <nav aria-label="Main">
          <span className="nav-active">Simulator</span>
          <button onClick={() => setLearn(true)}>
            How it works <ArrowUpRight size={14} />
          </button>
        </nav>
        <span className="header-note">
          <ShieldCheck size={14} /> Real markets. Simulated money.
        </span>
      </header>
      <main>
        <section className="intro">
          <div>
            <div className="eyebrow">
              <span className="tiny-line" /> THE ORDER BOOK, MADE CLEAR
            </div>
            <h1>See beyond the price.</h1>
            <p>
              A price is just the beginning. Discover how your purchase moves
              through the market.
            </p>
          </div>
          <span className="intro-badge">
            <Layers3 size={17} /> A market depth explorer
          </span>
        </section>
        <div className="workspace-heading">
          <div className="market-name">
            <span className="bitcoin">₿</span>
            <div>
              <h2>
                Bitcoin <span>BTC / USD</span>
              </h2>
              <p>
                Spot market <span>·</span> Gemini public order book
              </p>
            </div>
          </div>
          <div className="source-control" aria-label="Data source">
            <button
              className={source === "live" ? "selected" : ""}
              onClick={() => setSource("live")}
            >
              <span className="dot bid" />
              Live market
            </button>
            <button
              className={source === "demo" ? "selected" : ""}
              onClick={() => setSource("demo")}
            >
              <FlaskConical size={14} />
              Demo
            </button>
          </div>
        </div>
        {source === "demo" && (
          <div className="notice demo">
            <FlaskConical size={15} />
            <span>
              <strong>Demo mode.</strong> A synthetic, fixed order book for
              exploring. These are not current Gemini prices.
            </span>
          </div>
        )}
        {error && (
          <div className="notice error" role="alert">
            <CircleHelp size={17} />
            <span>{error}</span>
            {!book && source === "live" && (
              <button onClick={() => setSource("demo")}>
                Explore demo <ArrowRight size={14} />
              </button>
            )}
          </div>
        )}
        <div className="workspace">
          <div className="market-column">
            <section className="panel market-panel" aria-label="Market depth">
              <div className="market-stats">
                <div>
                  <span className="label">
                    Best ask <CircleHelp size={12} />
                  </span>
                  <strong>{book ? usd(book.asks[0].price) : "—"}</strong>
                  <small>Lowest available selling price</small>
                </div>
                <div>
                  <span className="label">Spread</span>
                  <strong className="small-stat">
                    {book ? usd(book.spread) : "—"}
                  </strong>
                  <small>Best ask − best bid</small>
                </div>
                <div>
                  <span className="label">Visible sell depth</span>
                  <strong className="small-stat">
                    {book
                      ? `${Number(book.available_quantity).toFixed(3)} BTC`
                      : "—"}
                  </strong>
                  <small>
                    {book
                      ? `${book.asks.length} returned price levels`
                      : "Waiting for a snapshot"}
                  </small>
                </div>
              </div>
              <div className="section-heading">
                <h3>Market depth</h3>
                <span className="pill">CUMULATIVE</span>
              </div>
              {book ? (
                <DepthChart key={book.id} book={book} result={visibleResult} />
              ) : (
                <div className="empty-chart">
                  <Waves size={38} />
                  <h3>
                    {loading
                      ? "Reading the market…"
                      : "The market is out of reach"}
                  </h3>
                  <p>
                    {loading
                      ? "Fetching a public order-book snapshot."
                      : "Try refreshing, or use the reproducible demo."}
                  </p>
                </div>
              )}
              <div className="snapshot-bar">
                <span className={expired || stale ? "status amber" : "status"}>
                  <i className="dot" />
                  {book
                    ? source === "demo"
                      ? "Fixed demo snapshot"
                      : `${expired ? "Expired" : stale ? "Aging" : "Live"} snapshot · ${age}s old`
                    : "No snapshot"}
                </span>
                <button
                  onClick={refresh}
                  disabled={loading || busy}
                  aria-label="Refresh snapshot"
                >
                  <RefreshCw size={13} className={loading ? "spin" : ""} />{" "}
                  Refresh
                </button>
              </div>
            </section>
            <section className="panel orderbook">
              <div className="section-heading">
                <h3>Inside the order book</h3>
                <span className="subtle">Top 8 levels per side</span>
              </div>
              <div className="book-sides">
                {(["bids", "asks"] as const).map((side) => (
                  <div key={side}>
                    <div className={`side-label ${side}`}>
                      <span>
                        {side === "bids" ? (
                          <ArrowUpRight size={14} />
                        ) : (
                          <ArrowDown size={14} />
                        )}{" "}
                        {side === "bids" ? "Buy orders" : "Sell orders"}
                      </span>
                      <span>{side === "bids" ? "BIDS" : "ASKS"}</span>
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th>Price (USD)</th>
                          <th>Amount (BTC)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {book?.[side].slice(0, 8).map((l) => (
                          <tr
                            key={l.price}
                            className={
                              side === "asks" &&
                              visibleResult?.fills.some(
                                (f) => f.price === l.price,
                              )
                                ? "consumed"
                                : ""
                            }
                          >
                            <td>{usd(l.price)}</td>
                            <td
                              style={{
                                backgroundImage: `linear-gradient(to left, ${side === "bids" ? "#84c6aa13" : "#bafa6a13"} ${(Number(l.amount) / Math.max(...book[side].slice(0, 8).map((x) => Number(x.amount)))) * 100}%, transparent 0)`,
                              }}
                            >
                              {Number(l.amount).toFixed(8)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!book && <p className="book-empty">No data available</p>}
                  </div>
                ))}
              </div>
              <p className="table-foot">
                <span className="square" /> Highlighted asks contribute to your
                simulated purchase.
              </p>
            </section>
          </div>
          <aside className="purchase-column">
            <section className="panel purchase">
              <div className="section-heading">
                <h3>Try a purchase</h3>
                <span className="pill green">SIMULATION</span>
              </div>
              <p className="purchase-description">
                Your budget. The actual depth behind it.
              </p>
              <form onSubmit={run}>
                <label htmlFor="budget">How much would you spend?</label>
                <div className="budget-input">
                  <span>$</span>
                  <input
                    id="budget"
                    inputMode="decimal"
                    autoComplete="off"
                    value={budget}
                    onChange={(e) => changeBudget(e.target.value)}
                    aria-describedby="budget-hint"
                    maxLength={12}
                    required
                  />
                  <span>USD</span>
                </div>
                <span id="budget-hint" className="sr-only">
                  Enter between 1 and 10 million dollars, with up to two decimal
                  places.
                </span>
                <div className="presets">
                  {["1000", "10000", "100000"].map((v) => (
                    <button
                      type="button"
                      key={v}
                      className={budget === v ? "active" : ""}
                      onClick={() => changeBudget(v)}
                    >
                      {usd(v, 0)}
                    </button>
                  ))}
                </div>
                <div className="fee-row">
                  <label htmlFor="fee">
                    Fee assumption <CircleHelp size={13} />
                  </label>
                  <div className="select-wrap">
                    <select
                      id="fee"
                      value={fee}
                      onChange={(e) => {
                        inputRevision.current++;
                        setResult(null);
                        setError("");
                        setFee(e.target.value);
                      }}
                    >
                      <option value="0">0% · excluded</option>
                      <option value="10">0.10% · example</option>
                      <option value="40">0.40% · example</option>
                      <option value="100">1.00% · example</option>
                    </select>
                    <ChevronDown size={13} />
                  </div>
                </div>
                <p className="fee-explainer">
                  {fee === "0"
                    ? "Fees are excluded. Select an example to include a fee in your budget."
                    : "Illustrative fee, included within your budget. Not a Gemini fee quote."}
                </p>
                <button
                  className="simulate-button"
                  disabled={!book || loading || busy || expired}
                  type="submit"
                >
                  {busy
                    ? "Simulating…"
                    : expired
                      ? "Refresh the expired snapshot"
                      : "Simulate purchase"}
                  {busy ? (
                    <RefreshCw size={17} className="spin" />
                  ) : (
                    <ArrowRight size={18} />
                  )}
                </button>
              </form>
              <div className="result" aria-live="polite">
                {visibleResult ? (
                  <>
                    <div className="result-label">
                      <span>
                        {visibleResult.status === "partial_depth"
                          ? "AVAILABLE DEPTH FILLED"
                          : "YOU WOULD RECEIVE"}
                      </span>
                      <Check size={14} />
                    </div>
                    <div className="quantity">
                      {visibleResult.quantity}
                      <span>BTC</span>
                    </div>
                    <dl>
                      <div>
                        <dt>Average execution price</dt>
                        <dd>{usd(visibleResult.average_price)}</dd>
                      </div>
                      <div>
                        <dt>
                          Price impact{" "}
                          <button
                            className="help-icon"
                            onClick={() => setLearn(true)}
                            aria-label="Explain price impact"
                          >
                            <CircleHelp size={12} />
                          </button>
                        </dt>
                        <dd className="accent">
                          {visibleResult.price_impact_pct === null
                            ? "—"
                            : `+${Number(visibleResult.price_impact_pct).toFixed(4)}%`}
                        </dd>
                      </div>
                      <div>
                        <dt>Price levels used</dt>
                        <dd>{visibleResult.levels_used}</dd>
                      </div>
                    </dl>
                    <div className="receipt">
                      <div>
                        <span>Bitcoin cost</span>
                        <span>{usd(visibleResult.cash_for_bitcoin)}</span>
                      </div>
                      <div>
                        <span>
                          Example fee (
                          {(visibleResult.fee_bps / 100).toFixed(2)}%)
                        </span>
                        <span>{usd(visibleResult.fee)}</span>
                      </div>
                      <div className="receipt-total">
                        <span>Total simulated spend</span>
                        <strong>{usd(visibleResult.total_debit)}</strong>
                      </div>
                      <div>
                        <span>Unspent budget</span>
                        <span>{usd(visibleResult.unspent)}</span>
                      </div>
                    </div>
                    {visibleResult.status === "partial_depth" && (
                      <p className="partial-warning">
                        Your budget exceeds the returned sell depth. The
                        remainder is unfilled; no extra liquidity is assumed.
                      </p>
                    )}
                    <details className="fill-details">
                      <summary>
                        View execution breakdown <ChevronDown size={13} />
                      </summary>
                      <div className="fills-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>Price</th>
                              <th>BTC acquired</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleResult.fills.map((f) => (
                              <tr key={f.price}>
                                <td>{usd(f.price)}</td>
                                <td>{f.quantity}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  </>
                ) : (
                  <div className="result-empty">
                    <Layers3 size={26} />
                    <h4>Every purchase tells a story.</h4>
                    <p>
                      Run a simulation to see your bitcoin amount, average
                      price, and market impact.
                    </p>
                  </div>
                )}
              </div>
              <p className="safe-note">
                <ShieldCheck size={14} /> No account. No real trades. Just
                insight.
              </p>
            </section>
            <section className="learning-card">
              <BookOpen size={20} />
              <div>
                <h3>Why isn’t there just one price?</h3>
                <p>
                  Every seller sets a price. Larger purchases may need to reach
                  more sellers—and higher prices.
                </p>
                <button onClick={() => setLearn(true)}>
                  Get to know the order book <ArrowRight size={14} />
                </button>
              </div>
            </section>
          </aside>
        </div>
        <section className="principles">
          <div>
            <span>01</span>
            <h3>Start with the book</h3>
            <p>A snapshot of buyers and sellers, grouped by their price.</p>
          </div>
          <div>
            <span>02</span>
            <h3>Follow your budget</h3>
            <p>
              Fill the lowest asks first, then move up until your budget runs
              out.
            </p>
          </div>
          <div>
            <span>03</span>
            <h3>Understand the difference</h3>
            <p>
              See why the average price can rise as your purchase gets larger.
            </p>
          </div>
        </section>
      </main>
      <footer>
        <a className="brand footer-brand" href="/">
          <Waves size={20} />
          depth.
        </a>
        <p>
          An independent educational project. Not affiliated with Gemini.
          <br />
          Snapshot estimates, not guaranteed quotes or investment advice.
        </p>
        <a
          href="https://developer.gemini.com/rest/market-data"
          target="_blank"
          rel="noreferrer"
        >
          Market data docs <ArrowUpRight size={13} />
        </a>
      </footer>
      <dialog
        aria-labelledby="explanation-title"
        ref={dialog}
        onCancel={() => setLearn(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setLearn(false);
        }}
      >
        <button
          className="dialog-close"
          aria-label="Close explanation"
          onClick={() => setLearn(false)}
        >
          <X size={20} />
        </button>
        <div className="eyebrow">A LITTLE MARKET CLARITY</div>
        <h2 id="explanation-title">From budget to bitcoin.</h2>
        <p>
          <strong>The order book</strong> lists bids (offers to buy) and asks
          (offers to sell). A purchase consumes asks, starting with the lowest
          price.
        </p>
        <p>
          <strong>Depth</strong> is the amount available across those price
          levels. This app requests up to 100 levels on each side—not
          necessarily the whole market.
        </p>
        <p>
          <strong>Average execution price</strong> is the sum of each fill’s
          price × quantity, divided by the total bitcoin acquired. Fees and cash
          rounding are separate.
        </p>
        <p>
          <strong>Price impact here</strong> compares that average with the best
          ask in the same snapshot. It measures the cost of walking the visible
          book. Actual slippage can also include market changes, latency, and
          other orders; this simulation does not predict those.
        </p>
        <p>
          <strong>Precision and fees.</strong> Bitcoin is rounded down to 8
          decimal places. Total notional and any example fee are each rounded up
          to the next cent, without exceeding your budget. These are explicit
          simulator assumptions, not a claim about Gemini’s settlement rules.
        </p>
        <p>
          <strong>A frozen moment.</strong> Refresh to get a new snapshot. Live
          snapshots expire after two minutes. Demo data is synthetic and never
          live. This is exchange-market software; it does not implement a
          blockchain or submit trades.
        </p>
        <button className="simulate-button" onClick={() => setLearn(false)}>
          Got it <Check size={16} />
        </button>
      </dialog>
    </div>
  );
}
