'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

type Row = {
  conversation_id: string
  partner_id: string
  partner_name: string
  last_message: string
  last_at: string | null
  unread_count: number
}

export default function MessagesIndex() {
  const [rows, setRows] = useState<Row[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { location.href = '/signin'; return }
      const { data, error } = await supabase.rpc('my_conversations')
      if (error) setErr(error.message)
      else setRows((data || []) as Row[])
      setLoading(false)
    })()
  }, [])

  if (loading) return <p>Loading conversations…</p>
  if (err) return <p className="text-red-600 text-sm">Error: {err}</p>

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold">Messages</h1>
      <ul className="divide-y rounded border bg-white">
        {rows.map(r => (
          <li key={r.conversation_id} className="p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{r.partner_name || r.partner_id}</div>
              <div className="text-sm text-gray-600 line-clamp-1">{r.last_message || 'No messages yet'}</div>
            </div>
            <div className="flex items-center gap-3">
              {r.unread_count > 0 && (
                <span className="text-xs px-2 py-1 rounded-full border">{r.unread_count}</span>
              )}
              <Link className="text-sm px-3 py-1 border rounded" href={`/messages/${r.conversation_id}`}>Open</Link>
            </div>
          </li>
        ))}
        {rows.length === 0 && <li className="p-3 text-sm text-gray-600">No conversations yet.</li>}
      </ul>
    </div>
  )
}
