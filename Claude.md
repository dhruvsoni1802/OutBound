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