"""Trace her script lockup ("Caring For A Cause" over "SUPPORTIVE SERVICES")
into an SVG with the artwork's colours as gradients.

Source: the owner's artwork (2086 x 754 PNG, light lettering on a flat dark
background), passed as the only argument; like the other brand sources it is
not kept in the repo. Run from the repo root:
    python3 scripts/brand/trace-lockup.py path/to/lockup.png
Needs pillow, numpy and potracer.
"""
import sys

from PIL import Image
import numpy as np
import potrace

SRC = sys.argv[1]
OUT = "src/assets/brand/wordmark-lockup.svg"
SCALE = 2  # upscale before thresholding for smoother curves
THRESHOLD = 120  # brightest channel; above the glow, below the letter bodies
SPLIT = 470  # source row between the script and the capitals


def trace(mask, dy):
    path = potrace.Bitmap(np.logical_not(mask)).trace(
        turdsize=16,
        turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY,
        alphamax=1.0,
        opticurve=True,
        opttolerance=0.3,
    )
    f = lambda p: f"{p.x / SCALE:.0f} {(p.y / SCALE) + dy:.0f}"
    d = []
    for curve in path:
        d.append(f"M{f(curve.start_point)}")
        for seg in curve:
            if seg.is_corner:
                d.append(f"L{f(seg.c)}L{f(seg.end_point)}")
            else:
                d.append(f"C{f(seg.c1)} {f(seg.c2)} {f(seg.end_point)}")
        d.append("Z")
    return "".join(d)


im = Image.open(SRC).convert("RGB")
big = np.asarray(im.resize((im.width * SCALE, im.height * SCALE), Image.LANCZOS)).max(axis=2)
mask = big > THRESHOLD
cut = SPLIT * SCALE
script, caps = mask.copy(), mask.copy()
script[cut:] = False
caps[:cut] = False

ys, xs = np.nonzero(mask)
pad = 6
x0, y0 = xs.min() / SCALE - pad, ys.min() / SCALE - pad
w, h = (xs.max() - xs.min()) / SCALE + 2 * pad, (ys.max() - ys.min()) / SCALE + 2 * pad

# Colours sampled from the artwork: the script runs pale lavender at the top
# to violet and then magenta in its descenders; the capitals run lavender to
# magenta from left to right.
svg = (
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0:.1f} {y0:.1f} {w:.1f} {h:.1f}">'
    "<defs>"
    '<linearGradient id="wl-script" x1="0" y1="0" x2="0.12" y2="1">'
    '<stop offset="0" stop-color="#e2cbf5"/><stop offset="0.42" stop-color="#c99ef3"/>'
    '<stop offset="0.72" stop-color="#a973f2"/><stop offset="1" stop-color="#df5eed"/>'
    "</linearGradient>"
    '<linearGradient id="wl-caps" x1="0" y1="0" x2="1" y2="0">'
    '<stop offset="0" stop-color="#ab8eef"/><stop offset="0.55" stop-color="#b08cee"/>'
    '<stop offset="1" stop-color="#e86ceb"/>'
    "</linearGradient>"
    "</defs>"
    f'<path fill="url(#wl-script)" d="{trace(script, 0)}"/>'
    f'<path fill="url(#wl-caps)" d="{trace(caps, 0)}"/>'
    "</svg>"
)
open(OUT, "w").write(svg)
print(OUT, f"{len(svg) / 1024:.0f} KB", f"viewBox {x0:.0f} {y0:.0f} {w:.0f} {h:.0f}")
