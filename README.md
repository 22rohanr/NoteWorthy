## NoteWorthy – Fragrance Discovery & Reviews

NoteWorthy is a web app for discovering, comparing, and tracking fragrances using structured data and community input, instead of vague marketing copy or random influencer takes.

---

## 1. Problem Statement

Buying fragrances online is hard because you can’t smell anything through a screen. Most people rely on abstract brand descriptions or other people’s opinions, which often leads to disappointing blind buys. There’s no common system that turns personal wear experiences into consistent, comparable data.

NoteWorthy aims to fix that by collecting note breakdowns, performance info, and context (“office safe”, “club”, “date night”, etc.) from real users and surfacing it in a way that’s easy to search and compare.

---

## 2. Who This Is For

- **Fragrance hobbyists / enthusiasts**  
  People who sample a lot, track their collections, and like to analyze what they wear. Typical use cases:
  - Log owned, sampled, and wishlist bottles in one place.
  - Look at note pyramids and olfactory families across a collection.
  - Compare scents across brands using consistent fields (notes, families, performance, seasonality).

- **Casual buyers / shoppers**  
  People who just want “something that smells good” without going down the rabbit hole. Typical use cases:
  - Take a short quiz to narrow down a few realistic options.
  - Read straightforward wear reports and see when/where people actually use a scent.
  - Avoid buyer’s remorse by checking community feedback before buying a full bottle.

---

## 3. What the App Does (High Level)

- **Discover**  
  Browse fragrances, filter by notes and other attributes, and jump into detail pages.

- **Brands & Notes**  
  Explore by brand or by note family (citrus, floral, woody, etc.), powered by `/api/discovery/brands` and `/api/discovery/notes`.

- **Fragrance detail & reviews**  
  See note pyramids, performance impressions, and reviews from the community. Users can write reviews and manage their own in a “My Reviews” view.

- **Collection tracking**  
  Track what you own, what you’ve sampled, and what’s on your wishlist.

- **Scent quiz**  
  A guided flow for people who don’t know where to start and just want suggestions that fit their preferences and contexts.

- **Discussions**  
  Simple forum-style discussions for questions like “Best summer freshie under $100?” or “New releases worth sampling?”, backed by `/api/discussions` routes.

The UI is built with React, Tailwind, and shadcn/ui components, so the app feels modern and works well on both desktop and mobile.

---

## 4. Tech Stack

- **Frontend**
  - React + TypeScript (Vite)
  - React Router
  - TanStack React Query
  - Tailwind CSS + shadcn/ui
  - Firebase Auth (email/Google)

- **Backend**
  - Flask + Blueprints
  - Flask‑CORS
  - Firebase Admin SDK / Firestore (via service layer)
  - Pytest tests for routes and services

---

## 5. Local Setup

### Backend

From `backend/`:

1. Create and activate a virtual environment (optional but recommended):
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Copy `.env.example` to `.env` and fill in the values (Flask settings, CORS, Firebase service account path, etc.).
4. Run the server:
   ```bash
   python run.py
   ```
   By default this exposes the API at `http://localhost:<FLASK_PORT>/api`.

5. Run backend tests:
   ```bash
   pytest
   ```

### Frontend

From `frontend/`:

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` (or `.env`) and set:
   - `VITE_API_URL` to your backend API root (for example `http://localhost:5000/api`).
   - Firebase config values from your Firebase project.
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Run frontend tests:
   ```bash
   npm test
   ```

Note: if the backend isn’t running, the frontend’s data hooks fall back to bundled mock data so you can still click around and get a feel for the UI.

---

## 6. Rough Roadmap

Some ideas that would make this more useful in the real world:

- Better personalization (recommendations based on your collection and reviews).
- More detailed sampling workflows (decants, discovery sets).
- Simple analytics for enthusiasts (note heatmaps across collections, similarity between scents, etc.).
