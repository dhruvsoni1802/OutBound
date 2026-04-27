"""Singleton LLM provider backed by OpenRouter."""

import os
from langchain_openai import ChatOpenAI

_llm: ChatOpenAI | None = None


def get_llm() -> ChatOpenAI:
    global _llm
    if _llm is None:
        model = os.environ.get("OPENROUTER_MODEL", "openrouter/free")
        # Common free models on OpenRouter (set OPENROUTER_MODEL in agent/.env):
        #   meta-llama/llama-3.2-3b-instruct:free
        #   meta-llama/llama-3.1-8b-instruct:free
        #   google/gemini-2.0-flash-exp:free
        #   mistralai/mistral-7b-instruct:free
        _llm = ChatOpenAI(
            model=model,
            api_key=os.environ.get("OPENROUTER_API_KEY", ""),
            base_url="https://openrouter.ai/api/v1",
            max_retries=12,  # free tier resets every ~60s; 12 retries gives ~4min of backoff
            timeout=120.0,
        )
    return _llm
