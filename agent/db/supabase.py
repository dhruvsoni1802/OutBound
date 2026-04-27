import os
from supabase import create_client, Client
from functools import lru_cache


@lru_cache(maxsize=1)
def get_supabase_admin() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)
