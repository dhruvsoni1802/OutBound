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
- Leave space below for future integrations (OpenRouter key, Brave Search, etc.) with
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

## What NOT to Build Yet (Phase 1 Scope)

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

## Acceptance Criteria — Phase 1

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

---

# PHASE 2 — Campaign Creation & Dashboard

---

## Phase 2 Overview

This phase adds the full campaign lifecycle:

1. **Campaign list page** — shows all campaigns for the authenticated user with live stats
2. **Multi-step campaign creation wizard** — collects all campaign config via a guided UI
3. **Config serialisation** — wizard state is serialised to JSON, sent to a Next.js API route
4. **Backend validation** — server-side parsing and validation using Zod before any DB write
5. **Supabase persistence** — validated campaign + contacts stored in dedicated tables
6. **Post-creation redirect** — user lands on the campaign detail/dashboard page

The AI agent does NOT run in this phase. Campaigns are created and stored only.
Contacts are uploaded via Excel file (.xlsx / .xls). CSV support is a future extension.

---

## New Routes & Files (Phase 2 additions)

Extend the existing folder structure with the following:

```
app/
├── campaigns/
│   ├── page.tsx                        # Campaign list — dashboard view
│   ├── new/
│   │   └── page.tsx                    # Multi-step campaign creation wizard
│   └── [id]/
│       └── page.tsx                    # Individual campaign detail / stats page
├── api/
│   └── campaigns/
│       ├── route.ts                    # POST /api/campaigns — create campaign
│       └── [id]/
│           └── route.ts                # GET /api/campaigns/:id — fetch single campaign

components/
├── campaigns/
│   ├── CampaignCard.tsx                # Card used in the list view
│   ├── CampaignStatsBar.tsx            # Sent / Replied / Conversion rate mini-stats
│   ├── wizard/
│   │   ├── WizardShell.tsx             # Step progress bar + navigation shell
│   │   ├── Step1_CampaignMeta.tsx      # Step 1: name, goal
│   │   ├── Step2_Persona.tsx           # Step 2: agent persona
│   │   ├── Step3_Sequence.tsx          # Step 3: follow-up count, delay, web search toggle
│   │   ├── Step4_Contacts.tsx          # Step 4: Excel file upload + preview table
│   │   └── Step5_Review.tsx            # Step 5: full summary before submit

lib/
├── validation/
│   └── campaign.ts                     # Zod schemas — shared between client and server
├── excel/
│   └── parseContacts.ts               # xlsx parsing utility — returns Contact[]
types/
└── campaign.ts                         # TypeScript interfaces for Campaign, Contact, etc.
```

Also update `middleware.ts` to protect `/campaigns/*` routes the same way `/settings/*` is protected.

---

## Supabase Schema — Phase 2 Migrations

Run these after the Phase 1 migrations.

### Migration 003 — Campaigns table

```sql
create type campaign_status as enum ('draft', 'active', 'paused', 'completed', 'archived');

create table public.campaigns (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,

  -- Meta
  name          text not null,
  goal          text not null,

  -- Agent persona
  agent_name    text not null,
  agent_company text not null,
  agent_tone    text not null,       -- 'professional' | 'friendly' | 'direct' | 'consultative'

  -- Sequence settings
  max_followups  integer not null default 3 check (max_followups between 1 and 10),
  followup_delay_hours integer not null default 48 check (followup_delay_hours between 1 and 168),
  web_search_enabled boolean not null default false,

  -- Status & stats (stats updated by agent later; zeroed on creation)
  status        campaign_status not null default 'draft',
  emails_sent   integer not null default 0,
  emails_replied integer not null default 0,
  conversions   integer not null default 0,

  -- Raw config snapshot — the exact JSON the wizard produced, stored for auditability
  config_snapshot jsonb not null,

  created_at    timestamptz default now() not null,
  updated_at    timestamptz default now() not null
);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger campaigns_updated_at
  before update on public.campaigns
  for each row execute procedure public.set_updated_at();

-- RLS
alter table public.campaigns enable row level security;
create policy "Users can manage own campaigns"
  on public.campaigns for all using (auth.uid() = user_id);
```

### Migration 004 — Contacts table

```sql
create type contact_status as enum (
  'pending',      -- not yet contacted
  'contacted',    -- initial email sent
  'replied',      -- recipient has replied at least once
  'converted',    -- terminal positive outcome
  'opted_out',    -- explicitly asked to stop
  'bounced',      -- email bounced
  'declined'      -- negative / hard no
);

create table public.contacts (
  id              uuid default gen_random_uuid() primary key,
  campaign_id     uuid references public.campaigns(id) on delete cascade not null,
  user_id         uuid references auth.users(id) on delete cascade not null,

  -- Contact details (parsed from Excel)
  first_name      text not null,
  last_name       text,
  email           text not null,
  company         text,
  role            text,
  context         text,             -- optional free-text context column from the Excel sheet

  -- Agent thread tracking (populated when agent runs — null until then)
  agentmail_thread_id  text,
  langgraph_thread_id  text,

  -- Status & counts
  status          contact_status not null default 'pending',
  followup_count  integer not null default 0,
  last_contacted_at timestamptz,

  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null,

  unique(campaign_id, email)        -- prevent duplicate contacts per campaign
);

create trigger contacts_updated_at
  before update on public.contacts
  for each row execute procedure public.set_updated_at();

-- RLS
alter table public.contacts enable row level security;
create policy "Users can manage own contacts"
  on public.contacts for all using (auth.uid() = user_id);

-- Index for agent lookups by thread
create index contacts_agentmail_thread_idx on public.contacts(agentmail_thread_id)
  where agentmail_thread_id is not null;
```

---

## Zod Validation Schemas (`lib/validation/campaign.ts`)

These schemas are the single source of truth for validation — used on both the
client (wizard review step) and the server (API route). Never duplicate validation logic.

```typescript
import { z } from 'zod'

export const AgentToneEnum = z.enum([
  'professional',
  'friendly',
  'direct',
  'consultative',
])

export const CampaignConfigSchema = z.object({
  // Step 1
  name: z
    .string()
    .min(3, 'Campaign name must be at least 3 characters')
    .max(80, 'Campaign name must be under 80 characters'),
  goal: z
    .string()
    .min(10, 'Please describe your goal in at least 10 characters')
    .max(500, 'Goal description must be under 500 characters'),

  // Step 2
  agentName: z
    .string()
    .min(2, 'Agent name must be at least 2 characters')
    .max(50),
  agentCompany: z
    .string()
    .min(2, 'Company name must be at least 2 characters')
    .max(100),
  agentTone: AgentToneEnum,

  // Step 3
  maxFollowups: z
    .number()
    .int()
    .min(1, 'At least 1 follow-up is required')
    .max(10, 'Maximum 10 follow-ups allowed'),
  followupDelayHours: z
    .number()
    .int()
    .min(1, 'Delay must be at least 1 hour')
    .max(168, 'Delay cannot exceed 7 days (168 hours)'),
  webSearchEnabled: z.boolean(),
})

export const ContactRowSchema = z.object({
  firstName:  z.string().min(1, 'First name is required'),
  lastName:   z.string().optional(),
  email:      z.string().email('Invalid email address'),
  company:    z.string().optional(),
  role:       z.string().optional(),
  context:    z.string().optional(),
})

export const CreateCampaignPayloadSchema = z.object({
  config:   CampaignConfigSchema,
  contacts: z
    .array(ContactRowSchema)
    .min(1, 'At least one contact is required')
    .max(1000, 'Maximum 1000 contacts per campaign'),
})

export type CampaignConfig      = z.infer<typeof CampaignConfigSchema>
export type ContactRow          = z.infer<typeof ContactRowSchema>
export type CreateCampaignPayload = z.infer<typeof CreateCampaignPayloadSchema>
```

Install Zod: `pnpm add zod`

---

## Excel Contact Upload (`lib/excel/parseContacts.ts`)

Install: `pnpm add xlsx`

```typescript
import * as XLSX from 'xlsx'
import { ContactRowSchema, ContactRow } from '@/lib/validation/campaign'

// Expected column headers in the Excel file (case-insensitive, trimmed)
// Required: first_name, email
// Optional: last_name, company, role, context
const HEADER_MAP: Record<string, keyof ContactRow> = {
  'first name':  'firstName',
  'first_name':  'firstName',
  'firstname':   'firstName',
  'last name':   'lastName',
  'last_name':   'lastName',
  'lastname':    'lastName',
  'email':       'email',
  'email address': 'email',
  'company':     'company',
  'organization': 'company',
  'role':        'role',
  'job title':   'role',
  'title':       'role',
  'context':     'context',
  'notes':       'context',
}

export interface ParseResult {
  contacts: ContactRow[]
  errors: { row: number; message: string }[]
}

export function parseContactsFromExcel(buffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
  })

  const contacts: ContactRow[] = []
  const errors: { row: number; message: string }[] = []

  rows.forEach((raw, index) => {
    // Normalise keys
    const normalised: Partial<Record<keyof ContactRow, unknown>> = {}
    for (const [key, value] of Object.entries(raw)) {
      const mapped = HEADER_MAP[key.toLowerCase().trim()]
      if (mapped) normalised[mapped] = value
    }

    const result = ContactRowSchema.safeParse(normalised)
    if (result.success) {
      contacts.push(result.data)
    } else {
      errors.push({
        row: index + 2, // +2: 1-indexed + header row
        message: result.error.errors.map((e) => e.message).join(', '),
      })
    }
  })

  return { contacts, errors }
}
```

---

## Multi-Step Wizard UI

