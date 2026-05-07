# FocusApp

A real-time collaborative workspace for teams — combining task management, deadlines, a Pomodoro timer, and live presence awareness in one focused dashboard.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database & Auth | Supabase (Postgres + Auth + Realtime) |
| Styling | Tailwind CSS + shadcn/ui |
| Icons | Lucide React |
| Drag & Drop | dnd-kit |
| Charts | Recharts |
| Hosting | Vercel |

## Features

- **Workspaces** — create or join workspaces via invite code; switch between multiple workspaces
- **Task Board** — Kanban-style drag-and-drop board (`Todo → In Progress → Done`)
- **Deadlines** — deadline tracker with a draining progress bar showing time remaining, color-coded by urgency (green → amber → red → overdue)
- **Calendar** — monthly calendar view of upcoming tasks and deadlines
- **Pomodoro Timer** — per-user focus timer with customizable work/break intervals, broadcast to the whole workspace
- **Member Presence** — live status updates; see what teammates are working on in real time
- **Daily Todos** — personal daily task list accessible from the dashboard
- **Reports** — workspace productivity analytics via charts
- **Authentication** — email/password and Google OAuth via Supabase Auth
- **Row-Level Security** — all data access enforced at the database layer

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

### 1. Clone and install

```bash
git clone https://github.com/<your-username>/focusapp.git
cd focusapp
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Where to find it |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → `anon` key |
| `NEXT_PUBLIC_SITE_URL` | Your deployment URL (`http://localhost:3000` for local) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` key |

> **Warning:** Never commit `.env.local`. Never expose `SUPABASE_SERVICE_ROLE_KEY` on the client side.

### 3. Run database migrations

Apply migrations from `supabase/migrations/` via the Supabase dashboard SQL editor, or with the Supabase CLI:

```bash
supabase db push
```

### 4. Configure Supabase Auth

In your Supabase dashboard → Authentication:
- Enable **Email** provider
- Enable **Google** OAuth (add your Google client ID + secret)
- Set **Site URL** to `http://localhost:3000`
- Add redirect URL: `http://localhost:3000/auth/callback`

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
  auth/               # Login, signup, OAuth callback
  dashboard/          # Main workspace dashboard + [workspaceId] layout
  join/[inviteCode]/  # Invite link auto-join handler
components/
  workspace/          # Task board, deadlines, calendar, reports, member grid
  pomodoro/           # Timer ring + controls
  layout/             # Dashboard shell, sidebar, topbar
  ui/                 # shadcn/ui primitives
lib/supabase/         # Browser/server/middleware/service clients
supabase/migrations/  # SQL migrations (schema + RLS)
types/                # TypeScript type definitions
```

## Deploying to Vercel

1. Push to GitHub
2. Import repo in [Vercel](https://vercel.com)
3. Add all four environment variables in Vercel project settings
4. Update Supabase redirect URLs to include `https://your-app.vercel.app/auth/callback`

## License

MIT
