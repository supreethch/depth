FROM node:22-alpine AS web
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt pyproject.toml ./
COPY backend/ backend/
RUN pip install --no-cache-dir -r requirements.txt && pip install --no-deps --no-cache-dir .
COPY --from=web /app/frontend/dist frontend/dist
RUN useradd --create-home app
USER app
ENV PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "uvicorn depth.app:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --no-access-log"]
