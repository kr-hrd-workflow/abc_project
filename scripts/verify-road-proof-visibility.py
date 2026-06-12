#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageStat

ARTIFACTS = Path("artifacts")
CITIES = ["seoul", "new_york", "paris", "london"]
MIN_MEAN = 35.0
MIN_NONBLACK = 0.55
MIN_BRIGHT = 0.35


def image_metrics(path: Path) -> tuple[tuple[float, float, float], float, float]:
    image = Image.open(path).convert("RGB")
    stat = ImageStat.Stat(image)
    small = image.resize((320, 180))
    pixels = list(small.getdata())
    nonblack = sum(1 for red, green, blue in pixels if max(red, green, blue) > 10) / len(pixels)
    bright = sum(1 for red, green, blue in pixels if max(red, green, blue) > 50) / len(pixels)
    return tuple(stat.mean), nonblack, bright


def main() -> int:
    failures: list[str] = []
    for city in CITIES:
        path = ARTIFACTS / f"unreal-road-only-{city}-rendertarget.png"
        if not path.exists():
            failures.append(f"missing {path}")
            continue
        mean, nonblack, bright = image_metrics(path)
        mean_value = sum(mean) / 3
        print(
            f"ROAD_PROOF_VISIBILITY city={city} mean={mean_value:.2f} "
            f"nonblack_gt10={nonblack:.3f} bright_gt50={bright:.3f} path={path}"
        )
        if mean_value < MIN_MEAN:
            failures.append(f"{city}: mean {mean_value:.2f} < {MIN_MEAN}")
        if nonblack < MIN_NONBLACK:
            failures.append(f"{city}: nonblack {nonblack:.3f} < {MIN_NONBLACK}")
        if bright < MIN_BRIGHT:
            failures.append(f"{city}: bright {bright:.3f} < {MIN_BRIGHT}")
    if failures:
        print("ROAD_PROOF_VISIBILITY_FAIL")
        for failure in failures:
            print(f"- {failure}")
        return 1
    print("ROAD_PROOF_VISIBILITY_PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
