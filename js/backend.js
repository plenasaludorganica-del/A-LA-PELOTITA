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
  Local.proPrice = function () { return ok(0); }; Local.proCheckout = function () { return fail(NOSRV); };
  [].forEach(function () {
  });
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
    if (/row-level security|violates/i.test(m)) return 'Esa acción ya no está permitida (puede haber cerrado el plazo).';
    return m;
  }
  function setSess(s) { sess = s; try { if (s) localStorage.setItem(SKEY, JSON.stringify(s)); else localStorage.removeItem(SKEY); } catch (e) {} }
  function refresh() {
    return fetch(CFG.supabaseUrl + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: CFG.supabaseKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: sess.refresh_token }) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) { setSess(null); DB.user = null; throw new Error('Tu sesión venció. Volvé a entrar.'); } setSess(j); }); });
  }
  function profile(id) { return rest('GET', '/rest/v1/profiles?id=eq.' + id + '&select=*').then(function (rows) { return rows && rows[0]; }); }
  function players(t) {
    return Promise.all([
      rest('GET', '/rest/v1/tournament_players?tournament_id=eq.' + t.id + '&select=user_id,name,score'),
      rest('GET', '/rest/v1/bets?tournament_id=eq.' + t.id + '&select=user_id,pick')
    ]).then(function (r) { t.players = r[0] || []; t.bets = r[1] || []; t.myBet = DB.user ? (t.bets.filter(function (b) { return b.user_id === DB.user.id; })[0] || null) : null; return t; });
  }
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
      if (!sess || !sess.user) return ok(null);
      return profile(sess.user.id).then(function (p) { DB.user = p ? Object.assign({ email: sess.user.email }, p) : null; return DB.user; }, function () { return null; });
    },
    signUp: function (f) {
      return fetch(CFG.supabaseUrl + '/auth/v1/signup', { method: 'POST', headers: { apikey: CFG.supabaseKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: f.email, password: f.password, data: { name: f.name, cat: f.cat, side: f.side } }) })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(human(j.msg || j.message || j.error_description || 'No se pudo crear la cuenta.')); return j; }); })
        .then(function (j) {
          if (!j.access_token) throw new Error('Te mandamos un mail para confirmar la cuenta. Confirmalo y después entrá con tu contraseña.');
          setSess(j);
          return rest('POST', '/rest/v1/profiles', { id: j.user.id, name: f.name, cat: f.cat, side: f.side }, 'resolution=merge-duplicates,return=representation');
        }).then(function (rows) { DB.user = Object.assign({ email: f.email }, rows[0]); return DB.user; });
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
    ranking: function (kind) { return rest('GET', '/rest/v1/profiles?select=id,name,cat,side,stars,level,iq,picks&order=' + kind + '.desc&limit=100'); },
    sponsors: function () { return rest('GET', '/rest/v1/sponsors?select=*&order=created_at.desc'); },
    sponsorApply: function (f) { return rest('POST', '/rest/v1/sponsors', { name: f.name, type: f.type, descr: f.descr, contact: f.contact, created_by: DB.user.id }); },
    tournaments: function () { return rest('GET', '/rest/v1/tournaments?select=*&order=start_at.asc&limit=60'); },
    tournament: function (idOrCode) {
      var q = /^[A-Z0-9]{6}$/.test(idOrCode) ? 'code=eq.' + idOrCode : 'id=eq.' + idOrCode;
      return rest('GET', '/rest/v1/tournaments?' + q + '&select=*').then(function (rows) { if (!rows || !rows[0]) throw new Error('No encontramos ese torneo.'); return players(rows[0]); });
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
  ['proPrice', 'proCheckout', 'videos', 'videoCounts', 'myVideos', 'uploadVideo', 'videoUrl', 'like', 'pendingVideos', 'reviewVideo', 'deleteVideo', 'setVip', 'monthCount', 'refreshMe', 'init', 'signIn', 'signOut', 'pushStats', 'ranking', 'sponsors', 'sponsorApply', 'tournaments', 'tournament', 'createTournament', 'join', 'bet', 'submitScore'].forEach(function (k) {
    DB[k] = function () { try { return impl[k].apply(impl, arguments); } catch (e) { return Promise.reject(e); } };
  });
  DB.signUp = function (f) {
    if (!validMail(f.email)) return fail('Escribí un mail válido.');
    if (!f.password || f.password.length < 6) return fail('La contraseña tiene que tener al menos 6 caracteres.');
    if (!f.name || f.name.length < 2) return fail('Escribí tu nombre o apodo.');
    return impl.signUp(f);
  };
})();
