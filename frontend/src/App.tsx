import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Welcome from './pages/auth/Welcome'
import Login from './pages/auth/Login'
import Onboarding from './pages/auth/Onboarding'
import Signup from './pages/auth/Signup'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import Explore from './pages/Explore'
import Home from './pages/Home'
import Profile from './pages/Profile'
import Saved from './pages/Saved'
import Tournament from './pages/Tournament'

export default function App() {
  return (
    <GoogleOAuthProvider clientId="318643758270-3tups7godtjrn848na8r1oh3htvntbni.apps.googleusercontent.com">
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Welcome />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Semi-protected: onboarding requires auth but not active status */}
            <Route element={<ProtectedRoute />}>
              <Route path="/onboarding" element={<Onboarding />} />
            </Route>

            {/* Protected main app */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/home" element={<Home />} />
                <Route path="/tournament" element={<Tournament />} />
                <Route path="/saved" element={<Saved />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/profile" element={<Profile />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
    </GoogleOAuthProvider>
  )
}
