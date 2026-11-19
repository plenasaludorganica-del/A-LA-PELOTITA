/* A la Pelotita · Partido EN VIVO: 1 contra 1 o 2 contra 2, todos al mismo tiempo, cada uno desde su celular.
   - Sincronización: solo viajan los golpes (desde dónde, hacia dónde, cuánto tarda y en qué momento). Cada celular calcula la
     pelota con la misma física, así todos la ven igual. Las posiciones de los jugadores se mandan varias veces por segundo.
   - El anfitrión (el primer jugador conectado) saca, decide los puntos y maneja a los jugadores de la máquina si faltan personas.
   - Cada uno ve la cancha desde su lado: el equipo 2 ve todo dado vuelta, para que siempre estés abajo.
   - Conexión: consultas cortas al servidor (supabase/live.sql), unas 6 por segundo durante el partido. */
(function () {
  'use strict';
  var PP = window.PP, DB = PP.DB, S = PP.Scene, A = PP.Audio, U = null;
  var L = PP.Live = { active: false };
  var GR = 11, DT = 1 / 120, SLOW = 1.22, TO_WIN = 5;
  var R = null, raf = 0, pollT = 0, inflight = false;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function noop() {}
  function err(e) { U.toast(e && e.message ? e.message : 'Algo salió mal. Probá de nuevo.'); }

  /* ---------- Física (la misma en todos los celulares) ---------- */
  function stepBall(b, dt, ev) {
    var pz = b.z;
    b.vy -= GR * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    if ((pz > 0) !== (b.z > 0) && b.y < 0.98) { b.z = pz > 0 ? 0.1 : -0.1; b.vz *= -0.12; b.vx *= 0.3; ev.push('net'); }
    if (b.y < 0.17) { b.y = 0.17; if (b.vy < 0) { b.vy = -b.vy * 0.76; b.vx *= 0.82; b.vz *= 0.82; b.bounces++; b.side = b.z > 0 ? 1 : 2; ev.push('bounce'); if (b.vy < 1.2) b.vy = 0; } }
    if (b.z > 9.83 && b.vz > 0 && b.y < 4) { b.z = 9.83; b.vz *= -0.62; ev.push('wall'); }
    if (b.z < -9.83 && b.vz < 0 && b.y < 4) { b.z = -9.83; b.vz *= -0.62; ev.push('wall'); }
    if (Math.abs(b.x) > 4.83 && b.x * b.vx > 0 && b.y < 3) { b.x = b.x > 0 ? 4.83 : -4.83; b.vx *= -0.62; ev.push('wall'); }
  }
  function launch(b, tx, tz, T) {
    for (var i = 0; i < 8; i++) {
      b.vx = (tx - b.x) / T; b.vz = (tz - b.z) / T; b.vy = (0.17 - b.y + 0.5 * GR * T * T) / T;
      if ((b.z > 0) === (tz > 0)) break;
      var tn = -b.z / b.vz, yn = b.y + b.vy * tn - 0.5 * GR * tn * tn;
      if (yn > 1.25) break; T *= 1.1;
    }
    b.bounces = 0; b.side = 0;
  }
  // Dónde y cuándo conviene pegarle (entre el primer y el segundo pique, a la altura de la cintura) del lado del equipo t
  function predict(b, t, t0) {
    var c = { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz, bounces: b.bounces, side: b.side }, ev = [], tt = 0, t1 = -1, t2 = -1, smp = [];
    while (tt < 5) {
      ev.length = 0; stepBall(c, DT, ev); tt += DT;
      for (var i = 0; i < ev.length; i++) {
        if (ev[i] === 'net') return null;
        if (ev[i] === 'wall' && c.bounces === 0) return null;
        if (ev[i] === 'bounce') { if (c.bounces === 1) { if (c.side !== t) return null; t1 = tt; } else if (c.bounces === 2) t2 = tt; }
      }
      if (t1 >= 0) smp.push([tt, c.x, c.y, c.z]);
      if (t2 >= 0) break;
    }
    if (t1 < 0) return null; if (t2 < 0) t2 = tt;
    var best = null, bd = 1e9;
    smp.forEach(function (s) { if (s[0] < t1 + (t2 - t1) * 0.25 || s[0] > t1 + (t2 - t1) * 0.75) return; var d = Math.abs(s[2] - 1.1) + Math.abs(s[0] - (t1 + t2) / 2) * 0.4; if (d < bd) { bd = d; best = s; } });
    if (!best) best = smp[Math.floor(smp.length / 2)];
    return { t: t0 + best[0] * 1000, x: best[1], y: best[2], z: best[3] };
  }

  /* ---------- Equipos, lados y vista ---------- */
  function teamOf(slot) { return R.size === 2 ? slot + 1 : (slot < 2 ? 1 : 2); }
  function mates(t) { var o = []; for (var s = 0; s < R.size; s++) if (teamOf(s) === t) o.push(s); return o; }
  // Quién le pega: en 2 contra 2 cada uno cubre su mitad de la cancha
  function hitterFor(t, x) {
    var m = mates(t); if (m.length === 1) return m[0];
    var leftHalf = t === 1 ? x < 0 : x > 0;   // la mitad izquierda de cada equipo, mirando hacia la red
    return leftHalf ? m[0] : m[1];
  }
  function homeOf(slot) {
    var t = teamOf(slot), m = mates(t), lane = m.length === 1 ? 0 : (m.indexOf(slot) === 0 ? -2.2 : 2.2);
    return t === 1 ? { x: lane, z: 6.4 } : { x: -lane, z: -6.4 };
  }
  // Vista: el equipo 2 ve la cancha dada vuelta
  function vx(x) { return R && R.myTeam === 2 ? -x : x; } function vz(z) { return R && R.myTeam === 2 ? -z : z; }
  function now() { return Date.now() + (R ? R.offset : 0); }   // hora del servidor (ms)

  /* ---------- Entrar a una sala ---------- */
  function pid() {
    var v = null; try { v = localStorage.getItem('pelotita.vid'); } catch (e) {}
    if (!v || !/^[a-z0-9]{8,32}$/.test(v)) { v = (Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).replace(/[^a-z0-9]/g, '').slice(0, 24); try { localStorage.setItem('pelotita.vid', v); } catch (e) {} }
    return v;
  }
  function myName(cb) {
    if (DB.user) return cb(DB.user.name);
    var n = ''; try { n = localStorage.getItem('pelotita.liveName') || ''; } catch (e) {}
    if (n) return cb(n);
    U.modal('<h2>¿Cómo te llamás?</h2><p>Así te ven los demás en la cancha.</p><input class="fld" id="lnN" maxlength="20" placeholder="Tu nombre o apodo"><div class="row"><button class="btn ghost" id="lnNo">Cancelar</button><button class="btn lime" id="lnOk">Listo</button></div>', function () {
      U.on($('lnNo'), U.closeModal);
      U.on($('lnOk'), function () { var v = $('lnN').value.trim(); if (v.length < 2) return; try { localStorage.setItem('pelotita.liveName', v); } catch (e) {} U.closeModal(); cb(v); });
    });
  }
  function rpc(fn, args) { return DB.liveRpc(fn, args); }
  L.quick = function (size) { if (!DB.online) return U.toast('El partido en vivo necesita internet.'); myName(function (n) { U.toast('Buscando jugadores…'); rpc('live_quick', { p_pid: pid(), p_name: n, p_size: size }).then(enter, err); }); };
  L.create = function (size) { if (!DB.online) return U.toast('El partido en vivo necesita internet.'); myName(function (n) { rpc('live_create', { p_pid: pid(), p_name: n, p_size: size, p_open: false }).then(enter, err); }); };
  L.join = function (code) { myName(function (n) { rpc('live_join', { p_pid: pid(), p_name: n, p_code: code }).then(enter, err); }); };
  L.codeForm = function () {
    U.modal('<h2>Código de sala</h2><input class="fld" id="lcC" maxlength="5" placeholder="5 letras" style="text-transform:uppercase;text-align:center;font-size:26px"><div class="row"><button class="btn ghost" id="lcNo">Cancelar</button><button class="btn lime" id="lcOk">Entrar</button></div>', function () {
      U.on($('lcNo'), U.closeModal); U.on($('lcOk'), function () { var c = $('lcC').value.trim().toUpperCase(); U.closeModal(); if (c) L.join(c); });
    });
  };
  function enter(j) {
    R = { id: j.room, slot: j.slot, since: 0, offset: 0, bestRtt: 1e9, players: {}, chars: {}, status: 'lobby', rally: 0, s1: 0, s2: 0, size: 2, host: -1, code: '',
      ball: null, simT: 0, lastTeam: 0, applied: 0, plan: null, hitter: -1, queued: null, dead: true, deadAt: Date.now(), serveAt: 0, pointSent: -1, botHit: null, joinedAt: Date.now(), myTeam: 1 };
    U.closeModal(); U.go('live'); poll();
  }

  /* ---------- Conexión: latido con el servidor ---------- */
  function poll() {
    clearTimeout(pollT); if (!R) return;
    if (inflight) { pollT = setTimeout(poll, 60); return; }
    var pos = {}, me = R.chars[R.slot];
    if (me && R.status === 'playing') pos[R.slot] = [+vxInv(me.x).toFixed(2), +vzInv(me.z).toFixed(2)];
    if (R.host === R.slot) Object.keys(R.players).forEach(function (s) { var p = R.players[s], c = R.chars[s]; if (p.bot && c) pos[s] = [+vxInv(c.x).toFixed(2), +vzInv(c.z).toFixed(2)]; });
    var t0 = Date.now(); inflight = true;
    rpc('live_tick', { p_room: R.id, p_pid: pid(), p_pos: pos, p_since: R.since }).then(function (s) {
      inflight = false; if (!R) return;
      var rtt = Date.now() - t0; if (rtt < R.bestRtt * 1.3 || !R.synced) { R.offset = s.now - (t0 + rtt / 2); R.synced = true; R.bestRtt = Math.min(R.bestRtt, rtt); }
      apply(s);
      pollT = setTimeout(poll, R.status === 'playing' ? 140 : 700);
    }, function (e) {
      inflight = false; if (!R) return;
      if (/No estás en esta sala/.test(e.message || '')) { L.leave(true); U.toast('Saliste de la sala.'); return; }
      pollT = setTimeout(poll, 1200);
    });
  }
  function vxInv(x) { return R.myTeam === 2 ? -x : x; } function vzInv(z) { return R.myTeam === 2 ? -z : z; }
  function apply(s) {
    var r = s.room; if (!r) return;
    R.size = r.size; R.code = r.code; R.host = r.host; R.isOpen = r.is_open; R.myTeam = teamOf(R.slot);
    (s.players || []).forEach(function (p) { R.players[p.slot] = p; });
    var wasLobby = R.status === 'lobby'; R.status = r.status; R.s1 = r.score1; R.s2 = r.score2;
    (s.events || []).forEach(function (e) { R.since = Math.max(R.since, e.id); onEvent(e); });
    if (R.status === 'lobby') { renderLobby(); hostLobby(); }
    else if (wasLobby && R.status !== 'lobby') startMatch();
    if (L.active) { syncChars(); hud(); }
    if (R.status === 'done' && L.active && !R.ended) endMatch();
  }

  /* ---------- Sala de espera ---------- */
  L.render = function () { if (R && R.status === 'lobby') renderLobby(); else if (!R) U.go('duel'); };
  function renderLobby() {
    var b = $('liveBody'); if (!b) return;
    var h = '<div class="card" style="border-color:#7CFF4D;text-align:center"><h3 class="disp" style="font-size:24px;color:#7CFF4D">🎾 ' + (R.size === 4 ? '2 contra 2' : '1 contra 1') + ' en vivo</h3>' +
      (R.isOpen ? '<p style="color:#fff">Buscando jugadores… <span class="spin">🎾</span></p>' : '<p style="color:#fff">Pasales el código a tus amigos:</p><div class="disp" style="font-size:40px;letter-spacing:8px;color:#fff">' + esc(R.code) + '</div><button class="btn small" data-lv="share">Mandar por WhatsApp</button>') + '</div>';
    [1, 2].forEach(function (t) {
      h += '<div class="card"><h3 class="disp" style="margin:0 0 6px">Equipo ' + t + (R.myTeam === t ? ' · el tuyo' : '') + '</h3>';
      mates(t).forEach(function (s) {
        var p = R.players[s];
        h += '<div class="rk' + (s === R.slot ? ' me' : '') + '" style="margin:6px 0 0"><div class="tx"><h3>' + (p ? esc(p.name) + (s === R.slot ? ' (vos)' : '') + (s === R.host ? ' 👑' : '') : '<span style="opacity:.6">Esperando…</span>') + '</h3><p>' + (p ? (p.online ? 'Listo' : 'Desconectado') : 'Lugar libre') + '</p></div></div>';
      });
      h += '</div>';
    });
    var n = Object.keys(R.players).filter(function (k) { return R.players[k].online; }).length, waitS = Math.round((Date.now() - R.joinedAt) / 1000);
    if (R.host === R.slot) h += '<button class="btn lime big" data-lv="start" style="width:100%">' + (n >= R.size ? '¡Empezar!' : 'Empezar ya (completa la máquina)') + '</button>' +
      (R.isOpen && n < R.size ? '<p class="note">Si en ' + Math.max(0, 25 - waitS) + ' s no se completa, arrancamos con jugadores de la máquina.</p>' : '<p class="note">Arranca solo cuando estén todos.</p>');
    else h += '<p class="note">Esperando que el anfitrión 👑 empiece el partido…</p>';
    h += '<div class="row"><button class="btn small ghost" data-lv="leave">Salir de la sala</button></div>';
    b.innerHTML = h;
  }
  function hostLobby() {
    if (R.host !== R.slot || R.starting) return;
    var n = Object.keys(R.players).filter(function (k) { return R.players[k].online; }).length;
    if (n >= R.size || (R.isOpen && Date.now() - R.joinedAt > 25000)) { R.starting = true; rpc('live_event', { p_room: R.id, p_pid: pid(), p_kind: 'start', p_payload: {} }).then(function (s) { R.starting = false; apply(s); }, function (e) { R.starting = false; err(e); }); }
  }

  /* ---------- Partido ---------- */
  function startMatch() {
    L.active = true; R.ended = false;
    if (U.wantLandscape) U.wantLandscape();
    ['home', 'map', 'chars', 'shop', 'missions', 'train', 'social', 'cup', 'duel', 'live'].forEach(function (x) { var el = $(x); if (el) el.hidden = true; });
    $('top').hidden = true; $('hud').hidden = false; $('hud').classList.add('tr');
    var api = PP.api; if (api.me()) api.me().g.visible = false; if (api.opp && api.opp()) api.opp().g.visible = false;
    S.mode = 'play'; S.setBall({ x: 0, y: 0, z: 0 }, false); S.ring(null);
    $('nMe').textContent = 'Tu equipo'; $('nOp').textContent = 'Rivales'; $('pMe').textContent = '0'; $('pOp').textContent = '0';
    var inf = document.createElement('div'); inf.id = 'liveInfo'; inf.className = 'liveinfo'; $('hud').appendChild(inf);
    A.play('ready'); info('¡Arranca el partido! A ' + TO_WIN + ' puntos', 2200);
    R.deadAt = Date.now(); R.dead = true;
    cancelAnimationFrame(raf); var last = performance.now();
    var loop = function (t) { raf = requestAnimationFrame(loop); var dt = Math.min(0.05, (t - last) / 1000); last = t; frame(dt, t / 1000); };
    raf = requestAnimationFrame(loop);
  }
  function syncChars() {
    var chars = PP.CHARS || [];
    Object.keys(R.players).forEach(function (k) {
      var s = +k, p = R.players[s], c = R.chars[s];
      if (!c) {
        var me = s === R.slot, ch = me ? (chars.filter(function (x) { return x.id === U.save().char; })[0] || chars[0]) : chars[(s + 1) % chars.length];
        var sprite = ch && ch.sprite ? ch.sprite : 'assets/sprites/r' + (s % 4 + 1) + '.png';
        c = R.chars[s] = S.makeSpriteChar(sprite, { accent: teamOf(s) === R.myTeam ? (me ? (ch && ch.accent) || '#22E1FF' : '#7CFF4D') : '#FF3D8B', scale: 1 });
        var h0 = homeOf(s); c.place(vx(h0.x), vz(h0.z)); c.speed = 7.5;
        c.tag = document.createElement('div'); c.tag.className = 'ltag' + (me ? ' me' : ''); c.tag.textContent = me ? 'Vos' : p.name; document.body.appendChild(c.tag);
      }
      // Los demás humanos: ir hacia la posición que mandó cada celular
      if (s !== R.slot && !(p.bot && R.host === R.slot)) { c.speed = 9; c.goTo(vx(p.x), vz(p.z)); }
      c.tag.style.opacity = p.online ? 1 : 0.4;
    });
  }
  function info(t, ms) { var el = $('liveInfo'); if (!el) return; el.textContent = t; el.style.opacity = 1; clearTimeout(info.t); if (ms) info.t = setTimeout(function () { if ($('liveInfo')) $('liveInfo').style.opacity = 0; }, ms); }
  function hud() { var mine = R.myTeam === 1 ? R.s1 : R.s2, theirs = R.myTeam === 1 ? R.s2 : R.s1; $('pMe').textContent = mine; $('pOp').textContent = theirs; }

  function onEvent(e) {
    var p = e.p || {};
    if (e.kind === 'hit') {
      if (p.n <= R.applied) return;   // mi propio golpe ya aplicado
      applyHit(p, clamp(p.t || e.at, e.at - 1500, e.at));
    } else if (e.kind === 'point') {
      R.dead = true; R.deadAt = Date.now(); R.applied = Math.max(R.applied, p.n); R.rally = p.n; R.plan = null; R.queued = null; R.botHit = null; S.ring(null);
      var mineWon = p.winner === R.myTeam;
      if (L.active) { A.play(mineWon ? 'perfect' : 'lose'); info(mineWon ? '¡PUNTO PARA TU EQUIPO!' : 'Punto rival', 1800); if (mineWon) { S.burst({ x: 0, y: 2, z: 4 }, '#7CFF4D', 40, 8, 0.8); S.shake(0.3); } }
    } else if (e.kind === 'leave') {
      var pl = R.players[p.slot]; if (pl && L.active) info((pl.name || 'Alguien') + ' se fue del partido', 2500);
    }
  }
  function applyHit(p, at) {
    R.applied = p.n; R.rally = p.n; R.dead = false; R.pointSent = -1; R.queued = null; R.botHit = null; R.pending = null;
    var b = R.ball = { x: p.x, y: Math.max(0.6, p.y), z: p.z, vx: 0, vy: 0, vz: 0, bounces: 0, side: 0 };
    launch(b, p.tx, p.tz, p.T); R.simT = at; R.lastTeam = teamOf(p.by); R.lastBy = p.by; R.hitAt = at;
    var c = R.chars[p.by]; if (c && c.swing) c.swing(p.lob ? 'lob' : (b.y > 1.75 ? 'smash' : 'drive'), false);
    if (L.active) { A.play(p.q === 'perfect' ? 'perfect' : 'hit'); S.burst({ x: vx(b.x), y: b.y, z: vz(b.z) }, p.q === 'perfect' ? '#FFD23A' : '#ffffff', p.q === 'perfect' ? 30 : 10, 5, 0.4); S.setBallStyle(p.q === 'perfect' ? '#FFD23A' : '#D8FF3A', p.q === 'perfect' ? 1 : 0); }
    // ¿Hacia qué equipo va y quién tiene que pegarle?
    var to = R.lastTeam === 1 ? 2 : 1, pl = predict(b, to, at);
    R.plan = pl; R.hitter = pl ? hitterFor(to, pl.x) : -1;
    if (L.active && pl && R.hitter === R.slot) info('¡Te toca!', 900);
    if (pl && R.host === R.slot && R.players[R.hitter] && R.players[R.hitter].bot) planBot(pl);
  }
  function planBot(pl) {
    var r = Math.random(), q = r < 0.3 ? 'perfect' : r < 0.75 ? 'good' : r < 0.94 ? 'ok' : 'bad';
    if (Math.random() < 0.07) return;   // a veces la máquina no llega
    R.botHit = { at: pl.t + rnd(-60, 60), q: q, aim: { x: rnd(-0.85, 0.85), depth: rnd(0.55, 0.95), lob: Math.random() < 0.12 }, by: R.hitter };
  }

  // Disparo: lo arma quien le pega (yo, o el anfitrión por la máquina)
  function shot(by, aim, q, serve) {
    var b = R.ball, t = teamOf(by), dir = t === 1 ? -1 : 1, from = R.chars[by];
    var x = b ? b.x : vxInv(from.x), y = b ? b.y : 1.0, z = b ? b.z : vzInv(from.z);
    var tx = aim.x * 4.1 * (t === 1 ? 1 : -1), tz = dir * (3.2 + aim.depth * 5.6), T = ({ perfect: 0.9, good: 1.1, ok: 1.35, bad: 1.5 })[q] * SLOW;
    if (serve) { tz = dir * rnd(4.2, 6); tx = (x >= 0 ? -1 : 1) * rnd(1, 2.6); T = 1.3 * SLOW; }
    else if (aim.lob) { T = 2.1 * SLOW; tz = dir * 8.2; }
    else if (y > 1.75) T *= 0.78;
    if (q === 'bad' && !serve && Math.random() < 0.5) { if (Math.random() < 0.5) { tz = -dir * 0.9; T = 0.8; } else { tz = dir * 11.8; T = 1.0; } }
    return { n: R.rally + 1, by: by, serve: !!serve, x: +x.toFixed(3), y: +Math.max(0.6, y).toFixed(3), z: +z.toFixed(3), tx: +clamp(tx, -4.3, 4.3).toFixed(3), tz: +tz.toFixed(3), T: +T.toFixed(3), q: q, lob: !!aim.lob, t: Math.round(now()) };
  }
  function sendHit(p) {
    applyHit(p, p.t);   // lo veo al instante en mi celular
    rpc('live_event', { p_room: R.id, p_pid: pid(), p_kind: 'hit', p_payload: p }).catch(function (e) { if (!/Golpe no permitido/.test(e.message || '')) return; });
  }
  // Deslizar el dedo (lo llama el juego cuando hay partido en vivo)
  L.swipe = function (aim) {
    if (!R || !L.active || R.dead || !R.plan || R.hitter !== R.slot || R.queued) return;
    var dtm = (now() - R.plan.t) / 1000;
    if (dtm < -0.6) { U.pop && U.pop('¡Muy pronto!', 'bad', meWorldPos()); A.play('early'); return; }
    if (dtm > 0.45) { U.pop && U.pop('¡Tarde!', 'bad', meWorldPos()); A.play('early'); return; }
    var a = Math.abs(dtm), q = a <= 0.09 ? 'perfect' : a <= 0.22 ? 'good' : a <= 0.4 ? 'ok' : 'bad';
    R.queued = { at: Math.max(now(), R.plan.t), aim: aim, q: q };
    var c = R.chars[R.slot]; if (c && c.swing) c.swing(aim.lob ? 'lob' : 'drive', false);
    if (U.pop) U.pop({ perfect: '¡PERFECTO!', good: 'Bien', ok: 'Justo', bad: 'Flojo' }[q], q, meWorldPos());
  };
  function meWorldPos() { var c = R.chars[R.slot]; return c ? { x: c.x, y: 2.4, z: c.z } : null; }

  function frame(dt, t) {
    if (!R || !L.active) return;
    var b = R.ball, n = now(), host = R.host === R.slot;
    // Pelota: avanzar la simulación hasta la hora del servidor
    if (b && !R.dead) {
      var ev = [], steps = 0;
      if (n - R.simT > 4000) R.simT = n - 4000;
      while (R.simT + DT * 1000 <= n && steps < 900) {
        ev.length = 0; stepBall(b, DT, ev); R.simT += DT * 1000; steps++;
        for (var i = 0; i < ev.length; i++) {
          var e = ev[i];
          if (e === 'bounce') { A.play('bounce'); S.shock({ x: vx(b.x), y: 0, z: vz(b.z) }, '#ffffff', true); if (host) rules('bounce'); }
          else if (e === 'wall') { A.play('glass'); if (host) rules('wall'); }
          else if (e === 'net') { A.play('net'); if (host) rules('net'); }
        }
        if (R.queued && R.simT >= R.queued.at) { var qd = R.queued; R.queued = null; sendHit(shot(R.slot, qd.aim, qd.q, false)); break; }
        if (R.botHit && host && R.simT >= R.botHit.at) { var bh = R.botHit; R.botHit = null; sendHit(shot(bh.by, bh.aim, bh.q, false)); break; }
      }
      b = R.ball;
      if (host && !R.dead && n - R.hitAt > 7000) pointTo(R.lastTeam);   // seguro: si nadie le pegó en 7 s
      S.setBall({ x: vx(b.x), y: b.y, z: vz(b.z) }, true);
    } else S.setBall({ x: 0, y: 0, z: 0 }, false);
    if (host && R.pending && Date.now() >= R.pending.at) { var pd = R.pending; R.pending = null; if (pd.n === R.rally && !R.dead) pointTo(pd.w); }
    // Saque (el anfitrión): un rato después de cada punto
    if (host && R.dead && R.status === 'playing' && !R.ended && Date.now() - R.deadAt > 2200 && !R.serving) serve();
    // Aro: mi turno
    if (R.plan && !R.dead && R.hitter === R.slot && !R.queued) S.ring({ x: vx(R.plan.x), z: vz(R.plan.z) }, clamp((R.plan.t - n) / 900, 0, 1), '#22E1FF'); else S.ring(null);
    // Movimiento: yo (automático, como el control fácil), la máquina (si soy anfitrión)
    Object.keys(R.chars).forEach(function (k) {
      var s = +k, c = R.chars[s], p = R.players[s] || {}, mine = s === R.slot, bot = p.bot && host;
      if (mine || bot) {
        var tgt = (R.plan && !R.dead && R.hitter === s) ? { x: R.plan.x + (teamOf(s) === 1 ? -0.55 : 0.55), z: R.plan.z + (teamOf(s) === 1 ? 0.1 : -0.1) } : homeOf(s);
        if (!R.dead && R.lastTeam === teamOf(s) && R.hitter !== s) tgt = { x: tgt.x, z: teamOf(s) === 1 ? 4.6 : -4.6 };   // mi equipo pegó: subir a la red
        c.speed = 7.5; c.goTo(vx(clamp(tgt.x, -4.4, 4.4)), vz(tgt.z));
      }
      c.update(dt, t);
      var pr = S.project ? S.project({ x: c.x, y: 2.35, z: c.z }) : null;
      if (pr && c.tag) { c.tag.style.left = pr.x + 'px'; c.tag.style.top = pr.y + 'px'; }
    });
    S.followX = b && !R.dead ? vx(b.x) * 0.6 : 0;
  }
  function rules(e) {
    var b = R.ball; if (R.dead || R.pointSent === R.rally) return;
    var other = R.lastTeam === 1 ? 2 : 1;
    if (e === 'net') return pointTo(other);
    if (e === 'wall' && b.bounces === 0) return pointTo(other);
    if (e === 'bounce') {
      if (b.bounces === 1 && b.side === R.lastTeam) return pointTo(other);   // no pasó la red
      // Doble pique: antes de cobrarlo se espera un poco, por si el golpe del rival viene en camino (demora de la conexión)
      if (b.bounces === 2) { R.pending = { w: R.lastTeam, n: R.rally, at: Date.now() + Math.min(1400, 250 + R.bestRtt * 1.2) }; return; }
    }
  }
  function pointTo(w) {
    if (R.pointSent === R.rally) return; R.pointSent = R.rally;
    rpc('live_event', { p_room: R.id, p_pid: pid(), p_kind: 'point', p_payload: { n: R.rally, winner: w } }).then(function (s) { if (R) apply(s); }, noop);
  }
  function serve() {
    R.serving = true;
    var pts = R.s1 + R.s2, team = pts % 2 === 0 ? 1 : 2, m = mates(team), by = m[Math.floor(pts / 2) % m.length];
    var c = R.chars[by]; if (!c) { R.serving = false; return; }
    var h = homeOf(by); c.place(vx(h.x), vz(team === 1 ? 7.6 : -7.6));
    R.ball = null; var p = shot(by, { x: 0, depth: 0.8 }, 'good', true);
    p.x = h.x + (team === 1 ? 0.6 : -0.6); p.y = 1.0; p.z = team === 1 ? 7.4 : -7.4;
    sendHit(p);
    setTimeout(function () { if (R) R.serving = false; }, 1500);
  }

  function endMatch() {
    R.ended = true; S.ring(null);
    var mine = R.myTeam === 1 ? R.s1 : R.s2, theirs = R.myTeam === 1 ? R.s2 : R.s1, won = mine > theirs, size = R.size;
    if (won) { S.confetti(220); A.play('win'); } else A.play('fail');
    U.modal('<h2>' + (won ? '¡GANARON! 🏆' : 'Esta vez no salió') + '</h2><div class="iq">' + mine + ' - ' + theirs + '</div><p style="color:#fff">' + (won ? 'Partidazo en vivo.' : '¡La revancha es ya!') + '</p>' +
      '<div class="row"><button class="btn ghost" id="leOut">Salir</button><button class="btn lime big" id="leRe">Revancha</button></div>', function () {
      U.on($('leOut'), function () { U.closeModal(); L.leave(); });
      U.on($('leRe'), function () { U.closeModal(); var open = R.isOpen; L.leave(); if (open) L.quick(size); else L.create(size); });
    });
  }
  // Pausa: en vivo no se puede pausar a los demás, solo salir
  L.menu = function () {
    U.modal('<h2>Partido en vivo</h2><p>El partido sigue para los demás. Si salís, tu equipo sigue sin vos.</p><div class="row"><button class="btn ghost" id="lmOut">Salir del partido</button><button class="btn lime big" id="lmGo">Seguir</button></div>', function () {
      U.on($('lmGo'), U.closeModal); U.on($('lmOut'), function () { U.closeModal(); L.leave(); });
    });
  };
  // Diagnóstico (para pruebas automáticas)
  L._dbg = function () { return R ? { slot: R.slot, team: R.myTeam, hitter: R.hitter, planT: R.plan && R.plan.t, now: now(), dead: R.dead, s1: R.s1, s2: R.s2, status: R.status, rally: R.rally, host: R.host, code: R.code, players: Object.keys(R.players).length, active: L.active } : null; };
  L.leave = function (silent) {
    if (!R) { U.go('duel'); return; }
    var id = R.id; if (!silent) rpc('live_event', { p_room: id, p_pid: pid(), p_kind: 'leave', p_payload: {} }).catch(noop);
    clearTimeout(pollT); cancelAnimationFrame(raf);
    Object.keys(R.chars).forEach(function (k) { var c = R.chars[k]; if (c.tag) c.tag.remove(); c.remove(); });
    var inf = $('liveInfo'); if (inf) inf.remove();
    var wasActive = L.active; L.active = false; R = null;
    S.ring(null); S.setBall({ x: 0, y: 0, z: 0 }, false); S.mode = 'menu';
    var api = PP.api; if (api.me()) api.me().g.visible = true; if (api.opp && api.opp()) api.opp().g.visible = true;
    $('hud').classList.remove('tr'); $('hud').hidden = true;
    U.go('duel'); if (wasActive) U.toast('Saliste del partido en vivo');
  };
  $('liveBody') && $('liveBody').addEventListener('click', function (e) {
    var b = e.target.closest('[data-lv]'); if (!b || !R) return; var a = b.dataset.lv;
    if (a === 'leave') L.leave();
    else if (a === 'start') { R.starting = true; b.disabled = true; rpc('live_event', { p_room: R.id, p_pid: pid(), p_kind: 'start', p_payload: {} }).then(function (s) { R.starting = false; apply(s); }, function (er) { R.starting = false; b.disabled = false; err(er); }); }
    else if (a === 'share') {
      var url = 'https://alapelotita.com/#vivo-' + R.code, text = '¡Vení a jugar un partido en vivo de A la Pelotita! Código ' + R.code + ': ' + url;
      if (navigator.share) navigator.share({ title: 'Partido en vivo', text: text }).catch(noop); else window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
    }
  });
  L.init = function () {
    U = PP.ui;
    var chk = function () { var m = /^#vivo-([A-Z0-9]{5})$/i.exec(location.hash || ''); if (!m) return; history.replaceState(null, '', location.pathname + location.search); L.join(m[1].toUpperCase()); };
    window.addEventListener('hashchange', chk); setTimeout(chk, 1500);
  };
})();
