'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Msg = { id: number; conversation_id: string; sender: string; content: string; created_at: string }

export default function ChatPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/signin'); return }
      setUserId(user.id)

      // Initial load (RLS ensures you must be a participant)
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true })
      if (error) { alert(error.message); router.push('/browse'); return }
      setMsgs(data as Msg[])
      setLoading(false)

      // Realtime: subscribe to new messages in this conversation
      const channel = supabase.channel(`room:messages:${id}`)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` },
          (payload) => {
            setMsgs(m => [...m, payload.new as Msg])
            // auto scroll
            setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 0)
          })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    })()
  }, [id, router])

  async function send() {
    const content = text.trim()
    if (!content || !userId) return
    const { error } = await supabase.from('messages').insert({
      conversation_id: id, sender: userId, content
    })
    if (error) { alert(error.message); return }
    setText('')
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
