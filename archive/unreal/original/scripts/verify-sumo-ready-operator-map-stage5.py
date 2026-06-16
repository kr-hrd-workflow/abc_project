#!/usr/bin/env python3
"""Verify Stage 5 Pixel Streaming dashboard integration artifacts.

This verifies the dashboard transport proof only. SUMO/TraCI remains the
simulation truth source, FastAPI remains the orchestrator, Unreal renders, and
Pixel Streaming transports rendered frames. Live SUMO is still deferred until a
real local sumo_traci run produces matching runtime metadata.
"""
from __future__ import annotations

from pathlib import Path
import json
import sys

from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parents[1]
UE = ROOT / "renderer" / "unreal" / "SmartIntersection"
PACKAGE_JSON = ROOT / "package.json"
UPROJECT = UE / "SmartIntersection.uproject"
START_PIXEL_STREAMING = ROOT / "scripts" / "start-pixel-streaming.ps1"
OPEN_UNREAL = ROOT / "scripts" / "open-unreal-project.ps1"
UNREAL_HOME = ROOT / "scripts" / "unreal-at-home.ps1"
CAPTURE_PS1 = ROOT / "scripts" / "capture-dashboard-pixel-streaming-stage5.ps1"
CAPTURE_MJS = ROOT / "scripts" / "capture-dashboard-pixel-streaming-stage5.mjs"
SIMULATION_VIEWPORT = ROOT / "apps" / "web" / "components" / "SimulationViewport.tsx"
DASHBOARD_TESTS = ROOT / "apps" / "web" / "components" / "DashboardShell.test.tsx"
DASHBOARD_SHELL = ROOT / "apps" / "web" / "components" / "DashboardShell.tsx"
MANIFEST = UE / "GeneratedProof" / "smart_intersection_rebuild_operator_stage5_pixel_streaming_manifest.json"
PROOF = ROOT / "artifacts" / "unreal-operator-map-stage5-dashboard-stream-proof.png"
DETAILS = ROOT / "artifacts" / "unreal-operator-map-stage5-dashboard-stream-details.json"

MIN_PROOF_BYTES = 120_000
MIN_WIDTH = 1280
MIN_HEIGHT = 720


def fail(message: str) -> None:
    print(f"SUMO_READY_OPERATOR_STAGE5_FAIL: {message}")
    sys.exit(1)


def load_json(path: Path, label: str) -> dict:
    if not path.exists():
        fail(f"missing {label}: {path.relative_to(ROOT)}")
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"{label} is not valid JSON: {path.relative_to(ROOT)} error={exc}")
    if not isinstance(value, dict):
        fail(f"{label} root is not an object: {path.relative_to(ROOT)}")
    return value


def require_tokens(path: Path, tokens: list[str], label: str | None = None) -> None:
    if not path.exists():
        fail(f"missing source file: {path.relative_to(ROOT)}")
    text = path.read_text(encoding="utf-8")
    for token in tokens:
        if token not in text:
            display = label or str(path.relative_to(ROOT))
            fail(f"{display} missing Stage 5 token: {token}")


