"""Build the "Undici Display" webfont from the Undici glyph atlas.

The Undici project harvested a per-letter atlas of PNG silhouettes out of its
shipped club wordmarks (pipeline/undici/teamgfx.py :: build_atlas) — a heavy
condensed athletic grotesk, one flat colour, hard alpha edge. This turns that
raster atlas into a real vector font so the same letterforms can set titles
here as live, selectable, resizable text.

    python scripts/build-undici-font.py

Writes public/fonts/undici-display.woff2 (+ .ttf for reference) and a proof
sheet in the scratch dir.

The atlas is uppercase A-Z only, and it has no X — no shipped wordmark
contained one. X is constructed here from the face's own diagonal weight,
following the same precedent teamgfx.py set when it derived F from E, J from
U and Z from E. Digits and punctuation are deliberately absent: they fall
through to Anton in the CSS stack, which is the same genre of face.
"""

import json
import os
import sys

from PIL import Image, ImageDraw
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

ATLAS = r"C:\Users\johnf\Desktop\Undici\pipeline\undici\glyph-atlas"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "public", "fonts")

UPEM = 1000
# Cap height and vertical metrics are matched to Anton (cap 1760 / upem 2048),
# which sets digits and punctuation in the same stack — the two faces have to
# share a baseline and a cap line or mixed strings like "2026-27 SEASON" step.
CAP = 859
ASCENT, DESCENT = 1176, -329
SPACE = 260

UPSAMPLE = 4      # trace at 4x so the alpha staircase lands under a font unit
EPSILON = 1.6     # Douglas-Peucker tolerance, in upsampled pixels (~0.4 source px)


# ── contour tracing ──────────────────────────────────────────────────────────


def trace(mask, w, h):
    """Closed boundary loops of a binary mask, walked along pixel edges.

    Each filled cell contributes the edges it does not share with another
    filled cell, wound so that filled area stays on one consistent side; holes
    therefore come out wound opposite their outer contour, which is exactly
    what the non-zero fill rule wants.
    """
    edges = {}

    def add(a, b):
        edges.setdefault(a, []).append(b)

    for y in range(h):
        row = y * w
        for x in range(w):
            if not mask[row + x]:
                continue
            if y == 0 or not mask[row - w + x]:
                add((x, y), (x + 1, y))
            if x == w - 1 or not mask[row + x + 1]:
                add((x + 1, y), (x + 1, y + 1))
            if y == h - 1 or not mask[row + w + x]:
                add((x + 1, y + 1), (x, y + 1))
            if x == 0 or not mask[row + x - 1]:
                add((x, y + 1), (x, y))

    loops = []
    while edges:
        start = next(iter(edges))
        loop = [start]
        cur, prev = start, None
        while True:
            outs = edges.get(cur)
            if not outs:
                break
            if len(outs) == 1 or prev is None:
                nxt = outs.pop(0)
            else:
                # Diagonal pinch: two loops meet at this vertex. Keep going as
                # straight as possible, then prefer the sharpest right turn —
                # that keeps diagonally-touching strokes joined rather than
                # letting the walk cut the corner into the wrong region.
                din = (cur[0] - prev[0], cur[1] - prev[1])
                def turn(n):
                    d = (n[0] - cur[0], n[1] - cur[1])
                    cross = din[0] * d[1] - din[1] * d[0]
                    dot = din[0] * d[0] + din[1] * d[1]
                    return (0 if dot > 0 else 1, cross)
                nxt = min(outs, key=turn)
                outs.remove(nxt)
            if not edges[cur]:
                del edges[cur]
            prev, cur = cur, nxt
            if cur == start:
                break
            loop.append(cur)
        if len(loop) >= 3:
            loops.append(loop)
    return loops


def drop_collinear(pts):
    out = []
    n = len(pts)
    for i in range(n):
        a, b, c = pts[i - 1], pts[i], pts[(i + 1) % n]
        if (b[0] - a[0]) * (c[1] - a[1]) != (b[1] - a[1]) * (c[0] - a[0]):
            out.append(b)
    return out or pts


def simplify(pts, eps):
    """Douglas-Peucker on a closed loop, anchored at two far-apart points."""
    pts = drop_collinear(pts)
    if len(pts) < 8:
        return pts
    # Anchor on the loop's extreme point and its antipode so the split never
    # starts on a straight run and quietly shave a real corner.
    i0 = min(range(len(pts)), key=lambda i: (pts[i][1], pts[i][0]))
    pts = pts[i0:] + pts[:i0]
    i1 = len(pts) // 2

    def run(seq, offset, keep):
        stack = [(0, len(seq) - 1)]
        while stack:
            lo, hi = stack.pop()
            if hi - lo < 2:
                continue
            ax, ay = seq[lo]
            bx, by = seq[hi]
            dx, dy = bx - ax, by - ay
            norm = (dx * dx + dy * dy) ** 0.5
            worst, at = -1.0, lo
            for i in range(lo + 1, hi):
                px, py = seq[i]
                if norm == 0:
                    d = ((px - ax) ** 2 + (py - ay) ** 2) ** 0.5
                else:
                    d = abs(dx * (ay - py) - (ax - px) * dy) / norm
                if d > worst:
                    worst, at = d, i
            if worst > eps:
                keep.add(offset + at)
                stack.append((lo, at))
                stack.append((at, hi))

    # Both chain ends have to be seeded, the last vertex included: it anchors
    # the closing edge back to pts[0], and dropping it lets the loop shortcut
    # straight across the letter.
    keep = {0, i1, len(pts) - 1}
    run(pts[: i1 + 1], 0, keep)
    run(pts[i1:], i1, keep)
    return [pts[i] for i in sorted(keep)]


