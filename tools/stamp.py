#!/usr/bin/env python3
"""Pone a cada <script src="..."> de index.html una marca con la huella del archivo (?v=abc123).
Así, cuando un archivo cambia, el celular baja el nuevo en vez de usar la copia guardada.
Correrlo antes de publicar:  python3 tools/stamp.py"""
import hashlib, pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
page = root / 'index.html'
html = page.read_text(encoding='utf-8')
def stamp(m):
    src = m.group(1).split('?')[0]
    h = hashlib.sha1((root / src).read_bytes()).hexdigest()[:10]
    return '<script src="%s?v=%s"></script>' % (src, h)
new = re.sub(r'<script src="((?:js|vendor)/[^"]+)"></script>', stamp, html)
page.write_text(new, encoding='utf-8')
print('\n'.join(re.findall(r'<script src="[^"]+"', new)))