### Wizard shell (`components/campaigns/wizard/WizardShell.tsx`)

The wizard has **5 steps**. The shell renders:
- A horizontal step progress bar at the top showing: Meta → Persona → Sequence → Contacts → Review
- The active step indicator uses the primary accent colour (`#6366F1`) with a filled circle
- Completed steps show a checkmark icon (lucide `Check`) in emerald
- Upcoming steps are muted (`#94A3B8`)
- Below the progress bar: the active step component
- Bottom navigation bar: "Back" (ghost button, left) and "Continue" / "Create Campaign" (primary, right)
- The "Back" button is hidden on Step 1
- The "Continue" button on Step 4 is disabled until at least one valid contact is parsed
- The "Create Campaign" button on Step 5 triggers the API submission

Wizard state is managed with `useReducer` in the shell component. Do not use a
third-party form library for the wizard itself — keep it simple.

### Step 1 — Campaign Meta (`Step1_CampaignMeta.tsx`)

Fields:
- **Campaign Name** — text input, required, 3–80 chars
  - Placeholder: `"Q2 SaaS Outreach"` 
- **Campaign Goal** — textarea, required, 10–500 chars
  - Placeholder: `"Book 20-minute discovery calls with VP-level engineering leads at Series B+ SaaS companies"`
  - Helper text below: `"This is passed to the AI agent as its primary objective"`

### Step 2 — Agent Persona (`Step2_Persona.tsx`)

Fields:
- **Agent Name** — text input, required
  - Label: `"Your agent's name"`, placeholder: `"Alex"`
  - Helper: `"This is the name the agent uses when signing emails"`
- **Company Name** — text input, required
  - Label: `"Your company name"`, placeholder: `"Acme Inc."`
- **Tone** — segmented control (4 options rendered as toggle buttons, not a dropdown):
  - `Professional` — `"Formal, structured, respects hierarchy"`
  - `Friendly` — `"Warm and approachable, first-name basis"`
  - `Direct` — `"Gets to the point, no filler"`
  - `Consultative` — `"Asks questions, advisory framing"`
  - Only one can be selected at a time; selected state uses accent fill

### Step 3 — Sequence Settings (`Step3_Sequence.tsx`)

Fields:
- **Max Follow-ups** — a custom stepper component (minus/plus buttons + number display)
  - Range: 1–10, default: 3
  - Helper: `"Total follow-up emails after the initial outreach"`
- **Delay Between Follow-ups** — another stepper but for hours
  - Range: 24–168 hours, step: 24, default: 48
  - Display the value in human-readable form: `"48 hours (2 days)"`
  - Helper: `"Minimum wait time before sending each follow-up"`
- **Web Search** — a toggle switch
  - Label: `"Enable web search"`
  - Description: `"Allows the agent to search the web for context about each contact before drafting emails. Improves personalisation but increases processing time."`
  - Default: off

### Step 4 — Contacts Upload (`Step4_Contacts.tsx`)

UI layout:
1. **Upload zone** — a dashed-border drag-and-drop area
   - Accepts `.xlsx` and `.xls` only (enforce via `accept` attribute)
   - Icon: lucide `Upload` or `FileSpreadsheet`
   - Text: `"Drag & drop your Excel file, or click to browse"`
   - Sub-text: `"Supports .xlsx and .xls — max 1,000 contacts"`
2. **Template download link** — `"Download sample template"` (generates a simple xlsx
   with the correct column headers using the `xlsx` library)
3. **Preview table** — rendered after successful parse:
   - Shows first 5 rows with columns: First Name, Last Name, Email, Company, Role
   - Below table: `"X contacts loaded"` count in muted text
   - If there are parse errors, show a collapsible error list:
     `"Y rows had errors and were skipped"` in amber, expandable to show row numbers and messages
4. **Re-upload** — a small "Change file" text button appears after a file is loaded

File parsing happens **client-side** using `parseContactsFromExcel` — do not send
the raw file to the server. Send only the parsed JSON contacts array.

### Step 5 — Review (`Step5_Review.tsx`)

A read-only summary of all entered values, grouped into three cards:

**Campaign** card:
- Name, Goal (truncated to 2 lines with `line-clamp-2`)

**Agent** card:
- Agent name, Company, Tone (shown as a badge)

**Sequence** card:
- Max follow-ups, Delay, Web search (on/off badge)

**Contacts** card:
- `"X contacts ready to import"` with a small table showing first 3 rows

At the bottom of Step 5: a **disclaimer** in muted text:
`"Campaigns are created in draft status. No emails will be sent until you activate the campaign."`

The "Create Campaign" button on this step shows a loading spinner while the API call is in flight.

---

## API Route — Create Campaign (`app/api/campaigns/route.ts`)

`POST /api/campaigns`

Request body (JSON):
```typescript
{
  config: CampaignConfig,     // wizard steps 1–3
  contacts: ContactRow[]      // parsed from Excel client-side
}
```

Handler steps:
1. Verify user session — return `401` if not authenticated
2. Check that user has a valid AgentMail integration — return `403` with message
   `"Please connect your AgentMail account before creating a campaign"` if not found
3. Parse and validate body using `CreateCampaignPayloadSchema.safeParse(body)`
   — return `400` with Zod error details if validation fails:
   ```json
   { "error": "Validation failed", "details": [ ...zodIssues ] }
   ```
4. Insert into `campaigns` table — map camelCase config fields to snake_case columns;
   set `config_snapshot` to the raw validated JSON payload
5. Bulk insert contacts into `contacts` table using Supabase's batch insert
   — attach `campaign_id` and `user_id` to every row
6. Return `201` with:
   ```json
   { "campaignId": "uuid", "contactsCreated": 42 }
   ```

Error handling:
- Unique constraint violation on `contacts(campaign_id, email)` → return `409`
  with `"Duplicate email addresses found in contact list"`
- Any unexpected DB error → return `500` with generic message, log the real error server-side

---

## Campaign List Page (`app/campaigns/page.tsx`)

This is the main page users land on after creating a campaign. It also becomes the
default post-login redirect target for users who already have campaigns
(update `middleware.ts` and `auth/callback/route.ts` accordingly: if user has ≥1 campaign,
redirect to `/campaigns`; otherwise redirect to `/campaigns/new` after a brief
`/settings/integrations` check).

Layout:
- Top bar: heading `"Campaigns"` on the left, `"+ New Campaign"` button on the right
  (primary accent, links to `/campaigns/new`)
- Below: a grid of `CampaignCard` components (2 columns on desktop, 1 on mobile)
- If no campaigns exist: an empty state illustration with the message
  `"No campaigns yet"` and a large CTA button `"Create your first campaign"`

`CampaignCard` component:
- Campaign name (large, `Sora` font)
- Status badge: `draft` (slate), `active` (emerald), `paused` (amber), `completed` (indigo)
- Three stats in a row: **Sent**, **Replied**, **Conversion %**
  - Stats shown as `0` for newly created campaigns
  - Conversion % = `(conversions / emails_sent * 100).toFixed(1)%` — show `—` if sent is 0
- Created date in muted text: `"Created Apr 26, 2026"`
- Clicking the card navigates to `/campaigns/[id]`

---

## Campaign Detail Page (`app/campaigns/[id]/page.tsx`)

Minimal for this phase — just needs to confirm the campaign was created successfully.

Layout:
- Back link: `"← All Campaigns"` linking to `/campaigns`
- Campaign name as page heading + status badge
- Two sections side by side on desktop:
  - **Config summary** — same read-only cards as the Review step (persona, sequence)
  - **Stats panel** — Sent / Replied / Conversion Rate, all showing `0` for now with
    a muted label `"Agent not yet activated"`
- A contacts count: `"X contacts imported"` with a table showing the first 10 rows
  (columns: Name, Email, Company, Role, Status)
- A disabled `"Activate Campaign"` button with tooltip: `"Coming in the next release"`

---

## Navigation Update

Update `components/settings/Sidebar.tsx` to also include top-level app navigation.
Add a top nav bar (or update the existing layout) so authenticated users always see:

- **Embra** logo (top-left) — links to `/campaigns`
- **Campaigns** nav item — links to `/campaigns`
- **Settings** nav item — links to `/settings/integrations`
- User avatar + email (top-right) with a dropdown containing **Sign out**

The settings sidebar (Integrations, Campaign Defaults, etc.) remains inside the
`/settings` layout only.

---

## New Dependencies (Phase 2)

```bash
pnpm add zod xlsx

# Additional shadcn components needed
pnpm dlx shadcn@latest add textarea switch progress dialog table tooltip
```

---

## Acceptance Criteria — Phase 2

Before moving to Phase 3, verify:

- [ ] `/campaigns` is protected — unauthenticated users redirected to `/`
- [ ] User without an AgentMail key sees a banner on `/campaigns/new` prompting them to connect first
- [ ] All 5 wizard steps render and validate correctly
- [ ] Tone selector allows exactly one selection at a time
- [ ] Stepper component respects min/max bounds for follow-ups and delay
- [ ] Excel upload accepts only `.xlsx` / `.xls` files
- [ ] Upload parses contacts client-side and shows a preview table
- [ ] Parse errors are shown per-row in an amber collapsible section
- [ ] "Continue" on Step 4 is disabled until at least one valid contact is parsed
- [ ] Step 5 review shows accurate summary of all previous steps
- [ ] Clicking "Create Campaign" sends the JSON payload to `POST /api/campaigns`
- [ ] Server validates with Zod — bad payloads return `400` with error details
- [ ] Server checks for AgentMail integration — missing key returns `403`
- [ ] On success, user is redirected to `/campaigns/[id]`
- [ ] Campaign detail page shows the correct config and contact count
- [ ] `/campaigns` list shows the newly created campaign card with status `draft`
- [ ] Stats show `0` values with correct `—` placeholder for conversion rate
- [ ] All UI responsive to 375px
- [ ] No TypeScript errors (`pnpm tsc --noEmit` passes)

