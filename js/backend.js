/* A la Pelotita · datos de la comunidad (cuentas, ranking, sponsors, torneos, pronósticos).
   Dos implementaciones con la misma interfaz:
   - Local: modo demo, guarda en este dispositivo.
   - Supabase: servidor real, se activa cuando js/config.js tiene URL y clave. */
(function () {
  'use strict';
  var PP = window.PP, CFG = PP.CONFIG || {};
  var DB = PP.DB = { online: !!(CFG.supabaseUrl && CFG.supabaseKey), user: null };
  var BET_CLOSE_MS = 5 * 60 * 1000;
  DB.BET_CLOSE_MS = BET_CLOSE_MS;
  DB.VIDEOS_PER_MONTH = 12; DB.VIDEO_MAX_S = 20; DB.VIDEO_MAX_MB = 15;
  DB.isAdmin = function () { return !!(DB.user && DB.user.is_admin); };
  DB.isVip = function () { return !!(DB.user && (DB.user.is_admin || (DB.user.vip_until && new Date(DB.user.vip_until).getTime() > Date.now()))); };
  function ok(v) { return Promise.resolve(v); }
  function fail(m) { return Promise.reject(new Error(m)); }
  function code() { var a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = ''; for (var i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }
  function uid() { return 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function validMail(m) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m); }

  // Estado de un torneo según la hora
  DB.phase = function (t, now) {
    now = now || Date.now();
    var st = new Date(t.start_at).getTime(), en = st + t.hours * 3600000;
    if (now < st - BET_CLOSE_MS) return 'open';      // inscripción y pronósticos abiertos
    if (now < st) return 'closed';                    // últimos 5 minutos: pronósticos cerrados
    if (now < en) return 'live';                      // en juego
    return 'done';
  };
  DB.winner = function (t) {
    if (DB.phase(t) !== 'done' || !t.players || !t.players.length) return null;
    var best = t.players.slice().sort(function (a, b) { return b.score - a.score; })[0];
    return best.score > 0 ? best : null;
  };

  /* ================= Local (modo demo) ================= */
  var LKEY = 'pelotita.social';
  function load() { try { return JSON.parse(localStorage.getItem(LKEY)) || {}; } catch (e) { return {}; } }
  function store(d) { try { localStorage.setItem(LKEY, JSON.stringify(d)); } catch (e) {} }
  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return String(h); }
  var Local = {
    init: function () { var d = load(); if (d.session && d.users && d.users[d.session]) DB.user = pub(d.users[d.session]); return ok(DB.user); },
    signUp: function (f) {
      var d = load(); d.users = d.users || {};
      if (d.users[f.email]) return fail('Ya hay una cuenta con ese mail.');
      d.users[f.email] = { id: uid(), email: f.email, pass: hash(f.password), name: f.name, cat: f.cat, side: f.side, stars: 0, level: 1, iq: 70, picks: 0 };
      d.session = f.email; store(d); DB.user = pub(d.users[f.email]); return ok(DB.user);
    },
    signIn: function (f) {
      var d = load(), u = d.users && d.users[f.email];
      if (!u || u.pass !== hash(f.password)) return fail('Mail o contraseña incorrectos.');
      d.session = f.email; store(d); DB.user = pub(u); return ok(DB.user);
    },
    signOut: function () { var d = load(); d.session = null; store(d); DB.user = null; return ok(); },
    pushStats: function (s) {
      var d = load(), u = d.users && d.users[d.session]; if (!u) return ok();
      u.stars = s.stars; u.level = s.level; u.iq = s.iq; if (s.picks !== undefined) u.picks = s.picks; store(d); DB.user = pub(u); return ok();
    },
    ranking: function (kind) {
      var d = load(), list = Object.keys(d.users || {}).map(function (k) { return pub(d.users[k]); });
      return ok(list.sort(function (a, b) { return b[kind] - a[kind]; }));
    },
    sponsors: function () { var d = load(); return ok((d.sponsors || []).filter(function (s) { return s.approved || (DB.user && s.created_by === DB.user.id); })); },
    sponsorApply: function (f) {
      var d = load(); d.sponsors = d.sponsors || [];
      d.sponsors.push({ id: uid(), name: f.name, type: f.type, descr: f.descr, contact: f.contact, approved: false, created_by: DB.user.id }); store(d); return ok();
    },
    tournaments: function () { var d = load(); return ok((d.tours || []).slice().sort(function (a, b) { return new Date(a.start_at) - new Date(b.start_at); })); },
    tournament: function (idOrCode) {
      var d = load(), t = (d.tours || []).filter(function (x) { return x.id === idOrCode || x.code === idOrCode; })[0];
      if (!t) return fail('No encontramos ese torneo.');
      t.myBet = DB.user ? ((t.bets || []).filter(function (b) { return b.user_id === DB.user.id; })[0] || null) : null; return ok(t);
    },
    createTournament: function (f) {
      var d = load(); d.tours = d.tours || [];
      var t = { id: uid(), code: code(), name: f.name, kind: f.kind, mode: f.mode, start_at: f.start_at, hours: f.hours, created_by: DB.user.id, host: DB.user.name, players: [], bets: [] };
      d.tours.push(t); store(d); return ok(t);
    },
    join: function (id, partner) {
      var d = load(), t = find(d, id); if (!t) return fail('No encontramos ese torneo.');
      if (DB.phase(t) !== 'open' && DB.phase(t) !== 'closed') return fail('La inscripción ya cerró.');
      if (!t.players.some(function (p) { return p.user_id === DB.user.id; })) t.players.push({ user_id: DB.user.id, name: DB.user.name + (partner ? ' + ' + partner : ''), score: 0 });
      store(d); return ok();
    },
    bet: function (id, pick) {
      var d = load(), t = find(d, id); if (!t) return fail('No encontramos ese torneo.');
      if (DB.phase(t) !== 'open') return fail('Los pronósticos cerraron 5 minutos antes del inicio.');
      t.bets = (t.bets || []).filter(function (b) { return b.user_id !== DB.user.id; }); t.bets.push({ user_id: DB.user.id, pick: pick }); store(d); return ok();
    },
    submitScore: function (id, score) {
      var d = load(), t = find(d, id); if (!t) return fail('No encontramos ese torneo.');
      if (DB.phase(t) !== 'live') return fail('El torneo no está en juego.');
      var p = t.players.filter(function (x) { return x.user_id === DB.user.id; })[0]; if (!p) return fail('No estás inscripto.');
      p.score = Math.max(p.score, score); store(d); return ok(p.score);
    }
  };
  var NOSRV = 'Las Jugadas PRO necesitan el servidor de la comunidad.';
  ['videos', 'videoCounts', 'myVideos', 'uploadVideo', 'videoUrl', 'like', 'pendingVideos', 'reviewVideo', 'deleteVideo', 'setVip', 'monthCount', 'refreshMe'].forEach(function (k) {
    Local[k] = function () { return k === 'refreshMe' ? ok(DB.user) : fail(NOSRV); };
  });
  Local.searchPlayers = function (q) { return Local.ranking('stars').then(function (l) { q = q.toLowerCase(); return l.filter(function (p) { return String(p.name).toLowerCase().indexOf(q) >= 0; }); }); };
  Local.adminUsers = function () { return fail(NOSRV); };
  // Seguir jugadores e invitaciones: solo con el servidor de la comunidad
  Local.following = function () { return ok([]); }; Local.followCounts = function () { return ok({ following: 0, followers: 0 }); };
  Local.myRank = function () { return ok(null); }; Local.myInvites = function () { return ok([]); };
  Local.follow = Local.invite = Local.dismissInvite = function () { return fail('Seguir e invitar jugadores necesita el servidor de la comunidad.'); };
  Local.sendFeedback = function () { return fail(NOSRV); }; Local.admin = function () { return fail(NOSRV); };
  Local.proPrice = function () { return ok(0); }; Local.proCheckout = function () { return fail(NOSRV); };
  /* ---------- Copa de la Cancha en modo demo: mismas reglas que supabase/cups.sql, guardado en este dispositivo ---------- */
  // Administración en demo: los mails de PP.CONFIG.cupDemoAdmins (por defecto admin@demo.com).
  var CUP_GAP = 15;
  function cupAdminLocal() { var l = CFG.cupDemoAdmins || ['admin@demo.com']; return !!(DB.user && l.map(function (m) { return String(m).toLowerCase(); }).indexOf(String(DB.user.email || '').toLowerCase()) >= 0); }
  function cupEnd(c) { return Math.min(new Date(c.end_at).getTime(), c.closed_at ? new Date(c.closed_at).getTime() : Infinity); }
  function cupData() { var d = load(); d.cups = d.cups || []; d.cupE = d.cupE || {}; d.cupS = d.cupS || {}; return d; }
  function cupEntries(d, id) { return d.cupE[id] = d.cupE[id] || {}; }
  function cupGet(d, id) { return d.cups.filter(function (c) { return c.id === id; })[0]; }
  function cupOrder(a, b) { return b.total - a.total || (new Date(a.last_improved_at || 8e15) - new Date(b.last_improved_at || 8e15)) || (new Date(a.created_at) - new Date(b.created_at)); }
  function cupApproved(d, id) { var E = cupEntries(d, id); return Object.keys(E).map(function (k) { return E[k]; }).filter(function (e) { return e.status === 'approved'; }).sort(cupOrder); }
  function cupFinalize(d, c) {
    if (c.winner_code || Date.now() < cupEnd(c)) return;
    var w = cupApproved(d, c.id).filter(function (e) { return e.total > 0; })[0]; if (!w) return;
    var a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = ''; for (var i = 0; i < 6; i++) s += a[Math.floor(Math.random() * 32)];
    c.winner_user = w.user_id; c.winner_code = s; store(d);
  }
  function cupNeedAdmin() { if (!cupAdminLocal()) throw new Error('Solo la administración puede hacer esto.'); }
  Local.cupCurrent = function () {
    var d = cupData(), now = Date.now(), adm = cupAdminLocal();
    var c = d.cups.filter(function (x) { return cupEnd(x) > now; }).sort(function (a, b) { return new Date(a.start_at) - new Date(b.start_at); })[0]
      || d.cups.slice().sort(function (a, b) { return cupEnd(b) - cupEnd(a); })[0];
    if (!c) return ok({ admin: adm, cup: null });
    cupFinalize(d, c);
    var fin = cupEnd(c), st = now < new Date(c.start_at).getTime() ? 'soon' : now < fin ? 'live' : 'done', E = cupEntries(d, c.id);
    var e = DB.user ? E[DB.user.id] : null, w = c.winner_user ? E[c.winner_user] : null, rk = null;
    if (e && e.status === 'approved') rk = cupApproved(d, c.id).indexOf(e) + 1;
    return ok({ admin: adm, status: st, now: new Date().toISOString(),
      cup: { id: c.id, name: c.name, venue: c.venue, prize: c.prize, start_at: c.start_at, end_at: new Date(fin).toISOString(), price_ars: c.price_ars, pay_info: c.pay_info,
        max_points: c.max_points, winner_name: w ? w.name : null, winner_total: w ? w.total : null, redeemed: !!c.redeemed_at },
      me: e ? { status: e.status, total: e.total, rank: rk, winner: c.winner_user === e.user_id, code: c.winner_user === e.user_id ? c.winner_code : null } : null });
  };
  Local.cupJoin = function (id) {
    if (!DB.user) return fail('Necesitás una cuenta para participar.');
    var d = cupData(), c = cupGet(d, id); if (!c) return fail('No encontramos esa Copa.');
    if (Date.now() >= cupEnd(c)) return fail('La Copa ya terminó.');
    var E = cupEntries(d, id), e = E[DB.user.id], st = +c.price_ars === 0 ? 'approved' : 'pending';
    if (!e) E[DB.user.id] = { user_id: DB.user.id, name: DB.user.name, email: DB.user.email, status: st, total: 0, created_at: new Date().toISOString() };
    else if (e.status === 'rejected') e.status = st; else st = e.status;
    store(d); return ok(st);
  };
  Local.cupSubmit = function (id, game, score) {
    if (!DB.user) return fail('Necesitás una cuenta.');
    var d = cupData(), c = cupGet(d, id), now = Date.now(); if (!c) return fail('No encontramos esa Copa.');
    if (now < new Date(c.start_at).getTime() || now >= cupEnd(c)) return ok({ ok: false, reason: 'not_live' });
    if (!PP.gameById(game)) return fail('Ese juego no cuenta para la Copa.');
    if (typeof score !== 'number' || score < 0 || score > c.max_points || score !== Math.round(score)) return fail('Puntaje fuera de rango.');
    var e = cupEntries(d, id)[DB.user.id]; if (!e || e.status !== 'approved') return ok({ ok: false, reason: 'not_approved' });
    if (e.last_submit_at && now - e.last_submit_at < CUP_GAP * 1000) return ok({ ok: false, reason: 'too_fast', wait: Math.ceil(CUP_GAP - (now - e.last_submit_at) / 1000) });
    e.last_submit_at = now;
    var S = (d.cupS[id] = d.cupS[id] || {}), mine = (S[DB.user.id] = S[DB.user.id] || {}), old = mine[game];
    if (old != null && score <= old) { store(d); return ok({ ok: true, improved: false, best: old, total: e.total }); }
    mine[game] = score; e.total = Object.keys(mine).reduce(function (t, k) { return t + mine[k]; }, 0); e.last_improved_at = new Date().toISOString();
    store(d); return ok({ ok: true, improved: true, best: score, total: e.total });
  };
  Local.cupRanking = function (id) {
    var d = cupData(); return ok(cupApproved(d, id).slice(0, 100).map(function (e) { return { user_id: e.user_id, name: e.name, total: e.total, last_improved_at: e.last_improved_at }; }));
  };
  Local.cupMyScores = function (id) { var d = cupData(); return ok(DB.user && d.cupS[id] && d.cupS[id][DB.user.id] || {}); };
  Local.cupAdmin = function (fn, a) {
    try { cupNeedAdmin(); } catch (e) { return Promise.reject(e); }
    var d = cupData(); a = a || {};
    if (fn === 'list') return ok(d.cups.map(function (c) {
      cupFinalize(d, c); var E = cupEntries(d, c.id), all = Object.keys(E).map(function (k) { return E[k]; }), w = c.winner_user ? E[c.winner_user] : null;
      return Object.assign({}, c, { winner_name: w ? w.name : null, pending: all.filter(function (e) { return e.status === 'pending'; }).length, approved: all.filter(function (e) { return e.status === 'approved'; }).length });
    }).sort(function (x, y) { return new Date(y.start_at) - new Date(x.start_at); }));
    if (fn === 'save') {
      if (new Date(a.p_end) <= new Date(a.p_start)) return fail('El cierre tiene que ser después del inicio.');
      var c = a.p_id ? cupGet(d, a.p_id) : null;
      if (a.p_id && !c) return fail('No encontramos esa Copa.');
      if (!c) { c = { id: uid(), created_at: new Date().toISOString() }; d.cups.push(c); }
      Object.assign(c, { name: a.p_name, venue: a.p_venue || '', prize: a.p_prize || '', start_at: a.p_start, end_at: a.p_end, price_ars: +a.p_price || 0, pay_info: a.p_pay || '', max_points: +a.p_max || 100 });
      store(d); return ok(c.id);
    }
    if (fn === 'entries') { var E = cupEntries(d, a.p_cup); return ok(Object.keys(E).map(function (k) { return E[k]; }).sort(function (x, y) { var o = { pending: 0, approved: 1, rejected: 2 }; return o[x.status] - o[y.status] || y.total - x.total; })); }
    if (fn === 'decide') { var en = cupEntries(d, a.p_cup)[a.p_user]; if (en) en.status = a.p_status; store(d); return ok(); }
    if (fn === 'close') { var cc = cupGet(d, a.p_cup); if (cc && !cc.closed_at && Date.now() < new Date(cc.end_at).getTime()) cc.closed_at = new Date().toISOString(); if (cc) cupFinalize(d, cc); store(d); return ok(); }
    if (fn === 'redeem') { var cr = cupGet(d, a.p_cup); if (cr) cr.redeemed_at = a.p_done === false ? null : new Date().toISOString(); store(d); return ok(); }
    return fail('Acción desconocida.');
  };
  // Desafíos: necesitan el servidor (se juega entre celulares distintos)
  var NODUEL = 'Los desafíos con amigos necesitan el servidor de la comunidad.';
  Local.duelMine = Local.duelOpen = function () { return ok([]); };
  ['duelCreate', 'duelJoin', 'duelDetail', 'duelInvite', 'duelUninvite', 'duelSubmit'].forEach(function (k) { Local[k] = function () { return fail(NODUEL); }; });
  // Contraseñas en modo demo
  Local.recoverStart = function () { var e = new Error('En modo demo no se mandan mails.'); e.help = true; return Promise.reject(e); };
  Local.setPassword = function (pw) {
    var d = load(), u = d.users && d.users[d.session]; if (!u) return fail('Necesitás iniciar sesión.');
    u.pass = hash(pw); store(d); return ok(true);
  };
  Local.adminSetPassword = function () { return fail('Necesita el servidor de la comunidad.'); };
  function find(d, id) { return (d.tours || []).filter(function (x) { return x.id === id; })[0]; }
  function pub(u) { return { id: u.id, email: u.email, name: u.name, cat: u.cat, side: u.side, stars: u.stars || 0, level: u.level || 1, iq: u.iq || 70, picks: u.picks || 0 }; }

  /* ================= Supabase ================= */
  var SKEY = 'pelotita.session', sess = null;
  function rest(method, path, body, prefer, retried) {
    var h = { apikey: CFG.supabaseKey, 'Content-Type': 'application/json' };
    if (sess) h.Authorization = 'Bearer ' + sess.access_token;
    if (prefer) h.Prefer = prefer;
    return fetch(CFG.supabaseUrl + path, { method: method, headers: h, body: body ? JSON.stringify(body) : undefined }).then(function (r) {
      if (r.status === 401 && sess && sess.refresh_token && !retried) return refresh().then(function () { return rest(method, path, body, prefer, true); });
      return r.text().then(function (tx) {
        var j = null; try { j = tx ? JSON.parse(tx) : null; } catch (e) {}
        if (!r.ok) throw new Error(human((j && (j.msg || j.message || j.error_description || j.error)) || 'Error ' + r.status));
        return j;
      });
    });
  }
  function human(m) {
    if (/already registered|already exists/i.test(m)) return 'Ya hay una cuenta con ese mail.';
    if (/invalid login|invalid_grant/i.test(m)) return 'Mail o contraseña incorrectos.';
    if (/known to be weak|easy to guess|pwned/i.test(m)) return 'Esa contraseña es muy común y fácil de adivinar. Elegí otra.';
    if (/password/i.test(m) && /6|short|weak/i.test(m)) return 'La contraseña tiene que tener al menos 6 caracteres.';
    if (/not confirmed/i.test(m)) return 'Falta confirmar el mail. Revisá tu casilla.';
    if (/cup_/.test(m) && /could not find|does not exist|schema cache/i.test(m)) return 'La Copa todavía no está activada en el servidor.';
    if (/duel_/.test(m) && /could not find|does not exist|schema cache/i.test(m)) return 'Los desafíos todavía no están activados en el servidor.';
    if (/row-level security|violates/i.test(m)) return 'Esa acción ya no está permitida (puede haber cerrado el plazo).';
    return m;
  }
  function setSess(s) { sess = s; try { if (s) localStorage.setItem(SKEY, JSON.stringify(s)); else localStorage.removeItem(SKEY); } catch (e) {} }
  function refresh() {
    return fetch(CFG.supabaseUrl + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: CFG.supabaseKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: sess.refresh_token }) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) { setSess(null); DB.user = null; throw new Error('Tu sesión venció. Volvé a entrar.'); } setSess(j); }); });
  }
  function profile(id) { return rest('GET', '/rest/v1/profiles?id=eq.' + id + '&select=*').then(function (rows) { return rows && rows[0]; }); }
  // Inscriptos, puntajes y pronósticos de un torneo. El servidor no muestra los pronósticos ajenos:
  // solo cuántos tiene cada jugador y el propio. Se arma la misma forma que usa la pantalla (t.bets, t.myBet).
  function players(t) {
    return rest('POST', '/rest/v1/rpc/tournament_detail', { p_id: t.id }).then(function (d) {
      d = d || {}; t.players = d.players || []; t.bets = [];
      (d.picks || []).forEach(function (x) { for (var i = 0; i < x.n; i++) t.bets.push({ pick: x.pick }); });
      t.myBet = d.my_pick ? { user_id: DB.user && DB.user.id, pick: d.my_pick } : null;
      return t;
    });
  }
  var NEED = 'Creá tu cuenta o entrá para ver el ranking y los torneos.';
  // Pedido sin JSON (subir o borrar archivos), con renovación de sesión
  function raw(method, path, body, type, retried) {
    var h = { apikey: CFG.supabaseKey }; if (sess) h.Authorization = 'Bearer ' + sess.access_token; if (type) h['Content-Type'] = type;
    return fetch(CFG.supabaseUrl + path, { method: method, headers: h, body: body }).then(function (r) {
      if (r.status === 401 && sess && sess.refresh_token && !retried) return refresh().then(function () { return raw(method, path, body, type, true); });
      return r.text().then(function (tx) {
        var j = null; try { j = tx ? JSON.parse(tx) : null; } catch (e) {}
        if (!r.ok) throw new Error(human((j && (j.message || j.error || j.msg)) || 'Error ' + r.status));
        return j;
      });
    });
  }
  var VSEL = 'id,user_id,name,challenge,path,status,created_at,video_likes(user_id)';
  function vmap(rows) {
    return (rows || []).map(function (v) {
      var l = v.video_likes || []; v.likes = l.length; v.liked = !!(DB.user && l.some(function (x) { return x.user_id === DB.user.id; })); delete v.video_likes; return v;
    });
  }
  var Supa = {
    refreshMe: function () { if (!sess || !sess.user) return ok(null); return profile(sess.user.id).then(function (p) { if (p) DB.user = Object.assign({ email: sess.user.email }, p); return DB.user; }); },
    videos: function (ch) { return rest('GET', '/rest/v1/videos?challenge=eq.' + (+ch) + '&status=eq.approved&select=' + VSEL + '&order=created_at.desc&limit=60').then(vmap).then(function (l) { return l.sort(function (a, b) { return b.likes - a.likes; }); }); },
    videoCounts: function () { return rest('GET', '/rest/v1/videos?status=eq.approved&select=challenge&limit=2000').then(function (rows) { var c = {}; (rows || []).forEach(function (r) { c[r.challenge] = (c[r.challenge] || 0) + 1; }); return c; }); },
    myVideos: function () { return rest('GET', '/rest/v1/videos?user_id=eq.' + DB.user.id + '&select=' + VSEL + '&order=created_at.desc&limit=60').then(vmap); },
    monthCount: function () { return rest('POST', '/rest/v1/rpc/videos_this_month', {}); },
    uploadVideo: function (file, ch) {
      var ext = /quicktime/.test(file.type) ? 'mov' : /webm/.test(file.type) ? 'webm' : 'mp4';
      var path = DB.user.id + '/' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + '.' + ext;
      return Supa.monthCount().then(function (n) {
        if (n >= DB.VIDEOS_PER_MONTH) throw new Error('Ya subiste los ' + DB.VIDEOS_PER_MONTH + ' videos de este mes.');
        return raw('POST', '/storage/v1/object/jugadas/' + path, file, file.type || 'video/mp4');
      }).then(function () {
        return rest('POST', '/rest/v1/videos', { user_id: DB.user.id, name: DB.user.name, challenge: +ch, path: path }, 'return=representation')
          .then(function (rows) { return rows[0]; }, function (e) { raw('DELETE', '/storage/v1/object/jugadas/' + path).catch(function () {}); throw e; });
      });
    },
    videoUrl: function (path) { return rest('POST', '/storage/v1/object/sign/jugadas/' + path, { expiresIn: 3600 }).then(function (j) { return CFG.supabaseUrl + '/storage/v1' + (j.signedURL || j.signedUrl); }); },
    like: function (id, on) {
      return on ? rest('POST', '/rest/v1/video_likes', { video_id: id, user_id: DB.user.id }, 'resolution=ignore-duplicates')
        : rest('DELETE', '/rest/v1/video_likes?video_id=eq.' + id + '&user_id=eq.' + DB.user.id);
    },
    pendingVideos: function () { return rest('GET', '/rest/v1/videos?status=eq.pending&select=' + VSEL + '&order=created_at.asc&limit=60').then(vmap); },
    reviewVideo: function (v, status) {
      return rest('PATCH', '/rest/v1/videos?id=eq.' + v.id, { status: status }, 'return=representation').then(function (r) {
        if (!r || !r[0]) throw new Error('No tenés permiso para revisar videos.');
        if (status === 'rejected') raw('DELETE', '/storage/v1/object/jugadas/' + v.path).catch(function () {});
      });
    },
    deleteVideo: function (v) { return rest('DELETE', '/rest/v1/videos?id=eq.' + v.id).then(function () { return raw('DELETE', '/storage/v1/object/jugadas/' + v.path).catch(function () {}); }); },
    // Opiniones: las puede dejar cualquiera; solo la administración las lee
    sendFeedback: function (d) { return rest('POST', '/rest/v1/feedback', d); },
    // Funciones del panel de administración (el servidor rechaza a quien no es administrador)
    admin: function (fn, args) { return rest('POST', '/rest/v1/rpc/' + fn, args || {}); },
    // Buscar jugadores por nombre (para todos) y usuarios por nombre o mail (solo administración)
    searchPlayers: function (q) { if (!DB.user) return fail(NEED); return rest('POST', '/rest/v1/rpc/search_players', { q: q }); },
    adminUsers: function (q) { return rest('POST', '/rest/v1/rpc/admin_users', { q: q || '' }); },
    // Precio de la suscripción (en pesos) guardado en el servidor; 0 = cobro no habilitado
    proPrice: function () { return rest('GET', '/rest/v1/app_settings?key=eq.pro_price_ars&select=value').then(function (r) { var n = r && r[0] ? parseFloat(r[0].value) : 0; return n > 0 ? n : 0; }, function () { return 0; }); },
    // Pide al servidor el enlace de pago de Mercado Pago para este usuario
    proCheckout: function () {
      if (!CFG.proCheckout) return fail('El cobro todavía no está habilitado.');
      var go = function (retried) {
        return fetch(CFG.proCheckout, { method: 'POST', headers: { Authorization: 'Bearer ' + sess.access_token, 'Content-Type': 'application/json' }, body: '{}' }).then(function (r) {
          if (r.status === 401 && !retried) return refresh().then(function () { return go(true); });
          return r.json().then(function (j) { if (!r.ok || !j.url) throw new Error((j && (j.error || j.message)) || 'No pudimos abrir el pago. Probá de nuevo.'); return j.url; });
        });
      };
      return go(false);
    },
    setVip: function (mail, days) { return rest('POST', '/rest/v1/rpc/set_vip', { mail: mail, dias: days }); },
    init: function () {
      try { sess = JSON.parse(localStorage.getItem(SKEY)); } catch (e) { sess = null; }
      // Vuelta desde el mail de "recuperar contraseña": el enlace trae una sesión temporal en la dirección (#access_token=...&type=recovery)
      var hp = new URLSearchParams(String(location.hash || '').replace(/^#/, ''));
      if (hp.get('type') === 'recovery' && hp.get('access_token')) {
        history.replaceState(null, '', location.pathname + location.search);
        var tmp = { access_token: hp.get('access_token'), refresh_token: hp.get('refresh_token'), token_type: 'bearer' };
        return fetch(CFG.supabaseUrl + '/auth/v1/user', { headers: { apikey: CFG.supabaseKey, Authorization: 'Bearer ' + tmp.access_token } })
          .then(function (r) { if (!r.ok) throw new Error('El enlace venció. Pedí uno nuevo.'); return r.json(); })
          .then(function (usr) { tmp.user = usr; setSess(tmp); DB.recovery = true; return profile(usr.id); })
          .then(function (p) { DB.user = p ? Object.assign({ email: sess.user.email }, p) : null; return DB.user; }, function (e) { DB.recoveryError = e.message; return null; });
      }
      if (!sess || !sess.user) return ok(null);
      return profile(sess.user.id).then(function (p) { DB.user = p ? Object.assign({ email: sess.user.email }, p) : null; return DB.user; }, function () { return null; });
    },
    // Recuperar contraseña por mail. Necesita un servicio de mail propio configurado en Supabase (SMTP):
    // sin eso, Supabase solo manda mails al equipo del proyecto y acá se devuelve help=true para pedir ayuda a la administración.
    recoverStart: function (email) {
      var back = location.origin + location.pathname;
      return fetch(CFG.supabaseUrl + '/auth/v1/recover?redirect_to=' + encodeURIComponent(back), { method: 'POST', headers: { apikey: CFG.supabaseKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email }) })
        .then(function (r) {
          if (r.ok) return true;
          return r.json().catch(function () { return {}; }).then(function (j) {
            var e = new Error(r.status === 429 ? 'Pediste muchos mails seguidos. Esperá un rato o pedí ayuda.' : 'No pudimos mandarte el mail.'); e.help = true; e.code = j.error_code || j.code || r.status; throw e;
          });
        }, function () { var e = new Error('No pudimos mandarte el mail.'); e.help = true; throw e; });
    },
    setPassword: function (pw) {
      if (!sess) return fail('Necesitás iniciar sesión.');
      var go = function (retried) {
        return fetch(CFG.supabaseUrl + '/auth/v1/user', { method: 'PUT', headers: { apikey: CFG.supabaseKey, Authorization: 'Bearer ' + sess.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) })
          .then(function (r) {
            if (r.status === 401 && !retried && sess.refresh_token) return refresh().then(function () { return go(true); });
            return r.json().catch(function () { return {}; }).then(function (j) {
              if (r.ok) { DB.recovery = false; return true; }
              var m = String(j.msg || j.message || j.error_description || j.error || '');
              if (/same/i.test(m)) throw new Error('Es igual a la que ya tenías. Elegí otra.');
              throw new Error(human(m || 'No se pudo cambiar la contraseña.'));
            });
          });
      };
      return go(false);
    },
    // Administración: ponerle una contraseña nueva a un jugador (función del servidor admin-password)
    adminSetPassword: function (email, pw) {
      if (!sess) return fail('Necesitás iniciar sesión.');
      return fetch(CFG.supabaseUrl + '/functions/v1/admin-password', { method: 'POST', headers: { Authorization: 'Bearer ' + sess.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email, password: pw }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || 'No se pudo cambiar la contraseña.'); return true; }); });
    },
    signUp: function (f) {
      // Registro por la función del servidor: crea la cuenta ya confirmada (sin mail) y después entra con la contraseña
      return fetch(CFG.supabaseUrl + '/functions/v1/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: f.email, password: f.password, name: f.name, cat: f.cat, side: f.side }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(human(j.error || j.msg || 'No se pudo crear la cuenta.')); return j; }); })
        .then(function () { return Supa.signIn({ email: f.email, password: f.password }); });
    },
    signIn: function (f) {
      return fetch(CFG.supabaseUrl + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: CFG.supabaseKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: f.email, password: f.password }) })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(human(j.error_description || j.msg || j.message || 'No se pudo entrar.')); return j; }); })
        .then(function (j) { setSess(j); return profile(j.user.id); })
        .then(function (p) {
          if (p) { DB.user = Object.assign({ email: f.email }, p); return DB.user; }
          var meta = sess.user.user_metadata || {};
          return rest('POST', '/rest/v1/profiles', { id: sess.user.id, name: meta.name || f.email.split('@')[0], cat: meta.cat || '8va', side: meta.side || 'Drive' }, 'resolution=merge-duplicates,return=representation').then(function (rows) { DB.user = Object.assign({ email: f.email }, rows[0]); return DB.user; });
        });
    },
    signOut: function () { setSess(null); DB.user = null; return ok(); },
    pushStats: function (s) {
      if (!DB.user) return ok();
      var body = { stars: s.stars, level: s.level, iq: s.iq, updated_at: new Date().toISOString() }; if (s.picks !== undefined) body.picks = s.picks;
      return rest('PATCH', '/rest/v1/profiles?id=eq.' + DB.user.id, body).then(function () { Object.assign(DB.user, body); });
    },
    ranking: function (kind) { if (!DB.user) return fail(NEED); return rest('POST', '/rest/v1/rpc/ranking_list', { p_kind: kind }); },
    myRank: function (kind) { if (!DB.user) return ok(null); return rest('POST', '/rest/v1/rpc/my_rank', { p_kind: kind }); },
    // Seguir jugadores (como en Instagram) para encontrarlos rápido e invitarlos a torneos
    following: function () { if (!DB.user) return fail(NEED); return rest('POST', '/rest/v1/rpc/following_list', {}); },
    followCounts: function () { if (!DB.user) return ok({ following: 0, followers: 0 }); return rest('POST', '/rest/v1/rpc/follow_counts', {}); },
    follow: function (id, on) {
      return on ? rest('POST', '/rest/v1/follows', { followed: id }, 'resolution=ignore-duplicates')
        : rest('DELETE', '/rest/v1/follows?follower=eq.' + DB.user.id + '&followed=eq.' + encodeURIComponent(id));
    },
    invite: function (tid, uid) {
      return rest('POST', '/rest/v1/tournament_invites', { tournament_id: tid, user_id: uid }, 'resolution=ignore-duplicates')
        .catch(function () { throw new Error('Para invitar tenés que organizar o estar inscripto en el torneo, y que todavía no haya empezado.'); });
    },
    myInvites: function () { if (!DB.user) return ok([]); return rest('POST', '/rest/v1/rpc/my_invites', {}); },
    // Desafíos con amigos (supabase/duels.sql): 1 contra 1 o 2 contra 2, un turno por jugador
    duelCreate: function (size, game, open, hours) { return rest('POST', '/rest/v1/rpc/duel_create', { p_size: size, p_game: game, p_open: !!open, p_hours: hours }); },
    duelJoin: function (ref, team) { return rest('POST', '/rest/v1/rpc/duel_join', { p_ref: String(ref), p_team: team || null }); },
    duelDetail: function (ref) { return rest('POST', '/rest/v1/rpc/duel_detail', { p_ref: String(ref) }); },
    duelInvite: function (id, user, team) { return rest('POST', '/rest/v1/rpc/duel_invite', { p_duel: id, p_user: user, p_team: team }); },
    duelUninvite: function (id, user) { return rest('POST', '/rest/v1/rpc/duel_uninvite', { p_duel: id, p_user: user || null }); },
    duelSubmit: function (id, score) { return rest('POST', '/rest/v1/rpc/duel_submit', { p_duel: id, p_score: score }); },
    duelMine: function () { if (!DB.user) return ok([]); return rest('POST', '/rest/v1/rpc/duel_list_mine', {}); },
    duelOpen: function () { if (!DB.user) return ok([]); return rest('POST', '/rest/v1/rpc/duel_list_open', {}); },
    // Copa de la Cancha: todo pasa por funciones del servidor (supabase/cups.sql); el puntaje lo valida la base
    cupCurrent: function () { return rest('POST', '/rest/v1/rpc/cup_current', {}); },
    cupJoin: function (id) { return rest('POST', '/rest/v1/rpc/cup_join', { p_cup: id }); },
    cupSubmit: function (id, game, score) { return rest('POST', '/rest/v1/rpc/cup_submit', { p_cup: id, p_game: game, p_score: score }); },
    cupRanking: function (id) { return rest('POST', '/rest/v1/rpc/cup_ranking', { p_cup: id }); },
    cupMyScores: function (id) { if (!DB.user) return ok({}); return rest('POST', '/rest/v1/rpc/cup_my_scores', { p_cup: id }); },
    cupAdmin: function (fn, args) { return rest('POST', '/rest/v1/rpc/cup_admin_' + fn, args || {}); },
    dismissInvite: function (tid) { return rest('DELETE', '/rest/v1/tournament_invites?tournament_id=eq.' + encodeURIComponent(tid) + '&user_id=eq.' + DB.user.id); },
    sponsors: function () { return rest('GET', '/rest/v1/sponsors?select=*&order=created_at.desc'); },
    sponsorApply: function (f) { return rest('POST', '/rest/v1/sponsors', { name: f.name, type: f.type, descr: f.descr, contact: f.contact, created_by: DB.user.id }); },
    tournaments: function () { if (!DB.user) return fail(NEED); return rest('POST', '/rest/v1/rpc/tournaments_open', {}); },
    tournament: function (idOrCode) {
      if (!DB.user) return fail(NEED);
      return rest('POST', '/rest/v1/rpc/tournament_find', { p_ref: String(idOrCode) }).then(function (rows) { if (!rows || !rows[0]) throw new Error('No encontramos ese torneo.'); return players(rows[0]); });
    },
    createTournament: function (f) {
      return rest('POST', '/rest/v1/tournaments', { code: code(), name: f.name, kind: f.kind, mode: f.mode, start_at: f.start_at, hours: f.hours, created_by: DB.user.id, host: DB.user.name }, 'return=representation')
        .then(function (rows) { var t = rows[0]; t.players = []; t.bets = []; return t; });
    },
    join: function (id, partner) { return rest('POST', '/rest/v1/tournament_players', { tournament_id: id, user_id: DB.user.id, name: DB.user.name + (partner ? ' + ' + partner : '') }, 'resolution=ignore-duplicates'); },
    bet: function (id, pick) { return rest('POST', '/rest/v1/bets', { tournament_id: id, user_id: DB.user.id, pick: pick }, 'resolution=merge-duplicates'); },
    submitScore: function (id, score) {
      return rest('GET', '/rest/v1/tournament_players?tournament_id=eq.' + id + '&user_id=eq.' + DB.user.id + '&select=score').then(function (rows) {
        if (!rows || !rows[0]) throw new Error('No estás inscripto.');
        if (score <= rows[0].score) return rows[0].score;
        return rest('PATCH', '/rest/v1/tournament_players?tournament_id=eq.' + id + '&user_id=eq.' + DB.user.id, { score: score }, 'return=representation').then(function (r) {
          if (!r || !r[0]) throw new Error('El torneo no está en juego.');   // la regla del servidor no dejó tocar la fila
          return r[0].score;
        });
      });
    }
  };

  var impl = DB.online ? Supa : Local;
  ['sendFeedback', 'admin', 'searchPlayers', 'adminUsers', 'proPrice', 'proCheckout', 'videos', 'videoCounts', 'myVideos', 'uploadVideo', 'videoUrl', 'like', 'pendingVideos', 'reviewVideo', 'deleteVideo', 'setVip', 'monthCount', 'refreshMe', 'init', 'signIn', 'signOut', 'pushStats', 'ranking', 'sponsors', 'sponsorApply', 'tournaments', 'tournament', 'createTournament', 'join', 'bet', 'submitScore', 'myRank', 'following', 'followCounts', 'follow', 'invite', 'myInvites', 'dismissInvite', 'cupCurrent', 'cupJoin', 'cupSubmit', 'cupRanking', 'cupMyScores', 'cupAdmin', 'recoverStart', 'setPassword', 'adminSetPassword', 'duelCreate', 'duelJoin', 'duelDetail', 'duelInvite', 'duelUninvite', 'duelSubmit', 'duelMine', 'duelOpen'].forEach(function (k) {
    DB[k] = function () { try { return impl[k].apply(impl, arguments); } catch (e) { return Promise.reject(e); } };
  });
  DB.signUp = function (f) {
    if (!validMail(f.email)) return fail('Escribí un mail válido.');
    if (!f.password || f.password.length < 6) return fail('La contraseña tiene que tener al menos 6 caracteres.');
    if (!f.name || f.name.length < 2) return fail('Escribí tu nombre o apodo.');
    return impl.signUp(f);
  };
})();
