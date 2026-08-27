<p align="center">
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" />
  <img alt="React 19" src="https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=20232A" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img alt="Python 3.12+" src="https://img.shields.io/badge/Python_3.12+-3776AB?style=flat-square&logo=python&logoColor=FFD43B" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-38BDF8?style=flat-square&logo=tailwindcss&logoColor=0F172A" />
  <img alt="Google Gemini API" src="https://img.shields.io/badge/Google_Gemini_API-8E44AD?style=flat-square&logo=googlegemini&logoColor=white" />
  <img alt="Pytest 100% Coverage" src="https://img.shields.io/badge/Pytest-100%25_Coverage-22C55E?style=flat-square&logo=pytest&logoColor=white" />
  <img alt="Vitest 99.3% Coverage" src="https://img.shields.io/badge/Vitest-99.3%25_Coverage-16A34A?style=flat-square&logo=vitest&logoColor=white" />
</p>

# Book Summary Validator

An adaptive, AI-driven full-stack reading comprehension utility that scores a learner’s summary against source material with semantic precision. Built for self-study loops, ingesting text from multiple channels, receiving a structured critique, then closing knowledge gaps through contextual quiz generation and asynchronous grading.

## Core Feature Showcase

- **Text** - Paste source material and a personal summary; Gemini performs semantic comparison and returns a match percentage plus structural critique.
- **Photo** - Upload a page image; client-side HTML5 Canvas compression reduces payload size before Gemini vision OCR extracts the underlying text.
- **Book / Chapter Lookup** - Resolve title, author, and chapter via Gemini’s trained knowledge base when physical or digital source text is unavailable.
- **Article URL** - Scrape public articles through Jina AI Reader to bypass common bot blocks, then optionally filter to a named section before comparison.

## The Active Learning Engine

After comparison, the application branches into an adaptive study path driven by the match score:

| Mode | Trigger | Behavior |
| --- | --- | --- |
| **Remedial** | Match &lt; 70% | Targets critique-identified gaps with focused study questions |
| **Mastery Challenge** | Match ≥ 70% | Gamified quiz with Standard / Advanced / Professional difficulty |

Questions are generated from the active source text and critique context, with exclusion history to avoid repeats. Free-response answers are graded asynchronously via Gemini semantic evaluation, not brittle string matching, returning per-question correctness and aggregate score.

## Technical Architecture Summary

- **Client-side Canvas resizing** - Images are scaled and JPEG-encoded in-browser (`maxDimension` 2048, quality 0.8) before upload, cutting bandwidth and vision API cost without degrading OCR utility.
- **Asynchronous background pre-extraction** - Photo OCR, book lookup, and URL scrape fire on selection/blur via cancellable request IDs, so source text is ready before the user hits Compare and perceived latency collapses.
- **Strict Pydantic JSON schema mapping** - Compare, quiz generation, and grading responses are bound to typed Pydantic models (`response_schema` + `model_validate`), enforcing deterministic AI output shapes at the API boundary.

```
frontend (React 19 + Vite + TS + Tailwind)
    │  FormData / JSON
    ▼
backend (FastAPI + Uvicorn)
    │  routes → services
    ▼
Google Gemini  ·  Jina AI Reader
```

## Automated Passing Coverage

| Suite | Tool | Metric |
| --- | --- | --- |
| Backend | Pytest + pytest-cov | **100%** statement coverage |
| Frontend | Vitest + @vitest/coverage-v8 | **99.3%** line coverage |

```bash
# Backend
cd backend && pytest --cov=app --cov-report=term-missing

# Frontend
cd frontend && npm run test:coverage
```

## Production Installation

### Prerequisites

- Python 3.12+
- Node.js 20+
- A Google Gemini API key

### 1. Clone and configure secrets

```bash
git clone <repository-url> project-read
cd project-read
cp .env.example .env
```

Set your key in `.env`:

```env
GEMINI_API_KEY=your_gemini_api_key
```

### 2. Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --app-dir .
```

API listens at `http://127.0.0.1:8000` (`/api/*`, OpenAPI at `/docs`).

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

SPA serves at `http://localhost:5173`. CORS is preconfigured for local Vite origins; optionally set `VITE_API_BASE_URL` if the API is not reverse-proxied on the same origin.

## Future Engineering Roadmap

- [ ] **Vector-Based Semantic Caching** - Implement a Redis vector database cache layer to store previously scraped URLs and cloud book models to bypass identical API lookups, dropping token overhead to 0% for repeated study text blocks.
- [ ] **Multi-Document Contrast** - Expand the frontend input channels to accept concurrent URL comparison nodes, letting postgraduate researchers synthesise multiple papers against a single thesis outline at the same time.
- [ ] **Relational Database Integration** - Add a local database layer (like SQLite or PostgreSQL using SQLAlchemy) to actually persist user profiles and save quiz scores over time, instead of resetting states on page refresh.
- [ ] **Custom Section Parser Customisation** - Expand our mandatory section input field into a multi-select filter, allowing a student to check boxes for multiple chapters or headings at once on a website before firing the extraction loop.
- [ ] **User-Defined Summary Target Settings** - Allow the user to manually configure their target match threshold (e.g., setting an exact pass rate slider between 60% and 90%) to alter how strictly the grading engine evaluates their text.
