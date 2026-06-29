# Chow/Ciao — Current Build Tasks

## Status
Auth and basic page structure are complete. No real data is flowing yet.
Work through sprints in order. Do not skip ahead.

## Decisions locked in
- **Data source**: Google Places API — all restaurant data fetched from Google, stored in our DB
- **Layout**: Desktop-first. Mobile pass comes later.
- **Primary color**: `var(--orange)` = `#f97316` throughout

---

## Before Sprint 1 — Prerequisites

- [ ] **Add `GOOGLE_PLACES_API_KEY` to `backend/.env`**
  - Get a key from Google Cloud Console with Places API enabled
  - Confirm it works: `curl "https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=43.6532,-79.3832&radius=5000&type=restaurant&key=YOUR_KEY"`

- [ ] **Migrate Restaurant model** — add missing fields needed by the API + frontend
  - `review_count` (Integer, nullable)
  - `tags` (JSON — e.g. `["Trending", "Quick bite", "Solo-friendly"]`)
  - `neighbourhood` (String 120, nullable — e.g. "Chinatown", "Kensington Market")
  - `image_emoji` (String 8, nullable — emoji placeholder until photo loads)
  - Run `alembic revision --autogenerate` and `alembic upgrade head`

---

## Sprint 1 — Real Data + Core Swipe Loop
> Goal: one complete swipe session that reads from the DB and writes back to it.

