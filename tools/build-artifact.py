#!/usr/bin/env python3
"""Arma la página para publicar como Artifact: toma lo marcado con <!--PAGE--> en index.html."""
import re, sys, pathlib
src = pathlib.Path(__file__).resolve().parent.parent / 'index.html'
out = pathlib.Path(sys.argv[1])
parts = re.findall(r'<!--PAGE-->(.*?)<!--/PAGE-->', src.read_text(encoding='utf-8'), re.S)
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text('\n'.join(p.strip('\n') for p in parts) + '\n', encoding='utf-8')
print(out, out.stat().st_size)
