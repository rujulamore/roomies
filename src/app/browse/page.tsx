'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type PublicProfile = {
  id: string
  display_name: string
  city: string
  budget_min: number
  budget_max: number
  move_in_date: string
  lifestyle_tags: string[]
  has_pets: boolean
  bio: string
}

export default function Browse() {
  const [city, setCity] = useState('')
  const [min, setMin] = useState<number | ''>('')
  const [max, setMax] = useState<number | ''>('')
  const [tags, setTags] = useState<string>('')
  const [results, setResults] = useState<PublicProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
  }, []);

  async function sendRequest(receiverId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { location.href = '/signin'; return; }
    const { error } = await supabase.from('contact_requests').insert({ sender: user.id, receiver: receiverId });
    if (error?.code === '23505') { alert('Request already sent.'); return; } // unique(sender,receiver)
    alert(error ? error.message : 'Request sent!');
  }


  async function search() {
  setLoading(true)
  const payload = {
    _city: city ? `%${city}%` : null,
    _min:  min === '' ? null : Number(min),
    _max:  max === '' ? null : Number(max),
    _tags: tags.trim() ? tags.split(',').map(s => s.trim()) : null,
  }

  const resp = await fetch('/api/browse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!resp.ok) {
    const err = await resp.text()
    console.error('API /browse failed:', resp.status, err)
    alert(`Browse failed: ${resp.status}`)
    setResults([])
    setLoading(false)
    return
  }

  const rows = await resp.json()
  // Route returns the raw array; but handle {data:[]} just in case
  setResults(Array.isArray(rows) ? rows : (rows?.data ?? []))
  setLoading(false)
}


  useEffect(() => { search() }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Browse</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input placeholder="City" className="border rounded px-3 py-2" value={city} onChange={(e)=>setCity(e.target.value)} />
        <input placeholder="Min budget" type="number" className="border rounded px-3 py-2" value={min} onChange={(e)=>setMin(e.target.value === '' ? '' : Number(e.target.value))} />
        <input placeholder="Max budget" type="number" className="border rounded px-3 py-2" value={max} onChange={(e)=>setMax(e.target.value === '' ? '' : Number(e.target.value))} />
        <input placeholder="Tags (comma separated)" className="border rounded px-3 py-2" value={tags} onChange={(e)=>setTags(e.target.value)} />
      </div>
      <button onClick={search} className="px-4 py-2 rounded bg-black text-white">Search</button>

      {loading ? <p>Loading…</p> : (
        <ul className="grid sm:grid-cols-2 gap-4 mt-4">
          {results.map(p => (
            <li key={p.id} className="border bg-white rounded p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{p.display_name}</h3>
                  <div className="text-sm text-gray-600">{p.city} · ${p.budget_min}-{p.budget_max} · Move-in {p.move_in_date}</div>
                </div>
              </div>
              {p.bio && <p className="text-sm mt-2">{p.bio}</p>}
              <div className="flex flex-wrap gap-2 mt-2">
                {p.lifestyle_tags?.map(t => (
                  <span key={t} className="text-xs border rounded px-2 py-1">{t}</span>
                ))}
                {p.has_pets && <span className="text-xs border rounded px-2 py-1">has pets</span>}
              </div>
              {userId && userId !== p.id && (
                <div className="mt-3">
                  <button
                    className="text-xs px-2 py-1 border rounded"
                    onClick={() => sendRequest(p.id)}
                  >
                    Connect
                  </button>
                </div>
              )}
            </li>
          ))}
          {results.length === 0 && !loading && <p>No results yet. Try broader filters.</p>}
        </ul>
      )}
    </div>
  )
}
