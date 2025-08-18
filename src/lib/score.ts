export type Candidate = { id:string; display_name:string; city:string; budget_min:number; budget_max:number; move_in_date:string; lifestyle_tags:string[]; has_pets:boolean; bio:string }
export type Me = { city:string; budget_min:number; budget_max:number; lifestyle_tags:string[]; has_pets:boolean }

const jaccard = (a:string[],b:string[]) => { const A=new Set(a),B=new Set(b); const inter=[...A].filter(x=>B.has(x)).length; const uni=new Set([...a,...b]).size; return uni? inter/uni:0 }
const budgetOverlap = (aMin:number,aMax:number,bMin:number,bMax:number) => { const inter=Math.max(0,Math.min(aMax,bMax)-Math.max(aMin,bMin)); const uni=Math.max(aMax,bMax)-Math.min(aMin,bMin); return uni>0? inter/uni:0 }

export function compatScore(me:Me, c:Candidate){
  const city = me.city.trim().toLowerCase()===c.city.trim().toLowerCase()?0.25:0
  const tags = 0.45*jaccard(me.lifestyle_tags||[], c.lifestyle_tags||[])
  const budget = 0.30*budgetOverlap(me.budget_min,me.budget_max,c.budget_min,c.budget_max)
  const pets = me.has_pets!==c.has_pets? -0.05:0
  return Math.round(Math.max(0,Math.min(1, city+tags+budget+pets))*100)
}
