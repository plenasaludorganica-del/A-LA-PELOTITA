/* A la Pelotita · Comunidad: cuenta, ranking, torneos con pronósticos gratis y sponsors */
(function () {
  'use strict';
  var PP = window.PP, DB = PP.DB, U = null;
  var So = PP.Social = {}, tab = 'rank', rankKind = 'stars', cur = null, tick = null;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function noop() {}
  function hue(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; }
  function avatar(name) {
    var p = String(name || '?').trim().split(/\s+/), ini = (p[0][0] || '?') + (p[1] ? p[1][0] : '');
    return '<span class="av" style="background:hsl(' + hue(name || '') + ' 70% 45%)">' + esc(ini.toUpperCase()) + '</span>';
  }
  function when(d) { return new Date(d).toLocaleString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  function left(ms) {
    if (ms <= 0) return 'ya'; var m = Math.floor(ms / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
    return d > 0 ? d + ' d ' + (h % 24) + ' h' : h > 0 ? h + ' h ' + (m % 60) + ' min' : m > 0 ? m + ' min' : Math.ceil(ms / 1000) + ' s';
  }
  var KIND = { peloteo: 'Peloteo por puntos', mental: 'Leé la jugada' };
  var PHASE = { open: ['Inscripción abierta', '#7CFF4D'], closed: ['Pronósticos cerrados', '#FFB020'], live: ['En juego', '#FF3D8B'], done: ['Terminado', '#8d84b8'] };
  function needLogin(fn) { if (DB.user) return fn(); tab = 'acc'; So.render(); U.toast('Creá tu cuenta o entrá para seguir'); }
  function err(e) { U.toast(e && e.message ? e.message : 'Algo salió mal. Probá de nuevo.'); }

  So.init = function () {
    U = PP.ui;
    DB.init().then(function () { So.sync(); So.paintAcc(); checkHash(); }, noop);
    // Muñequito del inicio: sin sesión abre directo el formulario para crear la cuenta
    $('accBtn').addEventListener('click', function () { So.open('acc'); if (!DB.user) mode = 'up'; U.go('social'); });
    window.addEventListener('hashchange', checkHash);
    $('soTabs').addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (!b) return; tab = b.dataset.tab; cur = null; proCh = 0; proView = 'list'; So.render(); });
    $('soBody').addEventListener('click', onClick);
  };
  function checkHash() {
    if (location.hash === '#pro-pago') {   // vuelta de Mercado Pago: el alta puede tardar unos segundos en llegar
      history.replaceState(null, '', location.pathname); So.open('pro'); U.go('social');
      var tries = 0, again = function () { DB.refreshMe().then(function () { if (DB.isVip()) { So.render(); U.toast('¡Ya sos PRO!'); } else if (++tries < 15) setTimeout(again, 4000); else U.toast('Tu pago se está acreditando. El Pro se activa solo en unos minutos.'); }, noop); };
      again(); return;
    }
    var m = /^#torneo-([A-Z0-9]{6})$/.exec(location.hash || ''); if (!m) return;
    if (DB.online && !DB.user) { pendingTour = m[1]; tab = 'acc'; mode = 'up'; U.go('social'); U.toast('Creá tu cuenta o entrá para ver el torneo'); return; }
    tab = 'tour'; U.go('social'); openTour(m[1]);
  }
  var pendingTour = null;
  // Sube al servidor las estrellas, el nivel y el IQ de este jugador
  // Muñequito de la esquina: "Entrar" si no hay sesión; dorado si es Pro
  So.paintAcc = function () {
    var b = $('accBtn'); if (!b) return;
    var u = DB.user, l = $('accLbl');
    b.className = 'chip' + (u ? ' in' : '') + (u && DB.isVip() ? ' pro' : '');
    l.textContent = u ? String(u.name || 'Mi cuenta').split(/\s+/)[0] + (DB.isVip() ? ' · PRO' : '') : 'Entrar';
    b.setAttribute('aria-label', u ? 'Mi cuenta: ' + u.name : 'Entrar o crear cuenta');
  };
  So.sync = function () {
    if (!DB.user || !U) return; var s = U.save();
    DB.pushStats({ stars: U.totalStars(), level: s.level + 1, iq: U.iq(), picks: s.picks || 0 }).catch(noop);
  };

  So.render = function () {
    So.paintAcc();
    if (tick) { clearInterval(tick); tick = null; }
    var tabs = [['rank', 'Ranking'], ['tour', 'Torneos'], ['pro', 'Jugadas'], ['spon', 'Sponsors'], ['acc', DB.user ? 'Cuenta' : 'Entrar']];
    $('soTabs').innerHTML = tabs.map(function (t) { return '<button class="tab' + (tab === t[0] ? ' on' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('');
    $('soBody').innerHTML = '<p class="note">Cargando…</p>';
    ({ rank: renderRank, tour: cur ? renderTour : renderTours, pro: renderPro, spon: renderSpon, acc: renderAcc })[tab]();
  };
  function demoNote() { return DB.online ? '' : '<p class="note">Modo demo: por ahora los datos se guardan solo en este celular. El ranking y los torneos entre jugadores se activan al conectar el servidor.</p>'; }

  /* ---------- Ranking ---------- */
  var rankQ = '', rankT = null;
  function loginCard(what) { return '<div class="card" style="border-color:#D8FF3A"><h3 class="disp" style="font-size:22px">Creá tu cuenta para ver ' + what + '</h3><p>Es gratis. Con tu cuenta aparecés en el ranking, buscás jugadores y jugás torneos con otros.</p><button class="btn lime" data-act="goacc">Crear mi cuenta</button></div>'; }
  function renderRank() {
    if (DB.online && !DB.user) { $('soBody').innerHTML = loginCard('el ranking'); return; }
    var kinds = [['stars', 'Estrellas'], ['iq', 'IQ de pádel'], ['picks', 'Pronósticos']];
    $('soBody').innerHTML = '<div class="row" style="margin-bottom:10px">' + kinds.map(function (k) { return '<button class="btn small ' + (rankKind === k[0] ? 'lime' : 'ghost') + '" data-rk="' + k[0] + '">' + k[1] + '</button>'; }).join('') + '</div>' +
      '<input class="fld" id="rkQ" type="search" maxlength="40" autocomplete="off" placeholder="Buscar jugador por nombre" value="' + esc(rankQ) + '"><div id="rkList"><p class="note">Cargando…</p></div>' + demoNote();
    $('rkQ').addEventListener('input', function () { rankQ = this.value.trim(); clearTimeout(rankT); rankT = setTimeout(paintRank, 300); });
    paintRank();
  }
  function paintRank() {
    var unit = { stars: 'estrellas', iq: 'IQ', picks: 'aciertos' }, q = rankQ, k = rankKind;
    (q.length >= 2 ? DB.searchPlayers(q) : DB.ranking(k)).then(function (list) {
      var el = $('rkList'); if (!el || q !== rankQ || k !== rankKind) return;
      if (q.length >= 2) list = list.slice().sort(function (a, b) { return (b[k] || 0) - (a[k] || 0); });
      var h = '';
      if (!list.length) h = q.length >= 2 ? '<div class="card"><p>No encontramos a nadie con "' + esc(q) + '".</p></div>' : '<div class="card"><h3 class="disp">Todavía no hay nadie</h3><p>Creá tu cuenta y sé el primero del ranking.</p><button class="btn lime" data-act="goacc">Crear mi cuenta</button></div>';
      list.forEach(function (p, i) {
        var mine = DB.user && p.id === DB.user.id, medal = q.length >= 2 ? null : ['#FFD23A', '#C9D3E6', '#E0915A'][i];
        h += '<div class="rk' + (mine ? ' me' : '') + '" style="' + (medal ? '--mc:' + medal : '') + '"><b class="pos">' + (q.length >= 2 ? '' : i + 1) + '</b>' + avatar(p.name) + '<div class="tx"><h3>' + esc(p.name) + (mine ? ' (vos)' : '') + '</h3><p>' + esc(p.cat || '') + ' · ' + esc(p.side || '') + ' · nivel ' + (p.level || 1) + '</p></div><div class="val"><b>' + (p[k] || 0) + '</b><small>' + unit[k] + '</small></div></div>';
      });
      el.innerHTML = h;
    }, function (e) { var el = $('rkList'); if (el) el.innerHTML = '<p class="note">' + esc(e.message) + '</p>'; });
  }

  /* ---------- Torneos ---------- */
  function renderTours() {
    if (DB.online && !DB.user) { $('soBody').innerHTML = loginCard('los torneos'); return; }
    DB.tournaments().then(function (list) {
      var h = '<div class="row" style="margin-bottom:12px"><button class="btn lime" data-act="newtour">Crear torneo</button><button class="btn ghost" data-act="code">Tengo un código</button></div>';
      if (!list.length) h += '<div class="card"><h3 class="disp">No hay torneos todavía</h3><p>Armá el primero, invitá a tus amigos y que la gente pronostique quién gana.</p></div>';
      list.forEach(function (t) {
        var ph = PHASE[DB.phase(t)];
        h += '<button class="card tcard" data-tour="' + esc(t.id) + '"><span class="chipst" style="--c:' + ph[1] + '">' + ph[0] + '</span><h3 class="disp">' + esc(t.name) + '</h3><p>' + KIND[t.kind] + ' · ' + (t.mode === 'parejas' ? 'Parejas' : 'Individual') + '</p><p>' + when(t.start_at) + ' · organiza ' + esc(t.host || '') + '</p></button>';
      });
      $('soBody').innerHTML = h + '<p class="note">Los pronósticos son gratis y por diversión: no se juega plata ni hay premios en dinero. Cierran 5 minutos antes de que empiece el torneo.</p>' + demoNote();
    }, function (e) { $('soBody').innerHTML = '<p class="note">' + esc(e.message) + '</p>'; });
  }
  function openTour(id) { tab = 'tour'; DB.tournament(id).then(function (t) { cur = t; So.render(); }, function (e) { cur = null; So.render(); err(e); }); }
  function renderTour() {
    var t = cur, ph = DB.phase(t), st = new Date(t.start_at).getTime(), en = st + t.hours * 3600000, now = Date.now();
    var joined = DB.user && t.players.some(function (p) { return p.user_id === DB.user.id; }), win = DB.winner(t), total = t.bets.length;
    var h = '<button class="btn small ghost" data-act="back" style="margin-bottom:10px">' + U.ic('back') + ' Torneos</button>';
    h += '<div class="card"><span class="chipst" style="--c:' + PHASE[ph][1] + '">' + PHASE[ph][0] + '</span><h3 class="disp" style="font-size:26px">' + esc(t.name) + '</h3><p>' + KIND[t.kind] + ' · ' + (t.mode === 'parejas' ? 'Parejas' : 'Individual') + ' · organiza ' + esc(t.host || '') + '</p>' +
      '<p style="color:#fff">Empieza: ' + when(t.start_at) + ' · dura ' + (t.hours >= 24 ? (t.hours / 24) + (t.hours === 24 ? ' día' : ' días') : t.hours + (t.hours === 1 ? ' hora' : ' horas')) + '</p><p id="tCount" style="color:#FFD23A"></p>' +
      '<div class="row" style="justify-content:flex-start;margin-top:8px">' +
      ((ph === 'open' || ph === 'closed') && !joined ? '<button class="btn lime" data-act="join">Inscribirme</button>' : '') +
      (ph === 'live' && joined ? '<button class="btn lime pulse" data-act="play">Jugar mi turno</button>' : '') +
      '<button class="btn ghost" data-act="poster">Ver cartel</button></div></div>';
    if (win) h += '<div class="card" style="border-color:#FFD23A;box-shadow:0 0 20px #FFD23A"><h3 class="disp" style="color:#FFD23A">Ganó ' + esc(win.name) + '</h3><p>Con ' + win.score + ' puntos.' + (t.myBet ? (t.myBet.pick === win.user_id ? ' <b style="color:#D8FF3A">¡Acertaste tu pronóstico!</b>' : ' Tu pronóstico no salió esta vez.') : '') + '</p></div>';
    else if (ph === 'done') h += '<div class="card"><h3 class="disp">Terminó sin ganador</h3><p>Nadie llegó a sumar puntos.</p></div>';
    h += '<h3 class="disp" style="margin:6px 4px">' + (ph === 'open' ? '¿Quién gana? Elegí tu pronóstico' : 'Jugadores') + '</h3>';
    if (!t.players.length) h += '<div class="card"><p>Todavía no hay inscriptos. Compartí el cartel para que se sumen.</p></div>';
    t.players.slice().sort(function (a, b) { return b.score - a.score; }).forEach(function (p, i) {
      var n = t.bets.filter(function (b) { return b.pick === p.user_id; }).length, mine = t.myBet && t.myBet.pick === p.user_id;
      h += '<div class="rk' + (mine ? ' me' : '') + '"><b class="pos">' + (ph === 'open' || ph === 'closed' ? '' : i + 1) + '</b>' + avatar(p.name) + '<div class="tx"><h3>' + esc(p.name) + '</h3><p>' + (total ? Math.round(n / total * 100) + ' % de los pronósticos' : 'Sin pronósticos todavía') + (mine ? ' · tu elegido' : '') + '</p></div>' +
        (ph === 'open' ? '<button class="btn small ' + (mine ? 'lime' : 'ghost') + '" data-pick="' + esc(p.user_id) + '">' + (mine ? 'Elegido' : 'Elegir') + '</button>' : '<div class="val"><b>' + p.score + '</b><small>puntos</small></div>') + '</div>';
    });
    $('soBody').innerHTML = h + '<p class="note">Pronóstico gratis y por diversión, sin plata. Cierra 5 minutos antes del inicio.</p>';
    creditPick(t, win);
    var upd = function () {
      var el = $('tCount'); if (!el) { clearInterval(tick); tick = null; return; }
      var n = Date.now(), p2 = DB.phase(t, n);
      el.textContent = p2 === 'open' ? 'Los pronósticos cierran en ' + left(st - DB.BET_CLOSE_MS - n) : p2 === 'closed' ? 'Empieza en ' + left(st - n) : p2 === 'live' ? 'Termina en ' + left(en - n) : '';
      if (p2 !== ph) { clearInterval(tick); tick = null; openTour(t.id); }
    };
    upd(); tick = setInterval(upd, 1000);
  }
  // Suma un acierto al ranking de pronósticos, una sola vez por torneo
  function creditPick(t, win) {
    if (!win || !t.myBet || t.myBet.pick !== win.user_id || !DB.user) return;
    var s = U.save(); s.credited = s.credited || {}; if (s.credited[t.id]) return;
    s.credited[t.id] = 1; s.picks = (s.picks || 0) + 1; s.coins += 150; U.persist(); So.sync(); U.toast('¡Pronóstico acertado! +150 monedas');
  }
  function formTour() {
    var d = new Date(Date.now() + 3600000), pad = function (n) { return ('0' + n).slice(-2); };
    U.modal('<h2>Crear torneo</h2><input class="fld" id="tName" maxlength="60" placeholder="Nombre del torneo">' +
      '<label class="lb">¿A qué se juega?<select class="fld" id="tKind"><option value="peloteo">Peloteo por puntos (el juego)</option><option value="mental">Leé la jugada (táctica)</option></select></label>' +
      '<label class="lb">¿Cómo se juega?<select class="fld" id="tMode"><option value="individual">Individual</option><option value="parejas">En parejas</option></select></label>' +
      '<label class="lb">Día<input class="fld" id="tDate" type="date" value="' + d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + '"></label>' +
      '<label class="lb">Hora de inicio<input class="fld" id="tTime" type="time" value="' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + '"></label>' +
      '<label class="lb">Duración<select class="fld" id="tHours"><option value="1">1 hora</option><option value="3">3 horas</option><option value="24" selected>1 día</option><option value="72">3 días</option></select></label>' +
      '<p id="tErr" style="color:#FF8A8A"></p><div class="row"><button class="btn ghost" id="tNo">Cancelar</button><button class="btn lime big" id="tOk">Crear</button></div>', function () {
      U.on($('tNo'), U.closeModal);
      U.on($('tOk'), function () {
        var name = $('tName').value.trim(), start = new Date($('tDate').value + 'T' + $('tTime').value);
        if (name.length < 3) { $('tErr').textContent = 'Ponele un nombre al torneo.'; return; }
        if (isNaN(start) || start.getTime() < Date.now() + 10 * 60000) { $('tErr').textContent = 'El inicio tiene que ser al menos 10 minutos más tarde que ahora.'; return; }
        $('tOk').disabled = true;
        DB.createTournament({ name: name, kind: $('tKind').value, mode: $('tMode').value, start_at: start.toISOString(), hours: +$('tHours').value })
          .then(function (t) { return DB.join(t.id, '').then(function () { return DB.tournament(t.id); }); })
          .then(function (t) { cur = t; So.render(); poster(t, true); }, function (e) { $('tOk').disabled = false; $('tErr').textContent = e.message; });
      });
    });
  }
  function poster(t, fresh) {
    var link = location.origin + location.pathname + '#torneo-' + t.code;
    U.modal((fresh ? '<h2>¡Torneo creado!</h2>' : '') + '<div class="poster"><span class="pk">TORNEO DE PÁDEL ARCADE</span><h3>' + esc(t.name) + '</h3><p class="pd">' + when(t.start_at) + '</p><p>' + KIND[t.kind] + ' · ' + (t.mode === 'parejas' ? 'Parejas' : 'Individual') + '</p>' +
      '<div class="pc"><small>CÓDIGO</small><b>' + esc(t.code) + '</b></div><p class="pf">Inscribite o pronosticá gratis quién gana.<br>Los pronósticos cierran 5 minutos antes.</p><span class="pl">A LA PELOTITA</span></div>' +
      '<p>Sacale captura al cartel y compartilo. Quien entre con el enlace o el código puede inscribirse y pronosticar.</p><input class="fld" id="pLink" readonly value="' + esc(link) + '">' +
      '<div class="row"><button class="btn ghost" id="pNo">Cerrar</button><button class="btn lime" id="pCopy">Copiar enlace</button></div>', function () {
      U.on($('pNo'), U.closeModal);
      U.on($('pCopy'), function () { var sel = function () { $('pLink').focus(); $('pLink').select(); }; try { navigator.clipboard.writeText(link).then(function () { U.toast('Enlace copiado'); }, sel); } catch (e) { sel(); } });
    });
  }
  So.play = function (t) {
    if (t.kind === 'mental') { PP.tourCtx = t.id; U.startDrill('read'); return; }
    U.startLevel({ tour: t.id, type: 'rally', need: 1e9, misses: 3, rival: 'Sparring', goal: 'Torneo: sumá puntos. Tenés 3 errores.', world: 0, sprite: 'assets/sprites/r4.png', diff: 10, n: 0 });
    $('nMe').textContent = 'Puntos'; $('nOp').textContent = 'Torneo';
  };
  So.tourDone = function (id, score) {
    U.go('social');
    DB.submitScore(id, Math.round(score)).then(function (best) {
      U.modal('<h2>¡Turno jugado!</h2><div class="iq">' + Math.round(score) + '</div><p style="color:#fff;font-size:17px">Tu mejor marca en este torneo: <b>' + best + '</b> puntos.</p><p>Podés volver a jugar las veces que quieras mientras el torneo esté abierto. Cuenta tu mejor turno.</p>' +
        '<div class="row"><button class="btn ghost" id="dSee">Ver torneo</button><button class="btn lime big" id="dAgain">Jugar otra vez</button></div>', function () {
        U.on($('dSee'), function () { U.closeModal(); openTour(id); });
        U.on($('dAgain'), function () { U.closeModal(); DB.tournament(id).then(So.play, err); });
      });
    }, function (e) { err(e); openTour(id); });
  };

  /* ---------- Jugadas PRO: 50 jugadas para copiar, videos de hasta 20 s, me gusta ---------- */
  var proCh = 0, proView = 'list', proList = [], CFG = PP.CONFIG || {}, proPrice = 0;
  So.open = function (t) { tab = t; cur = null; proCh = 0; proView = 'list'; };
  function fecha(d) { return new Date(d).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }); }
  function chip(lvl) { var l = PP.CH_LEVELS[lvl]; return '<span class="chipst" style="--c:' + l[1] + '">' + l[0] + '</span>'; }
  function fail(e) { $('soBody').innerHTML = '<p class="note">' + esc(e.message) + '</p>'; }
  /* Ventana "Hacete PRO": beneficios, precio y botón de pago. Se abre con "Quiero ser PRO" y apenas alguien crea su cuenta. */
  So.offerPro = function () {
    if (!DB.user || !DB.online || DB.isVip() || !CFG.proCheckout) return;
    DB.proPrice().then(function (n) {
      if (!n || DB.isVip()) return;
      var li = function (t) { return '<li style="margin:7px 0">' + t + '</li>'; };
      U.modal('<h2 style="color:#FFD23A">Hacete PRO</h2>' +
        '<p style="color:#fff">Antes de entrenar o de jugar un partido, la cabeza tiene que estar lista. PRO te mete de lleno en la comunidad que entrena la lectura del juego.</p>' +
        '<ul style="text-align:left;list-style:none;padding:0;margin:10px 0;color:#fff">' +
        li('✅ Subís hasta <b>' + DB.VIDEOS_PER_MONTH + ' videos por mes</b> copiando las 50 jugadas') +
        li('✅ Ves los videos de todos los jugadores') +
        li('✅ Votás con me gusta y aparecés en el <b>ranking de cada jugada</b>') +
        li('✅ Entrás a las <b>competencias nuevas</b> que se van sumando') +
        li('✅ Ayudás a que A la Pelotita siga creciendo') + '</ul>' +
        '<p style="color:#fff;font-size:22px;margin:8px 0"><b>$ ' + n.toLocaleString('es-AR') + '</b> por 30 días</p>' +
        '<p style="font-size:13px">Pago único con Mercado Pago. No se renueva solo.</p>' +
        '<div class="row"><button class="btn ghost" id="oNo">Ahora no</button><button class="btn lime big" id="oOk">Pagar con Mercado Pago</button></div>', function () {
        U.on($('oNo'), U.closeModal);
        U.on($('oOk'), function () {
          var b = $('oOk'); b.disabled = true; b.textContent = 'Abriendo Mercado Pago…';
          DB.proCheckout().then(function (url) { location.href = url; }, function (e) { b.disabled = false; b.textContent = 'Pagar con Mercado Pago'; err(e); });
        });
      });
    }, noop);
  };
  function proHead() {
    var u = DB.user, h;
    if (!u) return '<div class="card" style="border-color:#FFD23A"><h3 class="disp" style="color:#FFD23A;font-size:22px">Jugadas PRO</h3><p style="color:#fff">50 jugadas para copiar, de la más fácil a la más difícil. Mirá las indicaciones gratis. Con la suscripción Pro subís tu video, ves los de los demás y votás.</p><button class="btn lime" data-act="goacc">Crear mi cuenta</button></div>';
    if (!DB.isVip()) {
      h = '<div class="card" style="border-color:#FFD23A;box-shadow:0 0 18px rgba(255,210,58,.45)"><h3 class="disp" style="color:#FFD23A;font-size:22px">Hacete PRO</h3><p style="color:#fff">Con la suscripción Pro:</p><p>· Subís hasta ' + DB.VIDEOS_PER_MONTH + ' videos por mes copiando las jugadas<br>· Ves los videos de todos<br>· Votás con me gusta y aparecés en el ranking de cada jugada</p>' +
        (proPrice ? '<p style="color:#fff;font-size:20px"><b>$ ' + proPrice.toLocaleString('es-AR') + '</b> por 30 días · pagás con Mercado Pago</p><button class="btn lime" data-act="proinfo">Quiero ser PRO</button>'
          : (CFG.proPrice ? '<p style="color:#fff;font-size:18px"><b>' + esc(CFG.proPrice) + '</b></p>' : '') +
            (CFG.proLink ? '<a class="btn lime" href="' + esc(CFG.proLink) + '" target="_blank" rel="noopener noreferrer" style="text-decoration:none">Quiero ser PRO</a>' : '<p>Pedile tu alta Pro a la organización con el mail de tu cuenta: <b style="color:#fff">' + esc(u.email || '') + '</b></p>')) +
        '</div>';
      return h;
    }
    h = '<div class="card"><h3 class="disp" style="color:#FFD23A;font-size:20px">Sos PRO' + (u.is_admin ? ' · Administración' : ' hasta el ' + fecha(u.vip_until)) + '</h3><p id="proCount"></p><div class="row" style="justify-content:flex-start;flex-wrap:wrap">' +
      '<button class="btn small ghost" data-act="promine">Mis videos</button>' +
      (u.is_admin ? '<button class="btn small" data-act="prorev">Revisar videos</button><button class="btn small ghost" data-act="prousers">Usuarios</button>' : '') + '</div></div>';
    return h;
  }
  function paintCount() { if (!DB.isVip()) return; DB.monthCount().then(function (n) { var el = $('proCount'); if (el) el.textContent = 'Este mes subiste ' + n + ' de ' + DB.VIDEOS_PER_MONTH + ' videos.'; }, noop); }
  var lastCheck = 0;
  function quietCheck() {
    if (!DB.user || !DB.online || DB.isVip() || Date.now() - lastCheck < 15000) return;
    lastCheck = Date.now();
    DB.refreshMe().then(function () { if (DB.isVip()) { So.render(); U.toast('¡Ya sos PRO!'); } }, noop);
  }
  function renderPro() {
    quietCheck();
    if (proCh) return renderChallenge();
    if (proView === 'mine') return renderVideoList('Mis videos', DB.myVideos(), 'mine');
    if (proView === 'rev') return renderVideoList('Videos para revisar', DB.pendingVideos(), 'rev');
    if (proView === 'users') return renderUsers();
    var paint = function (counts) {
      var h = proHead(), last = 0;
      PP.CHALLENGES.forEach(function (c, i) {
        if (c[0] !== last) { last = c[0]; h += '<h3 class="disp" style="margin:12px 4px 6px;color:' + PP.CH_LEVELS[last][1] + '">' + PP.CH_LEVELS[last][0] + '</h3>'; }
        var n = counts && counts[i + 1];
        h += '<button class="card tcard" data-act="ch" data-id="' + (i + 1) + '"><h3 class="disp">' + (i + 1) + '. ' + esc(c[1]) + '</h3><p>' + esc(c[2]) + '</p>' + (counts ? '<p style="color:#FFD23A">' + (n ? n + (n === 1 ? ' video' : ' videos') : 'Sé el primero en subirla') + '</p>' : '') + '</button>';
      });
      $('soBody').innerHTML = h + demoNote(); paintCount();
    };
    if (DB.isVip()) DB.videoCounts().then(paint, function () { paint(null); });
    else if (DB.user && CFG.proCheckout) DB.proPrice().then(function (n) { proPrice = n; paint(null); });
    else paint(null);
  }
  function videoCard(v, mode) {
    var c = PP.CHALLENGES[v.challenge - 1] || [1, 'Jugada', ''], st = { pending: ['EN REVISIÓN', '#FFB020'], approved: ['PUBLICADO', '#7CFF4D'], rejected: ['NO APROBADO', '#FF8A8A'] }[v.status];
    return '<div class="card" data-vid="' + esc(v.id) + '"><div class="row" style="justify-content:flex-start;align-items:center;gap:10px">' + avatar(v.name) + '<div class="tx" style="flex:1;text-align:left"><h3>' + esc(v.name) + '</h3><p>' + (mode ? esc(v.challenge + '. ' + c[1]) + ' · ' : '') + fecha(v.created_at) + '</p></div>' +
      (mode && st ? '<span class="chipst" style="--c:' + st[1] + '">' + st[0] + '</span>' : '') + '</div>' +
      '<div class="vbox" style="margin:10px 0">' + (v.status === 'rejected' ? '<p>Este video no se publicó.</p>' : '<button class="btn ghost" data-act="vplay" data-id="' + esc(v.id) + '" style="width:100%">▶ Ver video</button>') + '</div>' +
      '<div class="row" style="justify-content:flex-start;flex-wrap:wrap">' +
      (mode === 'rev' ? '<button class="btn small lime" data-act="vok" data-id="' + esc(v.id) + '">Aprobar</button><button class="btn small ghost" data-act="vno" data-id="' + esc(v.id) + '">Rechazar</button>'
        : mode === 'mine' ? '<span style="color:#FFD23A">' + v.likes + ' me gusta</span><button class="btn small ghost" data-act="vdel" data-id="' + esc(v.id) + '">Borrar</button>'
        : '<button class="btn small ' + (v.liked ? 'lime' : 'ghost') + '" data-act="vlike" data-id="' + esc(v.id) + '">♥ ' + v.likes + '</button>' + (DB.isAdmin() ? '<button class="btn small ghost" data-act="vno" data-id="' + esc(v.id) + '">Quitar</button>' : '')) +
      '</div></div>';
  }
  function renderChallenge() {
    var c = PP.CHALLENGES[proCh - 1];
    var top = '<button class="btn small ghost" data-act="problist" style="margin-bottom:10px">' + U.ic('back') + ' Jugadas</button>' +
      '<div class="card">' + chip(c[0]) + '<h3 class="disp" style="font-size:24px">' + proCh + '. ' + esc(c[1]) + '</h3><p style="color:#fff;font-size:17px">' + esc(c[2]) + '</p><p>Grabate copiando la jugada tal cual dice la indicación. Hasta ' + DB.VIDEO_MAX_S + ' segundos.</p>' +
      (DB.isVip() ? '<button class="btn lime" data-act="vup">Subir mi video</button>' : '') + '</div>';
    if (!DB.isVip()) { $('soBody').innerHTML = top + proHead(); return; }
    DB.videos(proCh).then(function (list) {
      proList = list;
      $('soBody').innerHTML = top + '<h3 class="disp" style="margin:6px 4px">Videos de esta jugada</h3>' + (list.length ? list.map(function (v) { return videoCard(v, ''); }).join('') : '<div class="card"><p>Todavía no hay videos publicados de esta jugada. Subí el primero.</p></div>') +
        '<p class="note">Cada video se revisa antes de publicarse.</p>';
    }, fail);
  }
  function renderVideoList(title, prom, mode) {
    prom.then(function (list) {
      proList = list;
      $('soBody').innerHTML = '<button class="btn small ghost" data-act="problist" style="margin-bottom:10px">' + U.ic('back') + ' Jugadas</button><h3 class="disp" style="margin:6px 4px">' + title + '</h3>' +
        (list.length ? list.map(function (v) { return videoCard(v, mode); }).join('') : '<div class="card"><p>' + (mode === 'rev' ? 'No hay videos esperando revisión.' : 'Todavía no subiste ningún video.') + '</p></div>');
    }, fail);
  }
  var usrQ = '', usrT = null, usrList = [];
  function renderUsers() {
    $('soBody').innerHTML = '<button class="btn small ghost" data-act="problist" style="margin-bottom:10px">' + U.ic('back') + ' Jugadas</button><h3 class="disp" style="margin:6px 4px">Usuarios</h3>' +
      '<input class="fld" id="usQ" type="search" maxlength="60" autocomplete="off" placeholder="Buscar por nombre o mail" value="' + esc(usrQ) + '"><p class="note" id="usSum"></p><div id="usList"><p class="note">Cargando…</p></div>';
    $('usQ').addEventListener('input', function () { usrQ = this.value.trim(); clearTimeout(usrT); usrT = setTimeout(paintUsers, 300); });
    paintUsers();
  }
  function paintUsers() {
    var q = usrQ;
    DB.adminUsers(q).then(function (list) {
      var el = $('usList'); if (!el || q !== usrQ) return; usrList = list;
      var now = Date.now(), pro = list.filter(function (x) { return x.vip_until && new Date(x.vip_until).getTime() > now; }).length;
      $('usSum').textContent = list.length + (list.length === 100 ? '+' : '') + ' usuarios' + (q ? ' encontrados' : '') + ' · ' + pro + ' con Pro activo';
      el.innerHTML = list.length ? list.map(function (x) {
        var on = x.vip_until && new Date(x.vip_until).getTime() > now;
        return '<div class="card"><div class="row" style="justify-content:flex-start;align-items:center;gap:10px">' + avatar(x.name || x.email) + '<div class="tx" style="flex:1;text-align:left;min-width:0"><h3>' + esc(x.name || '(sin perfil)') + (x.is_admin ? ' · admin' : '') + '</h3><p style="word-break:break-all">' + esc(x.email) + '</p>' +
          '<p>' + (on ? '<b style="color:#FFD23A">PRO hasta el ' + fecha(x.vip_until) + '</b>' : 'Sin Pro') + ' · ' + x.videos + (x.videos === 1 ? ' video' : ' videos') + ' · desde ' + fecha(x.created_at) + '</p></div></div>' +
          (x.is_admin ? '' : '<div class="row" style="justify-content:flex-start;flex-wrap:wrap"><button class="btn small lime" data-act="usvip" data-mail="' + esc(x.email) + '" data-days="30">+1 mes Pro</button>' + (on ? '<button class="btn small ghost" data-act="usvip" data-mail="' + esc(x.email) + '" data-days="0">Quitar Pro</button>' : '') + '</div>') + '</div>';
      }).join('') : '<div class="card"><p>No hay usuarios' + (q ? ' con "' + esc(q) + '"' : '') + '.</p></div>';
    }, function (e) { var el = $('usList'); if (el) el.innerHTML = '<p class="note">' + esc(e.message) + '</p>'; });
  }
  function byId(id) { return proList.filter(function (v) { return v.id === id; })[0]; }
  function playVideo(id, btn) {
    var v = byId(id); if (!v) return; btn.disabled = true; btn.textContent = 'Cargando…';
    DB.videoUrl(v.path).then(function (url) {
      var el = document.createElement('video'); el.src = url; el.controls = true; el.autoplay = true; el.playsInline = true; el.setAttribute('playsinline', '');
      el.style.cssText = 'width:100%;max-height:60vh;border-radius:14px;background:#000'; btn.parentNode.replaceChild(el, btn);
    }, function (e) { btn.disabled = false; btn.textContent = '▶ Ver video'; err(e); });
  }
  function duration(file) {
    return new Promise(function (res, rej) {
      var el = document.createElement('video'), url = URL.createObjectURL(file), done = function (f, x) { URL.revokeObjectURL(url); f(x); };
      el.preload = 'metadata'; el.onloadedmetadata = function () { done(res, el.duration); }; el.onerror = function () { done(rej, new Error('No pudimos leer ese video. Probá con otro archivo.')); }; el.src = url;
    });
  }
  // Achica el video en el mismo celular antes de subirlo: lo reproduce en una pantalla oculta a 720p
  // y lo graba de nuevo con menos peso (unos 2,5 Mbps: 20 segundos quedan en 6 a 7 MB). No usa ningún servicio pago.
  var SMALL_MB = 8;
  function compressVideo(file, onp, host) {
    return new Promise(function (res, rej) {
      if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return rej(new Error('Este navegador no puede achicar el video. Probá desde Chrome o Safari actualizados, o grabalo en 720p.'));
      var url = URL.createObjectURL(file), v = document.createElement('video'), ac = null, rec = null, stopped = false;
      v.src = url; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto';
      // El video tiene que estar a la vista: el navegador no dibuja bien los videos escondidos
      v.style.cssText = 'width:100%;max-height:34vh;border-radius:12px;background:#000;display:block;margin:8px 0';
      (host || document.body).appendChild(v);
      PP.busy = true;
      var fin = function () { PP.busy = false; try { URL.revokeObjectURL(url); v.remove(); if (ac) ac.close(); } catch (e) {} };
      v.onerror = function () { fin(); rej(new Error('No pudimos leer ese video. Probá con otro archivo.')); };
      v.onloadedmetadata = function () {
        var w = v.videoWidth || 1280, h = v.videoHeight || 720, k = Math.min(1, 1280 / Math.max(w, h));
        w = Math.round(w * k / 2) * 2; h = Math.round(h * k / 2) * 2;
        var cv = document.createElement('canvas'); cv.width = w; cv.height = h; var cx = cv.getContext('2d'), stream = cv.captureStream(0), vtrack = stream.getVideoTracks()[0], lastT = -1;
        try {
          var AC = window.AudioContext || window.webkitAudioContext; ac = new AC();
          var src = ac.createMediaElementSource(v), dst = ac.createMediaStreamDestination(); src.connect(dst);
          dst.stream.getAudioTracks().forEach(function (t) { stream.addTrack(t); }); if (ac.resume) ac.resume();
        } catch (e) { v.muted = true; }
        var type = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a', 'video/mp4;codecs=avc1', 'video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4'].filter(function (t) { return MediaRecorder.isTypeSupported(t); })[0] || '';
        try { rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 2500000, audioBitsPerSecond: 96000 }); } catch (e) { fin(); return rej(new Error('Este navegador no puede achicar el video.')); }
        var chunks = [];
        rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
        rec.onstop = function () { fin(); var out = new Blob(chunks, { type: (type || 'video/webm').split(';')[0] }); out.size ? res(out) : rej(new Error('No se pudo achicar el video.')); };
        var stop = function () { if (stopped) return; stopped = true; try { cx.drawImage(v, 0, 0, w, h); } catch (e) {} setTimeout(function () { if (rec.state !== 'inactive') rec.stop(); }, 150); };
        var draw = function () {
          if (stopped) return;
          // Se graba un cuadro nuevo solo cuando el video avanzó
          if (v.currentTime !== lastT) { lastT = v.currentTime; try { cx.drawImage(v, 0, 0, w, h); if (vtrack && vtrack.requestFrame) vtrack.requestFrame(); } catch (e) {} }
          if (v.duration) onp(Math.min(1, v.currentTime / v.duration));
          requestAnimationFrame(draw);
        };
        v.onended = stop;
        rec.start(1000);
        v.play().then(draw, function () { v.muted = true; v.play().then(draw, function () { stop(); fin(); rej(new Error('No se pudo preparar el video. Tocá de nuevo "Subir mi video".')); }); });
      };
    });
  }
  So.compressVideo = compressVideo;
  function sendVideo(f) {
    U.modal('<h2>Subiendo tu video…</h2><p>No cierres el juego. Puede tardar un poco según tu conexión.</p>');
    return DB.uploadVideo(f, proCh).then(function () {
      U.closeModal(); U.modal('<h2>¡Video recibido!</h2><p>Lo revisamos y, si cumple con la jugada, lo publicamos. Lo ves en "Mis videos".</p><div class="row"><button class="btn lime" id="vOk">Listo</button></div>', function () { U.on($('vOk'), function () { U.closeModal(); So.render(); }); });
    });
  }
  function pickVideo() {
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'video/mp4,video/quicktime,video/webm,video/*';
    inp.onchange = function () {
      var f = inp.files && inp.files[0]; if (!f) return;
      if (!/^video\//.test(f.type)) return U.toast('Elegí un archivo de video.');
      duration(f).then(function (d) {
        if (d > DB.VIDEO_MAX_S + 0.6) throw new Error('El video dura ' + Math.round(d) + ' segundos. El máximo es ' + DB.VIDEO_MAX_S + '. Recortalo en la galería del celular y volvé a elegirlo.');
        if (f.size <= SMALL_MB * 1048576) return sendVideo(f);
        // Video pesado: se achica en el celular. Hace falta un toque para que el navegador deje reproducirlo con sonido.
        U.modal('<h2>Preparamos tu video</h2><p>Pesa ' + Math.round(f.size / 1048576) + ' MB. Lo achicamos a 720p antes de subirlo para que cargue rápido. Tarda lo mismo que dura el video: dejá el juego abierto.</p>' +
          '<div class="row"><button class="btn ghost" id="cNo">Cancelar</button><button class="btn lime big" id="cGo">Preparar y subir</button></div>', function () {
          U.on($('cNo'), U.closeModal);
          U.on($('cGo'), function () {
            U.modal('<h2>Preparando tu video…</h2><p>No cierres el juego ni cambies de pantalla.</p><div id="cPrev"></div><div style="height:12px;border-radius:6px;background:rgba(255,255,255,.16);overflow:hidden;width:100%"><i id="cBar" style="display:block;height:100%;width:0;background:linear-gradient(90deg,#22E1FF,#D8FF3A)"></i></div><p id="cPct">0 %</p>');
            compressVideo(f, function (x) { var b = $('cBar'), t = $('cPct'); if (b) b.style.width = Math.round(x * 100) + '%'; if (t) t.textContent = Math.round(x * 100) + ' %'; }, $('cPrev'))
              .then(function (small) {
                if (small.size > DB.VIDEO_MAX_MB * 1048576) throw new Error('Aun achicado pesa ' + Math.round(small.size / 1048576) + ' MB. Probá con un video más corto.');
                return sendVideo(small);
              }).catch(function (e) { U.closeModal(); err(e); });
          });
        });
      }).catch(function (e) { U.closeModal(); err(e); });
    };
    inp.click();
  }
  function giveVip() {
    U.modal('<h2>Dar alta Pro</h2><p>Escribí el mail con el que la persona creó su cuenta en el juego.</p><input class="fld" id="gMail" type="email" inputmode="email" placeholder="Mail de la cuenta">' +
      '<label class="lb">Tiempo<select class="fld" id="gDays"><option value="30">1 mes</option><option value="90">3 meses</option><option value="365">1 año</option><option value="0">Quitar el alta Pro</option></select></label>' +
      '<p id="gErr" style="color:#FF8A8A"></p><div class="row"><button class="btn ghost" id="gNo">Cerrar</button><button class="btn lime big" id="gOk">Guardar</button></div>', function () {
      U.on($('gNo'), U.closeModal);
      U.on($('gOk'), function () {
        var m = $('gMail').value.trim(); if (!m) { $('gErr').textContent = 'Escribí el mail.'; return; }
        $('gOk').disabled = true;
        DB.setVip(m, +$('gDays').value).then(function (msg) { U.closeModal(); U.toast(String(msg)); }, function (e) { $('gOk').disabled = false; $('gErr').textContent = e.message; });
      });
    });
  }
  function proClick(a, b) {
    var id = b.dataset.id, v = id && byId(id);
    if (a === 'ch') { proCh = +id; So.render(); $('soBody').scrollTop = 0; }
    else if (a === 'problist') { if (proCh) proCh = 0; else proView = 'list'; So.render(); }
    else if (a === 'promine') { proView = 'mine'; So.render(); }
    else if (a === 'prorev') { proView = 'rev'; So.render(); }
    else if (a === 'progive') giveVip();
    else if (a === 'gopro') { So.open('pro'); So.render(); }
    else if (a === 'prousers') { proView = 'users'; So.render(); }
    else if (a === 'usvip') { b.disabled = true; DB.setVip(b.dataset.mail, +b.dataset.days).then(function (msg) { U.toast(String(msg)); paintUsers(); }, function (e) { b.disabled = false; err(e); }); }
    else if (a === 'proinfo') So.offerPro();
    else if (a === 'propay') { b.disabled = true; b.textContent = 'Abriendo Mercado Pago…'; DB.proCheckout().then(function (url) { location.href = url; }, function (e) { b.disabled = false; b.textContent = 'Quiero ser PRO'; err(e); }); }
    else if (a === 'vup') pickVideo();
    else if (a === 'vplay') playVideo(id, b);
    else if (a === 'vlike' && v) { b.disabled = true; DB.like(id, !v.liked).then(function () { v.liked = !v.liked; v.likes += v.liked ? 1 : -1; b.disabled = false; b.className = 'btn small ' + (v.liked ? 'lime' : 'ghost'); b.textContent = '♥ ' + v.likes; }, function (e) { b.disabled = false; err(e); }); }
    else if (a === 'vok' && v) DB.reviewVideo(v, 'approved').then(function () { U.toast('Video publicado'); So.render(); }, err);
    else if (a === 'vno' && v) DB.reviewVideo(v, 'rejected').then(function () { U.toast('Video rechazado'); So.render(); }, err);
    else if (a === 'vdel' && v) DB.deleteVideo(v).then(function () { U.toast('Video borrado'); So.render(); }, err);
    else return false;
    return true;
  }

  /* ---------- Sponsors ---------- */
  function renderSpon() {
    DB.sponsors().then(function (list) {
      var h = '<div class="card" style="border-color:#FFD23A"><h3 class="disp" style="color:#FFD23A;font-size:22px">Sumá tu cancha o tu marca</h3><p style="color:#fff">Este mes aparecer acá es gratis. Es solo para el mundo del pádel: canchas, clubes y tiendas de insumos.</p><button class="btn" data-act="newspon">Quiero ser sponsor</button></div>';
      if (!list.length) h += '<p class="note">Todavía no hay sponsors publicados.</p>';
      list.forEach(function (s) {
        var c = String(s.contact || ''), isUrl = /^https?:\/\//i.test(c);
        h += '<div class="card item" style="--c:hsl(' + hue(s.name) + ' 70% 45%)"><div class="gfx disp" style="font-size:24px">' + esc(s.name.slice(0, 2).toUpperCase()) + '</div><div class="tx"><h3>' + esc(s.name) + (s.approved ? '' : '<span class="badge">EN REVISIÓN</span>') + '</h3><p>' + esc(s.type) + '</p><p style="color:#fff">' + esc(s.descr || '') + '</p>' +
          (c ? '<p>' + (isUrl ? '<a href="' + esc(c) + '" target="_blank" rel="noopener noreferrer" style="color:#22E1FF">' + esc(c) + '</a>' : esc(c)) + '</p>' : '') + '</div></div>';
      });
      $('soBody').innerHTML = h + demoNote();
    }, function (e) { $('soBody').innerHTML = '<p class="note">' + esc(e.message) + '</p>'; });
  }
  function formSpon() {
    U.modal('<h2>Quiero ser sponsor</h2><p>Solo canchas, clubes y tiendas de insumos de pádel. Revisamos cada pedido antes de publicarlo.</p>' +
      '<input class="fld" id="sName" maxlength="60" placeholder="Nombre de la cancha o la marca">' +
      '<label class="lb">Rubro<select class="fld" id="sType"><option>Cancha o club</option><option>Tienda de insumos de pádel</option></select></label>' +
      '<textarea class="fld" id="sDesc" rows="3" maxlength="300" placeholder="Qué ofrecés y dónde estás"></textarea>' +
      '<input class="fld" id="sCont" maxlength="200" placeholder="Contacto: WhatsApp, Instagram o web">' +
      '<p id="sErr" style="color:#FF8A8A"></p><div class="row"><button class="btn ghost" id="sNo">Cancelar</button><button class="btn lime big" id="sOk">Enviar</button></div>', function () {
      U.on($('sNo'), U.closeModal);
      U.on($('sOk'), function () {
        var name = $('sName').value.trim(); if (name.length < 2) { $('sErr').textContent = 'Escribí el nombre.'; return; }
        if (!$('sCont').value.trim()) { $('sErr').textContent = 'Dejá un contacto para que te escriban.'; return; }
        $('sOk').disabled = true;
        DB.sponsorApply({ name: name, type: $('sType').value, descr: $('sDesc').value.trim(), contact: $('sCont').value.trim() })
          .then(function () { U.closeModal(); U.toast('Recibimos tu pedido. Lo revisamos y lo publicamos.'); So.render(); }, function (e) { $('sOk').disabled = false; $('sErr').textContent = e.message; });
      });
    });
  }

  /* ---------- Cuenta ---------- */
  var mode = 'up';
  function renderAcc() {
    quietCheck();
    var u = DB.user, h;
    if (u) {
      h = '<div class="card" style="text-align:center">' + avatar(u.name).replace('class="av"', 'class="av big"') + '<h3 class="disp" style="font-size:26px">' + esc(u.name) + '</h3><p>' + esc(u.email || '') + '</p><p>' + esc(u.cat || '') + ' · ' + esc(u.side || '') + '</p>' +
        '<div class="rew" style="margin:10px 0"><span>' + U.ic('star', 'color:#FFD23A') + U.totalStars() + '</span><span>IQ ' + U.iq() + '</span><span>Aciertos ' + (U.save().picks || 0) + '</span></div>' +
        '<button class="btn ghost" data-act="out">Cerrar sesión</button></div>' +
        (DB.online ? '<div class="card" id="accPro" style="border-color:#FFD23A">' + (DB.isVip()
          ? '<h3 class="disp" style="color:#FFD23A;font-size:20px">Sos PRO' + (u.is_admin ? ' · Administración' : ' hasta el ' + fecha(u.vip_until)) + '</h3><button class="btn small" data-act="gopro">Ir a Jugadas PRO</button>' + (u.is_admin ? ' <a class="btn small ghost" href="admin.html" target="_blank" rel="noopener" style="text-decoration:none">Panel de administración</a>' : '')
          : '<h3 class="disp" style="color:#FFD23A;font-size:20px">Hacete PRO</h3><p>Sumate a la comunidad que entrena la cabeza antes de la cancha.</p><p id="accPrice"></p><button class="btn lime" data-act="proinfo">Quiero ser PRO</button>') + '</div>' : '');
    } else {
      var up = mode === 'up';
      h = '<div class="card"><div class="row" style="margin-bottom:10px"><button class="btn small ' + (up ? 'lime' : 'ghost') + '" data-act="mup">Crear cuenta</button><button class="btn small ' + (up ? 'ghost' : 'lime') + '" data-act="min">Ya tengo cuenta</button></div>' +
        (up ? '<input class="fld" id="aName" maxlength="40" autocomplete="nickname" placeholder="Tu nombre o apodo">' : '') +
        '<input class="fld" id="aMail" type="email" autocomplete="email" inputmode="email" placeholder="Tu mail">' +
        '<input class="fld" id="aPass" type="password" autocomplete="' + (up ? 'new-password' : 'current-password') + '" placeholder="Contraseña (6 caracteres o más)">' +
        (up ? '<label class="lb">Tu categoría<select class="fld" id="aCat">' + ['No sé', '8va', '7ma', '6ta', '5ta', '4ta', '3ra', '2da', '1ra'].map(function (c) { return '<option>' + c + '</option>'; }).join('') + '</select></label>' +
          '<label class="lb">Tu lado<select class="fld" id="aSide"><option>Drive</option><option>Revés</option><option>Ambos</option></select></label>' : '') +
        '<p id="aErr" style="color:#FF8A8A;margin:6px 0"></p><button class="btn lime big" data-act="auth" style="width:100%">' + (up ? 'Crear mi cuenta' : 'Entrar') + '</button></div>' +
        '<p class="note">Con tu cuenta aparecés en el ranking, creás torneos y hacés pronósticos.</p>';
    }
    $('soBody').innerHTML = h + demoNote();
    if (u && DB.online && !DB.isVip()) DB.proPrice().then(function (n) { var el = $('accPrice'); if (el && n) el.innerHTML = '<b style="color:#fff;font-size:20px">$ ' + n.toLocaleString('es-AR') + '</b> por 30 días'; });
  }
  function auth() {
    var f = { email: $('aMail').value.trim().toLowerCase(), password: $('aPass').value };
    if (mode === 'up') { f.name = $('aName').value.trim(); f.cat = $('aCat').value; f.side = $('aSide').value; }
    (mode === 'up' ? DB.signUp(f) : DB.signIn(f)).then(function () { So.sync(); U.toast('¡Hola, ' + DB.user.name + '!'); if (pendingTour) { var c = pendingTour; pendingTour = null; openTour(c); return; } tab = 'rank'; So.render(); if (mode === 'up') So.offerPro(); }, function (e) { var el = $('aErr'); if (el) el.textContent = e.message; });
  }

  function onClick(e) {
    var b = e.target.closest('[data-act],[data-rk],[data-tour],[data-pick]'); if (!b) return;
    if (b.dataset.rk) { rankKind = b.dataset.rk; So.render(); return; }
    if (b.dataset.tour) { openTour(b.dataset.tour); return; }
    if (b.dataset.pick) { needLogin(function () { DB.bet(cur.id, b.dataset.pick).then(function () { U.toast('Pronóstico guardado'); openTour(cur.id); }, err); }); return; }
    var a = b.dataset.act;
    if (proClick(a, b)) return;
    if (a === 'goacc') { tab = 'acc'; So.render(); }
    else if (a === 'mup' || a === 'min') { mode = a === 'mup' ? 'up' : 'in'; So.render(); }
    else if (a === 'auth') auth();
    else if (a === 'out') DB.signOut().then(So.render);
    else if (a === 'newtour') needLogin(formTour);
    else if (a === 'newspon') needLogin(formSpon);
    else if (a === 'back') { cur = null; So.render(); }
    else if (a === 'poster') poster(cur);
    else if (a === 'play') So.play(cur);
    else if (a === 'join') needLogin(function () {
      var go = function (partner) { DB.join(cur.id, partner).then(function () { U.toast('¡Estás adentro!'); openTour(cur.id); }, err); };
      if (cur.mode !== 'parejas') return go('');
      U.modal('<h2>¿Con quién jugás?</h2><input class="fld" id="jP" maxlength="30" placeholder="Nombre de tu pareja"><div class="row"><button class="btn ghost" id="jNo">Cancelar</button><button class="btn lime" id="jOk">Inscribirnos</button></div>', function () {
        U.on($('jNo'), U.closeModal); U.on($('jOk'), function () { var p = $('jP').value.trim(); U.closeModal(); go(p); });
      });
    });
    else if (a === 'code') U.modal('<h2>Entrar con código</h2><input class="fld" id="cC" maxlength="6" placeholder="Código de 6 letras" style="text-transform:uppercase;text-align:center;font-size:24px"><div class="row"><button class="btn ghost" id="cNo">Cancelar</button><button class="btn lime" id="cOk">Buscar</button></div>', function () {
      U.on($('cNo'), U.closeModal); U.on($('cOk'), function () { var c = $('cC').value.trim().toUpperCase(); U.closeModal(); if (c) openTour(c); });
    });
  }
})();
