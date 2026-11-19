/* A la Pelotita · Jugar con amigos: Desafíos por turnos (1 contra 1 o 2 contra 2).
   Cada uno juega un solo turno en su celular, cuando puede, antes del cierre. Gana el equipo que suma más.
   Se juega con amigos (invitación a quienes seguís), abierto a cualquiera o pasando el código. Servidor: supabase/duels.sql */
(function () {
  'use strict';
  var PP = window.PP, DB = PP.DB, U = null;
  var D = PP.Duel = {}, view = 'list', cur = null, tick = null, badge = 0;
  var SITE = 'https://alapelotita.com/';
  var GAMES = {
    peloteo: { name: 'Peloteo por puntos', desc: 'Sumá todos los puntos que puedas. Tenés 3 errores.', color: '#7CFF4D' },
    read: { name: 'Leé la jugada', desc: 'Elegí el golpe correcto en cada jugada. Tenés 3 vidas.', color: '#FFB020' },
    lights: { name: 'Tablero de luces', desc: 'Reflejos y cabeza: cada nivel, más difícil. Tenés 3 vidas.', color: '#22E1FF' }
  };
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function noop() {}
  function err(e) { U.toast(e && e.message ? e.message : 'Algo salió mal. Probá de nuevo.'); }
  function fmt(d) { return d.size === 4 ? '2 contra 2' : '1 contra 1'; }
  function left(ms) {
    if (ms <= 0) return 'ya'; var m = Math.floor(ms / 60000), h = Math.floor(m / 60), dd = Math.floor(h / 24);
    return dd > 0 ? dd + ' d ' + (h % 24) + ' h' : h > 0 ? h + ' h ' + (m % 60) + ' min' : m > 0 ? m + ' min' : Math.ceil(ms / 1000) + ' s';
  }
  function avatar(name) {
    var h = 0, n = String(name || '?'); for (var i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % 360;
    var p = n.trim().split(/\s+/), ini = (p[0][0] || '?') + (p[1] ? p[1][0] : '');
    return '<span class="av" style="background:hsl(' + h + ' 70% 45%)">' + esc(ini.toUpperCase()) + '</span>';
  }
  // Estado del desafío visto por mí
  function stateOf(d) {
    var me = (d.players || []).filter(function (p) { return p.me; })[0];
    if (d.done) return { k: 'done', t: d.winner === 0 ? 'Empate' : (me ? (d.winner === d.my_team ? '¡Ganaron!' : 'Perdieron') : 'Terminado'), c: me && d.winner === d.my_team ? '#FFD23A' : '#8d84b8' };
    if (!me && d.my_invite) return { k: 'invited', t: 'Te invitaron', c: '#FF3D8B' };
    if (me && me.best == null) return { k: 'myturn', t: '¡Te toca jugar!', c: '#7CFF4D' };
    if (!d.full) return { k: 'waiting', t: 'Faltan jugadores (' + d.players.length + '/' + d.size + ')', c: '#22E1FF' };
    return { k: 'others', t: 'Esperando que jueguen los demás', c: '#22E1FF' };
  }

  D.init = function () {
    U = PP.ui;
    $('duelBody').addEventListener('click', onClick);
    window.addEventListener('hashchange', checkHash);
    // Esperar a que la sesión esté lista para leer el enlace de desafío y el aviso del botón
    var tries = 0, w = setInterval(function () { if (DB.user || ++tries > 20) { clearInterval(w); checkHash(); refreshBadge(); } }, 500);
    setInterval(refreshBadge, 60000);
  };
  function checkHash() {
    var m = /^#desafio-([A-Z0-9]{6})$/i.exec(location.hash || ''); if (!m) return;
    history.replaceState(null, '', location.pathname + location.search);
    if (!DB.user) { PP.Social.open('acc'); U.go('social'); U.toast('Creá tu cuenta o entrá para jugar el desafío'); D._pending = m[1].toUpperCase(); return; }
    D.show(m[1].toUpperCase());
  }
  // Aviso en el botón del inicio: invitaciones y desafíos donde te toca jugar
  function refreshBadge() {
    if (!DB.user || !DB.online) return paintBadge(0);
    DB.duelMine().then(function (l) { paintBadge((l || []).filter(function (d) { var s = stateOf(d).k; return s === 'invited' || s === 'myturn'; }).length); }, noop);
  }
  function paintBadge(n) { badge = n; var b = $('bDuel'); if (b) b.textContent = 'Con amigos' + (n ? ' (' + n + ')' : ''); }

  D.open = function () { view = 'list'; cur = null; U.go('duel'); if (D._pending && DB.user) { var c = D._pending; D._pending = null; D.show(c); } };
  D.show = function (ref) {
    DB.duelDetail(ref).then(function (d) { cur = d; view = 'detail'; U.go('duel'); }, function (e) { err(e); view = 'list'; U.go('duel'); });
  };
  D.render = function () {
    if (tick) { clearInterval(tick); tick = null; }
    if (view === 'detail' && cur) return renderDetail();
    renderList();
  };

  /* ---------- Lista ---------- */
  function renderList() {
    var body = $('duelBody');
    var top = '<div class="card" style="border-color:#7CFF4D"><h3 class="disp" style="font-size:22px;color:#7CFF4D">Desafiá a tus amigos</h3>' +
      '<p style="color:#fff">1 contra 1 o 2 contra 2. Cada uno juega <b>un turno</b> en su celu cuando puede, y gana el equipo que suma más puntos.</p>' +
      '<div class="row"><button class="btn lime" data-act="new">Crear desafío</button><button class="btn ghost" data-act="code">Tengo un código</button></div>' +
      '<div class="row" style="margin-top:8px"><button class="btn small ghost" data-act="solo">Prefiero jugar solo</button></div></div>';
    if (!DB.online) { body.innerHTML = top + '<p class="note">Los desafíos necesitan el servidor de la comunidad.</p>'; return; }
    if (!DB.user) {
      body.innerHTML = '<div class="card" style="border-color:#D8FF3A"><h3 class="disp" style="font-size:22px">Creá tu cuenta para jugar con amigos</h3><p>Es gratis. Con tu cuenta desafiás a tus amigos, armás equipos de a 2 o jugás con cualquiera.</p><button class="btn lime" data-act="login">Crear mi cuenta</button></div>' +
        '<div class="row"><button class="btn small ghost" data-act="solo">Jugar solo</button></div>';
      return;
    }
    body.innerHTML = top + '<div id="dMine"><p class="note">Cargando…</p></div><div id="dOpen"></div>';
    DB.duelMine().then(function (l) {
      l = l || []; paintBadge(l.filter(function (d) { var s = stateOf(d).k; return s === 'invited' || s === 'myturn'; }).length);
      var inv = l.filter(function (d) { return stateOf(d).k === 'invited'; }), mine = l.filter(function (d) { return stateOf(d).k !== 'invited'; }), h = '';
      if (inv.length) h += '<h3 class="disp" style="margin:6px 4px;color:#FF3D8B">Te invitaron</h3>' + inv.map(cardOf).join('');
      h += '<h3 class="disp" style="margin:10px 4px 6px">Mis desafíos</h3>' + (mine.length ? mine.map(cardOf).join('') : '<div class="card"><p>Todavía no tenés desafíos. ¡Creá uno y mandáselo a tus amigos!</p></div>');
      var el = $('dMine'); if (el) el.innerHTML = h;
    }, function (e) { var el = $('dMine'); if (el) el.innerHTML = '<p class="note">' + esc(e.message) + '</p>'; });
    DB.duelOpen().then(function (l) {
      var el = $('dOpen'); if (!el) return;
      el.innerHTML = '<h3 class="disp" style="margin:10px 4px 6px">Abiertos a cualquiera</h3>' + (l && l.length ? l.map(cardOf).join('') : '<div class="card"><p>No hay desafíos abiertos ahora. Creá uno abierto y que se sume cualquiera.</p></div>');
    }, noop);
  }
  function cardOf(d) {
    var st = stateOf(d), g = GAMES[d.game] || GAMES.peloteo;
    return '<button class="card tcard" data-duel="' + esc(d.code) + '" style="--c:' + g.color + '"><span class="chipst" style="--c:' + st.c + '">' + st.t + '</span>' +
      '<h3 class="disp">' + g.name + ' · ' + fmt(d) + '</h3><p>Creado por ' + esc(d.host) + ' · ' + d.players.length + '/' + d.size + ' jugadores' + (d.is_open ? ' · abierto' : '') + '</p>' +
      (d.done ? '<p style="color:#fff">Equipo 1: <b>' + d.total1 + '</b> · Equipo 2: <b>' + d.total2 + '</b></p>' : '<p>Cierra en ' + left(new Date(d.ends_at) - Date.now()) + '</p>') + '</button>';
  }

  /* ---------- Detalle ---------- */
  function renderDetail() {
    var d = cur, g = GAMES[d.game] || GAMES.peloteo, st = stateOf(d), per = d.size / 2, h = '';
    var me = d.players.filter(function (p) { return p.me; })[0];
    h += '<button class="btn small ghost" data-act="back" style="margin-bottom:10px">Mis desafíos</button>';
    h += '<div class="card" style="border-color:' + g.color + '"><span class="chipst" style="--c:' + st.c + '">' + st.t + '</span>' +
      '<h3 class="disp" style="font-size:26px;margin:6px 0 2px">' + g.name + '</h3><p style="color:#fff">' + fmt(d) + ' · ' + g.desc + '</p>' +
      (d.done ? '' : '<p id="dCount" style="color:#FFD23A"></p>') +
      '<div class="row" style="justify-content:flex-start;align-items:center;margin-top:6px"><span>Código:</span><b class="disp" style="font-size:26px;letter-spacing:4px;color:#fff">' + esc(d.code) + '</b>' +
      (d.done ? '' : '<button class="btn small" data-act="share">Compartir</button>') + '</div></div>';
    if (d.done) {
      var won = me && d.winner === d.my_team;
      h += '<div class="card" style="text-align:center;border-color:#FFD23A;' + (won ? 'box-shadow:0 0 24px #FFD23A' : '') + '"><h3 class="disp" style="font-size:30px;color:#FFD23A">' +
        (d.winner === 0 ? '¡Empate!' : (me ? (won ? '¡Ganaron! 🏆' : 'Esta vez no salió') : 'Ganó el equipo ' + d.winner)) + '</h3>' +
        '<p style="color:#fff;font-size:18px">Equipo 1: <b>' + d.total1 + '</b> · Equipo 2: <b>' + d.total2 + '</b></p>' +
        (me ? '<button class="btn lime" data-act="rematch">Revancha</button>' : '') + '</div>';
    }
    [1, 2].forEach(function (t) {
      var ps = d.players.filter(function (p) { return p.team === t; }), inv = (d.invited || []).filter(function (i) { return i.team === t; });
      var tot = t === 1 ? d.total1 : d.total2, mineT = d.my_team === t;
      h += '<div class="card" style="' + (mineT ? 'border-color:#7CFF4D' : '') + '"><div class="row" style="justify-content:space-between;align-items:center"><h3 class="disp" style="font-size:20px;margin:0">Equipo ' + t + (mineT ? ' · el tuyo' : '') + '</h3><b class="disp" style="font-size:24px;color:#FFD23A">' + tot + '</b></div>';
      ps.forEach(function (p) {
        h += '<div class="rk' + (p.me ? ' me' : '') + '" data-user="' + esc(p.user_id) + '" style="margin:8px 0 0">' + avatar(p.name) + '<div class="tx"><h3>' + esc(p.name) + (p.me ? ' (vos)' : '') + '</h3><p>' + (p.best == null ? 'Todavía no jugó' : 'Ya jugó') + '</p></div><div class="val"><b>' + (p.best == null ? '—' : p.best) + '</b><small>puntos</small></div></div>';
      });
      inv.forEach(function (i) { h += '<div class="rk" style="margin:8px 0 0;opacity:.75">' + avatar(i.name) + '<div class="tx"><h3>' + esc(i.name) + '</h3><p>Invitado, todavía no aceptó</p></div></div>'; });
      for (var k = ps.length + inv.length; k < per; k++) {
        h += '<div class="rk" style="margin:8px 0 0;border-style:dashed"><div class="tx"><h3>Lugar libre</h3><p>' + (d.done ? 'Nadie se sumó' : 'Invitá a alguien o compartí el código') + '</p></div>' +
          (d.done ? '' : me ? '<button class="btn small" data-act="invite" data-team="' + t + '">Invitar</button>' : (!d.my_invite ? '<button class="btn small lime" data-act="join" data-team="' + t + '">Sumarme</button>' : '')) + '</div>';
      }
      h += '</div>';
    });
    if (!d.done) {
      if (me && me.best == null) h += '<button class="btn lime big pulse" data-act="play" style="width:100%">Jugar mi turno</button><p class="note">Tenés un solo turno: si salís antes de terminar, cuenta lo que hiciste hasta ahí.</p>';
      else if (me) h += '<p class="note">Ya jugaste tu turno: ' + me.best + ' puntos. El desafío termina cuando jueguen todos o al cierre.</p>';
      else if (d.my_invite) h += '<div class="row"><button class="btn ghost" data-act="decline">No, gracias</button><button class="btn lime big" data-act="join" data-team="' + d.my_invite + '">Aceptar</button></div>';
    }
    $('duelBody').innerHTML = h;
    if (!d.done) {
      var upd = function () {
        var el = $('dCount'); if (!el) { clearInterval(tick); tick = null; return; }
        var ms = new Date(d.ends_at) - Date.now(); el.textContent = ms > 0 ? 'Cierra en ' + left(ms) : 'Cerrando…';
        if (ms <= 0) { clearInterval(tick); tick = null; D.show(d.code); }
      };
      upd(); tick = setInterval(upd, 1000);
    }
  }

  /* ---------- Crear, sumarse, invitar ---------- */
  function createForm(preset) {
    preset = preset || {};
    var size = preset.size || 2, game = preset.game || 'peloteo', open = !!preset.is_open, hours = 24;
    var pick = function (name, opts, val) { return '<div class="row" data-grp="' + name + '" style="margin:4px 0 10px">' + opts.map(function (o) { return '<button class="btn small ' + (o[0] === val ? 'lime' : 'ghost') + '" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>'; };
    U.modal('<h2>Crear desafío</h2><div style="text-align:left;width:100%">' +
      '<p style="margin:0">¿Cuántos juegan?</p>' + pick('size', [[2, '1 contra 1'], [4, '2 contra 2']], size) +
      '<p style="margin:0">¿Qué juegan?</p>' + pick('game', [['peloteo', 'Peloteo'], ['read', 'Leé la jugada'], ['lights', 'Luces']], game) +
      '<p style="margin:0">¿Con quién?</p>' + pick('open', [['0', 'Con amigos'], ['1', 'Con cualquiera']], open ? '1' : '0') +
      '<p style="margin:0">¿Cuánto tiempo tienen para jugar?</p>' + pick('hours', [[1, '1 hora'], [24, '1 día'], [72, '3 días']], hours) + '</div>' +
      '<p id="cdErr" style="color:#FF8A8A;margin:4px 0"></p><div class="row"><button class="btn ghost" id="cdNo">Cancelar</button><button class="btn lime big" id="cdOk">Crear</button></div>', function (box) {
      box.addEventListener('click', function (e) {
        var b = e.target.closest('[data-grp] [data-v]'); if (!b) return;
        var g = b.parentNode, v = b.dataset.v, n = g.dataset.grp;
        Array.prototype.forEach.call(g.children, function (x) { x.className = 'btn small ' + (x === b ? 'lime' : 'ghost'); });
        if (n === 'size') size = +v; else if (n === 'game') game = v; else if (n === 'open') open = v === '1'; else hours = +v;
      });
      U.on($('cdNo'), U.closeModal);
      U.on($('cdOk'), function () {
        $('cdOk').disabled = true;
        DB.duelCreate(size, game, open, hours).then(function (d) {
          U.closeModal(); cur = d; view = 'detail'; U.go('duel'); refreshBadge();
          if (!open) setTimeout(function () { inviteModal(size === 4 ? 1 : 2, true); }, 250);
          else U.toast('¡Desafío creado! Cualquiera lo puede ver y sumarse.');
        }, function (e) { $('cdOk').disabled = false; $('cdErr').textContent = e.message; });
      });
    });
  }
  function codeForm() {
    U.modal('<h2>Tengo un código</h2><input class="fld" id="dcC" maxlength="6" placeholder="Código de 6 letras" style="text-transform:uppercase;text-align:center;font-size:24px"><div class="row"><button class="btn ghost" id="dcNo">Cancelar</button><button class="btn lime" id="dcOk">Buscar</button></div>', function () {
      U.on($('dcNo'), U.closeModal); U.on($('dcOk'), function () { var c = $('dcC').value.trim().toUpperCase(); U.closeModal(); if (c) D.show(c); });
    });
  }
  // Invitar a quienes seguís. En 2 contra 2: "Compañero" va a tu equipo y "Rival" al otro.
  function inviteModal(team, fresh) {
    var d = cur, per = d.size / 2, mt = d.my_team || 1;
    var free = function (t) { return per - d.players.filter(function (p) { return p.team === t; }).length - (d.invited || []).filter(function (i) { return i.team === t; }).length; };
    DB.following().then(function (fl) {
      var inD = {}; d.players.forEach(function (p) { inD[p.user_id] = 1; }); (d.invited || []).forEach(function (i) { inD[i.user_id] = 1; });
      var rows = fl.filter(function (p) { return !inD[p.id]; }).map(function (p) {
        var btns = d.size === 4
          ? (free(mt) > 0 ? '<button class="btn small lime" data-inv="' + esc(p.id) + '" data-t="' + mt + '">Compañero</button>' : '') + (free(3 - mt) > 0 ? '<button class="btn small" data-inv="' + esc(p.id) + '" data-t="' + (3 - mt) + '">Rival</button>' : '')
          : (free(3 - mt) > 0 ? '<button class="btn small lime" data-inv="' + esc(p.id) + '" data-t="' + (3 - mt) + '">Invitar</button>' : '');
        return '<div class="rk">' + avatar(p.name) + '<div class="tx"><h3>' + esc(p.name) + '</h3><p>' + esc(p.cat || '') + ' · ' + esc(p.side || '') + '</p></div><div class="row" style="gap:6px;flex-wrap:nowrap">' + btns + '</div></div>';
      }).join('');
      U.modal((fresh ? '<h2>¡Desafío creado!</h2>' : '<h2>Invitar</h2>') + '<p>' + (d.size === 4 ? 'Elegí tu <b>compañero</b> y a los <b>rivales</b>.' : 'Elegí a quién desafiar.') + ' Les aparece en "Con amigos".</p>' +
        (rows ? '<div id="dInvBox" style="max-height:44vh;overflow:auto;text-align:left;width:100%">' + rows + '</div>'
          : '<p>' + (fl.length ? 'Ya invitaste a todos los que seguís.' : 'Todavía no seguís a nadie. En Comunidad → Ranking buscá a tus amigos por nombre y tocá <b>Seguir</b>.') + '</p>') +
        '<p class="note">También podés mandar el código <b style="color:#fff">' + esc(d.code) + '</b> por WhatsApp.</p>' +
        '<div class="row"><button class="btn ghost" id="diShare">Compartir por WhatsApp</button><button class="btn lime" id="diOk">Listo</button></div>', function () {
        U.on($('diOk'), function () { U.closeModal(); D.show(d.code); });
        U.on($('diShare'), function () { share(d); });
        var box = $('dInvBox'); if (box) box.addEventListener('click', function (e) {
          var b = e.target.closest('[data-inv]'); if (!b || b.disabled) return; b.disabled = true;
          DB.duelInvite(d.id, b.dataset.inv, +b.dataset.t).then(function () {
            (d.invited = d.invited || []).push({ user_id: b.dataset.inv, team: +b.dataset.t, name: '' });
            var row = b.parentNode; row.innerHTML = '<span class="chipst" style="--c:#7CFF4D">Invitado</span>';
            Array.prototype.forEach.call(box.querySelectorAll('[data-t]'), function (x) { if (free(+x.dataset.t) <= 0) x.remove(); });
          }, function (er) { b.disabled = false; err(er); });
        });
      });
    }, err);
  }
  function share(d) {
    var g = GAMES[d.game] || GAMES.peloteo, url = SITE + '#desafio-' + d.code;
    var text = '¡Te desafío en A la Pelotita! ' + g.name + ', ' + fmt(d) + '. Código ' + d.code + ': ' + url;
    if (navigator.share) { navigator.share({ title: 'Desafío en A la Pelotita', text: text }).catch(noop); return; }
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
  }
  function play(d) {
    var g = GAMES[d.game] || GAMES.peloteo;
    U.modal('<h2>¡A jugar!</h2><p style="color:#fff">' + g.name + ': ' + g.desc + '</p><p>Tenés <b>un solo turno</b>. Lo que sumes va para tu equipo.</p>' +
      '<div class="row"><button class="btn ghost" id="dpNo">Todavía no</button><button class="btn lime big" id="dpOk">¡Vamos!</button></div>', function () {
      U.on($('dpNo'), U.closeModal);
      U.on($('dpOk'), function () {
        U.closeModal(); var ctx = 'duel:' + d.id;
        if (d.game === 'read' || d.game === 'lights') { PP.tourCtx = ctx; U.startDrill(d.game); return; }
        U.startLevel({ tour: ctx, type: 'rally', need: 1e9, misses: 3, rival: 'Sparring', goal: 'Desafío: sumá todos los puntos que puedas. Tenés 3 errores.', world: 0, sprite: 'assets/sprites/r4.png', diff: 10, n: 0 });
        $('nMe').textContent = 'Puntos'; $('nOp').textContent = 'Desafío';
      });
    });
  }
  // Fin del turno (lo llama el juego al terminar el partido o el ejercicio)
  D.done = function (id, score) {
    score = Math.max(0, Math.round(score || 0));
    DB.duelSubmit(id, score).then(function (r) {
      var d = r.duel; cur = d; view = 'detail'; U.go('duel'); refreshBadge();
      var me = d.players.filter(function (p) { return p.me; })[0];
      if (d.done) {
        var won = me && d.winner === d.my_team;
        U.modal('<h2>' + (d.winner === 0 ? '¡Empate!' : won ? '¡GANARON! 🏆' : 'Esta vez no salió') + '</h2><div class="iq">' + score + '</div><p style="color:#fff">Equipo 1: <b>' + d.total1 + '</b> · Equipo 2: <b>' + d.total2 + '</b></p>' +
          '<div class="row"><button class="btn ghost" id="drSee">Ver desafío</button><button class="btn lime big" id="drRe">Revancha</button></div>', function () {
          U.on($('drSee'), U.closeModal); U.on($('drRe'), function () { U.closeModal(); createForm(d); });
        });
      } else {
        U.modal('<h2>¡Turno jugado!</h2><div class="iq">' + score + '</div><p style="color:#fff">Sumaste para tu equipo. Ahora tienen que jugar los demás: te avisamos en "Con amigos" cuando termine.</p>' +
          '<div class="row"><button class="btn ghost" id="drSh">Avisarles por WhatsApp</button><button class="btn lime big" id="drOk">Listo</button></div>', function () {
          U.on($('drOk'), U.closeModal); U.on($('drSh'), function () { share(d); });
        });
      }
    }, function (e) { err(e); D.show(id); });
  };

  function onClick(e) {
    var b = e.target.closest('[data-act],[data-duel]'); if (!b) return;
    if (b.dataset.duel) { D.show(b.dataset.duel); return; }
    var a = b.dataset.act;
    if (a === 'login') { PP.Social.open('acc'); U.go('social'); }
    else if (a === 'solo') U.go('map');
    else if (a === 'new') createForm();
    else if (a === 'code') codeForm();
    else if (a === 'back') { view = 'list'; cur = null; D.render(); }
    else if (a === 'share') share(cur);
    else if (a === 'invite') inviteModal(+b.dataset.team);
    else if (a === 'play') play(cur);
    else if (a === 'rematch') createForm(cur);
    else if (a === 'join') { b.disabled = true; DB.duelJoin(cur.code, +b.dataset.team).then(function (d) { cur = d; U.toast('¡Estás adentro! Jugá tu turno cuando quieras.'); D.render(); refreshBadge(); }, function (er) { b.disabled = false; err(er); }); }
    else if (a === 'decline') DB.duelUninvite(cur.id, null).then(function () { U.toast('Invitación rechazada'); view = 'list'; cur = null; D.render(); refreshBadge(); }, err);
  }
})();
