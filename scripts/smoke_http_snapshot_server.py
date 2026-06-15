from __future__ import annotations

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import sys

SNAPSHOT = {
    "snapshot_type": "unreal_renderer_snapshot",
    "snapshot_id": "stage4-fixture-a",
    "source": "stage4_renderer_fixture",
    "simulation_source": "sumo_traci_fixture",
    "cityProfileId": "paris",
    "city_profile": "paris",
    "activeSignalGroup": "east_priority",
    "signal_phase": "east_priority",
    "cycleSecond": 24,
    "cycle_second": 24,
    "simulation_time_seconds": 12.0,
    "motion_binding_version": "operator-stage4-motion-v1",
    "queues": {
        "north": 32,
        "south": 11,
        "east": 18,
        "west": 8,
    },
    "pedestrianRequest": True,
    "pedestrian_request": True,
    "emergency_vehicle_approach": True,
    "emergency_priority": True,
    "emergencyVehicleDirection": "east",
    "emergency_direction": "east",
    "pixelStreamConnected": True,
    "pixel_stream_connected": True,
    "pixelStreamStatus": "ready",
    "pixel_stream_status": "ready",
    "pixelStreamSignallingUrl": "ws://127.0.0.1:8888",
    "pixel_stream_signalling_url": "ws://127.0.0.1:8888",
    "safety_boundary": "Recommendation and simulation only. No real traffic signal control is performed.",
    "vehicles": [
        {
            "actor_label": (
                "OperatorStage3_Stage3VehicleKit_SUMOReadyAssetPivot_"
                "seoul_north_passenger_car_00"
            ),
            "vehicle_id": "veh-north-00",
            "lane_id": "north_inbound_0",
            "direction": "north",
            "x_cm": -44.0,
            "y_cm": 1540.0,
            "z_cm": 86.0,
            "heading_deg": 180.0,
            "speed_mps": 2.8,
            "class": "passenger_car",
        }
    ],
    "signals": [
        {
            "actor_label": (
                "OperatorStage3_Stage3SignalKit_SUMOReadyAssetPivot_"
                "seoul_northwest_pole"
            ),
            "signal_group": "north_south",
            "state": "red",
        }
    ],
}


class SnapshotHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        log_path = os.environ.get("SMART_INTERSECTION_HTTP_SMOKE_SERVER_LOG")
        if log_path:
            Path(log_path).parent.mkdir(parents=True, exist_ok=True)
            with Path(log_path).open("a", encoding="utf-8") as handle:
                handle.write(json.dumps({"method": "GET", "path": self.path}) + "\n")

        if not self.path.startswith("/api/renderer/unreal/snapshot"):
            self.send_response(404)
            self.end_headers()
            return

        body = json.dumps(SNAPSHOT).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, _format: str, *_args: object) -> None:
        return


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    server = ThreadingHTTPServer(("127.0.0.1", port), SnapshotHandler)
    print(f"HTTP_SNAPSHOT_SERVER_READY port={port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
