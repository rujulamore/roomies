import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import dns from 'node:dns/promises'
import net from 'node:net'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function canonicalize(input: string) {
  const u = new URL(input)
  u.hash = ''
  u.hostname = u.hostname.toLowerCase().replace(/^www\./, '')
  const strip = new Set(['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid','mc_cid','mc_eid'])
  const kept = new URLSearchParams()
  Array.from(u.searchParams.entries())
    .filter(([k]) => !strip.has(k.toLowerCase()))
    .sort(([a],[b]) => a.localeCompare(b))
    .forEach(([k,v]) => kept.append(k,v))
  const path = u.pathname.replace(/\/+$/,'') || ''
  return `${u.protocol}//${u.hostname}${path}${kept.toString() ? `?${kept}` : ''}`
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'

function isHttpUrl(s: string) {
  try { const u = new URL(s); return u.protocol === 'http:' || u.protocol === 'https:' } catch { return false }
}
function isPrivateIP(ip: string) {
  return ip.startsWith('10.') || ip.startsWith('127.') || ip.startsWith('169.254.')
      || (ip.startsWith('172.') && (()=>{ const x=Number(ip.split('.')[1]); return x>=16&&x<=31 })())
      || ip.startsWith('192.168.') || ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd')
}
async function assertNotPrivate(u: URL) {
  if (u.hostname === 'localhost') throw new Error('Blocked host')
  if (net.isIP(u.hostname) && isPrivateIP(u.hostname)) throw new Error('Blocked host')
  const addrs = await dns.lookup(u.hostname, { all: true }).catch(() => [])
  if ((addrs as any[]).some(a => isPrivateIP(a.address))) throw new Error('Blocked host')
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json()
    if (!isHttpUrl(url)) return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })

    const target = new URL(url)
    await assertNotPrivate(target)

    // 8s timeout
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 8000)

    const res = await fetch(target.toString(), {
      redirect: 'follow',
      headers: { 'User-Agent': UA, 'Accept-Language': 'en' },
      signal: controller.signal,
    }).finally(() => clearTimeout(t))

    if (!res.ok) return NextResponse.json({ error: `Fetch failed: ${res.status}` }, { status: 400 })
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('text/html')) return NextResponse.json({ error: `Unsupported content-type: ${ct}` }, { status: 400 })

    const html = await res.text()
    const $ = cheerio.load(html)

    const prop = (p: string) => $(`meta[property="${p}"]`).attr('content')?.trim() || ''
    const name = (n: string)    => $(`meta[name="${n}"]`).attr('content')?.trim() || ''

    const ogTitle = prop('og:title') || $('title').text().trim()
    const ogImageRaw = prop('og:image') || name('twitter:image') || ''
    const ogSite  = prop('og:site_name') || new URL(res.url || target.toString()).hostname
    const ogDesc  = prop('og:description') || name('description') || ''
    const ogUrl   = prop('og:url') || $('link[rel="canonical"]').attr('href')?.trim()

    // absolute image URL
    let image = ''
    if (ogImageRaw) {
      try { image = new URL(ogImageRaw, res.url || target.toString()).toString() } catch { image = ogImageRaw }
    }

    // prefer page-declared canonical if present
    const canonical = canonicalize(ogUrl || res.url || target.toString())

    return NextResponse.json({
      url: res.url || target.toString(),
      canonical,
      title: ogTitle,
      image,
      site: ogSite,
      description: ogDesc,
    })
  } catch (e: any) {
    const msg = e?.name === 'AbortError' ? 'Timed out fetching URL' : (e?.message || 'OG parse error')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
