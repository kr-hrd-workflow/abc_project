from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002_pgvector_knowledge"
down_revision: str | None = "0001_initial_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("create extension if not exists vector")
    op.create_table(
        "knowledge_chunks",
        sa.Column("chunk_id", sa.String(length=128), primary_key=True),
        sa.Column("document_id", sa.String(length=128), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("embedding", sa.Text(), nullable=False),
    )
    op.execute("alter table knowledge_chunks alter column embedding type vector(1536) using embedding::vector")
    op.create_index(
        "ix_knowledge_chunks_document_id",
        "knowledge_chunks",
        ["document_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_knowledge_chunks_document_id",
        table_name="knowledge_chunks",
    )
    op.drop_table("knowledge_chunks")
