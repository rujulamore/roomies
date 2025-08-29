'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

// ---------- Types ----------
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
  url_canonical?: string | null
  title: string | null
  image_url: string | null
  site_name: string | null
  city: string | null
  rent: number | null
  created_at: string
}

type HostForm = {
  title: string
  city: string
  rent: number | ''
  bedrooms: number | ''
  bathrooms: number | ''
  move_in_date: string
  address?: string
  url?: string
  description?: string
}

// ---------- Component ----------
export default function ApartmentsPage() {
  const [userId, setUserId] = useState<string | null>(null)

  // Host listing form (labeled, empty-friendly)
  const [form, setForm] = useState<HostForm>({
    title: '',
    city: '',
    rent: '',
    bedrooms: '',
    bathrooms: '',
    move_in_date: '',
    address: '',
    url: '',
    description: '',
  })
  const [hostSaving, setHostSaving] = useState(false)

  // External link form
  const [linkUrl, setLinkUrl] = useState('')
  const [linkSaving, setLinkSaving] = useState(false)

  // Filters
  const [cityFilter, setCityFilter] = useState('')
  const [min, setMin] = useState<number | ''>('')
  const [max, setMax] = useState<number | ''>('')

  // Data
  const [listings, setListings] = useState<Listing[]>([])
  const [externals, setExternals] = useState<External[]>([])
  const [tab, setTab] = useState<'listings' | 'links'>('listings')

  // Toast
  const [toast, setToast] = useState<string | null>(null)
  function show(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null))
    refresh()
  }, [])

  async function refresh() {
    const [a, b] = await Promise.all([
      supabase.from('listings').select('*').order('created_at', { ascending: false }),
      supabase.from('external_listings').select('*').order('created_at', { ascending: false }),
    ])
    if (!a.error && a.data) setListings(a.data as Listing[])
    if (!b.error && b.data) setExternals(b.data as External[])
  }

  // ---------- Actions ----------
  async function saveListing(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) { location.href = '/signin'; return }
    if (!form.title || !form.city || form.rent === '') {
      alert('Title, City, and Rent are required.')
      return
    }
    setHostSaving(true)
    const payload = {
      owner: userId,
      title: form.title,
      city: form.city,
      rent: Number(form.rent),
      bedrooms: form.bedrooms === '' ? null : Number(form.bedrooms),
      bathrooms: form.bathrooms === '' ? null : Number(form.bathrooms),
      move_in_date: form.move_in_date || null,
      address: form.address || null,
      url: form.url || null,
      description: form.description || null,
    }
    const { error } = await supabase.from('listings').insert(payload)
    setHostSaving(false)
    if (error) { alert(error.message); return }
    setForm({
      title: '', city: '', rent: '', bedrooms: '', bathrooms: '',
      move_in_date: '', address: '', url: '', description: '',
    })
    await refresh()
    show('Listing posted')
  }

  async function addLink(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) { location.href = '/signin'; return }
    const raw = linkUrl.trim()
    if (!raw) return
    setLinkSaving(true)

    // 1) Fetch OG + canonical
    const resp = await fetch('/api/og', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: raw }),
    })
    const og = await resp.json()
    if (!resp.ok) { setLinkSaving(false); alert(og.error || 'OG fetch failed'); return }

    const canonical: string = og.canonical || og.url

    // 2) Already exists?
    let { data: existing, error: selErr } = await supabase
      .from('external_listings')
      .select('*')
      .eq('url_canonical', canonical)
      .maybeSingle()

    if (selErr) { setLinkSaving(false); alert(selErr.message); return }

    if (existing) {
      setLinkSaving(false)
      setLinkUrl('')
      show('That link is already added')
      await refresh()
      return
    }

    // 3) Try to insert. Handle unique conflict (race).
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
      if ((insErr as any).code === '23505') {
        setLinkSaving(false)
        setLinkUrl('')
        show('That link is already added')
        await refresh()
        return
      }
      setLinkSaving(false)
      alert(insErr.message)
      return
    }

    // Fresh insert
    setLinkSaving(false)
    setLinkUrl('')
    show('Link added')
    await refresh()
  }

  // ---------- Derived ----------
  const filtered = listings.filter((l) => {
    const mCity = cityFilter ? l.city.toLowerCase().includes(cityFilter.toLowerCase()) : true
    const mMin = min === '' ? true : l.rent >= Number(min)
    const mMax = max === '' ? true : l.rent <= Number(max)
    return mCity && mMin && mMax
  })

  // ---------- Render ----------
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Apartments</h1>

      {toast && (
        <div className="fixed bottom-4 right-4 bg-black text-white text-sm px-3 py-2 rounded shadow">
          {toast}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          className={`px-3 py-1 border rounded ${tab === 'listings' ? 'bg-black text-white' : ''}`}
          onClick={() => setTab('listings')}
        >
          Host Listings
        </button>
        <button
          className={`px-3 py-1 border rounded ${tab === 'links' ? 'bg-black text-white' : ''}`}
          onClick={() => setTab('links')}
        >
          Web Links
        </button>
      </div>

      {tab === 'listings' ? (
        <>
          {/* Host form */}
          <form onSubmit={saveListing} className="grid md:grid-cols-2 gap-3 border rounded p-4 bg-white">
            <label className="text-sm">
              <span className="block mb-1 font-medium">Title</span>
              <input
                className="w-full border rounded px-3 py-2"
                value={form.title}
                onChange={(e) => setForm((prev: HostForm) => ({ ...prev, title: e.target.value }))}
                required
              />
            </label>

            <label className="text-sm">
              <span className="block mb-1 font-medium">City</span>
              <input
                className="w-full border rounded px-3 py-2"
                value={form.city}
                onChange={(e) => setForm((prev: HostForm) => ({ ...prev, city: e.target.value }))}
                required
              />
            </label>

            <label className="text-sm">
              <span className="block mb-1 font-medium">Rent ($/mo)</span>
              <input
                type="number"
                min={0}
                className="w-full border rounded px-3 py-2"
                placeholder="e.g. 1900"
                value={form.rent === '' ? '' : form.rent}
                onChange={(e) =>
                  setForm((prev: HostForm) => ({
                    ...prev,
                    rent: e.target.value === '' ? '' : Number(e.target.value),
                  }))
                }
                required
              />
              <span className="text-xs text-gray-500">Monthly rent in USD</span>
            </label>

            <div className="flex gap-3">
              <label className="text-sm w-full">
                <span className="block mb-1 font-medium">Bedrooms</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g. 2"
                  value={form.bedrooms === '' ? '' : form.bedrooms}
                  onChange={(e) =>
                    setForm((prev: HostForm) => ({
                      ...prev,
                      bedrooms: e.target.value === '' ? '' : Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label className="text-sm w-full">
                <span className="block mb-1 font-medium">Bathrooms</span>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g. 1.5"
                  value={form.bathrooms === '' ? '' : form.bathrooms}
                  onChange={(e) =>
                    setForm((prev: HostForm) => ({
                      ...prev,
                      bathrooms: e.target.value === '' ? '' : Number(e.target.value),
                    }))
                  }
                />
                <span className="text-xs text-gray-500">Use .5 for half-baths</span>
              </label>
            </div>

            <label className="text-sm">
              <span className="block mb-1 font-medium">Move-in date</span>
              <input
                type="date"
                className="w-full border rounded px-3 py-2"
                value={form.move_in_date}
                onChange={(e) => setForm((prev: HostForm) => ({ ...prev, move_in_date: e.target.value }))}
              />
            </label>

            <label className="text-sm">
              <span className="block mb-1 font-medium">Source URL (optional)</span>
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="Link to original listing"
                value={form.url}
                onChange={(e) => setForm((prev: HostForm) => ({ ...prev, url: e.target.value }))}
              />
            </label>

            <label className="text-sm md:col-span-2">
              <span className="block mb-1 font-medium">Address (optional)</span>
              <input
                className="w-full border rounded px-3 py-2"
                value={form.address}
                onChange={(e) => setForm((prev: HostForm) => ({ ...prev, address: e.target.value }))}
              />
            </label>

            <label className="text-sm md:col-span-2">
              <span className="block mb-1 font-medium">Description</span>
              <textarea
                rows={3}
                className="w-full border rounded px-3 py-2"
                placeholder="Tell people about the place, amenities, lease terms, etc."
                value={form.description}
                onChange={(e) => setForm((prev: HostForm) => ({ ...prev, description: e.target.value }))}
              />
            </label>

            <div className="md:col-span-2">
              <button className="px-4 py-2 rounded bg-black text-white">
                {hostSaving ? 'Saving…' : 'Post listing'}
              </button>
            </div>
          </form>

          {/* Filters */}
          <div className="grid md:grid-cols-4 gap-3">
            <input
              className="border rounded px-3 py-2"
              placeholder="Filter city"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
            />
            <input
              type="number"
              className="border rounded px-3 py-2"
              placeholder="Min rent"
              value={min}
              onChange={(e) => setMin(e.target.value === '' ? '' : Number(e.target.value))}
            />
            <input
              type="number"
              className="border rounded px-3 py-2"
              placeholder="Max rent"
              value={max}
              onChange={(e) => setMax(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>

          {/* Listings feed */}
          <ul className="grid sm:grid-cols-2 gap-4">
            {filtered.map((l) => (
              <li key={l.id} className="border bg-white rounded p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{l.title}</h3>
                    <div className="text-sm text-gray-600">
                      {l.city}
                      {l.address ? ` · ${l.address}` : ''} · ${l.rent}
                      {l.bedrooms ? ` · ${l.bedrooms}bd` : ''}
                      {l.bathrooms ? `/${l.bathrooms}ba` : ''}
                      {l.move_in_date ? ` · Move-in ${l.move_in_date}` : ''}
                    </div>
                  </div>
                  {l.url && (
                    <a className="text-xs underline" href={l.url} target="_blank" rel="noopener noreferrer">
                      Source
                    </a>
                  )}
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
            <input
              className="flex-1 border rounded px-3 py-2"
              placeholder="Paste listing URL (Zillow, Apartments.com, etc.)"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
            <button className="px-4 py-2 rounded bg-black text-white">
              {linkSaving ? 'Adding…' : 'Add link'}
            </button>
          </form>

          {/* External links feed */}
          <ul className="grid sm:grid-cols-2 gap-4">
            {externals.map((x) => (
              <li key={x.id} className="border bg-white rounded p-4">
                <div className="flex gap-3">
                  {x.image_url && (
                    <img src={x.image_url} className="w-24 h-24 object-cover rounded border" alt="" />
                  )}
                  <div className="flex-1">
                    <a
                      className="font-semibold underline"
                      href={x.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {x.title || x.url}
                    </a>
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
