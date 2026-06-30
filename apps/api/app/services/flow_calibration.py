"""Rewrite SUMO demand (`<flow period>`) from measured CCTV vehicle flow.

`calibrate_demand` copies the base route file, replaces the headway `period` of
the mapped through/bus flows with one derived from the measured veh/h, and writes
a per-run `.rou.xml` + `.sumocfg` into an output directory the SUMO runtime then
loads via `sumo_config_dir`. Pure file IO, no traci — directly unit-testable.
"""

import logging
import xml.etree.ElementTree as ET
from collections.abc import Callable
from pathlib import Path
from time import monotonic

from app.adapters.flow_counter import (
    FlowMeasurement,
    OpenCVYoloFlowSource,
    load_counting_lines,
    measure_flow,
)
from app.core.config import Settings

logger = logging.getLogger(__name__)

# Camera approach -> SUMO flow id(s). The through line counts car/moto/truck (it
# excludes buses) so it maps to the passenger flow; bus lines map to the median
# bus flow. ponytail: trucks counted on the through line slightly inflate the
# passenger rate — acceptable for an MVP demand estimate.
APPROACH_FLOW_IDS: dict[str, tuple[str, ...]] = {
    "north": ("flow_north_through",),
    "south": ("flow_south_through",),
    "bus_north": ("flow_bus_north",),
    "bus_south": ("flow_bus_south",),
}

_SUMOCFG_TEMPLATE = """<?xml version="1.0" encoding="UTF-8"?>
<configuration xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://sumo.dlr.de/xsd/sumoConfiguration.xsd">
    <input>
        <net-file value="{net}"/>
        <route-files value="{route}"/>
    </input>
    <time>
        <begin value="0"/>
        <end value="3600"/>
    </time>
    <processing>
        <ignore-route-errors value="false"/>
    </processing>
</configuration>
"""


def period_for(veh_per_hour: float, *, period_min: int, period_max: int) -> int | None:
    """Headway in seconds for a given flow; None when there is no measured flow."""

    if veh_per_hour <= 0:
        return None
    return max(period_min, min(period_max, round(3600 / veh_per_hour)))


def calibrate_demand(
    measurement: FlowMeasurement,
    *,
    base_rou_path: Path | str,
    base_net_path: Path | str,
    out_dir: Path | str,
    scenario_id: str,
    period_min: int = 1,
    period_max: int = 120,
    approach_flow_ids: dict[str, tuple[str, ...]] = APPROACH_FLOW_IDS,
) -> Path:
    tree = ET.parse(base_rou_path)
    root = tree.getroot()
    flows = {flow.get("id"): flow for flow in root.findall("flow")}

    for approach, flow in measurement.approaches.items():
        flow_ids = approach_flow_ids.get(approach)
        if not flow_ids:
            continue
        period = period_for(
            flow.veh_per_hour, period_min=period_min, period_max=period_max
        )
        if period is None:
            continue
        for flow_id in flow_ids:
            element = flows.get(flow_id)
            if element is not None:
                element.set("period", str(period))

    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    rou_out = out_dir / f"{scenario_id}.rou.xml"
    tree.write(rou_out, encoding="utf-8", xml_declaration=True)

    cfg_out = out_dir / f"{scenario_id}.sumocfg"
    cfg_out.write_text(
        _SUMOCFG_TEMPLATE.format(
            net=Path(base_net_path).resolve(),
            route=rou_out.name,
        )
    )
    return cfg_out


def build_cctv_flow_calibrator(
    settings: Settings,
    *,
    source: OpenCVYoloFlowSource | None = None,
    calibrate_scenarios: tuple[str, ...] = ("normal",),
    clock: Callable[[], float] | None = None,
    ttl_seconds: float = 300.0,
) -> Callable[[str], str | None]:
    """A calibrator closure for `SumoRuntimeService`: measure CCTV flow and write
    a calibrated config for the given scenario, or return None to fall back.

    The flow source (cv2/YOLO) is built lazily on first use so importing this
    never requires the vision extra when calibration is disabled.

    The calibrated config is memoized per scenario for `ttl_seconds`: the ~30s
    video measurement runs at most once per TTL, so a SUMO that fails to start
    (session never cached -> re-created every poll) does NOT re-measure on every
    frame poll. ponytail: the one cold measurement still runs synchronously under
    the runtime lock; move to a background sampler only if multi-client stalls.
    """

    clock = clock or monotonic
    state: dict[str, OpenCVYoloFlowSource | None] = {"source": source}
    # Memo holds both successes (cfg path) and failures (None) so a dead stream
    # falls back statically for the TTL instead of re-measuring every poll.
    memo: dict[str, tuple[float, str | None]] = {}

    def calibrate(scenario_id: str) -> str | None:
        if scenario_id not in calibrate_scenarios:
            return None
        video = settings.traffic_video_url
        if not video:
            return None
        cached = memo.get(scenario_id)
        now = clock()
        if cached is not None and now - cached[0] < ttl_seconds:
            return cached[1]
        try:
            if state["source"] is None:
                state["source"] = OpenCVYoloFlowSource(
                    model_path=settings.yolo_model_path,
                    confidence_threshold=settings.yolo_confidence_threshold,
                )
            measurement = measure_flow(
                source=state["source"],
                video=video,
                lines=load_counting_lines(settings.flow_counting_lines),
                window_seconds=settings.flow_window_seconds,
                source_label="cctv",
            )
            # Calibrate from the active scenario config dir when one is set,
            # else from the single configured .sumocfg's directory.
            base_dir = (
                Path(settings.sumo_config_dir)
                if settings.sumo_config_dir
                else Path(settings.sumo_config_path).parent
            )
            out_dir = settings.sumo_calibrated_config_dir or str(base_dir / "_calibrated")
            cfg_path = str(
                calibrate_demand(
                    measurement,
                    base_rou_path=base_dir / "intersection.rou.xml",
                    base_net_path=base_dir / "intersection.net.xml",
                    out_dir=out_dir,
                    scenario_id=scenario_id,
                    period_min=settings.flow_period_min,
                    period_max=settings.flow_period_max,
                )
            )
        except Exception as exc:  # stream/model/IO failure -> static demand
            logger.warning(
                "CCTV calibration failed for %s; using static demand: %s",
                scenario_id,
                exc,
            )
            memo[scenario_id] = (now, None)
            return None
        memo[scenario_id] = (now, cfg_path)
        return cfg_path

    return calibrate
