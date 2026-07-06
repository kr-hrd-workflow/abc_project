from collections.abc import Callable, Mapping, Sequence
from importlib.util import find_spec
import os
from pathlib import Path
from typing import Literal, TypedDict

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.binaries import resolve_binary_path
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
        "simulation": _simulation_section(
            settings,
            module_available=module_available,
            binary_available=binary_available,
            path_exists=path_exists,
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


def _simulation_section(
    settings: Settings,
    *,
    module_available: Callable[[str], bool],
    binary_available: Callable[[str], bool],
    path_exists: Callable[[str], bool],
) -> RuntimeSection:
    if settings.sumo_simulation_mode == "fixture":
        return _section(
            mode=settings.sumo_simulation_mode,
            checks=[
                _check(
                    "fixture simulation frame provider",
                    True,
                    detail="deterministic fixture snapshots; not live SUMO truth",
                )
            ],
        )

    module_checks = (
        [
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
        ]
        if settings.sumo_simulation_mode == "sumo_traci"
        else [
            _check(
                "python module libsumo",
                module_available("libsumo"),
                detail=(
                    "install the API simulation extra before enabling "
                    "sumo_libsumo mode"
                ),
            )
        ]
    )
    binary_name = settings.sumo_binary_path or settings.sumo_binary
    binary_check = (
        path_exists(binary_name)
        if settings.sumo_binary_path
        else binary_available(binary_name)
    )
    binary_detail = (
        "install SUMO system binaries and keep SUMO_BINARY_PATH configured"
        if settings.sumo_binary_path
        else "install SUMO system binaries and keep SUMO_BINARY configured"
    )
    netconvert_name = _netconvert_binary_name(settings)
    netconvert_check = (
        path_exists(netconvert_name)
        if settings.sumo_binary_path and netconvert_name != "netconvert"
        else binary_available(netconvert_name)
    )
    config_name = (
        f"SUMO config dir {settings.sumo_config_dir}"
        if settings.sumo_config_dir
        else f"SUMO config {settings.sumo_config_path}"
    )
    config_available = (
        path_exists(settings.sumo_config_dir)
        if settings.sumo_config_dir
        else path_exists(settings.sumo_config_path)
    )
    config_detail = (
        "set SUMO_CONFIG_DIR to a directory of scenario .sumocfg files"
        if settings.sumo_config_dir
        else "set SUMO_CONFIG_PATH to a local .sumocfg file"
    )
    return _section(
        mode=settings.sumo_simulation_mode,
        checks=[
            *module_checks,
            _check(
                f"binary {binary_name}",
                binary_check,
                detail=binary_detail,
            ),
            _check(
                f"binary {netconvert_name}",
                netconvert_check,
                detail="install SUMO system binaries",
            ),
            _check(
                config_name,
                config_available,
                detail=config_detail,
            ),
        ],
    )


def _netconvert_binary_name(settings: Settings) -> str:
    if not settings.sumo_binary_path:
        return "netconvert"

    sumo_path = Path(settings.sumo_binary_path)
    suffix = sumo_path.suffix
    candidate = sumo_path.with_name(f"netconvert{suffix}")
    return str(candidate)


def _module_available(module_name: str) -> bool:
    return find_spec(module_name) is not None


def _binary_available(binary_name: str) -> bool:
    return resolve_binary_path(binary_name) is not None


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
