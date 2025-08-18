'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function AuthCallback() {
  const [msg, setMsg] = useState('Finishing sign-in…')

  useEffect(() => {
    (async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)
      if (error) { setMsg(`Error: ${error.message}`) }
      else { window.location.replace('/profile') }
    })()
  }, [])

  return <p className="text-sm text-gray-700">{msg}</p>
}
