import base64
import logging

from graph.state import EmailAgentState

logger = logging.getLogger(__name__)
from providers.messaging import get_messaging
from storage import download_attachment
from db.queries import (
    update_contact_status,
    update_contact_thread_ids,
    increment_campaign_stat,
    increment_contact_followup,
)


def _infer_content_type(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower()
    return {
        "pdf": "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "doc": "application/msword",
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
    }.get(ext, "application/octet-stream")


def run(state: EmailAgentState) -> dict:
    client = get_messaging(state["user_id"])
    draft = state["draft_email"]
    is_initial = not state.get("agentmail_thread_id")

    logger.info(
        "%s email to %s via inbox %s",
        "Sending initial" if is_initial else "Replying to",
        state["contact_email"],
        state["inbox_id"],
    )

    if is_initial:
        # Build attachment list for initial send
        attachments = []
        for storage_key in (state.get("attachment_storage_keys") or []):
            try:
                file_bytes = download_attachment(storage_key)
                filename = storage_key.split("/")[-1]
                attachments.append(
                    {
                        "filename": filename,
                        "content": base64.b64encode(file_bytes).decode(),
                        "content_type": _infer_content_type(filename),
                    }
                )
            except Exception:
                pass

        send_kwargs: dict = {
            "inbox_id": state["inbox_id"],
            "to": [state["contact_email"]],
            "subject": draft["subject"],
            "text": draft["body"],
        }
        if attachments:
            send_kwargs["attachments"] = attachments
        message = client.inboxes.messages.send(**send_kwargs)
    else:
        # Reply on the existing thread using the last message ID
        last_msg_id = state.get("agentmail_last_message_id")
        if not last_msg_id:
            raise ValueError(
                f"Cannot reply for contact {state['contact_id']}: "
                "agentmail_last_message_id is not set in state"
            )
        message = client.inboxes.messages.reply(
            state["inbox_id"],
            last_msg_id,
            text=draft["body"],
        )

    logger.info(
        "Email sent — message_id=%s thread_id=%s",
        getattr(message, "message_id", "?"),
        getattr(message, "thread_id", "?"),
    )

    new_thread_id = state.get("agentmail_thread_id") or message.thread_id
    new_message_id = message.message_id

    update_contact_thread_ids(
        contact_id=state["contact_id"],
        agentmail_thread_id=new_thread_id,
        langgraph_thread_id=state["contact_id"],
    )
    update_contact_status(state["contact_id"], "contacted")
    increment_campaign_stat(state["campaign_id"], "emails_sent")

    history = list(state.get("message_history") or [])
    history.append(
        {
            "role": "agent",
            "content": draft["body"],
            "subject": draft.get("subject", ""),
        }
    )

    new_followup_count = state.get("followup_count", 0)
    if not is_initial:
        new_followup_count += 1
        increment_contact_followup(state["contact_id"])

    return {
        "agentmail_thread_id": new_thread_id,
        "agentmail_last_message_id": new_message_id,
        "message_history": history,
        "followup_count": new_followup_count,
    }
