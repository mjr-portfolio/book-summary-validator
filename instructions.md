# Project Overview: Book Summary Validator (MVP Phase)
A web application that allows a user to paste text from a book, paste their own personal summary, and use an AI to evaluate if their summary conceptually matches the book text, yielding a percentage score.

## Tech Stack
- Frontend: React (Vite) + TypeScript + Tailwind CSS
- Backend: Python (FastAPI)
- AI Engine: Google Gemini API (Free Tier using `gemini-1.5-flash`)

## MVP Scope (Step 1)
- [ ] Simple React dashboard with two large textareas: "Book Source Text" and "User Summary".
- [ ] A "Compare" button that sends both texts to the FastAPI backend.
- [ ] A FastAPI endpoint (`POST /api/compare`) to process the payload.
- [ ] Backend integration with Gemini API to compare the two texts semantically.
- [ ] Display the resulting match percentage and a brief structural critique on the frontend.

## Target Directory Layout
- `/frontend` - React Vite SPA
- `/backend` - FastAPI application
