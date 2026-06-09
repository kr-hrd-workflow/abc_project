from typing import Literal, TypedDict


class SampleInputFixture(TypedDict):
    scenario_id: str
    media_type: Literal["image", "video"]
    filename: str
    description: str


SAMPLE_INPUT_FIXTURES: dict[str, SampleInputFixture] = {
    "emergency-east-frame": {
        "scenario_id": "emergency",
        "media_type": "image",
        "filename": "emergency-east-frame.jpg",
        "description": "Sample frame with an emergency vehicle approaching from the east.",
    },
    "blocked-intersection-clip": {
        "scenario_id": "blocked",
        "media_type": "video",
        "filename": "blocked-intersection-clip.mp4",
        "description": "Sample clip representing a blocked four-way intersection.",
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
    }
