import logging

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request

from openai import NotFoundError as OpenAINotFoundError, AuthenticationError as OpenAIAuthError

from db.supabase import get_supabase_admin
from db.queries import update_campaign_status
from services.activation import provision_campaign, build_initial_state, InboxLimitError
import graph.graph as graph_module

logger = logging.getLogger(__name__)
router = APIRouter()


def _verify_secret(request: Request) -> None:
    import os
    secret = os.environ.get("AGENT_SERVICE_SECRET", "")
    if secret and request.headers.get("X-Agent-Secret") != secret:
        raise HTTPException(status_code=401, detail="Invalid service secret")


@router.post("/campaigns/{campaign_id}/activate")
async def activate_campaign(
    campaign_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
):
    _verify_secret(request)

    try:
        campaign, contacts, inbox_id = provision_campaign(campaign_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except InboxLimitError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    for contact in contacts:
        background_tasks.add_task(
            _run_outreach_for_contact, campaign, contact, inbox_id
        )

    return {
        "status": "activated",
        "inbox_id": inbox_id,
        "contacts_queued": len(contacts),
    }


@router.get("/campaigns/{campaign_id}/contacts")
async def get_contacts(campaign_id: str, request: Request):
    _verify_secret(request)
    supabase = get_supabase_admin()
    result = (
        supabase.table("contacts")
        .select("*")
        .eq("campaign_id", campaign_id)
        .execute()
    )
    return {"contacts": result.data or []}


def _run_outreach_for_contact(
    campaign: dict, contact: dict, inbox_id: str
) -> None:
    try:
        initial_state = build_initial_state(campaign, contact, inbox_id)
        config = {"configurable": {"thread_id": contact["id"]}}
        graph_module.outreach_graph.invoke(initial_state, config=config)
    except (OpenAINotFoundError, OpenAIAuthError) as exc:
        # Config error — wrong model name or invalid API key. Every contact will
        # fail with the same error, so revert the campaign to draft so the user
        # can fix the config and try again.
        logger.error(
            "LLM config error for campaign %s — reverting to draft: %s",
            campaign["id"],
            exc,
        )
        update_campaign_status(campaign["id"], "draft")
    except Exception:
        logger.exception(
            "Outreach failed for contact %s in campaign %s",
            contact["id"],
            campaign["id"],
        )