- [ ] **`backend/scripts/fetch_restaurants.py`** — Google Places fetch + seed
  - Use Places API Nearby Search centered on CN Tower (lat: 43.6426, lng: -79.3871)
  - Fetch across multiple radii / types to get 80+ restaurants in Toronto
  - For each place, call Place Details to get: name, address, lat/lng, rating,
    user_ratings_total, price_level, types, website, photos[0].photo_reference
  - Map to our Restaurant model:
    - `cuisine` ← infer from `types` (e.g. japanese_restaurant → "Japanese")
    - `price_scale` ← `price_level` (Google's 0–4 maps to our 1–4)
    - `avg_rating` ← `rating`
    - `review_count` ← `user_ratings_total`
    - `image_url` ← build photo URL from `photo_reference`
    - `neighbourhood` ← extract from `formatted_address` or `vicinity`
    - `google_place_id` ← `place_id` (for dedup)
    - `tags` ← derive from types + rating (e.g. rating > 4.5 → "Trending")
    - `image_emoji` ← map cuisine to emoji fallback
  - Upsert on `google_place_id` so the script is safe to re-run
  - Print summary: X inserted, Y updated, Z skipped

- [ ] **`GET /restaurants`**
  - Auth protected
  - Query params:
    - `lat` (float) + `lng` (float) — user's current location
    - `budget` (list: $, $$, $$$, $$$$)
    - `cuisine` (list of strings)
    - `max_distance_km` (int)
    - `vibe` (string: date_night | quick_bite | brunch | adventurous | comfort | group)
    - `dietary` (list of strings)
    - `exclude_swiped` (bool, default true)
    - `limit` (int, default 20) + `offset` (int, default 0)
  - Compute `distance_km` from user lat/lng to restaurant lat/lng (Haversine)
  - Compute `walk_minutes` = round(distance_km / 0.083) (avg 5km/h walk)
  - Filter by `max_distance_km` after computing distance
  - Exclude restaurants already swiped by the user if `exclude_swiped=true`
  - Sort by distance ascending
  - Response:
    ```json
    {
      "restaurants": [
        {
          "id": "uuid",
          "name": "Momofuku Noodle Bar",
          "cuisine": ["Japanese"],
          "price_scale": 2,
          "distance_km": 1.2,
          "walk_minutes": 15,
          "avg_rating": 4.6,
          "review_count": 1240,
          "busy_hours": "Peak 7–9pm",
          "tags": ["Trending", "Quick bite"],
          "image_url": "https://...",
          "image_emoji": "🍜",
          "neighbourhood": "Chinatown",
          "website": "https://..."
        }
      ],
      "total": 80,
      "offset": 0
    }
    ```

- [ ] **`POST /swipes`**
  - Auth protected
  - Body: `{ "restaurant_id": "uuid", "direction": "left" | "right" }`
  - Records swipe to DB
  - If direction = right: also create Save with status = "want_to_go"
  - Returns: `{ "saved": true | false }`

- [ ] **Wire Home page swipe deck to `GET /restaurants`**
  - Request user geolocation on page load (`navigator.geolocation`)
  - Call `GET /restaurants?lat=...&lng=...` with user's active filters
  - Each swipe calls `POST /swipes`
  - Right swipe shows a brief "Saved!" toast
  - When deck runs out, show "You've seen everything" state

---

## Sprint 2 — Saved Page + Visit Flow
> Goal: full loop from swipe → save → visit → rate.

- [ ] **`GET /saves`**
  - Auth protected
  - Query params: `status` (want_to_go | been_here | all), `sort`, `cuisine`
  - Returns saves with full restaurant object embedded
  - Response:
    ```json
    {
      "saves": [
        {
          "save_id": "uuid",
          "saved_at": "2025-06-14T19:00:00Z",
          "status": "want_to_go",
          "restaurant": { ...restaurant object... }
        }
      ]
    }
    ```

- [ ] **`POST /saves`** — manual save from Explore tab
  - Body: `{ "restaurant_id": "uuid" }`
  - Creates Save with status = "want_to_go"

- [ ] **`DELETE /saves/:save_id`**
  - Removes restaurant from saved list

- [ ] **Wire Saved page to `GET /saves`**
  - "Want to go" / "Been here" tabs call endpoint with `status` param
  - Sort/filter chips update query params
  - Loading + empty states
  - Tapping a saved item opens restaurant detail modal

- [ ] **Wire restaurant detail modal**
  - If status = want_to_go: "Yes, I went!" + "Not yet" buttons
  - If status = been_here: past rating + "Go again" / "Edit review"
  - Unsave button calls DELETE, closes modal, removes from list

- [ ] **`POST /visits`**
  - Body: `{ "restaurant_id": "uuid", "star_rating": 4, "would_return": "definitely" | "maybe" | "probably_not" }`
  - Creates Visit record
  - Updates Save status → "been_here"
  - Checks badge thresholds, returns newly earned badges
  - Response: `{ "visit": {...}, "badges_unlocked": [...] }`

- [ ] **Wire post-visit rating flow**
  - "Yes, I went!" → star rating + would_return screen
  - Submit → POST /visits → celebration screen with badge unlocks

---

## Sprint 3 — Profile Stats
> Goal: replace all hardcoded zeros with real numbers.

- [ ] **`GET /profile/stats`**
  - Auth protected
  - Returns:
    ```json
    {
      "all_time": {
        "total_swiped": 187,
        "total_saved": 35,
        "total_visited": 34,
        "cuisines_tried": 12,
        "top_cuisine": "Japanese",
        "most_visited_restaurant": { "name": "Momofuku", "count": 5 }
      },
      "this_month": { "swiped": 23, "saved": 8, "visited": 3 },
      "taste_dna": {
        "cuisine_breakdown": [
          { "cuisine": "Japanese", "pct": 34 }
        ],
        "adventure_score": 72,
        "adventure_nudge": "You said Full Send but you've been playing it safe.",
        "peak_day": "Saturday",
        "peak_time": "evening"
      },
      "badges": [
        { "id": "globe_trotter", "name": "Globe Trotter", "icon": "🌍", "earned": true }
      ]
    }
    ```

- [ ] **Badge thresholds** (computed server-side)
  - Globe Trotter: distinct cuisines visited >= 10
  - Gambler: right swipes on never-before-saved cuisine >= 10
  - Trendsetter: visited restaurant when avg_rating < 4.0, now >= 4.5
  - Regular: visit count for one restaurant >= 5
  - First In Line: visited within 7 days of restaurant's created_at
  - Off the Map: visited restaurant with review_count < 50
  - Full Send: visited cuisine user had only ever swiped left on

- [ ] **Adventure score**
  - Stated level → target: comfort_zone=25, open_minded=50, adventurous=75, full_send=100
  - Actual = % of right swipes outside user's top 3 cuisines × 100
  - If actual < stated − 20: include nudge message

- [ ] **Wire Stats tab** — wrapped card + monthly grid + all-time line
- [ ] **Wire Badges tab** — earned = full opacity + orange border, locked = 0.45 opacity
- [ ] **Wire Taste DNA tab** — cuisine bars, adventure meter, peak day

---

## Sprint 4 — Auth Gaps + Edit Preferences

- [ ] **Google OAuth** `POST /auth/google`
  - Currently returns 501
  - Integrate Google OAuth2 (use `google-auth` library)
  - Create user if not exists, login if they do

- [ ] **Forgot password flow**
  - `POST /auth/forgot-password` + `POST /auth/reset-password`
  - Use Resend (resend.com) for email delivery
  - Frontend: `/forgot-password` page

- [ ] **Edit preferences** `PUT /auth/preferences`
  - Same fields as POST /auth/onboarding
  - Settings tab: tap a row → edit mode → save → toast confirmation

---

## Sprint 5 — Explore Tab

- [ ] **Search** → `GET /restaurants?search=query`
- [ ] **Map view** — Google Maps JS SDK, pins for nearby restaurants
- [ ] **Browse by vibe** — each tile calls `GET /restaurants?vibe=...`
- [ ] **Browse by cuisine** — each tile calls `GET /restaurants?cuisine=...`
- [ ] **Near you right now** — `GET /restaurants?sort=distance&limit=5` using device location

---

## API Summary

| Method | Endpoint | Sprint |
|--------|----------|--------|
| GET | /restaurants | 1 |
| POST | /swipes | 1 |
| GET | /saves | 2 |
| POST | /saves | 2 |
| DELETE | /saves/:id | 2 |
| POST | /visits | 2 |
| GET | /profile/stats | 3 |
| PUT | /auth/preferences | 4 |
| POST | /auth/google | 4 |
| POST | /auth/forgot-password | 4 |
| POST | /auth/reset-password | 4 |

---

## Notes for Claude Code
- Always read PLANNING.md before any frontend work
- Primary color: `var(--orange)` = `#f97316`
- Desktop-first layout. `.page` class = max-width 1200px
- All cards use `.card` class (border, border-radius 16px, shadow)
- Use CSS vars (`var(--text-1)`, `var(--border)`, etc.) — no hardcoded colors
- After each sprint: show sample API response + updated file structure
