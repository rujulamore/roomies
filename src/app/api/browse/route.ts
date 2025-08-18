import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic' // ensure no static caching

type Payload = {
  _city: string | null
  _min: number | null
  _max: number | null
  _tags: string[] | null
}

export async function GET() {
  // Simple sanity endpoint so visiting /api/browse in the browser doesn't 404
  return NextResponse.json({
    ok: true,
    route: '/api/browse',
    expects: { _city: '%City%', _min: 500, _max: 2000, _tags: ['quiet'] },
    method: 'POST',
  })
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<Payload>
    const payload: Payload = {
      _city: body._city ?? null,
      _min: body._min ?? null,
      _max: body._max ?? null,
      _tags: body._tags ?? null,
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anon) {
      return NextResponse.json(
        { error: 'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY' },
        { status: 500 }
      )
    }

    const res = await fetch(`${url}/rest/v1/rpc/search_public_profiles`, {
      method: 'POST',
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      return NextResponse.json(json ?? { error: 'Supabase RPC failed' }, { status: res.status })
    }

    // Return rows directly; handle both raw array and { data: [...] }
    const rows = Array.isArray(json) ? json : json?.data ?? []
    return NextResponse.json(rows)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Unexpected error' }, { status: 500 })
  }
}

