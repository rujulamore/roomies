'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Listing = {
  id: string
  owner: string
  title: string
  description: string | null
  city: string
  address: string | null
  rent: number
  bedrooms: number | null
  bathrooms: number | null
  move_in_date: string | null
  url: string | null
  created_at: string
}

type External = {
  id: number
  owner: string
  url: string
  title: string | null
  image_url: string | null
  site_name: string | null
  city: string | null
  rent: number | null
  created_at: string
}

export default function ApartmentsPage() {
  const [userId, setUserId] = useState<string | null>(null)

  // Host listing form state
  const [form, setForm] = useState<Partial<Listing>>({
    title: '', city: '', rent: 0, bedrooms: 1, bathrooms: 1, move_in_date: ''
  })
  const [hostSaving, setHostSaving] = useState(false)

  // External link form state
  const [linkUrl, setLinkUrl] = useState('')
  const [linkSaving, setLinkSaving] = useState(false)

  // Filters
  const [city, setCity] = useState('')
  const [min, setMin] = useState<number | ''>('')
  const [max, setMax] = useState<number | ''>('')

  // Data
  const [listings, setListings] = useState<Listing[]>([])
  const [externals, setExternals] = useState<External[]>([])
  const [tab, setTab] = useState<'listings' | 'links'>('listings')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null))
    refresh()
  }, [])

  async function refresh() {
    const [a, b] = await Promise.all([
      supabase.from('listings').select('*').order('created_at', { ascending: false }),
      supabase.from('external_listings').select('*').order('created_at', { ascending: false })
    ])
    if (!a.error && a.data) setListings(a.data as Listing[])
    if (!b.error && b.data) setExternals(b.data as any)
  }

  async function saveListing(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) { location.href = '/signin'; return }
    if (!form.title || !form.city || !form.rent) { alert('Title, City, and Rent are required.'); return }
    setHostSaving(true)
    const payload = {
      owner: userId,
      title: form.title!,
      description: form.description || '',
      city: form.city!,
      address: form.address || '',
      rent: Number(form.rent),
      bedrooms: form.bedrooms ?? null,
      bathrooms: form.bathrooms ?? null,
      move_in_date: form.move_in_date || null,
      url: form.url || null,
    }
    const { error } = await supabase.from('listings').insert(payload)
    setHostSaving(false)
    if (error) { alert(error.message); return }
    setForm({ title:'', city:'', rent:0, bedrooms:1, bathrooms:1, move_in_date:'' })
    await refresh()
  }

  async function addLink(e: React.FormEvent) {
  e.preventDefault()
  if (!userId) { location.href = '/signin'; return }
  const raw = linkUrl.trim()
  if (!raw) return
  setLinkSaving(true)

  // 1) fetch OG + canonical
  const resp = await fetch('/api/og', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: raw }),
  })
  const og = await resp.json()
  if (!resp.ok) { setLinkSaving(false); alert(og.error || 'OG fetch failed'); return }

  const canonical = og.canonical || og.url

  // 2) fast path: is it already in the table?
  let { data: existing, error: selErr } = await supabase
    .from('external_listings')
    .select('*')
    .eq('url_canonical', canonical)
    .maybeSingle()

  if (selErr) { setLinkSaving(false); alert(selErr.message); return }

  // 3) if not, try to insert (owner = me). Handle race (unique violation).
  if (!existing) {
    const { data: inserted, error: insErr } = await supabase
      .from('external_listings')
      .insert({
        owner: userId,
        url_canonical: canonical,
        url: og.url,
        title: og.title || null,
        image_url: og.image || null,
        site_name: og.site || null,
        city: null,
        rent: null,
      })
      .select()
      .single()

    if (insErr) {
      // someone else inserted first → re-select and proceed
      if ((insErr as any).code === '23505') {
        const again = await supabase
          .from('external_listings')
          .select('*')
          .eq('url_canonical', canonical)
          .maybeSingle()
        existing = again.data ?? null
      } else {
        setLinkSaving(false)
        alert(insErr.message)
        return
      }
    } else {
      existing = inserted
    }
  }

  setLinkSaving(false)
  setLinkUrl('')
  await refresh() // reload list
  // Optional UX: toast “Already added” if we hit the dedupe path
}


  const filtered = listings.filter(l => {
    const mCity = city ? l.city.toLowerCase().includes(city.toLowerCase()) : true
    const mMin = min === '' ? true : l.rent >= Number(min)
    const mMax = max === '' ? true : l.rent <= Number(max)
    return mCity && mMin && mMax
  })

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Apartments</h1>

      {/* Tabs */}
      <div className="flex gap-2">
        <button className={`px-3 py-1 border rounded ${tab==='listings' ? 'bg-black text-white' : ''}`} onClick={()=>setTab('listings')}>Host Listings</button>
        <button className={`px-3 py-1 border rounded ${tab==='links' ? 'bg-black text-white' : ''}`} onClick={()=>setTab('links')}>Web Links</button>
      </div>

      {tab === 'listings' ? (
        <>
          {/* Host form */}
          <form onSubmit={saveListing} className="grid md:grid-cols-2 gap-3 border rounded p-4 bg-white">
            <input className="border rounded px-3 py-2" placeholder="Title" value={form.title || ''} onChange={e=>setForm(f=>({...f, title:e.target.value}))} required />
            <input className="border rounded px-3 py-2" placeholder="City" value={form.city || ''} onChange={e=>setForm(f=>({...f, city:e.target.value}))} required />
            <input type="number" className="border rounded px-3 py-2" placeholder="Rent ($)" value={form.rent || 0} onChange={e=>setForm(f=>({...f, rent:Number(e.target.value)}))} required />
            <div className="flex gap-3">
              <input type="number" className="border rounded px-3 py-2 w-full" placeholder="Bedrooms" value={form.bedrooms ?? 1} onChange={e=>setForm(f=>({...f, bedrooms:Number(e.target.value)}))} />
              <input type="number" step="0.5" className="border rounded px-3 py-2 w-full" placeholder="Bathrooms" value={form.bathrooms ?? 1} onChange={e=>setForm(f=>({...f, bathrooms:Number(e.target.value)}))} />
            </div>
            <input type="date" className="border rounded px-3 py-2" value={form.move_in_date || ''} onChange={e=>setForm(f=>({...f, move_in_date:e.target.value}))} />
            <input className="border rounded px-3 py-2" placeholder="Optional: Source URL" value={form.url || ''} onChange={e=>setForm(f=>({...f, url:e.target.value}))} />
            <input className="md:col-span-2 border rounded px-3 py-2" placeholder="Address (optional)" value={form.address || ''} onChange={e=>setForm(f=>({...f, address:e.target.value}))} />
            <textarea className="md:col-span-2 border rounded px-3 py-2" placeholder="Description" rows={3} value={form.description || ''} onChange={e=>setForm(f=>({...f, description:e.target.value}))} />
            <div className="md:col-span-2">
              <button className="px-4 py-2 rounded bg-black text-white">{hostSaving ? 'Saving…' : 'Post listing'}</button>
            </div>
          </form>

          {/* Filters */}
          <div className="grid md:grid-cols-4 gap-3">
            <input className="border rounded px-3 py-2" placeholder="Filter city" value={city} onChange={e=>setCity(e.target.value)} />
            <input type="number" className="border rounded px-3 py-2" placeholder="Min rent" value={min} onChange={e=>setMin(e.target.value === '' ? '' : Number(e.target.value))} />
            <input type="number" className="border rounded px-3 py-2" placeholder="Max rent" value={max} onChange={e=>setMax(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>

          {/* Listings feed */}
          <ul className="grid sm:grid-cols-2 gap-4">
            {filtered.map(l => (
              <li key={l.id} className="border bg-white rounded p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{l.title}</h3>
                    <div className="text-sm text-gray-600">
                      {l.city}{l.address ? ` · ${l.address}` : ''} · ${l.rent}{l.bedrooms ? ` · ${l.bedrooms}bd` : ''}{l.bathrooms ? `/${l.bathrooms}ba` : ''}{l.move_in_date ? ` · Move-in ${l.move_in_date}` : ''}
                    </div>
                  </div>
                  {l.url && <a className="text-xs underline" href={l.url} target="_blank">Source</a>}
                </div>
                {l.description && <p className="text-sm mt-2">{l.description}</p>}
              </li>
            ))}
            {filtered.length === 0 && <p>No listings yet.</p>}
          </ul>
        </>
      ) : (
        <>
          {/* Add external link */}
          <form onSubmit={addLink} className="flex gap-2 border rounded p-3 bg-white">
            <input className="flex-1 border rounded px-3 py-2" placeholder="Paste listing URL (Zillow, Apartments.com, etc.)" value={linkUrl} onChange={e=>setLinkUrl(e.target.value)} />
            <button className="px-4 py-2 rounded bg-black text-white">{linkSaving ? 'Adding…' : 'Add link'}</button>
          </form>

          {/* External links feed */}
          <ul className="grid sm:grid-cols-2 gap-4">
            {externals.map(x => (
              <li key={x.id} className="border bg-white rounded p-4">
                <div className="flex gap-3">
                  {x.image_url && <img src={x.image_url} className="w-24 h-24 object-cover rounded border" alt="" />}
                  <div className="flex-1">
                    <a className="font-semibold underline" href={x.url} target="_blank" rel="noreferrer">{x.title || x.url}</a>
                    <div className="text-sm text-gray-600">{x.site_name}</div>
                  </div>
                </div>
              </li>
            ))}
            {externals.length === 0 && <p>No links yet. Paste one above.</p>}
          </ul>
        </>
      )}
    </div>
  )
}
