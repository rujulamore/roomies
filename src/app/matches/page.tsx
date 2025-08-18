'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { compatScore, type Candidate, type Me } from '@/lib/score'

export default function Matches() {
  const [rows,setRows]=useState<(Candidate&{_score:number})[]>([])
  const [err,setErr]=useState<string|null>(null)
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

  useEffect(()=>{(async()=>{
    const { data:{ user } } = await supabase.auth.getUser()
    if(!user){ location.href='/signin'; return }
    const { data: meRow } = await supabase.from('profiles').select('*').eq('id',user.id).maybeSingle()
    if(!meRow){ location.href='/profile'; return }
    const me:Me={ city:meRow.city, budget_min:meRow.budget_min, budget_max:meRow.budget_max, lifestyle_tags:meRow.lifestyle_tags||[], has_pets:!!meRow.has_pets }
    const { data:cands, error } = await supabase.rpc('search_public_profiles',{ _city:null,_min:null,_max:null,_tags:null })
    if(error){ setErr(error.message); return }
    const scored=(cands as Candidate[]).filter(c=>c.id!==user.id).map(c=>({...c,_score:compatScore(me,c)})).sort((a,b)=>b._score-a._score).slice(0,20)
    setRows(scored)
  })()},[])
  if(err) return <p className="text-red-600 text-sm">Error: {err}</p>
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Top Matches</h1>
      <ul className="grid sm:grid-cols-2 gap-4">
        {rows.map(p=>(
          <li key={p.id} className="border bg-white rounded p-4">
            <div className="flex justify-between">
              <div>
                <h3 className="font-semibold">{p.display_name}</h3>
                <div className="text-sm text-gray-600">{p.city} · ${p.budget_min}-{p.budget_max} · Move-in {p.move_in_date}</div>
              </div>
              <span className="text-xs px-2 py-1 border rounded">Score {p._score}</span>
            </div>
            {p.bio && <p className="text-sm mt-2">{p.bio}</p>}
            <div className="flex flex-wrap gap-2 mt-2">
              {p.lifestyle_tags?.map(t=> <span key={t} className="text-xs border rounded px-2 py-1">{t}</span>)}
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
      </ul>
      {rows.length===0 && <p>No matches yet—add tags/budget in your profile.</p>}
    </div>
  )
}