---

*Current phase: 2 — Campaign Creation & Dashboard*
*Next phase: 3 — LangGraph agent integration + campaign activation*

---

---

# PHASE 3 — LangGraph Agent + Campaign Activation

---

## Phase 3 Overview

This phase wires the AI brain to the email infrastructure. It covers:

1. **Campaign activation** — the "Activate Campaign" button provisions an AgentMail inbox,
   registers a webhook, and kicks off the LangGraph agent for every pending contact
2. **Python agent service** — a standalone FastAPI + LangGraph service (separate from Next.js)
   that owns all agent logic, running on its own process/container
3. **LangGraph graph** — stateful graph with nodes for drafting, sending, processing replies,
   and composing follow-ups, using an OpenRouter free model as the LLM backbone and Brave Search for web search
4. **AgentMail integration** — Python SDK called directly from LangGraph nodes; no special
   connector exists, the SDK is just a library
5. **Webhook receiver** — FastAPI endpoint that receives `message.received` events from
   AgentMail, verifies signatures with Svix, and resumes the correct LangGraph thread
6. **Real-time event bridge** — the Next.js frontend polls or subscribes to contact status
   updates so the dashboard reflects agent activity

The Next.js app calls the Python agent service over HTTP. The two services are deployed
separately: Next.js to Vercel, the Python agent service to Railway/Render/Fly.io.

---

## Architecture: Two Services

```
┌─────────────────────────┐        ┌──────────────────────────────────┐
│   Next.js (Vercel)      │        │   Python Agent Service           │
│                         │        │   (Railway / Render / Fly.io)    │
│  app/api/campaigns/     │        │                                  │
│  [id]/activate/route.ts │──POST──►  POST /campaigns/:id/activate    │
│                         │        │    └─► provisions AgentMail inbox│
│  app/campaigns/[id]/    │        │    └─► registers webhook         │
│  page.tsx               │◄─poll──│    └─► starts LangGraph per      │
│  (contact status table) │        │        contact                   │
│                         │        │                                  │
└─────────────────────────┘        │  POST /webhooks/agentmail        │
                                   │    └─► verifies Svix signature   │
           AgentMail ──webhook────►│    └─► finds LangGraph thread    │
                                   │    └─► resumes graph in bg task  │
                                   │                                  │
                                   │  GET /campaigns/:id/contacts     │
                                   │    └─► returns live contact      │
                                   │        statuses for polling      │
                                   └──────────────────────────────────┘
```

---

## Python Agent Service — Project Structure

This is a **separate Python project** in a subdirectory `agent/` at the repo root.

```
agent/
├── main.py                        # FastAPI app entry point
├── routers/
│   ├── campaigns.py               # POST /campaigns/:id/activate
│   │                              # GET  /campaigns/:id/contacts
│   └── webhooks.py                # POST /webhooks/agentmail
├── graph/
│   ├── state.py                   # EmailAgentState TypedDict
│   ├── graph.py                   # LangGraph StateGraph definitions
│   └── nodes/
│       ├── classify.py            # classify_needs_node
│       ├── search.py              # search_context_node (Brave Search API)
│       ├── draft.py               # draft_email_node
│       ├── send.py                # send_email_node
│       ├── process_reply.py       # process_reply_node
│       ├── compose_followup.py    # compose_followup_node
│       └── terminal.py            # check_terminal_node
├── prompts/
│   └── templates.py               # All system prompt strings
├── inbox/
│   └── client.py                  # AgentMail SDK wrapper
├── db/
│   ├── supabase.py                # Supabase client (supabase-py)
│   └── queries.py                 # DB read/write helpers for contacts & campaigns
├── requirements.txt
├── .env.example
└── Dockerfile
```

---

## Python Dependencies (`agent/requirements.txt`)

```
fastapi==0.115.0
uvicorn[standard]==0.30.0
langgraph==0.2.0
langchain-openai==0.2.0      # OpenRouter via OpenAI-compatible API
langchain-core==0.3.0
agentmail==0.1.0            # AgentMail Python SDK
httpx==0.27.0               # Brave Search API
supabase==2.5.0             # supabase-py for DB access
svix==1.24.0                # Webhook signature verification
python-dotenv==1.0.0
pydantic==2.7.0
langsmith==0.1.0
```

---

## Agent Environment Variables (`agent/.env.example`)

```bash
# LLM
OPENROUTER_API_KEY=sk-or-v1-...

# Web search (Brave includes a free tier / free monthly credits)
BRAVE_SEARCH_API_KEY=...

# Supabase (service role for server-to-server DB access)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Encryption — same key as Next.js to decrypt stored AgentMail API keys
ENCRYPTION_KEY=

# Webhook
AGENTMAIL_WEBHOOK_SECRET=whsec_...   # fetched after webhook creation, stored here

# Service
AGENT_SERVICE_URL=https://your-agent-service-url   # public base URL used for webhook registration; use ngrok URL in dev
AGENT_SERVICE_SECRET=                # shared secret between Next.js and this service
PORT=8000

# Observability
LANGSMITH_API_KEY=ls__...
LANGSMITH_TRACING=true
LANGSMITH_PROJECT=embra-agent
```

---

## LangGraph State (`graph/state.py`)

```python
from typing import Optional
from typing_extensions import TypedDict

class EmailAgentState(TypedDict):
    # Identity
    contact_id: str               # Supabase contacts.id
    contact_name: str
    contact_email: str
    contact_company: Optional[str]
    contact_role: Optional[str]
    contact_context: Optional[str]

    # Campaign config (loaded at activation time, frozen into state)
    campaign_id: str
    user_id: str
    inbox_id: str                 # AgentMail inbox_id for this campaign
    system_prompt: str            # Rendered prompt from campaign config
    agent_name: str
    agent_company: str
    max_followups: int
    followup_delay_hours: int
    web_search_enabled: bool

    # Thread tracking
    agentmail_thread_id: Optional[str]   # Set after first send
    message_history: list[dict]          # [{role, content, timestamp}]
    followup_count: int

    # Execution control
    needs_search: bool
    search_query: Optional[str]
    search_results: Optional[str]
    current_task: str             # "draft_initial" | "compose_followup"
    inbound_reply: Optional[str]  # Injected by webhook handler on resume
    intent: Optional[str]         # Classified intent of inbound reply

    # Terminal
    terminal: bool
    terminal_reason: Optional[str]
```

---

## LangGraph Graph (`graph/graph.py`)

There are **two graphs**:

**`outreach_graph`** — runs when a contact is first activated (sends the initial email)

**`reply_graph`** — runs when a webhook fires for an inbound reply (processes + responds)

Keeping them separate avoids the complexity of a single graph that must handle both
entry points. They share all the same nodes.

```python
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.postgres import PostgresSaver
from graph.state import EmailAgentState
from graph.nodes import (
    classify, search, draft, send, process_reply, compose_followup, terminal
)

# ── Outreach graph (initial send) ──────────────────────────────────────────
def build_outreach_graph(checkpointer):
    g = StateGraph(EmailAgentState)
    g.add_node("classify_needs",     classify.run)
    g.add_node("search_context",     search.run)
    g.add_node("draft_email",        draft.run)
    g.add_node("send_email",         send.run)

    g.add_edge(START, "classify_needs")
    g.add_conditional_edges(
        "classify_needs",
        lambda s: "search_context" if s["needs_search"] else "draft_email"
    )
    g.add_edge("search_context", "draft_email")
    g.add_edge("draft_email",    "send_email")
    g.add_edge("send_email",     END)

    return g.compile(checkpointer=checkpointer)


# ── Reply graph (process inbound + follow-up) ──────────────────────────────
def build_reply_graph(checkpointer):
    g = StateGraph(EmailAgentState)
    g.add_node("process_reply",      process_reply.run)
    g.add_node("check_terminal",     terminal.run)
    g.add_node("classify_needs",     classify.run)
    g.add_node("search_context",     search.run)
    g.add_node("compose_followup",   compose_followup.run)
    g.add_node("send_followup",      send.run)

    g.add_edge(START,              "process_reply")
    g.add_edge("process_reply",    "check_terminal")
    g.add_conditional_edges(
        "check_terminal",
        lambda s: END if s["terminal"] else "classify_needs"
    )
    g.add_conditional_edges(
        "classify_needs",
        lambda s: "search_context" if s["needs_search"] else "compose_followup"
    )
    g.add_edge("search_context",   "compose_followup")
    g.add_edge("compose_followup", "send_followup")
    g.add_edge("send_followup",    "check_terminal")

    return g.compile(checkpointer=checkpointer)
```

Use **`PostgresSaver`** as the checkpointer — this is what persists state between
invocations. The Supabase Postgres connection string works here.

```python
from langgraph.checkpoint.postgres import PostgresSaver

checkpointer = PostgresSaver.from_conn_string(os.environ["DATABASE_URL"])
checkpointer.setup()  # creates checkpoint tables if they don't exist
```

Add `DATABASE_URL` to `agent/.env.example`:
```bash
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
```

---

## Node Implementations

### `classify.py` — classify_needs_node

Calls the OpenRouter model to decide if web search is needed before drafting.

