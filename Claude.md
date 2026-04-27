# CLAUDE.md — Autonomous Email Outreach Agent: Auth & Settings Portal

This file contains all instructions for Claude Code to follow when building this project.
Read it fully before writing any code.

---

## Project Overview

We are building a **multi-tenant SaaS platform** for an autonomous AI email outreach agent.
This first phase covers:

1. **Google OAuth authentication** (sign up / sign in)
2. **Post-login Settings panel** where users can connect their AgentMail account by entering an API key

The stack is **Next.js (App Router)** deployed to **Vercel**, with **Supabase** as the backend
for auth and database.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Auth | Supabase Auth with Google OAuth provider |
| Database | Supabase (Postgres) |
| Styling | Tailwind CSS |
| Component library | shadcn/ui (install only what is needed) |
| Deployment target | Vercel |
| Language | TypeScript (strict mode) |
| Package manager | pnpm |

---

## Design Direction

### Color Philosophy
This is a **professional AI tooling product**. The design should feel like a tool that
engineers and growth teams trust — not a toy.

Use a **dark-first** color scheme with the following palette rationale:

- **Background**: Deep neutral near-black (`#0A0A0F`) — conveys focus and seriousness
- **Surface / Cards**: Slightly elevated dark (`#13131A`) — clear visual hierarchy without harsh contrast
- **Border**: Subtle (`#1E1E2E`) — defines structure without noise
- **Primary accent**: Electric indigo / violet (`#6366F1`) — modern, energetic, maps well to "intelligence"
- **Primary accent hover**: Brighter (`#818CF8`) — responsive feel
- **Success / Connected state**: Emerald (`#10B981`) — universally readable as "active/good"
- **Warning / Caution**: Amber (`#F59E0B`)
- **Text primary**: Near-white (`#F1F5F9`)
- **Text secondary**: Muted slate (`#94A3B8`)
- **Destructive**: Rose (`#F43F5E`)

### Typography
- **Display / Headings**: `Sora` (Google Font) — geometric, confident, slightly futuristic
- **Body / UI**: `DM Sans` (Google Font) — highly legible, friendly but not playful
- Import both via `next/font/google`

### Motion & Feel
- Subtle fade-in on page load (Tailwind `animate-fade-in` or a simple CSS keyframe)
- Button hover states with a 150ms transition on background and shadow
- The "Connect AgentMail" card should have a gentle border glow on hover using
  a box-shadow transition — makes it feel interactive before the user clicks
- No excessive animations — this is a productivity tool, not a landing page

### Layout Principles
- Max content width: `1100px`, centered
- Generous padding: `px-6 md:px-12`
- Cards use `rounded-xl` with a `1px` border and subtle inner shadow
- The settings page uses a **two-column layout on desktop** (sidebar nav left,
  content panel right) and **single column on mobile**

---

## File & Folder Structure

Follow Next.js App Router conventions strictly.

```
/
├── app/
│   ├── layout.tsx              # Root layout: fonts, global CSS, Supabase provider
│   ├── page.tsx                # Landing / login page (redirects if already authed)
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts        # Supabase OAuth callback handler
│   └── settings/
│       ├── layout.tsx          # Settings shell: sidebar + content area
│       └── page.tsx            # Default settings page → redirects to /settings/integrations
│       └── integrations/
│           └── page.tsx        # AgentMail API key connection UI
├── components/
│   ├── auth/
│   │   └── LoginButton.tsx     # Google OAuth sign-in button
│   ├── settings/
│   │   ├── Sidebar.tsx         # Settings navigation sidebar
│   │   └── AgentMailConnect.tsx # API key input card component
│   └── ui/                     # shadcn/ui components go here
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser Supabase client (createBrowserClient)
│   │   ├── server.ts           # Server Supabase client (createServerClient)
│   │   └── middleware.ts       # Session refresh logic
│   └── utils.ts                # cn() helper and shared utilities
├── middleware.ts                # Next.js middleware: protect /settings/* routes
├── types/
│   └── database.ts             # Supabase generated types (run supabase gen types)
├── public/
│   └── logo.svg                # Platform logo (create a minimal SVG wordmark)
├── .env.local.example          # Template for required env vars (never commit .env.local)
├── tailwind.config.ts
├── tsconfig.json
└── CLAUDE.md                   # This file
```

