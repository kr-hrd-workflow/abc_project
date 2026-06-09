from collections.abc import Callable, Mapping
from importlib.util import find_spec
import os
from pathlib import Path
from shutil import which
from typing import TypedDict

from app.core.config import Settings


class RuntimeCheck(TypedDict, total=False):
    name: str
    available: bool
    detail: str


class RuntimeSection(TypedDict):
    ready: bool
    mode: str
    missing: list[str]
    checks: list[RuntimeCheck]


def get_runtime_readiness(
    settings: Settings,
    *,
    module_available: Callable[[str], bool] | None = None,
    binary_available: Callable[[str], bool] | None = None,
    path_exists: Callable[[str], bool] | None = None,
    env: Mapping[str, str] | None = None,
    vector_extension_verified: Callable[[], bool] | None = None,
) -> dict[str, RuntimeSection]:
    module_available = module_available or _module_available
    binary_available = binary_available or _binary_available
    path_exists = path_exists or _path_exists
    env = os.environ if env is None else env
    vector_extension_verified = vector_extension_verified or _vector_extension_not_verified

    return {
        "vision": _section(
            mode=settings.vision_analysis_mode,
            checks=[
                _check("python module cv2", module_available("cv2")),
                _check("python module ultralytics", module_available("ultralytics")),
                _check(
                    f"model file {settings.yolo_model_path}",
                    path_exists(settings.yolo_model_path),
                ),
            ],
        ),
        "simulation": _section(
            mode=settings.sumo_simulation_mode,
            checks=[
                _check("python module traci", module_available("traci")),
                _check("python module sumolib", module_available("sumolib")),
                _check(
                    f"binary {settings.sumo_binary}",
                    binary_available(settings.sumo_binary),
                ),
                _check("binary netconvert", binary_available("netconvert")),
                _check(
                    f"SUMO config {settings.sumo_config_path}",
                    path_exists(settings.sumo_config_path),
                ),
            ],
        ),
        "openai": _section(
            mode=settings.openai_model,
            checks=[
                _check("python module openai", module_available("openai")),
                _check(
                    "OPENAI_API_KEY",
                    bool(env.get("OPENAI_API_KEY")),
                    detail="presence only; value is never returned",
                ),
            ],
        ),
        "pgvector": _section(
            mode="database",
            checks=[
                _check("python module pgvector", module_available("pgvector")),
                _check(
                    "PostgreSQL vector extension",
                    vector_extension_verified(),
                    detail="requires target database approval and verification",
                ),
            ],
        ),
    }


def _section(*, mode: str, checks: list[RuntimeCheck]) -> RuntimeSection:
    missing = [check["name"] for check in checks if not check["available"]]
    return {
        "ready": not missing,
        "mode": mode,
        "missing": missing,
        "checks": checks,
    }


def _check(name: str, available: bool, *, detail: str | None = None) -> RuntimeCheck:
    payload: RuntimeCheck = {"name": name, "available": available}
    if detail is not None:
        payload["detail"] = detail
    return payload


def _module_available(module_name: str) -> bool:
    return find_spec(module_name) is not None


def _binary_available(binary_name: str) -> bool:
    return which(binary_name) is not None


def _path_exists(path: str) -> bool:
    return Path(path).expanduser().exists()


def _vector_extension_not_verified() -> bool:
    return False
