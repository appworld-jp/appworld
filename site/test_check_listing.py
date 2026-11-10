#!/usr/bin/env python3
"""Tests for check_listing.py. Run: python3 site/test_check_listing.py"""
import json
import pathlib
import tempfile
import unittest

from check_listing import check, check_icon, load_all

BASE = dict(
    id="test-app", name="テスト", tagline="t", description="d", platform="web",
    category="fun", ai_tools=["Cursor"], maker_name="m",
    url="https://example.com/x", launch_date="2026-10-19", sample=True,
)


def errors(**override):
    return check({**BASE, **override})[0]


class CheckListingTest(unittest.TestCase):
    def test_valid_listing_passes(self):
        self.assertEqual(errors(), [])

    def test_blocks_unsafe_links(self):
        for url in [
            "http://example.com",            # not https
            "https://bit.ly/abc",            # shortener hides the destination
            "https://example.com/app.apk",   # direct file download
            "https://192.168.0.1/x",         # IP address
            "https://user:pw@example.com/",  # credentials in URL
        ]:
            with self.subTest(url=url):
                self.assertTrue(errors(url=url))

    def test_store_apps_must_link_to_official_store(self):
        self.assertTrue(errors(platform="ios", url="https://example.com/app"))
        self.assertEqual(errors(platform="ios", url="https://apps.apple.com/jp/app/id1"), [])
        self.assertTrue(errors(platform="android", url="https://example.com/app"))

    def test_testflight_only_for_prototypes(self):
        tf = "https://testflight.apple.com/join/AbCd1234"
        self.assertTrue(errors(platform="ios", url=tf))                     # not marked as a prototype
        self.assertEqual(errors(platform="ios", url=tf, beta=True), [])
        self.assertTrue(errors(platform="ios", url="https://testflight.apple.com/v1/app", beta=True))  # not a public link
        self.assertTrue(errors(platform="ios", url="https://example.com/beta", beta=True))  # beta does not open other hosts
        _, warns = check({**BASE, "platform": "ios", "url": tf, "beta": True})
        self.assertTrue(any("試作中" in w for w in warns))                 # owner checks it is actually usable

    def test_rejects_markup_and_unknown_values(self):
        self.assertTrue(errors(name="<script>"))
        self.assertTrue(errors(ai_tools=["ChatGPT"]))
        self.assertTrue(errors(category="casino"))

    def test_out_of_scope_words_go_to_review(self):
        errs, warns = check({**BASE, "tagline": "副業で月30万稼げる"})
        self.assertEqual(errs, [])
        self.assertTrue(warns)

    def test_optional_display_fields(self):
        self.assertEqual(errors(operator=True, color="#3E8C84", icon=True), [])
        self.assertEqual(errors(color="#abcdef"), [])
        for bad in ("red", "#12345", "#1234567", "#GGGGGG", "url(x)", 123):
            with self.subTest(color=bad):
                self.assertTrue(errors(color=bad))
        self.assertTrue(errors(operator="yes"))
        self.assertTrue(errors(operator=1))
        self.assertTrue(errors(icon="true"))

    def test_operator_listing_is_flagged_for_review(self):
        _, warns = check({**BASE, "operator": True})
        self.assertTrue(any("運営" in w for w in warns))


GOOD_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="a"/></defs><use href="#a"/><rect width="64" height="64" fill="url(#a)"/></svg>'


class IconTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = pathlib.Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def icon_errors(self, text: str | bytes) -> list[str]:
        path = self.dir / "x.svg"
        path.write_bytes(text if isinstance(text, bytes) else text.encode())
        return check_icon(path)

    def test_plain_svg_passes(self):
        self.assertEqual(self.icon_errors(GOOD_SVG), [])
        self.assertEqual(self.icon_errors('<?xml version="1.0"?>\n' + GOOD_SVG), [])

    def test_unsafe_icons_fail(self):
        for bad in [
            '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
            '<svg xmlns="http://www.w3.org/2000/svg"><SCRIPT href="x.js"/></svg>',
            '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>',
            '<svg xmlns="http://www.w3.org/2000/svg"><rect\nonclick = "x"/></svg>',
            '<svg xmlns="http://www.w3.org/2000/svg"><a href="https://example.com/"><rect/></a></svg>',
            '<svg xmlns="http://www.w3.org/2000/svg"><image xlink:href="data:image/png;base64,AA"/></svg>',
            "<svg xmlns='http://www.w3.org/2000/svg'><use href='other.svg#a'/></svg>",
            '<svg xmlns="http://www.w3.org/2000/svg"><use href=x.svg#a /></svg>',
            '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div/></foreignObject></svg>',
            '<!DOCTYPE svg [<!ENTITY a "aaaa">]><svg xmlns="http://www.w3.org/2000/svg">&a;</svg>',
            '<html><body>not an svg</body></html>',
            b"\xff\xfe<svg/>",
            GOOD_SVG.replace("</svg>", "<!--" + "x" * 50_000 + "--></svg>"),
        ]:
            with self.subTest(svg=bad[:60]):
                self.assertTrue(self.icon_errors(bad))

    def test_missing_icon_blocks_the_listing(self):
        apps, icons = self.dir / "apps", self.dir / "icons"
        apps.mkdir(); icons.mkdir()
        (apps / "test-app.json").write_text(json.dumps({**BASE, "icon": True}), encoding="utf-8")
        _, problems = load_all(apps, icons)
        self.assertTrue(problems["test-app.json"][0])
        (icons / "test-app.svg").write_text(GOOD_SVG, encoding="utf-8")
        _, problems = load_all(apps, icons)
        self.assertEqual(problems.get("test-app.json", ([], []))[0], [])

    def test_the_published_icons_pass(self):
        icons = pathlib.Path(__file__).parent / "icons"
        for path in sorted(icons.glob("*.svg")):
            with self.subTest(icon=path.name):
                self.assertEqual(check_icon(path), [])


if __name__ == "__main__":
    unittest.main()
