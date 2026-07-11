# Chow

Tinder for restaurants. Swipe to discover, vibe-match to decide, tournament mode to pick tonight's dinner.

Built for Toronto — seeded with ~850 real restaurants from Google Places.

## Features

- **Swipe deck** — right to save, left to skip. Left swipes return after 7 days so the deck stays fresh.
- **Vibe mode** — filter by mood (Date Night, Quick Bite, Brunch, Adventurous, Comfort, Group) before swiping.
- **Tournament** — bracket-style head-to-head to pick one winner from your saves.
- **Personalised ranking** — the deck learns from your swipe history using a weighted decay algorithm. Vibes you swipe on more surface higher; tastes you've grown out of fade naturally.
- **Explore** — search, filter by cuisine/vibe/budget, sort by trending/new/top-rated.
- **Profile** — stats, badges, editable preferences.
- **Nudge system** — reminders to actually visit restaurants you've saved.

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | Python 3.13, FastAPI, PostgreSQL, SQLAlchemy (async), Alembic |
| Frontend | React 19, TypeScript, Tailwind CSS v4, Framer Motion |
| Auth | JWT (1hr access + 30d refresh) + Google OAuth |
| Photos | Google Places API proxied server-side (key never exposed to client) |
| Email | Resend |
| Rate limiting | slowapi |

## Project Structure

```
chow/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── auth.py
│   │   ├── models/         # User, Restaurant, Swipe, Save, Visit, PasswordReset
│   │   └── routers/        # auth, restaurants, swipes, saves, profile, visits
│   ├── alembic/            # DB migrations
│   ├── scripts/
│   │   └── fetch_restaurants.py   # Google Places → DB seed
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── components/     # SwipeCard, TournamentDeck, RestaurantModal, ...
│       ├── context/        # AuthContext, ThemeContext
│       ├── lib/            # axios instance with refresh token interceptor
│       ├── pages/
│       │   ├── auth/       # Welcome, Login, Signup, ForgotPassword, Onboarding
│       │   ├── Home.tsx
│       │   ├── Saved.tsx
│       │   ├── Explore.tsx
│       │   └── Profile.tsx
│       └── data/           # API helpers + types
└── dev.sh                  # starts both servers, Ctrl+C kills both
```

## Local Development

### Prerequisites

- Python 3.11+
- Node 18+
- PostgreSQL running locally
- Google Cloud project with **Places API (New)** enabled

### 1. Backend setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/chow_dev
SECRET_KEY=your-secret-key-here
GOOGLE_PLACES_API_KEY=your-key
GOOGLE_CLIENT_ID=your-oauth-client-id
RESEND_API_KEY=your-resend-key
FRONTEND_URL=http://localhost:5173
ENVIRONMENT=development
```

```bash
createdb chow_dev
alembic upgrade head
python scripts/fetch_restaurants.py   # one-time seed (~850 Toronto restaurants)
```

### 2. Frontend setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
VITE_API_URL=http://localhost:8000
```

### 3. Run

```bash
./dev.sh
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:8000 |
| API docs | http://localhost:8000/docs |

## API Overview

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Login, returns tokens |
| POST | `/api/auth/refresh` | — | Refresh access token |
| POST | `/api/auth/google` | — | Google OAuth sign-in |
| POST | `/api/auth/forgot-password` | — | Send reset email (3/15min rate limit) |
| POST | `/api/auth/reset-password` | — | Reset with token |
| GET | `/api/auth/me` | ✓ | Current user |
| GET | `/api/restaurants` | ✓ | Swipe deck (filtered + ranked) |
| GET | `/api/restaurants/:id/photo` | — | Proxied Google Places photo |
| POST | `/api/swipes` | ✓ | Record swipe |
| DELETE | `/api/swipes/history` | ✓ | Clear left-swipe history |
| GET | `/api/saves` | ✓ | Saved restaurants |
| POST | `/api/saves` | ✓ | Save / unsave a restaurant |
| POST | `/api/saves/pick` | ✓ | Lock in a tournament winner |
| GET | `/api/saves/nudge` | ✓ | Get pending visit nudge |
| GET | `/api/profile/stats` | ✓ | Swipe stats + badges |

## Migrations

```bash
cd backend

alembic revision --autogenerate -m "description"   # after changing a model
alembic upgrade head                                # apply pending
alembic downgrade -1                               # roll back one
```
