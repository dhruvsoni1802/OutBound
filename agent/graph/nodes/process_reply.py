import json

from graph.state import EmailAgentState
from db.queries import increment_campaign_stat
from providers.llm import get_llm

_INTENT_PROMPT = """Classify the intent of this email reply.

Valid intents:
- POSITIVE: interest shown, wants to connect or learn more
- NEUTRAL: no clear signal either way
- QUESTION: asks a specific question about the product or service
- NEGATIVE: declines, not interested
- OPT_OUT: explicitly asks to unsubscribe or stop receiving emails
- OUT_OF_OFFICE: automated out-of-office reply

Reply:
{reply_text}

Return ONLY valid JSON: {{"intent": "INTENT_VALUE"}}"""


def run(state: EmailAgentState) -> dict:
    reply = state.get("inbound_reply", "")

    try:
        result = get_llm().invoke(_INTENT_PROMPT.format(reply_text=reply))
        parsed = json.loads(result.content)
        intent = parsed.get("intent", "NEUTRAL")
    except Exception:
        intent = "NEUTRAL"

    history = list(state.get("message_history") or [])
    history.append({"role": "contact", "content": reply})

    increment_campaign_stat(state["campaign_id"], "emails_replied")

    return {
        "intent": intent,
        "message_history": history,
        "current_task": "compose_followup",
    }
