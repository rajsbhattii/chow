# Chow

Tinder for restaurants. Swipe right to save, left to skip.

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | Python, FastAPI, PostgreSQL, SQLAlchemy (async) |
| Frontend | React, TypeScript, Tailwind CSS, Framer Motion |
| Auth | JWT (access + refresh tokens) + Google OAuth (coming) |
| Data | Google Places API → seeded into PostgreSQL |
| iOS | Swift (v2) |

## Project Structure

```
chow/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── auth.py
│   │   ├── models/         # User, Restaurant, Swipe, Save, Visit
│   │   └── routers/        # auth, restaurants, swipes
│   ├── alembic/            # DB migrations
│   ├── scripts/
│   │   └── fetch_restaurants.py   # Google Places → DB seed
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── components/     # Layout, SwipeCard, RestaurantModal, ProtectedRoute
│       ├── context/        # AuthContext, ThemeContext
│       ├── lib/            # axios instance (api.ts)
│       ├── pages/
│       │   ├── auth/       # Welcome, Login, Signup, Onboarding
│       │   ├── Home.tsx
│       │   ├── Saved.tsx
│       │   ├── Explore.tsx
│       │   └── Profile.tsx
│       └── data/
│           └── restaurants.ts   # API helpers + types
├── dev.sh                  # runs frontend + backend together
├── PLANNING.md
└── TASKS.md
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node 18+
- PostgreSQL running locally
- Google Cloud project with **Places API** enabled

### 1. Clone and set up the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

```env
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/chow_dev
SECRET_KEY=your-secret-key-here
GOOGLE_PLACES_API_KEY=your-google-places-key
ENVIRONMENT=development
```

### 3. Create the DB and run migrations

```bash
createdb chow_dev
alembic upgrade head
```

### 4. Seed restaurant data

This fetches ~1000 Toronto restaurants from the Google Places API and stores them in your DB. **You only need to run this once** — all user requests (swipes, filters, etc.) read from the DB, not from Google directly.

```bash
python scripts/fetch_restaurants.py
```

Output:
```
Fetching japanese_restaurant near Downtown...
Fetching italian_restaurant near Downtown...
...
Done: 847 inserted, 0 updated, 312 skipped
```

**Re-run when:** you want to refresh stale ratings/hours, or expand to a new city. The script upserts on `google_place_id` so it's safe to re-run at any time.

**Cost:** ~$25 for 1000 restaurants (one-time). Google gives $200/month free credit, so it's effectively free.

### 5. Set up the frontend

```bash
cd frontend
npm install
```

### 6. Run everything

```bash
# From the repo root:
./dev.sh
```

This starts both servers and kills both on Ctrl+C.

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:8000 |
| API docs | http://localhost:8000/docs |

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Create account, returns tokens |
| POST | `/api/auth/login` | — | Login, returns tokens + `is_new_user` |
| POST | `/api/auth/refresh` | — | Exchange refresh token for new access token |
| POST | `/api/auth/onboarding` | ✓ | Save preferences, set status → active |
| GET | `/api/auth/me` | ✓ | Current user profile |
| GET | `/api/restaurants` | ✓ | Filtered restaurant list for swipe deck |
| POST | `/api/swipes` | ✓ | Record a swipe (right swipe auto-saves) |

### `GET /api/restaurants` query params

| Param | Type | Default | Description |
|---|---|---|---|
| `lat` | float | required | User latitude |
| `lng` | float | required | User longitude |
| `max_distance_km` | int | 25 | Filter by radius |
| `budget` | string[] | — | `$` `$$` `$$$` `$$$$` |
| `cuisine` | string[] | — | e.g. `Japanese`, `Italian` |
| `vibe` | string | — | `date_night` `quick_bite` `brunch` `adventurous` `comfort` `group` |
| `exclude_swiped` | bool | true | Hide already-seen restaurants |
| `limit` | int | 20 | Page size |
| `offset` | int | 0 | Pagination offset |

---

## Database Models

| Model | Key Fields |
|---|---|
| User | id, name, email, password_hash, status (onboarding/active), cuisine_preferences, adventure_level, budget_range, max_distance, transport_modes, dietary_needs |
| Restaurant | id, name, cuisine, price_scale, lat/lng, avg_rating, review_count, tags, neighbourhood, image_url, image_emoji, google_place_id |
| Swipe | id, user_id, restaurant_id, direction (left/right), swiped_at |
| Save | id, user_id, restaurant_id, saved_at, status (want_to_go/been_here) |
| Visit | id, user_id, restaurant_id, visited_at, star_rating (1–5), would_return |

---

## Auth Flow

```
/  (Welcome)
  → /signup  → /onboarding  → /home
  → /login   → /home  (or /onboarding if status = onboarding)
```

- JWT access token (7 days) + refresh token (30 days)
- Token stored in `localStorage`, auto-attached to all API requests
- All routes except `/`, `/login`, `/signup` require auth

---

## Migrations

```bash
cd backend

# Create a new migration after changing a model
alembic revision --autogenerate -m "description"

# Apply all pending migrations
alembic upgrade head

# Roll back one migration
alembic downgrade -1
```
