#!/usr/bin/env python3
"""
Atlas Icon Processor
--------------------
1. Checks each source PNG in public/assets/ for black backgrounds
2. Removes black backgrounds (converts near-black pixels to transparent)
3. Generates 4 size variants: lg (120x120), md (64x64), sm (32x32), xs (24x24)

Usage:
    pip install Pillow
    python process-icons.py

Place source PNGs as ui-[name].png in public/assets/ before running.
"""

import os
from pathlib import Path
from PIL import Image
import numpy as np

ASSETS_DIR = Path(__file__).parent / "public" / "assets"
BLACK_THRESHOLD = 30  # pixels with all RGB channels <= this are treated as background

SIZES = {
    "lg": (120, 120),
    "md": (64, 64),
    "sm": (32, 32),
    "xs": (24, 24),
}

# All new Batch 2 icons to process (source files = ui-[name].png)
BATCH2_ICONS = [
    "ui-globe-asia",
    "ui-globe-americas",
    "ui-globe-meridian",
    "ui-castle",
    "ui-classical-building",
    "ui-island",
    "ui-lion",
    "ui-tiger",
    "ui-whale",
    "ui-kangaroo",
    "ui-drum",
    "ui-giraffe",
    "ui-diamond",
    "ui-leaves",
    "ui-pagoda",
    "ui-statue-liberty",
    "ui-parrot",
    "ui-ice",
    "ui-magnifying-glass",
    "ui-mountain",
    "ui-desert",
    "ui-tree",
    "ui-snowflake",
    "ui-camel",
    "ui-mosque",
    "ui-medal",
    "ui-scroll",
    "ui-music-notes",
    "ui-soccer",
    "ui-chocolate",
    "ui-crown",
    "ui-seedling",
    "ui-writing-hand",
    "ui-crystal-ball",
    "ui-eyes",
    "ui-country-shape",
    "ui-landscape",
    "ui-wave",
    "ui-rocket",
    "ui-polar-bear",
    "ui-volcano",  # copy from theme-volcano.png if needed
]


def has_black_background(img: Image.Image) -> bool:
    """Check if image corners are solid black (no alpha or black alpha)."""
    rgba = img.convert("RGBA")
    w, h = rgba.size
    corners = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    for cx, cy in corners:
        r, g, b, a = rgba.getpixel((cx, cy))
        if a > 200 and r <= BLACK_THRESHOLD and g <= BLACK_THRESHOLD and b <= BLACK_THRESHOLD:
            return True
    return False


def remove_black_background(img: Image.Image, threshold: int = BLACK_THRESHOLD) -> Image.Image:
    """Convert near-black pixels to transparent."""
    rgba = img.convert("RGBA")
    data = np.array(rgba, dtype=np.int32)

    r, g, b, a = data[:, :, 0], data[:, :, 1], data[:, :, 2], data[:, :, 3]

    # Pixels where all channels are <= threshold are background
    is_black = (r <= threshold) & (g <= threshold) & (b <= threshold)

    # Also handle partial transparency: blend based on brightness
    brightness = (r.astype(np.float32) + g + b) / 3
    alpha_scale = np.clip(brightness / (threshold * 2), 0, 1)

    # Hard cut for very dark pixels, soft transition for mid-range
    new_alpha = np.where(is_black, 0, np.minimum(a, (alpha_scale * 255).astype(np.int32)))
    data[:, :, 3] = new_alpha.astype(np.uint8)

    return Image.fromarray(data.astype(np.uint8), "RGBA")


def process_icon(name: str) -> None:
    source_path = ASSETS_DIR / f"{name}.png"

    if not source_path.exists():
        print(f"  SKIP  {name}.png — source not found")
        return

    print(f"  Processing {name}.png...")
    img = Image.open(source_path)

    # Check and remove black background
    needs_bg_removal = not (img.mode == "RGBA" and not has_black_background(img))
    if needs_bg_removal and img.mode != "RGBA":
        print(f"    → No alpha channel detected, removing black background")
        img = remove_black_background(img)
    elif needs_bg_removal:
        print(f"    → Black background detected, removing")
        img = remove_black_background(img)
    else:
        img = img.convert("RGBA")
        print(f"    → Already has transparent background")

    # Save cleaned source back (overwrite)
    img.save(source_path, "PNG", optimize=True)

    # Generate size variants
    for suffix, size in SIZES.items():
        out_path = ASSETS_DIR / f"{name}-{suffix}.png"
        resized = img.resize(size, Image.LANCZOS)
        resized.save(out_path, "PNG", optimize=True)
        print(f"    → Saved {name}-{suffix}.png ({size[0]}x{size[1]})")


def main():
    print(f"Atlas Icon Processor")
    print(f"Assets dir: {ASSETS_DIR}")
    print()

    if not ASSETS_DIR.exists():
        print(f"ERROR: {ASSETS_DIR} does not exist. Run from the Atlas project root.")
        return

    processed = 0
    skipped = 0

    for name in BATCH2_ICONS:
        # Skip if all variants already exist
        all_exist = all((ASSETS_DIR / f"{name}-{s}.png").exists() for s in SIZES)
        if all_exist:
            print(f"  SKIP  {name} — all variants already exist")
            skipped += 1
            continue

        process_icon(name)
        processed += 1

    print()
    print(f"Done. Processed: {processed}, Skipped: {skipped}")
    print(f"Check public/assets/ for output files.")


if __name__ == "__main__":
    main()
