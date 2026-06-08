from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "intersections",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("location_label", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "intersection_status",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("intersection_id", sa.String(length=64), sa.ForeignKey("intersections.id"), nullable=False),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("signal_phase", sa.String(length=64), nullable=False),
        sa.Column("cycle_second", sa.Integer(), nullable=False),
        sa.Column("north_queue", sa.Integer(), nullable=False),
        sa.Column("south_queue", sa.Integer(), nullable=False),
        sa.Column("east_queue", sa.Integer(), nullable=False),
        sa.Column("west_queue", sa.Integer(), nullable=False),
        sa.Column("pedestrian_request", sa.Boolean(), nullable=False),
        sa.Column("emergency_priority", sa.Boolean(), nullable=False),
        sa.Column("congestion_level", sa.String(length=32), nullable=False),
        sa.Column("source", sa.String(length=64), nullable=False),
    )
    op.create_table(
        "traffic_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("intersection_id", sa.String(length=64), sa.ForeignKey("intersections.id"), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("direction", sa.String(length=16), nullable=True),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("severity", sa.String(length=32), nullable=False),
        sa.Column("object_count", sa.Integer(), nullable=False),
        sa.Column("ai_summary", sa.Text(), nullable=False),
        sa.Column("recommendation", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("source", sa.String(length=64), nullable=False),
    )
    op.create_table(
        "signal_recommendations",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("intersection_id", sa.String(length=64), sa.ForeignKey("intersections.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("trigger_event_id", sa.Integer(), sa.ForeignKey("traffic_events.id"), nullable=True),
        sa.Column("recommended_action", sa.String(length=64), nullable=False),
        sa.Column("recommended_plan_json", sa.JSON(), nullable=False),
        sa.Column("evidence_json", sa.JSON(), nullable=False),
        sa.Column("safety_boundary", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
    )
    op.create_table(
        "simulation_runs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("intersection_id", sa.String(length=64), sa.ForeignKey("intersections.id"), nullable=False),
        sa.Column("recommendation_id", sa.Integer(), sa.ForeignKey("signal_recommendations.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("baseline_metrics_json", sa.JSON(), nullable=False),
        sa.Column("recommended_metrics_json", sa.JSON(), nullable=False),
        sa.Column("improvement_summary", sa.Text(), nullable=False),
        sa.Column("source", sa.String(length=64), nullable=False),
    )
    op.create_table(
        "chat_logs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("intersection_id", sa.String(length=64), sa.ForeignKey("intersections.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("referenced_event_ids_json", sa.JSON(), nullable=False),
    )
    op.create_table(
        "reports",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("intersection_id", sa.String(length=64), sa.ForeignKey("intersections.id"), nullable=False),
        sa.Column("period_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("period_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("reports")
    op.drop_table("chat_logs")
    op.drop_table("simulation_runs")
    op.drop_table("signal_recommendations")
    op.drop_table("traffic_events")
    op.drop_table("intersection_status")
    op.drop_table("intersections")
