from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


API_DIR = Path(__file__).resolve().parents[2]
REPO_ROOT = API_DIR.parents[1]
ENV_FILES = (
    REPO_ROOT / ".env",
    REPO_ROOT / ".env.local",
    API_DIR / ".env",
    API_DIR / ".env.local",
)


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://smart_intersection:smart_intersection@localhost:5432/smart_intersection"
    vision_analysis_mode: Literal["fixture", "opencv_yolo"] = "fixture"
    yolo_model_path: str = "models/yolov8n.pt"
    yolo_confidence_threshold: float = Field(default=0.25, ge=0.0, le=1.0)
    # CCTV traffic-flow measurement (YOLO + ByteTrack line-crossing).
    traffic_video_url: str | None = None
    flow_window_seconds: float = Field(default=30.0, gt=0)
    # JSON list of counting lines; None -> default Gangnam-daero layout.
    # Per-camera geometry is a calibration knob (a fixed model cannot infer it).
    flow_counting_lines: str | None = None
    flow_period_min: int = Field(default=1, ge=1)
    flow_period_max: int = Field(default=120, ge=1)
    sumo_simulation_mode: Literal["fixture", "sumo_traci", "sumo_libsumo"] = "fixture"
    sumo_binary: str = "sumo"
    sumo_binary_path: str | None = None
    sumo_config_path: str = "networks/intersection.sumocfg"
    sumo_config_dir: str | None = None
    # Rewrite SUMO flow demand from measured CCTV flow before traci.start.
    sumo_calibrate_from_cctv: bool = False
    sumo_calibrated_config_dir: str | None = None
    sumo_step_count: int = Field(default=300, ge=1)
    sumo_runtime_ttl_seconds: int = Field(default=300, ge=1)
    sumo_authoritative_hz: int = Field(default=10, ge=5, le=10)
    sumo_frame_cache_ttl_ms: int = Field(default=1000, ge=1)
    openai_model: str = "gpt-5.5"
    openai_api_key: str | None = Field(default=None, repr=False)
    openai_embedding_model: str = "text-embedding-3-small"
    openai_embedding_dimensions: int = Field(default=1536, ge=1)
    openai_monthly_budget_usd: float | None = Field(default=10.0, gt=0)
    openai_answer_mode: Literal["local", "openai_auto", "openai"] = "openai_auto"
    knowledge_search_mode: Literal["keyword", "pgvector"] = "keyword"

    model_config = SettingsConfigDict(
        env_file=ENV_FILES,
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
