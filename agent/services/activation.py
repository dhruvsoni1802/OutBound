"""Campaign activation use-case: provision inbox, register webhook, build contact state."""

import logging
import os

from agentmail.core.api_error import ApiError

from db.queries import (
    get_campaign,
    get_pending_contacts,
    update_campaign_activation,
    get_campaign_attachments,
)
from prompts.templates import compile_system_prompt
from providers.messaging import get_messaging

logger = logging.getLogger(__name__)


class InboxLimitError(Exception):
    """Raised when the AgentMail account has reached its inbox limit."""


def provision_campaign(campaign_id: str) -> tuple[dict, list[dict], str]:
    """
    Provisions an AgentMail inbox and webhook for the campaign, updates the DB,
    and returns (campaign, pending_contacts, inbox_id).

    Idempotent: if the campaign already has an inbox_id, it is reused.

    Raises:
        ValueError: campaign not found
        InboxLimitError: AgentMail inbox limit reached (user must delete old inboxes or upgrade)
    """
    campaign = get_campaign(campaign_id)
    if not campaign:
        raise ValueError(f"Campaign {campaign_id} not found")

    user_id = campaign["user_id"]
    client = get_messaging(user_id)

    # Reuse existing inbox if this campaign was already provisioned
    inbox_id = campaign.get("inbox_id")
    webhook_id = campaign.get("webhook_id")

    if not inbox_id:
        try:
            inbox = client.inboxes.create(username=f"embra-{campaign_id[:8]}")
            inbox_id = inbox.inbox_id
        except ApiError as exc:
            if "LimitExceeded" in str(exc.body):
                raise InboxLimitError(
                    "AgentMail inbox limit reached. Delete unused inboxes at "
                    "agentmail.to or upgrade your plan, then try again."
                ) from exc
            raise

    if not webhook_id:
        webhook = client.webhooks.create(
            url=f"{os.environ['AGENT_SERVICE_URL']}/webhooks/agentmail",
            event_types=["message.received", "message.bounced", "message.complained"],
            inbox_ids=[inbox_id],
        )
        webhook_id = webhook.webhook_id

    update_campaign_activation(campaign_id, inbox_id, webhook_id)

    contacts = get_pending_contacts(campaign_id)
    return campaign, contacts, inbox_id


def build_initial_state(campaign: dict, contact: dict, inbox_id: str) -> dict:
    """
    Returns the initial LangGraph state dict for a single contact outreach run.
    Compiles the system prompt and loads attachment storage keys.
    """
    compiled_prompt = compile_system_prompt(campaign)
    attachment_keys = [
        r["storage_key"] for r in get_campaign_attachments(campaign["id"])
    ]

    return {
        "contact_id": contact["id"],
        "contact_name": contact["first_name"],
        "contact_email": contact["email"],
        "contact_company": contact.get("company"),
        "contact_role": contact.get("role"),
        "contact_context": contact.get("context"),
        "campaign_id": campaign["id"],
        "user_id": campaign["user_id"],
        "inbox_id": inbox_id,
        "system_prompt": compiled_prompt,
        "agent_name": campaign["agent_name"],
        "agent_company": campaign["agent_company"],
        "max_followups": campaign["max_followups"],
        "followup_delay_hours": campaign["followup_delay_hours"],
        "web_search_enabled": campaign["web_search_enabled"],
        "agentmail_thread_id": None,
        "agentmail_last_message_id": None,
        "message_history": [],
        "followup_count": 0,
        "needs_search": False,
        "search_query": None,
        "search_results": None,
        "current_task": "draft_initial",
        "inbound_reply": None,
        "intent": None,
        "attachment_storage_keys": attachment_keys,
        "draft_email": None,
        "terminal": False,
        "terminal_reason": None,
    }
