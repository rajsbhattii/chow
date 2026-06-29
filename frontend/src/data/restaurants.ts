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
  if (params.excludeSwiped !== undefined) p.set('exclude_swiped', String(params.excludeSwiped))
  if (params.limit) p.set('limit', String(params.limit))
  if (params.offset) p.set('offset', String(params.offset))

  const { data } = await api.get<RestaurantsResponse>(`/api/restaurants?${p}`)
  return data
}

export async function recordSwipe(restaurantId: string, direction: 'left' | 'right'): Promise<{ saved: boolean }> {
  const { data } = await api.post('/api/swipes', { restaurant_id: restaurantId, direction })
  return data
}
