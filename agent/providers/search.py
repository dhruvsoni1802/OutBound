"""Web search provider backed by Tavily."""

import os

from tavily import TavilyClient

_client: TavilyClient | None = None


def _get_client() -> TavilyClient:
    global _client
    if _client is None:
        _client = TavilyClient(api_key=os.environ["TAVILY_API_KEY"])
    return _client


def search_web(query: str, count: int = 3) -> str:
    """Calls Tavily Search and returns a newline-separated summary (max ~2000 chars)."""
    response = _get_client().search(query, max_results=count, search_depth="basic")
    summary = "\n\n".join(
        f"Source: {r.get('url', '')}\n{r.get('content', '')[:300]}"
        for r in response.get("results", [])
    )
    return summary[:2000]
