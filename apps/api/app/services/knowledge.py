import re
from dataclasses import dataclass
from typing import Sequence


@dataclass(frozen=True)
class PolicyDocument:
    document_id: str
    title: str
    content: str


@dataclass(frozen=True)
class KnowledgeChunk:
    document_id: str
    chunk_id: str
    title: str
    content: str
    title_keywords: frozenset[str]
    keywords: frozenset[str]


DEFAULT_POLICY_DOCUMENTS: tuple[PolicyDocument, ...] = (
    PolicyDocument(
        document_id="emergency-priority-guide",
        title="Emergency Vehicle Priority Guideline",
        content=(
            "Emergency vehicle priority may be recommended when an ambulance, "
            "fire response, police response, or other emergency vehicle is "
            "detected on an approach. The recommendation must remain "
            "simulation-only until a human operator validates the context."
        ),
    ),
    PolicyDocument(
        document_id="pedestrian-safety-guide",
        title="Pedestrian Safety Operation Guide",
        content=(
            "Pedestrian waiting requests should be preserved when no higher "
            "priority emergency or blocked-intersection condition is active. "
            "Operators should review queue evidence before shortening a walk "
            "or crossing phase."
        ),
    ),
    PolicyDocument(
        document_id="blocked-intersection-guide",
        title="Blocked Intersection Operation Guide",
        content=(
            "A blocked intersection event should outrank ordinary congestion. "
            "The dashboard may recommend a clearance phase, but the output is "
            "decision support and must not be presented as an executed signal "
            "command."
        ),
    ),
)


def ingest_policy_documents(
    documents: Sequence[PolicyDocument] = DEFAULT_POLICY_DOCUMENTS,
) -> list[KnowledgeChunk]:
    chunks: list[KnowledgeChunk] = []
    for document in documents:
        chunks.append(
            KnowledgeChunk(
                document_id=document.document_id,
                chunk_id=f"{document.document_id}:1",
                title=document.title,
                content=document.content,
                title_keywords=_tokens(document.title),
                keywords=_tokens(f"{document.title} {document.content}"),
            )
        )
    return chunks


def search_policy_evidence(
    query: str,
    chunks: Sequence[KnowledgeChunk],
    limit: int = 2,
) -> list[KnowledgeChunk]:
    query_tokens = _tokens(query)
    scored_chunks = [
        (
            len(query_tokens & chunk.keywords)
            + len(query_tokens & chunk.title_keywords),
            chunk,
        )
        for chunk in chunks
    ]
    return [
        chunk
        for score, chunk in sorted(
            scored_chunks,
            key=lambda item: (-item[0], item[1].document_id),
        )
        if score > 0
    ][:limit]


def format_policy_evidence(chunks: Sequence[KnowledgeChunk]) -> str:
    if not chunks:
        return ""
    evidence = "; ".join(
        f"{chunk.title}: {chunk.content}"
        for chunk in chunks
    )
    return f" Policy evidence: {evidence}"


def _tokens(text: str) -> frozenset[str]:
    return frozenset(
        token
        for token in re.findall(r"[a-z0-9]+", text.lower())
        if len(token) > 2
    )