```python
import json
import os
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model="openrouter/free",
    api_key=os.environ["OPENROUTER_API_KEY"],
    base_url="https://openrouter.ai/api/v1",
)

def run(state: EmailAgentState) -> dict:
    if not state["web_search_enabled"]:
        return {"needs_search": False, "search_query": None}

    prompt = f"""You are about to draft an outreach email.

Contact: {state['contact_name']} ({state.get('contact_role', '')} at {state.get('contact_company', '')})
Existing context: {state.get('contact_context') or 'None'}
Task: {state['current_task']}

Do you have enough context to write a compelling, personalised email?
If not, what single web search query would give you the most useful additional context?

Return ONLY valid JSON: {{"needs_search": bool, "search_query": string | null}}"""

    result = llm.invoke(prompt)
    parsed = json.loads(result.content)
    return {
        "needs_search": parsed["needs_search"],
        "search_query": parsed.get("search_query"),
    }
```

### `search.py` — search_context_node

Calls Brave Search and injects a summarised result into state (max ~400 tokens).

```python
import os
import httpx

def run(state: EmailAgentState) -> dict:
    if not state.get("search_query"):
        return {"search_results": None}

    response = httpx.get(
        "https://api.search.brave.com/res/v1/web/search",
        headers={"X-Subscription-Token": os.environ["BRAVE_SEARCH_API_KEY"]},
        params={"q": state["search_query"], "count": 3, "country": "us", "search_lang": "en"},
        timeout=10.0,
    )
    response.raise_for_status()
    results = response.json()
    summary = "\n\n".join(
        f"Source: {r['url']}\n{r.get('description', '')[:300]}"
        for r in results.get("web", {}).get("results", [])
    )
    return {"search_results": summary[:2000]}   # hard cap to avoid bloating context
```

### `draft.py` — draft_email_node

Calls the OpenRouter model with the full system prompt to produce the initial outreach email.

```python
from prompts.templates import render_outreach_prompt

def run(state: EmailAgentState) -> dict:
    system = render_outreach_prompt(state)
    user_msg = f"""Draft the initial outreach email to {state['contact_name']}.

Return ONLY valid JSON:
{{
  "subject": "email subject line",
  "body": "plain text email body"
}}"""

    result = llm.invoke([
        {"role": "system", "content": system},
        {"role": "user",   "content": user_msg},
    ])
    email = json.loads(result.content)
    return {"draft_email": email}
```

### `send.py` — send_email_node and send_followup_node

Calls AgentMail Python SDK. The same node handles both initial send and follow-ups —
the presence of `agentmail_thread_id` in state determines whether to thread the reply.

```python
from inbox.client import get_agentmail_client
from db.queries import update_contact_status, update_contact_thread_ids

def run(state: EmailAgentState) -> dict:
    client = get_agentmail_client(state["user_id"])  # decrypts key from Supabase
    draft = state["draft_email"]

    send_kwargs = dict(
        inbox_id=state["inbox_id"],
        to=[state["contact_email"]],
        subject=draft["subject"],
        text=draft["body"],
    )

    # If we already have a thread_id, reply on the same thread
    if state.get("agentmail_thread_id"):
        send_kwargs["thread_id"] = state["agentmail_thread_id"]

    message = client.inboxes.messages.send(**send_kwargs)

    # Store thread_id from first send
    new_thread_id = state.get("agentmail_thread_id") or message.thread_id

    # Persist to Supabase
    update_contact_thread_ids(
        contact_id=state["contact_id"],
        agentmail_thread_id=new_thread_id,
        langgraph_thread_id=state["contact_id"],  # we use contact_id as lg thread key
    )
    update_contact_status(state["contact_id"], "contacted")

    history = state.get("message_history", [])
    history.append({
        "role": "agent",
        "content": draft["body"],
        "subject": draft["subject"],
        "timestamp": message.created_at,
    })

    return {
        "agentmail_thread_id": new_thread_id,
        "message_history": history,
        "followup_count": state.get("followup_count", 0),
    }
```

### `process_reply.py` — process_reply_node

Classifies the intent of the inbound reply using structured output from the OpenRouter model.

```python
INTENT_PROMPT = """Classify the intent of this email reply.

Valid intents:
- POSITIVE: interest shown, wants to connect or learn more
- NEUTRAL: no clear signal either way
- QUESTION: asks a specific question about the product or service
- NEGATIVE: declines, not interested
- OPT_OUT: explicitly asks to unsubscribe or stop receiving emails
- OUT_OF_OFFICE: automated out-of-office reply

Reply:
{reply_text}

Return ONLY valid JSON: {{"intent": "INTENT_VALUE"}}"""

def run(state: EmailAgentState) -> dict:
    reply = state.get("inbound_reply", "")

    result = llm.invoke(INTENT_PROMPT.format(reply_text=reply))
    parsed = json.loads(result.content)

    history = state.get("message_history", [])
    history.append({"role": "contact", "content": reply})

    return {
        "intent": parsed["intent"],
        "message_history": history,
        "current_task": "compose_followup",
    }
```

### `terminal.py` — check_terminal_node

Evaluates all terminal conditions and updates Supabase contact status.

```python
from db.queries import update_contact_status, increment_campaign_stat

TERMINAL_INTENTS = {"NEGATIVE", "OPT_OUT", "OUT_OF_OFFICE"}

def run(state: EmailAgentState) -> dict:
    intent = state.get("intent")
    followup_count = state.get("followup_count", 0)

    terminal = False
    reason = None

    if intent in TERMINAL_INTENTS:
        terminal = True
        reason = intent.lower()
    elif intent == "POSITIVE" and followup_count >= 1:
        # Positive reply after we've engaged — treat as converted
        terminal = True
        reason = "converted"
    elif followup_count >= state["max_followups"]:
        terminal = True
        reason = "max_followups_reached"

    status_map = {
        "converted":           "converted",
        "opt_out":             "opted_out",
        "negative":            "declined",
        "max_followups_reached": "declined",
        "out_of_office":       "pending",   # retry later
    }

    if terminal:
        new_status = status_map.get(reason, "declined")
        update_contact_status(state["contact_id"], new_status)
        if reason == "converted":
            increment_campaign_stat(state["campaign_id"], "conversions")

    return {"terminal": terminal, "terminal_reason": reason}
```

---

## System Prompt Templates (`prompts/templates.py`)

```python
BASE_PROMPT = """You are {agent_name}, an outreach specialist at {agent_company}.

MISSION: {goal}

TONE: {tone_instruction}

RULES:
1. Keep all emails under 150 words unless answering a specific technical question.
2. Always address the recipient by their first name.
3. Never send more than one email per {followup_delay_hours} hours.
4. If the recipient asks to stop or unsubscribe, immediately set terminal=true.
5. Be genuinely helpful — never pushy or manipulative.
6. Sign off as {agent_name} from {agent_company}.

RECIPIENT:
Name: {contact_name}
Company: {contact_company}
Role: {contact_role}
Context: {contact_context}
{search_section}

CONVERSATION HISTORY:
{history_section}"""

TONE_INSTRUCTIONS = {
    "professional":  "Formal, structured, and respectful of hierarchy. Use full names initially.",
    "friendly":      "Warm, approachable, and conversational. First-name basis from the start.",
    "direct":        "Get to the point immediately. No filler sentences or pleasantries.",
    "consultative":  "Ask thoughtful questions. Frame yourself as an advisor, not a salesperson.",
}

def render_outreach_prompt(state: dict) -> str:
    history = state.get("message_history", [])
    history_section = "\n".join(
        f"[{m['role'].upper()}]: {m['content']}" for m in history
    ) if history else "No prior conversation."

    search_section = ""
    if state.get("search_results"):
        search_section = f"\nADDITIONAL CONTEXT FROM WEB SEARCH:\n{state['search_results']}"

    return BASE_PROMPT.format(
        agent_name=state["agent_name"],
        agent_company=state["agent_company"],
        goal=state["system_prompt"],
        tone_instruction=TONE_INSTRUCTIONS[state.get("agent_tone", "professional")],
        followup_delay_hours=state["followup_delay_hours"],
        contact_name=state["contact_name"],
        contact_company=state.get("contact_company") or "Unknown",
        contact_role=state.get("contact_role") or "Unknown",
        contact_context=state.get("contact_context") or "No additional context.",
        search_section=search_section,
        history_section=history_section,
    )
```

---

## AgentMail Client Wrapper (`inbox/client.py`)

This wrapper decrypts the stored API key from Supabase and returns a configured
AgentMail client. It caches clients in memory per user_id to avoid repeated DB calls.

```python
import os
from functools import lru_cache
from agentmail import AgentMail
from db.supabase import get_supabase_admin
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import base64

@lru_cache(maxsize=256)
def get_agentmail_client(user_id: str) -> AgentMail:
    supabase = get_supabase_admin()
    row = (
        supabase.table("user_integrations")
        .select("encrypted_key")
        .eq("user_id", user_id)
        .eq("provider", "agentmail")
        .single()
        .execute()
    )
    encrypted = row.data["encrypted_key"]
    api_key = decrypt_key(encrypted)
    return AgentMail(api_key=api_key)


def decrypt_key(encrypted_b64: str) -> str:
    raw = base64.b64decode(encrypted_b64)
    nonce, ciphertext = raw[:12], raw[12:]
    key = base64.b64decode(os.environ["ENCRYPTION_KEY"])
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ciphertext, None).decode()
```

---

## Campaign Activation API (`routers/campaigns.py`)

`POST /campaigns/{campaign_id}/activate`

This is the endpoint Next.js calls when the user clicks "Activate Campaign".

