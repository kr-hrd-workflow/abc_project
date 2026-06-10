import re
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Protocol, Sequence

from sqlalchemy import text


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


class EmbeddingGateway(Protocol):
    model: str

    def embed_text(self, text: str) -> list[float]:
        pass


class MappingRows(Protocol):
    def all(self) -> Sequence[Mapping[str, str]]:
        pass


class SqlResult(Protocol):
    def mappings(self) -> MappingRows:
        pass


class SqlSession(Protocol):
    def execute(
        self,
        statement: object,
        params: Mapping[str, object] | None = None,
    ) -> SqlResult:
        pass

    def commit(self) -> None:
        pass


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


UPSERT_POLICY_CHUNK_SQL = text(
    """
    insert into knowledge_chunks (
        document_id,
        chunk_id,
        title,
        content,
        embedding
    )
    values (
        :document_id,
        :chunk_id,
        :title,
        :content,
        cast(:embedding as vector)
    )
    on conflict (chunk_id) do update
    set
        document_id = excluded.document_id,
        title = excluded.title,
        content = excluded.content,
        embedding = excluded.embedding
    """
)

SEARCH_POLICY_EVIDENCE_SQL = text(
    """
    select document_id, chunk_id, title, content
    from knowledge_chunks
    order by embedding <-> cast(:query_embedding as vector), document_id
    limit :limit
    """
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


def sync_policy_embeddings(
    *,
    session: SqlSession,
    embedding_gateway: EmbeddingGateway,
    documents: Sequence[PolicyDocument] = DEFAULT_POLICY_DOCUMENTS,
) -> None:
    for chunk in ingest_policy_documents(documents):
        session.execute(
            UPSERT_POLICY_CHUNK_SQL,
            {
                "document_id": chunk.document_id,
                "chunk_id": chunk.chunk_id,
                "title": chunk.title,
                "content": chunk.content,
                "embedding": _vector_literal(
                    embedding_gateway.embed_text(_embedding_input(chunk))
                ),
            },
        )
    session.commit()


def search_policy_evidence_pgvector(
    *,
    query: str,
    session: SqlSession,
    embedding_gateway: EmbeddingGateway,
    limit: int = 2,
) -> list[KnowledgeChunk]:
    result = session.execute(
        SEARCH_POLICY_EVIDENCE_SQL,
        {
            "query_embedding": _vector_literal(embedding_gateway.embed_text(query)),
            "limit": limit,
        },
    )
    return [
        _row_to_chunk(row)
        for row in result.mappings().all()
    ]


def format_policy_evidence(chunks: Sequence[KnowledgeChunk]) -> str:
    if not chunks:
        return ""
    evidence = "; ".join(
        f"{chunk.title}: {chunk.content}"
        for chunk in chunks
    )
    return f" Policy evidence: {evidence}"


def _embedding_input(chunk: KnowledgeChunk) -> str:
    return f"{chunk.title}\n{chunk.content}"


def _row_to_chunk(row: Mapping[str, str]) -> KnowledgeChunk:
    title = row["title"]
    content = row["content"]
    return KnowledgeChunk(
        document_id=row["document_id"],
        chunk_id=row["chunk_id"],
        title=title,
        content=content,
        title_keywords=_tokens(title),
        keywords=_tokens(f"{title} {content}"),
    )


def _vector_literal(embedding: Sequence[float]) -> str:
    return "[" + ",".join(f"{float(value):.12g}" for value in embedding) + "]"


def _tokens(text: str) -> frozenset[str]:
    return frozenset(
        token
        for token in re.findall(r"[a-z0-9]+", text.lower())
        if len(token) > 2
    )
