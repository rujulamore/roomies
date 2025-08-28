import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { url } = await req.json()
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 })
    }

    const res = await fetch(url, { redirect: 'follow' })
    if (!res.ok) {
      return NextResponse.json({ error: `Fetch failed: ${res.status}` }, { status: 400 })
    }
    const html = await res.text()
    const $ = cheerio.load(html)

    // Helpers
    const get = (sel: string, attr: 'content' | 'src' = 'content') =>
      ($(sel).attr(attr) || '').trim()

    const ogTitle = get('meta[property="og:title"]') || $('title').text().trim()
    const ogImage = get('meta[property="og:image"]') || get('meta[name="twitter:image"]') || ''
    const ogSite  = get('meta[property="og:site_name"]') || new URL(url).hostname
    const ogDesc  = get('meta[property="og:description"]') || get('meta[name="description"]') || ''

    return NextResponse.json({
      url,
      title: ogTitle,
      image: ogImage,
      site: ogSite,
      description: ogDesc,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'OG parse error' }, { status: 500 })
  }
}
