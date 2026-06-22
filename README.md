# Chow / Ciao

Tinder for restaurants. Swipe right to save, left to skip. Built as a web app first, iOS later.

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | Python, FastAPI, PostgreSQL, Redis |
| Frontend | React, TypeScript, Tailwind CSS, Framer Motion |
| Auth | JWT + Google OAuth |
| Data | Google Places API (CSV seed for prototype) |
| iOS | Swift (v2) |

## Project Structure

```
chow/
├── backend/
│   ├── app/
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── main.py
│   │   └── models/         # User, Restaurant, Swipe, Save, Visit
│   ├── alembic/            # DB migrations
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/     # Layout, SwipeCard
│   │   └── pages/          # Home, Saved, Explore, Profile, auth/
│   └── package.json
├── ios/                    # v2
└── PLANNING.md
```

## Running the App

### Frontend only (UI with mock data — no database needed)

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### Full stack (frontend + backend + database)

Open two terminal tabs:

**Terminal 1 — Backend**
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in your DB creds
createdb chow_dev
alembic revision --autogenerate -m "initial"
alembic upgrade head
uvicorn app.main:app --reload
# → http://localhost:8000
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

> You only need both running once the frontend starts making real API calls (auth, swipes, saves). For now, the UI runs fine on its own with mock data.

---

## Backend Setup

### 1. Install dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
```

```env
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/chow_dev
SECRET_KEY=your-secret-key-here
ENVIRONMENT=development
```

### 3. Create the database and run migrations

```bash
createdb chow_dev
alembic revision --autogenerate -m "initial"
alembic upgrade head
```

### 4. Start the dev server

```bash
uvicorn app.main:app --reload
```

API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## Database Models

| Model | Fields |
|---|---|
| User | id, name, email, password_hash, location, adventure_level, budget_range, max_distance, dietary_needs, created_at |
| Restaurant | id, name, location, lat/lng, cuisine, price_scale, busy_hours, website, avg_rating, top_reviews, google_place_id, image_url |
| Swipe | id, user_id, restaurant_id, direction (left/right), swiped_at |
| Save | id, user_id, restaurant_id, saved_at, status (want_to_go/been_here) |
| Visit | id, user_id, restaurant_id, visited_at, star_rating (1–5), would_return (definitely/maybe/no) |

---

## API Endpoints (planned)

```
POST /auth/signup
POST /auth/login
POST /auth/refresh

GET  /restaurants        # filtered list for swipe deck
POST /swipes
GET  /saves
POST /saves
POST /visits
GET  /profile/stats
```

---

## User Flows

### New User
1. Sign up
2. Onboarding — 4 questions:
   - Cuisine preferences (multi-select)
   - Budget + distance (sliders)
   - Adventure level: Comfort zone / Open-minded / Adventurous / Full send
   - Dietary needs (multi-select)
3. Vibe selector
4. Swipe deck

### Returning User
1. Auto-login
2. Personalized home — time-aware greeting + nudge
3. Vibe selector (remembers last session defaults)
4. Swipe deck

---

## Screens

### Home
- Time-aware greeting (morning / lunch / evening / late night)
- Nudge bar (e.g. "You saved Momofuku last week — did you go?")
- Vibe selector grid: Date night / Quick bite / Brunch / Adventurous / Comfort food / Group dinner
- Filter chips: budget, distance, cuisine
- Swipe deck with like / pass / undo

### Saved
- "Swipe my saves" + "Surprise me" buttons
- Filter chips: Want to go / Been here / Nearest / Cuisine
- List of saved restaurants → tap to open detail card

### Restaurant Detail Card
- Hero image, name, cuisine, price, distance, hours, rating, busy hours, top review
- If **want_to_go**: "Yes, I went!" + "Not yet" + Get directions
- If **been_here**: shows star rating + would_return answer, "Go again" + "Edit review" + Get directions

### Post-Visit Rating Flow
1. Star rating (1–5)
2. Would you go back? (Definitely / Maybe / Probably not)
3. Submit → moves to "Been here"
4. Celebration screen + badge unlock if earned

### Explore
- Search bar
- Map view (placeholder)
- Browse by vibe: Trending / New openings / Hidden gems / Late night / Vegan friendly
- Browse by cuisine
- Near you right now

### Profile
| Tab | Content |
|---|---|
| Stats | Wrapped card + monthly stat grid |
| Badges | Earned vs locked grid |
| Taste DNA | Cuisine bars, adventure score, peak dining heatmap |
| Settings | Preferences, dietary, notifications, sign out |

---

## Badges

| Badge | Unlock Condition |
|---|---|
| Globe Trotter | Tried 10 cuisines |
| Gambler | Used "Take a Risk" 10 times |
| Trendsetter | Visited a spot before it hit 4.5 stars |
| Regular | Visited the same spot 5+ times |
| First In Line | Visited a new opening within a week |
| Off the Map | Visited a restaurant with under 50 reviews |
| Full Send | Visited a restaurant you'd normally skip |
| Plus One | Swiped together with a friend (v2) |
| Party Starter | Organised a group dinner (v2) |

---

## Adventure Score

Tracks whether actual swipe behaviour matches the stated adventure level from onboarding. Shown in the Taste DNA tab. If a gap is detected, the app nudges: *"You said Full Send but you've been playing it safe — time to take a risk?"*

---

## Visit Confirmation

| Version | Method |
|---|---|
| v1 | Self-report nudge 3 days after saving |
| v2 | GPS detection within 50m radius |
| v3 | Booking integration (Resy / OpenTable) |

---

## Build Tasks

### Current Sprint — Backend Foundation
- [x] Initialize FastAPI project
- [x] PostgreSQL connection with SQLAlchemy async
- [x] All database models (User, Restaurant, Swipe, Save, Visit)
- [ ] JWT auth endpoints (signup, login, refresh)
- [ ] Restaurant seed script from CSV
- [ ] Core API endpoints (restaurants, swipes, saves, visits, profile/stats)

### Next Sprint — Frontend Shell
- [ ] React + TypeScript + Tailwind setup
- [ ] React Router with 4 routes
- [ ] Auth pages (login, signup, onboarding flow)
- [ ] Home screen with vibe selector
- [ ] Swipe card component with Framer Motion
