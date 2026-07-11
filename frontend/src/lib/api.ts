import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('chow_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Token refresh interceptor ──────────────────────────────────────────────────
// When the access token expires (1 hour TTL), silently refresh it and replay
// the original request. Multiple concurrent 401s share one refresh call.

let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

function drainQueue(newToken: string) {
  refreshQueue.forEach(resolve => resolve(newToken))
  refreshQueue = []
}

api.interceptors.response.use(
  res => res,
  async error => {
    const original = error.config
    const status = error.response?.status

    // Only intercept 401s that haven't already been retried
    if (status !== 401 || original._retried) {
      return Promise.reject(error)
    }

    const refreshToken = localStorage.getItem('chow_refresh_token')
    if (!refreshToken) {
      logout()
      return Promise.reject(error)
    }

    if (isRefreshing) {
      // Another request is already refreshing — queue this one
      return new Promise(resolve => {
        refreshQueue.push((token: string) => {
          original.headers.Authorization = `Bearer ${token}`
          resolve(api(original))
        })
      })
    }

    original._retried = true
    isRefreshing = true

    try {
      const { data } = await axios.post(
        `${api.defaults.baseURL}/api/auth/refresh`,
        { refresh_token: refreshToken },
      )
      const newToken: string = data.access_token
      localStorage.setItem('chow_token', newToken)
      api.defaults.headers.common.Authorization = `Bearer ${newToken}`
      drainQueue(newToken)
      original.headers.Authorization = `Bearer ${newToken}`
      return api(original)
    } catch {
      logout()
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  },
)

function logout() {
  localStorage.removeItem('chow_token')
  localStorage.removeItem('chow_refresh_token')
  localStorage.removeItem('chow_user')
  localStorage.removeItem('chow_onboarding_draft')
  window.location.href = '/login'
}

export default api
