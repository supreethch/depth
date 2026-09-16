# Running Depth locally

Use Python 3.12+ and Node.js 22+. From the repository root:

```sh
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
pip install --no-deps -e .
npm ci --prefix frontend
uvicorn depth.app:app --host 127.0.0.1 --port 8000 --no-access-log
```

In a second terminal, run `npm run dev --prefix frontend`. Open
http://localhost:5173, or http://localhost:5173/?demo=1 for the fixed synthetic book.
No environment file or exchange credentials are required.

## Production build

```sh
npm run build --prefix frontend
uvicorn depth.app:app --host 127.0.0.1 --port 8000 --workers 1 --no-access-log
```

Restart the Python server after building, then open http://localhost:8000.
FastAPI serves the compiled frontend from `frontend/dist`; `STATIC_DIR` can
override that path. Run from the repository root.

Alternatively, `docker build -t depth .` followed by
`docker run --rm -p 8000:8000 depth` runs the same image used by Render.

## Tests

```sh
source .venv/bin/activate
pytest -q
ruff check backend
ruff format --check backend
npm run build --prefix frontend
cd frontend
npx playwright install chromium
npm run test:e2e
```

Playwright starts the Python API and Vite automatically if they are not already
running. The Python environment must be active. Browser tests use synthetic
fixtures; they do not depend on current Gemini prices.

## Optional split hosting

For a separately hosted frontend, set `VITE_API_URL` before building it and set
`ALLOWED_ORIGINS` on the backend to that frontend's exact origin. The default
same-origin deployment needs neither setting. `.env.example` files list the
available values; never commit real secrets.
