from db.supabase import get_supabase_admin


def update_contact_status(contact_id: str, status: str) -> None:
    supabase = get_supabase_admin()
    supabase.table("contacts").update({"status": status}).eq("id", contact_id).execute()


def update_contact_thread_ids(
    contact_id: str,
    agentmail_thread_id: str,
    langgraph_thread_id: str,
) -> None:
    supabase = get_supabase_admin()
    supabase.table("contacts").update(
        {
            "agentmail_thread_id": agentmail_thread_id,
            "langgraph_thread_id": langgraph_thread_id,
            "last_contacted_at": "now()",
        }
    ).eq("id", contact_id).execute()


def increment_contact_followup(contact_id: str) -> None:
    supabase = get_supabase_admin()
    result = (
        supabase.table("contacts")
        .select("followup_count")
        .eq("id", contact_id)
        .single()
        .execute()
    )
    current = result.data.get("followup_count", 0) if result.data else 0
    supabase.table("contacts").update({"followup_count": current + 1}).eq(
        "id", contact_id
    ).execute()


def get_contact_by_agentmail_thread(agentmail_thread_id: str) -> dict | None:
    supabase = get_supabase_admin()
    result = (
        supabase.table("contacts")
        .select("*")
        .eq("agentmail_thread_id", agentmail_thread_id)
        .maybe_single()
        .execute()
    )
    return result.data


def get_campaign(campaign_id: str) -> dict | None:
    supabase = get_supabase_admin()
    result = (
        supabase.table("campaigns")
        .select("*")
        .eq("id", campaign_id)
        .single()
        .execute()
    )
    return result.data


def get_pending_contacts(campaign_id: str) -> list[dict]:
    supabase = get_supabase_admin()
    result = (
        supabase.table("contacts")
        .select("*")
        .eq("campaign_id", campaign_id)
        .eq("status", "pending")
        .execute()
    )
    return result.data or []


def get_user_id_by_inbox_id(inbox_id: str) -> str | None:
    supabase = get_supabase_admin()
    result = (
        supabase.table("campaigns")
        .select("user_id")
        .eq("inbox_id", inbox_id)
        .maybe_single()
        .execute()
    )
    return result.data["user_id"] if result.data else None


def update_campaign_status(campaign_id: str, status: str) -> None:
    supabase = get_supabase_admin()
    supabase.table("campaigns").update({"status": status}).eq("id", campaign_id).execute()


def update_campaign_activation(
    campaign_id: str, inbox_id: str, webhook_id: str
) -> None:
    supabase = get_supabase_admin()
    supabase.table("campaigns").update(
        {"inbox_id": inbox_id, "webhook_id": webhook_id, "status": "active"}
    ).eq("id", campaign_id).execute()


def increment_campaign_stat(campaign_id: str, field: str) -> None:
    supabase = get_supabase_admin()
    supabase.rpc(
        "increment_campaign_stat",
        {"p_campaign_id": campaign_id, "p_field": field},
    ).execute()


def get_campaign_attachments(campaign_id: str) -> list[dict]:
    supabase = get_supabase_admin()
    result = (
        supabase.table("campaign_attachments")
        .select("storage_key")
        .eq("campaign_id", campaign_id)
        .execute()
    )
    return result.data or []
