import json

from graph.state import EmailAgentState
from providers.llm import get_llm


def run(state: EmailAgentState) -> dict:
    if not state.get("web_search_enabled"):
        return {"needs_search": False, "search_query": None}

    prompt = f"""You are about to draft an outreach email.

Contact: {state["contact_name"]} ({state.get("contact_role", "")} at {state.get("contact_company", "")})
Existing context: {state.get("contact_context") or "None"}
Task: {state["current_task"]}

Do you have enough context to write a compelling, personalised email?
If not, what single web search query would give you the most useful additional context?

Return ONLY valid JSON: {{"needs_search": true/false, "search_query": "string or null"}}"""

    result = get_llm().invoke(prompt)
    try:
        parsed = json.loads(result.content)
    except json.JSONDecodeError:
        return {"needs_search": False, "search_query": None}

    return {
        "needs_search": bool(parsed.get("needs_search", False)),
        "search_query": parsed.get("search_query"),
    }
