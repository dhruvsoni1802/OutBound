"""Supabase Storage helpers for campaign attachments."""

from db.supabase import get_supabase_admin

BUCKET = "campaign-attachments"


def download_attachment(storage_key: str) -> bytes:
    """Downloads a file from the campaign-attachments bucket and returns raw bytes."""
    return get_supabase_admin().storage.from_(BUCKET).download(storage_key)
