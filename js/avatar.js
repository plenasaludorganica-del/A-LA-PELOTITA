/* Muñeco por capas: dibuja al jugador en pixel art a partir de su "look" (piel, ojos, pelo, ropa, paleta…).
   Arma el mismo atlas que usan los personajes (4×2 poses de 224×288: espera, corre, corre, festejo / armado, golpe, remate, derrota),
   así se usa en la cancha con S.makeSpriteChar(url). Vista de espalda (en la cancha) o de frente (vestidor y miniaturas).
   Se dibuja chico (112×144) y se agranda ×2 sin suavizar, con contorno oscuro: así queda pixel art. */
(function () {
  'use strict';
  var PP = window.PP;
  var AV = PP.Avatar = {};
  var W = 112, H = 144, OUT = '#1b1033';

  /* ---------- Paletas ---------- */
  AV.SKIN = ['#FBD7B5', '#F0B98A', '#D9965F', '#B8763F', '#8D5527', '#5E3519'];
  AV.HAIRC = ['#1A1110', '#3B2314', '#6B3A1E', '#A0642E', '#D9A64A', '#F2D27A', '#B5361E', '#8E8E8E', '#EDEDED', '#FF5FA2', '#43C6FF', '#9B5CFF'];
  AV.EYES = ['#4A2A16', '#2E7D32', '#1E5BD8', '#6E7B85', '#B5832B', '#111111'];

  /* ---------- Poses (vista de espalda; x hacia la derecha del jugador) ---------- */
  function P(o) { return o; }
  var POSES = [
    P({ hip: [56, 90], neck: [56, 60], head: [56, 46], sh: [[45, 62], [67, 62]], el: [[38, 76], [75, 75]], ha: [[42, 87], [81, 83]], hp: [[51, 91], [61, 91]], kn: [[44, 113], [68, 113]], ft: [[40, 137], [72, 137]], pad: -45 }),
    P({ hip: [58, 88], neck: [60, 58], head: [61, 44], sh: [[49, 60], [71, 61]], el: [[42, 70], [78, 73]], ha: [[38, 62], [84, 84]], hp: [[53, 89], [63, 89]], kn: [[50, 110], [70, 101]], ft: [[46, 135], [79, 117]], pad: -30 }),
    P({ hip: [56, 88], neck: [55, 58], head: [54, 44], sh: [[44, 61], [66, 60]], el: [[37, 73], [72, 70]], ha: [[38, 85], [80, 62]], hp: [[51, 89], [61, 89]], kn: [[44, 101], [64, 110]], ft: [[35, 117], [68, 135]], pad: -70 }),
    P({ hip: [56, 82], neck: [56, 52], head: [56, 38], sh: [[45, 54], [67, 54]], el: [[37, 42], [75, 42]], ha: [[35, 28], [79, 26]], hp: [[51, 83], [61, 83]], kn: [[46, 102], [66, 102]], ft: [[42, 122], [70, 122]], pad: -75 }),
    P({ hip: [56, 90], neck: [55, 60], head: [54, 46], sh: [[44, 62], [66, 62]], el: [[35, 73], [78, 70]], ha: [[38, 84], [90, 72]], hp: [[51, 91], [61, 91]], kn: [[43, 113], [69, 113]], ft: [[37, 137], [75, 137]], pad: -15 }),
    P({ hip: [56, 90], neck: [54, 60], head: [52, 46], sh: [[43, 62], [65, 62]], el: [[33, 70], [56, 72]], ha: [[28, 78], [40, 68]], hp: [[51, 91], [61, 91]], kn: [[46, 113], [67, 112]], ft: [[42, 137], [73, 136]], pad: -165 }),
    P({ hip: [56, 82], neck: [56, 52], head: [55, 38], sh: [[45, 54], [67, 54]], el: [[35, 60], [73, 38]], ha: [[33, 69], [77, 22]], hp: [[51, 83], [61, 83]], kn: [[48, 104], [64, 102]], ft: [[46, 126], [69, 122]], pad: -82 }),
    P({ hip: [56, 92], neck: [57, 64], head: [58, 52], sh: [[46, 66], [68, 66]], el: [[45, 80], [70, 80]], ha: [[46, 93], [72, 95]], hp: [[51, 93], [61, 93]], kn: [[51, 115], [63, 115]], ft: [[50, 138], [64, 138]], pad: 100 })
  ];
  function mirror(p) {
    var m = function (a) { return [W - a[0], a[1]]; };
    return { hip: m(p.hip), neck: m(p.neck), head: m(p.head), sh: [m(p.sh[1]), m(p.sh[0])], el: [m(p.el[1]), m(p.el[0])], ha: [m(p.ha[1]), m(p.ha[0])],
      hp: [m(p.hp[1]), m(p.hp[0])], kn: [m(p.kn[1]), m(p.kn[0])], ft: [m(p.ft[1]), m(p.ft[0])], pad: 180 - p.pad, padSide: 0 };
  }

  /* ---------- Utilidades de dibujo ---------- */
  function shade(hex, k) {   // k<0 oscurece, k>0 aclara
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    var f = function (c) { return Math.max(0, Math.min(255, Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k))); };
    return '#' + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1);
  }
  function cap(c, a, b, w, col) { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
  function limb(c, a, b, w, col, light) {   // con sombra de un lado
    cap(c, a, b, w, shade(col, -0.22));
    var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, ox = -dy / l * w * 0.18 * (light || 1), oy = dx / l * w * 0.18 * (light || 1);
    cap(c, [a[0] + ox, a[1] + oy], [b[0] + ox, b[1] + oy], w * 0.62, col);
  }
  function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
  function poly(c, pts, fill) { c.fillStyle = fill; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); c.fill(); }
  function circle(c, x, y, r, fill) { c.fillStyle = fill; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
  function ellipse(c, x, y, rx, ry, rot, fill) { c.fillStyle = fill; c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); c.fill(); }

  /* ---------- Patrones de las prendas ---------- */
  // Pinta el diseño dentro del área ya recortada (clip) de la prenda. box = [x0, y0, x1, y1]
  function pattern(c, it, box, front) {
    var x0 = box[0], y0 = box[1], x1 = box[2], y1 = box[3], w = x1 - x0, h = y1 - y0, c1 = it.c1, c2 = it.c2 || '#ffffff', c3 = it.c3 || OUT, d = it.d || 'liso';
    c.fillStyle = c1; c.fillRect(x0, y0, w, h);
    if (d === 'degrade' || d === 'degrade_puntos' || d === 'degrade_zigzag') {
      var g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, c1); g.addColorStop(0.35, c1); g.addColorStop(1, c2); c.fillStyle = g; c.fillRect(x0, y0, w, h);
      c.globalAlpha = 0.28; c.fillStyle = shade(c1, -0.35);
      for (var yy = y0; yy < y0 + h * 0.6; yy += 3) for (var xx = x0 + ((yy / 3) % 2 ? 1 : 0); xx < x1; xx += 3) {
        if (d === 'degrade_puntos') c.fillRect(xx, yy, 1, 1); else if (d === 'degrade_zigzag') c.fillRect(xx, yy + ((xx / 3) % 2 ? 1 : 0), 2, 1);
      }
      c.globalAlpha = 1;
      // curvas laterales
      c.strokeStyle = c1; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x0 + w * 0.2, y0 + h * 0.35); c.quadraticCurveTo(x0 + w * 0.05, y0 + h * 0.7, x0 + w * 0.18, y1); c.stroke();
      c.beginPath(); c.moveTo(x1 - w * 0.2, y0 + h * 0.35); c.quadraticCurveTo(x1 - w * 0.05, y0 + h * 0.7, x1 - w * 0.18, y1); c.stroke();
    } else if (d === 'paneles') {
      c.fillStyle = c2;
      c.beginPath(); c.moveTo(x0 - 1, y0); c.lineTo(x0 + w * 0.3, y0); c.quadraticCurveTo(x0 + w * 0.12, y0 + h * 0.5, x0 + w * 0.32, y1); c.lineTo(x0 - 1, y1); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(x1 + 1, y0); c.lineTo(x1 - w * 0.3, y0); c.quadraticCurveTo(x1 - w * 0.12, y0 + h * 0.5, x1 - w * 0.32, y1); c.lineTo(x1 + 1, y1); c.closePath(); c.fill();
      c.strokeStyle = c3; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x0 + w * 0.3, y0); c.quadraticCurveTo(x0 + w * 0.12, y0 + h * 0.5, x0 + w * 0.32, y1); c.stroke();
      c.beginPath(); c.moveTo(x1 - w * 0.3, y0); c.quadraticCurveTo(x1 - w * 0.12, y0 + h * 0.5, x1 - w * 0.32, y1); c.stroke();
    } else if (d === 'raglan') {
      c.fillStyle = c3; c.fillRect(x0, y0 + h * 0.45, w * 0.22, h); c.fillRect(x1 - w * 0.22, y0 + h * 0.45, w * 0.22, h);
      c.strokeStyle = c2; c.lineWidth = 2.2;
      c.beginPath(); c.moveTo(x0 + w * 0.42, y0); c.lineTo(x0, y0 + h * 0.4); c.stroke();
      c.beginPath(); c.moveTo(x1 - w * 0.42, y0); c.lineTo(x1, y0 + h * 0.4); c.stroke();
      c.lineWidth = 0.8; c.beginPath(); c.moveTo(x0 + w * 0.22, y0 + h * 0.45); c.lineTo(x0 + w * 0.22, y1); c.moveTo(x1 - w * 0.22, y0 + h * 0.45); c.lineTo(x1 - w * 0.22, y1); c.stroke();
    } else if (d === 'rayas') {
      c.fillStyle = c2; for (var r = y0 + 2; r < y1; r += 5) c.fillRect(x0, r, w, 2);
    } else if (d === 'franja') {
      c.fillStyle = c2; c.fillRect(x0 + w * 0.42, y0, w * 0.16, h); c.fillStyle = c3; c.fillRect(x0 + w * 0.4, y0, 1, h); c.fillRect(x0 + w * 0.6, y0, 1, h);
    } else if (d === 'lateral') {
      c.fillStyle = c2; c.fillRect(x0, y0, w * 0.14, h); c.fillRect(x1 - w * 0.14, y0, w * 0.14, h);
      c.fillStyle = c3; c.fillRect(x0 + w * 0.14, y0, 1, h); c.fillRect(x1 - w * 0.14 - 1, y0, 1, h);
    } else if (d === 'bicolor') {
      c.fillStyle = c2; c.fillRect(x0, y0 + h * 0.5, w, h * 0.5); c.fillStyle = c3; c.fillRect(x0, y0 + h * 0.5 - 1, w, 1.5);
    } else if (d === 'cuadros') {
      c.globalAlpha = 0.45; c.fillStyle = c2; for (var q = x0; q < x1; q += 6) c.fillRect(q, y0, 3, h); for (var q2 = y0; q2 < y1; q2 += 6) c.fillRect(x0, q2, w, 3); c.globalAlpha = 1;
    } else if (d === 'rayo') {
      c.fillStyle = c2; c.beginPath(); c.moveTo(x0 + w * 0.55, y0); c.lineTo(x0 + w * 0.35, y0 + h * 0.55); c.lineTo(x0 + w * 0.52, y0 + h * 0.5); c.lineTo(x0 + w * 0.4, y1); c.lineTo(x0 + w * 0.68, y0 + h * 0.42); c.lineTo(x0 + w * 0.52, y0 + h * 0.45); c.closePath(); c.fill();
    } else if (d === 'grieta') {
      c.fillStyle = c2; c.fillRect(x0, y0, w * 0.22, h); c.fillRect(x1 - w * 0.22, y0, w * 0.22, h);
      c.strokeStyle = c3; c.lineWidth = 0.7; for (var k = 0; k < 6; k++) { var sx = x0 + 2 + (k % 2) * 3, sy = y0 + k * h / 6; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + 4, sy + 3); c.lineTo(sx + 1, sy + 6); c.stroke(); var ex = x1 - 6 + (k % 2) * 2; c.beginPath(); c.moveTo(ex, sy); c.lineTo(ex + 3, sy + 4); c.stroke(); }
    } else if (d === 'camuflado') {
      var cs = [c2, c3, shade(c1, -0.3)]; for (var m = 0; m < 14; m++) { c.fillStyle = cs[m % 3]; c.beginPath(); c.ellipse(x0 + ((m * 37) % 100) / 100 * w, y0 + ((m * 53) % 100) / 100 * h, 3 + m % 3, 2, m, 0, 7); c.fill(); }
    } else if (d === 'oro' || d === 'plata') {
      var g2 = c.createLinearGradient(x0, y0, x1, y1), b = d === 'oro' ? ['#FFF3B0', '#FFC93C', '#B87A0B'] : ['#FFFFFF', '#C9D1DB', '#7D8794'];
      g2.addColorStop(0, b[0]); g2.addColorStop(0.5, b[1]); g2.addColorStop(1, b[2]); c.fillStyle = g2; c.fillRect(x0, y0, w, h);
    }
    // logo propio (sin marcas reales): un círculo con una curva, como una pelotita
    if (it.logo && front) { var lx = x0 + w * 0.68, ly = y0 + h * 0.22; circle(c, lx, ly, 1.6, it.logoC || c2); }
  }

  /* ---------- El muñeco ---------- */
  function torsoPts(p, look, crop) {
    var fem = look.body === 'f', sw = fem ? 0.85 : 1, L = p.sh[0], R = p.sh[1], hl = p.hp[0], hr = p.hp[1];
    var cx = (L[0] + R[0]) / 2, sl = [cx + (L[0] - cx) * sw * 1.25, L[1] - 1], sr = [cx + (R[0] - cx) * sw * 1.25, R[1] - 1];
    var waist = lerp([(sl[0] + sr[0]) / 2, (sl[1] + sr[1]) / 2], [(hl[0] + hr[0]) / 2, (hl[1] + hr[1]) / 2], crop ? 0.72 : 1);
    var hw = (fem ? 10.5 : 11) * (crop ? 0.95 : 1), wy = waist[1] + (crop ? 0 : 2);
    return [sl, sr, [waist[0] + hw, wy], [waist[0] - hw, wy]];
  }
  function bbox(pts) { var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; pts.forEach(function (q) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }); return [x0 - 2, y0 - 2, x1 + 2, y1 + 2]; }
  function clipPoly(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); c.clip(); }

  function drawPaddle(c, p, look) {
    var hand = p.ha[1], a = p.pad * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a);
    var pd = look.pad || { c1: '#F2A21E', d: 'liso' };
    var hEnd = [hand[0] + dx * 7, hand[1] + dy * 7], ctr = [hand[0] + dx * 15, hand[1] + dy * 15];
    cap(c, [hand[0] - dx * 2, hand[1] - dy * 2], hEnd, 3, pd.grip || '#2a2a2a');
    c.save(); c.translate(ctr[0], ctr[1]); c.rotate(a + Math.PI / 2);
    c.beginPath(); c.ellipse(0, 0, 7.2, 8.6, 0, 0, Math.PI * 2); c.closePath(); c.save(); c.clip();
    pattern(c, pd, [-8, -9, 8, 9], true);
    // agujeros
    c.fillStyle = 'rgba(0,0,0,.35)'; for (var yy = -6; yy <= 6; yy += 3) for (var xx = -5; xx <= 5; xx += 3) if (xx * xx / 30 + yy * yy / 44 < 1) c.fillRect(xx, yy, 1, 1);
    c.restore();
    c.strokeStyle = pd.rim || shade(pd.c1 || '#888888', -0.45); c.lineWidth = 1.4; c.beginPath(); c.ellipse(0, 0, 7.2, 8.6, 0, 0, Math.PI * 2); c.stroke();
    c.restore();
  }
  function drawHairBack(c, look, hx, hy, r, front) {   // lo que va detrás de la cabeza (pelo largo, colita, trenzas)
    var hc = look.hairC, st = look.hair;
    if (st === 'largo') { poly(c, [[hx - r - 1, hy - 2], [hx + r + 1, hy - 2], [hx + r + 2, hy + r + 16], [hx - r - 2, hy + r + 16]], hc); }
    if (st === 'melena') { poly(c, [[hx - r - 1, hy - 2], [hx + r + 1, hy - 2], [hx + r + 2, hy + r + 5], [hx - r - 2, hy + r + 5]], hc); }
    if (st === 'colita') { limb(c, [hx + (front ? 0 : 0), hy - r * 0.2], [hx + 2, hy + r + 12], 6, hc); }
    if (st === 'trenzas') { limb(c, [hx - r * 0.6, hy], [hx - r * 0.7, hy + r + 14], 4, hc); limb(c, [hx + r * 0.6, hy], [hx + r * 0.7, hy + r + 14], 4, hc); }
    if (st === 'rodete' && !front) circle(c, hx, hy - r * 0.55, 5, shade(hc, -0.1));
    if (st === 'rodete' && front) circle(c, hx, hy - r - 1, 4.5, shade(hc, -0.1));
  }
  function drawHead(c, p, look, front) {
    var hx = p.head[0], hy = p.head[1], r = 10.5, skin = look.skin, hc = look.hairC, st = look.hair;
    if (!front) drawHairBack(c, look, hx, hy, r, front);
    // cuello
    limb(c, p.neck, [hx, hy + 6], 7, skin);
    // orejas
    circle(c, hx - r + 0.5, hy + 1, 2.2, shade(skin, -0.1)); circle(c, hx + r - 0.5, hy + 1, 2.2, shade(skin, -0.1));
    // cabeza
    ellipse(c, hx, hy, r, r * 1.05, 0, shade(skin, -0.18)); ellipse(c, hx - 0.8, hy - 0.6, r - 1.4, r * 1.05 - 1.4, 0, skin);
    if (front) {
      // cara
      var ey = hy + 1, ex = 4, eye = look.eyes || AV.EYES[0];
      c.fillStyle = '#ffffff'; c.fillRect(hx - ex - 2, ey - 1, 3, 3); c.fillRect(hx + ex - 1, ey - 1, 3, 3);
      c.fillStyle = eye; c.fillRect(hx - ex - 1, ey - 1, 2, 3); c.fillRect(hx + ex, ey - 1, 2, 3);
      c.fillStyle = '#111'; c.fillRect(hx - ex - 1, ey, 1, 1); c.fillRect(hx + ex, ey, 1, 1);
      c.fillStyle = shade(hc, -0.2); var bw = look.brows === 'gruesas' ? 2 : 1;
      c.fillRect(hx - ex - 2, ey - 3, 4, bw); c.fillRect(hx + ex - 1, ey - 3, 4, bw);
      c.fillStyle = shade(skin, -0.35); c.fillRect(hx - 2, hy + 6, 4, 1);   // boca
      c.fillStyle = 'rgba(255,90,90,.25)'; c.fillRect(hx - ex - 3, ey + 3, 2, 1); c.fillRect(hx + ex + 2, ey + 3, 2, 1);
      if (look.beard === 'barba') { c.fillStyle = shade(hc, -0.1); c.beginPath(); c.moveTo(hx - r + 2, hy + 2); c.quadraticCurveTo(hx, hy + r + 5, hx + r - 2, hy + 2); c.lineTo(hx + r - 3, hy + 5); c.quadraticCurveTo(hx, hy + r - 1, hx - r + 3, hy + 5); c.fill(); c.fillStyle = shade(skin, -0.35); c.fillRect(hx - 2, hy + 6, 4, 1); }
      if (look.beard === 'bigote') { c.fillStyle = shade(hc, -0.1); c.fillRect(hx - 3, hy + 5, 6, 1.5); }
    }
    // pelo
    c.fillStyle = hc;
    if (st === 'rapado') { c.globalAlpha = 0.7; c.beginPath(); c.arc(hx, hy - 1, r - 0.5, Math.PI * 1.05, Math.PI * 1.95); c.fill(); c.globalAlpha = 1; }
    else if (st !== 'pelado') {
      if (front) {
        c.beginPath(); c.arc(hx, hy - 1, r + 0.8, Math.PI * 0.95, Math.PI * 2.05); c.fill();
        if (st === 'flequillo' || st === 'largo' || st === 'melena') { poly(c, [[hx - r, hy - 3], [hx + r, hy - 3], [hx + r - 2, hy - 1], [hx - r + 2, hy - 1]], hc); }
        if (st === 'rulos' || st === 'afro') { for (var k = 0; k < 9; k++) circle(c, hx - r + k * r / 4, hy - r + 2 + (k % 2) * 2, st === 'afro' ? 5 : 3.4, k % 2 ? shade(hc, -0.12) : hc); }
        if (st === 'largo' || st === 'melena') { poly(c, [[hx - r - 1, hy - 4], [hx - r + 2, hy - 4], [hx - r + 1, hy + (st === 'largo' ? 16 : 9)], [hx - r - 2, hy + (st === 'largo' ? 16 : 9)]], hc); poly(c, [[hx + r + 1, hy - 4], [hx + r - 2, hy - 4], [hx + r - 1, hy + (st === 'largo' ? 16 : 9)], [hx + r + 2, hy + (st === 'largo' ? 16 : 9)]], hc); }
        if (st === 'cresta') { poly(c, [[hx - 2, hy - r - 5], [hx + 2, hy - r - 5], [hx + 3, hy - r + 3], [hx - 3, hy - r + 3]], hc); }
      } else {
        // de espalda: casi toda la cabeza es pelo
        ellipse(c, hx, hy - 0.5, r + 0.6, r * 1.05 + 0.2, 0, shade(hc, -0.15)); ellipse(c, hx - 1, hy - 1.5, r - 1, r - 1, 0, hc);
        if (st === 'corto' || st === 'cresta' || st === 'flequillo') { c.fillStyle = shade(look.skin, -0.05); c.fillRect(hx - 5, hy + r - 3, 10, 3); }
        if (st === 'rulos' || st === 'afro') { for (var j = 0; j < 12; j++) circle(c, hx - r + (j % 4) * r / 1.5, hy - r + Math.floor(j / 4) * 7 + 1, st === 'afro' ? 5.2 : 3.6, j % 2 ? shade(hc, -0.15) : hc); }
        if (st === 'cresta') { poly(c, [[hx - 2, hy - r - 5], [hx + 2, hy - r - 5], [hx + 3, hy + 2], [hx - 3, hy + 2]], shade(hc, 0.1)); }
        if (st === 'colita') circle(c, hx, hy - 2, 2.4, look.tieC || '#FF3D8B');
      }
    }
    // gorra, visera, vincha
    var hw = look.hat;
    if (hw && hw.k) {
      var c1 = hw.c1, c2 = hw.c2 || shade(hw.c1, -0.25);
      if (hw.k === 'gorra') {
        c.fillStyle = c1; c.beginPath(); c.arc(hx, hy - 3, r + 1.2, Math.PI, Math.PI * 2); c.fill(); c.fillRect(hx - r - 1.2, hy - 4, (r + 1.2) * 2, 2);
        if (front) { poly(c, [[hx - r - 3, hy - 3], [hx + r + 3, hy - 3], [hx + r - 1, hy - 1], [hx - r + 1, hy - 1]], c2); }
        else { c.fillStyle = c2; c.fillRect(hx - 3, hy - 3, 6, 2); }
        if (hw.d === 'oro') { c.fillStyle = '#FFD23A'; c.fillRect(hx - 1, hy - r + 1, 2, 2); }
      } else if (hw.k === 'visera') {
        c.fillStyle = c1; c.fillRect(hx - r - 1, hy - 7, (r + 1) * 2, 3);
        if (front) poly(c, [[hx - r - 3, hy - 4.5], [hx + r + 3, hy - 4.5], [hx + r, hy - 2.5], [hx - r, hy - 2.5]], c2);
      } else if (hw.k === 'vincha') {
        c.fillStyle = c1; c.fillRect(hx - r - 1, hy - 7, (r + 1) * 2, 3); c.fillStyle = c2; c.fillRect(hx - r - 1, hy - 6, (r + 1) * 2, 1);
        if (!front) { limb(c, [hx + 2, hy - 3], [hx + 6, hy + 6], 2, c1); }
      }
    }
  }

  function drawBody(c, look, pose, front) {
    var p = front ? mirror(pose) : pose, skin = look.skin, top = look.top || { k: 'remera', c1: '#F4EBDD', d: 'liso' }, bot = look.bottom || { k: 'short', c1: '#3B3B44', d: 'liso' };
    var shoes = look.shoes || { c1: '#ffffff', c2: '#C8F23C' }, socks = look.socks || { c1: '#ffffff', h: 'media' };
    var crop = top.k === 'crop', sleeveless = top.k === 'musculosa' || top.k === 'top';
    var padIsFront = !front;   // de espalda la paleta queda adelante del cuerpo
    if (look.bag && front) { poly(c, [[p.sh[0][0] - 2, p.sh[0][1] + 2], [p.sh[1][0] + 2, p.sh[1][1] + 2], [p.sh[1][0] + 3, p.hip[1] - 2], [p.sh[0][0] - 3, p.hip[1] - 2]], shade(look.bag.c1, -0.2)); }
    if (!padIsFront) drawPaddle(c, p, look);
    if (front) drawHairBack(c, look, p.head[0], p.head[1], 10.5, true);
    // piernas
    for (var i = 0; i < 2; i++) {
      limb(c, p.hp[i], p.kn[i], 10, skin); limb(c, p.kn[i], p.ft[i], 8.6, skin);
      // medias
      var sh = socks.h === 'larga' ? 0.45 : socks.h === 'corta' ? 0.86 : 0.7;
      limb(c, lerp(p.kn[i], p.ft[i], sh), p.ft[i], 8.8, socks.c1);
      if (socks.c2) cap(c, lerp(p.kn[i], p.ft[i], sh + 0.02), lerp(p.kn[i], p.ft[i], sh + 0.07), 8.8, socks.c2);
      // zapatillas
      var f = p.ft[i], dir = front ? 1 : -1;
      ellipse(c, f[0] + (i ? 1 : -1), f[1] + 2, 7.2, 4, 0, shoes.c1);
      c.fillStyle = shoes.sole || '#f5f5f5'; c.fillRect(f[0] - 6 + (i ? 1 : -1), f[1] + 3.5, 13, 2);
      c.fillStyle = shoes.c2 || '#C8F23C'; c.fillRect(f[0] - 3 + (i ? 1 : -1), f[1] + 1 + dir * 0.5, 6, 1.4);
    }
    // short o pollera
    var hl = p.hp[0], hr = p.hp[1], hipY = Math.min(hl[1], hr[1]) - 3;
    if (bot.k === 'pollera') {
      var sp = [[hl[0] - 5, hipY], [hr[0] + 5, hipY], [hr[0] + 13, hipY + 21], [hl[0] - 13, hipY + 21]];
      c.save(); clipPoly(c, sp); pattern(c, bot, bbox(sp), front);
      c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 0.8; for (var k = -3; k <= 3; k++) { c.beginPath(); c.moveTo((hl[0] + hr[0]) / 2 + k * 2.4, hipY + 3); c.lineTo((hl[0] + hr[0]) / 2 + k * 5.4, hipY + 21); c.stroke(); }
      c.restore();
      c.fillStyle = bot.c3 || shade(bot.c1, -0.3); c.fillRect(hl[0] - 5, hipY, hr[0] - hl[0] + 10, 3);
    } else {
      var len = bot.k === 'calza' ? 0.85 : bot.k === 'bermuda' ? 0.62 : 0.42;
      for (var j = 0; j < 2; j++) {
        var kneeP = lerp(p.hp[j], p.kn[j], len);
        c.save(); var lp = [[p.hp[j][0] - 6.6, hipY], [p.hp[j][0] + 6.6, hipY], [kneeP[0] + 6.2, kneeP[1]], [kneeP[0] - 6.2, kneeP[1]]];
        clipPoly(c, lp); pattern(c, bot, bbox(lp), front); c.restore();
      }
      var wb = [[hl[0] - 7.5, hipY], [hr[0] + 7.5, hipY], [hr[0] + 7, hipY + 7], [hl[0] - 7, hipY + 7]];
      c.save(); clipPoly(c, wb); pattern(c, bot, bbox(wb), front); c.restore();
      c.fillStyle = shade(bot.c1, -0.25); c.fillRect(hl[0] - 7.5, hipY, hr[0] - hl[0] + 15, 2);
      if (front && bot.k !== 'calza') { c.fillStyle = '#ffffff'; c.fillRect((hl[0] + hr[0]) / 2 - 0.5, hipY + 2, 1, 3); }
    }
    // brazo de atrás (el izquierdo en la vista de espalda)
    var drawArm = function (s) {
      limb(c, p.sh[s], p.el[s], 7.8, skin); limb(c, p.el[s], p.ha[s], 7, skin);
      if (!sleeveless) { var sl = top.k === 'manga' ? 0.95 : 0.45; limb(c, p.sh[s], lerp(p.sh[s], p.el[s], sl), 9.4, top.d === 'raglan' ? (top.c2 || top.c1) : top.c1); }
      if (look.wrist) { cap(c, lerp(p.el[s], p.ha[s], 0.72), lerp(p.el[s], p.ha[s], 0.86), 7.4, look.wrist.c1); }
      circle(c, p.ha[s][0], p.ha[s][1], 3.6, skin);
    };
    // torso
    var tp = torsoPts(p, look, crop);
    if (crop) { var mid = torsoPts(p, look, false); poly(c, mid, skin); }
    c.save(); clipPoly(c, tp); pattern(c, top, bbox(tp), front);
    // sombra lateral
    c.fillStyle = 'rgba(0,0,0,.14)'; c.fillRect(tp[1][0] - 4, tp[1][1], 6, 40);
    c.restore();
    if (look.body === 'f' && front) { c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect((tp[0][0] + tp[1][0]) / 2 - 6, tp[0][1] + 9, 12, 2); }
    // cuello de la remera
    if (front) { c.fillStyle = shade(top.c1, -0.25); c.beginPath(); c.arc(p.neck[0], p.neck[1] + 1, 4, 0, Math.PI); c.fill(); }
    if (top.k === 'polo' || top.k === 'cuello') { c.fillStyle = top.c2 || '#ffffff'; c.fillRect(p.neck[0] - 5, p.neck[1] - 1, 10, 3); }
    drawArm(0); drawArm(1);
    // mochila de espalda
    if (look.bag && !front) { var bx = (tp[0][0] + tp[1][0]) / 2, by = tp[0][1] + 4; c.fillStyle = look.bag.c1; c.fillRect(bx - 9, by, 18, 22); c.fillStyle = look.bag.c2 || shade(look.bag.c1, -0.3); c.fillRect(bx - 9, by + 12, 18, 3); c.fillRect(bx - 6, by - 2, 12, 3); }
    drawHead(c, p, look, front);
    if (padIsFront) drawPaddle(c, p, look);
  }

  // Contorno oscuro de 1 píxel y bordes nítidos (pixel art)
  function crisp(c) {
    var id = c.getImageData(0, 0, W, H), d = id.data, a = new Uint8Array(W * H), i, x, y;
    for (i = 0; i < W * H; i++) { a[i] = d[i * 4 + 3] >= 110 ? 1 : 0; d[i * 4 + 3] = a[i] ? 255 : 0; }
    var o = [27, 16, 51];
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      i = y * W + x; if (a[i]) continue;
      if ((x > 0 && a[i - 1]) || (x < W - 1 && a[i + 1]) || (y > 0 && a[i - W]) || (y < H - 1 && a[i + W])) { d[i * 4] = o[0]; d[i * 4 + 1] = o[1]; d[i * 4 + 2] = o[2]; d[i * 4 + 3] = 255; }
    }
    c.putImageData(id, 0, 0);
  }
  function drawPose(look, pose, front) {
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H; var c = cv.getContext('2d');
    drawBody(c, normalize(look), POSES[pose], front); crisp(c); return cv;
  }
  function normalize(look) {
    look = look || {};
    return Object.assign({ body: 'm', skin: AV.SKIN[1], hair: 'corto', hairC: AV.HAIRC[2], eyes: AV.EYES[0], brows: 'finas', beard: '' }, look);
  }
  // Cuadro grande (para vestidor y miniaturas): escala sin suavizar
  AV.draw = function (canvas, look, opts) {
    opts = opts || {}; var c = canvas.getContext('2d'), src = drawPose(look, opts.pose || 0, opts.front !== false);
    c.imageSmoothingEnabled = false; c.clearRect(0, 0, canvas.width, canvas.height);
    var crop = opts.crop || [0, 0, W, H], s = Math.min(canvas.width / crop[2], canvas.height / crop[3]);
    var dw = crop[2] * s, dh = crop[3] * s;
    c.drawImage(src, crop[0], crop[1], crop[2], crop[3], (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
  };
  // Atlas 896×576 para la cancha (vista de espalda por defecto)
  var cache = {};
  AV.atlas = function (look, front) {
    var key = JSON.stringify([look, !!front]); if (cache[key]) return cache[key];
    var cv = document.createElement('canvas'); cv.width = 896; cv.height = 576; var c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
    for (var i = 0; i < 8; i++) { var src = drawPose(look, i, !!front), col = i % 4, row = Math.floor(i / 4); c.drawImage(src, 0, 0, W, H, col * 224, row * 288, 224, 288); }
    var url = cv.toDataURL('image/png'); cache = {}; cache[key] = url; return url;
  };
  // Paleta sola, grande (miniaturas de la tienda)
  AV.drawPaddle = function (canvas, pad) {
    var cv = document.createElement('canvas'); cv.width = 30; cv.height = 42; var c = cv.getContext('2d');
    drawPaddle(c, { ha: [[0, 0], [15, 39]], pad: -90 }, { pad: pad }); crisp2(c, 30, 42);
    var x = canvas.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, canvas.width, canvas.height);
    var s = Math.min(canvas.width / 30, canvas.height / 42); x.drawImage(cv, (canvas.width - 30 * s) / 2, (canvas.height - 42 * s) / 2, 30 * s, 42 * s);
  };
  function crisp2(c, w, h) { var id = c.getImageData(0, 0, w, h), d = id.data, a = new Uint8Array(w * h), i, x, y; for (i = 0; i < w * h; i++) { a[i] = d[i * 4 + 3] >= 110 ? 1 : 0; d[i * 4 + 3] = a[i] ? 255 : 0; }
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) { i = y * w + x; if (a[i]) continue; if ((x > 0 && a[i - 1]) || (x < w - 1 && a[i + 1]) || (y > 0 && a[i - w]) || (y < h - 1 && a[i + w])) { d[i * 4] = 27; d[i * 4 + 1] = 16; d[i * 4 + 2] = 51; d[i * 4 + 3] = 255; } }
    c.putImageData(id, 0, 0); }
  AV.POSES = POSES.length;
  AV.shade = shade;
  // Recortes útiles para miniaturas de la tienda (x, y, ancho, alto en el cuadro de 112×144)
  AV.CROPS = { full: [8, 14, 96, 128], head: [36, 22, 40, 40], top: [30, 48, 52, 50], bottom: [30, 80, 52, 44], feet: [26, 112, 60, 32], paddle: [8, 40, 50, 60], hat: [36, 22, 40, 30] };
})();
