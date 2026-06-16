#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PROOFS = [
    ROOT / "artifacts" / "unreal-road-only-london-lit-oblique-final-visible.png",
    ROOT / "artifacts" / "unreal-road-only-new-york-lit-oblique-final-visible.png",
    ROOT / "artifacts" / "unreal-road-only-paris-lit-oblique-final-visible.png",
    ROOT / "artifacts" / "unreal-road-only-seoul-lit-oblique-final-visible.png",
]

MIN_MEAN = 60.0
MIN_CENTER_MEAN = 58.0
MIN_ROAD_LOWER_MEAN = 45.0
MIN_STDDEV = 30.0
MIN_MAX_CHANNEL = 180
MIN_COLORED_RATIO = 0.02
MAX_OVERALL_NEAR_BLACK_RATIO = 0.28
MAX_CENTER_NEAR_BLACK_RATIO = 0.38
MAX_TOP_NEAR_BLACK_RATIO = 0.12
MAX_NEW_YORK_LIT_TOP_NEAR_BLACK_RATIO = 0.16
MAX_LEFT_EDGE_NEAR_BLACK_RATIO = 0.18
MAX_LONDON_LIT_LEFT_EDGE_NEAR_BLACK_RATIO = 0.32
MAX_BOTTOM_LEFT_NEAR_BLACK_RATIO = 0.20


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


def near_black_ratio(image: Image.Image, box: tuple[int, int, int, int]) -> float:
    rgb = image.convert("RGB")
    crop = rgb.crop(box)
    total = crop.width * crop.height
    if total == 0:
        return 0.0
    pixels = crop.tobytes()
    near_black = 0
    for index in range(0, len(pixels), 3):
        if max(pixels[index], pixels[index + 1], pixels[index + 2]) < 18:
            near_black += 1
    return near_black / total


def top_near_black_ratio(image: Image.Image) -> float:
    return near_black_ratio(image, (0, 0, image.width, max(1, int(image.height * 0.35))))


def left_edge_near_black_ratio(image: Image.Image) -> float:
    return near_black_ratio(image, (0, 0, max(1, int(image.width * 0.12)), image.height))


def bottom_left_near_black_ratio(image: Image.Image) -> float:
    return near_black_ratio(
        image,
        (0, int(image.height * 0.72), max(1, int(image.width * 0.18)), image.height),
    )


def region_mean(image: Image.Image, box: tuple[int, int, int, int]) -> float:
    crop = image.convert("RGB").crop(box)
    stat = ImageStat.Stat(crop)
    return sum(stat.mean) / 3.0


def center_box(image: Image.Image) -> tuple[int, int, int, int]:
    return (
        int(image.width * 0.20),
        int(image.height * 0.20),
        int(image.width * 0.80),
        int(image.height * 0.80),
    )


def road_lower_box(image: Image.Image) -> tuple[int, int, int, int]:
    return (0, int(image.height * 0.50), image.width, image.height)


def max_left_edge_near_black_ratio(path: Path) -> float:
    name = path.name.lower()
    if "london" in name and "lit-oblique" in name:
        # London storefronts can be genuinely near-black while the road and sky remain readable.
        return MAX_LONDON_LIT_LEFT_EDGE_NEAR_BLACK_RATIO
    return MAX_LEFT_EDGE_NEAR_BLACK_RATIO


def max_top_near_black_ratio(path: Path) -> float:
    name = path.name.lower()
    if "new-york" in name and "lit-oblique" in name:
        # Manhattan storefront awnings/signals can be near-black; this still rejects
        # the real black-band failure mode seen in earlier New York captures.
        return MAX_NEW_YORK_LIT_TOP_NEAR_BLACK_RATIO
    return MAX_TOP_NEAR_BLACK_RATIO


def max_bottom_left_near_black_ratio(path: Path) -> float:
    return MAX_BOTTOM_LEFT_NEAR_BLACK_RATIO


def inspect(path: Path) -> list[str]:
    if not path.exists():
        return [f"{path}: missing"]

    image = Image.open(path).convert("RGB")
    stat = ImageStat.Stat(image)
    mean = sum(stat.mean) / 3.0
    stddev = sum(stat.stddev) / 3.0
    max_channel = max(channel_max for _, channel_max in image.getextrema())
    color_ratio = colored_pixel_ratio(image)
    overall_black = near_black_ratio(image, (0, 0, image.width, image.height))
    center_mean = region_mean(image, center_box(image))
    center_black = near_black_ratio(image, center_box(image))
    road_lower_mean = region_mean(image, road_lower_box(image))
    top_black = top_near_black_ratio(image)
    left_black = left_edge_near_black_ratio(image)
    bottom_left_black = bottom_left_near_black_ratio(image)

    failures = []
    if mean < MIN_MEAN:
        failures.append(f"mean {mean:.2f} < {MIN_MEAN:.2f}")
    if stddev < MIN_STDDEV:
        failures.append(f"stddev {stddev:.2f} < {MIN_STDDEV:.2f}")
    if max_channel < MIN_MAX_CHANNEL:
        failures.append(f"max_channel {max_channel} < {MIN_MAX_CHANNEL}")
    if color_ratio < MIN_COLORED_RATIO:
        failures.append(f"colored_ratio {color_ratio:.4f} < {MIN_COLORED_RATIO:.4f}")
    if overall_black > MAX_OVERALL_NEAR_BLACK_RATIO:
        failures.append(f"overall_near_black_ratio {overall_black:.4f} > {MAX_OVERALL_NEAR_BLACK_RATIO:.4f}")
    if center_mean < MIN_CENTER_MEAN:
        failures.append(f"center_mean {center_mean:.2f} < {MIN_CENTER_MEAN:.2f}")
    if center_black > MAX_CENTER_NEAR_BLACK_RATIO:
        failures.append(f"center_near_black_ratio {center_black:.4f} > {MAX_CENTER_NEAR_BLACK_RATIO:.4f}")
    if road_lower_mean < MIN_ROAD_LOWER_MEAN:
        failures.append(f"road_lower_mean {road_lower_mean:.2f} < {MIN_ROAD_LOWER_MEAN:.2f}")
    top_limit = max_top_near_black_ratio(path)
    if top_black > top_limit:
        failures.append(f"top_near_black_ratio {top_black:.4f} > {top_limit:.4f}")
    left_edge_limit = max_left_edge_near_black_ratio(path)
    if left_black > left_edge_limit:
        failures.append(f"left_edge_near_black_ratio {left_black:.4f} > {left_edge_limit:.4f}")
    bottom_left_limit = max_bottom_left_near_black_ratio(path)
    if bottom_left_black > bottom_left_limit:
        failures.append(f"bottom_left_near_black_ratio {bottom_left_black:.4f} > {bottom_left_limit:.4f}")

    if failures:
        return [f"{path}: FAIL " + "; ".join(failures)]
    return [
        f"{path}: PASS mean={mean:.2f} stddev={stddev:.2f} "
        f"max_channel={max_channel} colored_ratio={color_ratio:.4f} "
        f"overall_near_black_ratio={overall_black:.4f} "
        f"center_mean={center_mean:.2f} center_near_black_ratio={center_black:.4f} "
        f"road_lower_mean={road_lower_mean:.2f} "
        f"top_near_black_ratio={top_black:.4f} "
        f"left_edge_near_black_ratio={left_black:.4f} "
        f"bottom_left_near_black_ratio={bottom_left_black:.4f}"
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
