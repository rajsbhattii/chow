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

export async function recordSwipe(restaurantId: string, direction: 'left' | 'right'): Promise<void> {
  await api.post('/api/swipes', { restaurant_id: restaurantId, direction })
}

export async function bookmarkRestaurant(restaurantId: string): Promise<{ saved: boolean }> {
  const { data } = await api.post<{ saved: boolean }>('/api/saves', { restaurant_id: restaurantId })
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
