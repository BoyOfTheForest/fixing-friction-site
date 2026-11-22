#!/usr/bin/env python3
"""Build step: strip developer comments from the published index.html so internal notes never ship.
Removes HTML comments, CSS comments inside <style>, and stand-alone JS comments (full-line // lines and
full-line /* ... */ blocks) inside <script>. JSON-LD blocks are left alone. Safe to re-run.
Usage: python tools/strip_comments.py   (edits index.html in place)"""
import os, re, sys
root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
p = os.path.join(root, "index.html")
raw = open(p, "rb").read().decode("utf-8")
crlf = "\r\n" in raw
t = raw.replace("\r\n", "\n")
removed = {"html": 0, "css": 0, "js": 0}

def strip_css(m):
    body = m.group(2)
    n = len(re.findall(r"/\*.*?\*/", body, re.S))
    removed["css"] += n
    body = re.sub(r"/\*.*?\*/", "", body, flags=re.S)
    return m.group(1) + body + m.group(3)

def strip_js(m):
    head, body, tail = m.group(1), m.group(2), m.group(3)
    if "application/ld+json" in head: return m.group(0)
    out = []; i = 0
    lines = body.split("\n")
    k = 0
    while k < len(lines):
        s = lines[k].strip()
        if s.startswith("//"):
            removed["js"] += 1; k += 1; continue
        if s.startswith("/*"):
            j = k
            while "*/" not in lines[j]: j += 1
            if lines[j].strip().endswith("*/"):
                removed["js"] += 1; k = j + 1; continue
        out.append(lines[k]); k += 1
    return head + "\n".join(out) + tail

t = re.sub(r"(<style\b[^>]*>)(.*?)(</style>)", strip_css, t, flags=re.S)
t = re.sub(r"(<script\b[^>]*>)(.*?)(</script>)", strip_js, t, flags=re.S)
removed["html"] = len(re.findall(r"<!--.*?-->", t, re.S))
t = re.sub(r"<!--.*?-->", "", t, flags=re.S)
# tidy: collapse the blank lines left behind (three or more newlines become two)
t = re.sub(r"\n{3,}", "\n\n", t)
open(p, "wb").write((t.replace("\n", "\r\n") if crlf else t).encode("utf-8"))
print("removed", removed)