Steps:
1. Verify `AGENT_SERVICE_SECRET` header to authenticate the call from Next.js
2. Load campaign + contacts from Supabase (all contacts with `status = 'pending'`)
3. Decrypt user's AgentMail API key and create a campaign inbox:
   ```python
   inbox = client.inboxes.create(username=f"embra-{campaign_id[:8]}")
   ```
4. Register the webhook on that inbox (idempotent — check if already registered):
   ```python
   webhook = client.webhooks.create(
       url=f"{os.environ['AGENT_SERVICE_URL']}/webhooks/agentmail",
       event_types=["message.received", "message.bounced", "message.complained"],
       inbox_ids=[inbox.inbox_id],
   )
   # Store webhook.secret in env / Supabase for later verification
   ```
5. Store `inbox_id` on the campaign row in Supabase
6. Update campaign `status` to `'active'`
7. For each pending contact, launch the outreach graph as a **FastAPI BackgroundTask**:
   ```python
   background_tasks.add_task(run_outreach_for_contact, campaign, contact, inbox_id)
   ```
8. Return `{"status": "activated", "inbox_id": inbox.inbox_id, "contacts_queued": N}`

`run_outreach_for_contact` function:
```python
async def run_outreach_for_contact(campaign, contact, inbox_id):
    initial_state = EmailAgentState(
        contact_id=contact["id"],
        contact_name=contact["first_name"],
        contact_email=contact["email"],
        # ... all fields from campaign + contact rows
        current_task="draft_initial",
        followup_count=0,
        terminal=False,
        # ...
    )
    config = {"configurable": {"thread_id": contact["id"]}}
    await outreach_graph.ainvoke(initial_state, config=config)
```

The LangGraph `thread_id` is set to the Supabase `contact.id` — this is the stable
key used to resume the graph from the webhook handler.

---

## Webhook Receiver (`routers/webhooks.py`)

`POST /webhooks/agentmail`

This is the most critical endpoint — it must return 200 instantly and process in background.

```python
from fastapi import APIRouter, Request, BackgroundTasks, HTTPException
from svix.webhooks import Webhook, WebhookVerificationError
import json

router = APIRouter()

@router.post("/webhooks/agentmail")
async def agentmail_webhook(request: Request, background_tasks: BackgroundTasks):
    # 1. Read raw body BEFORE any parsing (required by Svix)
    payload = await request.body()
    headers = dict(request.headers)

    # 2. Verify Svix signature — return 400 if invalid, 200 if invalid but handled
    try:
        wh = Webhook(os.environ["AGENTMAIL_WEBHOOK_SECRET"])
        event = wh.verify(payload, headers)
    except WebhookVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # 3. Return 200 immediately — process in background
    background_tasks.add_task(handle_event, event)
    return {"ok": True}


async def handle_event(event: dict):
    event_type = event.get("event_type")

    if event_type == "message.received":
        await handle_message_received(event["message"])
    elif event_type == "message.bounced":
        await handle_bounce(event)
    elif event_type == "message.complained":
        await handle_complaint(event)


async def handle_message_received(message: dict):
    agentmail_thread_id = message["thread_id"]
    reply_text = message.get("text", "")

    # If text was omitted due to 1MB payload limit, fetch it
    if not reply_text:
        client = get_agentmail_client_by_inbox(message["inbox_id"])
        full_msg = client.inboxes.messages.get(
            inbox_id=message["inbox_id"],
            message_id=message["message_id"],
        )
        reply_text = full_msg.text or ""

    # Look up which contact this thread belongs to
    contact = get_contact_by_agentmail_thread(agentmail_thread_id)
    if not contact:
        return  # Unknown thread — ignore

    # Resume the reply graph with the inbound message
    config = {"configurable": {"thread_id": contact["id"]}}
    resume_state = {"inbound_reply": reply_text}
    await reply_graph.ainvoke(resume_state, config=config)
```

Key rule: **always pass `request.body()` raw to Svix** — never `request.json()`.
Svix verifies the raw bytes; parsing first will break signature verification.

---

## Supabase DB Queries (`db/queries.py`)

Key helper functions needed by the agent nodes:

```python
def update_contact_status(contact_id: str, status: str):
    supabase.table("contacts").update({"status": status}).eq("id", contact_id).execute()

def update_contact_thread_ids(contact_id, agentmail_thread_id, langgraph_thread_id):
    supabase.table("contacts").update({
        "agentmail_thread_id": agentmail_thread_id,
        "langgraph_thread_id": langgraph_thread_id,
        "last_contacted_at": "now()",
    }).eq("id", contact_id).execute()

def get_contact_by_agentmail_thread(agentmail_thread_id: str) -> dict | None:
    result = (
        supabase.table("contacts")
        .select("*")
        .eq("agentmail_thread_id", agentmail_thread_id)
        .maybe_single()
        .execute()
    )
    return result.data

def increment_campaign_stat(campaign_id: str, field: str):
    # Uses Supabase RPC to atomically increment a counter
    supabase.rpc("increment_campaign_stat", {
        "p_campaign_id": campaign_id,
        "p_field": field,
    }).execute()
```

Add a Supabase SQL function for atomic stat increments:

```sql
-- Migration 005 — atomic stat increment
create or replace function increment_campaign_stat(p_campaign_id uuid, p_field text)
returns void as $$
begin
  execute format(
    'update public.campaigns set %I = %I + 1, updated_at = now() where id = $1',
    p_field, p_field
  ) using p_campaign_id;
end;
$$ language plpgsql security definer;
```

---

## Next.js — Campaign Activation Button

Update `app/campaigns/[id]/page.tsx` to make the "Activate Campaign" button functional.

**New API route: `app/api/campaigns/[id]/activate/route.ts`**

```typescript
// POST /api/campaigns/:id/activate
export async function POST(req: Request, { params }: { params: { id: string } }) {
  // 1. Verify user session
  // 2. Verify the campaign belongs to this user
  // 3. Forward request to Python agent service:
  const response = await fetch(
    `${process.env.AGENT_SERVICE_URL}/campaigns/${params.id}/activate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Agent-Secret": process.env.AGENT_SERVICE_SECRET!,
      },
      body: JSON.stringify({ user_id: session.user.id }),
    }
  )
  const data = await response.json()
  return Response.json(data, { status: response.status })
}
```

Add to `app/.env.local.example`:
```bash
AGENT_SERVICE_URL=http://localhost:8000
AGENT_SERVICE_SECRET=           # shared secret, generate with: openssl rand -hex 32
```

**UI update on `app/campaigns/[id]/page.tsx`:**
- Remove the disabled state from "Activate Campaign" button
- On click: POST to `/api/campaigns/:id/activate`
- Show loading spinner during the request
- On success: update campaign status badge to "active" optimistically;
  show toast: `"Campaign activated — your agent is now reaching out to contacts"`
- On error: show toast with the error message

---

## Contact Status Polling (Next.js)

The campaign detail page should show live contact statuses as the agent works.

Add a `useEffect` that polls `GET /api/campaigns/:id/contacts` every 15 seconds
when the campaign status is `active`. Stop polling when all contacts are terminal.

**New API route: `app/api/campaigns/[id]/contacts/route.ts`**
- Reads contact rows from Supabase for this campaign
- Returns `{ contacts: Contact[], summary: { pending, contacted, replied, converted, terminal } }`

The contacts table on the campaign detail page should auto-refresh with the new data.
Show a small animated pulse indicator next to the "Active" status badge while polling
to signal that the agent is running.

---

## New Supabase Migration (Phase 3)

### Migration 005 — Campaign inbox tracking + stat increment function

```sql
-- Add inbox tracking to campaigns
alter table public.campaigns
  add column if not exists inbox_id text,
  add column if not exists webhook_id text;

-- Atomic stat increment function
create or replace function increment_campaign_stat(p_campaign_id uuid, p_field text)
returns void as $$
begin
  execute format(
    'update public.campaigns set %I = %I + 1, updated_at = now() where id = $1',
    p_field, p_field
  ) using p_campaign_id;
end;
$$ language plpgsql security definer;
```

---

## Local Development Setup

### Running both services locally

Terminal 1 — Next.js:
```bash
cd embra
pnpm dev
```

Terminal 2 — Python agent service:
```bash
cd agent
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Terminal 3 — ngrok (for AgentMail webhooks during dev):
```bash
ngrok http 8000
# Copy the https URL → set as AGENT_SERVICE_URL in agent/.env
# Register this URL with AgentMail when activating a campaign
```

Local dev should use the same webhook flow as production. Expose the FastAPI service with
ngrok (or another tunnel), set `AGENT_SERVICE_URL` to that public URL, and register the
same `/webhooks/agentmail` endpoint during campaign activation.

---

## New Dependencies (Phase 3)

Next.js additions:
```bash
# No new npm packages needed for Phase 3
```

Python agent service:
```bash
pip install fastapi uvicorn langgraph langchain-openai agentmail \
            httpx supabase svix python-dotenv pydantic \
            langsmith cryptography psycopg2-binary
```

---

## Acceptance Criteria — Phase 3

Before considering this phase complete, verify:

