import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // TODO: call POST /auth/login
    navigate('/')
  }

  return (
    <div className="flex flex-col min-h-svh bg-white px-6 pt-20 pb-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Welcome back</h1>
        <p className="text-zinc-500 mt-1">Sign in to find your next meal.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-700">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-700">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition"
          />
        </div>

        <button
          type="submit"
          className="mt-2 w-full rounded-xl bg-orange-500 py-3.5 text-sm font-semibold text-white active:opacity-80 transition"
        >
          Sign in
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        No account?{' '}
        <Link to="/signup" className="font-semibold text-orange-500">
          Sign up
        </Link>
      </p>
    </div>
  )
}
