# 🏠 RoomieBoard — Roommate Matching Web App

RoomieBoard is a simple web application that helps people find compatible roommates.  
Users can create a profile (city, budget, move-in date, lifestyle tags), browse others, and send connection requests.

---

## ✨ Features

- **Profiles**: Each user sets up a profile with city, budget, move-in date, and lifestyle tags.
- **Browse & Filter**: Search roommates by city, budget range, tags, and move-in timing.
- **Matching Score**: Transparent scoring based on shared city, overlapping budgets, common tags, and similar move-in dates.
- **Contact Requests**: Authenticated users can send requests to connect with others.
- **Authentication**: Supabase handles sign-up, login, and user sessions.
- **Safe Backend Calls**: Filters and database queries run through secure Next.js API routes.
- **Indexes for Speed**: Postgres indexes on city, budget ranges, and tags make searching fast.
- **Responsive UI**: Styled with Tailwind for a clean, mobile-friendly layout.
- **Deployment Ready**: Hosted easily on Vercel with Supabase backend.

---

## 🛠️ Tech Stack

- [Next.js 14 (App Router)](https://nextjs.org/) — React framework for frontend + backend routes
- [TypeScript](https://www.typescriptlang.org/) — Type safety
- [Supabase](https://supabase.com/) — Postgres database + authentication
- [Tailwind CSS](https://tailwindcss.com/) — Styling
- [Vercel](https://vercel.com/) — Hosting & deployment

---

## 📂 Project Structure

```bash
src/
├─ app/
│  ├─ api/
│  │  └─ browse/
│  │     └─ route.ts   # API route for filtered profile search
│  ├─ browse/          # Browse page
│  ├─ signin/          # Sign-in page
│  └─ page.tsx         # Home page
├─ components/         # UI components (ProfileCard, Filters, etc.)
└─ lib/                # Supabase client, helpers

```
---

## ⚡ Getting Started

### 1. Clone the repo

git clone https://github.com/rujulamore/roomieboard.git
cd roomieboard

---

### 2. Install dependencies

npm install
# or
yarn install

---

### 3. Set up environment variables

Create a .env.local file in the root:

NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

---

### 4. Database setup (Supabase)

Run this SQL in Supabase to set up tables:

-- Profiles table
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  city text,
  budget_min int,
  budget_max int,
  move_in_date date,
  lifestyle_tags text[],
  updated_at timestamp default now()
);

-- Contact requests table
create table if not exists contact_requests (
  id bigint primary key generated always as identity,
  sender uuid references profiles(id),
  receiver uuid references profiles(id),
  created_at timestamp default now()
);

-- Useful indexes
create index if not exists idx_profiles_city on profiles (lower(city));
create index if not exists idx_profiles_budget_range on profiles (budget_min, budget_max);
create index if not exists idx_profiles_tags on profiles using gin (lifestyle_tags);

---

### 5. Run the app locally

npm run dev
Then open http://localhost:3000.

---

### 🚀 Deployment

Push your repo to GitHub.
Connect the repo to Vercel.
Add the same environment variables (SUPABASE_URL and SUPABASE_ANON_KEY) in the Vercel dashboard.
Deploy — your app will be live on a vercel.app domain.

---

### ✅ Milestones Implemented

User profiles with city, budget, move-in date, tags
Database indexes for performance
Browse page with filters & matching score
Secure API route for profile search (/api/browse)
Authenticated contact requests
Deployment to Vercel with demo seed data

---

### 🔮 Next Steps

Add /api/contact-request endpoint instead of direct DB inserts
Add pagination or infinite scroll to Browse results
Add “accept/decline” for connection requests
Add block/report and verification for safety

---

### 👩‍💻 Author

Built by Rujula More
© 2025 RoomieBoard™. All rights reserved.

🎓 MS in Computer Science, Oregon State University

💼 Open to software engineering opportunities



