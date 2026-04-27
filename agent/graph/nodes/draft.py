import json

from graph.state import EmailAgentState
from prompts.templates import render_runtime_prompt
from providers.llm import get_llm


def run(state: EmailAgentState) -> dict:
    system = render_runtime_prompt(state["system_prompt"], state)
    user_msg = f"""Draft the initial outreach email to {state["contact_name"]}.

Return ONLY valid JSON:
{{
  "subject": "email subject line",
  "body": "plain text email body"
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
        email = {"subject": "Introduction", "body": result.content}

    return {"draft_email": email}
