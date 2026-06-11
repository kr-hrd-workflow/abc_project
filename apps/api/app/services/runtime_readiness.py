from collections.abc import Callable, Mapping, Sequence
from importlib.util import find_spec
import os
from pathlib import Path
from shutil import which
import sys
from typing import Literal, TypedDict

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

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


RuntimeSectionName = Literal["vision", "simulation", "openai", "pgvector"]


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
                _check(
                    "python module cv2",
                    module_available("cv2"),
                    detail=(
                        "install the API vision extra before enabling "
                        "opencv_yolo mode"
                    ),
                ),
                _check(
                    "python module ultralytics",
                    module_available("ultralytics"),
                    detail=(
                        "install the API vision extra before enabling "
                        "opencv_yolo mode"
                    ),
                ),
                _check(
                    f"model file {settings.yolo_model_path}",
                    path_exists(settings.yolo_model_path),
                    detail="set YOLO_MODEL_PATH to a local model file",
                ),
            ],
        ),
        "simulation": _section(
            mode=settings.sumo_simulation_mode,
            checks=[
                _check(
                    "python module traci",
                    module_available("traci"),
                    detail=(
                        "install the API simulation extra before enabling "
                        "sumo_traci mode"
                    ),
                ),
                _check(
                    "python module sumolib",
                    module_available("sumolib"),
                    detail=(
                        "install the API simulation extra before enabling "
                        "sumo_traci mode"
                    ),
                ),
                _check(
                    f"binary {settings.sumo_binary}",
                    binary_available(settings.sumo_binary),
                    detail=(
                        "install SUMO system binaries and keep SUMO_BINARY "
                        "configured"
                    ),
                ),
                _check(
                    "binary netconvert",
                    binary_available("netconvert"),
                    detail="install SUMO system binaries",
                ),
                _check(
                    f"SUMO config {settings.sumo_config_path}",
                    path_exists(settings.sumo_config_path),
                    detail="set SUMO_CONFIG_PATH to a local .sumocfg file",
                ),
            ],
        ),
        "openai": _section(
            mode=settings.openai_model,
            checks=[
                _check(
                    "python module openai",
                    module_available("openai"),
                    detail=(
                        "install the API ai extra before enabling OpenAI "
                        "client calls"
                    ),
                ),
                _check(
                    "OPENAI_API_KEY",
                    bool(env.get("OPENAI_API_KEY") or settings.openai_api_key),
                    detail="presence only; value is never returned",
                ),
                _check(
                    "OPENAI_MONTHLY_BUDGET_USD",
                    settings.openai_monthly_budget_usd is not None,
                    detail=(
                        "set a monthly OpenAI API budget before enabling "
                        "live client calls"
                    ),
                ),
            ],
        ),
        "pgvector": _section(
            mode="database",
            checks=[
                _check(
                    "python module pgvector",
                    module_available("pgvector"),
                    detail=(
                        "install the API ai extra before enabling pgvector "
                        "search"
                    ),
                ),
                _check(
                    "PostgreSQL vector extension",
                    vector_extension_verified(),
                    detail=(
                        "requires approved target database setup before "
                        "enabling vector columns"
                    ),
                ),
            ],
        ),
    }


def filter_runtime_readiness(
    readiness: dict[str, RuntimeSection],
    selected_sections: Sequence[str] | None,
) -> dict[str, RuntimeSection]:
    if not selected_sections:
        return readiness
    return {section: readiness[section] for section in selected_sections}


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
    if which(binary_name) is not None:
        return True
    python_bin_candidate = Path(sys.executable).parent / binary_name
    return python_bin_candidate.exists() and os.access(
        python_bin_candidate,
        os.X_OK,
    )


def _path_exists(path: str) -> bool:
    return Path(path).expanduser().exists()


def is_vector_extension_enabled(session_factory: Callable[[], object]) -> bool:
    try:
        with session_factory() as session:
            result = session.execute(
                text(
                    "select count(*) from pg_extension "
                    "where extname = 'vector'"
                )
            )
            return int(result.scalar_one()) > 0
    except (OSError, RuntimeError, SQLAlchemyError):
        return False


def _vector_extension_not_verified() -> bool:
    return False
