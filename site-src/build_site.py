import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "site-src"
TEMPLATE = (SRC / "template.html").read_text(encoding="utf-8")

LANGS = [
    ("zh-TW", "https://eco-material.chanting-green.com/"),
    ("en", "https://eco-material.chanting-green.com/en/"),
    ("de", "https://eco-material.chanting-green.com/de/"),
    ("fr", "https://eco-material.chanting-green.com/fr/"),
]

ACTIVE = {"zh-TW": "zh", "en": "en", "de": "de", "fr": "fr"}


def build(locale: str, canonical: str) -> None:
    data = json.loads((SRC / "locales" / f"{locale}.json").read_text(encoding="utf-8"))
    data["meta.canonical"] = canonical
    html = TEMPLATE
    for key, value in data.items():
        html = html.replace("{{" + key + "}}", value)
    for lang in ("zh", "en", "de", "fr"):
        active = "active" if ACTIVE[locale] == lang else ""
        html = html.replace("{{active" + lang.capitalize() + "}}", active)
    missing = sorted(set(re.findall(r"\{\{[^}]+\}\}", html)))
    if missing:
        raise SystemExit(f"Missing placeholders: {', '.join(missing)}")
    if "{{" in html:
        raise SystemExit("Unresolved template syntax remains")
    out = ROOT / ("" if locale == "zh-TW" else locale) / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    print(f"Built {out.relative_to(ROOT)}")


if __name__ == "__main__":
    for locale, canonical in LANGS:
        build(locale, canonical)
