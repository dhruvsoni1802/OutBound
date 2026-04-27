from typing import Optional
from typing_extensions import TypedDict


class EmailAgentState(TypedDict):
    # Identity
    contact_id: str
    contact_name: str
    contact_email: str
    contact_company: Optional[str]
    contact_role: Optional[str]
    contact_context: Optional[str]

    # Campaign config (compiled at activation, frozen into state)
    campaign_id: str
    user_id: str
    inbox_id: str
    system_prompt: str          # pre-compiled string from prompts/templates.py
    agent_name: str
    agent_company: str
    max_followups: int
    followup_delay_hours: int
    web_search_enabled: bool

    # Thread tracking
    agentmail_thread_id: Optional[str]
    agentmail_last_message_id: Optional[str]  # used to call reply() on the correct message
    message_history: list[dict]
    followup_count: int

    # Execution control
    needs_search: bool
    search_query: Optional[str]
    search_results: Optional[str]
    current_task: str           # "draft_initial" | "compose_followup"
    inbound_reply: Optional[str]
    intent: Optional[str]

    # Attachments (Phase 3.5) — storage keys in Supabase campaign-attachments bucket
    attachment_storage_keys: list[str]

    # Draft produced by draft/compose nodes, consumed by send node
    draft_email: Optional[dict]  # {"subject": str, "body": str}

    # Terminal
    terminal: bool
    terminal_reason: Optional[str]
