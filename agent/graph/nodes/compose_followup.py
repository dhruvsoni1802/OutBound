import json

from graph.state import EmailAgentState
from prompts.templates import render_runtime_prompt
from providers.llm import get_llm


def run(state: EmailAgentState) -> dict:
    system = render_runtime_prompt(state["system_prompt"], state)
    intent = state.get("intent")
    followup_count = state.get("followup_count", 0)
    intent_context = f"Their most recent reply indicated intent: {intent}." if intent else ""

    user_msg = f"""Compose follow-up #{followup_count + 1} to {state["contact_name"]}.
{intent_context}

Based on the conversation history, craft an appropriate follow-up email that continues the thread naturally.

Return ONLY valid JSON:
{{
  "subject": "Re: <original subject or new subject>",
  "body": "plain text follow-up email body"
}}"""

    result = get_llm().invoke(
        [
            {"role": "system", "content": system},
            {"role": "user", "content": user_msg},
        ]
    )
    try:
        email = json.loads(result.content)
    except json.JSONDecodeError:
        email = {"subject": "Following up", "body": result.content}

    return {"draft_email": email}
