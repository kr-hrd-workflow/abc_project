from app.services.knowledge import (
    ingest_policy_documents,
    search_policy_evidence,
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
