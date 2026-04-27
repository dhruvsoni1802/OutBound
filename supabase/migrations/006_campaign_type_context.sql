-- Migration 006 — Campaign type, context fields, and attachments (Phase 3.5)

alter table public.campaigns
  add column if not exists campaign_type text not null default 'custom',
  add column if not exists context_fields jsonb not null default '{}';

-- Attachment metadata
create table if not exists public.campaign_attachments (
  id           uuid default gen_random_uuid() primary key,
  campaign_id  uuid references public.campaigns(id) on delete cascade not null,
  user_id      uuid references auth.users(id) on delete cascade not null,
  filename     text not null,
  storage_key  text not null,
  content_type text not null,
  size_bytes   integer not null,
  created_at   timestamptz default now() not null
);

alter table public.campaign_attachments enable row level security;
create policy "Users can manage own campaign attachments"
  on public.campaign_attachments for all using (auth.uid() = user_id);
