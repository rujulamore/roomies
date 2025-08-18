'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { z } from 'zod'

const TAGS = ['early-riser','night-owl','pet-friendly','non-smoker','cleanliness','quiet','gym','vegan'] as const
const TAGS_TUPLE = TAGS 

const ProfileSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string().trim().min(1, 'Display name is required'),
  bio: z.string().trim().max(500).optional().or(z.literal('')),
  city: z.string().trim().min(1, 'City is required'),
  budget_min: z.number().int().nonnegative(),
  budget_max: z.number().int().nonnegative(),
  move_in_date: z
    .string()
    .refine(v => !Number.isNaN(Date.parse(v)), { message: 'Invalid move-in date' }),
  lifestyle_tags: z.array(z.enum(TAGS_TUPLE)).max(10),
  has_pets: z.boolean(),
}).refine(v => v.budget_min <= v.budget_max, {
  message: 'Min budget must be ≤ max budget',
  path: ['budget_min'],
})

type Profile = {
  id: string
  display_name: string
  bio: string | null
  city: string
  budget_min: number
  budget_max: number
  move_in_date: string
  lifestyle_tags: string[]
  has_pets: boolean
}

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [p, setP] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/signin'
        return
      }
      setUserId(user.id)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
      if (error) console.error(error)
      setP(data ?? {
        id: user.id,
        display_name: '',
        bio: '',
        city: '',
        budget_min: 500,
        budget_max: 1000,
        move_in_date: new Date().toISOString().slice(0,10),
        lifestyle_tags: [],
        has_pets: false,
      })
      setLoading(false)
    })()
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!p || !userId) return
    const parsed = ProfileSchema.safeParse(p)
    if (!parsed.success) {
      const err = parsed.error.issues[0]
      setMessage(`${err.path.join('.')}: ${err.message}`)
      return
    }

    setMessage('Saving…')
    const { error } = await supabase.from('profiles').upsert(parsed.data)
    setMessage(error ? `Error: ${error.message}` : 'Saved!')
  }

  if (loading || !p) return <p>Loading…</p>

  return (
    <form onSubmit={save} className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-semibold">My Profile</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block text-sm">Display name
          <input className="w-full border rounded px-3 py-2" value={p.display_name}
            onChange={(e)=>setP({...p, display_name: e.target.value})} required />
        </label>
        <label className="block text-sm">City
          <input className="w-full border rounded px-3 py-2" value={p.city}
            onChange={(e)=>setP({...p, city: e.target.value})} required />
        </label>
        <label className="block text-sm">Budget min ($)
          <input type="number" className="w-full border rounded px-3 py-2" value={p.budget_min}
            onChange={(e)=>setP({...p, budget_min: Number(e.target.value)})} required />
        </label>
        <label className="block text-sm">Budget max ($)
          <input type="number" className="w-full border rounded px-3 py-2" value={p.budget_max}
            onChange={(e)=>setP({...p, budget_max: Number(e.target.value)})} required />
        </label>
        <label className="block text-sm">Move-in date
          <input type="date" className="w-full border rounded px-3 py-2" value={p.move_in_date}
            onChange={(e)=>setP({...p, move_in_date: e.target.value})} required />
        </label>
        <label className="flex items-center gap-2 text-sm mt-6">
          <input type="checkbox" checked={p.has_pets}
            onChange={(e)=>setP({...p, has_pets: e.target.checked})} /> Has pets
        </label>
      </div>

      <label className="block text-sm">Bio
        <textarea className="w-full border rounded px-3 py-2" rows={4} value={p.bio ?? ''}
          onChange={(e)=>setP({...p, bio: e.target.value})} />
      </label>

      <div className="text-sm">Lifestyle tags</div>
      <div className="flex flex-wrap gap-2">
        {TAGS.map(t => (
          <label key={t} className={`px-3 py-1 border rounded cursor-pointer ${p.lifestyle_tags.includes(t) ? 'bg-black text-white' : ''}`}>
            <input type="checkbox" className="hidden" checked={p.lifestyle_tags.includes(t)}
              onChange={() => setP({
                ...p,
                lifestyle_tags: p.lifestyle_tags.includes(t)
                  ? p.lifestyle_tags.filter(x=>x!==t)
                  : [...p.lifestyle_tags, t]
              })}
            /> {t}
          </label>
        ))}
      </div>

      <div className="flex gap-3">
        <button className="px-4 py-2 rounded bg-black text-white">Save</button>
        <button type="button" className="px-4 py-2 rounded border" onClick={async()=>{
          await supabase.auth.signOut();
          window.location.href = '/';
        }}>Sign out</button>
      </div>

      {message && <p className="text-sm text-gray-700">{message}</p>}
    </form>
  )
}