---

## Supabase Schema

Run these SQL migrations in the Supabase SQL editor in order.

### Migration 001 — User profiles

```sql
-- Extends Supabase auth.users with app-specific profile data
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Auto-create profile on new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);
```

### Migration 002 — API key storage

```sql
-- Stores encrypted third-party API keys per user
create table public.user_integrations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  provider text not null,                -- e.g. 'agentmail'
  -- Store only a masked preview for display; actual key encrypted at app layer
  key_preview text not null,             -- e.g. 'am-****8f3a'
  -- Encrypted key: use Supabase Vault or app-level AES-256-GCM encryption
  encrypted_key text not null,
  is_valid boolean default false,        -- set true after successful validation
  validated_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(user_id, provider)
);

-- RLS
alter table public.user_integrations enable row level security;
create policy "Users can manage own integrations"
  on public.user_integrations for all using (auth.uid() = user_id);
```

---

## Auth Flow Implementation

### Google OAuth Setup (Supabase)
1. In Supabase dashboard → Authentication → Providers → Google → Enable
2. Add Google OAuth credentials (Client ID + Secret from Google Cloud Console)
3. Set redirect URL to: `https://<your-domain>/auth/callback`
   and `http://localhost:3000/auth/callback` for development

### Sign-in Flow
- `app/page.tsx` — public landing/login page
  - If user is already authenticated → redirect to `/settings/integrations`
  - If not → render the login UI with Google OAuth button
- `components/auth/LoginButton.tsx` — calls `supabase.auth.signInWithOAuth({ provider: 'google' })`
- `app/auth/callback/route.ts` — exchanges the OAuth code for a session using
  `supabase.auth.exchangeCodeForSession(code)`; on success redirects to `/settings/integrations`

### Route Protection (Middleware)
`middleware.ts` must:
- Refresh the user session on every request (required by Supabase SSR)
- Redirect unauthenticated users away from `/settings/*` to `/`
- Redirect authenticated users away from `/` to `/settings/integrations`

---

## AgentMail API Key Flow

### UI Behavior (`components/settings/AgentMailConnect.tsx`)
The component has two states:

**State 1 — Not connected**
- Shows a card with the AgentMail logo/name, a short description, and an input field
- Input: password type (masked), placeholder `am-••••••••••••••••`
- Button: "Connect AgentMail" (primary accent color)
- On submit: POST to `/api/integrations/agentmail` with the key

**State 2 — Connected**
- Shows a success card with a green "Connected" badge
- Displays the masked key preview (e.g., `am-****8f3a`)
- Shows validation timestamp: "Connected on Apr 26, 2026"
- Button: "Disconnect" (destructive, outlined, not filled)

### API Route (`app/api/integrations/agentmail/route.ts`)
`POST` handler:
1. Verify user session (return 401 if not authenticated)
2. Receive `{ apiKey: string }` from request body
3. **Validate the key** by making a real test call to AgentMail API:
   `GET https://api.agentmail.to/v0/inboxes` with the provided key
   — if it returns 200, the key is valid; if 401/403, it is not
4. Generate `key_preview`: take last 4 chars → `am-****${key.slice(-4)}`
5. Encrypt the key (use AES-256-GCM with `ENCRYPTION_KEY` env var, or defer to
   Supabase Vault if available)
6. Upsert into `user_integrations` table with `is_valid=true`
7. Return `{ success: true, preview: key_preview, validated_at: timestamp }`

`DELETE` handler:
1. Verify user session
2. Delete the row from `user_integrations` where `user_id = auth.uid() AND provider = 'agentmail'`
3. Return `{ success: true }`

---

## Environment Variables

