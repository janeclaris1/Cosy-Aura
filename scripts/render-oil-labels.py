#!/usr/bin/env python3
"""Stamp CA logo + perfume name + brand onto the studio oil-bottle sticker."""

from __future__ import annotations

import os
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(ROOT, "public/images/fragrances/new/nano-banana-1005943.png")
LOGO = os.path.join(ROOT, "public/images/brand/ca-monogram.png")
OUT_DIR = os.path.join(ROOT, "public/images/fragrances/new")
FONT = "/System/Library/Fonts/HelveticaNeue.ttc"
INNER = (414, 534, 607, 776)
FILL = (238, 238, 238)
INK = (18, 18, 18)

# filename, name, brand
STICKERS: list[tuple[str, str, str]] = [
    ("oil-cool-water-women.png", "COOL WATER WOMEN", "DAVIDOFF"),
    ("oil-horizon.png", "HORIZON", "DAVIDOFF"),
    ("oil-hypnotic-poison.png", "HYPNOTIC POISON", "DIOR"),
    ("oil-miss-dior.png", "MISS DIOR", "DIOR"),
    ("oil-fahrenheit-32.png", "FAHRENHEIT -32", "DIOR"),
    ("oil-jadore.png", "J'ADORE", "DIOR"),
    ("oil-cherry-in-the-air.png", "CHERRY IN THE AIR", "ESCADA"),
    ("oil-escada-collection.png", "ESCADA COLLECTION", "ESCADA"),
    ("oil-gucci-flora.png", "FLORA", "GUCCI"),
    ("oil-terre-dhermes.png", "TERRE D'HERMÈS", "HERMÈS"),
    ("oil-boss-man.png", "BOSS MAN", "HUGO BOSS"),
    ("oil-tobacco-vanilla.png", "TOBACCO VANILLA", "TOM FORD"),
    ("oil-scandal-by-night.png", "SCANDAL BY NIGHT", "GAULTIER"),
    ("oil-jimmy-choo-intense.png", "INTENSE", "JIMMY CHOO"),
    ("oil-oud-satin-mood.png", "OUD SATIN MOOD", "MFK"),
    ("oil-polo-sport.png", "POLO SPORT", "RALPH LAUREN"),
    ("oil-la-vie-est-belle.png", "LA VIE EST BELLE", "LANCÔME"),
    ("oil-santal-33.png", "SANTAL 33", "LE LABO"),
    ("oil-ombre-nomade.png", "OMBRE NOMADE", "LOUIS VUITTON"),
    ("oil-red-tobacco.png", "RED TOBACCO", "MANCERA"),
    ("oil-afternoon-swim.png", "AFTERNOON SWIM", "LOUIS VUITTON"),
    ("oil-meteore.png", "MÉTÉORE", "LOUIS VUITTON"),
    ("oil-limmensite.png", "L'IMMENSITÉ", "LOUIS VUITTON"),
    ("oil-imagination.png", "IMAGINATION", "LOUIS VUITTON"),
    ("oil-decadence.png", "DECADENCE", "MARC JACOBS"),
    ("oil-olympea.png", "OLYMPÉA", "PACO RABANNE"),
    ("oil-polo-blue.png", "POLO BLUE", "RALPH LAUREN"),
    ("oil-sugar-baby.png", "SUGAR BABY", "COSY AURA"),
    ("oil-oud-wood.png", "OUD WOOD", "TOM FORD"),
    ("oil-aventus.png", "AVENTUS", "CREED"),
    ("oil-sauvage.png", "SAUVAGE", "DIOR"),
    ("oil-grey-vetiver.png", "GREY VETIVER", "TOM FORD"),
    ("oil-vanilla-sex.png", "VANILLA SEX", "TOM FORD"),
    ("oil-black-opium.png", "BLACK OPIUM", "YSL"),
    ("oil-coco-vanille.png", "COCO VANILLE", "MANCERA"),
    ("oil-love-spell.png", "LOVE SPELL", "VICTORIA'S SECRET"),
    ("oil-vs-intense.png", "INTENSE", "VICTORIA'S SECRET"),
    ("oil-coconut-passion-noir.png", "COCONUT PASSION NOIR", "VICTORIA'S SECRET"),
    ("oil-black-opium-over-red.png", "BLACK OPIUM OVER RED", "YSL"),
    ("oil-blue-talisman.png", "BLUE TALISMAN", "EX NIHILO"),
    ("oil-the-scent-elixir.png", "THE SCENT ELIXIR", "HUGO BOSS"),
    ("oil-goddess.png", "GODDESS", "BURBERRY"),
    ("oil-musk-blue-berry.png", "MUSK BLUE BERRY", "COSY AURA"),
    ("oil-oudgasm-vanilla-oud-36.png", "VANILLA OUD 36", "KAYALI"),
    ("oil-by-the-fireplace.png", "BY THE FIREPLACE", "MAISON MARGIELA"),
    ("oil-spell-on-you.png", "SPELL ON YOU", "LOUIS VUITTON"),
    ("oil-lveb-extrait.png", "L'EXTRAIT", "LANCÔME"),
    ("oil-bare-rose.png", "BARE ROSE", "VICTORIA'S SECRET"),
    ("oil-nina.png", "NINA", "NINA RICCI"),
    ("oil-guilty-elixir.png", "GUILTY ELIXIR", "GUCCI"),
    ("oil-aventus-absolu.png", "AVENTUS ABSOLU", "CREED"),
    ("oil-oud-maracuja.png", "OUD MARACUJA", "MAISON CRIVELLI"),
    ("oil-gold-immortals.png", "GOLD IMMORTALS", "EXTRAIT"),
    ("oil-rouh-al-oud.png", "ROUH AL OUD", "ASQ"),
    ("oil-colonia-intensa-oud.png", "COLONIA INTENSA OUD", "ACQUA DI PARMA"),
    ("oil-amouage-gold.png", "GOLD", "AMOUAGE"),
    ("oil-reflection.png", "REFLECTION", "AMOUAGE"),
    ("oil-tuscan-leather.png", "TUSCAN LEATHER", "TOM FORD"),
    ("oil-opus-v.png", "OPUS V", "AMOUAGE"),
    ("oil-interlude-black-iris.png", "INTERLUDE BLACK IRIS", "AMOUAGE"),
    ("oil-shay-oud.png", "SHAY OUD", "SHAY"),
    ("oil-boss-orange.png", "BOSS ORANGE", "HUGO BOSS"),
    ("oil-resala.png", "RESALA", "ARABIAN OUD"),
    ("oil-lamsa.png", "LAMSA", "ARABIAN OUD"),
    ("oil-vanilla.png", "VANILLA", "COSY AURA"),
    ("oil-swy-oud.png", "STRONGER WITH YOU OUD", "ARMANI"),
    ("oil-acqua-di-gio.png", "ACQUA DI GIO", "ARMANI"),
    ("oil-armani-code.png", "CODE", "ARMANI"),
    ("oil-si.png", "SÌ", "ARMANI"),
    ("oil-si-intense.png", "SÌ INTENSE", "ARMANI"),
    ("oil-vetiver-dhiver.png", "VETIVER D'HIVER", "ARMANI"),
    ("oil-ocean-di-gioia.png", "OCEAN DI GIOIA", "ARMANI"),
    ("oil-swy-absolutely.png", "STRONGER WITH YOU ABSOLUTELY", "ARMANI"),
    ("oil-oud-save-the-king.png", "OUD SAVE THE KING", "ATKINSONS"),
    ("oil-oud-save-the-queen.png", "OUD SAVE THE QUEEN", "ATKINSONS"),
    ("oil-the-most-wanted.png", "THE MOST WANTED", "AZZARO"),
    ("oil-visit.png", "VISIT", "AZZARO"),
    ("oil-pink-chiffon.png", "PINK CHIFFON", "VICTORIA'S SECRET"),
    ("oil-heat-seduction.png", "HEAT SEDUCTION", "BEYONCÉ"),
    ("oil-oud-immortel.png", "OUD IMMORTEL", "BYREDO"),
    ("oil-ck-one.png", "CK ONE", "CALVIN KLEIN"),
    ("oil-coco-mademoiselle.png", "COCO MADEMOISELLE", "CHANEL"),
    ("oil-clive-christian-gold.png", "NO.1 GOLD", "CLIVE CHRISTIAN"),
    ("oil-royal-princess-oud.png", "ROYAL PRINCESS OUD", "CREED"),
    ("oil-aventus-for-her.png", "AVENTUS FOR HER", "CREED"),
    ("oil-royal-oud.png", "ROYAL OUD", "CREED"),
    ("oil-cr7-legacy.png", "LEGACY", "CRISTIANO RONALDO"),
    ("oil-cool-water-man.png", "COOL WATER", "DAVIDOFF"),
    ("oil-black-orchid.png", "BLACK ORCHID", "TOM FORD"),
    ("oil-arabians-tonka.png", "ARABIANS TONKA", "MONTALE"),
    ("oil-escape.png", "ESCAPE", "CALVIN KLEIN"),
]


