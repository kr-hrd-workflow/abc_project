from typing import Literal, TypedDict


class SampleInputFixture(TypedDict):
    scenario_id: str
    media_type: Literal["image", "video", "virtual_cctv"]
    filename: str
    description: str
    source: str
    renderer: str
    safety_note: str


SAMPLE_INPUT_FIXTURES: dict[str, SampleInputFixture] = {
    "emergency-east-frame": {
        "scenario_id": "emergency",
        "media_type": "image",
        "filename": "emergency-east-frame.jpg",
        "description": "Sample frame with an emergency vehicle approaching from the east.",
        "source": "sample_frame",
        "renderer": "opencv_yolo_fixture",
        "safety_note": "Sample analysis only. No real CCTV stream or traffic signal control.",
    },
    "blocked-intersection-clip": {
        "scenario_id": "blocked",
        "media_type": "video",
        "filename": "blocked-intersection-clip.mp4",
        "description": "Sample clip representing a blocked four-way intersection.",
        "source": "sample_clip",
        "renderer": "opencv_yolo_fixture",
        "safety_note": "Sample analysis only. No real CCTV stream or traffic signal control.",
    },
    "unity-virtual-cctv-east": {
        "scenario_id": "emergency",
        "media_type": "virtual_cctv",
        "filename": "unity-virtual-cctv-east.mp4",
        "description": "Unity-style virtual CCTV presentation feed for the east emergency approach scenario.",
        "source": "unity_virtual_cctv",
        "renderer": "unity_presentation_fallback",
        "safety_note": "Unity is used for presentation visualization only; SUMO/TraCI remains the traffic validation engine.",
    },
}


def fixture_to_payload(
    fixture_id: str,
    fixture: SampleInputFixture,
) -> dict[str, str]:
    return {
        "fixture_id": fixture_id,
        "scenario_id": fixture["scenario_id"],
        "media_type": fixture["media_type"],
        "filename": fixture["filename"],
        "description": fixture["description"],
        "source": fixture["source"],
        "renderer": fixture["renderer"],
        "safety_note": fixture["safety_note"],
    }