- [ ] "Activate Campaign" button calls Next.js API → forwards to Python service
- [ ] Python service provisions an AgentMail inbox for the campaign
- [ ] Webhook is registered on the inbox; secret stored in env
- [ ] All pending contacts have their outreach graph launched as background tasks
- [ ] Campaign status updates to `active` in Supabase
- [ ] Initial email is drafted by the OpenRouter free model using campaign system prompt
- [ ] If `web_search_enabled`, Brave Search is called when agent signals `needs_search=True`
- [ ] Email is sent via AgentMail SDK; `agentmail_thread_id` stored on contact row
- [ ] Contact status updates to `contacted` in Supabase after first send
- [ ] Webhook endpoint returns 200 immediately and processes in background
- [ ] Svix signature verification rejects forged requests with 400
- [ ] Inbound reply fires the reply graph via background task
- [ ] Reply intent is classified correctly (test with POSITIVE, OPT_OUT, NEGATIVE cases)
- [ ] OPT_OUT reply → terminal=True, contact status = `opted_out`, no further emails
- [ ] POSITIVE reply → follow-up composed and sent on the same AgentMail thread
- [ ] `followup_count` increments correctly; agent stops at `max_followups`
- [ ] `message.bounced` webhook → contact status = `bounced`
- [ ] `message.complained` webhook → contact status = `opted_out`
- [ ] Campaign stats (emails_sent, emails_replied, conversions) increment atomically
- [ ] Contact status table on dashboard refreshes every 15s while campaign is active
- [ ] LangSmith traces show full node execution for each contact
- [ ] No TypeScript errors on Next.js side (`pnpm tsc --noEmit` passes)
- [ ] Python service starts without errors (`uvicorn main:app`)

---

*Current phase: 3 — LangGraph Agent + Campaign Activation*
*Next phase: 3.5 — Campaign Type Extensibility (wizard + prompt compiler + attachments)*

---

---

# PHASE 3 AMENDMENTS — Extensibility Retrofit

These are targeted changes to Phase 3 files only. Phase 3 must be complete before
applying these. Do not re-implement Phase 3 from scratch — surgically modify
the listed files.

---

## Amendment A — Replace `prompts/templates.py` entirely

Delete the existing single-template file and replace with a prompt compiler
that dispatches per campaign type.

**`agent/prompts/templates.py`** — full replacement:

```python
from typing import Any

# ── Tone instructions (shared across all campaign types) ───────────────────
TONE_INSTRUCTIONS: dict[str, str] = {
    "professional":  "Formal and structured. Use full names. Respect hierarchy.",
    "friendly":      "Warm and conversational. First-name basis from the start.",
    "direct":        "Get to the point immediately. Zero filler sentences.",
    "consultative":  "Lead with questions. Position yourself as an advisor, not a vendor.",
}

# ── Campaign type → compiler dispatch ─────────────────────────────────────
def compile_system_prompt(campaign: dict) -> str:
    """
    Entry point. Called once at campaign activation.
    campaign must have keys: campaign_type, context_fields, config_snapshot
    """
    campaign_type = campaign.get("campaign_type", "custom")
    context = campaign.get("context_fields", {})
    config  = campaign.get("config_snapshot", {})

    COMPILERS = {
        "recruitment_outreach":  _compile_recruitment,
        "sales_outreach":        _compile_sales,
        "investor_outreach":     _compile_investor,
        "partnership_outreach":  _compile_partnership,
        "custom":                _compile_custom,
    }
    compiler = COMPILERS.get(campaign_type, _compile_custom)
    return compiler(config, context)


# ── Shared footer injected into every prompt ──────────────────────────────
_SHARED_RULES = """
UNIVERSAL RULES (non-negotiable):
1. Never send more than one email per {delay}h to the same person.
2. If the recipient says stop / unsubscribe / not interested — stop immediately.
3. Keep emails under 150 words unless answering a direct technical question.
4. Personalise every email using what you know about the recipient.
5. One clear CTA per email — never ask for two things at once.
6. Sign every email as {agent_name} from {agent_company}.
"""

def _shared_footer(config: dict) -> str:
    return _SHARED_RULES.format(
        delay=config.get("followupDelayHours", 48),
        agent_name=config.get("agentName", "the agent"),
        agent_company=config.get("agentCompany", ""),
    )


# ── RECRUITMENT OUTREACH ───────────────────────────────────────────────────
def _compile_recruitment(config: dict, ctx: dict) -> str:
    tone = TONE_INSTRUCTIONS.get(config.get("agentTone", "professional"), "")
    attachments_note = (
        "Always attach the resume on the initial email."
        if ctx.get("resume_attached") else
        "No attachments — rely on the email body alone."
    )
    return f"""You are {config.get('agentName')}, a candidate actively looking for new roles.

GOAL: {config.get('goal')}

YOUR BACKGROUND:
- Current / most recent role: {ctx.get('current_role', 'Not specified')}
- Education: {ctx.get('degree', 'Not specified')}
- Core skills: {', '.join(ctx.get('skills', []))}
- Notable projects / work: {ctx.get('notable_projects', 'Not specified')}
- LinkedIn: {ctx.get('linkedin_url', 'Not provided')}

TONE: {tone}

WHEN DRAFTING THE INITIAL EMAIL:
- Reference the specific role or company you found the recruiter at.
- Lead with the single most relevant skill or project for that role.
- {attachments_note}
- End with: "I'd love to connect if you think my background could be a good fit."

FOLLOW-UP BEHAVIOUR:
- No reply after {{delay}}h: 2-sentence gentle bump — reference the original email.
- They ask for more info: answer specifically, then re-state the CTA.
- Role is filled: ask if there are other openings or if they can refer you.
- Not a fit: thank them, ask if they know someone else who might be.
- They request interview / screening: reply with availability — this is a CONVERSION.

CONVERSION = recipient replies to schedule an interview or screening call.
{_shared_footer(config)}"""


# ── SALES OUTREACH ─────────────────────────────────────────────────────────
def _compile_sales(config: dict, ctx: dict) -> str:
    tone = TONE_INSTRUCTIONS.get(config.get("agentTone", "professional"), "")
    social_proof = ctx.get("social_proof", "")
    social_proof_line = f"Social proof you can reference: {social_proof}" if social_proof else ""
    return f"""You are {config.get('agentName')}, an outreach specialist at {config.get('agentCompany')}.

GOAL: {config.get('goal')}

PRODUCT / SERVICE:
- Name: {ctx.get('product_name', config.get('agentCompany'))}
- What it does: {ctx.get('product_description', 'Not specified')}
- Key benefits: {', '.join(ctx.get('key_benefits', []))}
- {social_proof_line}
- Pricing hint (use sparingly): {ctx.get('pricing_hint', 'Not specified')}

TARGET RECIPIENT:
- Role: {ctx.get('target_role', 'Not specified')}
- Pain point you are solving: {ctx.get('pain_point', 'Not specified')}

TONE: {tone}

WHEN DRAFTING THE INITIAL EMAIL:
- Open by referencing something specific about the recipient's company or role.
- State the pain point you solve — don't lead with the product name.
- Include one concrete benefit or data point.
- CTA: ask for a short call (15–20 minutes), not a demo or purchase.

FOLLOW-UP BEHAVIOUR:
- No reply: bump with a different angle — new data point or a question.
- They ask for pricing: share the hint, pivot to scheduling a call.
- They ask for a demo: agree and suggest a time — this is a CONVERSION.
- Not interested: acknowledge gracefully, ask if timing is the issue.

CONVERSION = recipient agrees to a call or demo.
{_shared_footer(config)}"""


# ── INVESTOR OUTREACH ──────────────────────────────────────────────────────
def _compile_investor(config: dict, ctx: dict) -> str:
    tone = TONE_INSTRUCTIONS.get(config.get("agentTone", "professional"), "")
    return f"""You are {config.get('agentName')}, founder of {config.get('agentCompany')}.

GOAL: {config.get('goal')}

COMPANY SNAPSHOT:
- What you do: {ctx.get('company_description', 'Not specified')}
- Stage: {ctx.get('stage', 'Not specified')}
- Traction: {ctx.get('traction', 'Not specified')}
- Round details: {ctx.get('round_details', 'Not specified')}
- Deck attached: {'Yes' if ctx.get('deck_attached') else 'No'}

TONE: {tone}

WHEN DRAFTING THE INITIAL EMAIL:
- Open with one sentence on traction or a compelling metric — not a product description.
- Mention why this specific investor is relevant (portfolio fit, thesis alignment).
- Keep it to 3 short paragraphs max.
- CTA: ask for a 20-minute introductory call.
- {'Attach the pitch deck.' if ctx.get('deck_attached') else 'Do not reference a deck.'}

FOLLOW-UP BEHAVIOUR:
- No reply: follow up with a new traction update or milestone.
- They ask for more info: send the deck (if not already sent) and answer specifically.
- They agree to a call: confirm time — CONVERSION.
- They pass: ask for a referral to another investor if appropriate.

CONVERSION = investor agrees to an introductory call.
{_shared_footer(config)}"""


# ── PARTNERSHIP OUTREACH ───────────────────────────────────────────────────
def _compile_partnership(config: dict, ctx: dict) -> str:
    tone = TONE_INSTRUCTIONS.get(config.get("agentTone", "consultative"), "")
    return f"""You are {config.get('agentName')}, representing {config.get('agentCompany')}.

GOAL: {config.get('goal')}

PARTNERSHIP CONTEXT:
- What you bring to the partnership: {ctx.get('value_offered', 'Not specified')}
- What you are looking for: {ctx.get('value_sought', 'Not specified')}
- Shared audience / overlap: {ctx.get('audience_overlap', 'Not specified')}
- Example partnership structure: {ctx.get('partnership_example', 'Not specified')}

TONE: {tone}

WHEN DRAFTING THE INITIAL EMAIL:
- Lead with what you admire about their work — make it genuine and specific.
- State the overlap clearly: "We both serve X type of customer."
- Propose a low-commitment first step (intro call, not a contract).
- CTA: 20-minute exploratory call.

FOLLOW-UP BEHAVIOUR:
- No reply: follow up referencing a recent thing they published or launched.
- They ask what the partnership looks like: share the example structure.
- They agree to a call: confirm — CONVERSION.
- Not the right fit: ask if they can refer you to someone else at the company.

CONVERSION = partner agrees to an exploratory call.
{_shared_footer(config)}"""


# ── CUSTOM (power user writes their own) ──────────────────────────────────
def _compile_custom(config: dict, ctx: dict) -> str:
    raw = ctx.get("custom_system_prompt", "")
    if not raw:
        raw = config.get("goal", "Send helpful outreach emails.")
    return f"""{raw}

{_shared_footer(config)}"""


# ── Runtime renderer (called per-email with injected contact context) ──────
def render_runtime_prompt(system_prompt: str, state: dict) -> str:
    """
    Takes the compiled system_prompt stored on the campaign and injects
    live per-contact context: who we are emailing, search results,
    and conversation history. Called inside each LangGraph node.
    """
    history = state.get("message_history", [])
    history_section = (
        "\n".join(f"[{m['role'].upper()}]: {m['content']}" for m in history)
        if history else "No prior conversation."
    )
    search_section = ""
    if state.get("search_results"):
        search_section = (
            f"\nADDITIONAL CONTEXT FROM WEB SEARCH:\n{state['search_results']}"
        )
    contact_section = f"""
CURRENT RECIPIENT:
Name: {state.get('contact_name')}
Email: {state.get('contact_email')}
Company: {state.get('contact_company') or 'Unknown'}
Role: {state.get('contact_role') or 'Unknown'}
Context: {state.get('contact_context') or 'No additional context.'}
{search_section}

CONVERSATION SO FAR:
{history_section}
"""
    return system_prompt + contact_section
```

