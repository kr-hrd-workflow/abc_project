#!/usr/bin/env python3
"""Verify complete SmartIntersection simulation-renderer artifacts."""
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageStat
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
UNREAL = ROOT / "renderer" / "unreal" / "SmartIntersection"
LANDING = ROOT / "apps" / "web" / "public" / "landing"

REQUIRED_SOURCE = [
    UNREAL / "Source" / "SmartIntersectionRuntime" / "SmartIntersectionRuntime.Build.cs",
    UNREAL / "Source" / "SmartIntersectionRuntime" / "Public" / "TrafficSimulationController.h",
    UNREAL / "Source" / "SmartIntersectionRuntime" / "Private" / "TrafficSimulationController.cpp",
    UNREAL / "Source" / "SmartIntersection.Target.cs",
    UNREAL / "Source" / "SmartIntersectionEditor.Target.cs",
]

LANDING_ASSETS = [
    "street-pressure-cinematic.png",
    "candidate-motion-cinematic.png",
    "human-review-cinematic.png",
    "chapter-sense-cinematic.png",
    "chapter-compare-cinematic.png",
    "chapter-brief-cinematic.png",
    "chapter-dashboard-cinematic.png",
    "proof-operator-room-wide.png",
    "proof-review-evidence-closeup.png",
    "proof-city-ops-monitor.png",
]

CITIES = ["seoul", "new_york", "paris", "london"]


def fail(message: str) -> None:
    print(f"FAIL: {message}")
    sys.exit(1)


def check_source() -> None:
    project = json.loads((UNREAL / "SmartIntersection.uproject").read_text())
    if project.get("Category") != "Simulation":
        fail("uproject Category is not Simulation")
    modules = project.get("Modules") or []
    if {"Name": "SmartIntersectionRuntime", "Type": "Runtime", "LoadingPhase": "Default"} not in modules:
        fail("SmartIntersectionRuntime module declaration missing")
    for path in REQUIRED_SOURCE:
        if not path.exists():
            fail(f"missing source file: {path}")
    header = (UNREAL / "Source" / "SmartIntersectionRuntime" / "Public" / "TrafficSimulationController.h").read_text()
    for token in [
        "ATrafficSimulationController",
        "ETrafficSimulationPhase",
        "FTrafficSignalTiming",
        "ApplySimulationSnapshotJson",
        "ActiveSignalGroup",
        "CycleSecond",
        "DirectionalQueues",
        "bEmergencyVehicleApproaching",
        "EmergencyVehicleDirection",
        "bLastSnapshotParsed",
    ]:
        if token not in header:
            fail(f"controller header missing token: {token}")
    implementation = (UNREAL / "Source" / "SmartIntersectionRuntime" / "Private" / "TrafficSimulationController.cpp").read_text()
    for token in ["FJsonSerializer::Deserialize", "activeSignalGroup", "signal_phase", "cycleSecond", "cycle_second", "queues", "emergency_vehicle_approach", "emergency_priority"]:
        if token not in implementation:
            fail(f"controller implementation missing token: {token}")
    print("SOURCE_CHECK_PASS")


def check_landing() -> None:
    for name in LANDING_ASSETS:
        path = LANDING / name
        if not path.exists():
            fail(f"missing landing asset: {name}")
        im = Image.open(path).convert("RGB")
        stddev = sum(ImageStat.Stat(im).stddev) / 3
        if im.size != (1536, 1024):
            fail(f"unexpected landing asset dimensions: {name} {im.size}")
        if path.stat().st_size < 650_000 or stddev < 20:
            fail(f"landing asset looks stub-like: {name} bytes={path.stat().st_size} stddev={stddev:.2f}")
    print("LANDING_CHECK_PASS")


def check_maps() -> None:
    maps = UNREAL / "Content" / "Maps" / "Generated"
    for city in CITIES:
        path = maps / f"{city}_Intersection.umap"
        if not path.exists():
            fail(f"missing map: {path}")
        data = path.read_bytes()
        if len(data) < 500_000:
            fail(f"map too small: {path} {len(data)}")
        for token in [b"/Game/PhotorealKit", b"PostProcess", b"Fog", b"CleanOperatorRenderer", b"SignalQueueZone"]:
            if token not in data:
                fail(f"map missing token {token!r}: {city}")
        for token in [b"foreground proof", b"foreground plinth", b"PolyHaven CC0 VISIBLE"]:
            if token in data:
                fail(f"map still contains production proof-strip token {token!r}: {city}")
        if b"TrafficSimulationController" not in data and b"SmartIntersectionRuntime" not in data:
            fail(f"map missing runtime controller evidence: {city}")
        token_fragments = [(b"Security" + b"Token"), (b"PixelStreaming." + b"Security" + b"Token")]
        for token in token_fragments:
            if token in data:
                fail(f"secret-like token in map: {city}")
    print("MAP_CHECK_PASS")


if __name__ == "__main__":
    check_source()
    check_landing()
    check_maps()
