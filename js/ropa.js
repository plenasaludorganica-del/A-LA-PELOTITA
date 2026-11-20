/* Tienda de ropa y Vestidor: el jugador arma su propio muñeco (js/avatar.js), compra ropa y accesorios con Pelotitas
   y se los pone. Solo es ropa: no cambia nada del juego (ni fuerza, ni puntos).
   - Las prendas más lindas se desbloquean jugando: cada nivel de rareza pide una categoría (8va → LEYENDA).
   - PRO: cambia todo su físico (pelucas, color de pelo, ojos, cejas, barba), tiene la Colección PRO y 20 % de descuento.
   - Las marcas son propias del juego (Pelotita, Bandeja, Víbora, Por 3): nunca marcas reales.
   OJO: hoy las Pelotitas y lo comprado se guardan en el dispositivo. Antes de cobrar con Mercado Pago hay que pasarlo al servidor. */
(function () {
  'use strict';
  var PP = window.PP, U = null, AV = PP.Avatar;
  var R = PP.Ropa = {};
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------- Colores y marcas ---------- */
  var C = { negro: '#151515', blanco: '#F6F6F6', turquesa: '#20C3B5', rosa: '#FF5FA2', lima: '#C8F23C', naranja: '#FF7A3D', violeta: '#8E5CFF', celeste: '#43C6FF',
    rojo: '#E53935', marino: '#1B2A4A', gris: '#6B7280', amarillo: '#FFD23A', verde: '#2E9E44', coral: '#FF8A80', fucsia: '#E0218A', arena: '#E8D9B5', bordo: '#7A1F3D', lila: '#C9A7FF' };
  var NOMBRE = { negro: 'Negra', blanco: 'Blanca', turquesa: 'Turquesa', rosa: 'Rosa', lima: 'Lima', naranja: 'Naranja', violeta: 'Violeta', celeste: 'Celeste', rojo: 'Roja',
    marino: 'Azul marino', gris: 'Gris', amarillo: 'Amarilla', verde: 'Verde', coral: 'Coral', fucsia: 'Fucsia', arena: 'Arena', bordo: 'Bordó', lila: 'Lila' };
  var PARES = [['turquesa', 'blanco'], ['negro', 'blanco'], ['blanco', 'negro'], ['rosa', 'blanco'], ['violeta', 'blanco'], ['marino', 'celeste'], ['rojo', 'negro'], ['lima', 'negro'],
    ['naranja', 'blanco'], ['celeste', 'blanco'], ['gris', 'lima'], ['negro', 'rosa'], ['coral', 'arena'], ['verde', 'blanco'], ['amarillo', 'negro'], ['fucsia', 'negro'], ['bordo', 'arena'], ['lila', 'blanco']];
  R.TIERS = {
    comun: { n: 'Común', brand: 'Pelotita', price: 80, rank: 0, col: '#B8B3D6' },
    especial: { n: 'Especial', brand: 'Bandeja', price: 180, rank: 1, col: '#22E1FF' },
    epica: { n: 'Épica', brand: 'Víbora', price: 350, rank: 3, col: '#B57BFF' },
    legendaria: { n: 'Legendaria', brand: 'Por 3', price: 700, rank: 5, col: '#FFD23A' }
  };
  var DISENO = { liso: ['Lisa', 'comun'], rayas: ['a rayas', 'comun'], lateral: ['con franjas', 'comun'], bicolor: ['bicolor', 'comun'], franja: ['con franja al medio', 'especial'],
    cuadros: ['cuadrillé', 'especial'], degrade: ['degradé', 'especial'], camuflado: ['camuflada', 'especial'], rayo: ['Rayo', 'epica'], degrade_puntos: ['degradé con puntos', 'epica'],
    degrade_zigzag: ['degradé zigzag', 'epica'], paneles: ['con paneles curvos', 'epica'], raglan: ['raglán', 'epica'], grieta: ['Grieta', 'legendaria'], oro: ['de oro', 'legendaria'], plata: ['de plata', 'legendaria'] };

  /* ---------- Catálogo ---------- */
  var ITEMS = [], BY = {};
  function add(o) { if (BY[o.id]) return; o.tier = o.tier || 'comun'; var t = R.TIERS[o.tier]; o.price = o.price || t.price; o.rank = o.rank != null ? o.rank : t.rank; o.brand = t.brand; ITEMS.push(o); BY[o.id] = o; }
  function pal(i) { return PARES[i % PARES.length]; }
  // Remeras (para todos)
  ['liso', 'rayas', 'lateral', 'bicolor', 'franja', 'cuadros', 'degrade', 'camuflado', 'rayo', 'degrade_puntos', 'degrade_zigzag', 'paneles', 'raglan'].forEach(function (d, di) {
    for (var k = 0; k < 6; k++) {
      var p = pal(di * 3 + k), tier = DISENO[d][1];
      add({ id: 'rem_' + d + '_' + p[0] + p[1], cat: 'remeras', slot: 'top', tier: tier, name: 'Remera ' + (d === 'liso' ? NOMBRE[p[0]] : DISENO[d][0] + ' ' + NOMBRE[p[0]].toLowerCase()),
        v: { k: 'remera', c1: C[p[0]], c2: C[p[1]], c3: C[p[1]], d: d, logo: 1 } });
    }
  });
  ['liso', 'raglan', 'paneles'].forEach(function (d, i) { for (var k = 0; k < 3; k++) { var p = pal(i * 5 + k + 2); add({ id: 'polo_' + d + p[0], cat: 'remeras', slot: 'top', tier: i ? 'epica' : 'especial', name: 'Chomba ' + (d === 'liso' ? NOMBRE[p[0]].toLowerCase() : DISENO[d][0] + ' ' + NOMBRE[p[0]].toLowerCase()), v: { k: 'polo', c1: C[p[0]], c2: C[p[1]], c3: C[p[1]], d: d, logo: 1 } }); } });
  ['liso', 'degrade', 'lateral'].forEach(function (d, i) { for (var k = 0; k < 3; k++) { var p = pal(i * 4 + k + 7); add({ id: 'manga_' + d + p[0], cat: 'remeras', slot: 'top', tier: i ? 'especial' : 'comun', name: 'Manga larga ' + (d === 'liso' ? NOMBRE[p[0]].toLowerCase() : DISENO[d][0] + ' ' + NOMBRE[p[0]].toLowerCase()), v: { k: 'manga', c1: C[p[0]], c2: C[p[1]], c3: C[p[1]], d: d, logo: 1 } }); } });
  // Ropa femenina: tops cortos, musculosas y polleras
  ['liso', 'rayas', 'degrade', 'paneles', 'grieta'].forEach(function (d, di) {
    for (var k = 0; k < 4; k++) { var p = pal(di * 2 + k + 1); add({ id: 'crop_' + d + p[0], cat: 'chicas', slot: 'top', tier: DISENO[d][1], name: 'Top corto ' + (d === 'liso' ? NOMBRE[p[0]].toLowerCase() : DISENO[d][0] + ' ' + NOMBRE[p[0]].toLowerCase()), v: { k: 'crop', c1: C[p[0]], c2: C[p[1]], c3: C[p[1]], d: d } }); }
  });
  ['liso', 'rayas', 'lateral', 'degrade'].forEach(function (d, di) {
    for (var k = 0; k < 4; k++) { var p = pal(di * 3 + k + 4); add({ id: 'musc_' + d + p[0], cat: 'chicas', slot: 'top', tier: DISENO[d][1], name: 'Musculosa ' + (d === 'liso' ? NOMBRE[p[0]].toLowerCase() : DISENO[d][0] + ' ' + NOMBRE[p[0]].toLowerCase()), v: { k: 'musculosa', c1: C[p[0]], c2: C[p[1]], c3: C[p[1]], d: d } }); }
  });
  ['liso', 'rayas', 'lateral', 'cuadros', 'degrade', 'paneles', 'grieta'].forEach(function (d, di) {
    for (var k = 0; k < 4; k++) { var p = pal(di * 2 + k); add({ id: 'poll_' + d + p[0], cat: 'chicas', slot: 'bottom', tier: DISENO[d][1], name: 'Pollera ' + (d === 'liso' ? 'tableada ' + NOMBRE[p[0]].toLowerCase() : DISENO[d][0] + ' ' + NOMBRE[p[0]].toLowerCase()), v: { k: 'pollera', c1: C[p[0]], c2: C[p[1]], c3: C[p[1]], d: d } }); }
  });
  ['liso', 'lateral', 'degrade'].forEach(function (d, di) { for (var k = 0; k < 3; k++) { var p = pal(di * 5 + k + 3); add({ id: 'calza_' + d + p[0], cat: 'chicas', slot: 'bottom', tier: DISENO[d][1], name: 'Calza ' + (d === 'liso' ? NOMBRE[p[0]].toLowerCase() : DISENO[d][0] + ' ' + NOMBRE[p[0]].toLowerCase()), v: { k: 'calza', c1: C[p[0]], c2: C[p[1]], c3: C[p[1]], d: d } }); } });
  // Shorts y bermudas
  ['liso', 'lateral', 'bicolor', 'rayas', 'degrade', 'camuflado', 'paneles'].forEach(function (d, di) {
    for (var k = 0; k < 4; k++) { var p = pal(di * 3 + k + 1); add({ id: 'short_' + d + p[0], cat: 'shorts', slot: 'bottom', tier: DISENO[d][1], name: 'Short ' + (d === 'liso' ? NOMBRE[p[0]].toLowerCase() : DISENO[d][0] + ' ' + NOMBRE[p[0]].toLowerCase()), v: { k: 'short', c1: C[p[0]], c2: C[p[1]], c3: C[p[1]], d: d } }); }
  });
  ['liso', 'camuflado', 'lateral'].forEach(function (d, di) { for (var k = 0; k < 3; k++) { var p = pal(di * 4 + k + 9); add({ id: 'berm_' + d + p[0], cat: 'shorts', slot: 'bottom', tier: DISENO[d][1], name: 'Bermuda ' + (d === 'liso' ? NOMBRE[p[0]].toLowerCase() : DISENO[d][0] + ' ' + NOMBRE[p[0]].toLowerCase()), v: { k: 'bermuda', c1: C[p[0]], c2: C[p[1]], c3: C[p[1]], d: d } }); } });
  // Conjuntos (remera + short o top + pollera), inspirados en las fotos, sin marcas
  [['Ola turquesa', 'remera', 'degrade_zigzag', 'turquesa', 'blanco', 'short', 'degrade', 'epica'],
   ['Sombra', 'remera', 'degrade_puntos', 'negro', 'blanco', 'short', 'degrade', 'epica'],
   ['Ángel', 'crop', 'paneles', 'negro', 'blanco', 'pollera', 'grieta', 'legendaria'],
   ['Calle', 'remera', 'paneles', 'blanco', 'negro', 'short', 'lateral', 'epica'],
   ['Noche', 'remera', 'raglan', 'negro', 'blanco', 'short', 'paneles', 'epica'],
   ['Flamenco', 'crop', 'degrade', 'rosa', 'blanco', 'pollera', 'degrade', 'especial'],
   ['Mar', 'remera', 'degrade', 'celeste', 'blanco', 'short', 'degrade', 'especial'],
   ['Lima ácida', 'remera', 'rayo', 'negro', 'lima', 'short', 'lateral', 'epica'],
   ['Lavanda', 'musculosa', 'degrade', 'violeta', 'blanco', 'pollera', 'paneles', 'epica'],
   ['Fuego', 'remera', 'degrade_zigzag', 'naranja', 'amarillo', 'short', 'degrade', 'legendaria'],
   ['Rosa grieta', 'crop', 'grieta', 'rosa', 'blanco', 'pollera', 'grieta', 'legendaria'],
   ['Clásico', 'polo', 'liso', 'blanco', 'marino', 'short', 'liso', 'comun']
  ].forEach(function (s) {
    add({ id: 'set_' + s[0].toLowerCase().replace(/[^a-z]/g, ''), cat: 'conjuntos', slot: 'set', tier: s[7], name: 'Conjunto ' + s[0],
      v: { top: { k: s[1], c1: C[s[3]], c2: C[s[4]], c3: C[s[4]], d: s[2], logo: 1 }, bottom: { k: s[5], c1: C[s[3]], c2: C[s[4]], c3: C[s[4]], d: s[6] } } });
  });
  // Zapatillas
  [['blanco', 'lima'], ['blanco', 'turquesa'], ['negro', 'amarillo'], ['blanco', 'rosa'], ['negro', 'blanco'], ['celeste', 'blanco'], ['rojo', 'blanco'], ['violeta', 'lima'],
   ['marino', 'naranja'], ['gris', 'lima'], ['rosa', 'blanco'], ['lima', 'negro'], ['naranja', 'negro'], ['arena', 'marino'], ['fucsia', 'celeste'], ['negro', 'rosa']].forEach(function (p, i) {
    add({ id: 'zap_' + p[0] + p[1], cat: 'zapatillas', slot: 'shoes', tier: i < 6 ? 'comun' : i < 12 ? 'especial' : 'epica', name: 'Zapatillas ' + NOMBRE[p[0]].toLowerCase().replace(/a$/, 'as').replace('azul marinoas', 'azul marino') + ' y ' + NOMBRE[p[1]].toLowerCase().replace(/a$/, 'o'), v: { c1: C[p[0]], c2: C[p[1]] } });
  });
  add({ id: 'zap_oro', cat: 'zapatillas', slot: 'shoes', tier: 'legendaria', pro: true, name: 'Zapatillas doradas', v: { c1: '#FFC93C', c2: '#FFF3B0', sole: '#B87A0B' } });
  add({ id: 'zap_plata', cat: 'zapatillas', slot: 'shoes', tier: 'legendaria', name: 'Zapatillas plateadas', v: { c1: '#C9D1DB', c2: '#FFFFFF', sole: '#7D8794' } });
  // Medias
  ['blanco', 'negro', 'gris', 'rosa', 'turquesa', 'lima', 'violeta', 'naranja', 'celeste', 'amarillo'].forEach(function (c, i) {
    ['corta', 'media', 'larga'].forEach(function (h, j) {
      if ((i + j) % 2 && i > 2) return;
      add({ id: 'med_' + c + h, cat: 'medias', slot: 'socks', tier: i < 3 ? 'comun' : 'especial', name: 'Medias ' + h + 's ' + NOMBRE[c].toLowerCase().replace(/a$/, 'as'), v: { c1: C[c], c2: i % 3 === 1 ? C.blanco : null, h: h } });
    });
  });
  // Gorras, viseras y vinchas
  [['gorra', 'Gorra'], ['visera', 'Visera'], ['vincha', 'Vincha']].forEach(function (h, hi) {
    [['blanco', 'negro'], ['negro', 'rosa'], ['turquesa', 'blanco'], ['rosa', 'blanco'], ['marino', 'celeste'], ['lima', 'negro'], ['violeta', 'blanco'], ['rojo', 'blanco'], ['arena', 'marino'], ['negro', 'amarillo']].forEach(function (p, i) {
      add({ id: h[0] + '_' + p[0] + p[1], cat: 'cabeza', slot: 'hat', tier: i < 4 ? 'comun' : i < 8 ? 'especial' : 'epica', name: h[1] + ' ' + NOMBRE[p[0]].toLowerCase().replace(/o$/, h[0] === 'vincha' || h[0] === 'gorra' || h[0] === 'visera' ? 'a' : 'o'), v: { k: h[0], c1: C[p[0]], c2: C[p[1]] } });
    });
  });
  add({ id: 'gorra_oro', cat: 'cabeza', slot: 'hat', tier: 'legendaria', pro: true, name: 'Gorra PRO dorada', v: { k: 'gorra', c1: '#151515', c2: '#FFC93C', d: 'oro' } });
  // Muñequeras y mochilas / paleteros
  ['blanco', 'negro', 'rosa', 'turquesa', 'lima', 'violeta', 'amarillo', 'rojo'].forEach(function (c, i) { add({ id: 'mun_' + c, cat: 'accesorios', slot: 'wrist', tier: i < 4 ? 'comun' : 'especial', name: 'Muñequeras ' + NOMBRE[c].toLowerCase().replace(/a$/, 'as'), v: { c1: C[c] } }); });
  [['negro', 'rosa'], ['marino', 'celeste'], ['blanco', 'negro'], ['rosa', 'blanco'], ['turquesa', 'blanco'], ['violeta', 'lima'], ['rojo', 'negro'], ['arena', 'marino']].forEach(function (p, i) {
    add({ id: 'bolso_' + p[0], cat: 'accesorios', slot: 'bag', tier: i < 3 ? 'especial' : 'epica', name: (i % 2 ? 'Mochila ' : 'Paletero ') + NOMBRE[p[0]].toLowerCase(), v: { c1: C[p[0]], c2: C[p[1]] } });
  });
  // Paletas de todos los colores y modelos
  ['negro', 'blanco', 'rojo', 'celeste', 'lima', 'rosa', 'naranja', 'violeta'].forEach(function (c, i) { add({ id: 'pal_' + c, cat: 'paletas', slot: 'pad', tier: 'comun', name: 'Paleta ' + NOMBRE[c].toLowerCase(), v: { c1: C[c], d: 'liso' } }); });
  [['rosa', 'naranja'], ['turquesa', 'violeta'], ['celeste', 'marino'], ['lima', 'turquesa'], ['amarillo', 'rojo'], ['fucsia', 'violeta']].forEach(function (p) { add({ id: 'pal_deg_' + p[0], cat: 'paletas', slot: 'pad', tier: 'especial', name: 'Paleta degradé ' + NOMBRE[p[0]].toLowerCase() + ' y ' + NOMBRE[p[1]].toLowerCase(), v: { c1: C[p[0]], c2: C[p[1]], d: 'degrade' } }); });
  [['negro', 'rosa'], ['negro', 'lima'], ['marino', 'amarillo'], ['blanco', 'rojo']].forEach(function (p) { add({ id: 'pal_rayo_' + p[0] + p[1], cat: 'paletas', slot: 'pad', tier: 'epica', name: 'Paleta Rayo ' + NOMBRE[p[0]].toLowerCase() + ' y ' + NOMBRE[p[1]].toLowerCase(), v: { c1: C[p[0]], c2: C[p[1]], d: 'rayo' } }); });
  [['negro', 'gris'], ['marino', 'negro'], ['bordo', 'negro']].forEach(function (p) { add({ id: 'pal_carb_' + p[0], cat: 'paletas', slot: 'pad', tier: 'epica', name: 'Paleta carbono ' + NOMBRE[p[0]].toLowerCase(), v: { c1: C[p[0]], c2: C[p[1]], d: 'cuadros' } }); });
  [['verde', 'arena'], ['gris', 'negro']].forEach(function (p) { add({ id: 'pal_cam_' + p[0], cat: 'paletas', slot: 'pad', tier: 'especial', name: 'Paleta camuflada ' + NOMBRE[p[0]].toLowerCase(), v: { c1: C[p[0]], c2: C[p[1]], c3: '#333333', d: 'camuflado' } }); });
  add({ id: 'pal_oro', cat: 'paletas', slot: 'pad', tier: 'legendaria', pro: true, name: 'Paleta de oro', v: { c1: '#FFC93C', d: 'oro', rim: '#7A4E00' } });
  add({ id: 'pal_plata', cat: 'paletas', slot: 'pad', tier: 'legendaria', name: 'Paleta de plata', v: { c1: '#C9D1DB', d: 'plata', rim: '#4A525C' } });
  add({ id: 'pal_diam', cat: 'paletas', slot: 'pad', tier: 'legendaria', pro: true, name: 'Paleta diamante', v: { c1: '#43C6FF', c2: '#FFFFFF', d: 'degrade_puntos', rim: '#0B4F6C' } });
  // Pelotitas (el color de la pelota en tus partidos)
  [['Clásica', '#E4FF4A', 'comun', 0], ['Rosa neón', '#FF5FA2', 'especial'], ['Celeste hielo', '#9FE7FF', 'especial'], ['Naranja fuego', '#FF7A3D', 'epica'], ['Violeta', '#B57BFF', 'epica'], ['Blanca', '#FFFFFF', 'especial'], ['Dorada', '#FFD23A', 'legendaria', null, true]].forEach(function (b) {
    add({ id: 'bola_' + b[0].toLowerCase().replace(/[^a-z]/g, ''), cat: 'pelotitas', slot: 'ball', tier: b[2], price: b[3], pro: !!b[4], name: 'Pelotita ' + b[0].toLowerCase(), v: { c1: b[1] } });
  });
  // Colección PRO (exclusiva)
  add({ id: 'pro_rem_oro', cat: 'pro', slot: 'top', tier: 'legendaria', pro: true, name: 'Remera PRO dorada', v: { k: 'remera', c1: '#151515', c2: '#FFC93C', c3: '#FFC93C', d: 'paneles', logo: 1, logoC: '#FFC93C' } });
  add({ id: 'pro_crop_oro', cat: 'pro', slot: 'top', tier: 'legendaria', pro: true, name: 'Top PRO dorado', v: { k: 'crop', c1: '#151515', c2: '#FFC93C', c3: '#FFC93C', d: 'paneles' } });
  add({ id: 'pro_poll_oro', cat: 'pro', slot: 'bottom', tier: 'legendaria', pro: true, name: 'Pollera PRO dorada', v: { k: 'pollera', c1: '#151515', c2: '#FFC93C', c3: '#FFC93C', d: 'paneles' } });
  add({ id: 'pro_short_oro', cat: 'pro', slot: 'bottom', tier: 'legendaria', pro: true, name: 'Short PRO dorado', v: { k: 'short', c1: '#151515', c2: '#FFC93C', c3: '#FFC93C', d: 'lateral' } });
  add({ id: 'pro_rem_plata', cat: 'pro', slot: 'top', tier: 'legendaria', pro: true, name: 'Remera PRO plateada', v: { k: 'remera', c1: '#F6F6F6', c2: '#C9D1DB', c3: '#7D8794', d: 'raglan', logo: 1, logoC: '#7D8794' } });
  // Lo que viene puesto (gratis)
  add({ id: 'pal_naranja', cat: 'paletas', slot: 'pad', tier: 'comun', price: 0, name: 'Paleta naranja de regalo', v: { c1: '#F2A21E', d: 'liso' } });
  R.ITEMS = ITEMS; R.BY = BY;

  /* ---------- Físico (peluquería) ---------- */
  R.HAIR = [['corto', 'Corto'], ['flequillo', 'Flequillo'], ['rapado', 'Rapado'], ['pelado', 'Pelado'], ['cresta', 'Cresta'], ['rulos', 'Rulos'], ['afro', 'Afro'], ['melena', 'Melena'],
    ['largo', 'Largo'], ['colita', 'Colita'], ['rodete', 'Rodete'], ['trenzas', 'Trenzas']];
  var FREE_HAIR = { corto: 1, largo: 1, colita: 1 }, FREE_HAIRC = 4;   // sin PRO: 3 peinados y 4 colores; con PRO, todo

  /* ---------- Estado (en el dispositivo por ahora) ---------- */
  var KEY = 'pelotita.ropa';
  function defLook() { return { body: 'm', skin: AV.SKIN[1], hair: 'corto', hairC: AV.HAIRC[2], eyes: AV.EYES[0], brows: 'finas', beard: '', wear: {} }; }
  var st = { pel: 150, owned: {}, look: defLook(), on: false, seen: false };   // on: juega con su muñeco (se prende la primera vez que entra al vestidor)
  try { var raw = JSON.parse(localStorage.getItem(KEY) || 'null'); if (raw) for (var k in raw) st[k] = raw[k]; } catch (e) {}
  if (!st.look.wear || !Object.keys(st.look.wear).length) {   // conjunto de arranque
    st.look.wear = { top: 'rem_liso_turquesablanco', bottom: 'short_lisonegro', shoes: 'zap_blancolima', socks: 'med_blancomedia', pad: 'pal_naranja' };
  }
  ['rem_liso_turquesablanco', 'short_lisonegro', 'zap_blancolima', 'med_blancomedia', 'pal_naranja', 'bola_clsica'].forEach(function (id) { st.owned[id] = true; });
  function applyBall() { var b = BY[st.look.wear.ball]; if (PP.Scene) PP.Scene.ballBase = b ? b.v.c1 : null; }
  function save() { applyBall(); try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function isPro() { return !!(PP.DB && PP.DB.isVip && PP.DB.isVip()); }
  function rank() { var s = U && U.save ? U.save() : null; return s ? s.rank || 0 : 0; }
  function price(it) { return isPro() ? Math.round(it.price * 0.8) : it.price; }
  // Arma el "look" completo que entiende el dibujante a partir de lo puesto
  function lookOf(base, tryId) {
    var L = JSON.parse(JSON.stringify(base)), w = Object.assign({}, L.wear || {});
    if (tryId) { var t = BY[tryId]; if (t) { if (t.slot === 'set') { w.top = t.id + '#top'; w.bottom = t.id + '#bottom'; } else w[t.slot] = t.id; } }
    var get = function (id) { if (!id) return null; var p = id.split('#'), it = BY[p[0]]; if (!it) return null; return p[1] ? it.v[p[1]] : it.v; };
    L.top = get(w.top); L.bottom = get(w.bottom); L.shoes = get(w.shoes); L.socks = get(w.socks); L.hat = get(w.hat); L.wrist = get(w.wrist); L.bag = get(w.bag); L.pad = get(w.pad);
    delete L.wear; return L;
  }
  R.look = function () { return lookOf(st.look); };
  R.useInGame = function () { return !!st.on; };
  // Retrato de frente festejando (para el dibujo grande del inicio)
  var portraitKey = '', portraitUrl = '';
  R.portrait = function () {
    var L = R.look(), k = JSON.stringify(L); if (k === portraitKey) return portraitUrl;
    var cv = document.createElement('canvas'); cv.width = 336; cv.height = 432; AV.draw(cv, L, { pose: 3, front: true, crop: [0, 0, 112, 144] });
    portraitKey = k; portraitUrl = cv.toDataURL('image/png'); return portraitUrl;
  };
  R.atlas = function () { return AV.atlas(R.look(), false); };
  function lockOf(it) {
    if (it.pro && !isPro()) return 'Solo PRO';
    if (rank() < it.rank) return 'Llegá a ' + PP.RANKS[it.rank];
    return '';
  }

  /* ---------- Pantalla ---------- */
  var CATS = [['vestidor', 'Mi jugador'], ['conjuntos', 'Conjuntos'], ['remeras', 'Remeras'], ['chicas', 'Tops y polleras'], ['shorts', 'Shorts'], ['zapatillas', 'Zapatillas'],
    ['medias', 'Medias'], ['cabeza', 'Gorras y vinchas'], ['accesorios', 'Bolsos y muñequeras'], ['paletas', 'Paletas'], ['pelotitas_c', 'Pelotitas de juego'], ['pro', 'Colección PRO'], ['casillero', 'Mi casillero'], ['pelotitas', 'Pelotitas']];
  var CROP = { remeras: 'top', chicas: 'top', shorts: 'bottom', zapatillas: 'feet', medias: 'feet', cabeza: 'hat', accesorios: 'top', paletas: 'paddle', conjuntos: 'full', pro: 'full' };
  var cat = 'vestidor', sel = null, back = false, posePrev = 0, poseT = null;
  R.render = function () {
    if (!st.seen) { st.seen = true; st.on = true; save(); }
    var h = '<div class="rtop"><div class="rpel">🎾 <b>' + st.pel + '</b> Pelotitas</div>' + (isPro() ? '<span class="rpro">PRO · 20% menos</span>' : '') + '</div>';
    h += '<div class="rstage"><canvas id="rPrev" width="224" height="288"></canvas><div class="rside">' +
      '<button class="btn small ghost" data-r="girar">↻ Girar</button><button class="btn small ghost" data-r="poses">' + (poseT ? '■ Quieto' : '▶ Poses') + '</button>' +
      (sel ? '<button class="btn small ghost" data-r="sacar">Sacar prueba</button>' : '') +
      '<label class="rchk"><input type="checkbox" id="rOn"' + (st.on ? ' checked' : '') + '> Jugar con mi jugador</label></div></div>';
    if (sel) h += selBox();
    h += '<div class="rcats">' + CATS.map(function (c) { return '<button class="tab' + (cat === c[0] ? ' on' : '') + '" data-rc="' + c[0] + '">' + c[1] + '</button>'; }).join('') + '</div>';
    h += '<div id="rList">' + list() + '</div>';
    $('ropaBody').innerHTML = h;
    paintPrev(); thumbs();
  };
  function selBox() {
    var it = BY[sel]; if (!it) return '';
    var t = R.TIERS[it.tier], own = st.owned[it.id], lk = lockOf(it), worn = isWorn(it);
    return '<div class="card rsel" style="border-color:' + t.col + '"><div><small style="color:' + t.col + '">' + t.n + ' · marca ' + esc(it.brand) + (it.pro ? ' · Colección PRO' : '') + '</small><h3>' + esc(it.name) + '</h3></div>' +
      (own ? (worn ? '<button class="btn small" data-r="quitar">Sacármela</button>' : '<button class="btn small lime" data-r="poner">Ponérmela</button>')
        : lk ? '<button class="btn small" disabled>🔒 ' + esc(lk) + '</button>'
        : '<button class="btn small lime" data-r="comprar">Comprar · 🎾 ' + price(it) + '</button>') + '</div>';
  }
  function isWorn(it) { var w = st.look.wear; if (it.slot === 'set') return w.top === it.id + '#top' && w.bottom === it.id + '#bottom'; return w[it.slot] === it.id; }
  // Portadas de cada categoría (hechas con Higgsfield, sin marcas)
  var COVER = { vestidor: 'peinados', conjuntos: 'conjuntos', remeras: 'conjuntos', chicas: 'chicas', shorts: 'conjuntos', zapatillas: 'zapatillas', medias: 'zapatillas',
    cabeza: 'cabeza', accesorios: 'cabeza', paletas: 'paletas', pelotitas_c: 'pelotitas', pro: 'pro', casillero: 'banner', pelotitas: 'banner' };
  function cover() { var c = COVER[cat]; if (!c) return ''; var t = CATS.filter(function (x) { return x[0] === cat; })[0]; return '<div class="rcover' + (c === 'banner' ? ' wide' : '') + '" style="background-image:url(assets/tienda/' + c + '.jpg)"><b>' + esc(t ? t[1] : '') + '</b></div>'; }
  function list() {
    var cv = cover();
    return cv + list2();
  }
  function list2() {
    if (cat === 'vestidor') return vestidor();
    if (cat === 'pelotitas') return pelotitas();
    var items = cat === 'casillero' ? ITEMS.filter(function (x) { return st.owned[x.id]; }) : ITEMS.filter(function (x) { return x.cat === (cat === 'pelotitas_c' ? 'pelotitas' : cat); });
    if (!items.length) return '<p class="note">Todavía no compraste nada. Las prendas compradas quedan acá.</p>';
    var order = { comun: 0, especial: 1, epica: 2, legendaria: 3 };
    items = items.slice().sort(function (a, b) { return order[a.tier] - order[b.tier]; });
    var h = cat === 'pro' ? '<div class="card" style="border-color:#FFD23A"><p style="color:#fff;margin:0">Prendas y paletas exclusivas para jugadores <b style="color:#FFD23A">PRO</b>. Los PRO además pagan 20 % menos en toda la tienda y cambian todo su físico.</p></div>' : '';
    if (cat !== 'casillero') h += '<p class="note">Las prendas más lindas se desbloquean subiendo de categoría. Hoy sos ' + PP.RANKS[rank()] + '.</p>';
    h += '<div class="rgrid">';
    items.forEach(function (it) {
      var t = R.TIERS[it.tier], own = st.owned[it.id], lk = lockOf(it);
      h += '<button class="ritem' + (sel === it.id ? ' on' : '') + (lk && !own ? ' lock' : '') + '" data-ri="' + it.id + '" style="--t:' + t.col + '"><canvas width="96" height="96" data-th="' + it.id + '"></canvas>' +
        '<b>' + esc(it.name) + '</b><span>' + (own ? (isWorn(it) ? 'Puesta ✓' : 'Tuya') : lk ? '🔒 ' + esc(lk) : '🎾 ' + price(it)) + '</span><i>' + t.n + '</i></button>';
    });
    return h + '</div>';
  }
  function vestidor() {
    var L = st.look, pro = isPro(), opt = function (key, val, label, locked) { return '<button class="ropt' + (L[key] === val ? ' on' : '') + (locked ? ' lock' : '') + '" data-rf="' + key + '" data-rv="' + esc(val) + '">' + (locked ? '🔒 ' : '') + label + '</button>'; };
    var sw = function (key, list, freeN) { return list.map(function (c, i) { var lk = !pro && freeN != null && i >= freeN; return '<button class="rsw' + (L[key] === c ? ' on' : '') + (lk ? ' lock' : '') + '" style="background:' + c + '" data-rf="' + key + '" data-rv="' + c + '" aria-label="color">' + (lk ? '🔒' : '') + '</button>'; }).join(''); };
    var h = '<div class="card"><h4 class="rh">Cuerpo</h4><div class="rrow">' + opt('body', 'm', 'Varón') + opt('body', 'f', 'Mujer') + '</div>' +
      '<h4 class="rh">Piel</h4><div class="rrow">' + sw('skin', AV.SKIN) + '</div>' +
      '<h4 class="rh">Peinado (pelucas)' + (pro ? '' : ' · más con PRO') + '</h4><div class="rrow">' + R.HAIR.map(function (hh) { return opt('hair', hh[0], hh[1], !pro && !FREE_HAIR[hh[0]]); }).join('') + '</div>' +
      '<h4 class="rh">Color de pelo</h4><div class="rrow">' + sw('hairC', AV.HAIRC, FREE_HAIRC) + '</div>' +
      '<h4 class="rh">Ojos' + (pro ? '' : ' · con PRO') + '</h4><div class="rrow">' + sw('eyes', AV.EYES, 1) + '</div>' +
      '<h4 class="rh">Cejas y barba' + (pro ? '' : ' · con PRO') + '</h4><div class="rrow">' + opt('brows', 'finas', 'Cejas finas') + opt('brows', 'gruesas', 'Cejas gruesas', !pro) +
      opt('beard', '', 'Sin barba') + opt('beard', 'bigote', 'Bigote', !pro) + opt('beard', 'barba', 'Barba', !pro) + '</div></div>';
    if (!pro) h += '<div class="card" style="border-color:#FFD23A"><p style="color:#fff;margin:0 0 8px">Con <b style="color:#FFD23A">PRO</b> cambiás todo: 12 peinados, 12 colores de pelo, ojos, cejas y barba, para que tu jugador se parezca a vos. Además, la Colección PRO y 20 % menos en la tienda.</p><button class="btn lime small" data-r="pro">Quiero ser PRO</button></div>';
    return h;
  }
  function pelotitas() {
    var packs = [[200, 200, ''], [500, 550, '10 % de regalo'], [900, 1100, 'más de 20 % de regalo']];
    return '<div class="card"><h3 class="disp" style="color:#FFD23A">Comprá Pelotitas 🎾</h3><p>Con las Pelotitas comprás ropa y accesorios para tu jugador. Solo cambian cómo se ve: nunca dan ventaja en el juego.</p>' +
      packs.map(function (p) { return '<div class="rpack"><div><b>🎾 ' + p[1] + ' Pelotitas</b>' + (p[2] ? '<small>' + p[2] + '</small>' : '') + '</div><button class="btn small lime" data-r="pack" data-p="' + p[0] + '">$ ' + p[0] + '</button></div>'; }).join('') +
      '<p class="note">El pago con Mercado Pago se activa cuando la tienda abra.</p></div>';
  }
  function paintPrev() {
    var cv = $('rPrev'); if (!cv) return;
    AV.draw(cv, lookOf(st.look, sel), { pose: posePrev, front: !back, crop: AV.CROPS.full });
  }
  function thumbs() {
    var list = document.querySelectorAll('canvas[data-th]'), base = st.look, i = 0;
    (function next() {   // de a poco, para no trabar el celular
      var end = Math.min(list.length, i + 12);
      for (; i < end; i++) { var c = list[i], it = BY[c.dataset.th];
        if (it.slot === 'ball') { var x = c.getContext('2d'); x.clearRect(0, 0, 96, 96); x.fillStyle = '#1b1033'; x.beginPath(); x.arc(48, 48, 30, 0, 7); x.fill(); x.fillStyle = it.v.c1; x.beginPath(); x.arc(48, 48, 27, 0, 7); x.fill(); x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = 3; x.beginPath(); x.arc(28, 48, 22, -1, 1); x.stroke(); x.beginPath(); x.arc(68, 48, 22, 2.14, 4.14); x.stroke(); x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.arc(38, 36, 7, 0, 7); x.fill(); continue; }
        if (it.slot === 'pad') { AV.drawPaddle(c, it.v); continue; }
        var cr = AV.CROPS[CROP[it.cat] || (it.slot === 'set' ? 'full' : it.slot === 'shoes' || it.slot === 'socks' ? 'feet' : it.slot === 'pad' ? 'paddle' : it.slot === 'hat' ? 'hat' : it.slot === 'bottom' ? 'bottom' : 'top')];
        AV.draw(c, lookOf(base, it.id), { pose: it.slot === 'pad' ? 4 : 0, front: !(it.slot === 'bag'), crop: it.slot === 'bag' ? AV.CROPS.top : cr }); }
      if (i < list.length) requestAnimationFrame(next);
    })();
  }
  function onClick(e) {
    var b;
    if ((b = e.target.closest('[data-rc]'))) { cat = b.dataset.rc; R.render(); return; }
    if ((b = e.target.closest('[data-ri]'))) { sel = sel === b.dataset.ri ? null : b.dataset.ri; R.render(); var s = document.querySelector('#ropa .scroll'); if (s) s.scrollTop = 0; return; }
    if ((b = e.target.closest('[data-rf]'))) {
      if (b.classList.contains('lock')) { offerPro(); return; }
      var key = b.dataset.rf, v = b.dataset.rv; st.look[key] = v;
      if (key === 'body' && v === 'f' && st.look.beard) st.look.beard = '';
      save(); R.render(); return;
    }
    if (!(b = e.target.closest('[data-r]'))) return;
    var a = b.dataset.r, it = BY[sel];
    if (a === 'girar') { back = !back; paintPrev(); }
    else if (a === 'poses') { if (poseT) { clearInterval(poseT); poseT = null; posePrev = 0; } else poseT = setInterval(function () { posePrev = (posePrev + 1) % AV.POSES; if (!$('rPrev')) { clearInterval(poseT); poseT = null; return; } paintPrev(); }, 600); R.render(); }
    else if (a === 'sacar') { sel = null; R.render(); }
    else if (a === 'pro') offerPro();
    else if (a === 'pack') { U.toast('Muy pronto: el pago con Mercado Pago se activa cuando abra la tienda.'); }
    else if (a === 'comprar' && it) {
      var lk = lockOf(it); if (lk) { if (lk === 'Solo PRO') offerPro(); else U.toast(lk + ' para desbloquearla.'); return; }
      var pr = price(it); if (st.pel < pr) { U.toast('Te faltan ' + (pr - st.pel) + ' Pelotitas.'); cat = 'pelotitas'; R.render(); return; }
      st.pel -= pr; st.owned[it.id] = true; wear(it); save(); U.toast('¡Es tuya! Ya te la pusiste.'); R.render();
    }
    else if (a === 'poner' && it) { wear(it); save(); R.render(); }
    else if (a === 'quitar' && it) { if (it.slot === 'set') { delete st.look.wear.top; delete st.look.wear.bottom; } else delete st.look.wear[it.slot]; save(); R.render(); }
  }
  function wear(it) { if (it.slot === 'set') { st.look.wear.top = it.id + '#top'; st.look.wear.bottom = it.id + '#bottom'; } else st.look.wear[it.slot] = it.id; }
  function offerPro() {
    if (!PP.DB.user) { U.modal('<h2 style="color:#FFD23A">Solo PRO</h2><p style="color:#fff">Esto es para jugadores PRO. Primero creá tu cuenta.</p><button class="btn lime" id="rAcc">Crear mi cuenta</button>', function () { U.on($('rAcc'), function () { U.closeModal(); PP.Social.open('acc'); U.go('social'); }); }); return; }
    if (PP.Social.offerPro) PP.Social.offerPro();
  }
  R.init = function () {
    U = PP.ui; applyBall();
    $('ropaBody').addEventListener('click', onClick);
    $('ropaBody').addEventListener('change', function (e) { if (e.target.id === 'rOn') { st.on = e.target.checked; save(); U.toast(st.on ? 'En la cancha jugás con tu jugador.' : 'En la cancha jugás con el personaje elegido.'); } });
  };
  R.count = ITEMS.length;
})();
