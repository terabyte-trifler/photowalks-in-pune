"""
Photowalks in Pune — placeholder image generator.

Generates clearly-marked tonal stand-ins so the layout can be judged before real
community photographs exist. Every file it writes is a placeholder. Delete the
whole folder and drop real photographs in with the same filenames to replace.
"""
import os, math, random
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageEnhance

OUT = "public/images"
PREVIEW = "/tmp/preview-assets"
os.makedirs(OUT, exist_ok=True)
os.makedirs(PREVIEW, exist_ok=True)

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

# Warm photographic tonal ranges — shadows to highlights, kept muted.
PALETTES = [
    ((28, 24, 20), (196, 184, 168)),
    ((34, 32, 30), (172, 162, 150)),
    ((22, 22, 24), (204, 192, 174)),
    ((40, 33, 26), (186, 170, 148)),
    ((26, 28, 28), (160, 158, 152)),
    ((44, 36, 28), (208, 194, 172)),
]


def base_gradient(w, h, lo, hi, angle):
    img = Image.new("RGB", (w, h))
    px = img.load()
    ca, sa = math.cos(angle), math.sin(angle)
    denom = abs(w * ca) + abs(h * sa) or 1
    for y in range(h):
        for x in range(0, w, 2):
            t = ((x * ca + y * sa) / denom + 1) / 2
            t = min(1.0, max(0.0, t))
            c = tuple(int(lo[i] + (hi[i] - lo[i]) * t) for i in range(3))
            px[x, y] = c
            if x + 1 < w:
                px[x + 1, y] = c
    return img


def compose(seed, w, h):
    rnd = random.Random(seed)
    lo, hi = PALETTES[seed % len(PALETTES)]
    img = base_gradient(w, h, lo, hi, rnd.uniform(0.2, 1.4))
    d = ImageDraw.Draw(img, "RGBA")

    # Soft architectural bands — verticals read as buildings/doorways/light shafts.
    for _ in range(rnd.randint(3, 6)):
        bw = rnd.randint(w // 14, w // 4)
        x0 = rnd.randint(-bw // 2, w)
        shade = rnd.randint(-46, 46)
        d.rectangle([x0, rnd.randint(-h // 4, h // 3), x0 + bw, h + 10],
                    fill=(max(0, min(255, 128 + shade)),) * 3 + (rnd.randint(28, 64),))

    # One horizon / ground line for depth.
    hy = int(h * rnd.uniform(0.55, 0.78))
    d.rectangle([0, hy, w, h], fill=(18, 16, 14, rnd.randint(70, 115)))

    # A soft light source.
    lx, ly = rnd.randint(0, w), rnd.randint(0, int(h * 0.5))
    r = int(max(w, h) * rnd.uniform(0.25, 0.5))
    d.ellipse([lx - r, ly - r, lx + r, ly + r], fill=(255, 244, 228, 30))

    img = img.filter(ImageFilter.GaussianBlur(radius=max(w, h) / 90))

    # Vignette.
    vig = Image.new("L", (w, h), 0)
    ImageDraw.Draw(vig).ellipse(
        [-w * 0.25, -h * 0.25, w * 1.25, h * 1.25], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(radius=max(w, h) / 12))
    img = Image.composite(img, Image.new("RGB", (w, h), (14, 12, 10)), vig)

    # Grain.
    grain = Image.effect_noise((w, h), 16).convert("L")
    img = Image.blend(img, Image.merge("RGB", (grain, grain, grain)), 0.055)

    img = ImageEnhance.Color(img).enhance(0.5)
    img = ImageEnhance.Contrast(img).enhance(1.28)

    # Honest label — this is not a photograph.
    d2 = ImageDraw.Draw(img, "RGBA")
    size = max(9, int(w / 78))
    try:
        f = ImageFont.truetype(FONT, size)
    except OSError:
        f = ImageFont.load_default()
    pad = int(w / 34)
    d2.text((pad, h - pad - size), "PLACEHOLDER — REPLACE WITH A REAL PHOTOGRAPH",
            font=f, fill=(255, 250, 244, 92))
    return img


SPECS = [
    ("hero/pune-hero", 2400, 1500),
    ("walks/old-pune", 1800, 1200),
    ("stories/before-the-city-wakes", 1800, 1012),
    ("walks/monsoon", 1200, 800),
    ("walks/mandai", 1200, 800),
    ("walks/river", 1200, 800),
    ("gallery/photo-01", 1200, 1500), ("gallery/photo-02", 1400, 933),
    ("gallery/photo-03", 1200, 1200), ("gallery/photo-04", 1200, 1500),
    ("gallery/photo-05", 1400, 933),  ("gallery/photo-06", 1200, 1200),
    ("gallery/photo-07", 1400, 933),  ("gallery/photo-08", 1200, 1500),
    ("gallery/photo-09", 1200, 1200),
    ("instagram/post-01", 900, 900), ("instagram/post-02", 900, 900),
    ("instagram/post-03", 900, 900), ("instagram/post-04", 900, 900),
    ("instagram/post-05", 900, 900), ("instagram/post-06", 900, 900),
]

for i, (name, w, h) in enumerate(SPECS):
    img = compose(i * 7 + 3, w, h)
    os.makedirs(os.path.dirname(f"{OUT}/{name}.jpg"), exist_ok=True)
    img.save(f"{OUT}/{name}.jpg", "JPEG", quality=78, optimize=True, progressive=True)
    # Smaller twin for the single-file HTML preview.
    scale = min(1.0, 1100 / max(w, h))
    small = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    os.makedirs(os.path.dirname(f"{PREVIEW}/{name}.jpg"), exist_ok=True)
    small.save(f"{PREVIEW}/{name}.jpg", "JPEG", quality=62, optimize=True)
    print(name, os.path.getsize(f"{OUT}/{name}.jpg") // 1024, "KB /",
          os.path.getsize(f"{PREVIEW}/{name}.jpg") // 1024, "KB")
