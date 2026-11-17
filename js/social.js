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
    DB.init().then(function () { So.sync(); checkHash(); }, noop);
    window.addEventListener('hashchange', checkHash);
    $('soTabs').addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (!b) return; tab = b.dataset.tab; cur = null; So.render(); });
    $('soBody').addEventListener('click', onClick);
  };
  function checkHash() {
    var m = /^#torneo-([A-Z0-9]{6})$/.exec(location.hash || ''); if (!m) return;
    tab = 'tour'; U.go('social'); openTour(m[1]);
  }
  // Sube al servidor las estrellas, el nivel y el IQ de este jugador
  So.sync = function () {
    if (!DB.user || !U) return; var s = U.save();
    DB.pushStats({ stars: U.totalStars(), level: s.level + 1, iq: U.iq(), picks: s.picks || 0 }).catch(noop);
  };

  So.render = function () {
    if (tick) { clearInterval(tick); tick = null; }
    var tabs = [['rank', 'Ranking'], ['tour', 'Torneos'], ['spon', 'Sponsors'], ['acc', DB.user ? 'Mi cuenta' : 'Entrar']];
    $('soTabs').innerHTML = tabs.map(function (t) { return '<button class="tab' + (tab === t[0] ? ' on' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('');
    $('soBody').innerHTML = '<p class="note">Cargando…</p>';
    ({ rank: renderRank, tour: cur ? renderTour : renderTours, spon: renderSpon, acc: renderAcc })[tab]();
  };
  function demoNote() { return DB.online ? '' : '<p class="note">Modo demo: por ahora los datos se guardan solo en este celular. El ranking y los torneos entre jugadores se activan al conectar el servidor.</p>'; }

  /* ---------- Ranking ---------- */
  function renderRank() {
    var kinds = [['stars', 'Estrellas'], ['iq', 'IQ de pádel'], ['picks', 'Pronósticos']], unit = { stars: 'estrellas', iq: 'IQ', picks: 'aciertos' };
    DB.ranking(rankKind).then(function (list) {
      var h = '<div class="row" style="margin-bottom:10px">' + kinds.map(function (k) { return '<button class="btn small ' + (rankKind === k[0] ? 'lime' : 'ghost') + '" data-rk="' + k[0] + '">' + k[1] + '</button>'; }).join('') + '</div>';
      if (!list.length) h += '<div class="card"><h3 class="disp">Todavía no hay nadie</h3><p>Creá tu cuenta y sé el primero del ranking.</p><button class="btn lime" data-act="goacc">Crear mi cuenta</button></div>';
      list.forEach(function (p, i) {
        var mine = DB.user && p.id === DB.user.id, medal = ['#FFD23A', '#C9D3E6', '#E0915A'][i];
        h += '<div class="rk' + (mine ? ' me' : '') + '" style="' + (medal ? '--mc:' + medal : '') + '"><b class="pos">' + (i + 1) + '</b>' + avatar(p.name) + '<div class="tx"><h3>' + esc(p.name) + (mine ? ' (vos)' : '') + '</h3><p>' + esc(p.cat || '') + ' · ' + esc(p.side || '') + ' · nivel ' + (p.level || 1) + '</p></div><div class="val"><b>' + (p[rankKind] || 0) + '</b><small>' + unit[rankKind] + '</small></div></div>';
      });
      $('soBody').innerHTML = h + demoNote();
    }, function (e) { $('soBody').innerHTML = '<p class="note">' + esc(e.message) + '</p>'; });
  }

  /* ---------- Torneos ---------- */
  function renderTours() {
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
    var u = DB.user, h;
    if (u) {
      h = '<div class="card" style="text-align:center">' + avatar(u.name).replace('class="av"', 'class="av big"') + '<h3 class="disp" style="font-size:26px">' + esc(u.name) + '</h3><p>' + esc(u.email || '') + '</p><p>' + esc(u.cat || '') + ' · ' + esc(u.side || '') + '</p>' +
        '<div class="rew" style="margin:10px 0"><span>' + U.ic('star', 'color:#FFD23A') + U.totalStars() + '</span><span>IQ ' + U.iq() + '</span><span>Aciertos ' + (U.save().picks || 0) + '</span></div>' +
        '<button class="btn ghost" data-act="out">Cerrar sesión</button></div>';
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
  }
  function auth() {
    var f = { email: $('aMail').value.trim().toLowerCase(), password: $('aPass').value };
    if (mode === 'up') { f.name = $('aName').value.trim(); f.cat = $('aCat').value; f.side = $('aSide').value; }
    (mode === 'up' ? DB.signUp(f) : DB.signIn(f)).then(function () { So.sync(); tab = 'rank'; So.render(); U.toast('¡Hola, ' + DB.user.name + '!'); }, function (e) { var el = $('aErr'); if (el) el.textContent = e.message; });
  }

  function onClick(e) {
    var b = e.target.closest('[data-act],[data-rk],[data-tour],[data-pick]'); if (!b) return;
    if (b.dataset.rk) { rankKind = b.dataset.rk; So.render(); return; }
    if (b.dataset.tour) { openTour(b.dataset.tour); return; }
    if (b.dataset.pick) { needLogin(function () { DB.bet(cur.id, b.dataset.pick).then(function () { U.toast('Pronóstico guardado'); openTour(cur.id); }, err); }); return; }
    var a = b.dataset.act;
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
