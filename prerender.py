#!/usr/bin/env python3
"""
prerender.py — bake a crawlable text version of the homepage into index.html.

Why: the site renders its portfolio from JSON via JavaScript at runtime, so
crawlers that don't run JS (many AI answer-engines) see an almost-empty page.
This injects the real content (bio, 28 films, section summaries) as plain HTML
inside a #prerender-seo block. An inline script removes that block the instant
JavaScript runs, so human visitors get the normal interactive site with no
duplication and no flash — it's a fallback for machines only.

Idempotent: re-run any time content changes (it replaces the region between the
prerender markers). Run from the repo root:  python3 prerender.py
"""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
INDEX = ROOT / "index.html"

START = "<!-- prerender:start (SEO fallback for non-JS crawlers — regenerate with: python3 prerender.py) -->"
END = "<!-- prerender:end -->"


def load(name, default):
    try:
        return json.loads((ROOT / "data" / name).read_text(encoding="utf-8"))
    except Exception:
        return default


def esc(s):
    return html.escape(str(s or "").strip())


def build_block():
    site = load("site.json", {})
    videos = load("videos.json", {}).get("videos", [])
    photos = load("photos.json", {})
    bts = load("bts.json", [])
    pages = load("pages.json", {}).get("pages", [])

    photo_n = len(photos.get("images", photos) if isinstance(photos, dict) else photos)
    bts_n = len(bts.get("items", bts) if isinstance(bts, dict) else bts)

    # About body + skills from pages.json
    about_paras, skills = [], []
    for p in pages:
        if p.get("slug") == "about":
            for b in p.get("blocks", []):
                if b.get("body"):
                    about_paras = [x.strip() for x in b["body"].split("\n") if x.strip()]
                if b.get("skills"):
                    skills = b["skills"]

    email = esc(site.get("contact", {}).get("email", "ash@marshallvisuals.com"))
    yt = esc(site.get("social", {}).get("youtube", "https://www.youtube.com/cod4ash"))
    li = esc(site.get("social", {}).get("linkedin", ""))

    out = ['<div id="prerender-seo">']
    out.append("<h1>Ash Marshall — Corporate Video Director &amp; Filmmaker in London</h1>")
    out.append(
        "<p>London-based videographer and director creating cinematic corporate films, "
        "brand content and music videos for brands across the UK and internationally.</p>"
    )

    if about_paras:
        out.append("<h2>About Ash Marshall</h2>")
        out += [f"<p>{esc(p)}</p>" for p in about_paras]
    if skills:
        out.append("<p><strong>Skills &amp; tools:</strong> " + esc(", ".join(skills)) + "</p>")

    if videos:
        out.append(f"<h2>Selected Work — {len(videos)} films</h2>")
        out.append("<ul>")
        for v in videos:
            title = esc(v.get("title"))
            sub = esc(v.get("sub"))
            out.append(f"<li>{title}" + (f" — {sub}" if sub else "") + "</li>")
        out.append("</ul>")

    if photo_n:
        out.append("<h2>Photography &amp; Design</h2>")
        out.append(f"<p>{photo_n} stills — event coverage, portraits and graphic design.</p>")
    if bts_n:
        out.append("<h2>Behind the Scenes</h2>")
        out.append(f"<p>{bts_n} behind-the-scenes frames from shoots and productions.</p>")

    out.append("<h2>Contact</h2>")
    contact = (
        "<p>Available for commercial and creative briefs across the UK and internationally. "
        f'Email <a href="mailto:{email}">{email}</a>'
    )
    if li:
        contact += f', or connect on <a href="{li}">LinkedIn</a>'
    if yt:
        contact += f' and <a href="{yt}">YouTube</a>'
    contact += ".</p>"
    out.append(contact)
    out.append("</div>")

    remover = (
        "<script>/* Remove the SEO fallback once JS is available; visitors get the "
        "interactive site. */(function(){var e=document.getElementById('prerender-seo');"
        "if(e&&e.parentNode)e.parentNode.removeChild(e);})();</script>"
    )
    return "\n" + START + "\n" + "\n".join(out) + "\n" + remover + "\n" + END + "\n"


def main():
    src = INDEX.read_text(encoding="utf-8")
    block = build_block()

    if START in src and END in src:
        src = re.sub(re.escape(START) + r".*?" + re.escape(END), block.strip(), src, flags=re.S)
    else:
        # Insert right after the opening <body ...> tag
        src = re.sub(r"(<body[^>]*>)", r"\1" + block, src, count=1)

    INDEX.write_text(src, encoding="utf-8")
    n = block.count("<li>")
    print(f"prerender.py: baked SEO fallback into index.html ({n} films listed).")


if __name__ == "__main__":
    main()
