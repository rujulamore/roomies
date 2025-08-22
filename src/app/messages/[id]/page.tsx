'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Msg = { id: number; conversation_id: string; sender: string; content: string; created_at: string }

export default function ChatPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [partnerName, setPartnerName] = useState('Chat')
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    ;(async () => {
      // 1) auth
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/signin'); return }
      setUserId(user.id)

      // 2) initial messages
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true })
      if (error) { alert(error.message); router.push('/browse'); return }
      setMsgs(data as Msg[])
      setLoading(false)

      // 3) partner display name (nice for export/header)
      const { data: partners } = await supabase.rpc('conversation_partners', { _cid: id as string })
      const other = (partners || []).find((p: any) => p.user_id !== user.id)
      if (other?.display_name) setPartnerName(other.display_name)

      // 4) mark read (you've viewed the thread)
      await supabase.rpc('mark_read', { _conversation_id: id as string })

      // 5) subscribe ONCE to inserts in this conversation
      channel = supabase
        .channel(`room:messages:${id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` },
          (payload) => {
            const m = payload.new as Msg
            // de-dupe: avoids double-bubble when optimistic + realtime both hit
            setMsgs(prev => (prev.some(x => x.id === m.id) ? prev : [...prev, m]))
            setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 0)
          }
        )
        .subscribe((status) => console.log('Realtime status:', status)) // should log SUBSCRIBED
    })()

    return () => { if (channel) supabase.removeChannel(channel) }
  }, [id, router])

  useEffect(() => {
  const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
    // ensure Realtime socket has the latest token
    supabase.realtime.setAuth(session?.access_token ?? '')
  })
  return () => { sub.subscription.unsubscribe() }
}, [])

  async function send() {
    const content = text.trim()
    if (!content || !userId) return

    // Return the inserted row so we can render immediately
    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: id, sender: userId, content })
      .select('*')
      .single()

    if (error) { alert(error.message); return }

    setMsgs(prev => (prev.some(x => x.id === data.id) ? prev : [...prev, data as Msg]))
    setText('')
    await supabase.rpc('mark_read', { _conversation_id: id as string })
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 0)
  }

  function downloadFile(filename: string, mime: string, content: string) {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportMarkdown() {
    const lines = [
      `# Chat with ${partnerName}`,
      '',
      ...msgs.map(m => {
        const who = m.sender === userId ? 'You' : partnerName
        const when = new Date(m.created_at).toLocaleString()
        return `**${who}** [${when}]\n\n${m.content}\n`
      })
    ]
    downloadFile(`chat-${id}.md`, 'text/markdown', lines.join('\n'))
  }

  function exportJSON() {
    downloadFile(`chat-${id}.json`, 'application/json', JSON.stringify(msgs, null, 2))
  }

  if (loading) return <p>Loading chat…</p>

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[70vh] border bg-white rounded">
      <div className="px-4 py-3 border-b font-semibold">Chat</div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {msgs.map(m => (
          <div key={m.id} className={`max-w-[75%] px-3 py-2 rounded ${m.sender===userId ? 'ml-auto bg-black text-white' : 'bg-gray-100'}`}>
            <div className="text-sm whitespace-pre-wrap">{m.content}</div>
            <div className="text-[10px] opacity-70 mt-1">{new Date(m.created_at).toLocaleString()}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="p-3 border-t flex gap-2">
        <button className="px-3 py-2 border rounded" onClick={exportMarkdown}>Save .md</button>
        <button className="px-3 py-2 border rounded" onClick={exportJSON}>Save .json</button>
        <input
          className="flex-1 border rounded px-3 py-2"
          placeholder="Type a message…"
          value={text}
          onChange={e=>setText(e.target.value)}
          onKeyDown={e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(); } }}
        />
        <button className="px-4 py-2 rounded bg-black text-white" onClick={send}>Send</button>
      </div>
    </div>
  )
}
