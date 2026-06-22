import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/auth/Login'
import Onboarding from './pages/auth/Onboarding'
import Signup from './pages/auth/Signup'
import Explore from './pages/Explore'
import Home from './pages/Home'
import Profile from './pages/Profile'
import Saved from './pages/Saved'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Main app */}
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
