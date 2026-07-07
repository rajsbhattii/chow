import { GoogleLogin } from '@react-oauth/google'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

export default function GoogleButton() {
  const { login } = useAuth()
  const navigate = useNavigate()

  return (
    <GoogleLogin
      onSuccess={async ({ credential }) => {
        if (!credential) return
        try {
          const { data } = await api.post('/api/auth/google', { id_token: credential })
          login(data.access_token, data.refresh_token, data.user)
          navigate(data.is_new_user ? '/onboarding' : '/home', { replace: true })
        } catch {
          // silently fail
        }
      }}
      onError={() => {}}
      width="100%"
      text="continue_with"
      shape="rectangular"
      theme="outline"
    />
  )
}