**Migration required in `graph/nodes/draft.py` and `graph/nodes/compose_followup.py`:**
Replace all calls to `render_outreach_prompt(state)` with:
```python
from prompts.templates import render_runtime_prompt
system = render_runtime_prompt(state["system_prompt"], state)
```

The `system_prompt` field on state is now the **pre-compiled string** stored in Supabase
at activation time. `render_runtime_prompt` only adds the live per-contact layer on top.

---

## Amendment B — Add attachment support to `graph/nodes/send.py`

The send node must fetch attachments from Supabase Storage and pass them to AgentMail
on the **initial send only** (not follow-ups, unless the contact explicitly requested
the file again).

```python
# Add to send.py — inside the run() function, before client.inboxes.messages.send()

attachments = []
# Only attach on initial email (no existing thread yet)
if not state.get("agentmail_thread_id"):
    attachment_keys = state.get("attachment_storage_keys", [])
    for storage_key in attachment_keys:
        file_bytes, _ = (
            supabase.storage.from_("campaign-attachments")
            .download(storage_key)
        )
        filename = storage_key.split("/")[-1]
        content_type = _infer_content_type(filename)
        attachments.append({
            "filename": filename,
            "content": base64.b64encode(file_bytes).decode(),
            "content_type": content_type,
        })

# Pass attachments to AgentMail send call
if attachments:
    send_kwargs["attachments"] = attachments


def _infer_content_type(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower()
    return {
        "pdf":  "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "doc":  "application/msword",
        "png":  "image/png",
        "jpg":  "image/jpeg",
        "jpeg": "image/jpeg",
    }.get(ext, "application/octet-stream")
```

Add `attachment_storage_keys: list[str]` to `EmailAgentState` in `graph/state.py`.
This field is populated from the campaign row at activation time (loaded from
`campaign_attachments` Supabase table — see Phase 3.5 migration).

---

## Amendment C — Populate `system_prompt` and `attachment_storage_keys` at activation

In `routers/campaigns.py`, update `run_outreach_for_contact` to call the prompt
compiler and load attachment keys before building `initial_state`:

```python
from prompts.templates import compile_system_prompt

async def run_outreach_for_contact(campaign, contact, inbox_id):
    # Compile system prompt once per campaign (cache it or recompute — both fine)
    compiled_prompt = compile_system_prompt(campaign)

    # Load attachment storage keys for this campaign
    attachment_rows = (
        supabase.table("campaign_attachments")
        .select("storage_key")
        .eq("campaign_id", campaign["id"])
        .execute()
    )
    attachment_keys = [r["storage_key"] for r in (attachment_rows.data or [])]

    initial_state = EmailAgentState(
        # ... existing fields ...
        system_prompt=compiled_prompt,
        attachment_storage_keys=attachment_keys,
        # agent_tone is now embedded in the compiled prompt — no longer needed on state
    )
```

---

---

# PHASE 3.5 — Campaign Type Extensibility (Next.js Wizard)

---

## Phase 3.5 Overview

This phase retrofits the **campaign creation wizard** (built in Phase 2) to support
multiple campaign types. The agent service (Phase 3) already handles the compiled
prompt — this phase handles the UI that produces the `campaign_type` and
`context_fields` the compiler reads.

Changes are **additive only** — the existing wizard shell and step components are
not deleted, they are extended.

---

## New Supabase Migrations (Phase 3.5)

### Migration 006 — Campaign type + context fields + attachments

```sql
-- Add campaign type and context fields to campaigns table
alter table public.campaigns
  add column if not exists campaign_type text not null default 'custom',
  add column if not exists context_fields jsonb not null default '{}';

-- Attachment metadata table
create table public.campaign_attachments (
  id           uuid default gen_random_uuid() primary key,
  campaign_id  uuid references public.campaigns(id) on delete cascade not null,
  user_id      uuid references auth.users(id) on delete cascade not null,
  filename     text not null,
  storage_key  text not null,       -- path in Supabase Storage bucket
  content_type text not null,
  size_bytes   integer not null,
  created_at   timestamptz default now() not null
);

alter table public.campaign_attachments enable row level security;
create policy "Users can manage own campaign attachments"
  on public.campaign_attachments for all using (auth.uid() = user_id);
```

Create a **Supabase Storage bucket** named `campaign-attachments`:
- Public: false (private bucket, signed URLs only)
- File size limit: 10 MB per file
- Allowed MIME types: `application/pdf`, `application/msword`,
  `application/vnd.openxmlformats-officedocument.wordprocessingml.document`,
  `image/png`, `image/jpeg`

---

## Zod Schema Updates (`lib/validation/campaign.ts`)

Add the new schemas alongside the existing ones. Do not modify existing schemas.

```typescript
export const CampaignTypeEnum = z.enum([
  'recruitment_outreach',
  'sales_outreach',
  'investor_outreach',
  'partnership_outreach',
  'custom',
])

// ── Context field schemas per campaign type ──────────────────────────────

export const RecruitmentContextSchema = z.object({
  current_role:      z.string().min(2, 'Required'),
  degree:            z.string().min(2, 'Required'),
  skills:            z.array(z.string().min(1)).min(1, 'Add at least one skill'),
  notable_projects:  z.string().optional(),
  linkedin_url:      z.string().url('Must be a valid URL').optional().or(z.literal('')),
  resume_attached:   z.boolean().default(false),
})

export const SalesContextSchema = z.object({
  product_name:        z.string().min(2, 'Required'),
  product_description: z.string().min(10, 'Required'),
  key_benefits:        z.array(z.string().min(1)).min(1, 'Add at least one benefit'),
  social_proof:        z.string().optional(),
  pricing_hint:        z.string().optional(),
  target_role:         z.string().min(2, 'Required'),
  pain_point:          z.string().min(10, 'Required'),
})

export const InvestorContextSchema = z.object({
  company_description: z.string().min(10, 'Required'),
  stage:               z.string().min(2, 'Required'),
  traction:            z.string().min(5, 'Required'),
  round_details:       z.string().optional(),
  deck_attached:       z.boolean().default(false),
})

export const PartnershipContextSchema = z.object({
  value_offered:       z.string().min(10, 'Required'),
  value_sought:        z.string().min(10, 'Required'),
  audience_overlap:    z.string().optional(),
  partnership_example: z.string().optional(),
})

export const CustomContextSchema = z.object({
  custom_system_prompt: z.string().min(20, 'Please write at least 20 characters'),
})

// Discriminated union — validates context_fields based on campaign_type
export const ContextFieldsSchema = z.discriminatedUnion('campaign_type', [
  z.object({ campaign_type: z.literal('recruitment_outreach'), context_fields: RecruitmentContextSchema }),
  z.object({ campaign_type: z.literal('sales_outreach'),       context_fields: SalesContextSchema }),
  z.object({ campaign_type: z.literal('investor_outreach'),    context_fields: InvestorContextSchema }),
  z.object({ campaign_type: z.literal('partnership_outreach'), context_fields: PartnershipContextSchema }),
  z.object({ campaign_type: z.literal('custom'),               context_fields: CustomContextSchema }),
])

// Update the existing CreateCampaignPayloadSchema to include these new fields
// IMPORTANT: Do not remove existing fields — extend only
export const CreateCampaignPayloadV2Schema = CreateCampaignPayloadSchema.extend({
  campaign_type:  CampaignTypeEnum,
  context_fields: z.record(z.unknown()),  // validated more strictly server-side
})

export type CampaignType      = z.infer<typeof CampaignTypeEnum>
export type RecruitmentContext = z.infer<typeof RecruitmentContextSchema>
export type SalesContext        = z.infer<typeof SalesContextSchema>
export type InvestorContext     = z.infer<typeof InvestorContextSchema>
export type PartnershipContext  = z.infer<typeof PartnershipContextSchema>
export type CustomContext       = z.infer<typeof CustomContextSchema>
```

---

