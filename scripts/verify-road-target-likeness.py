#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TARGET = ROOT / "docs" / "references" / "assets" / "london-photoreal-final-target.png"
DEFAULT_PROOF = ROOT / "artifacts" / "unreal-road-only-london-current-lit-oblique.png"

MAX_NEAR_BLACK_RATIO = 0.30
MAX_DEEP_SHADOW_RATIO = 0.38
MAX_NEAR_BLACK_OVER_TARGET = 0.26
MIN_TARGET_MEAN_FACTOR = 0.72
MAX_BRIGHT_RATIO = 0.035


def image_metrics(path: Path) -> dict[str, float]:
    if not path.exists():
        raise FileNotFoundError(path)

    image = Image.open(path).convert("RGB")
    pixels = image.tobytes()
    total = image.width * image.height
    near_black = 0
    deep_shadow = 0
    bright = 0
    red_yellow = 0

    for index in range(0, len(pixels), 3):
        red = pixels[index]
        green = pixels[index + 1]
        blue = pixels[index + 2]
        channel_max = max(red, green, blue)
        if channel_max < 18:
            near_black += 1
        if channel_max < 35:
            deep_shadow += 1
        if channel_max > 235:
            bright += 1
        if (red > 120 and red > green * 1.5 and red > blue * 1.5) or (
            red > 150 and green > 110 and blue < 80
        ):
            red_yellow += 1

    stat = ImageStat.Stat(image)
    mean = sum(stat.mean) / 3.0
    stddev = sum(stat.stddev) / 3.0

    return {
        "mean": mean,
        "stddev": stddev,
        "near_black_ratio": near_black / total,
        "deep_shadow_ratio": deep_shadow / total,
        "bright_ratio": bright / total,
        "red_yellow_ratio": red_yellow / total,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Compare a UE London proof against the approved wet-road target image."
    )
    parser.add_argument("--target", type=Path, default=DEFAULT_TARGET)
    parser.add_argument("--proof", type=Path, default=DEFAULT_PROOF)
    args = parser.parse_args()

    target = image_metrics(args.target)
    proof = image_metrics(args.proof)
    failures: list[str] = []

    if proof["near_black_ratio"] > MAX_NEAR_BLACK_RATIO:
        failures.append(
            "near_black_ratio "
            f"{proof['near_black_ratio']:.4f} > {MAX_NEAR_BLACK_RATIO:.4f}"
        )
    if proof["deep_shadow_ratio"] > MAX_DEEP_SHADOW_RATIO:
        failures.append(
            "deep_shadow_ratio "
            f"{proof['deep_shadow_ratio']:.4f} > {MAX_DEEP_SHADOW_RATIO:.4f}"
        )
    excess_near_black = proof["near_black_ratio"] - target["near_black_ratio"]
    if excess_near_black > MAX_NEAR_BLACK_OVER_TARGET:
        failures.append(
            "near_black_over_target "
            f"{excess_near_black:.4f} > {MAX_NEAR_BLACK_OVER_TARGET:.4f}"
        )
    min_mean = target["mean"] * MIN_TARGET_MEAN_FACTOR
    if proof["mean"] < min_mean:
        failures.append(f"mean {proof['mean']:.2f} < {min_mean:.2f}")
    if proof["bright_ratio"] > MAX_BRIGHT_RATIO:
        failures.append(
            f"bright_ratio {proof['bright_ratio']:.4f} > {MAX_BRIGHT_RATIO:.4f}"
        )

    summary = (
        f"target_mean={target['mean']:.2f} proof_mean={proof['mean']:.2f} "
        f"target_near_black={target['near_black_ratio']:.4f} "
        f"proof_near_black={proof['near_black_ratio']:.4f} "
        f"proof_deep_shadow={proof['deep_shadow_ratio']:.4f} "
        f"proof_bright={proof['bright_ratio']:.4f} "
        f"proof_red_yellow={proof['red_yellow_ratio']:.4f}"
    )

    if failures:
        print("ROAD_TARGET_LIKENESS_FAIL " + "; ".join(failures))
        print(summary)
        return 1

    print("ROAD_TARGET_LIKENESS_PASS " + summary)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
