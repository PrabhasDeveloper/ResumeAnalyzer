# AI Resume Analyzer Backend

Production-style Express backend for AI-powered resume analysis using embeddings and LLM outputs.

## Features

- JWT authentication: `POST /register`, `POST /login`
- PDF upload and text extraction: `POST /upload-resume`
- Embedding-based semantic match scoring
- LLM-based skill extraction and suggestions
- AI-generated missing skills, explanation, improvements
- Analysis history: `GET /history`
- Persistent file-backed database storage (NeDB) and embedding cache

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
cp .env.example .env
```

3. Set variables in `.env`.
	- Optionally set `DB_DIR` (default: `./data`)

4. Run server:

```bash
npm run dev
```

## API Summary

- `POST /register`
- `POST /login`
- `POST /upload-resume` (Bearer token, multipart `resume` PDF)
- `POST /analyze` (Bearer token)
- `GET /history` (Bearer token)

## Notes

- This implementation intentionally avoids rule-based scoring and keyword-only matching.
- Intelligence is driven by embedding similarity and LLM structured outputs.
- Data is persisted in local database files under `DB_DIR`.