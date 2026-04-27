"""Messaging provider — thin facade over the AgentMail SDK client cache."""

from agentmail import AgentMail
from inbox.client import get_agentmail_client, get_agentmail_client_by_inbox


def get_messaging(user_id: str) -> AgentMail:
    """Returns the AgentMail client for a user (cached per user_id)."""
    return get_agentmail_client(user_id)


def get_messaging_by_inbox(inbox_id: str) -> AgentMail:
    """Returns the AgentMail client for a given inbox_id."""
    return get_agentmail_client_by_inbox(inbox_id)
