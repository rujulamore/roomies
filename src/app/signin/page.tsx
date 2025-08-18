'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  async function magic(e: React.FormEvent) {
    e.preventDefault()
    setStatus('Sending magic link…')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }, // IMPORTANT (see below)
    })
    setStatus(error ? `Error: ${error.message}` : 'Check your email for the sign-in link.')
  }

  async function pwd(e: React.FormEvent) {
    e.preventDefault()
    setStatus('Signing in…')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setStatus(`Error: ${error.message}`)
    else window.location.href = '/profile'
  }

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-xl font-semibold">Sign in</h1>

      {/* Password sign-in */}
      <form onSubmit={pwd} className="space-y-3">
        <input type="email" required value={email} onChange={e=>setEmail(e.target.value)}
               placeholder="you@example.com" className="w-full border rounded px-3 py-2" />
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
               placeholder="Password" className="w-full border rounded px-3 py-2" />
        <button className="px-4 py-2 rounded bg-black text-white">Sign in</button>
      </form>

      <div className="text-xs text-gray-500">Seeded users: demo1@roomieboard.dev / Password123!</div>

      <hr className="my-4" />

      {/* Magic link (optional) */}
      <form onSubmit={magic} className="space-y-3">
        <input type="email" required value={email} onChange={e=>setEmail(e.target.value)}
               placeholder="you@example.com" className="w-full border rounded px-3 py-2" />
        <button className="px-4 py-2 rounded border">Send magic link</button>
      </form>

      {status && <p className="text-sm text-gray-700">{status}</p>}
    </div>
  )
}
