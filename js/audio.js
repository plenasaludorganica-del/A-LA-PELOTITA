/* A la Pelotita · sonido sintetizado con WebAudio (sin archivos) */
(function () {
  'use strict';
  var PP = window.PP;
  var ctx = null, master = null, musicGain = null, musicTimer = null, step = 0;
  var A = PP.Audio = { on: true, music: true };

  A.unlock = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = 0.16; musicGain.connect(master);
      A.setMusic(A.music);
    } catch (e) { ctx = null; }
  };

  function tone(freq, dur, type, vol, when, slideTo, dest) {
    if (!ctx || !A.on) return;
    var t = ctx.currentTime + (when || 0);
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, freq, q, when, type) {
    if (!ctx || !A.on) return;
    var t = ctx.currentTime + (when || 0);
    var len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    var buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var s = ctx.createBufferSource(); s.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.value = freq || 1200; f.Q.value = q || 1;
    var g = ctx.createGain(); g.gain.value = vol || 0.3;
    s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }

  var SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5, 1568, 1760];
  A.play = function (name, n) {
    if (!ctx || !A.on) return;
    n = n || 0;
    switch (name) {
      case 'hit': noise(0.06, 0.5, 900, 1.2); tone(190, 0.09, 'sine', 0.5, 0, 90); break;
      case 'perfect':
        noise(0.07, 0.6, 1500, 1); tone(240, 0.1, 'sine', 0.55, 0, 100);
        var f = SCALE[Math.min(n, SCALE.length - 1)];
        tone(f, 0.16, 'triangle', 0.28); tone(f * 1.5, 0.22, 'sine', 0.2, 0.05); break;
      case 'weak': noise(0.05, 0.25, 500, 1); tone(140, 0.08, 'sine', 0.3, 0, 80); break;
      case 'bounce': tone(150, 0.07, 'sine', 0.25, 0, 70); break;
      case 'glass': tone(1900, 0.12, 'sine', 0.12); tone(2700, 0.16, 'sine', 0.08, 0.01); noise(0.05, 0.12, 4000, 2); break;
      case 'net': noise(0.15, 0.3, 300, 0.8); break;
      case 'smash': noise(0.14, 0.8, 700, 0.7); tone(320, 0.25, 'sawtooth', 0.3, 0, 60); break;
      case 'super':
        for (var i = 0; i < 6; i++) tone(300 + i * 160, 0.12, 'sawtooth', 0.12, i * 0.04, 600 + i * 220);
        noise(0.5, 0.25, 2500, 0.5); break;
      case 'ready': tone(660, 0.1, 'square', 0.12); tone(990, 0.2, 'square', 0.12, 0.1); break;
      case 'point': [0, 4, 7, 12].forEach(function (s, i) { tone(523.25 * Math.pow(2, s / 12), 0.16, 'triangle', 0.25, i * 0.07); }); break;
      case 'lose': [0, -3, -7].forEach(function (s, i) { tone(392 * Math.pow(2, s / 12), 0.22, 'triangle', 0.22, i * 0.12); }); break;
      case 'win': [0, 4, 7, 12, 16, 19, 24].forEach(function (s, i) { tone(523.25 * Math.pow(2, s / 12), 0.22, 'triangle', 0.24, i * 0.08); }); A.play('crowd'); break;
      case 'fail': tone(300, 0.5, 'sawtooth', 0.2, 0, 90); break;
      case 'star': tone(880 * Math.pow(2, n * 4 / 12), 0.3, 'triangle', 0.3); tone(1760 * Math.pow(2, n * 4 / 12), 0.4, 'sine', 0.15, 0.06); break;
      case 'coin': tone(1320, 0.06, 'square', 0.1); tone(1760, 0.1, 'square', 0.1, 0.05); break;
      case 'click': tone(700, 0.05, 'triangle', 0.18, 0, 500); break;
      case 'pop': tone(420, 0.09, 'sine', 0.3, 0, 900); break;
      case 'target': tone(900, 0.1, 'square', 0.15); tone(1350, 0.14, 'square', 0.15, 0.07); noise(0.2, 0.3, 3000, 0.6); break;
      case 'chest': for (var j = 0; j < 8; j++) tone(600 + j * 150, 0.1, 'triangle', 0.16, j * 0.05); break;
      case 'crowd': noise(1.4, 0.22, 1100, 0.4); noise(1.0, 0.12, 2400, 0.6, 0.15); break;
      case 'warn': tone(220, 0.14, 'sawtooth', 0.2); tone(220, 0.14, 'sawtooth', 0.2, 0.18); break;
      case 'early': tone(260, 0.08, 'square', 0.1, 0, 200); break;
    }
  };

  // Música generada en vivo. Cuatro temas (uno por mundo) con tonalidad, ritmo y timbre distintos.
  // Cada tema pasa por seis partes (base, variación, melodía, base, corte, melodía 2) y después sigue el tema siguiente,
  // así nunca suena el mismo bucle más de unos segundos.
  var SONGS = [
    { ms: 150, root: 220.00, arp: 'square',   lead: 'triangle', prog: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]] },   // Club: La mayor
    { ms: 172, root: 196.00, arp: 'triangle', lead: 'sine',     prog: [[0, 4, 7], [5, 9, 12], [-3, 0, 4], [-5, -1, 2]] },   // Playa: Sol mayor, más tranquila
    { ms: 132, root: 174.61, arp: 'square',   lead: 'sawtooth', prog: [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]] },    // Neón: Fa menor, rápida
    { ms: 160, root: 146.83, arp: 'triangle', lead: 'triangle', prog: [[0, 4, 7], [-5, -1, 2], [-3, 0, 4], [5, 9, 12]] }    // Tour: Re mayor
  ];
  var FORM = ['a', 'a2', 'b', 'a', 'brk', 'b2'];
  var ARP = { a: [0, 1, 2, 1, 0, 2, 1, 2], a2: [0, 2, 1, 2, 0, 2, 1, 2], b: [0, 1, 2, 1, 2, 1, 0, 1], b2: [2, 1, 0, 1, 2, 1, 0, 2] };
  // Melodías: 0-2 notas del acorde, 3-5 las mismas una octava arriba, -1 silencio
  var M1 = [2, -1, -1, 1, -1, 2, -1, 3], M2 = [3, -1, 2, -1, 1, -1, 2, -1], M3 = [4, -1, -1, 3, 2, -1, 1, -1], M4 = [2, -1, 3, -1, 4, -1, 3, -1];
  var MEL = { b: [M1, M2, M1, M3], b2: [M4, M2, M3, M1] };
  var song = 0;
  function semi(f, n) { return f * Math.pow(2, n / 12); }
  function tick() {
    musicTimer = null;
    if (!ctx || !A.music || !A.on) return;
    var sg = SONGS[song], sec = FORM[Math.floor(step / 32) % FORM.length], bar = Math.floor(step / 8) % 4, s = step % 8, ch = sg.prog[bar];
    var first = step < 32, dur = sg.ms / 1000;
    if (s % 4 === 0) tone(semi(sg.root / 2, ch[0]), dur * 2.1, 'triangle', 0.5, 0, null, musicGain);
    if ((sec === 'b' || sec === 'b2') && s === 6) tone(semi(sg.root / 2, ch[2]), dur * 1.2, 'triangle', 0.4, 0, null, musicGain);
    if (!first && s % 4 === 0) tone(120, 0.11, 'sine', 0.55, 0, 45, musicGain);            // bombo
    if (sec === 'brk') { if (s === 0) ch.forEach(function (n) { tone(semi(sg.root * 2, n), dur * 3, 'triangle', 0.1, 0, null, musicGain); }); noiseHat(s % 2 ? 0.22 : 0.1); }
    else {
      var pat = ARP[sec], n = ch[pat[s]] + (sec === 'a' && s > 3 ? 12 : 0);
      tone(semi(sg.root * 2, n), dur * 0.9, sg.arp, sg.arp === 'square' ? 0.07 : 0.16, 0, null, musicGain);
      if (s % 2 === 1 && !first) noiseHat(0.2);
      var mel = MEL[sec];
      if (mel) { var m = mel[bar][s]; if (m >= 0) tone(semi(sg.root * 4, ch[m % 3] + (m > 2 ? 12 : 0)), dur * 2.4, sg.lead, sg.lead === 'sawtooth' ? 0.07 : 0.17, 0, null, musicGain); }
    }
    step++;
    if (step >= FORM.length * 32) { step = 0; song = (song + 1) % SONGS.length; }
    musicTimer = setTimeout(tick, sg.ms);
  }
  // Arranca el tema de un mundo (0-3). Si ya está sonando ese, no corta nada.
  A.setSong = function (i) { i = ((i | 0) % SONGS.length + SONGS.length) % SONGS.length; if (i !== song) { song = i; step = 0; } };
  function noiseHat(vol) {
    var t = ctx.currentTime, len = Math.floor(ctx.sampleRate * 0.03);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var s = ctx.createBufferSource(); s.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6000;
    var g = ctx.createGain(); g.gain.value = vol || 0.2; s.connect(f); f.connect(g); g.connect(musicGain); s.start(t);
  }
  A.setMusic = function (v) {
    A.music = v;
    if (musicTimer) { clearTimeout(musicTimer); musicTimer = null; }
    if (v && ctx && A.on) musicTimer = setTimeout(tick, 60);
  };
  A.setOn = function (v) { A.on = v; A.setMusic(A.music); };
  A.vibrate = function (ms) { try { if (A.on && navigator.vibrate) navigator.vibrate(ms); } catch (e) {} };
})();
