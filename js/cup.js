/* A la Pelotita · Copa de la Cancha: competencia con premio real, independiente del ranking general.
   - Jugador: ve la Copa activa, se inscribe, suma con la mejor marca de cada juego y ve el ranking.
   - Administración (mails de la tabla admins): crea y edita Copas, aprueba pagos, cierra y marca el premio como canjeado.
   - El puntaje lo valida el servidor (supabase/cups.sql). En modo demo, las mismas reglas en el dispositivo (js/backend.js). */
(function () {
  'use strict';
  var PP = window.PP, DB = PP.DB, CFG = PP.CUP, U = null;
  var C = PP.Cup = {}, state = null, view = 'main', editing = null, entCup = null, tick = null;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  // Texto con enlaces: solo http(s), escapado, se abre en otra pestaña
  function linkify(s) { return esc(s).replace(/https?:\/\/[^\s<]+/g, function (u) { return '<a href="' + u + '" target="_blank" rel="noopener noreferrer" style="color:#22E1FF;word-break:break-all">' + u + '</a>'; }).replace(/\n/g, '<br>'); }
  function noop() {}
  function err(e) { U.toast(e && e.message ? e.message : 'Algo salió mal. Probá de nuevo.'); }
  function money(n) { n = +n || 0; return n > 0 ? '$ ' + n.toLocaleString('es-AR', { maximumFractionDigits: 2 }) : 'Gratis'; }
  function when(d) { return new Date(d).toLocaleString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  function left(ms) {
    if (ms <= 0) return '0 s'; var s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
    return d > 0 ? d + ' d ' + (h % 24) + ' h' : h > 0 ? h + ' h ' + (m % 60) + ' min' : m > 0 ? m + ' min ' + (s % 60) + ' s' : s + ' s';
  }
  function avatar(name) {
    var h = 0, n = String(name || '?'); for (var i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % 360;
    var p = n.trim().split(/\s+/), ini = (p[0][0] || '?') + (p[1] ? p[1][0] : '');
    return '<span class="av" style="background:hsl(' + h + ' 70% 45%)">' + esc(ini.toUpperCase()) + '</span>';
  }

  /* ---------- Pago: único punto de conexión ----------
     Hoy el pago es manual: el jugador ve el precio y las instrucciones (alias o link) y la administración aprueba a mano.
     Para enchufar Mercado Pago: reemplazar checkout por una llamada a una función del servidor que cree el pago y
     devuelva el link (como supabase/functions/pro-checkout), y que el aviso de Mercado Pago apruebe la inscripción
     del lado del servidor. Avisar con done({ url }) para abrir el pago, o done({ manual: true }) para seguir a mano. */
  PP.CupPayment = { checkout: function (cup, done) { done({ manual: true }); } };

  /* ---------- Datos ---------- */
  function load() { return DB.cupCurrent().then(function (s) { state = s || {}; state._at = Date.now(); return state; }); }
  C.state = function () { return state; };

  /* ---------- Puntaje: cada juego avisa acá al terminar ----------
     raw = puntaje crudo del juego (estrellas, porcentaje...). Se lleva a 0..tope de la Copa y se manda al servidor.
     Solo cuenta si hay Copa en curso y el jugador está aprobado; el servidor lo vuelve a validar todo. */
  var QKEY = 'pelotita.cupq', busy = false;
  function loadQ() { try { return JSON.parse(localStorage.getItem(QKEY)) || {}; } catch (e) { return {}; } }
  function saveQ(q) { try { localStorage.setItem(QKEY, JSON.stringify(q)); } catch (e) {} }
  C.report = function (gameId, raw) {
    var g = PP.gameById(gameId); if (!g || !DB.user) return;
    var go = function (s) {
      if (!s || !s.cup || s.status !== 'live' || !s.me || s.me.status !== 'approved') return;
      var top = s.cup.max_points, sc = Math.max(0, Math.min(top, Math.round((+raw || 0) / g.max * top)));
      if (sc <= 0) return;
      var q = loadQ(), k = s.cup.id + '|' + gameId, cur = q[k];
      if (!cur || cur.s < sc) q[k] = { s: sc, n: 0 };
      saveQ(q); flush();
    };
    if (state && Date.now() - state._at < 60000) go(state); else load().then(go, noop);
  };
  function flush() {
    if (busy || !DB.user) return;
    var q = loadQ(), keys = Object.keys(q); if (!keys.length) return;
    var k = keys[0], parts = k.split('|'), item = q[k], g = PP.gameById(parts[1]);
    busy = true;
    DB.cupSubmit(parts[0], parts[1], item.s).then(function (r) {
      busy = false;
      if (r && r.reason === 'too_fast') { setTimeout(flush, ((r.wait || CFG.minGapS) * 1000) + 400); return; }
      q = loadQ(); delete q[k]; saveQ(q);
      if (r && r.improved) {
        if (state && state.me) state.me.total = r.total;
        U.toast(CFG.name + ': nueva marca en ' + (g ? g.name : 'el juego') + ' · ' + r.total + ' puntos');
      }
      flush();
    }, function () {
      busy = false; q = loadQ();
      if (q[k] && ++q[k].n >= 3) delete q[k];   // tras 3 intentos fallidos se descarta (sin conexión o rechazado)
      saveQ(q); setTimeout(flush, 30000);
    });
  }

  /* ---------- Pantalla ---------- */
  C.init = function () {
    U = PP.ui;
    $('bCup').textContent = CFG.name; $('cupTitle').textContent = CFG.name;
    $('cupBody').addEventListener('click', onClick);
    $('cupBar').addEventListener('click', function () { C.open(); });
    load().then(function () { flush(); paintHomeBtn(); paintBar(); }, noop);
    setInterval(function () { if (!$('home').hidden) load().then(function () { paintHomeBtn(); paintBar(); }, noop); }, 60000);
    news();
  };
  function paintHomeBtn() {
    var b = $('bCup'); if (!b) return;
    var live = state && state.cup && state.status === 'live';
    b.textContent = CFG.name + (live ? ' 🔥' : '');   // corto: comparte la fila con "Con amigos"
  }
  /* ---------- Barrita del inicio: la Copa en vivo para todos (con o sin cuenta) ---------- */
  function paintBar() {
    var bar = $('cupBar'); if (!bar) return;
    var s = state, c = s && s.cup;
    if (!c || s.status === 'done' && !c.winner_name) { bar.hidden = true; return; }
    var head = function (top) {
      var en = new Date(c.end_at) - Date.now(), st = new Date(c.start_at) - Date.now(), parts = [];
      parts.push('<b>' + esc(c.name) + '</b>' + (c.prize ? ' · premio: ' + esc(c.prize) : ''));
      if (s.status === 'soon') parts.push('empieza en ' + left(st));
      else if (s.status === 'live') parts.push('cierra en ' + left(en));
      if (s.status === 'done') parts.push('🏆 ganó <b>' + esc(c.winner_name) + '</b> con ' + c.winner_total + ' puntos');
      else if (top && top.length) parts.push(top.slice(0, 3).map(function (p, i) { return ['🥇', '🥈', '🥉'][i] + ' ' + esc(p.name) + ' <b>' + p.total + '</b>'; }).join('  '));
      else parts.push('¡todavía no hay nadie, sé el primero!');
      if (s.status !== 'done') parts.push('<i>Exclusivo PRO' + (+c.price_ars > 0 ? ' · inscripción ' + money(c.price_ars) : '') + ' · tocá para ver</i>');
      $('cupBarTx').innerHTML = parts.join('   ·   ');
      bar.hidden = false;
    };
    if (s.status === 'done') return head(null);
    DB.cupRanking(c.id).then(head, function () { head(null); });
  }
  C.render = function () {
    if (tick) { clearInterval(tick); tick = null; }
    $('cupTitle').textContent = CFG.name;
    $('cupBody').innerHTML = '<p class="note">Cargando…</p>';
    if (view === 'admin') return renderAdmin();
    if (view === 'entries') return renderEntries();
    load().then(function () { paintHomeBtn(); paintBar(); renderMain(); }, function (e) { $('cupBody').innerHTML = '<p class="note">' + esc(e.message) + '</p>'; });
  };
  C.open = function () { view = 'main'; U.go('cup'); };

  function renderMain() {
    var s = state, c = s.cup, me = s.me, h = '';
    if (!c) {
      h = '<div class="card" style="text-align:center"><h3 class="disp" style="font-size:24px;color:#FFD23A">Todavía no hay una Copa</h3><p>Muy pronto vas a poder jugar por premios de verdad en tu cancha. ¡Atento!</p></div>';
    } else {
      var phase = { soon: ['Empieza pronto', '#22E1FF'], live: ['En juego', '#7CFF4D'], done: ['Terminó', '#8d84b8'] }[s.status];
      h += '<div class="card" style="border-color:#FFD23A;box-shadow:0 0 20px rgba(255,210,58,.35)"><span class="chipst" style="--c:' + phase[1] + '">' + phase[0] + '</span>' +
        '<h3 class="disp" style="font-size:28px;color:#FFD23A;margin:6px 0 2px">' + esc(c.name) + '</h3>' +
        (c.venue ? '<p style="color:#fff">📍 ' + esc(c.venue) + '</p>' : '') +
        (c.prize ? '<p style="color:#fff;font-size:18px">🏆 Premio: <b>' + esc(c.prize) + '</b></p>' : '') +
        '<p>Inscripción: <b style="color:#fff">' + money(c.price_ars) + '</b></p>' +
        '<p id="cupCount" class="disp" style="font-size:20px;color:#D8FF3A"></p>' +
        '<p style="font-size:13px">' + when(c.start_at) + ' → ' + when(c.end_at) + '</p></div>';
      if (s.status === 'done') h += winnerCard(s);
      else h += meCard(s);
      h += '<div class="card"><h3 class="disp" style="font-size:18px">¿Cómo se suma?</h3><p>Cuentan <b>todos los juegos</b>: los 40 niveles y los ejercicios del Gimnasio mental. ' +
        'Por cada juego vale tu <b>mejor marca</b> durante la Copa (hasta ' + c.max_points + ' puntos por juego): repetir un juego mejora tu marca, no suma de más. ' +
        'Gana el que tiene más puntos; si hay empate, el que llegó primero. <b>Participan solo los jugadores PRO.</b></p></div>';
      h += '<h3 class="disp" style="margin:8px 4px">Ranking de la Copa</h3><div id="cupRank"><p class="note">Cargando…</p></div>';
    }
    if (s.admin) h += '<button class="btn" data-act="admin" style="width:100%;margin-top:8px">Panel de la Copa (administración)</button>';
    $('cupBody').innerHTML = h;
    if (c) { countdown(s); paintRanking(c.id); if (me && me.status === 'approved') paintMine(c); }
  }
  function countdown(s) {
    var c = s.cup, skew = s.now ? Date.now() - new Date(s.now).getTime() : 0;
    var upd = function () {
      var el = $('cupCount'); if (!el) { clearInterval(tick); tick = null; return; }
      var n = Date.now() - skew, st = new Date(c.start_at).getTime(), en = new Date(c.end_at).getTime();
      if (n < st) el.textContent = 'Empieza en ' + left(st - n);
      else if (n < en) el.textContent = 'Cierra en ' + left(en - n);
      else { el.textContent = 'Terminó'; if (s.status !== 'done') { clearInterval(tick); tick = null; C.render(); } }
      if (s.status === 'soon' && n >= st) { clearInterval(tick); tick = null; C.render(); }
    };
    upd(); tick = setInterval(upd, 1000);
  }
  function meCard(s) {
    var c = s.cup, me = s.me;
    if (!DB.user) return '<div class="card"><p style="color:#fff">La Copa es para jugadores <b>PRO</b>. Primero creá tu cuenta (es gratis).</p><button class="btn lime big" data-act="login" style="width:100%">Quiero participar</button></div>';
    if (!me && !DB.isVip()) return '<div class="card" style="border-color:#FFD23A;box-shadow:0 0 18px rgba(255,210,58,.4)"><h3 class="disp" style="color:#FFD23A;font-size:22px">🔒 Solo para jugadores PRO</h3>' +
      '<p style="color:#fff">Mirá el ranking todo lo que quieras. Para jugar la Copa y pelear el premio tenés que ser PRO.</p><button class="btn lime big pulse" data-act="pro" style="width:100%">Quiero participar</button></div>';
    if (!me) return '<div class="card"><button class="btn lime big pulse" data-act="join" style="width:100%">Quiero participar</button>' +
      (+c.price_ars > 0 ? '<p class="note" style="margin-top:8px">Cuesta ' + money(c.price_ars) + '. Te mostramos cómo pagar.</p>' : '<p class="note" style="margin-top:8px">Es gratis: entrás al toque.</p>') + '</div>';
    if (me.status === 'pending') return '<div class="card" style="border-color:#FFB020"><h3 class="disp" style="color:#FFB020">Inscripción pendiente</h3>' +
      '<p style="color:#fff">Cuando confirmemos tu pago, empezás a sumar puntos. Te avisamos acá mismo.</p>' + payInfo(c) + '</div>';
    if (me.status === 'rejected') return '<div class="card" style="border-color:#FF8A8A"><h3 class="disp" style="color:#FF8A8A">No pudimos confirmar tu pago</h3>' +
      '<p style="color:#fff">Si ya pagaste, volvé a pedir la inscripción y avisanos.</p>' + payInfo(c) + '<button class="btn lime" data-act="join">Volver a pedirla</button></div>';
    return '<div class="card" style="border-color:#7CFF4D"><h3 class="disp" style="color:#7CFF4D">¡Estás adentro!</h3>' +
      '<div class="rew" style="margin:6px 0"><span>' + me.total + ' puntos</span>' + (me.rank ? '<span>Puesto ' + me.rank + '</span>' : '') + '</div>' +
      (s.status === 'soon' ? '<p>La Copa todavía no empezó: lo que juegues antes no cuenta.</p>' : '<p>Cada partida que termines suma tu mejor marca.</p>') +
      '<div class="row"><button class="btn lime" data-act="play">Jugar niveles</button><button class="btn cyan" data-act="train">Gimnasio mental</button></div>' +
      '<div id="cupMine"></div></div>';
  }
  function payInfo(c) {
    return '<div style="background:rgba(0,0,0,.3);border-radius:14px;padding:10px;margin:8px 0;text-align:left"><p style="margin:0 0 4px">Precio: <b style="color:#fff">' + money(c.price_ars) + '</b></p>' +
      (c.pay_info ? '<p style="margin:0;color:#fff">' + linkify(c.pay_info) + '</p>' : '<p style="margin:0">Pedí los datos de pago en la cancha.</p>') + '</div>';
  }
  function winnerCard(s) {
    var c = s.cup, me = s.me;
    if (me && me.winner) return '<div class="card" style="text-align:center;border-color:#FFD23A;box-shadow:0 0 26px #FFD23A"><h3 class="disp" style="font-size:30px;color:#FFD23A">¡Ganaste! 🏆</h3>' +
      '<p style="color:#fff">Te llevás: <b>' + esc(c.prize || 'el premio') + '</b>' + (c.venue ? ' en ' + esc(c.venue) : '') + '.</p>' +
      (c.redeemed ? '<p class="disp" style="color:#7CFF4D;font-size:20px">Premio canjeado ✔</p>'
        : '<p>Tu código de canje:</p><div class="disp" style="font-size:44px;letter-spacing:8px;color:#fff;background:rgba(0,0,0,.4);border-radius:16px;padding:8px 0;margin:6px 0">' + esc(me.code || '') + '</div>' +
          '<p style="color:#fff">Coordiná día y hora con la cancha y mostrá este código cuando vayas.</p>') + '</div>';
    if (c.winner_name) return '<div class="card" style="text-align:center;border-color:#FFD23A"><h3 class="disp" style="font-size:24px;color:#FFD23A">Ganador: ' + esc(c.winner_name) + '</h3>' +
      '<p>Con ' + c.winner_total + ' puntos.' + (me && me.status === 'approved' ? ' Vos terminaste ' + (me.rank ? 'en el puesto ' + me.rank : '') + ' con ' + me.total + ' puntos.' : '') + '</p>' +
      (c.redeemed ? '<p style="color:#7CFF4D">Premio entregado ✔</p>' : '') + '<p>¡Atento a la próxima Copa!</p></div>';
    return '<div class="card" style="text-align:center"><h3 class="disp">Terminó sin ganador</h3><p>Nadie llegó a sumar puntos. ¡Atento a la próxima!</p></div>';
  }
  function paintRanking(id) {
    DB.cupRanking(id).then(function (list) {
      var el = $('cupRank'); if (!el) return;
      if (!list || !list.length) { el.innerHTML = '<div class="card"><p>Todavía no hay nadie en el ranking. ¡Sé el primero!</p></div>'; return; }
      el.innerHTML = list.map(function (p, i) {
        var mine = DB.user && p.user_id === DB.user.id, medal = ['#FFD23A', '#C9D3E6', '#E0915A'][i];
        return '<div class="rk' + (mine ? ' me' : '') + '" data-user="' + esc(p.user_id) + '" style="' + (medal ? '--mc:' + medal : '') + '"><b class="pos">' + (i + 1) + '</b>' + avatar(p.name) +
          '<div class="tx"><h3>' + esc(p.name) + (mine ? ' (vos)' : '') + '</h3></div><div class="val"><b>' + p.total + '</b><small>puntos</small></div></div>';
      }).join('') + (state && state.me && state.me.rank > list.length ? '<p class="note">Tu puesto: ' + state.me.rank + ' · ' + state.me.total + ' puntos</p>' : '');
    }, function (e) { var el = $('cupRank'); if (el) el.innerHTML = '<p class="note">' + esc(e.message) + '</p>'; });
  }
  function paintMine(c) {
    DB.cupMyScores(c.id).then(function (m) {
      var el = $('cupMine'); if (!el) return; var ks = Object.keys(m || {}); if (!ks.length) return;
      el.innerHTML = '<details style="margin-top:8px"><summary style="cursor:pointer">Mis marcas (' + ks.length + ' juegos)</summary><p style="text-align:left">' +
        ks.map(function (k) { var g = PP.gameById(k); return esc(g ? g.name : k) + ': <b>' + m[k] + '</b>'; }).join(' · ') + '</p></details>';
    }, noop);
  }

  /* ---------- Inscripción ---------- */
  function join() {
    var c = state.cup;
    if (+c.price_ars === 0) {
      DB.cupJoin(c.id).then(function () { U.toast('¡Estás adentro! A sumar puntos.'); C.render(); }, err);
      return;
    }
    U.modal('<h2>Quiero participar</h2><p style="color:#fff">' + esc(c.name) + (c.prize ? ' · premio: ' + esc(c.prize) : '') + '</p>' + payInfo(c) +
      '<p>Tu inscripción queda <b>pendiente</b> hasta que confirmemos el pago. Cuando esté aprobada, empezás a sumar.</p>' +
      '<div class="row"><button class="btn ghost" id="cjNo">Cancelar</button><button class="btn lime big" id="cjOk">Inscribirme</button></div>', function () {
      U.on($('cjNo'), U.closeModal);
      U.on($('cjOk'), function () {
        $('cjOk').disabled = true;
        DB.cupJoin(c.id).then(function (st) {
          PP.CupPayment.checkout(c, function (r) {
            U.closeModal();
            if (r && r.url) { location.href = r.url; return; }
            U.toast(st === 'approved' ? '¡Estás adentro!' : 'Listo: tu inscripción quedó pendiente de pago.'); C.render();
          });
        }, function (e) { $('cjOk').disabled = false; err(e); });
      });
    });
  }

  /* ---------- Administración ---------- */
  function toLocal(d) { if (!d) return ''; var x = new Date(d), p = function (n) { return ('0' + n).slice(-2); }; return x.getFullYear() + '-' + p(x.getMonth() + 1) + '-' + p(x.getDate()) + 'T' + p(x.getHours()) + ':' + p(x.getMinutes()); }
  function cupPhase(c) { var n = Date.now(), en = Math.min(new Date(c.end_at).getTime(), c.closed_at ? new Date(c.closed_at).getTime() : Infinity); return n < new Date(c.start_at).getTime() ? 'soon' : n < en ? 'live' : 'done'; }
  function renderAdmin() {
    DB.cupAdmin('list').then(function (list) {
      var h = '<div class="row" style="margin-bottom:10px"><button class="btn small ghost" data-act="back">Volver a la Copa</button><button class="btn lime" data-act="new">Nueva Copa</button></div>';
      if (!list.length) h += '<div class="card"><p>Todavía no creaste ninguna Copa.</p></div>';
      list.forEach(function (c) {
        var ph = cupPhase(c), lab = { soon: ['Próxima', '#22E1FF'], live: ['En juego', '#7CFF4D'], done: ['Terminada', '#8d84b8'] }[ph];
        h += '<div class="card"><span class="chipst" style="--c:' + lab[1] + '">' + lab[0] + (c.closed_at ? ' · cerrada antes' : '') + '</span><h3 class="disp" style="font-size:22px;margin:6px 0 2px">' + esc(c.name) + '</h3>' +
          '<p>' + esc(c.venue || 'Sin cancha') + ' · ' + esc(c.prize || 'sin premio') + ' · ' + money(c.price_ars) + ' · tope ' + c.max_points + ' por juego</p>' +
          '<p style="font-size:13px">' + when(c.start_at) + ' → ' + when(c.end_at) + '</p>' +
          '<p>Aprobados: <b style="color:#fff">' + c.approved + '</b> · Pendientes: <b style="color:#FFB020">' + c.pending + '</b></p>' +
          (ph === 'done' ? (c.winner_name ? '<p style="color:#fff">Ganó <b>' + esc(c.winner_name) + '</b> · código <b class="disp" style="letter-spacing:3px">' + esc(c.winner_code) + '</b> · ' + (c.redeemed_at ? '<b style="color:#7CFF4D">canjeado</b>' : '<b style="color:#FFB020">sin canjear</b>') + '</p>' : '<p>Sin ganador (nadie sumó puntos).</p>') : '') +
          '<div class="row" style="justify-content:flex-start;flex-wrap:wrap">' +
          '<button class="btn small" data-act="entries" data-id="' + esc(c.id) + '">Inscriptos' + (c.pending ? ' (' + c.pending + ')' : '') + '</button>' +
          (ph !== 'done' ? '<button class="btn small ghost" data-act="edit" data-id="' + esc(c.id) + '">Editar</button><button class="btn small ghost" data-act="close" data-id="' + esc(c.id) + '">Cerrar ahora</button>' : '') +
          (ph === 'done' && c.winner_name ? '<button class="btn small ' + (c.redeemed_at ? 'ghost' : 'lime') + '" data-act="redeem" data-id="' + esc(c.id) + '" data-done="' + (c.redeemed_at ? '0' : '1') + '">' + (c.redeemed_at ? 'Desmarcar canje' : 'Marcar canjeado') + '</button>' : '') +
          '</div></div>';
      });
      $('cupBody').innerHTML = h; C._list = list;
    }, function (e) { $('cupBody').innerHTML = '<p class="note">' + esc(e.message) + '</p><button class="btn small ghost" data-act="back">Volver</button>'; });
  }
  function editForm(c) {
    var start = c ? c.start_at : new Date(Date.now() + 3600000), end = c ? c.end_at : new Date(Date.now() + 7 * 86400000);
    U.modal('<h2>' + (c ? 'Editar Copa' : 'Nueva Copa') + '</h2><div style="text-align:left;width:100%;max-height:62vh;overflow:auto">' +
      '<label class="lb">Nombre<input class="fld" id="ceName" maxlength="80" value="' + esc(c ? c.name : CFG.name) + '"></label>' +
      '<label class="lb">Cancha o club<input class="fld" id="ceVenue" maxlength="80" value="' + esc(c ? c.venue : '') + '"></label>' +
      '<label class="lb">Premio<input class="fld" id="cePrize" maxlength="120" placeholder="Ej.: 1 hora de cancha" value="' + esc(c ? c.prize : '') + '"></label>' +
      '<label class="lb">Empieza<input class="fld" id="ceStart" type="datetime-local" value="' + toLocal(start) + '"></label>' +
      '<label class="lb">Cierra<input class="fld" id="ceEnd" type="datetime-local" value="' + toLocal(end) + '"></label>' +
      '<label class="lb">Precio en pesos (0 = gratis)<input class="fld" id="cePrice" type="number" min="0" step="1" inputmode="numeric" value="' + (c ? +c.price_ars : 0) + '"></label>' +
      '<label class="lb">Cómo pagar (alias o link de Mercado Pago)<textarea class="fld" id="cePay" rows="3" maxlength="600">' + esc(c ? c.pay_info : '') + '</textarea></label>' +
      '<label class="lb">Puntos máximos por juego<input class="fld" id="ceMax" type="number" min="1" max="100000" step="1" inputmode="numeric" value="' + (c ? c.max_points : CFG.defaultMaxPoints) + '"></label>' +
      '</div><p id="ceErr" style="color:#FF8A8A;margin:6px 0"></p><div class="row"><button class="btn ghost" id="ceNo">Cancelar</button><button class="btn lime big" id="ceOk">Guardar</button></div>', function () {
      U.on($('ceNo'), U.closeModal);
      U.on($('ceOk'), function () {
        var name = $('ceName').value.trim(), s = $('ceStart').value, e = $('ceEnd').value, max = Math.round(+$('ceMax').value || 0), price = +$('cePrice').value;
        var bad = name.length < 3 ? 'Poné un nombre de al menos 3 letras.' : !s || !e ? 'Elegí fecha y hora de inicio y de cierre.' : new Date(e) <= new Date(s) ? 'El cierre tiene que ser después del inicio.' :
          !(price >= 0) ? 'El precio no puede ser negativo.' : max < 1 ? 'Los puntos máximos tienen que ser 1 o más.' : '';
        if (bad) { $('ceErr').textContent = bad; return; }
        $('ceOk').disabled = true;
        DB.cupAdmin('save', { p_id: c ? c.id : null, p_name: name, p_venue: $('ceVenue').value.trim(), p_prize: $('cePrize').value.trim(), p_start: new Date(s).toISOString(), p_end: new Date(e).toISOString(),
          p_price: price, p_pay: $('cePay').value.trim(), p_max: max }).then(function () { U.closeModal(); U.toast('Copa guardada'); C.render(); },
          function (er) { $('ceOk').disabled = false; $('ceErr').textContent = er.message; });
      });
    });
  }
  function renderEntries() {
    var c = (C._list || []).filter(function (x) { return x.id === entCup; })[0];
    DB.cupAdmin('entries', { p_cup: entCup }).then(function (list) {
      var lab = { pending: ['Pendiente', '#FFB020'], approved: ['Aprobado', '#7CFF4D'], rejected: ['Rechazado', '#FF8A8A'] };
      var h = '<button class="btn small ghost" data-act="toadmin" style="margin-bottom:10px">Volver al panel</button><h3 class="disp" style="margin:0 4px 8px">Inscriptos · ' + esc(c ? c.name : '') + '</h3>';
      if (!list.length) h += '<div class="card"><p>Todavía no se anotó nadie.</p></div>';
      list.forEach(function (e) {
        h += '<div class="card"><div class="row" style="justify-content:flex-start;align-items:center;gap:10px">' + avatar(e.name) + '<div style="flex:1;text-align:left"><h3 style="margin:0">' + esc(e.name) + '</h3><p style="margin:0;font-size:13px;word-break:break-all">' + esc(e.email || '') + '</p></div>' +
          '<span class="chipst" style="--c:' + lab[e.status][1] + '">' + lab[e.status][0] + '</span></div><p style="margin:6px 0">' + e.total + ' puntos</p>' +
          '<div class="row" style="justify-content:flex-start">' + (e.status !== 'approved' ? '<button class="btn small lime" data-act="decide" data-u="' + esc(e.user_id) + '" data-st="approved">Pagó · aprobar</button>' : '') +
          (e.status !== 'rejected' ? '<button class="btn small ghost" data-act="decide" data-u="' + esc(e.user_id) + '" data-st="rejected">No pagó · rechazar</button>' : '') + '</div></div>';
      });
      $('cupBody').innerHTML = h;
    }, function (e) { $('cupBody').innerHTML = '<p class="note">' + esc(e.message) + '</p><button class="btn small ghost" data-act="toadmin">Volver</button>'; });
  }
  function confirmBox(text, yes, fn) {
    U.modal('<h2>¿Seguro?</h2><p style="color:#fff">' + text + '</p><div class="row"><button class="btn ghost" id="cfNo">No</button><button class="btn lime" id="cfOk">' + yes + '</button></div>', function () {
      U.on($('cfNo'), U.closeModal); U.on($('cfOk'), function () { U.closeModal(); fn(); });
    });
  }
  function onClick(e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var a = b.dataset.act, id = b.dataset.id, c = id && (C._list || []).filter(function (x) { return x.id === id; })[0];
    if (a === 'login') { PP.Social.open('acc'); U.go('social'); U.toast('Creá tu cuenta o entrá para participar'); }
    else if (a === 'join') { if (!DB.isVip()) PP.Social.offerPro(); else join(); }
    else if (a === 'pro') PP.Social.offerPro();
    else if (a === 'play') U.go('map');
    else if (a === 'train') U.go('train');
    else if (a === 'admin' || a === 'toadmin') { view = 'admin'; C.render(); }
    else if (a === 'back') { view = 'main'; C.render(); }
    else if (a === 'new') editForm(null);
    else if (a === 'edit' && c) editForm(c);
    else if (a === 'entries') { entCup = id; view = 'entries'; C.render(); }
    else if (a === 'close' && c) confirmBox('La Copa "' + esc(c.name) + '" se cierra ahora y se elige al ganador con los puntos de este momento.', 'Cerrar ahora', function () {
      DB.cupAdmin('close', { p_cup: id }).then(function () { U.toast('Copa cerrada'); C.render(); }, err);
    });
    else if (a === 'redeem') DB.cupAdmin('redeem', { p_cup: id, p_done: b.dataset.done === '1' }).then(function () { U.toast(b.dataset.done === '1' ? 'Premio marcado como canjeado' : 'Canje desmarcado'); C.render(); }, err);
    else if (a === 'decide') { b.disabled = true; DB.cupAdmin('decide', { p_cup: entCup, p_user: b.dataset.u, p_status: b.dataset.st }).then(function () { U.toast(b.dataset.st === 'approved' ? 'Inscripción aprobada' : 'Inscripción rechazada'); C.render(); }, function (er) { b.disabled = false; err(er); }); }
  }

  /* ---------- Cartel de novedades al abrir el juego (una vez por día) ---------- */
  var SITE = 'https://alapelotita.com/';
  function news() {
    var key = 'pelotita.news', today = new Date().toDateString();
    try { if (localStorage.getItem(key) === today) return; } catch (e) {}
    var tries = 0, wait = setInterval(function () {
      // Espera a que no haya otra ventana abierta (ayuda inicial, premio diario) y a estar en el inicio
      if (++tries > 120) { clearInterval(wait); return; }
      if (!$('modal').hidden || $('home').hidden) return;
      clearInterval(wait);
      try { localStorage.setItem(key, today); } catch (e) {}
      U.modal('<p class="disp" style="color:#22E1FF;font-size:16px;letter-spacing:2px;margin:0">EN CONSTRUCCIÓN 🚧</p>' +
        '<h2 style="color:#FFD23A">¡Estamos creando algo increíble para vos!</h2>' +
        '<p style="color:#fff">Estamos armando <b>el mejor juego de pádel</b> para que juegues y te conectes con todos los fiebres del pádel del mundo.</p>' +
        '<p>Todas las semanas sumamos juegos nuevos, torneos y premios de verdad. <b style="color:#D8FF3A">No te lo pierdas.</b></p>' +
        '<p style="color:#fff">¿Nos ayudás a crecer? Compartilo con tus amigos del pádel. 🙌</p>' +
        '<div class="row"><button class="btn ghost" id="nwNo">A jugar</button><button class="btn lime big" id="nwShare">Compartir</button></div>', function () {
        U.on($('nwNo'), U.closeModal);
        U.on($('nwShare'), function () { share(); });
      });
    }, 1000);
  }
  function share() {
    var text = 'Estoy jugando A la Pelotita, el juego de pádel para fiebres. ¡Sumate! ' + SITE;
    if (navigator.share) { navigator.share({ title: 'A la Pelotita', text: 'Estoy jugando A la Pelotita, el juego de pádel para fiebres. ¡Sumate!', url: SITE }).then(function () { U.closeModal(); }, noop); return; }
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
    U.closeModal();
  }
  C.share = share;
})();
