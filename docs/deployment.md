# Deployment

Depth is hosted at **https://depth-ah2s.onrender.com**. The React frontend and
Python API are served by one Docker web service. The public health, live book,
demo book, purchase, and API documentation routes were verified on September 16, 2026.

## Updating the existing service

`render.yaml` selects free compute, one instance, and `autoDeployTrigger: off`.
A service created through the dashboard can have different auto-deploy settings;
the YAML alone does not establish the current setting.

After pushing a tested commit, check the Render service's Events page. If no
deployment starts, select **Manual Deploy → Deploy latest commit** on the
existing Depth service. Keep its current instance type, instance count, and
billing settings. Do not create a second service or enable paid add-ons.

Verify `/api/health`, `/api/book?source=live`, and a purchase against the returned
snapshot ID after deployment. The health response in the updated source includes
Render's public commit SHA so it can be compared with GitHub. Check the demo
purchase in a signed-out browser too.

## Runtime

The multi-stage Dockerfile builds the frontend, installs pinned Python
dependencies, and runs Uvicorn as a non-root user. `PORT` is provided by Render;
`/api/health` is the health-check route. Access logs are disabled by the start command.

Use **one worker on one instance**. Snapshot IDs and request coalescing live in
process memory. Independent serverless functions or multiple replicas would
need shared snapshot storage before they could safely serve the same client.
No database, persistent disk, scheduled job, or uptime ping is needed.

## Hosting limits

Render free web services sleep after 15 minutes without traffic and can take
about a minute to resume. Instance hours, bandwidth, and build usage are shared
within a workspace. The public app does not reveal the owner's account-specific
billing settings; this repository makes no account-wide cost guarantee.
See [Render's current limits](https://render.com/docs/free) before changing plans
or provisioning another service. No billing or account settings were changed
as part of the repository update.

## Privacy

The application has no analytics, cookies, visitor records, external fonts, or
trading credentials. Budgets go only to this backend; Gemini receives fixed
public market-data requests. Hosting providers may process connection metadata
under their own policies.
