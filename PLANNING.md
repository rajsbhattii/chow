# Chow/Ciao — App Planning Document

## Concept
Tinder for restaurants. Users swipe right to save, left to skip.
Built as a web app first, iOS later. Shared FastAPI backend.

## Tech Stack
- Backend: Python, FastAPI, PostgreSQL, Redis
- Frontend: React, TypeScript, Tailwind CSS, Framer Motion
- Auth: JWT + Google OAuth
- Data: Google Places API (or CSV seed for prototype)

## Folder Structure
chow-ciao/
  ├── backend/
  ├── frontend/
  ├── ios/              # later
  └── PLANNING.md

## Database Models
- User: id, name, email, password_hash, location, 
        adventure_level, budget_range, max_distance,
        dietary_needs, created_at
- Restaurant: id, name, location, cuisine, price_scale,
              busy_hours, website, avg_rating, top_reviews,
              google_place_id, image_url
- Swipe: id, user_id, restaurant_id, direction (left/right),
         swiped_at
- Save: id, user_id, restaurant_id, saved_at, status 
        (want_to_go / been_here)
- Visit: id, user_id, restaurant_id, visited_at, 
         star_rating, would_return (definitely/maybe/no)

## User Flows

### New User
1. Sign up
2. Onboarding — 4 questions:
   - Cuisine preferences (multi-select)
   - Budget + distance (sliders)
   - Adventure level (comfort zone / open-minded / 
                      adventurous / full send)
   - Dietary needs (multi-select)
3. Vibe selector — what's the move tonight?
4. Swipe deck

### Returning User
1. Auto-login
2. Personalized home — time-aware greeting + nudge
3. Vibe selector (remembers last session defaults)
4. Swipe deck

## Screens

### Home
- Time-aware greeting (morning/lunch/evening/late night)
- Nudge bar (e.g. "You saved Momofuku last week — did you go?")
- Vibe selector grid (Date night / Quick bite / Brunch / 
                      Adventurous / Comfort food / Group dinner)
- Filter chips (budget, distance, cuisine)
- Swipe deck with like / pass / undo buttons

### Saved
- Two action buttons: "Swipe my saves" + "Surprise me"
- Filter chips: Want to go / Been here / Nearest / Cuisine
- List of saved restaurants
- Tap any restaurant → opens detail card

### Restaurant Detail Card (from saved list)
- Hero image
- Back button + unsave button
- Name, cuisine, price, distance, hours
- Tags, rating, busy hours, top review
- If status = want_to_go:
    "Yes, I went!" (green) + "Not yet" buttons
    + Get directions
- If status = been_here:
    Shows past star rating + would_return answer
    "Go again" + "Edit review" buttons
    + Get directions

### Post-Visit Rating Flow
1. Star rating (1–5)
2. Would you go back? (Definitely / Maybe / Probably not)
3. Submit → moves restaurant to "Been here" list
4. Celebration screen + badge unlock if earned

### Explore
- Search bar
- Map view placeholder
- Browse by vibe (Trending / New openings / Hidden gems / 
                  Late night / Vegan friendly)
- Browse by cuisine
- Near you right now

### Profile
Four sub-tabs:
1. Stats — Wrapped card (dark bg) + monthly stat grid
2. Badges — earned vs locked grid
3. Taste DNA — cuisine bars, adventure score, 
               peak dining heatmap
4. Settings — preferences, dietary, notifications, sign out

## Badges
- Globe Trotter: tried 10 cuisines
- Gambler: used Take a Risk 10 times
- Trendsetter: visited a spot before it hit 4.5 stars
- Regular: visited same spot 5+ times
- First In Line: visited new opening within a week
- Off the Map: visited a restaurant with under 50 reviews
- Full Send: visited a restaurant you'd normally skip
- Plus One: swiped together with a friend (v2)
- Party Starter: organised group dinner (v2)

## Visit Confirmation Logic
- v1: Self-report nudge (3 days after saving)
- v2: GPS detection within 50m radius
- v3: Booking integration (Resy/OpenTable)

## Adventure Score
Tracks whether actual swipe behaviour matches stated 
adventure level from onboarding. Shown in Taste DNA tab.
If gap detected: nudge user ("You said Full Send but 
you've been playing it safe — time to take a risk?")

## Data Source (TBD)
Option A: Google Places API ($200/month credit)
Option B: CSV seed file for prototype