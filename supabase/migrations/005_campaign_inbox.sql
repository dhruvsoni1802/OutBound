-- Migration 005 — Campaign inbox tracking + atomic stat increment function

alter table public.campaigns
  add column if not exists inbox_id text,
  add column if not exists webhook_id text;

-- Atomic stat increment (used by Python agent)
create or replace function increment_campaign_stat(p_campaign_id uuid, p_field text)
returns void as $$
begin
  execute format(
    'update public.campaigns set %I = %I + 1, updated_at = now() where id = $1',
    p_field, p_field
  ) using p_campaign_id;
end;
$$ language plpgsql security definer;
