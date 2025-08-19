'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type RequestRow = {
  id: number
  sender: string
  receiver: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
}

type ProfileLite = { id: string; display_name: string }

export default function RequestsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [incoming, setIncoming] = useState<(RequestRow & { from?: ProfileLite })[]>([])
  const [outgoing, setOutgoing] = useState<(RequestRow & { to?: ProfileLite })[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { location.href = '/signin'; return }
      setUserId(user.id)

      // Fetch incoming/outgoing under RLS
      const [inc, out] = await Promise.all([
        supabase.from('contact_requests').select('*').eq('receiver', user.id).order('created_at', { ascending: false }),
        supabase.from('contact_requests').select('*').eq('sender', user.id).order('created_at', { ascending: false }),
      ])
      if (inc.error) { setErr(inc.error.message); setLoading(false); return }
      if (out.error) { setErr(out.error.message); setLoading(false); return }

      // Join minimal names for nicer UI (public RPC returns names safely)
      async function names(ids: string[]) {
        const unique = Array.from(new Set(ids))
        if (unique.length === 0) return new Map<string, ProfileLite>()
        // We can use RPC with null filters, then map by id
        const { data } = await supabase.rpc('search_public_profiles', { _city: null, _min: null, _max: null, _tags: null })
        const map = new Map<string, ProfileLite>()
        for (const p of (data || [])) {
          if (unique.includes(p.id)) map.set(p.id, { id: p.id, display_name: p.display_name })
        }
        return map
      }

      const incIds = (inc.data || []).map(r => r.sender)
      const outIds = (out.data || []).map(r => r.receiver)
      const [incMap, outMap] = await Promise.all([names(incIds), names(outIds)])

      setIncoming((inc.data || []).map(r => ({ ...r, from: incMap.get(r.sender) })))
      setOutgoing((out.data || []).map(r => ({ ...r, to: outMap.get(r.receiver) })))
      setLoading(false)
    })()
  }, [])

  async function updateStatus(id: number, status: 'accepted' | 'declined') {
    const { error } = await supabase.from('contact_requests').update({ status }).eq('id', id)
    if (error) alert(error.message)
    // refresh lists
    location.reload()
  }

  if (loading) return <p>Loading requests…</p>
  if (err) return <p className="text-red-600 text-sm">Error: {err}</p>
  if (!userId) return null

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Requests</h1>

      <section>
        <h2 className="font-medium mb-2">Incoming</h2>
        <ul className="space-y-2">
          {incoming.map(r => (
            <li key={r.id} className="border bg-white rounded p-3 flex items-center justify-between">
              <div className="text-sm">
                <div><b>{r.from?.display_name || r.sender}</b> → You</div>
                <div className="text-gray-600">Status: {r.status}</div>
              </div>
              <div className="flex gap-2">
                {r.status === 'pending' && (
                  <>
                    <button className="text-xs px-2 py-1 border rounded" onClick={()=>updateStatus(r.id,'accepted')}>Accept</button>
                    <button className="text-xs px-2 py-1 border rounded" onClick={()=>updateStatus(r.id,'declined')}>Decline</button>
                  </>
                )}
              </div>
            </li>
          ))}
          {incoming.length === 0 && <p className="text-sm text-gray-600">No incoming requests.</p>}
        </ul>
      </section>

      <section>
        <h2 className="font-medium mb-2">Outgoing</h2>
        <ul className="space-y-2">
          {outgoing.map(r => (
            <li key={r.id} className="border bg-white rounded p-3 flex items-center justify-between">
              <div className="text-sm">
                <div>You → <b>{r.to?.display_name || r.receiver}</b></div>
                <div className="text-gray-600">Status: {r.status}</div>
              </div>
            </li>
          ))}
          {outgoing.length === 0 && <p className="text-sm text-gray-600">No outgoing requests.</p>}
        </ul>
      </section>
    </div>
  )
}
