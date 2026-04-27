import base64
import os
from functools import lru_cache

from agentmail import AgentMail
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from db.supabase import get_supabase_admin
from db.queries import get_user_id_by_inbox_id


def decrypt_key(encrypted_b64: str) -> str:
    # Node.js layout: iv(12) | authTag(16) | ciphertext
    raw = base64.b64decode(encrypted_b64)
    nonce = raw[:12]
    auth_tag = raw[12:28]
    ciphertext = raw[28:]
    key = base64.b64decode(os.environ["ENCRYPTION_KEY"])
    aesgcm = AESGCM(key)
    # Python AESGCM expects ciphertext + tag appended
    return aesgcm.decrypt(nonce, ciphertext + auth_tag, None).decode()


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
    api_key = decrypt_key(row.data["encrypted_key"])
    return AgentMail(api_key=api_key, timeout=30)


def get_agentmail_client_by_inbox(inbox_id: str) -> AgentMail:
    user_id = get_user_id_by_inbox_id(inbox_id)
    if not user_id:
        raise ValueError(f"No campaign/user found for inbox {inbox_id}")
    return get_agentmail_client(user_id)
