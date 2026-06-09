from app.services.knowledge import (
    DEFAULT_POLICY_DOCUMENTS,
    ingest_policy_documents,
    search_policy_evidence_pgvector,
    search_policy_evidence,
    sync_policy_embeddings,
)


def test_policy_document_ingestion_and_retrieval_returns_relevant_chunks() -> None:
    chunks = ingest_policy_documents()

    assert {
        (chunk.document_id, chunk.title)
        for chunk in chunks
    } >= {
        (
            "emergency-priority-guide",
            "Emergency Vehicle Priority Guideline",
        ),
        (
            "pedestrian-safety-guide",
            "Pedestrian Safety Operation Guide",
        ),
    }

    evidence = search_policy_evidence(
        "What policy evidence supports emergency priority?",
        chunks,
        limit=1,
    )

    assert len(evidence) == 1
    assert evidence[0].document_id == "emergency-priority-guide"
    assert "emergency vehicle" in evidence[0].content.lower()


class FakeEmbeddingGateway:
    def __init__(self, embedding: list[float]) -> None:
        self.embedding = embedding
        self.inputs: list[str] = []

    def embed_text(self, text: str) -> list[float]:
        self.inputs.append(text)
        return self.embedding


class FakeResult:
    def __init__(self, rows: list[dict[str, str]] | None = None) -> None:
        self.rows = rows or []

    def mappings(self) -> "FakeResult":
        return self

    def all(self) -> list[dict[str, str]]:
        return self.rows


class FakePgvectorSession:
    def __init__(self, rows: list[dict[str, str]] | None = None) -> None:
        self.rows = rows or []
        self.executed: list[tuple[object, dict[str, object]]] = []
        self.committed = False

    def execute(
        self,
        statement: object,
        params: dict[str, object] | None = None,
    ) -> FakeResult:
        self.executed.append((statement, params or {}))
        return FakeResult(self.rows)

    def commit(self) -> None:
        self.committed = True


def test_sync_policy_embeddings_stores_chunks_with_embedding_vectors() -> None:
    session = FakePgvectorSession()
    gateway = FakeEmbeddingGateway([0.1, 0.2, 0.3])

    sync_policy_embeddings(
        session=session,
        embedding_gateway=gateway,
        documents=DEFAULT_POLICY_DOCUMENTS[:1],
    )

    assert gateway.inputs == [
        (
            "Emergency Vehicle Priority Guideline\n"
            "Emergency vehicle priority may be recommended when an ambulance, "
            "fire response, police response, or other emergency vehicle is "
            "detected on an approach. The recommendation must remain "
            "simulation-only until a human operator validates the context."
        )
    ]
    assert session.committed is True
    assert "on conflict (chunk_id) do update" in str(session.executed[0][0]).lower()
    assert session.executed[0][1]["embedding"] == "[0.1,0.2,0.3]"


def test_pgvector_policy_search_embeds_query_and_uses_vector_distance() -> None:
    session = FakePgvectorSession(
        rows=[
            {
                "document_id": "emergency-priority-guide",
                "chunk_id": "emergency-priority-guide:1",
                "title": "Emergency Vehicle Priority Guideline",
                "content": "Emergency priority remains simulation-only.",
            }
        ]
    )
    gateway = FakeEmbeddingGateway([0.4, 0.5, 0.6])

    evidence = search_policy_evidence_pgvector(
        query="Should we prioritize an ambulance?",
        session=session,
        embedding_gateway=gateway,
        limit=1,
    )

    assert gateway.inputs == ["Should we prioritize an ambulance?"]
    assert len(evidence) == 1
    assert evidence[0].document_id == "emergency-priority-guide"
    assert evidence[0].title_keywords == frozenset({"emergency", "vehicle", "priority", "guideline"})
    statement = str(session.executed[0][0]).lower()
    assert "embedding <-> cast(:query_embedding as vector)" in statement
    assert session.executed[0][1] == {
        "query_embedding": "[0.4,0.5,0.6]",
        "limit": 1,
    }


def test_pgvector_policy_search_returns_no_evidence_without_rows() -> None:
    session = FakePgvectorSession(rows=[])
    gateway = FakeEmbeddingGateway([0.4, 0.5, 0.6])

    evidence = search_policy_evidence_pgvector(
        query="Invent a city policy for scooters",
        session=session,
        embedding_gateway=gateway,
    )

    assert evidence == []