Create `.env.local.example` with these (never commit actual values):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Only used server-side — never expose to client
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Encryption key for API key storage (32 bytes, base64 encoded)
# Generate with: openssl rand -base64 32
ENCRYPTION_KEY=

# App URL (used for OAuth redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## UI Pages Specification

### `app/page.tsx` — Login Page

Layout: **centered card**, vertically and horizontally centered in the viewport.

Content (top to bottom):
1. Logo (SVG wordmark) — platform name TBD, use "Embra" as placeholder
2. Tagline: `"Autonomous email outreach, powered by AI"`
3. Divider
4. Google sign-in button — white bg, Google logo SVG on left, text "Continue with Google"
   Use the official Google branding colors for this button specifically
5. Fine print: `"By continuing, you agree to our Terms and Privacy Policy"` in muted text

Background: The login page should have a very subtle **radial gradient** behind the card —
dark indigo emanating from center — to give depth without distraction.

### `app/settings/integrations/page.tsx` — Integrations Settings

Left sidebar items (for future expansion, render as nav links):
- `Integrations` (active — highlighted with accent color left border)
- `Campaign Defaults` (disabled / coming soon, grayed out)
- `Team` (disabled / coming soon)
- `Billing` (disabled / coming soon)

Main content area:
- Page heading: `"Integrations"`, subheading: `"Connect external services your agent uses"`
- A section titled `"Email Infrastructure"` containing the `AgentMailConnect` card
- Leave space below for future integrations (Anthropic key, Tavily, etc.) with
  grayed-out placeholder cards labeled "Coming soon"

---

## Code Quality Rules

- **TypeScript strict mode** — no `any` types; define interfaces for all API responses
- **Server Components by default** — only use `"use client"` when truly needed
  (event handlers, hooks, browser APIs)
- **No inline styles** — Tailwind classes only; extract repeated patterns into components
- **Error handling** — all API routes return typed error responses `{ error: string }`;
  all client fetch calls handle errors and show user-facing toast messages
- **Loading states** — all async actions (key submission, OAuth redirect) must show
  a loading spinner or disabled state on the button; never leave the user guessing
- **Accessibility** — all interactive elements must have proper `aria-label` or visible
  label text; form inputs must have associated `<label>` elements
- **No hardcoded secrets** — all secrets via environment variables only

---

## What NOT to Build Yet

Do not build any of the following in this phase:
- Campaign creation flow
- AI agent logic
- Email sending / receiving
- LangGraph integration
- Webhook server
- Any page beyond `/` and `/settings/integrations`

Stay strictly within scope. The next phase will build on top of this foundation.

---

## Getting Started Commands

```bash
# Bootstrap
pnpm create next-app@latest embra --typescript --tailwind --app --use-pnpm
cd embra

# Core dependencies
pnpm add @supabase/supabase-js @supabase/ssr
pnpm add class-variance-authority clsx tailwind-merge lucide-react

# shadcn/ui init
pnpm dlx shadcn@latest init
# When prompted: Dark theme, CSS variables yes

# Add only the shadcn components you need
pnpm dlx shadcn@latest add button input label card badge separator toast

# Fonts are handled via next/font/google — no npm package needed
```

---

## Acceptance Criteria for This Phase

Before moving to the next phase, verify:

- [ ] User can click "Continue with Google" and complete OAuth flow
- [ ] After OAuth, user lands on `/settings/integrations`
- [ ] Unauthenticated users visiting `/settings/*` are redirected to `/`
- [ ] Authenticated users visiting `/` are redirected to `/settings/integrations`
- [ ] User can enter an AgentMail API key and click "Connect"
- [ ] Invalid key shows an error message ("Invalid API key. Please check and try again.")
- [ ] Valid key shows the connected state with masked preview
- [ ] User can disconnect the key and the state resets to unconnected
- [ ] All UI is responsive down to 375px viewport width
- [ ] No TypeScript errors (`pnpm tsc --noEmit` passes)
- [ ] Deploys successfully to Vercel with env vars configured

---

*This CLAUDE.md will be updated at the start of each development phase.*
*Current phase: 1 — Auth & Settings Portal*