def signed_area(pts):
    a = 0.0
    for i in range(len(pts)):
        x0, y0 = pts[i]
        x1, y1 = pts[(i + 1) % len(pts)]
        a += x0 * y1 - x1 * y0
    return a / 2.0


# ── atlas -> outlines ────────────────────────────────────────────────────────


def synthesize_x(glyphs):
    """No shipped wordmark had an X. Build one from the face's own diagonal.

    V's arms give the horizontal stroke run and the flat horizontal terminals;
    two of those crossing corner-to-corner is the letter, at the same weight
    everything else is drawn at.
    """
    v = glyphs["V"]
    a = v.getchannel("A").load()
    mid = v.height // 2
    run = [x for x in range(v.width) if a[x, mid] > 128]
    breaks = [i for i in range(1, len(run)) if run[i] != run[i - 1] + 1]
    t = (breaks[0] if breaks else len(run))  # thickness of one diagonal arm

    h = v.height
    w = int(round(v.width * 0.97))
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    fill = (246, 246, 246, 255)
    d.polygon([(0, 0), (t, 0), (w, h), (w - t, h)], fill=fill)
    d.polygon([(w, 0), (w - t, 0), (0, h), (t, h)], fill=fill)
    return img


def outlines(img):
    """Vector contours for one glyph PNG, in font units with y up."""
    w, h = img.width * UPSAMPLE, img.height * UPSAMPLE
    a = img.getchannel("A").resize((w, h), Image.BICUBIC)
    mask = bytes(1 if p > 128 else 0 for p in a.tobytes())

    scale = CAP / (img.height * UPSAMPLE)
    contours = []
    for loop in trace(mask, w, h):
        pts = simplify(loop, EPSILON)
        if len(pts) < 3:
            continue
        contours.append([(round(x * scale), round((h - y) * scale)) for x, y in pts])

    if not contours:
        return []
    # TrueType wants outer contours clockwise with y up (negative shoelace).
    outer = max(contours, key=lambda c: abs(signed_area(c)))
    if signed_area(outer) > 0:
        contours = [c[::-1] for c in contours]
    return contours


def main():
    if not os.path.isdir(ATLAS):
        sys.exit(f"glyph atlas not found: {ATLAS}")

    with open(os.path.join(ATLAS, "metrics.json")) as f:
        metrics = json.load(f)
    band = metrics["bottom"] - metrics["top"]
    side = round(metrics["gap"] / 2 / band * CAP)

    glyphs = {}
    for ch in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
        p = os.path.join(ATLAS, f"{ch}.png")
        if os.path.exists(p):
            glyphs[ch] = Image.open(p).convert("RGBA")
    missing = [c for c in "ABCDEFGHIJKLMNOPQRSTUVWXYZ" if c not in glyphs]
    if missing == ["X"]:
        glyphs["X"] = synthesize_x(glyphs)
        print("synthesized X from V's diagonal weight")
    elif missing:
        sys.exit(f"atlas is missing {', '.join(missing)} — only X can be synthesized")

    order = [".notdef", "space"] + list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    pen_glyphs, widths, points = {}, {}, 0

    pen = TTGlyphPen(None)
    pen_glyphs[".notdef"] = pen.glyph()
    widths[".notdef"] = SPACE
    pen = TTGlyphPen(None)
    pen_glyphs["space"] = pen.glyph()
    widths["space"] = SPACE

    for ch in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
        cs = outlines(glyphs[ch])
        pen = TTGlyphPen(None)
        for c in cs:
            pen.moveTo((c[0][0] + side, c[0][1]))
            for x, y in c[1:]:
                pen.lineTo((x + side, y))
            pen.closePath()
        pen_glyphs[ch] = pen.glyph()
        adv = round(glyphs[ch].width * CAP / glyphs[ch].height) + side * 2
        widths[ch] = adv
        points += sum(len(c) for c in cs)

    print(f"traced 26 glyphs, {points} points, side bearing {side}")

    fb = FontBuilder(UPEM, isTTF=True)
    fb.setupGlyphOrder(order)
    # Lower case maps to the same caps: the face has no lower case, and folding
    # it in the cmap means mixed-case copy survives round-trips.
    cmap = {0x20: "space"}
    for ch in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
        cmap[ord(ch)] = ch
        cmap[ord(ch.lower())] = ch
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(pen_glyphs)
    fb.setupHorizontalMetrics({g: (widths[g], 0) for g in order})
    fb.setupHorizontalHeader(ascent=ASCENT, descent=DESCENT, lineGap=0)
    fb.setupNameTable({
        "familyName": "Undici Display",
        "styleName": "Regular",
        "psName": "UndiciDisplay-Regular",
        "version": "1.000",
        "uniqueFontIdentifier": "UndiciDisplay-Regular;1.000",
        "manufacturer": "Traced from the Undici wordmark glyph atlas",
    })
    fb.setupOS2(sTypoAscender=ASCENT, sTypoDescender=DESCENT, sTypoLineGap=0,
                usWinAscent=ASCENT, usWinDescent=-DESCENT,
                sCapHeight=CAP, sxHeight=CAP, achVendID="UNDC",
                fsSelection=0x0040, usWeightClass=800, usWidthClass=3)
    fb.setupPost()

    os.makedirs(OUT, exist_ok=True)
    ttf = os.path.join(OUT, "undici-display.ttf")
    fb.save(ttf)
    fb.font.flavor = "woff2"
    woff2 = os.path.join(OUT, "undici-display.woff2")
    fb.save(woff2)
    print(f"wrote {woff2} ({os.path.getsize(woff2):,} bytes)")
    print(f"wrote {ttf} ({os.path.getsize(ttf):,} bytes)")


if __name__ == "__main__":
    main()
