"""Registry-based webhook event dispatcher.

Usage:
    from services.webhook_dispatcher import register, dispatch

    register("message.received", my_handler)

    dispatch(event_dict)  # routes to the registered handler, logs unknown types
"""

import logging
from typing import Callable

logger = logging.getLogger(__name__)

EventHandler = Callable[[dict], None]
_registry: dict[str, EventHandler] = {}


def register(event_type: str, handler: EventHandler) -> None:
    """Registers a handler function for an AgentMail event type."""
    _registry[event_type] = handler


def dispatch(event: dict) -> None:
    """Looks up and calls the registered handler for the event's type."""
    event_type = event.get("event_type") or event.get("type", "")
    handler = _registry.get(event_type)
    if handler:
        try:
            handler(event)
        except Exception:
            logger.exception("Handler for '%s' raised an exception", event_type)
    else:
        logger.debug("No handler registered for event type: %s", event_type)
