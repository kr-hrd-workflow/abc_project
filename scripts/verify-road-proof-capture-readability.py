#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PROOFS = [
    ROOT / "artifacts" / "unreal-road-only-paris-lit-oblique.png",
]

MIN_MEAN = 45.0
MIN_STDDEV = 30.0
MIN_MAX_CHANNEL = 180
MIN_COLORED_RATIO = 0.02
MAX_TOP_NEAR_BLACK_RATIO = 0.085


def colored_pixel_ratio(image: Image.Image) -> float:
    rgb = image.convert("RGB")
    total = rgb.width * rgb.height
    if total == 0:
        return 0.0
    colored = 0
    pixels = rgb.tobytes()
    for index in range(0, len(pixels), 3):
        r, g, b = pixels[index], pixels[index + 1], pixels[index + 2]
        channel_delta = max(abs(r - g), abs(r - b), abs(g - b))
        if channel_delta >= 25 and max(r, g, b) >= 35:
            colored += 1
    return colored / total


def top_near_black_ratio(image: Image.Image) -> float:
    rgb = image.convert("RGB")
    crop = rgb.crop((0, 0, rgb.width, max(1, int(rgb.height * 0.35))))
    total = crop.width * crop.height
    if total == 0:
        return 0.0
    pixels = crop.tobytes()
    near_black = 0
    for index in range(0, len(pixels), 3):
        if max(pixels[index], pixels[index + 1], pixels[index + 2]) < 18:
            near_black += 1
    return near_black / total


def inspect(path: Path) -> list[str]:
    if not path.exists():
        return [f"{path}: missing"]

    image = Image.open(path).convert("RGB")
    stat = ImageStat.Stat(image)
    mean = sum(stat.mean) / 3.0
    stddev = sum(stat.stddev) / 3.0
    max_channel = max(channel_max for _, channel_max in image.getextrema())
    color_ratio = colored_pixel_ratio(image)
    top_black = top_near_black_ratio(image)

    failures = []
    if mean < MIN_MEAN:
        failures.append(f"mean {mean:.2f} < {MIN_MEAN:.2f}")
    if stddev < MIN_STDDEV:
        failures.append(f"stddev {stddev:.2f} < {MIN_STDDEV:.2f}")
    if max_channel < MIN_MAX_CHANNEL:
        failures.append(f"max_channel {max_channel} < {MIN_MAX_CHANNEL}")
    if color_ratio < MIN_COLORED_RATIO:
        failures.append(f"colored_ratio {color_ratio:.4f} < {MIN_COLORED_RATIO:.4f}")
    if top_black > MAX_TOP_NEAR_BLACK_RATIO:
        failures.append(f"top_near_black_ratio {top_black:.4f} > {MAX_TOP_NEAR_BLACK_RATIO:.4f}")

    if failures:
        return [f"{path}: FAIL " + "; ".join(failures)]
    return [
        f"{path}: PASS mean={mean:.2f} stddev={stddev:.2f} "
        f"max_channel={max_channel} colored_ratio={color_ratio:.4f} "
        f"top_near_black_ratio={top_black:.4f}"
    ]


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify road-only Unreal proof captures are visually readable.")
    parser.add_argument("proof", nargs="*", type=Path, default=DEFAULT_PROOFS)
    args = parser.parse_args()

    failed = False
    for proof in args.proof:
        messages = inspect(proof)
        for message in messages:
            print(message)
        failed = failed or any(": FAIL " in message or message.endswith(": missing") for message in messages)
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
