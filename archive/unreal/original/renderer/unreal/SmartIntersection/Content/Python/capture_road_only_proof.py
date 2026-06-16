from __future__ import annotations

import os
from pathlib import Path

try:
    import unreal  # type: ignore
except Exception as exc:
    raise SystemExit(f"Unreal Python module required: {exc}")


def main() -> None:
    city = os.environ.get("SMART_INTERSECTION_CITY", "london")
    output = os.environ.get("SMART_INTERSECTION_PROOF_OUTPUT")
    if not output:
        raise SystemExit("SMART_INTERSECTION_PROOF_OUTPUT is required")
    output_path = Path(output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    map_path = f"/Game/Maps/Generated/{city}_RoadOnly"

    if not unreal.EditorAssetLibrary.does_asset_exist(map_path):
        raise SystemExit(f"map asset missing: {map_path}")
    unreal.EditorLevelLibrary.load_level(map_path)

    # Hide overlay warnings and move viewport to the generated proof camera angle.
    try:
        unreal.SystemLibrary.execute_console_command(None, "DisableAllScreenMessages")
    except Exception:
        pass
    camera_location = unreal.Vector(-1250, -1150, 900)
    camera_rotation = unreal.Rotator(0, -28, 42)
    unreal.EditorLevelLibrary.set_level_viewport_camera_info(camera_location, camera_rotation)

    # Trigger a high-res screenshot. UE writes asynchronously, so the caller verifies the file afterward.
    ok = unreal.AutomationLibrary.take_high_res_screenshot(1600, 900, str(output_path))
    print(f"ROAD_ONLY_PROOF_REQUESTED city={city} map={map_path} output={output_path} ok={ok}")


if __name__ == "__main__":
    main()
