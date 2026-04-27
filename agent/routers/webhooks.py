import logging
import os

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from svix.webhooks import Webhook, WebhookVerificationError

from db.queries import (
    get_contact_by_agentmail_thread,
    update_contact_status,
)
from providers.messaging import get_messaging_by_inbox
from services import webhook_dispatcher
import graph.graph as graph_module

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/webhooks/agentmail")
async def agentmail_webhook(request: Request, background_tasks: BackgroundTasks):
    payload = await request.body()
    headers = dict(request.headers)

    secret = os.environ.get("AGENTMAIL_WEBHOOK_SECRET", "")
    if secret:
        try:
            wh = Webhook(secret)
            event = wh.verify(payload, headers)
        except WebhookVerificationError:
            raise HTTPException(status_code=400, detail="Invalid webhook signature")
    else:
        import json
        event = json.loads(payload)

    background_tasks.add_task(webhook_dispatcher.dispatch, event)
    return {"ok": True}


# ── Event handlers ────────────────────────────────────────────────────────

def _handle_message_received(event: dict) -> None:
    message = event.get("data") or event.get("message", {})
    agentmail_thread_id = message.get("thread_id")
    reply_text = message.get("text", "")

    if not reply_text and message.get("inbox_id") and message.get("message_id"):
        try:
            client = get_messaging_by_inbox(message["inbox_id"])
            full_msg = client.inboxes.messages.get(
                inbox_id=message["inbox_id"],
                message_id=message["message_id"],
            )
            reply_text = full_msg.text or ""
        except Exception:
            pass

    if not agentmail_thread_id:
        return

    contact = get_contact_by_agentmail_thread(agentmail_thread_id)
    if not contact:
        logger.warning("No contact found for thread %s", agentmail_thread_id)
        return

    config = {"configurable": {"thread_id": contact["id"]}}
    resume_state = {
        "inbound_reply": reply_text,
        # Point the send node at the contact's message so reply() threads correctly
        "agentmail_last_message_id": message.get("message_id"),
    }
    try:
        graph_module.reply_graph.invoke(resume_state, config=config)
    except Exception:
        logger.exception("Reply graph failed for contact %s", contact["id"])


def _handle_bounce(event: dict) -> None:
    message = event.get("data") or event.get("message", {})
    thread_id = message.get("thread_id")
    if thread_id:
        contact = get_contact_by_agentmail_thread(thread_id)
        if contact:
            update_contact_status(contact["id"], "bounced")


def _handle_complaint(event: dict) -> None:
    message = event.get("data") or event.get("message", {})
    thread_id = message.get("thread_id")
    if thread_id:
        contact = get_contact_by_agentmail_thread(thread_id)
        if contact:
            update_contact_status(contact["id"], "opted_out")


# Register handlers at import time
webhook_dispatcher.register("message.received", _handle_message_received)
webhook_dispatcher.register("message.bounced", _handle_bounce)
webhook_dispatcher.register("message.complained", _handle_complaint)
