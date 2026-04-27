from graph.state import EmailAgentState
from providers.search import search_web


def run(state: EmailAgentState) -> dict:
    if not state.get("search_query"):
        return {"search_results": None}

    try:
        return {"search_results": search_web(state["search_query"])}
    except Exception:
        return {"search_results": None}
