from langgraph.graph import StateGraph, START, END

from graph.state import EmailAgentState
from graph.nodes import classify, search, draft, send, process_reply, compose_followup, terminal

outreach_graph = None
reply_graph = None


def init_graphs(checkpointer) -> None:
    global outreach_graph, reply_graph
    outreach_graph = _build_outreach_graph(checkpointer)
    reply_graph = _build_reply_graph(checkpointer)


def _build_outreach_graph(checkpointer):
    g = StateGraph(EmailAgentState)
    g.add_node("classify_needs", classify.run)
    g.add_node("search_context", search.run)
    g.add_node("draft", draft.run)
    g.add_node("send_email", send.run)

    g.add_edge(START, "classify_needs")
    g.add_conditional_edges(
        "classify_needs",
        lambda s: "search_context" if s["needs_search"] else "draft",
    )
    g.add_edge("search_context", "draft")
    g.add_edge("draft", "send_email")
    g.add_edge("send_email", END)

    return g.compile(checkpointer=checkpointer)


def _build_reply_graph(checkpointer):
    g = StateGraph(EmailAgentState)
    g.add_node("process_reply", process_reply.run)
    g.add_node("check_terminal", terminal.run)
    g.add_node("classify_needs", classify.run)
    g.add_node("search_context", search.run)
    g.add_node("compose_followup", compose_followup.run)
    g.add_node("send_followup", send.run)

    g.add_edge(START, "process_reply")
    g.add_edge("process_reply", "check_terminal")
    g.add_conditional_edges(
        "check_terminal",
        lambda s: END if s["terminal"] else "classify_needs",
    )
    g.add_conditional_edges(
        "classify_needs",
        lambda s: "search_context" if s["needs_search"] else "compose_followup",
    )
    g.add_edge("search_context", "compose_followup")
    g.add_edge("compose_followup", "send_followup")
    # After sending a follow-up, re-check terminal (catches max_followups)
    g.add_edge("send_followup", END)

    return g.compile(checkpointer=checkpointer)
