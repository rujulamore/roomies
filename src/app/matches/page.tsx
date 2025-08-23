'use client'
import { useEffect, useState, useCallback} from 'react'
import { supabase } from '@/lib/supabaseClient'
import { compatScore, type Candidate, type Me } from '@/lib/score'
import { useRouter } from 'next/navigation'

export default function MatchesPage() {
  const [rows, setRows] = useState<(Candidate & { _score: number })[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()

  const startDM = useCallback(async (partnerId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/signin'); return }
    const { data: cid, error } = await supabase.rpc('get_or_create_dm', { _partner: partnerId })
    if (error) { alert(error.message); return }
    router.push(`/messages/${cid}`)
  }, [router])

  useEffect(() => {
    (async () => {
      setLoading(true)

      // 1) who’s logged in?
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { location.href = '/signin'; return }
      setUserId(user.id)

      // 2) load my profile row
      const { data: mine, error: meErr } = await supabase.from('profiles')
        .select('*').eq('id', user.id).maybeSingle()
      if (meErr) { setErr(meErr.message); setLoading(false); return }
      if (!mine) { location.href = '/profile'; return }

      // 3) make a tiny object that scoring needs
      const me: Me = {
        city: mine.city,
        budget_min: mine.budget_min,
        budget_max: mine.budget_max,
        lifestyle_tags: mine.lifestyle_tags || [],
        has_pets: !!mine.has_pets,
      }

      // Pull public candidates via RPC (up to 100)
      const { data: candidates, error: rpcErr } = await supabase.rpc('search_public_profiles', {
        _city: null, _min: null, _max: null, _tags: null
      })
      if (rpcErr) { setErr(rpcErr.message); setLoading(false); return }

      // 5) score everyone, sort, keep 20
      const scored = (candidates as Candidate[])
        .filter(c => c.id !== user.id)
        .map(c => ({ ...c, _score: compatScore(me, c) }))
        .sort((a,b) => b._score - a._score)
        .slice(0, 20)

      setRows(scored)
      setLoading(false)
    })()
    
  }, [])

  if (loading) return <p>Loading matches…</p>
  if (err) return <p className="text-red-600 text-sm">Error: {err}</p>

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Top Matches</h1>
      <ul className="grid sm:grid-cols-2 gap-4">
        {rows.map(p => (
          <li key={p.id} className="border bg-white rounded p-4">
            <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <img
                src={`${
                  supabase.storage.from('avatars').getPublicUrl(`${p.id}/profile.jpg`).data.publicUrl
                }`}
                alt="avatar"
                className="w-10 h-10 rounded-full object-cover border bg-white"
              />
              <div>
                <h3 className="font-semibold">{p.display_name}</h3>
                <div className="text-sm text-gray-600">{p.city} · ${p.budget_min}-{p.budget_max} · Move-in {p.move_in_date}</div>
              </div>
            </div>
          </div>

            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{p.display_name}</h3>
                <div className="text-sm text-gray-600">
                  {p.city} · ${p.budget_min}-{p.budget_max} · Move-in {p.move_in_date}
                </div>
              </div>
              <span className="text-xs px-2 py-1 rounded border">Score {p._score}</span>
            </div>
            {p.bio && <p className="text-sm mt-2">{p.bio}</p>}
            <div className="flex flex-wrap gap-2 mt-2">
              {p.lifestyle_tags?.map(t => (
                <span key={t} className="text-xs border rounded px-2 py-1">{t}</span>
              ))}
              {p.has_pets && <span className="text-xs border rounded px-2 py-1">has pets</span>}
            </div>

            {userId && userId !== p.id && (
              <div className="mt-3 flex gap-2">
                <button
                  className="text-xs px-2 py-1 border rounded"
                  onClick={() => startDM(p.id)}
                >
                  Message
                </button>
                </div>)}
          </li>
        ))}
        {rows.length === 0 && <p>No matches yet—add city/tags/budget in your profile.</p>}
      </ul>
    </div>
  )
}