def check_source_tokens() -> None:
    project = load_json(UPROJECT, "Unreal project")
    plugins = project.get("Plugins", [])
    if not any(
        plugin.get("Name") == "PixelStreaming" and plugin.get("Enabled") is True
        for plugin in plugins
    ):
        fail("SmartIntersection.uproject does not enable PixelStreaming")

    source_expectations = {
        PACKAGE_JSON: [
            "verify:operator-map-stage1",
            "verify:operator-map-stage2",
            "verify:operator-map-stage3",
            "verify:operator-map-stage4",
            "verify:operator-map-stage5",
            "unreal:capture:operator-stage5",
        ],
        START_PIXEL_STREAMING: [
            "SignallingWebServer",
            "EpicGamesExt/PixelStreamingInfrastructure",
            "tmp\\PixelStreamingInfrastructure",
            "Expected dashboard stream URL: http://127.0.0.1",
        ],
        OPEN_UNREAL: [
            "-PixelStreamingURL=ws://127.0.0.1:8888",
            "-RenderOffscreen",
            "-AudioMixer",
            "Pixel Streaming launch flags enabled: -PixelStreamingURL=ws://127.0.0.1:8888 -RenderOffscreen -AudioMixer",
        ],
        UNREAL_HOME: [
            "NEXT_PUBLIC_SIMULATION_STREAM_URL=http://127.0.0.1",
            "scripts/start-pixel-streaming.ps1",
            "scripts/open-unreal-project.ps1 -PixelStreaming -Game",
        ],
        SIMULATION_VIEWPORT: [
            "NEXT_PUBLIC_SIMULATION_STREAM_URL",
            "NEXT_PUBLIC_UNITY_WEBGL_URL",
            "genericStreamUrl || legacyStreamUrl",
            "simulation-stream-frame unreal-pixel-streaming-frame",
            "Unreal Pixel Streaming",
            "fullscreen; autoplay; xr-spatial-tracking",
        ],
        DASHBOARD_TESTS: [
            'vi.stubEnv("NEXT_PUBLIC_SIMULATION_STREAM_URL", "http://127.0.0.1")',
            'vi.stubEnv("NEXT_PUBLIC_UNITY_WEBGL_URL", "/unity/index.html")',
            'expect(streamFrame?.getAttribute("src")).toBe("http://127.0.0.1")',
            'expect(streamFrame?.className).toContain("unreal-pixel-streaming-frame")',
            'expect(streamFrame?.getAttribute("allow")).toContain("fullscreen")',
        ],
        DASHBOARD_SHELL: [
            "Simulation only / No real signal control",
        ],
        CAPTURE_PS1: [
            "http://127.0.0.1:3000/dashboard",
            "http://127.0.0.1",
            "capture-dashboard-pixel-streaming-stage5.mjs",
        ],
        CAPTURE_MJS: [
            "iframe.simulation-stream-frame.unreal-pixel-streaming-frame",
            "operator-stage5-pixel-streaming-dashboard-proof-v1",
            "Pixel Streaming transports rendered frames only",
            "Frames Decoded",
            "Video resolution",
        ],
    }
    for path, tokens in source_expectations.items():
        require_tokens(path, tokens)
    print("STAGE5_SOURCE_TOKEN_CHECK_PASS")


def check_details() -> dict:
    details = load_json(DETAILS, "Stage 5 dashboard details")
    expected = {
        "schema": "operator-stage5-pixel-streaming-dashboard-proof-v1",
        "mode": "OperatorStage5",
        "base_stage": "OperatorStage4Fixture",
        "dashboard_url": "http://127.0.0.1:3000/dashboard",
        "stream_url": "http://127.0.0.1",
        "iframe_src": "http://127.0.0.1",
        "simulation_source_claim": "fixture_or_live_as_reported_by_runtime_readiness",
        "live_sumo_status": "deferred_unless_real_sumo_traci_run_passes",
    }
    for key, value in expected.items():
        if details.get(key) != value:
            fail(f"dashboard details {key} mismatch: expected={value!r} actual={details.get(key)!r}")
    for key in (
        "stream_frame_visible",
        "safety_copy_visible",
        "sumo_renderer_visible",
        "pixel_streaming_label_visible",
        "dashboard_shell_visible",
        "pixel_streaming_started",
        "no_real_control",
    ):
        if details.get(key) is not True:
            fail(f"dashboard details did not prove {key}")
    if details.get("pixel_streaming_frontend_url") != "http://127.0.0.1/":
        fail(
            "dashboard details did not capture the local Pixel Streaming frontend URL: "
            f"{details.get('pixel_streaming_frontend_url')!r}"
        )
    if details.get("video_resolution") != "1280x720":
        fail(f"dashboard details video_resolution mismatch: {details.get('video_resolution')!r}")
    if not isinstance(details.get("frames_decoded"), int) or details["frames_decoded"] <= 0:
        fail(f"dashboard details frames_decoded invalid: {details.get('frames_decoded')!r}")
    if details.get("video_codec") not in {"H264", "VP8", "VP9"}:
        fail(f"dashboard details video_codec invalid: {details.get('video_codec')!r}")
    policy = details.get("renderer_policy", "")
    for token in ("SUMO/TraCI is truth", "FastAPI orchestrates", "Unreal renders", "Pixel Streaming transports frames"):
        if token not in policy:
            fail(f"dashboard details renderer_policy missing: {token}")
    print("STAGE5_DASHBOARD_DETAILS_CHECK_PASS")
    return details


