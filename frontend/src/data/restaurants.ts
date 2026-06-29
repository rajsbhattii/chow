export interface RestaurantBasic {
  id: string
  name: string
  cuisine: string
  priceScale: number
  distance: string
  rating: number
  imageUrl: string
}

export interface Review {
  author: string
  rating: number
  date: string
  text: string
}

export interface RestaurantDetail extends RestaurantBasic {
  reviewCount: number
  address: string
  neighborhood: string
  phone: string
  website: string
  hours: Record<string, string>
  tags: string[]
  reviews: Review[]
}

export const MOCK_RESTAURANTS: RestaurantDetail[] = [
  {
    id: 'momofuku',
    name: 'Momofuku Noodle Bar',
    cuisine: 'Japanese',
    priceScale: 2,
    distance: '0.8 km',
    rating: 4.7,
    reviewCount: 1842,
    imageUrl: 'https://picsum.photos/seed/ramen/1200/700',
    address: '171 First Avenue, East Village, New York, NY 10003',
    neighborhood: 'East Village',
    phone: '+1 (212) 777-7773',
    website: 'momofuku.com',
    hours: {
      Monday: '12:00 PM – 10:00 PM',
      Tuesday: '12:00 PM – 10:00 PM',
      Wednesday: '12:00 PM – 10:00 PM',
      Thursday: '12:00 PM – 11:00 PM',
      Friday: '12:00 PM – 12:00 AM',
      Saturday: '11:00 AM – 12:00 AM',
      Sunday: '11:00 AM – 10:00 PM',
    },
    tags: ['Ramen', 'Noodles', 'Trendy', 'Good for groups', 'No reservations', 'Busy nights'],
    reviews: [
      {
        author: 'Sarah M.',
        rating: 5,
        date: '2 weeks ago',
        text: 'The ramen here is absolutely incredible. Rich broth, perfectly chewy noodles, and the pork belly just melts in your mouth. Had to wait 45 minutes but completely worth it.',
      },
      {
        author: 'James K.',
        rating: 4,
        date: '1 month ago',
        text: 'Solid spot, classic New York energy. The ssäm platter is a must. Service can be a little rushed but the food makes up for it.',
      },
      {
        author: 'Priya L.',
        rating: 5,
        date: '1 month ago',
        text: 'Been here three times now. Every time is great. The bo ssäm is life-changing. Get here early or expect a wait.',
      },
    ],
  },
]

export function getRestaurantById(id: string): RestaurantDetail | undefined {
  return MOCK_RESTAURANTS.find(r => r.id === id)
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export async function fetchNearbyRestaurants(lat: number, lng: number): Promise<RestaurantDetail[]> {
  const resp = await fetch(`${API_URL}/api/restaurants/nearby?lat=${lat}&lng=${lng}`)
  if (!resp.ok) throw new Error(`Places API error: ${resp.status}`)
  return resp.json()
}
