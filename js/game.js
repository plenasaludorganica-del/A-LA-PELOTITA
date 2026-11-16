/* A la Pelotita · lógica del juego, progreso y pantallas */
(function () {
  'use strict';
  var PP = window.PP, S = PP.Scene, A = PP.Audio;
  function $(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function ic(n, style) { return '<svg class="ic"' + (style ? ' style="' + style + '"' : '') + '><use href="#i-' + n + '"/></svg>'; }

  /* ================= Guardado ================= */
  var KEY = 'pelotita.v2', MAX_LIVES = 5, LIFE_MS = 15 * 60 * 1000, METER_MAX = 10;
  function defaults() {
    return { coins: 200, gems: 30, lives: MAX_LIVES, lifeAt: 0, xp: 0, rank: 0, level: 0, stars: {}, char: 'tornado',
      owned: { tornado: true }, up: {}, daily: { last: '', streak: 0 }, missions: { date: '', list: [] }, chest: 0,
      bought: {}, pass: false, sound: true, tut: 0, best: { rally: 0, combo: 0 } };
  }
  var save = defaults();
  try { var raw = localStorage.getItem(KEY); if (raw) { var o = JSON.parse(raw); for (var k in o) save[k] = o[k]; } } catch (e) {}
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} }
  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function curChar() { return PP.CHARS.filter(function (c) { return c.id === save.char; })[0] || PP.CHARS[0]; }
  function stat(k) { var c = curChar(); return c.stats[k] + (save.up[c.id + '.' + k] || 0); }
  function totalStars() { var n = 0; for (var k in save.stars) n += save.stars[k]; return n; }

  function give(r, quiet) {
    if (!r) return;
    if (r.coins) save.coins += r.coins;
    if (r.gems) save.gems += r.gems;
    if (r.lives) save.lives = Math.max(save.lives, MAX_LIVES);
    if (r.pass) save.pass = true;
    persist(); refreshTop(); if (!quiet) A.play('coin');
  }
  function rewardHtml(r) {
    var h = '';
    if (r.coins) h += '<span>' + ic('coin') + '+' + r.coins + '</span>';
    if (r.gems) h += '<span>' + ic('gem') + '+' + r.gems + '</span>';
    if (r.lives) h += '<span>' + ic('heart') + 'Vidas llenas</span>';
    if (r.pass) h += '<span>' + ic('crown', 'color:#FFD23A') + 'Pase</span>';
    return h;
  }
  function tickLives() {
    if (save.lives >= MAX_LIVES) { save.lifeAt = 0; return; }
    if (!save.lifeAt) save.lifeAt = Date.now() + LIFE_MS;
    while (save.lives < MAX_LIVES && Date.now() >= save.lifeAt) { save.lives++; save.lifeAt += LIFE_MS; }
    if (save.lives >= MAX_LIVES) save.lifeAt = 0;
  }
  function addXp(n) {
    save.xp += n; var up = false;
    while (save.rank < PP.RANKS.length - 1 && save.xp >= PP.xpFor(save.rank)) { save.xp -= PP.xpFor(save.rank); save.rank++; up = true; }
    return up;
  }

  /* ================= Misiones ================= */
  function ensureMissions() {
    if (save.missions.date === today() && save.missions.list.length) return;
    var d = new Date(), seed = d.getDate() + d.getMonth() * 31, pool = PP.MISSION_POOL.slice(), list = [];
    for (var i = 0; i < 3; i++) {
      var m = pool.splice((seed * (i + 3) + i * 7) % pool.length, 1)[0], tier = Math.min(2, Math.floor(save.level / 12));
      list.push({ id: m.id, n: m.n[tier], p: 0, done: false });
    }
    save.missions = { date: today(), list: list }; persist();
  }
  function mission(id, val, isMax) {
    ensureMissions();
    save.missions.list.forEach(function (m) {
      if (m.id !== id || m.done) return;
      var before = m.p; m.p = isMax ? Math.max(m.p, val) : m.p + val;
      if (before < m.n && m.p >= m.n) toast('¡Misión cumplida! Reclamá tu premio');
    });
  }

  /* ================= UI general ================= */
  var screens = ['home', 'map', 'chars', 'shop', 'missions'], curScreen = 'home';
  function go(name) {
    curScreen = name;
    screens.forEach(function (s) { $(s).hidden = s !== name; });
    $('top').hidden = false; $('hud').hidden = true;
    if (name === 'home') renderHome();
    if (name === 'map') renderMap();
    if (name === 'chars') renderChars();
    if (name === 'shop') renderShop();
    if (name === 'missions') renderMissions();
    refreshTop();
  }
  function refreshTop() {
    tickLives();
    $('vLives').textContent = save.pass ? '∞' : save.lives;
    var t = '';
    if (!save.pass && save.lives < MAX_LIVES && save.lifeAt) {
      var s = Math.max(0, Math.ceil((save.lifeAt - Date.now()) / 1000)); t = Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2);
    }
    $('vLifeT').textContent = t;
    $('vCoins').textContent = save.coins; $('vGems').textContent = save.gems;
    $('vRank').textContent = PP.RANKS[save.rank];
    $('vXp').style.width = Math.min(100, save.xp / PP.xpFor(save.rank) * 100) + '%';
    $('soundIc').setAttribute('href', save.sound ? '#i-sound' : '#i-mute');
  }
  var toastT = null;
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 2200);
  }
  function modal(html, onReady) {
    $('modalBox').innerHTML = html; $('modal').hidden = false;
    $('modalBox').style.animation = 'none'; void $('modalBox').offsetWidth; $('modalBox').style.animation = '';
    if (onReady) onReady($('modalBox'));
  }
  function closeModal() { $('modal').hidden = true; $('modalBox').innerHTML = ''; }
  function on(el, fn) { if (el) el.addEventListener('click', function (e) { A.unlock(); A.play('click'); fn(e); }); }

  function renderHome() {
    var c = curChar(), lv = PP.LEVELS[Math.min(save.level, PP.LEVELS.length - 1)];
    $('hero').src = c.img; $('hero').alt = c.name;
    $('playBtn').innerHTML = 'Jugar · Nivel ' + lv.n;
  }

  function renderMap() {
    var h = '';
    for (var i = 0; i < PP.LEVELS.length; i++) {
      var lv = PP.LEVELS[i], w = PP.WORLDS[lv.world];
      if (i % 10 === 0) h += '<div class="wb" style="--wc:' + w.ui + ';background-image:linear-gradient(rgba(10,5,30,.35),rgba(10,5,30,.55)),url(' + w.bg + ')"><h3>' + (lv.world + 1) + '. ' + w.name + '</h3><span>' + w.sub + '</span></div>';
      var locked = i > save.level, st = save.stars[i] || 0, dx = Math.round(Math.sin(i * 1.1) * 78);
      var cls = 'node' + (lv.type === 'boss' ? ' boss' : '') + (locked ? ' locked' : '') + (i === save.level ? ' cur' : '');
      var ty = { targets: 'BLANCOS', rally: 'PELOTEO', boss: 'JEFE' }[lv.type];
      var stars = ''; for (var s = 0; s < 3; s++) stars += '<svg class="ic' + (s < st ? ' on' : '') + '"><use href="#i-star"/></svg>';
      h += '<div class="noderow"><button class="' + cls + '" style="--wc:' + w.ui + ';--dx:' + dx + 'px" data-lv="' + i + '" aria-label="Nivel ' + lv.n + '">' +
        (locked ? ic('lock') : (lv.type === 'boss' ? ic('crown') : lv.n)) + (ty ? '<span class="ty">' + ty + '</span>' : '') + '<span class="st">' + stars + '</span></button></div>';
    }
    $('mapList').innerHTML = h; $('vStars').textContent = totalStars() + ' / ' + PP.LEVELS.length * 3;
    var cur = $('mapList').querySelector('.cur') || $('mapList').querySelector('.node');
    setTimeout(function () { if (cur) cur.scrollIntoView({ block: 'center' }); }, 30);
  }
  $('mapList').addEventListener('click', function (e) {
    var b = e.target.closest('.node'); if (!b) return;
    A.unlock(); var i = +b.dataset.lv;
    if (i > save.level) { A.play('early'); toast('Ganá el nivel ' + i + ' para desbloquearlo'); return; }
    A.play('click'); preLevel(i);
  });

  var detailChar = null;
  function renderChars() {
    var h = '';
    PP.CHARS.forEach(function (c) {
      var own = save.owned[c.id];
      h += '<button class="ch' + (c.id === save.char ? ' sel' : '') + (own ? '' : ' lock') + '" style="--ac:' + c.accent + '" data-ch="' + c.id + '"><img src="' + c.img + '" alt=""><h3>' + c.name + '</h3>' +
        (own ? '<span class="pr">' + (c.id === save.char ? 'En cancha' : 'Elegir') + '</span>' : '<span class="pr">' + ic('lock') + (c.price.coins ? ic('coin') + c.price.coins : ic('gem') + c.price.gems) + '</span>') + '</button>';
    });
    $('charGrid').innerHTML = h;
    var c = PP.CHARS.filter(function (x) { return x.id === (detailChar || save.char); })[0];
    var d = '<h3 class="disp" style="font-size:26px;color:' + c.accent + '">' + c.name + '</h3><p>' + c.tag + '</p><p><b style="color:#fff">Especial · ' + c.special.name + ':</b> ' + c.special.desc + '</p>';
    if (save.owned[c.id]) {
      Object.keys(PP.STAT_NAMES).forEach(function (k) {
        var lvl = save.up[c.id + '.' + k] || 0, v = c.stats[k] + lvl, cost = 150 + lvl * 150, maxed = v >= 12;
        d += '<div class="stat"><span>' + PP.STAT_NAMES[k] + '</span><div class="bar"><i style="width:' + (v / 12 * 100) + '%"></i></div><b>' + v + '</b>' +
          '<button class="btn small" data-up="' + k + '" ' + (maxed ? 'disabled' : '') + '>' + (maxed ? 'MÁX' : ic('coin') + cost) + '</button><small>' + PP.STAT_HELP[k] + '</small></div>';
      });
    } else {
      d += '<button class="btn lime" id="buyChar">Desbloquear ' + (c.price.coins ? ic('coin') + c.price.coins : ic('gem') + c.price.gems) + '</button>';
    }
    $('charDetail').innerHTML = d;
    on($('buyChar'), function () {
      var p = c.price;
      if ((p.coins && save.coins < p.coins) || (p.gems && save.gems < p.gems)) { toast('Te falta un poco. Ganá niveles o pasá por la tienda.'); A.play('early'); return; }
      if (p.coins) save.coins -= p.coins; if (p.gems) save.gems -= p.gems;
      save.owned[c.id] = true; save.char = c.id; persist(); A.play('win'); flash(0.6); renderChars(); refreshTop(); toast('¡' + c.name + ' se suma al equipo!');
    });
  }
  $('charGrid').addEventListener('click', function (e) {
    var b = e.target.closest('.ch'); if (!b) return; A.unlock(); A.play('click');
    detailChar = b.dataset.ch; if (save.owned[detailChar]) { save.char = detailChar; persist(); }
    renderChars();
  });
  $('charDetail').addEventListener('click', function (e) {
    var b = e.target.closest('[data-up]'); if (!b) return; A.unlock();
    var c = curChar(), k = b.dataset.up, key = c.id + '.' + k, lvl = save.up[key] || 0, cost = 150 + lvl * 150;
    if (save.coins < cost) { toast('Te faltan monedas'); A.play('early'); return; }
    save.coins -= cost; save.up[key] = lvl + 1; persist(); A.play('star', lvl % 3); renderChars(); refreshTop();
  });

  function renderShop() {
    var h = '';
    PP.SHOP.forEach(function (it) {
      var gone = (it.once && save.bought[it.sku]) || (it.give.pass && save.pass);
      h += '<div class="card item" style="--c:' + it.color + '"><div class="gfx">' + (it.give.pass ? ic('crown') : it.give.lives ? ic('heart') : ic('gem')) + '</div><div class="tx"><h3>' + it.title +
        (it.badge ? '<span class="badge">' + it.badge + '</span>' : '') + '</h3><p>' + (it.desc || describe(it.give)) + '</p></div><button class="btn small lime" data-sku="' + it.sku + '" ' + (gone ? 'disabled' : '') + '>' + (gone ? 'Listo' : it.price) + '</button></div>';
    });
    var cp = PP.GEM_SINKS.coinPack;
    h += '<div class="card item" style="--c:#FFB020"><div class="gfx">' + ic('coin') + '</div><div class="tx"><h3>Bolsa de monedas</h3><p>' + cp.coins + ' monedas para mejorar a tus jugadores</p></div><button class="btn small" data-sku="coins">' + ic('gem') + cp.gems + '</button></div>';
    h += '<div class="card item" style="--c:#FF3D8B"><div class="gfx">' + ic('heart') + '</div><div class="tx"><h3>Recargar vidas</h3><p>Volvé a la cancha ya mismo con las 5 vidas</p></div><button class="btn small" data-sku="lives">' + ic('gem') + PP.GEM_SINKS.refillLives + '</button></div>';
    $('shopList').innerHTML = h;
  }
  function describe(g) {
    var p = []; if (g.gems) p.push(g.gems + ' gemas'); if (g.coins) p.push(g.coins + ' monedas'); if (g.lives) p.push('vidas llenas'); return p.join(' + ');
  }
  $('shopList').addEventListener('click', function (e) {
    var b = e.target.closest('[data-sku]'); if (!b) return; A.unlock();
    buy(b.dataset.sku); renderShop();
  });
  // Punto único de compra: acá se conecta la pasarela real (tiendas de apps, Mercado Pago, Stripe)
  function buy(sku) {
    if (sku === 'coins') {
      var cp = PP.GEM_SINKS.coinPack; if (save.gems < cp.gems) { toast('Te faltan gemas'); A.play('early'); return false; }
      save.gems -= cp.gems; give({ coins: cp.coins }); toast('+' + cp.coins + ' monedas'); return true;
    }
    if (sku === 'lives') {
      if (save.lives >= MAX_LIVES || save.pass) { toast('Ya tenés todas las vidas'); return false; }
      if (save.gems < PP.GEM_SINKS.refillLives) { toast('Te faltan gemas'); A.play('early'); return false; }
      save.gems -= PP.GEM_SINKS.refillLives; give({ lives: 5 }); toast('¡Vidas recargadas!'); return true;
    }
    var it = PP.SHOP.filter(function (x) { return x.sku === sku; })[0]; if (!it) return false;
    PP.Store.purchase(it, function (ok) {
      if (!ok) return;
      save.bought[sku] = (save.bought[sku] || 0) + 1; give(it.give); A.play('chest'); flash(0.5);
      toast('Compra simulada: ' + it.title); renderShop();
    });
    return true;
  }
  PP.Store = { purchase: function (item, cb) { cb(true); } };            // demo: siempre aprueba
  PP.Online = { enabled: false, submitScore: function () {}, findMatch: function () {} }; // gancho para ranking y partidas en línea

  function renderMissions() {
    ensureMissions();
    var h = '';
    save.missions.list.forEach(function (m, i) {
      var def = PP.MISSION_POOL.filter(function (x) { return x.id === m.id; })[0], ready = m.p >= m.n && !m.done;
      h += '<div class="card"><div class="item"><div class="tx"><h3>' + def.text.replace('{n}', m.n) + '</h3><div class="bar" style="height:12px;border-radius:6px;margin:8px 0"><i style="width:' + Math.min(100, m.p / m.n * 100) + '%"></i></div><p>' + Math.min(m.p, m.n) + ' / ' + m.n + '</p></div>' +
        '<button class="btn small ' + (ready ? 'lime pulse' : 'ghost') + '" data-ms="' + i + '" ' + (ready ? '' : 'disabled') + '>' + (m.done ? 'Cobrada' : (def.reward.coins ? ic('coin') + def.reward.coins : ic('gem') + def.reward.gems)) + '</button></div></div>';
    });
    $('missionList').innerHTML = h;
    $('chestCard').innerHTML = '<div class="item" style="--c:#FFB020"><div class="gfx">' + ic('crown') + '</div><div class="tx"><h3>Cofre de victorias</h3><div class="bar" style="height:12px;border-radius:6px;margin:8px 0"><i style="width:' + (save.chest / 3 * 100) + '%"></i></div><p>' + save.chest + ' / 3 niveles ganados</p></div></div>';
  }
  $('missionList').addEventListener('click', function (e) {
    var b = e.target.closest('[data-ms]'); if (!b) return; A.unlock();
    var m = save.missions.list[+b.dataset.ms], def = PP.MISSION_POOL.filter(function (x) { return x.id === m.id; })[0];
    if (m.done || m.p < m.n) return; m.done = true; give(def.reward); flash(0.4); renderMissions();
  });

  function showDaily(force) {
    var t = today(); if (save.daily.last === t && !force) return false;
    var y = new Date(Date.now() - 864e5), ys = y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate();
    var streak = save.daily.last === ys ? save.daily.streak % 7 : 0, h = '<h2>Premio diario</h2><p>Volvé todos los días: el día 7 es el premio gordo.</p><div class="days">';
    PP.DAILY.forEach(function (r, i) {
      h += '<div class="day' + (i < streak ? ' done' : '') + (i === streak ? ' today' : '') + '">Día ' + (i + 1) + '<b>' + (r.coins ? ic('coin') + r.coins : '') + (r.gems ? ' ' + ic('gem') + r.gems : '') + '</b></div>';
    });
    h += '</div><button class="btn lime big" id="dailyOk">¡Cobrar!</button>';
    modal(h, function () {
      on($('dailyOk'), function () {
        save.daily = { last: t, streak: streak + 1 }; give(PP.DAILY[streak]); flash(0.5); S.confetti(80); closeModal();
      });
    });
    return true;
  }
  function showNoLives() {
    modal('<h2>Sin vidas</h2><p>Se recupera una vida cada 15 minutos. O volvé a la cancha ahora.</p><div class="row">' +
      '<button class="btn lime" id="nlGems">Recargar ' + ic('gem') + PP.GEM_SINKS.refillLives + '</button>' +
      '<button class="btn cyan" id="nlAd">Ver anuncio · +1 ' + ic('heart') + '</button></div>' +
      '<button class="btn small ghost" id="nlPass">Pase Pelotita: vidas infinitas</button><button class="btn small ghost" id="nlClose">Esperar</button>', function () {
      on($('nlGems'), function () { if (buy('lives')) closeModal(); });
      on($('nlAd'), function () {
        var b = $('nlAd'), n = 3; b.disabled = true; b.textContent = 'Anuncio de prueba… ' + n;
        var iv = setInterval(function () { n--; if (n <= 0) { clearInterval(iv); save.lives = Math.min(MAX_LIVES, save.lives + 1); persist(); refreshTop(); closeModal(); toast('+1 vida'); } else b.textContent = 'Anuncio de prueba… ' + n; }, 700);
      });
      on($('nlPass'), function () { closeModal(); go('shop'); });
      on($('nlClose'), closeModal);
    });
  }

  function preLevel(i) {
    var lv = PP.LEVELS[i], c = curChar(), w = PP.WORLDS[lv.world];
    var rivalImg = lv.boss ? '<img src="' + lv.boss.img + '" alt="">' : '';
    var title = { match: 'Partido', targets: 'Puntería', rally: 'Peloteo', boss: '¡Jefe final!' }[lv.type];
    modal('<p style="color:' + w.ui + '">' + w.name + ' · Nivel ' + lv.n + '</p><h2>' + title + '</h2>' +
      '<div class="vs"><img src="' + c.img + '" alt="">' + (lv.boss ? '<b>VS</b>' + rivalImg : '') + '</div>' +
      (lv.boss ? '<p><b style="color:#fff">' + lv.boss.name + ':</b> «' + lv.boss.line + '»</p>' : '') +
      '<p style="font-size:18px;color:#fff">' + lv.goal + '</p>' +
      '<div class="row"><button class="btn ghost" id="plNo">Volver</button><button class="btn lime big" id="plGo">¡A jugar!</button></div>', function () {
      on($('plNo'), closeModal);
      on($('plGo'), function () { closeModal(); startLevel(i); });
    });
  }

  /* ================= Efectos de pantalla ================= */
  function flash(a) {
    var f = $('flash'); f.style.transition = 'none'; f.style.opacity = a; void f.offsetWidth;
    f.style.transition = 'opacity .35s'; f.style.opacity = 0;
  }
  function pop(text, cls, wp) {
    var d = document.createElement('div'); d.className = 'pop ' + (cls || ''); d.textContent = text;
    if (wp) { var p = S.project(wp); d.style.left = clamp(p.x, 70, innerWidth - 70) + 'px'; d.style.top = clamp(p.y, 90, innerHeight - 60) + 'px'; }
    else { d.style.left = '50%'; d.style.top = '40%'; }
    $('pops').appendChild(d); setTimeout(function () { d.remove(); }, cls && cls.indexOf('big') >= 0 ? 1300 : 900);
  }

  /* ================= Partido ================= */
  var G = null, me = null, opp = null, curWorld = -1;
  var GR = 11, HOME_ME = 7.6, HOME_OP = -7.4;

  function newBall() { return { x: 0, y: 1, z: 0, vx: 0, vy: 0, vz: 0, bounces: 0, walls: 0, last: null, live: false, side: '', x3: false, willX3: false, net: false }; }
  function stepBall(b, dt, ev) {
    var pz = b.z;
    b.vy -= GR * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    if (!b.x3 && (pz > 0) !== (b.z > 0) && b.y < 0.98) { b.z = pz > 0 ? 0.1 : -0.1; b.vz *= -0.12; b.vx *= 0.3; b.net = true; ev.push('net'); }
    if (b.y < 0.17) {
      b.y = 0.17;
      if (b.vy < 0) { b.vy = -b.vy * 0.76; b.vx *= 0.82; b.vz *= 0.82; b.bounces++; b.side = b.z > 0 ? 'me' : 'opp'; ev.push('bounce'); if (b.vy < 1.2) b.vy = 0; }
    }
    if (!b.x3) {
      if (b.z > 9.83 && b.vz > 0 && b.y < 4) { b.z = 9.83; b.vz *= -0.62; b.walls++; ev.push('wall'); }
      if (b.z < -9.83 && b.vz < 0 && b.y < 4) { b.z = -9.83; b.vz *= -0.62; b.walls++; ev.push('wall'); }
      if (Math.abs(b.x) > 4.83 && b.x * b.vx > 0 && b.y < 3) { b.x = b.x > 0 ? 4.83 : -4.83; b.vx *= -0.62; b.walls++; ev.push('wall'); }
    }
  }
  // Lanza la pelota para que pique en (tx, tz) después de T segundos, pasando la red
  function launch(b, tx, tz, T, who) {
    for (var i = 0; i < 8; i++) {
      b.vx = (tx - b.x) / T; b.vz = (tz - b.z) / T; b.vy = (0.17 - b.y + 0.5 * GR * T * T) / T;
      if ((b.z > 0) === (tz > 0)) break;
      var tn = -b.z / b.vz, yn = b.y + b.vy * tn - 0.5 * GR * tn * tn;
      if (yn > 1.25) break; T *= 1.1;
    }
    b.bounces = 0; b.walls = 0; b.last = who; b.live = true; b.net = false; b.x3 = false; b.willX3 = false; b.side = '';
  }
  // Simula hacia adelante y elige el momento ideal de golpe para quien recibe
  function predict(b, side) {
    var c = {}; for (var k in b) c[k] = b[k];
    var ev = [], dt = 1 / 90, t = 0, t1 = -1, t2 = -1, samples = [], wallAt = -1;
    while (t < 5) {
      ev.length = 0; stepBall(c, dt, ev); t += dt;
      for (var i = 0; i < ev.length; i++) {
        if (ev[i] === 'net') return null;
        if (ev[i] === 'wall') { if (c.bounces === 0) return null; if (wallAt < 0) wallAt = t; }
        if (ev[i] === 'bounce') { if (c.bounces === 1) { if (c.side !== side) return null; t1 = t; } else if (c.bounces === 2) t2 = t; }
      }
      if (t1 >= 0) samples.push(t, c.x, c.y, c.z);
      if (t2 >= 0) break;
    }
    if (t1 < 0) return null;
    if (t2 < 0) t2 = t;
    var a = t1 + (t2 - t1) * 0.28, z = t1 + (t2 - t1) * 0.74, best = -1, bd = 1e9;
    for (var s = 0; s < samples.length; s += 4) {
      var st = samples[s]; if (st < a || st > z) continue;
      var d = Math.abs(samples[s + 2] - 1.15) + Math.abs(st - (t1 + (t2 - t1) * 0.5)) * 0.4;
      if (d < bd) { bd = d; best = s; }
    }
    if (best < 0) best = Math.floor(samples.length / 8) * 4;
    return { t: G.t + samples[best], x: samples[best + 1], y: samples[best + 2], z: samples[best + 3], wall: wallAt >= 0 && wallAt < samples[best], t1: G.t + t1, t2: G.t + t2 };
  }

  function startLevel(idx) {
    tickLives();
    if (!save.pass && save.lives <= 0) { showNoLives(); return; }
    var lv = PP.LEVELS[idx], c = curChar();
    if (curWorld !== lv.world) { S.setWorld(lv.world); curWorld = lv.world; }
    if (me) me.remove(); if (opp) opp.remove();
    me = S.makeChar(c.look, { accent: c.accent, facing: Math.PI, scale: 1.25 });
    opp = S.makeChar(lv.look, { accent: lv.look.chest, facing: 0, scale: lv.type === 'boss' ? 1.4 : 1.12 });
    me.speed = 6.2 + stat('def') * 0.32; opp.speed = 3;
    me.place(0, HOME_ME); opp.place(0, HOME_OP);
    opp.g.visible = lv.type !== 'targets'; S.showMachine(lv.type === 'targets');
    opp.aura = lv.type === 'boss' ? 0.55 : 0;
    G = { lv: lv, idx: idx, type: lv.type, me: 0, opp: 0, toWin: lv.toWin || 0, phase: 'intro', t: 0, rt: 0, rally: 0, combo: 0, bestCombo: 0, bestRally: 0,
      perfects: 0, hits: 0, x3: 0, supers: 0, meter: 0, armed: false, shield: 0, slow: 0, ball: newBall(), plan: null, queued: null, oppPlan: null,
      hitStop: 0, slowmo: 0, timers: [], ballsLeft: lv.balls || 0, targetsHit: 0, misses: 0, targets: [], over: false, serveT: 0, cool: 0, pointDone: false,
      paused: false, oppShots: 0, tutHits: 0, freeze: false, char: c, score: 0, continued: false };
    for (var i = 0; i < 3; i++) S.setTarget(i, null);
    if (G.type === 'targets') for (var j = 0; j < 3; j++) placeTarget(j);
    S.mode = 'play'; S.setBall(G.ball, false); S.ring(null);
    screens.forEach(function (s) { $(s).hidden = true; }); $('top').hidden = true; $('hud').hidden = false;
    $('nMe').textContent = lv.type === 'targets' ? 'Blancos' : lv.type === 'rally' ? 'Golpes' : c.name;
    $('nOp').textContent = lv.type === 'targets' || lv.type === 'rally' ? 'Meta' : lv.rival; $('goal').textContent = lv.goal;
    $('superBtn').style.setProperty('--ac', c.accent);
    hud(); setHint('');
    pop(lv.type === 'boss' ? '¡' + lv.boss.name + '!' : (G.type === 'targets' ? '¡Puntería!' : G.type === 'rally' ? '¡Peloteo!' : 'VS ' + lv.rival), 'big ' + (lv.type === 'boss' ? 'pink' : 'gold'));
    A.play(lv.type === 'boss' ? 'warn' : 'ready');
    after(1.3, beginPoint);
  }
  function after(sec, fn) { G.timers.push({ t: G.rt + sec, fn: fn }); }
  function setHint(t) { $('hint').textContent = t; }

  function placeTarget(i) {
    var p = { x: rnd(-3.4, 3.4), z: -rnd(3.4, 8.2) }, tries = 0;
    while (tries++ < 20 && G.targets.some(function (o, k) { return o && k !== i && Math.hypot(o.x - p.x, o.z - p.z) < 2.9; })) p = { x: rnd(-3.4, 3.4), z: -rnd(3.4, 8.2) };
    G.targets[i] = p; S.setTarget(i, p);
  }

  function hud() {
    if (!G) return;
    if (G.type === 'targets') { $('pMe').textContent = G.targetsHit; $('pOp').textContent = G.lv.need; $('extra').innerHTML = 'Pelotas: ' + G.ballsLeft; }
    else if (G.type === 'rally') {
      $('pMe').textContent = G.hits; $('pOp').textContent = G.lv.need; var hs = '';
      for (var i = 0; i < G.lv.misses; i++) hs += ic('heart', i < G.lv.misses - G.misses ? '' : 'opacity:.25');
      $('extra').innerHTML = hs;
    } else { $('pMe').textContent = G.me; $('pOp').textContent = G.opp; $('extra').innerHTML = ''; }
    var pct = Math.min(100, G.meter / METER_MAX * 100), sb = $('superBtn');
    sb.style.setProperty('--pct', pct); sb.classList.toggle('full', pct >= 100);
    $('superTx').textContent = pct >= 100 ? '¡YA!' : 'ESPECIAL';
    var cb = $('combo'); cb.classList.toggle('on', G.combo >= 2); $('comboN').textContent = 'x' + G.combo;
  }
  function bump(id) { var e = $(id); e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); }

  function beginPoint() {
    if (!G || G.over) return;
    G.pointDone = false; G.rally = 0; G.queued = null; G.plan = null; G.oppPlan = null; G.oppShots = 0;
    me.setMood('idle'); opp.setMood('idle'); me.goTo(0, HOME_ME); opp.goTo(0, HOME_OP);
    S.setBallStyle('#D8FF3A', 0); $('lines').style.opacity = 0;
    if (G.type === 'targets') {
      if (G.ballsLeft <= 0) { endLevel(G.targetsHit >= G.lv.need); return; }
      G.phase = 'wait'; G.ball.live = false; S.setBall(G.ball, false);
      after(0.7, function () {
        G.ballsLeft--; hud(); var b = G.ball; b.x = 0; b.y = 1.3; b.z = -8.2;
        launch(b, rnd(-3, 3), rnd(5.2, 7.2), 1.45, 'opp'); G.phase = 'toMe'; A.play('pop'); S.burst({ x: 0, y: 1.3, z: -8 }, '#FF3D8B', 14, 4);
        setPlanForMe();
      });
      if (save.tut < 2) setHint('Apuntá a los blancos con la dirección del dedo');
      return;
    }
    G.phase = 'serve'; G.serveT = 0; G.ball.live = false;
    setHint(save.tut < 1 ? 'Deslizá hacia arriba para sacar' : '');
    if (G.type !== 'targets' && G.me === G.toWin - 1 && G.opp === G.toWin - 1 && G.toWin > 0) { pop('¡PUNTO DE ORO!', 'big gold'); A.play('warn'); S.excite = 1; }
  }

  function setPlanForMe() {
    G.plan = predict(G.ball, 'me'); G.queued = null;
    if (G.plan) { me.goTo(clamp(G.plan.x - 0.55, -4.4, 4.4), clamp(G.plan.z + 0.1, 1.4, 9.5)); if (PP.auto) G.plan.auto = PP.auto.jitter ? rnd(-PP.auto.jitter, PP.auto.jitter) : 0; }
  }

  /* ---------- Golpes del jugador ---------- */
  function quality(dtm) {
    var a = Math.abs(dtm), wp = 0.052 + stat('ref') * 0.004 + stat('pre') * 0.003;
    if (G.slow > 0) return 'perfect';
    if (a <= wp) return 'perfect'; if (a <= 0.21 + stat('ref') * 0.006) return 'good'; if (a <= 0.38) return 'ok'; return 'bad';
  }
  function swipe(aim) {
    if (!G || G.paused || G.over) return;
    if (G.freeze) G.freeze = false;
    if (G.phase === 'serve') {
      var s = Math.abs(Math.sin(G.serveT * 2.6));
      playerShot(aim, s > 0.9 ? 'perfect' : (s > 0.6 ? 'good' : 'ok'), true); return;
    }
    if (G.phase !== 'toMe' || !G.plan || G.queued || G.rt < G.cool) return;
    var dtm = G.t - G.plan.t;
    if (dtm < -0.55) { pop('¡Muy pronto!', 'bad', { x: me.x, y: 2.4, z: me.z }); A.play('early'); G.cool = G.rt + 0.25; return; }
    G.queued = { aim: aim, q: quality(dtm), at: Math.max(G.t, G.plan.t) };
    me.swing(G.plan.y > 1.75 && !aim.lob ? 'smash' : (aim.lob ? 'lob' : 'drive'));
  }
  function playerShot(aim, q, serve) {
    var b = G.ball, c = G.char, high = !serve && b.y > 1.75, wall = !serve && b.walls > 0, label = '', stretch = false;
    if (!serve) {
      var d = Math.hypot(me.x + 0.55 - b.x, me.z - b.z);
      if (d > 3.1) { pop('¡No llegás!', 'bad', { x: me.x, y: 2.4, z: me.z }); G.queued = null; G.plan = null; A.play('early'); return; }
      if (d > 1.9) { stretch = true; if (q === 'perfect' || q === 'good') q = 'ok'; }
    } else me.swing('drive');
    var tx = aim.x * 4.1, tz = -(3.2 + aim.depth * 5.6), pot = stat('pot');
    var T = ({ perfect: 0.95, good: 1.2, ok: 1.5, bad: 1.6 })[q] * (1 - (pot - 5) * 0.022), sup = false, fault = false;
    if (serve) { tz = -clamp(4 + aim.depth * 2.4, 4, 6.4); T = Math.max(T, 1.1); label = 'SAQUE'; }
    else if (aim.lob) { T = 2.0; tz = -8.2; label = '¡GLOBO!'; }
    else if (high) { T *= 0.72; label = q === 'perfect' ? '¡POR 3!' : (Math.abs(aim.x) > 0.45 ? '¡VÍBORA!' : '¡BANDEJA!'); }
    else if (wall) label = '¡SALIDA DE PARED!';
    else if (aim.depth < 0.4) label = '¡DEJADA!';
    else if (b.z < 4.2) label = '¡VOLEA!';
    else label = b.x >= me.x ? '¡DERECHA!' : '¡REVÉS!';
    if (stretch) label = '¡ESTIRADA!';
    if (q === 'bad' && Math.random() < 0.55) { fault = true; if (Math.random() < 0.5) { tz = 0.9; T = 0.8; } else { tz = -11.8; T = 1.0; } }
    if (G.armed && !fault) {
      sup = true; G.armed = false; me.aura = 0; T *= 0.66; q = 'perfect'; label = '¡' + c.special.name.toUpperCase() + '!';
      $('lines').style.opacity = 1; after(0.9, function () { $('lines').style.opacity = 0; });
    }
    if (G.type === 'targets' && !fault) {
      var snap = (q === 'perfect' ? 1.7 : q === 'good' ? 1.15 : 0.6) + stat('pre') * 0.05, bi = -1, bd = snap;
      G.targets.forEach(function (t, i) { var dd = Math.hypot(t.x - tx, t.z - tz); if (dd < bd) { bd = dd; bi = i; } });
      if (bi >= 0) { tx = G.targets[bi].x; tz = G.targets[bi].z; } else { tx += rnd(-0.8, 0.8); }
    }
    b.y = Math.max(b.y, 0.6);
    launch(b, clamp(tx, -4.3, 4.3), tz, T, 'me');
    if (high && q === 'perfect' && !aim.lob && !fault && G.type !== 'targets') b.willX3 = true;
    b.unstop = sup; G.lastQ = q; G.lastSup = sup;
    // Sensación de impacto
    var hp = { x: b.x, y: b.y, z: b.z }, col = q === 'perfect' ? c.accent : '#ffffff';
    if (q === 'perfect') { G.perfects++; mission('perf', 1); A.play(high || sup ? 'smash' : 'perfect', Math.min(G.combo, 9)); S.burst(hp, c.accent, 46, 9, 0.7); S.burst(hp, '#ffffff', 16, 5, 0.4); S.shock(hp, c.accent); S.shake(sup ? 0.9 : 0.45); S.punch(sup ? 1 : 0.5); G.hitStop = sup ? 0.14 : 0.07; A.vibrate(sup ? 60 : 25); flash(sup ? 0.5 : 0.12); }
    else if (q === 'good') { A.play('hit'); S.burst(hp, '#22E1FF', 18, 6, 0.5); S.shake(0.18); G.hitStop = 0.03; A.vibrate(12); }
    else { A.play('weak'); S.burst(hp, '#ffffff', 6, 3, 0.3); }
    S.setBallStyle(sup ? c.accent : (q === 'perfect' ? c.accent : '#D8FF3A'), sup ? 2.2 : (q === 'perfect' ? 1 : 0));
    pop(label, q === 'perfect' ? 'gold' : 'good', { x: hp.x, y: hp.y + 1.5, z: hp.z });
    pop({ perfect: '¡PERFECTO!', good: 'Bien', ok: stretch ? 'Justo' : 'Flojo', bad: 'Mal' }[q], q, { x: hp.x, y: hp.y + 0.6, z: hp.z });
    if (q === 'perfect' || q === 'good') { G.combo++; G.bestCombo = Math.max(G.bestCombo, G.combo); mission('combo', G.combo, true); bump('combo'); }
    else G.combo = 0;
    if (!serve) { G.hits++; G.rally++; G.bestRally = Math.max(G.bestRally, G.rally); mission('rally', G.rally, true); }
    G.score += (q === 'perfect' ? 150 : q === 'good' ? 80 : 30) * Math.max(1, G.combo) * (sup && c.id === 'tornado' ? 2 : 1);
    if (!sup) G.meter = Math.min(METER_MAX, G.meter + (q === 'perfect' ? 2 : q === 'good' ? 1 : 0.3) * (1 + (stat('res') - 5) * 0.08));
    if (save.tut < 1 && !serve) { G.tutHits++; if (G.tutHits >= 3) { save.tut = 1; persist(); setHint(''); } }
    if (serve) setHint(save.tut < 1 ? 'Cuando el aro se cierra, deslizá. La dirección apunta el tiro.' : '');
    G.queued = null; G.plan = null; G.phase = 'toOpp'; S.ring(null);
    me.goTo(clamp(me.x * 0.4, -2, 2), HOME_ME); hud();
    if (G.type === 'rally' && G.hits >= G.lv.need) { after(0.5, function () { endLevel(true); }); }
    if (G.type !== 'targets') planOpp(q, stretch);
  }

  /* ---------- Rival ---------- */
  function planOpp(q, stretch) {
    var b = G.ball, d = G.lv.diff, boss = G.type === 'boss', p = predict(b, 'opp');
    G.oppPlan = null; if (!p) return;
    var sx = clamp(p.x + 0.55, -4.4, 4.4), sz = clamp(p.z - 0.1, -9.5, -1.4);
    opp.speed = 3.6 + d * 0.11 + (boss ? 0.6 : 0);
    var avail = p.t - G.t - Math.max(0.1, 0.3 - d * 0.005), dist = Math.hypot(sx - opp.x, sz - opp.z);
    var reach = dist <= opp.speed * avail + 1.15, far = dist > opp.speed * avail + 0.3;
    var perr = Math.max(0.02, 0.14 - d * 0.0035) + G.rally * 0.022 + ({ perfect: Math.max(0.02, 0.09 - d * 0.002), good: 0.02, ok: -0.08, bad: -0.08 })[q] + (far ? 0.18 : 0) + (stat('pot') - 5) * 0.01;
    if (G.rally === 0) { reach = true; perr *= 0.4; opp.speed = Math.max(opp.speed, 8); }
    if (boss) perr *= 0.72;
    if (G.type === 'rally') { reach = true; perr = 0; opp.speed = 12; }
    if (save.tut < 1 && G.rally < 3) { reach = true; perr = 0; opp.speed = 9; }
    if (b.willX3 || b.unstop) { reach = false; opp.speed = Math.max(opp.speed, 5); }
    if (b.unstop && boss && Math.random() < 0.25) { reach = true; perr = 0.5; opp.speed = 14; }
    opp.goTo(sx, sz);
    G.oppPlan = { t: p.t, reach: reach, err: Math.random() < perr, y: p.y };
  }
  function oppShot() {
    var b = G.ball, d = G.lv.diff, boss = G.type === 'boss', pl = G.oppPlan; G.oppPlan = null; G.oppShots++;
    opp.swing(pl.y > 1.75 ? 'smash' : 'drive');
    var hp = { x: b.x, y: b.y, z: b.z }; b.y = Math.max(b.y, 0.6);
    if (pl.err) {
      if (Math.random() < 0.5) launch(b, b.x * 0.5, -0.9, 0.8, 'opp'); else launch(b, rnd(-3, 3), 11.8, 1.0, 'opp');
      A.play('weak'); S.burst(hp, '#ffffff', 6, 3, 0.3); S.setBallStyle('#D8FF3A', 0); G.phase = 'toMe'; G.plan = null; opp.goTo(0, HOME_OP); return;
    }
    var T = Math.max(0.76, 1.5 - d * 0.018) - (boss ? 0.06 : 0), spread = Math.min(4, 1.5 + d * 0.065);
    var smart = Math.random() < 0.3 + d * 0.017, tx = smart ? -Math.sign(me.x || (Math.random() - 0.5)) * rnd(1.2, spread) : rnd(-spread, spread);
    var tz = 4.6 + Math.random() * (1.4 + Math.min(2.8, d * 0.07)), lobP = boss ? G.lv.boss.lob : Math.max(0.05, 0.13 - d * 0.002), fire = false;
    if (G.type === 'rally') { T = Math.max(0.95, 1.5 - G.hits * 0.022); tx = rnd(-3, 3) * Math.min(1, 0.4 + G.hits * 0.04); lobP = 0.1; }
    if (save.tut < 1) { T = 1.7; tx = rnd(-1.5, 1.5); tz = 5.5; lobP = 0; }
    if (Math.random() < lobP) { T = 2.05; tz = rnd(6.6, 7.8); }
    else if (boss && G.oppShots % 4 === 0) { fire = true; T *= 0.8; A.play('warn'); pop('¡CUIDADO!', 'bad', { x: hp.x, y: hp.y + 1.6, z: hp.z }); }
    launch(b, tx, tz, T, 'opp');
    A.play(fire ? 'smash' : 'hit'); S.burst(hp, fire ? '#FF5252' : '#ffffff', fire ? 30 : 10, fire ? 8 : 4, 0.4); if (fire) S.shake(0.4);
    S.setBallStyle(fire ? '#FF5252' : '#D8FF3A', fire ? 1.6 : 0);
    G.phase = 'toMe'; opp.goTo(clamp(opp.x * 0.3, -1.5, 1.5), HOME_OP); setPlanForMe();
  }

  /* ---------- Eventos de la pelota y puntos ---------- */
  function onEvents(ev) {
    var b = G.ball;
    for (var i = 0; i < ev.length; i++) {
      var e = ev[i];
      if (e === 'bounce') {
        A.play('bounce'); S.burst({ x: b.x, y: 0.2, z: b.z }, '#ffffff', 5, 2, 0.25); S.shock({ x: b.x, y: 0, z: b.z }, '#ffffff', true);
        if (G.pointDone) continue;
        if (b.bounces === 1) {
          if (b.side === b.last) { if (G.type === 'targets') { pop('Corta', 'bad', b); nextBall(); } else point(b.last === 'me' ? 'opp' : 'me', '¡No pasó la red!', 'No pasó'); continue; }
          if (G.type === 'targets' && b.last === 'me') { checkTargets(); continue; }
          if (b.willX3) {
            b.x3 = true; b.vy = 13; b.vx = (b.x >= 0 ? 1 : -1) * 7.5; b.vz = -3; S.setBallStyle('#FFD23A', 2.4);
            S.fountain({ x: b.x, y: 0.3, z: b.z }, '#FFD23A', 50, 9); S.shake(0.8); A.play('smash'); G.slowmo = 0.5;
          }
        } else if (b.bounces === 2) {
          if (G.type === 'targets') { nextBall(); continue; }
          point(b.last, '¡PUNTAZO!', 'Doble pique');
        }
      } else if (e === 'wall') {
        A.play('glass'); S.burst({ x: b.x, y: b.y, z: b.z }, S.world.neon, 12, 4, 0.35);
        if (!G.pointDone && b.bounces === 0) {
          if (G.type === 'targets') { pop('Afuera', 'bad', b); nextBall(); } else point(b.last === 'me' ? 'opp' : 'me', '¡Se fue larga!', 'Afuera');
        }
      } else if (e === 'net') {
        A.play('net');
        if (!G.pointDone) { if (G.type === 'targets') { pop('Red', 'bad', b); nextBall(); } else point(b.last === 'me' ? 'opp' : 'me', '¡A la red!', 'Red'); }
      }
    }
  }
  function nextBall() { if (G.pointDone) return; G.pointDone = true; G.phase = 'dead'; G.plan = null; S.ring(null); after(0.6, beginPoint); }
  function checkTargets() {
    var b = G.ball, hit = -1;
    G.targets.forEach(function (t, i) { if (Math.hypot(t.x - b.x, t.z - b.z) < 1.45) hit = i; });
    if (hit >= 0) {
      G.targetsHit++; var t = G.targets[hit], p = { x: t.x, y: 0.4, z: t.z };
      S.fountain(p, '#FF3D8B', 60, 9); S.fountain(p, '#FFE83A', 30, 6); S.shock(p, '#FF3D8B', true); S.shake(0.5); A.play('target'); S.excite = 1; flash(0.15);
      pop('¡BLANCO! ' + G.targetsHit + '/' + G.lv.need, 'gold', { x: t.x, y: 2, z: t.z }); bump('pMe'); placeTarget(hit);
      if (save.tut < 2) { save.tut = 2; persist(); setHint(''); }
    } else pop('Casi…', 'ok', { x: b.x, y: 1, z: b.z });
    hud(); nextBall();
  }

  function point(who, winMsg, loseMsg) {
    if (G.pointDone || G.over) return;
    G.pointDone = true; G.phase = 'dead'; G.plan = null; G.queued = null; G.oppPlan = null; S.ring(null); G.freeze = false;
    var b = G.ball, x3 = b.x3;
    if (G.type === 'rally') {
      if (who === 'me') { G.hits += 2; pop(x3 ? '¡POR 3! +2' : '¡Punto! +2', 'big gold'); A.play('point'); S.excite = 1; if (x3) { G.x3++; mission('x3', 1); } }
      else { G.misses++; G.combo = 0; pop(loseMsg, 'big bad'); A.play('lose'); S.shake(0.3); me.setMood('sad'); }
      hud();
      if (G.hits >= G.lv.need) after(0.9, function () { endLevel(true); });
      else if (G.misses >= G.lv.misses) after(1.1, function () { endLevel(false); });
      else after(1.1, beginPoint);
      return;
    }
    if (who === 'me') {
      G.me++; bump('pMe'); me.setMood('happy'); opp.setMood('sad'); S.excite = 1; A.play('point'); A.play('crowd');
      if (x3) { G.x3++; mission('x3', 1); pop('¡LA SACASTE POR 3!', 'big gold'); S.confetti(90); for (var i = 0; i < 4; i++) S.firework(); flash(0.3); }
      else pop(G.lastSup ? '¡IMPARABLE!' : winMsg, 'big gold');
      S.fountain({ x: me.x, y: 1, z: me.z }, G.char.accent, 40, 7);
      G.slowmo = Math.max(G.slowmo, G.me >= G.toWin ? 0.9 : 0.25);
    } else {
      G.opp++; bump('pOp'); me.setMood('sad'); opp.setMood('happy'); G.combo = 0; A.play('lose'); S.shake(0.35);
      pop(loseMsg, 'big bad');
    }
    hud();
    if (G.me >= G.toWin) after(1.5, function () { endLevel(true); });
    else if (G.opp >= G.toWin) after(1.4, function () { endLevel(false); });
    else after(1.5, beginPoint);
  }

  /* ---------- Especial ---------- */
  function useSuper() {
    if (!G || G.over || G.paused || G.meter < METER_MAX) return;
    var c = G.char; G.meter = 0; G.supers++; mission('super', 1);
    A.play('super'); flash(0.45); S.shake(0.5); S.punch(1); pop('¡' + c.special.name.toUpperCase() + '!', 'big pink');
    S.fountain({ x: me.x, y: 0.5, z: me.z }, c.accent, 70, 10); me.aura = 1;
    if (c.id === 'muro') G.shield = 3; else if (c.id === 'relampago') G.slow = 6; else G.armed = true;
    hud();
  }

  /* ---------- Fin de nivel ---------- */
  function endLevel(win) {
    if (!G || G.over) return; G.over = true; G.phase = 'over'; S.ring(null); setHint('');
    var lv = G.lv, idx = G.idx, stars = 0;
    save.best.rally = Math.max(save.best.rally, G.bestRally); save.best.combo = Math.max(save.best.combo, G.bestCombo);
    if (win) {
      if (G.type === 'targets') stars = G.targetsHit >= lv.need + 3 ? 3 : (G.targetsHit >= lv.need + 1 ? 2 : 1);
      else if (G.type === 'rally') stars = G.misses === 0 ? 3 : (G.misses === 1 ? 2 : 1);
      else stars = G.opp === 0 ? 3 : (G.opp <= Math.floor(lv.toWin / 2) ? 2 : 1);
      if (G.continued) stars = Math.min(stars, 1);
      var first = !save.stars[idx], gained = Math.max(0, stars - (save.stars[idx] || 0));
      var coins = (50 + idx * 12 + stars * 25 + G.perfects * 3) * (save.pass ? 2 : 1), xp = 40 + idx * 6 + stars * 10, gems = (lv.type === 'boss' && first) ? 15 : 0;
      save.stars[idx] = Math.max(save.stars[idx] || 0, stars);
      if (idx >= save.level && idx < PP.LEVELS.length - 1) save.level = idx + 1;
      save.coins += coins; save.gems += gems; var rankUp = addXp(xp); save.chest = Math.min(3, save.chest + 1);
      mission('wins', 1); mission('stars', gained); persist();
      me.setMood('happy'); opp.setMood('sad'); S.confetti(220); S.excite = 1; A.play('win');
      for (var i = 0; i < 6; i++) setTimeout(S.firework, i * 260);
      setTimeout(function () { showResult(true, { stars: stars, coins: coins, xp: xp, gems: gems, rankUp: rankUp }); }, 1500);
    } else {
      if (!save.pass) { tickLives(); save.lives = Math.max(0, save.lives - 1); if (save.lives < MAX_LIVES && !save.lifeAt) save.lifeAt = Date.now() + LIFE_MS; }
      persist(); me.setMood('sad'); opp.setMood('happy'); A.play('fail');
      setTimeout(function () { showResult(false, {}); }, 1200);
    }
  }
  function showResult(win, r) {
    var lv = G.lv, idx = G.idx, h;
    if (win) {
      var st = ''; for (var s = 0; s < 3; s++) st += '<svg class="ic' + (s < r.stars ? ' on' : '') + '" style="animation-delay:' + (0.3 + s * 0.35) + 's"><use href="#i-star"/></svg>';
      h = '<h2>' + (lv.type === 'boss' ? '¡Jefe derrotado!' : ['¡Ganaste!', '¡Partidazo!', '¡Qué nivel!'][idx % 3]) + '</h2><div class="stars">' + st + '</div>' +
        '<div class="rew"><span>' + ic('coin') + '+<b id="cntCoins">0</b></span>' + (r.gems ? '<span>' + ic('gem') + '+' + r.gems + '</span>' : '') + '<span>XP +' + r.xp + '</span></div>' +
        '<p>Perfectos: <b style="color:#fff">' + G.perfects + '</b> · Mejor combo: <b style="color:#fff">x' + G.bestCombo + '</b> · Peloteo más largo: <b style="color:#fff">' + G.bestRally + '</b></p>' +
        (r.rankUp ? '<p class="disp" style="font-size:24px;color:#FFD23A">¡Subiste a ' + PP.RANKS[save.rank] + '!</p>' : '') +
        (r.stars < 3 ? '<p>Te falta' + (3 - r.stars > 1 ? 'n ' : ' ') + (3 - r.stars) + ' estrella' + (3 - r.stars > 1 ? 's' : '') + '. ¿Vas por las 3?</p>' : '') +
        '<div class="row"><button class="btn ghost" id="rMap">Mapa</button><button class="btn ghost" id="rAgain">Repetir</button>' +
        (idx < PP.LEVELS.length - 1 ? '<button class="btn lime big pulse" id="rNext">Siguiente</button>' : '') + '</div>';
    } else {
      var close = G.type === 'targets' ? (lv.need - G.targetsHit) + ' blanco' + (lv.need - G.targetsHit > 1 ? 's' : '') : G.type === 'rally' ? (lv.need - G.hits) + ' golpes' : (lv.toWin - G.me) + ' punto' + (lv.toWin - G.me > 1 ? 's' : '');
      var canCont = (G.type === 'match' || G.type === 'boss') && !G.continued;
      h = '<h2>¡Casi!</h2><p style="font-size:18px;color:#fff">Te faltó solo ' + close + '.</p><p>' + (save.pass ? 'Con el Pase no perdés vidas.' : 'Perdiste una vida. Te quedan ' + save.lives + '.') + '</p>' +
        (canCont ? '<button class="btn pink pulse" id="rCont">Seguir jugando ' + ic('gem') + PP.GEM_SINKS.continueMatch + '</button>' : '') +
        '<div class="row"><button class="btn ghost" id="rMap">Mapa</button><button class="btn lime big" id="rAgain">Revancha</button></div>';
    }
    modal(h, function () {
      if (win) {
        var el = $('cntCoins'), n = 0, step = Math.max(1, Math.round(r.coins / 30));
        var iv = setInterval(function () { n = Math.min(r.coins, n + step); el.textContent = n; A.play('coin'); if (n >= r.coins) clearInterval(iv); }, 40);
        for (var s = 0; s < r.stars; s++) (function (s) { setTimeout(function () { A.play('star', s); S.shake(0.2); }, 300 + s * 350); })(s);
      }
      on($('rMap'), function () { closeModal(); leaveMatch(); go('map'); afterWin(); });
      on($('rAgain'), function () { closeModal(); startLevel(idx); });
      on($('rNext'), function () { closeModal(); if (save.chest >= 3) { leaveMatch(); go('map'); afterWin(); } else startLevel(idx + 1); });
      on($('rCont'), function () {
        if (save.gems < PP.GEM_SINKS.continueMatch) { toast('Te faltan gemas. Pasá por la tienda.'); A.play('early'); return; }
        save.gems -= PP.GEM_SINKS.continueMatch; if (!save.pass) save.lives = Math.min(MAX_LIVES, save.lives + 1); persist();
        closeModal(); G.over = false; G.continued = true; G.opp = Math.max(0, G.toWin - 2); hud(); pop('¡Seguimos!', 'big gold'); A.play('ready'); after(1, beginPoint);
      });
    });
  }
  function afterWin() { if (save.chest >= 3) showChest(); }
  function showChest() {
    modal('<h2>¡Cofre de victorias!</h2><p>Tocá el cofre para abrirlo.</p><div id="chestGfx" class="shake" role="button" tabindex="0" aria-label="Abrir cofre"></div><div class="rew" id="chestRew"></div>', function (box) {
      var opened = false;
      function open() {
        if (opened) return; opened = true; A.unlock();
        var r = { coins: 200 + Math.floor(Math.random() * 6) * 100 + save.level * 10 }; if (Math.random() < 0.6) r.gems = 3 + Math.floor(Math.random() * 8);
        save.chest = 0; give(r, true); A.play('chest'); flash(0.6); S.confetti(120);
        $('chestGfx').classList.remove('shake'); $('chestGfx').style.transform = 'scale(1.15)'; $('chestRew').innerHTML = rewardHtml(r);
        var b = document.createElement('button'); b.className = 'btn lime'; b.textContent = '¡Genial!'; box.appendChild(b); on(b, closeModal);
      }
      $('chestGfx').addEventListener('click', open);
      $('chestGfx').addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') open(); });
    });
  }
  function leaveMatch() {
    G = null; S.mode = 'menu'; S.setBall({ x: 0, y: 0, z: 0 }, false); S.ring(null); S.showMachine(false);
    for (var i = 0; i < 3; i++) S.setTarget(i, null);
    if (me) { me.place(-1.5, 6); me.setMood('idle'); me.aura = 0; } if (opp) { opp.place(1.5, -6); opp.setMood('idle'); opp.g.visible = true; }
    $('lines').style.opacity = 0; $('pops').innerHTML = '';
  }
  function pause() {
    if (!G || G.over) return; G.paused = true;
    modal('<h2>Pausa</h2><p>' + G.lv.goal + '</p><div class="row"><button class="btn ghost" id="pQuit">Salir</button><button class="btn lime big" id="pGo">Seguir</button></div><p style="font-size:13px">Si salís ahora perdés una vida.</p>', function () {
      on($('pGo'), function () { closeModal(); if (G) G.paused = false; });
      on($('pQuit'), function () {
        closeModal(); if (!save.pass) { save.lives = Math.max(0, save.lives - 1); if (!save.lifeAt) save.lifeAt = Date.now() + LIFE_MS; persist(); }
        leaveMatch(); go('map');
      });
    });
  }

  /* ================= Bucle principal ================= */
  var last = 0, evBuf = [];
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016) * (PP.timeMul || 1); last = now;
    var gdt = 0;
    if (G && !G.paused) {
      G.rt += dt;
      for (var i = G.timers.length - 1; i >= 0; i--) if (G.rt >= G.timers[i].t) { var f = G.timers.splice(i, 1)[0].fn; f(); if (!G) break; }
    }
    if (G && !G.paused) {
      var ts = 1;
      if (G.hitStop > 0) { G.hitStop -= dt; ts = 0.03; }
      else if (G.freeze) ts = 0;
      else { if (G.slowmo > 0) { G.slowmo -= dt; ts = 0.3; } if (G.slow > 0) { G.slow -= dt; ts *= 0.5; if (G.slow <= 0 && !G.armed && !G.shield) me.aura = 0; } }
      gdt = dt * ts; G.t += gdt;
      var b = G.ball;
      if (G.phase === 'serve') {
        G.serveT += dt; var s = Math.abs(Math.sin(G.serveT * 2.6));
        b.x = me.x + 0.75; b.z = me.z - 0.5; b.y = 0.17 + s * 1.5; S.setBall(b, true); S.ring({ x: b.x, z: b.z }, 1 - s, G.char.accent);
      } else if (b.live) {
        var steps = Math.max(1, Math.ceil(gdt / 0.008)), sd = gdt / steps;
        for (var k = 0; k < steps && gdt > 0; k++) { evBuf.length = 0; stepBall(b, sd, evBuf); if (evBuf.length) onEvents(evBuf); if (!G) break; }
        if (G) {
          S.setBall(b, true);
          if (b.x3 && (Math.abs(b.x) > 8 || b.y < 0.2) && !G.pointDone) point('me', '', '');
          if (b.y <= 0.18 && Math.abs(b.vy) < 0.01 && Math.hypot(b.vx, b.vz) < 0.4 && !G.pointDone && G.phase !== 'over') { if (G.type === 'targets') nextBall(); else point(b.last === 'me' ? 'opp' : 'me', '¡Punto!', 'Punto del rival'); }
        }
      }
      if (G) {
        // Golpe del jugador
        if (G.phase === 'toMe' && G.plan) {
          var left = G.plan.t - G.t;
          S.ring({ x: G.plan.x, z: G.plan.z }, left / 0.85, G.char.accent);
          if (G.shield > 0 && !G.queued && left <= 0.02) { G.shield--; if (!G.shield) me.aura = 0; G.queued = { aim: { x: opp.x > 0 ? -0.85 : 0.85, depth: 0.85, lob: false }, q: 'perfect', at: G.t }; me.swing(G.plan.y > 1.75 ? 'smash' : 'drive'); }
          if (save.tut < 1 && G.idx === 0 && !G.queued && left <= 0.03 && left > -0.1 && !G.freeze) { G.freeze = true; setHint('¡AHORA! Deslizá hacia arriba'); }
          if (PP.auto && !G.queued && (left <= G.plan.auto || G.freeze)) swipe(PP.auto.aim ? PP.auto.aim() : { x: opp.x > 0 ? -0.9 : 0.9, depth: 0.9, lob: false });
          if (G.queued && G.t >= G.queued.at) playerShot(G.queued.aim, G.queued.q, false);
          else if (!G.queued && left < -0.6) { G.plan = null; S.ring(null); }
        }
        if (G.phase === 'serve' && PP.auto && G.serveT > 0.5 && Math.abs(Math.sin(G.serveT * 2.6)) > 0.95) swipe({ x: 0.5, depth: 0.8, lob: false });
        if (G.phase === 'toOpp' && G.oppPlan && G.t >= G.oppPlan.t) { if (G.oppPlan.reach) oppShot(); else G.oppPlan = null; }
        S.followX = b.live ? b.x : me.x;
      }
    } else S.followX = 0;
    var t = now / 1000;
    if (me) me.update(G && !G.paused ? (gdt > 0 ? Math.max(gdt, dt * 0.35) : 0) : dt, t);
    if (opp) opp.update(G && !G.paused ? gdt : dt, t);
    drawSwipe(dt);
    S.render(dt, G ? gdt : dt);
  }

  /* ================= Entrada ================= */
  var sw = $('swipe'), sctx = sw.getContext('2d'), pts = [], down = null;
  function sizeSwipe() { sw.width = innerWidth; sw.height = innerHeight; }
  function drawSwipe(dt) {
    sctx.clearRect(0, 0, sw.width, sw.height);
    for (var i = pts.length - 1; i >= 0; i--) { pts[i].a -= dt * 3.2; if (pts[i].a <= 0) pts.splice(i, 1); }
    if (pts.length < 2) return;
    sctx.lineCap = 'round'; sctx.lineJoin = 'round';
    for (var j = 1; j < pts.length; j++) {
      var p = pts[j], q = pts[j - 1];
      sctx.strokeStyle = 'rgba(216,255,58,' + p.a * 0.9 + ')'; sctx.lineWidth = 4 + p.a * 14; sctx.shadowColor = '#D8FF3A'; sctx.shadowBlur = 18;
      sctx.beginPath(); sctx.moveTo(q.x, q.y); sctx.lineTo(p.x, p.y); sctx.stroke();
    }
  }
  var gl = $('gl');
  gl.addEventListener('pointerdown', function (e) { A.unlock(); down = { x: e.clientX, y: e.clientY, t: performance.now() }; pts.length = 0; pts.push({ x: e.clientX, y: e.clientY, a: 1 }); try { gl.setPointerCapture(e.pointerId); } catch (er) {} });
  gl.addEventListener('pointermove', function (e) {
    if (!down) return; pts.push({ x: e.clientX, y: e.clientY, a: 1 });
    // Se dispara apenas el gesto es claro, sin esperar a soltar: se siente instantáneo
    var dx = e.clientX - down.x, dy = e.clientY - down.y, ref = Math.min(innerWidth, innerHeight) * 0.3;
    if (Math.hypot(dx, dy) > ref * 0.55) { fire(dx, dy); down = null; }
  });
  gl.addEventListener('pointerup', function (e) { if (!down) return; fire(e.clientX - down.x, e.clientY - down.y); down = null; });
  gl.addEventListener('pointercancel', function () { down = null; });
  function fire(dx, dy) {
    var ref = Math.min(innerWidth, innerHeight) * 0.3, len = Math.hypot(dx, dy);
    if (len < 14) { swipe({ x: 0, depth: 0.75, lob: false }); return; }
    var lob = dy > 0 && Math.abs(dy) > Math.abs(dx) * 1.1, ang = Math.atan2(dx, -dy);
    swipe({ x: clamp(lob ? dx / ref : Math.sin(ang) * 1.25, -1, 1), depth: clamp(0.35 + Math.max(0, Math.cos(ang)) * 0.65, 0.3, 1), lob: lob });
  }
  window.addEventListener('keydown', function (e) {
    if (!G || G.paused) return;
    var k = e.key.toLowerCase(), aim = null;
    if (k === 'arrowleft' || k === 'a') aim = { x: -0.9, depth: 0.85 };
    else if (k === 'arrowright' || k === 'd') aim = { x: 0.9, depth: 0.85 };
    else if (k === 'arrowup' || k === 'w') aim = { x: 0, depth: 1 };
    else if (k === 'arrowdown' || k === 's') aim = { x: 0, depth: 1, lob: true };
    else if (k === 'q') aim = { x: -0.9, depth: 0.3 };
    else if (k === 'e') aim = { x: 0.9, depth: 0.3 };
    else if (k === ' ' || k === 'enter') { A.unlock(); useSuper(); e.preventDefault(); return; }
    else if (k === 'escape' || k === 'p') { pause(); return; }
    if (aim) { A.unlock(); aim.lob = !!aim.lob; swipe(aim); e.preventDefault(); }
  });

  on($('superBtn'), useSuper); on($('pauseBtn'), pause);
  on($('playBtn'), function () { preLevel(Math.min(save.level, PP.LEVELS.length - 1)); });
  on($('bChars'), function () { detailChar = null; go('chars'); }); on($('bMissions'), function () { go('missions'); }); on($('bShop'), function () { go('shop'); });
  on($('cLives'), function () { if (save.lives < MAX_LIVES && !save.pass) showNoLives(); else toast('Tenés todas las vidas'); });
  on($('cCoins'), function () { go('shop'); }); on($('cGems'), function () { go('shop'); });
  on($('soundBtn'), function () { save.sound = !save.sound; A.setOn(save.sound); persist(); refreshTop(); });
  Array.prototype.forEach.call(document.querySelectorAll('[data-go]'), function (b) { on(b, function () { go(b.dataset.go); }); });
  on($('bMap'), function () { go('map'); });
  on($('rank'), function () { toast('Categoría ' + PP.RANKS[save.rank] + '. Ganá niveles para subir hasta LEYENDA.'); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && G && !G.over && !G.paused) pause(); });

  /* ================= Arranque ================= */
  function boot() {
    S.init($('gl')); sizeSwipe(); window.addEventListener('resize', sizeSwipe);
    A.on = save.sound;
    curWorld = PP.LEVELS[Math.min(save.level, PP.LEVELS.length - 1)].world; S.setWorld(curWorld);
    var c = curChar();
    me = S.makeChar(c.look, { accent: c.accent, facing: Math.PI, scale: 1.25 }); me.place(-1.5, 6);
    opp = S.makeChar(PP.LEVELS[Math.min(save.level, 39)].look, { accent: '#FF3D8B', facing: 0, scale: 1.25 }); opp.place(1.5, -6);
    ensureMissions(); go('home'); setInterval(function () { if (!G) refreshTop(); }, 1000);
    if (location.search.indexOf('nodaily') < 0) showDaily();
    requestAnimationFrame(frame);
  }
  // Ganchos de prueba e integración (Padel Coach puede usar window.Pelotita)
  window.Pelotita = PP.api = {
    start: startLevel, getSave: function () { return save; }, state: function () { return G; }, go: go, swipe: swipe, useSuper: useSuper,
    reset: function () { save = defaults(); persist(); location.reload(); }
  };
  if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(boot); else boot();
})();
