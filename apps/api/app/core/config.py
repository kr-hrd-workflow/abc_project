from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://smart_intersection:smart_intersection@localhost:5432/smart_intersection"
    vision_analysis_mode: Literal["fixture", "opencv_yolo"] = "fixture"
    yolo_model_path: str = "models/yolov8n.pt"
    yolo_confidence_threshold: float = Field(default=0.25, ge=0.0, le=1.0)
    sumo_simulation_mode: Literal["fixture", "sumo_traci"] = "fixture"
    sumo_binary: str = "sumo"
    sumo_config_path: str = "networks/intersection.sumocfg"
    sumo_step_count: int = Field(default=300, ge=1)
    openai_model: str = "gpt-5.5"
    openai_embedding_model: str = "text-embedding-3-small"
    openai_embedding_dimensions: int = Field(default=1536, ge=1)

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
