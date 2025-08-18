import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const cities = ['New York', 'Jersey City', 'San Francisco', 'Austin', 'Seattle', 'Boston'];
const tags = ['early-riser','night-owl','pet-friendly','non-smoker','cleanliness','quiet','gym','vegan'];

function pick(arr, n) {
  const a = [...arr].sort(() => Math.random()-0.5);
  return a.slice(0, n);
}

async function main() {
  for (let i = 1; i <= 20; i++) {
    const email = `demo${i}@roomieboard.dev`;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      password: 'Password123!'
    });
    if (createErr) { console.error('createUser error:', createErr); continue; }

    const id = created.user.id;
    const city = cities[Math.floor(Math.random()*cities.length)];
    const min = 600 + Math.floor(Math.random()*800);
    const max = min + 300 + Math.floor(Math.random()*500);
    const move = new Date(Date.now() + Math.floor(Math.random()*90)*86400000).toISOString().slice(0,10);
    const picked = pick(tags, 3 + Math.floor(Math.random()*3));

    const { error: upErr } = await admin.from('profiles').upsert({
      id,
      display_name: `Demo User ${i}`,
      bio: 'Looking for a chill roommate. Likes cooking and long walks to the fridge.',
      city,
      budget_min: min,
      budget_max: max,
      move_in_date: move,
      lifestyle_tags: picked,
      has_pets: Math.random() < 0.3,
    });
    if (upErr) console.error('upsert error:', upErr);
  }
  console.log('Seed complete. Created 20 users.');
}

main();