def prepare_logo(path: str) -> Image.Image:
    im = Image.open(path).convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            luma = (r + g + b) / 3
            if luma > 245:
                px[x, y] = (0, 0, 0, 0)
            elif luma > 210:
                fade = max(0, int(a * (245 - luma) / 35))
                px[x, y] = (min(r, 30), min(g, 30), min(b, 30), fade)
    bbox = im.getbbox()
    if not bbox:
        raise RuntimeError("Logo is empty after keying white")
    return im.crop(bbox)


def font(size: int, index: int = 1) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT, size, index=index)


def wrap(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont, max_w: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    cur = ""
    for word in words:
        test = f"{cur} {word}".strip()
        if draw.textlength(test, font=fnt) <= max_w:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines or [text]


def fit_wrap(
    draw: ImageDraw.ImageDraw,
    text: str,
    max_w: int,
    max_size: int,
    min_size: int,
    index: int,
    max_lines: int,
) -> tuple[ImageFont.FreeTypeFont, list[str]]:
    for size in range(max_size, min_size - 1, -1):
        fnt = font(size, index)
        lines = wrap(draw, text, fnt, max_w)
        if len(lines) <= max_lines and all(draw.textlength(line, font=fnt) <= max_w for line in lines):
            return fnt, lines
    fnt = font(min_size, index)
    return fnt, wrap(draw, text, fnt, max_w)


def stamp(name: str, brand: str, logo: Image.Image) -> Image.Image:
    im = Image.open(REF).convert("RGBA")
    draw = ImageDraw.Draw(im)
    draw.rectangle(INNER, fill=FILL + (255,))

    left, top, right, bottom = INNER
    max_w = right - left - 16
    cx = (left + right) // 2

    logo_w = min(132, max_w)
    scale = logo_w / logo.width
    logo_h = max(28, int(logo.height * scale))
    logo_r = logo.resize((logo_w, logo_h), Image.Resampling.LANCZOS)
    logo_x = cx - logo_w // 2
    logo_y = top + 10
    im.alpha_composite(logo_r, (logo_x, logo_y))

    text_top = logo_y + logo_h + 8
    draw = ImageDraw.Draw(im)

    name_font, name_lines = fit_wrap(draw, name, max_w, 22, 12, 1, 3)
    brand_font, brand_lines = fit_wrap(draw, brand, max_w, 14, 10, 10, 2)

    name_gap = int(name_font.size * 1.12)
    brand_gap = int(brand_font.size * 1.15)
    block_h = len(name_lines) * name_gap + 8 + len(brand_lines) * brand_gap
    avail = bottom - 8 - text_top
    y = text_top + max(0, (avail - block_h) // 2) + name_font.size // 2

    for line in name_lines:
        draw.text((cx, y), line, fill=INK, font=name_font, anchor="mm")
        y += name_gap
    y += 6
    for line in brand_lines:
        draw.text((cx, y), line, fill=INK, font=brand_font, anchor="mm")
        y += brand_gap
    return im.convert("RGB")


def main() -> int:
    if not os.path.exists(REF):
        print(f"Missing reference: {REF}", file=sys.stderr)
        return 1
    if not os.path.exists(LOGO):
        print(f"Missing logo: {LOGO}", file=sys.stderr)
        return 1
    os.makedirs(OUT_DIR, exist_ok=True)
    logo = prepare_logo(LOGO)
    for filename, name, brand in STICKERS:
        path = os.path.join(OUT_DIR, filename)
        stamp(name, brand, logo).save(path, optimize=True)
        print(f"wrote {filename}")
    print(f"Rendered {len(STICKERS)} stickers with CA logo.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
