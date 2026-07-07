import api from '../lib/api'

export interface RestaurantDetail {
  id: string
  name: string
  cuisine: string
  priceScale: number
  priceLabel: string
  distanceKm: number
  walkMinutes: number
  avgRating: number | null
  reviewCount: number | null
  busyHours: Record<string, string> | null
  tags: string[]
  imageUrl: string | null
  imageEmoji: string
  neighbourhood: string | null
  website: string | null
  location: string | null
}

export interface RestaurantsResponse {
  restaurants: RestaurantDetail[]
  total: number
  offset: number
}

export async function fetchRestaurants(
  lat: number,
  lng: number,
  params: {
    budget?: string[]
    cuisine?: string[]
    maxDistanceKm?: number
    vibe?: string
    shuffle?: boolean
    excludeSwiped?: boolean
    limit?: number
    offset?: number
  } = {}
): Promise<RestaurantsResponse> {
  const p = new URLSearchParams()
  p.set('lat', String(lat))
  p.set('lng', String(lng))
  if (params.budget) params.budget.forEach(b => p.append('budget', b))
  if (params.cuisine) params.cuisine.forEach(c => p.append('cuisine', c))
  if (params.maxDistanceKm) p.set('max_distance_km', String(params.maxDistanceKm))
  if (params.vibe) p.set('vibe', params.vibe)
  if (params.shuffle) p.set('shuffle', 'true')
  if (params.excludeSwiped !== undefined) p.set('exclude_swiped', String(params.excludeSwiped))
  if (params.limit) p.set('limit', String(params.limit))
  if (params.offset) p.set('offset', String(params.offset))

  const { data } = await api.get<RestaurantsResponse>(`/api/restaurants?${p}`)
  return data
}

export async function searchRestaurants(
  lat: number,
  lng: number,
  params: {
    q?: string
    sort?: string
    tag?: string
    cuisine?: string
    limit?: number
    offset?: number
  } = {}
): Promise<RestaurantsResponse> {
  const p = new URLSearchParams()
  p.set('lat', String(lat))
  p.set('lng', String(lng))
  p.set('exclude_swiped', 'false')
  p.set('max_distance_km', '25')
  if (params.q) p.set('q', params.q)
  if (params.sort) p.set('sort', params.sort)
  if (params.tag) p.set('tag', params.tag)
  if (params.cuisine) p.append('cuisine', params.cuisine)
  if (params.limit !== undefined) p.set('limit', String(params.limit))
  if (params.offset !== undefined) p.set('offset', String(params.offset))

  const { data } = await api.get<RestaurantsResponse>(`/api/restaurants?${p}`)
  return data
}

export async function recordSwipe(restaurantId: string, direction: 'left' | 'right', vibe?: string): Promise<void> {
  await api.post('/api/swipes', { restaurant_id: restaurantId, direction, vibe: vibe ?? null })
}

export async function bookmarkRestaurant(restaurantId: string): Promise<{ saved: boolean }> {
  const { data } = await api.post<{ saved: boolean }>('/api/saves', { restaurant_id: restaurantId })
  return data
}

export async function fetchRandomRestaurant(params: {
  lat: number; lng: number; maxDistanceKm?: number
  cuisine?: string; tag?: string; q?: string
}): Promise<RestaurantDetail> {
  const p = new URLSearchParams({ lat: String(params.lat), lng: String(params.lng) })
  if (params.maxDistanceKm) p.set('max_distance_km', String(params.maxDistanceKm))
  if (params.cuisine) p.set('cuisine', params.cuisine)
  if (params.tag) p.set('tag', params.tag)
  if (params.q) p.set('q', params.q)
  const { data } = await api.get<RestaurantDetail>(`/api/restaurants/random?${p}`)
  return data
}

export async function confirmRisk(): Promise<{ gambler_count: number; badge_unlocked: boolean }> {
  const { data } = await api.post<{ gambler_count: number; badge_unlocked: boolean }>('/api/profile/take-risk')
  return data
}

export async function lockInRestaurant(restaurantId: string): Promise<void> {
  await api.post('/api/saves/pick', { restaurant_id: restaurantId })
}

export interface NudgeResponse {
  nudge: {
    saveId: string
    isFollowup: boolean
    restaurant: RestaurantDetail
  } | null
}

export async function fetchNudge(lat?: number, lng?: number): Promise<NudgeResponse> {
  const p = new URLSearchParams()
  if (lat) p.set('lat', String(lat))
  if (lng) p.set('lng', String(lng))
  const { data } = await api.get<NudgeResponse>(`/api/saves/nudge?${p}`)
  return data
}

export async function snoozeNudge(saveId: string): Promise<void> {
  await api.post(`/api/saves/${saveId}/snooze`)
}

export async function dismissNudge(saveId: string): Promise<void> {
  await api.post(`/api/saves/${saveId}/dismiss-nudge`)
}

export async function resetSwipeHistory(): Promise<{ cleared: number }> {
  const { data } = await api.delete('/api/swipes/history')
  return data
}

export interface SavedItem {
  saveId: string
  savedAt: string
  status: 'want_to_go' | 'been_here'
  restaurant: RestaurantDetail
}

export interface SavesResponse {
  saves: SavedItem[]
  total: number
}

export async function fetchSaves(params: {
  status?: 'want_to_go' | 'been_here' | 'all'
  lat?: number
  lng?: number
} = {}): Promise<SavesResponse> {
  const p = new URLSearchParams()
  if (params.status) p.set('status', params.status)
  if (params.lat) p.set('lat', String(params.lat))
  if (params.lng) p.set('lng', String(params.lng))
  const { data } = await api.get<SavesResponse>(`/api/saves?${p}`)
  return data
}

export async function deleteSave(saveId: string): Promise<void> {
  await api.delete(`/api/saves/${saveId}`)
}

export interface VisitResponse {
  visit: {
    id: string
    restaurantId: string
    starRating: number
    wouldReturn: string
    visitedAt: string
  }
  badgesUnlocked: string[]
}

export interface ProfileStats {
  visits: number
  swipes: number
  saves: number
  cuisines_tried: number
  favourite_cuisine: string | null
  favourite_vibe: string | null
  adventure_score: 'comfort_zone' | 'open_minded' | 'adventurous' | 'full_send' | null
  badges_earned: string[]
}

export interface TasteDNA {
  empty: boolean
  total_visits: number
  cuisine_breakdown: { cuisine: string; count: number; pct: number }[]
  price_breakdown: { tier: number; label: string; count: number; pct: number }[]
  top_neighbourhoods: { name: string; count: number }[]
  avg_rating_given: number | null
  most_visited: { name: string; count: number; emoji: string }[]
  would_return_breakdown: { definitely?: number; maybe?: number; probably_not?: number }
}

export async function fetchTasteDNA(year?: number): Promise<TasteDNA> {
  const p = year ? `?year=${year}` : ''
  const { data } = await api.get<TasteDNA>(`/api/profile/taste-dna${p}`)
  return data
}

export async function fetchProfileStats(year?: number): Promise<ProfileStats> {
  const p = year ? `?year=${year}` : ''
  const { data } = await api.get<ProfileStats>(`/api/profile/stats${p}`)
  return data
}

export async function recordVisit(
  restaurantId: string,
  starRating: number,
  wouldReturn: 'definitely' | 'maybe' | 'probably_not',
): Promise<VisitResponse> {
  const { data } = await api.post<VisitResponse>('/api/visits', {
    restaurant_id: restaurantId,
    star_rating: starRating,
    would_return: wouldReturn,
  })
  return data
}
