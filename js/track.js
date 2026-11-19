/* A la Pelotita · Estadísticas anónimas para el panel de administración.
   Cada navegador guarda un número al azar (no se guarda IP, nombre ni mail). Mientras el juego está abierto avisa cada 45 s
   que sigue ahí (para ver quién está en vivo) y cada partida avisa qué juego fue, cuánto duró y cómo terminó.
   Servidor: supabase/analytics.sql. */
(function () {
  'use strict';
  var PP = window.PP, DB = PP.DB, T = PP.Track = {}, KEY = 'pelotita.vid', vid = null, cur = null;
  function noop() {}
  function getVid() {
    if (vid) return vid;
    try { vid = localStorage.getItem(KEY); } catch (e) {}
    if (!vid || !/^[a-z0-9]{8,32}$/.test(vid)) {
      vid = (Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).replace(/[^a-z0-9]/g, '').slice(0, 24);
      try { localStorage.setItem(KEY, vid); } catch (e) {}
    }
    return vid;
  }
  function device() {
    var touch = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches), w = Math.min(screen.width || 0, screen.height || 0);
    return touch ? (w >= 600 ? 'tablet' : 'celu') : 'compu';
  }
  function where() { return PP.ui && PP.ui.where ? PP.ui.where() : 'inicio'; }
  function ping() { if (!DB.online || document.hidden) return; DB.trackPing(getVid(), where(), device()).catch(noop); }
  // Al cambiar de pantalla, para que el panel muestre dónde está cada uno (como mucho una vez cada 10 s)
  var lastNav = 0;
  T.nav = function () { var n = Date.now(); if (n - lastNav < 10000) return; lastNav = n; setTimeout(ping, 300); };
  T.init = function () {
    if (!DB.online) return;
    setTimeout(ping, 2000); setInterval(ping, 45000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) ping(); });
  };
  // Empieza una partida: game = id corta (lv1, read, lights, ghost, torneo, desafio, exhibicion)
  T.start = function (game) { cur = { game: game, t: Date.now() }; ping(); };
  // Termina: result = gano, perdio, salio (abandonó) o fin (juegos sin ganar o perder)
  T.end = function (result) {
    if (!cur || !result) return; var c = cur; cur = null;
    if (!DB.online) return;
    DB.trackPlay(getVid(), c.game, result, Math.round((Date.now() - c.t) / 1000)).catch(noop);
  };
})();
