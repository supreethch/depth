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
- **Hosting:** no public deployment verified yet. Hosting account access and account-specific zero-cost behavior must be established first. No paid service, plan, payment method, or domain has been provisioned.

No measured throughput, latency, uptime, or recruiting-outcome claims are made.