def check_manifest(details: dict) -> dict:
    manifest = load_json(MANIFEST, "Stage 5 Pixel Streaming manifest")
    expected = {
        "schema": "operator-stage5-pixel-streaming-dashboard-proof-v1",
        "mode": "OperatorStage5",
        "base_stage": "OperatorStage4Fixture",
        "dashboard_url": "http://127.0.0.1:3000/dashboard",
        "stream_url": "http://127.0.0.1",
        "proof_image": "artifacts/unreal-operator-map-stage5-dashboard-stream-proof.png",
        "details_json": "artifacts/unreal-operator-map-stage5-dashboard-stream-details.json",
        "simulation_source_claim": "fixture_or_live_as_reported_by_runtime_readiness",
        "live_sumo_status": "deferred_unless_real_sumo_traci_run_passes",
    }
    for key, value in expected.items():
        if manifest.get(key) != value:
            fail(f"manifest {key} mismatch: expected={value!r} actual={manifest.get(key)!r}")
    for flag in ("-PixelStreamingURL=ws://127.0.0.1:8888", "-RenderOffscreen", "-AudioMixer"):
        if flag not in manifest.get("pixel_streaming_launch_flags", []):
            fail(f"manifest missing launch flag: {flag}")
    policy = manifest.get("renderer_policy", "") + " " + manifest.get("transport_boundary", "")
    for token in ("SUMO/TraCI is truth", "FastAPI orchestrates", "Unreal renders", "Pixel Streaming transports"):
        if token not in policy:
            fail(f"manifest missing renderer/transport policy token: {token}")
    if details.get("screenshot_path") != manifest.get("proof_image"):
        fail("details screenshot_path does not match manifest proof_image")
    print(f"STAGE5_MANIFEST_CHECK_PASS manifest={MANIFEST.relative_to(ROOT)}")
    return manifest


def check_proof_image(manifest: dict) -> None:
    if manifest.get("proof_image") != str(PROOF.relative_to(ROOT)).replace("\\", "/"):
        fail(f"manifest proof_image mismatch: {manifest.get('proof_image')!r}")
    if not PROOF.exists():
        fail(f"missing dashboard proof screenshot: {PROOF.relative_to(ROOT)}")
    if PROOF.stat().st_size < MIN_PROOF_BYTES:
        fail(f"dashboard proof screenshot too small: bytes={PROOF.stat().st_size}")
    try:
        raw = Image.open(PROOF)
    except Exception as exc:
        fail(f"dashboard proof screenshot is not readable: {exc}")
    if "A" in raw.getbands():
        fail(f"dashboard proof screenshot has alpha channel that can render black: mode={raw.mode}")
    image = raw.convert("RGB")
    if image.width < MIN_WIDTH or image.height < MIN_HEIGHT:
        fail(f"dashboard proof dimensions too small: {image.size}")
    stat = ImageStat.Stat(image)
    mean = sum(stat.mean) / 3.0
    stddev = sum(stat.stddev) / 3.0
    if mean < 10.0 or mean > 235.0:
        fail(f"dashboard proof brightness out of range: mean={mean:.2f}")
    if stddev < 18.0:
        fail(f"dashboard proof lacks visible dashboard/stream variation: stddev={stddev:.2f}")
    print(
        f"STAGE5_DASHBOARD_PROOF_IMAGE_CHECK_PASS size={image.size} "
        f"bytes={PROOF.stat().st_size} mean={mean:.2f} stddev={stddev:.2f}"
    )


def main() -> None:
    check_source_tokens()
    details = check_details()
    manifest = check_manifest(details)
    check_proof_image(manifest)
    print("SUMO_READY_OPERATOR_STAGE5_PASS")


if __name__ == "__main__":
    main()
