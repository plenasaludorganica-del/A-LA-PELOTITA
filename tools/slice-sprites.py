#!/usr/bin/env python3
"""Recorta planchas de poses (PNG con transparencia) y arma un atlas 4x2 por personaje.
Uso: slice-sprites.py nombre planchaA.png planchaB.png   (4 poses cada una)
     slice-sprites.py nombre plancha8.png                 (8 poses en 2 filas)
Orden del atlas: espera, corre1, corre2, festejo / armado, golpe, remate, derrota."""
import sys, pathlib, numpy as np
from PIL import Image
from scipy import ndimage as ndi
CW, CH = 224, 288
OUT = pathlib.Path(__file__).resolve().parent.parent / 'assets' / 'sprites'

def blobs(path, n, rows):
    im = np.array(Image.open(path).convert('RGBA'))
    m = im[..., 3] > 128
    lab, k = ndi.label(ndi.binary_closing(m, iterations=3))
    sizes = ndi.sum(m, lab, range(1, k + 1))
    keep = [i + 1 for i in np.argsort(sizes)[::-1][:n]]
    if len(keep) < n or sizes[keep[-1] - 1] < sizes[keep[0] - 1] * 0.12:
        raise SystemExit('%s: no encontré %d poses separadas' % (path, n))
    out = []
    for i in keep:
        ys, xs = np.where(lab == i)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        crop = im[y0:y1, x0:x1].copy(); crop[..., 3] = np.where((lab[y0:y1, x0:x1] == i) & m[y0:y1, x0:x1], 255, 0)
        out.append((y0 + y1) / 2, ) if False else out.append({'cy': (y0 + y1) / 2, 'cx': (x0 + x1) / 2, 'img': crop})
    if rows == 2:
        out.sort(key=lambda b: b['cy']); top, bot = out[:n // 2], out[n // 2:]
        return sorted(top, key=lambda b: b['cx']) + sorted(bot, key=lambda b: b['cx'])
    return sorted(out, key=lambda b: b['cx'])

def main():
    name, files = sys.argv[1], sys.argv[2:]
    groups = [blobs(files[0], 8, 2)] if len(files) == 1 else [blobs(f, 4, 1) for f in files]
    if len(groups) == 1: groups = [groups[0][:4], groups[0][4:]]
    atlas = Image.new('RGBA', (CW * 4, CH * 2), (0, 0, 0, 0))
    # escala común: la altura de la pose de espera (primera) y la de armado (quinta) definen el tamaño
    for gi, g in enumerate(groups):
        ref = np.median([b['img'].shape[0] for b in (g[:3] if gi == 0 else [g[0], g[1], g[3]])])
        s = CH * 0.74 / ref
        s = min(s, min(CH / b['img'].shape[0] for b in g), min(CW / b['img'].shape[1] for b in g))
        for fi, b in enumerate(g):
            a = b['img']; h, w = a.shape[:2]
            feet = a[int(h * 0.86):, :, 3] > 0; cols = np.where(feet.any(0))[0]
            ax = (cols.min() + cols.max()) / 2 if len(cols) else w / 2
            if fi == 3 and gi == 0 or fi == 2 and gi == 1: ax = w / 2      # saltos: centrar por el cuerpo
            im = Image.fromarray(a).resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
            x = round(CW / 2 - ax * s); x = max(0, min(CW - im.width, x))
            atlas.paste(im, (fi * CW + x, gi * CH + CH - im.height - 2), im)
    arr = np.array(atlas); arr[..., 3] = np.where(arr[..., 3] > 110, 255, 0); arr[arr[..., 3] == 0] = 0
    OUT.mkdir(parents=True, exist_ok=True)
    q = Image.fromarray(arr).quantize(colors=160, method=Image.Quantize.FASTOCTREE)
    q.save(OUT / (name + '.png'), optimize=True)
    print(name, (OUT / (name + '.png')).stat().st_size)
main()
