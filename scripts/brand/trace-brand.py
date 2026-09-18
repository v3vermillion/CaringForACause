"""Trace the brand raster assets to clean flat-color SVGs, and crop the video poster."""
from PIL import Image, ImageFilter
import numpy as np
import potrace
from scipy import ndimage  # noqa: F401 (checked below)

BRAND = "/home/user/CaringForACause/src/assets/brand/"
UP = "/root/.claude/uploads/fb03bea1-537b-52fd-b587-ac775dc72b51/fdf5c5fb-image.png"


def trace_path(mask, turdsize=4, alphamax=1.0, opttolerance=0.2):
    bmp = potrace.Bitmap(np.logical_not(mask))  # potracer traces the False region
    path = bmp.trace(
        turdsize=turdsize,
        turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY,
        alphamax=alphamax,
        opticurve=True,
        opttolerance=opttolerance,
    )
    d = []
    for curve in path:
        sp = curve.start_point
        d.append(f"M{sp.x:.1f} {sp.y:.1f}")
        for seg in curve:
            if seg.is_corner:
                d.append(f"L{seg.c.x:.1f} {seg.c.y:.1f}L{seg.end_point.x:.1f} {seg.end_point.y:.1f}")
            else:
                d.append(
                    f"C{seg.c1.x:.1f} {seg.c1.y:.1f} {seg.c2.x:.1f} {seg.c2.y:.1f} {seg.end_point.x:.1f} {seg.end_point.y:.1f}"
                )
        d.append("Z")
    return "".join(d)


def svg(width, height, layers, view=None):
    vb = view or (0, 0, width, height)
    body = "".join(f'<path fill="{fill}" d="{d}"/>' for fill, d in layers)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb[0]} {vb[1]} {vb[2]} {vb[3]}" '
        f'width="{vb[2]}" height="{vb[3]}">{body}</svg>'
    )


# --- Wordmark -------------------------------------------------------------
im = Image.open(UP).convert("L")
# Upscale 2x before thresholding for smoother curves.
im = im.resize((im.width * 2, im.height * 2), Image.LANCZOS)
a = np.asarray(im)
mask = a < 170
ys, xs = np.nonzero(mask)
pad = 24
x0, x1, y0, y1 = xs.min() - pad, xs.max() + pad, ys.min() - pad, ys.max() + pad
d = trace_path(mask, turdsize=12, alphamax=1.0, opttolerance=0.3)
w, h = x1 - x0, y1 - y0
out = (
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0} {y0} {w} {h}" '
    f'role="img" aria-labelledby="wm-title"><title id="wm-title">Caring for a Cause</title>'
    f'<path fill="currentColor" d="{d}"/></svg>'
)
open(BRAND + "wordmark.svg", "w").write(out)
print("wordmark.svg", len(out), "bytes, viewBox", x0, y0, w, h, "ratio", round(w / h, 3))

# --- Heart-and-hands mark -------------------------------------------------
from scipy import ndimage

im = Image.open(BRAND + "logo-mark.png").convert("RGBA")
im = im.resize((im.width * 2, im.height * 2), Image.LANCZOS)
rgba = np.asarray(im).astype(int)
r, g, b, al = (rgba[..., i] for i in range(4))
opaque = al > 128
white = opaque & (r > 205) & (g > 195) & (b > 205)
red = opaque & (r > g + 50) & (r > b + 30)
purpleish = opaque & ~white & ~red
# The outer ring is the purple component touching the silhouette edge; the hands are the rest.
lab, n = ndimage.label(purpleish)
sizes = ndimage.sum(purpleish, lab, range(1, n + 1))
ring_label = int(np.argmax(sizes)) + 1
ring = lab == ring_label
hands = purpleish & ~ring
# Close tiny gaps from anti-aliasing.
hands = ndimage.binary_closing(hands, iterations=2)
red_fill = ndimage.binary_closing(red | hands | (white & ndimage.binary_dilation(red | hands, iterations=6)), iterations=3)
inner = ndimage.binary_fill_holes(red_fill)
print("mark components", n, "ring px", int(sizes.max()), "hands px", int(hands.sum()))

ys, xs = np.nonzero(opaque)
pad = 8
x0, x1, y0, y1 = xs.min() - pad, xs.max() + pad, ys.min() - pad, ys.max() + pad
layers = [
    ("#6008D7", trace_path(opaque, turdsize=20)),        # outer heart
    ("#BA010C", trace_path(inner, turdsize=20)),         # inner heart
    ("#F4EEFF", trace_path(ndimage.binary_dilation(white, iterations=1), turdsize=10)),  # keylines
    ("#8A5BFF", trace_path(hands, turdsize=20)),         # hands
]
# Put keylines under hands? No: keylines outline the hands, so draw hands first then keylines.
layers = [layers[0], layers[1], layers[3], layers[2]]
body = "".join(f'<path fill="{fill}" d="{d}"/>' for fill, d in layers)
w, h = x1 - x0, y1 - y0
out = (
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0} {y0} {w} {h}" role="img" '
    f'aria-labelledby="mk-title"><title id="mk-title">Caring for a Cause heart-and-hands mark</title>{body}</svg>'
)
open(BRAND + "mark.svg", "w").write(out)
print("mark.svg", len(out), "bytes, viewBox", x0, y0, w, h)

# Afterwards, reduce both files to integer coordinates (a quarter of the size, no
# visible change): npx svgo --multipass -p 0 src/assets/brand/*.svg

# Rasterize previews for review (cairosvg not present; use PIL by drawing? skip) -> Chromium will render.

# --- Video poster crop ----------------------------------------------------
p = Image.open("/home/user/CaringForACause/src/assets/photos/video-do-more-poster.jpg")
crop = p.crop((648, 0, 1280, 720))  # excludes the burned-in chyron, keeps Tamara whole
crop.save("/home/user/CaringForACause/src/assets/photos/tamara-portrait.jpg", quality=88, optimize=True)
print("poster crop", crop.size)
