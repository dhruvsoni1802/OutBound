import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    import graph.graph as graph_module
    from langgraph.checkpoint.memory import MemorySaver

    model = os.environ.get("OPENROUTER_MODEL", "meta-llama/llama-3.2-3b-instruct:free")
    logger.info("LLM model: %s", model)

    db_url = os.environ.get("DATABASE_URL")
    if db_url:
        try:
            from langgraph.checkpoint.postgres import PostgresSaver

            checkpointer = PostgresSaver.from_conn_string(db_url)
            checkpointer.setup()
            graph_module.init_graphs(checkpointer)
            logger.info("LangGraph graphs initialised with PostgresSaver")
        except ModuleNotFoundError:
            logger.warning(
                "langgraph.checkpoint.postgres is not installed — "
                "falling back to MemorySaver"
            )
            graph_module.init_graphs(MemorySaver())
        except Exception:
            logger.exception("Failed to init PostgresSaver — falling back to MemorySaver")
            graph_module.init_graphs(MemorySaver())
    else:
        logger.warning("DATABASE_URL not set — using in-memory checkpointer (no persistence)")
        graph_module.init_graphs(MemorySaver())

    yield


app = FastAPI(title="Embra Agent Service", lifespan=lifespan)

from routers import campaigns as campaigns_router  # noqa: E402
from routers import webhooks as webhooks_router    # noqa: E402

app.include_router(campaigns_router.router)
app.include_router(webhooks_router.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
