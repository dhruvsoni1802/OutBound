from graph.state import EmailAgentState
from db.queries import update_contact_status, increment_campaign_stat

_TERMINAL_INTENTS = {"NEGATIVE", "OPT_OUT", "OUT_OF_OFFICE"}

_STATUS_MAP = {
    "converted": "converted",
    "opt_out": "opted_out",
    "negative": "declined",
    "max_followups_reached": "declined",
    "out_of_office": "pending",
}


def run(state: EmailAgentState) -> dict:
    intent = state.get("intent")
    followup_count = state.get("followup_count", 0)

    terminal = False
    reason = None

    if intent in _TERMINAL_INTENTS:
        terminal = True
        reason = intent.lower()
    elif intent == "POSITIVE" and followup_count >= 1:
        terminal = True
        reason = "converted"
    elif followup_count >= state["max_followups"]:
        terminal = True
        reason = "max_followups_reached"

    if terminal:
        new_status = _STATUS_MAP.get(reason or "", "declined")
        update_contact_status(state["contact_id"], new_status)
        if reason == "converted":
            increment_campaign_stat(state["campaign_id"], "conversions")

    return {"terminal": terminal, "terminal_reason": reason}