## Wizard Changes

### Step numbering update

Insert a new **Step 1.5** between the existing Step 1 (Campaign Meta) and Step 2
(Agent Persona). Renumber all subsequent steps in `WizardShell.tsx`:

```
Step 1   — Campaign Meta        (unchanged)
Step 1.5 — Campaign Type        (NEW)
Step 2   — Agent Persona        (unchanged)
Step 2.5 — Campaign Context     (NEW — dynamic fields per type)
Step 3   — Sequence Settings    (unchanged)
Step 4   — Attachments          (NEW — shown conditionally)
Step 5   — Contacts             (was Step 4, unchanged)
Step 6   — Review               (was Step 5, updated to show new fields)
```

Update the progress bar labels in `WizardShell.tsx` to reflect 6 steps.
The wizard `useReducer` state shape gains two new fields:
```typescript
campaign_type: CampaignType | null
context_fields: Record<string, unknown>
attachments: File[]         // held in memory only — uploaded on submit
```

---

### New: `Step1b_CampaignType.tsx`

A full-width type selector with 5 cards arranged in a grid (2 columns desktop,
1 column mobile). Each card has:
- An icon (lucide): `UserSearch` / `TrendingUp` / `DollarSign` / `Handshake` / `Settings2`
- A title and one-line description
- Selected state: accent-coloured border + subtle background fill

| Type | Title | Description |
|---|---|---|
| `recruitment_outreach` | Job Application Outreach | Contact recruiters and hiring managers for open roles |
| `sales_outreach` | Sales & Lead Generation | Reach potential customers with your product or service |
| `investor_outreach` | Investor Outreach | Connect with VCs and angels for fundraising |
| `partnership_outreach` | Partnership Development | Find co-marketing and integration partners |
| `custom` | Custom | Write your own system prompt from scratch |

Selecting `custom` shows an inline note:
`"You'll write the agent's full instructions in the next step."`

---

### New: `Step2b_CampaignContext.tsx`

This component renders **different field sets** based on the selected `campaign_type`.
Use a switch on `campaign_type` to render the correct sub-component:

```typescript
switch (campaignType) {
  case 'recruitment_outreach': return <RecruitmentContextFields />
  case 'sales_outreach':       return <SalesContextFields />
  case 'investor_outreach':    return <InvestorContextFields />
  case 'partnership_outreach': return <PartnershipContextFields />
  case 'custom':               return <CustomContextFields />
}
```

**`RecruitmentContextFields`:**
- Current / most recent role — text input
- Degree & university — text input
- Core skills — tag input (user types a skill, presses Enter to add; rendered as
  removable chips; stored as `string[]`)
- Notable projects — textarea, optional
- LinkedIn URL — text input, optional, validated as URL
- "I'll attach my resume" — checkbox (sets `resume_attached: true`; actual file
  upload happens in Step 4)

**`SalesContextFields`:**
- Product / service name — text input
- What it does — textarea (2 rows)
- Key benefits — tag input (same chip pattern as skills), min 1
- Social proof — text input, optional (e.g. "Used by 200+ teams")
- Pricing hint — text input, optional (e.g. "From $99/mo")
- Target recipient role — text input (e.g. "Head of Growth")
- Pain point being solved — textarea (2 rows)

**`InvestorContextFields`:**
- What your company does — textarea
- Stage — segmented control: `Pre-seed` / `Seed` / `Series A` / `Series B+`
- Traction — textarea (e.g. "$50k MRR, 3x YoY growth")
- Round details — text input, optional (e.g. "Raising $2M SAFE")
- "I'll attach my pitch deck" — checkbox

**`PartnershipContextFields`:**
- What you bring to the partnership — textarea
- What you are looking for — textarea
- Shared audience or overlap — text input, optional
- Example partnership structure — textarea, optional

**`CustomContextFields`:**
- System prompt — large textarea (min-height 200px)
- Placeholder: `"You are Alex, an outreach specialist at Acme Inc. Your goal is..."`
- Helper: `"This text becomes the AI agent's complete instruction set. Be specific
  about tone, goals, and how to handle replies."`
- Character count shown below (max 2000 chars)

---

### New: `Step4_Attachments.tsx`

This step is **conditionally shown** — only when:
- `campaign_type === 'recruitment_outreach'` AND `context_fields.resume_attached === true`
- OR `campaign_type === 'investor_outreach'` AND `context_fields.deck_attached === true`
- OR any campaign type (user can optionally add attachments regardless)

Show a heading that adapts: "Upload Your Resume" / "Upload Your Pitch Deck" /
"Upload Attachments"

UI:
- Same drag-and-drop zone pattern as the contacts upload in Phase 2
- Accepts: `.pdf`, `.docx`, `.doc`, `.png`, `.jpg` (max 10 MB each, max 3 files)
- After upload: show a file list with filename, size, and a remove button
- Files are held in component state as `File[]` — not uploaded to storage yet
- They are uploaded to Supabase Storage as part of the campaign creation API call

If the user skips this step (no attachment types flagged), show a note:
`"No attachments required for this campaign type. Continue to the next step."`
with a "Skip" button that advances the wizard.

---

### Update: `Step6_Review.tsx` (was Step5)

Add two new cards to the review:

**Campaign Type** card:
- Show the human-readable type label and its icon
- e.g. "Job Application Outreach" with the `UserSearch` icon

**Context** card:
- Show key-value pairs from `context_fields` in a compact list
- For `skills` / `key_benefits` arrays: render as comma-separated values
- For `custom`: show the first 100 chars of the system prompt, truncated with "..."
- Do NOT show `resume_attached` / `deck_attached` booleans — show
  "Resume attached" / "Pitch deck attached" as a badge instead if true

---

## API Route Updates (`app/api/campaigns/route.ts`)

The existing `POST /api/campaigns` handler needs two additions:

**1. Accept and validate new fields:**
```typescript
// Replace CreateCampaignPayloadSchema with CreateCampaignPayloadV2Schema
const result = CreateCampaignPayloadV2Schema.safeParse(body)
```

**2. Insert `campaign_type` and `context_fields` into the campaigns table:**
```typescript
const { data: campaign } = await supabase
  .from('campaigns')
  .insert({
    // ... existing fields ...
    campaign_type:  payload.campaign_type,
    context_fields: payload.context_fields,
  })
```

**3. Handle attachment uploads (after campaign row is created):**
```typescript
// If attachments were sent as base64 in the payload
for (const attachment of payload.attachments ?? []) {
  const buffer = Buffer.from(attachment.data, 'base64')
  const storageKey = `${campaign.id}/${attachment.filename}`

  await supabase.storage
    .from('campaign-attachments')
    .upload(storageKey, buffer, { contentType: attachment.contentType })

  await supabase.from('campaign_attachments').insert({
    campaign_id:  campaign.id,
    user_id:      session.user.id,
    filename:     attachment.filename,
    storage_key:  storageKey,
    content_type: attachment.contentType,
    size_bytes:   buffer.length,
  })
}
```

Attachments are sent from the client as:
```typescript
// In WizardShell.tsx — before POST, convert File[] to base64
const attachments = await Promise.all(
  wizardState.attachments.map(async (file) => ({
    filename:    file.name,
    contentType: file.type,
    data: await fileToBase64(file),   // FileReader → base64 string
  }))
)
```

Update the `CreateCampaignPayloadV2Schema` to include:
```typescript
attachments: z.array(z.object({
  filename:    z.string(),
  contentType: z.string(),
  data:        z.string(), // base64
  })).optional().default([]),
```

---

## New Dependencies (Phase 3.5)

```bash
# No new npm packages — lucide-react already installed
# Supabase Storage is part of the existing supabase-js client
```

---

## Acceptance Criteria — Phase 3.5

- [ ] Step 1.5 renders all 5 campaign type cards; exactly one can be selected at a time
- [ ] Selecting a type and advancing shows the correct context fields in Step 2.5
- [ ] Recruitment: skills tag input adds/removes chips correctly
- [ ] Recruitment: LinkedIn URL validates as a proper URL
- [ ] Sales: key_benefits tag input works; minimum 1 required to advance
- [ ] Investor: stage segmented control works (same pattern as tone selector)
- [ ] Custom: textarea enforces 2000 char max with live counter
- [ ] Step 4 (Attachments) is shown when `resume_attached` or `deck_attached` is true
- [ ] Step 4 accepts only allowed MIME types; rejects others with an error message
- [ ] Files larger than 10 MB are rejected client-side before upload
- [ ] Attachments held in memory until form submission — not uploaded on selection
- [ ] Step 6 Review shows Campaign Type card and Context card with correct values
- [ ] `POST /api/campaigns` accepts and persists `campaign_type` and `context_fields`
- [ ] Attachments are uploaded to Supabase Storage `campaign-attachments` bucket
- [ ] `campaign_attachments` rows are created in DB after successful upload
- [ ] Python agent service `compile_system_prompt()` produces different prompts for
      each campaign type — manually verify by printing the output for each type
- [ ] Recruitment system prompt references `current_role`, `degree`, and `skills`
- [ ] Sales system prompt references `product_name`, `pain_point`, and `target_role`
- [ ] Custom campaign uses the raw textarea content as the system prompt
- [ ] Attachment base64 is decoded correctly and file is retrievable from Supabase Storage
- [ ] Agent send node attaches files on the initial email only (not follow-ups)
- [ ] No TypeScript errors (`pnpm tsc --noEmit` passes)

---

*Current phase: 3.5 — Campaign Type Extensibility*
*Next phase: 4 — Observability, rate limiting, campaign pause/resume, and production hardening*
