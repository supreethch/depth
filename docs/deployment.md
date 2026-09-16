# Deployment

## Preferred: one Render service

The Docker image builds the React frontend and serves it with the Python API from a single origin. This avoids cross-origin configuration, a second host, and serverless snapshot inconsistency. The service must use one instance and one Uvicorn worker.

1. First inspect the target Render workspace's billing settings. Free compute alone does **not** establish zero additional spend. Verify included usage, payment-method status, bandwidth overage behavior, and build-spend behavior. Do not add a card, upgrade, or create the service without resolving any potential charges with the owner.
2. Connect this repository and use its `render.yaml`, which explicitly selects `plan: free` and no database/disk/add-on. Or create a Docker web service with the same settings.
3. Check `/api/health`, `/api/book`, and a live `/api/simulate` result on the deployed URL. Confirm demo mode is visibly labeled, and use a private browser session to verify no login is required.
4. Set the repository website only after the deployed app has been verified.

Render free web services currently sleep after 15 minutes of inactivity and can take about a minute to wake. Shared monthly instance hours, bandwidth and build limits apply. Do not add uptime pings to evade idle suspension. No promises of permanent free service or availability are made. [Official limitations](https://render.com/docs/free).

## Optional split frontend

If the owner prefers Vercel, deploy `frontend` as a Vite static site on a verified Hobby account, with `VITE_API_URL` pointing to the single Render backend. Set `ALLOWED_ORIGINS` on the backend to the exact frontend origin. Do not enable analytics, paid add-ons, or a Pro trial. [Vercel Hobby limits](https://vercel.com/docs/plans/hobby).

Vercel-only independent Python functions are not supported by the in-memory snapshot-ID/cache design. A horizontally distributed implementation would need shared state, which is intentionally outside this MVP.

## Privacy

Review repository files, commit author emails, screenshots and build artifacts before publishing. The public repository exposes the chosen GitHub username and source code. No secrets or private contact information are required. The app disables access logs in the shipped server command, but the hosting provider may retain connection metadata under its own policy.
