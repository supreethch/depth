# Verification record

Checked September 15–16, 2026.

- **29 backend tests passed** locally on Python 3.12. These include deterministic cash/liquidity invariants across 150 seeded scenarios and 30 concurrent requests sharing one upstream fetch.
- **Ruff checks and formatting passed.**
- **TypeScript check and Vite production build passed.**
- **Browser interaction checks passed:** fixed demo purchase, live Gemini purchase, insufficient depth, invalid input, example fee, explanation dialog, and mobile layout at 390px without horizontal overflow.
- **Public Gemini connection verified:** a live response returned 100 bid and 100 ask levels; the app computed a purchase against its snapshot.
- **Screenshots:** app-only captures of the clearly labeled synthetic demo, not fabricated live market data.
- **Privacy review:** publication sources/build output checked for secret patterns, personal email addresses, local user paths, and copied environment data. Commits use the GitHub ID-based noreply address. No analytics or remote fonts.
- **Five automated browser tests passed in GitHub Actions**, covering reproducible fills, partial depth, fees/validation, mobile/dialog behavior, and explicit demo recovery after a live-data failure.
- **Production Docker image built and passed smoke checks in GitHub Actions**: process health, frontend HTML, and synthetic order-book API. [Verified run](https://github.com/supreethch/depth/actions/runs/35045746744). The local Docker daemon was not running, so container verification used GitHub’s standard public-repository runner.
- **Public deployment verified September 16:** https://depth-ah2s.onrender.com serves the frontend, API docs, health endpoint, and live/demo books without login. Both $10,000 purchase requests returned HTTP 200. The synthetic result was 0.13154505 BTC; live results depend on the snapshot. The original deployment was recorded by Render against commit `b8766f8`.
- **Follow-up regression tests:** client-clock independence, clearing invalidated results, and discarding a purchase response after input changes are covered by the updated browser suite. Its CI run is linked below once complete.

No throughput, latency, or uptime benchmarks are claimed.
