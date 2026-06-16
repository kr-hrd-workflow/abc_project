from __future__ import annotations

import math
import os

try:
    import unreal  # type: ignore
except Exception as exc:
    raise SystemExit(f"Unreal Python module required: {exc}")


def look_at_rotation(origin, target):
    dx = target.x - origin.x
    dy = target.y - origin.y
    dz = target.z - origin.z
    yaw = math.degrees(math.atan2(dy, dx))
    distance_xy = math.sqrt(dx * dx + dy * dy)
    pitch = math.degrees(math.atan2(dz, distance_xy))
    # UE 5.7 Python constructor order is effectively Roll, Pitch, Yaw.
    return unreal.Rotator(0.0, pitch, yaw)


def main() -> None:
    city = os.environ.get("SMART_INTERSECTION_CITY", "london")
    map_path = f"/Game/Maps/Generated/{city}_RoadOnly"
    if not unreal.EditorAssetLibrary.does_asset_exist(map_path):
        raise SystemExit(f"map asset missing: {map_path}")
    unreal.EditorLevelLibrary.load_level(map_path)
    world = unreal.EditorLevelLibrary.get_editor_world()
    try:
        unreal.SystemLibrary.execute_console_command(world, "DisableAllScreenMessages")
        unreal.SystemLibrary.execute_console_command(world, "viewmode unlit")
    except Exception:
        pass
    origin = unreal.Vector(-1250, -1150, 900)
    target = unreal.Vector(0, 0, 20)
    rotation = look_at_rotation(origin, target)
    unreal.EditorLevelLibrary.set_level_viewport_camera_info(origin, rotation)
    print(f"ROAD_ONLY_VIEWPORT_READY city={city} map={map_path} camera={origin} rotation={rotation}")


if __name__ == "__main__":
    main()
