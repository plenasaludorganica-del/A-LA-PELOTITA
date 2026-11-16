/* A la Pelotita · escena 3D (cancha, personajes de bloques, pelota, efectos) con Three.js */
(function () {
  'use strict';
  var PP = window.PP, T = window.THREE;
  var S = PP.Scene = {};
  var renderer, scene, camera, W = 1, H = 1, time = 0;
  var worldGroup = null, glowTex, crowd = null, crowdData = [], backdrop = null;
  var camBase = new T.Vector3(0, 6, 18), camLook = new T.Vector3(0, 1, -4);
  var shake = 0, punch = 0, baseFov = 50;
  var tmp = new T.Vector3(), tmpC = new T.Color(), dummy = new T.Object3D();
  S.mode = 'menu'; S.excite = 0; S.followX = 0;

  function canvasTex(w, h, draw) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    var t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
  }
  function basic(color, opacity, additive) {
    var m = new T.MeshBasicMaterial({ color: color });
    if (opacity !== undefined && opacity < 1) { m.transparent = true; m.opacity = opacity; m.depthWrite = false; }
    if (additive) { m.blending = T.AdditiveBlending; m.transparent = true; m.depthWrite = false; }
    return m;
  }
  function box(w, h, d, color) {
    return new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshLambertMaterial({ color: color }));
  }
  function glowSprite(color, scale, opacity) {
    var s = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: color, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: opacity === undefined ? 1 : opacity }));
    s.scale.set(scale, scale, 1); return s;
  }

  /* ---------- Inicio ---------- */
  S.init = function (canvas) {
    renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(50, 1, 0.1, 400);
    scene.add(new T.HemisphereLight(0xffffff, 0x6a55aa, 1.5));
    var dl = new T.DirectionalLight(0xffffff, 1.6); dl.position.set(4, 12, 9); scene.add(dl);
    glowTex = canvasTex(64, 64, function (g) {
      var r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    });
    buildBall(); buildFx(); buildRing(); buildTargets(); buildMachine();
    S.resize();
    window.addEventListener('resize', S.resize);
  };

  S.resize = function () {
    var c = renderer.domElement, p = c.parentElement;
    W = Math.max(1, p.clientWidth); H = Math.max(1, p.clientHeight);
    renderer.setSize(W, H, false);
    var a = W / H;
    baseFov = a < 0.8 ? 68 : (a < 1.25 ? 58 : 50);
    var hf = Math.atan(Math.tan(baseFov * Math.PI / 360) * a);
    if (a < 0.8) {
      var d3 = Math.min(22, 5.4 / Math.tan(hf));
      camBase.set(0, d3 * 0.655, 8 + d3 * 0.755); camLook.set(0, 0, -0.5);
    } else {
      var d = Math.min(26, Math.max(10.5, 5.9 / Math.tan(hf)));
      camBase.set(0, 3.2 + d * 0.22, 8 + d * 0.95); camLook.set(0, 1, -4);
    }
    camera.aspect = a; camera.fov = baseFov; camera.updateProjectionMatrix();
  };

  /* ---------- Mundo ---------- */
  function tube(g, a, b, color, thick) {
    var len = a.distanceTo(b), th = thick || 0.07;
    var m = new T.Mesh(new T.BoxGeometry(th, th, len), basic(color));
    m.position.copy(a).add(b).multiplyScalar(0.5); m.lookAt(b); g.add(m);
    var gl = new T.Mesh(new T.BoxGeometry(th * 4.5, th * 4.5, len), basic(color, 0.2, true));
    gl.position.copy(m.position); gl.quaternion.copy(m.quaternion); g.add(gl);
  }
  function V(x, y, z) { return new T.Vector3(x, y, z); }

  S.setWorld = function (wi) {
    var w = PP.WORLDS[wi]; S.world = w;
    if (worldGroup) {
      scene.remove(worldGroup);
      worldGroup.traverse(function (o) {
        if (o.geometry) o.geometry.dispose();
        if (o.material) { if (o.material.map && o.material.map !== glowTex) o.material.map.dispose(); o.material.dispose(); }
      });
    }
    var g = worldGroup = new T.Group(); scene.add(g);

    scene.background = canvasTex(8, 256, function (c, cw, ch) {
      var gr = c.createLinearGradient(0, 0, 0, ch);
      gr.addColorStop(0, w.sky[0]); gr.addColorStop(0.55, w.sky[1]); gr.addColorStop(1, w.sky[2]);
      c.fillStyle = gr; c.fillRect(0, 0, cw, ch);
    });

    // Telón panorámico (arte del mundo) sobre medio cilindro
    var R = 46, arc = Math.PI * 1.25, hgt = (R * arc / 2) * 387 / 1344;
    backdrop = new T.Mesh(new T.CylinderGeometry(R, R, hgt, 48, 1, true, Math.PI - arc / 2, arc),
      new T.MeshBasicMaterial({ color: 0xffffff, side: T.BackSide, transparent: true, opacity: 0, depthWrite: false }));
    backdrop.position.y = hgt / 2 - 0.4; g.add(backdrop);
    var bd = backdrop;
    new T.TextureLoader().load(w.bg, function (tx) {
      tx.colorSpace = T.SRGBColorSpace; tx.wrapS = T.MirroredRepeatWrapping; tx.repeat.set(2, 1);
      bd.material.map = tx; bd.material.opacity = 1; bd.material.transparent = false; bd.material.needsUpdate = true;
    }, undefined, function () {});

    var ground = new T.Mesh(new T.PlaneGeometry(200, 200), basic(w.out));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.03; g.add(ground);
    var halo = new T.Mesh(new T.PlaneGeometry(30, 44), new T.MeshBasicMaterial({ map: glowTex, color: w.neon, transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false }));
    halo.rotation.x = -Math.PI / 2; halo.position.y = -0.02; g.add(halo);

    // Piso de la cancha
    var floorTex = canvasTex(512, 1024, function (c, cw, ch) {
      for (var i = 0; i < 16; i++) { c.fillStyle = i % 2 ? w.court : w.court2; c.fillRect(0, i * ch / 16, cw, ch / 16 + 1); }
      var rg = c.createRadialGradient(cw / 2, ch / 2, 40, cw / 2, ch / 2, ch * 0.62);
      rg.addColorStop(0, 'rgba(255,255,255,.16)'); rg.addColorStop(1, 'rgba(0,0,0,.22)');
      c.fillStyle = rg; c.fillRect(0, 0, cw, ch);
      c.strokeStyle = w.line; c.lineWidth = 7; c.shadowColor = w.line; c.shadowBlur = 12;
      c.strokeRect(5, 5, cw - 10, ch - 10);
      var sy = 6.95 / 20 * ch;
      c.beginPath();
      c.moveTo(0, ch / 2 - sy); c.lineTo(cw, ch / 2 - sy);
      c.moveTo(0, ch / 2 + sy); c.lineTo(cw, ch / 2 + sy);
      c.moveTo(cw / 2, ch / 2 - sy); c.lineTo(cw / 2, ch / 2 + sy);
      c.stroke();
    });
    floorTex.anisotropy = 8;
    var floor = new T.Mesh(new T.PlaneGeometry(10, 20), new T.MeshBasicMaterial({ map: floorTex }));
    floor.rotation.x = -Math.PI / 2; g.add(floor);

    // Vidrios, rejas y neones
    var meshTex = canvasTex(64, 64, function (c) {
      c.clearRect(0, 0, 64, 64); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 3;
      c.strokeRect(0, 0, 64, 64); c.beginPath(); c.moveTo(32, 0); c.lineTo(32, 64); c.moveTo(0, 32); c.lineTo(64, 32); c.stroke();
    });
    function pane(wd, hg, x, y, z, ry, op, grid) {
      var mat = new T.MeshBasicMaterial({ color: grid ? w.neon : 0xffffff, transparent: true, opacity: op, depthWrite: false, side: T.DoubleSide });
      if (grid) { var tx = meshTex.clone(); tx.wrapS = tx.wrapT = T.RepeatWrapping; tx.repeat.set(wd * 2.5, hg * 2.5); tx.needsUpdate = true; mat.map = tx; }
      var m = new T.Mesh(new T.PlaneGeometry(wd, hg), mat); m.position.set(x, y, z); m.rotation.y = ry; g.add(m); return m;
    }
    pane(10, 3, 0, 1.5, -10, 0, 0.16); pane(10, 1, 0, 3.5, -10, 0, 0.5, true);
    pane(10, 3, 0, 1.5, 10, 0, 0.04);
    [-5, 5].forEach(function (x) {
      pane(4, 3, x, 1.5, -8, Math.PI / 2, 0.14); pane(4, 3, x, 1.5, 8, Math.PI / 2, 0.06);
      pane(12, 3, x, 1.5, 0, Math.PI / 2, 0.3, true);
      tube(g, V(x, 3, -10), V(x, 3, 10), w.neon);
      tube(g, V(x, 0.04, -10), V(x, 0.04, 10), w.neon2, 0.05);
      [-10, -6, 6].forEach(function (z) { tube(g, V(x, 0, z), V(x, z === -10 ? 4 : 3, z), w.neon, 0.06); });
    });
    tube(g, V(-5, 3, -10), V(5, 3, -10), w.neon); tube(g, V(-5, 4, -10), V(5, 4, -10), w.neon2);
    tube(g, V(-5, 0.04, -10), V(5, 0.04, -10), w.neon2, 0.05); tube(g, V(-5, 0.04, 10), V(5, 0.04, 10), w.neon2, 0.05);

    // Red
    var netTex = canvasTex(256, 32, function (c, cw, ch) {
      c.fillStyle = 'rgba(10,10,25,.45)'; c.fillRect(0, 0, cw, ch);
      c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1;
      for (var x = 0; x <= cw; x += 8) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, ch); c.stroke(); }
      for (var y = 0; y <= ch; y += 8) { c.beginPath(); c.moveTo(0, y); c.lineTo(cw, y); c.stroke(); }
    });
    var net = new T.Mesh(new T.PlaneGeometry(10, 0.9), new T.MeshBasicMaterial({ map: netTex, transparent: true, side: T.DoubleSide, depthWrite: false }));
    net.position.set(0, 0.45, 0); g.add(net);
    var tape = new T.Mesh(new T.BoxGeometry(10, 0.07, 0.05), basic(0xffffff)); tape.position.set(0, 0.92, 0); g.add(tape);
    [-5, 5].forEach(function (x) { var p = box(0.12, 1.05, 0.12, w.neon); p.position.set(x, 0.52, 0); g.add(p); });

    // Torres de luz
    [[-8, -12], [8, -12], [-8, 12], [8, 12]].forEach(function (p) {
      var pole = box(0.25, 10, 0.25, '#2a2440'); pole.position.set(p[0], 5, p[1]); g.add(pole);
      var lamp = glowSprite(0xffffff, 7, 0.9); lamp.position.set(p[0], 10.2, p[1]); g.add(lamp);
      var lamp2 = glowSprite(w.neon, 12, 0.5); lamp2.position.copy(lamp.position); g.add(lamp2);
    });

    // Tribunas con hinchada de bloques
    var seats = [];
    function stand(x0, x1, z0, z1, rows, dirx, dirz) {
      for (var r = 0; r < rows; r++) {
        var ox = dirx * r * 1.1, oz = dirz * r * 1.1, hh = 0.9 + r * 0.8;
        var b = box(Math.abs(x1 - x0) + (dirz ? 0 : 0), hh, Math.abs(z1 - z0), r % 2 ? '#241a4d' : '#2f2263');
        b.position.set((x0 + x1) / 2 + ox, hh / 2, (z0 + z1) / 2 + oz); g.add(b);
        var along = dirx ? Math.abs(z1 - z0) : Math.abs(x1 - x0), n = Math.floor(along / 0.72);
        for (var i = 0; i < n; i++) {
          var tpos = -along / 2 + 0.36 + i * 0.72;
          seats.push(dirx ? [(x0 + x1) / 2 + ox, hh, (z0 + z1) / 2 + tpos] : [(x0 + x1) / 2 + tpos, hh, (z0 + z1) / 2 + oz]);
        }
      }
    }
    stand(-7.6, -6.6, -9, 9, 3, -1, 0); stand(6.6, 7.6, -9, 9, 3, 1, 0); stand(-6, 6, -13, -12, 4, 0, -1);
    var cols = ['#FF3D8B', '#22E1FF', '#FFE83A', '#7CFF4D', '#FF7A3D', '#B26BFF', '#FFFFFF', w.neon, w.neon2];
    crowd = new T.InstancedMesh(new T.BoxGeometry(0.46, 0.7, 0.4), new T.MeshLambertMaterial({ color: 0xffffff }), seats.length);
    crowdData = seats.map(function (s, i) {
      crowd.setColorAt(i, tmpC.set(cols[Math.floor(Math.random() * cols.length)]));
      return { x: s[0], y: s[1] + 0.35, z: s[2], ph: Math.random() * 6.28, sp: 4 + Math.random() * 5 };
    });
    crowd.instanceColor.needsUpdate = true; g.add(crowd);
  };

  /* ---------- Personajes de bloques ---------- */
  S.makeChar = function (look, opts) {
    opts = opts || {};
    var accent = opts.accent || '#FFB020';
    var g = new T.Group(), body = new T.Group(); g.add(body);
    var sh = new T.Mesh(new T.CircleGeometry(0.6, 20), basic(0x000000, 0.3)); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.012; g.add(sh);
    function leg(x) {
      var p = new T.Group(); p.position.set(x, 0.8, 0);
      var l = box(0.24, 0.8, 0.26, look.skin); l.position.y = -0.4; p.add(l);
      var s = box(0.27, 0.34, 0.29, look.shorts); s.position.y = -0.14; p.add(s);
      var sock = box(0.25, 0.14, 0.27, '#ffffff'); sock.position.y = -0.62; p.add(sock);
      var shoe = box(0.27, 0.15, 0.38, accent); shoe.position.set(0, -0.76, 0.05); p.add(shoe);
      body.add(p); return p;
    }
    var legL = leg(0.17), legR = leg(-0.17);
    var torso = box(0.7, 0.66, 0.38, look.shirt); torso.position.y = 1.12; body.add(torso);
    var chest = box(0.4, 0.5, 0.03, look.chest); chest.position.set(0, 1.14, 0.2); body.add(chest);
    var head = new T.Group(); head.position.y = 1.72; body.add(head);
    head.add(box(0.52, 0.5, 0.48, look.skin));
    [-0.13, 0.13].forEach(function (x) { var e = box(0.09, 0.11, 0.03, '#1b1b22'); e.position.set(x, 0.02, 0.245); head.add(e); });
    var mouth = box(0.16, 0.04, 0.03, '#7a3b2e'); mouth.position.set(0, -0.14, 0.245); head.add(mouth);
    var hair = box(0.56, 0.2, 0.52, look.hair); hair.position.y = 0.22; head.add(hair);
    var hairB = box(0.56, 0.34, 0.12, look.hair); hairB.position.set(0, 0.06, -0.22); head.add(hairB);
    if (look.hat === 'cap' || look.hat === 'visor') {
      var capC = look.hat === 'cap' ? '#EAD9B8' : '#F4EBDD';
      if (look.hat === 'cap') { var cap = box(0.58, 0.17, 0.54, capC); cap.position.y = 0.27; head.add(cap); }
      else { var vb = box(0.57, 0.09, 0.53, capC); vb.position.y = 0.14; head.add(vb); }
      var brim = box(0.44, 0.05, 0.28, capC); brim.position.set(0, 0.17, 0.37); head.add(brim);
    }
    if (look.hat === 'band') { var band = box(0.57, 0.1, 0.53, accent); band.position.y = 0.12; head.add(band); }
    if (look.hat === 'visor') { var pony = box(0.16, 0.56, 0.16, look.hair); pony.position.set(0, -0.08, -0.36); pony.rotation.x = -0.35; head.add(pony); }
    function arm(x) {
      var p = new T.Group(); p.position.set(x, 1.4, 0);
      var a = box(0.18, 0.62, 0.2, look.skin); a.position.y = -0.31; p.add(a);
      var sl = box(0.21, 0.24, 0.23, look.shirt); sl.position.y = -0.1; p.add(sl);
      var wr = box(0.2, 0.1, 0.22, accent); wr.position.y = -0.52; p.add(wr);
      body.add(p); return p;
    }
    var armL = arm(0.45), armR = arm(-0.45);
    var rk = new T.Group(); rk.position.y = -0.62; armR.add(rk);
    var hd = box(0.07, 0.34, 0.07, '#1c1c24'); hd.position.y = -0.1; rk.add(hd);
    var rh = new T.Mesh(new T.CylinderGeometry(0.24, 0.24, 0.06, 18), new T.MeshLambertMaterial({ color: accent }));
    rh.rotation.z = Math.PI / 2; rh.position.y = -0.48; rk.add(rh);
    var rh2 = new T.Mesh(new T.CylinderGeometry(0.16, 0.16, 0.07, 14), new T.MeshLambertMaterial({ color: '#2b2330' }));
    rh2.rotation.z = Math.PI / 2; rh2.position.y = -0.48; rk.add(rh2);
    var aura = glowSprite(accent, 3.4, 0); aura.position.y = 1.1; g.add(aura);
    var sc = opts.scale || 1; g.scale.setScalar(sc);
    scene.add(g);

    var ch = {
      g: g, x: 0, z: 0, tx: 0, tz: 0, speed: 6, facing: opts.facing || 0, mood: 'idle',
      swingT: -1, swingDur: 0.3, swingType: 'drive', run: 0, moving: 0, aura: 0, vx: 0, moodT: 0,
      place: function (x, z) { this.x = this.tx = x; this.z = this.tz = z; g.position.set(x, 0, z); },
      goTo: function (x, z) { this.tx = x; this.tz = z; },
      swing: function (type) { this.swingType = type || 'drive'; this.swingT = 0; this.swingDur = type === 'smash' ? 0.38 : 0.3; },
      setMood: function (m) { this.mood = m; this.moodT = 0; },
      remove: function () { scene.remove(g); g.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.map !== glowTex) o.material.dispose(); }); },
      update: function (dt, t) {
        var dx = this.tx - this.x, dz = this.tz - this.z, d = Math.sqrt(dx * dx + dz * dz), mv = 0;
        if (d > 0.02) {
          var st = Math.min(d, this.speed * dt); this.x += dx / d * st; this.z += dz / d * st;
          this.run += st * 4.2; mv = Math.min(1, d * 2); this.vx = dx / d * this.speed * mv;
        } else this.vx *= 0.8;
        this.moving += (mv - this.moving) * Math.min(1, dt * 12);
        g.position.set(this.x, 0, this.z); g.rotation.y = this.facing;
        var m = this.moving, sw = Math.sin(this.run);
        legL.rotation.x = sw * 0.95 * m; legR.rotation.x = -sw * 0.95 * m;
        var jump = 0, by = Math.abs(Math.sin(t * 5 + this.x)) * 0.05 * (1 - m);
        var lean = 0.14, twist = 0, rz = 0.22, rx = -0.95, lx = -sw * 0.7 * m - 0.2, hx = 0;
        this.moodT += dt;
        if (this.mood === 'happy') { jump = Math.abs(Math.sin(this.moodT * 9)) * 0.55; rx = -3.0; lx = -3.0; lean = 0; twist = this.moodT < 0.7 ? this.moodT * 9 : 0; }
        else if (this.mood === 'sad') { lean = 0.32; hx = 0.5; rx = 0.1; lx = 0.1; }
        if (this.swingT >= 0) {
          this.swingT += dt; var p = Math.min(1, this.swingT / this.swingDur), e = 1 - Math.pow(1 - p, 3);
          if (this.swingType === 'smash') { rx = -3.5 + e * 3.1; jump = Math.sin(p * Math.PI) * 0.8; lean = 0.1 + e * 0.35; lx = -1.6 + e * 1.4; }
          else if (this.swingType === 'lob') { rx = 0.5 - e * 3.2; twist = 0.4 - e * 0.8; }
          else { rx = 0.9 - e * 3.2; rz = 0.7 - e * 0.5; twist = 0.75 - e * 1.5; }
          if (p >= 1) this.swingT = -1;
        }
        armR.rotation.x = rx; armR.rotation.z = -rz; armL.rotation.x = lx; armL.rotation.z = 0.12;
        head.rotation.x = hx;
        body.position.y = by + jump; body.rotation.x = lean; body.rotation.y = twist;
        body.rotation.z = -this.vx * 0.02 * (this.facing ? -1 : 1);
        sh.scale.setScalar(1 - Math.min(0.5, jump * 0.5));
        aura.material.opacity += (this.aura - aura.material.opacity) * Math.min(1, dt * 6);
        aura.scale.setScalar(3.2 + Math.sin(t * 8) * 0.4);
      }
    };
    return ch;
  };

  /* ---------- Pelota y estela ---------- */
  var ball, ballGlow, ballShadow, trail = [], hist = [];
  function buildBall() {
    ball = new T.Mesh(new T.SphereGeometry(0.17, 18, 14), basic('#E4FF4A')); scene.add(ball);
    ballGlow = glowSprite('#D8FF3A', 1.3, 0.8); scene.add(ballGlow);
    ballShadow = new T.Mesh(new T.CircleGeometry(0.22, 16), basic(0x000000, 0.35)); ballShadow.rotation.x = -Math.PI / 2; scene.add(ballShadow);
    for (var i = 0; i < 20; i++) { var s = glowSprite('#D8FF3A', 0.5, 0); scene.add(s); trail.push(s); }
    S.ball = { visible: false, color: new T.Color('#D8FF3A'), power: 0 };
  }
  S.setBall = function (p, visible) {
    S.ball.visible = visible;
    ball.visible = ballGlow.visible = ballShadow.visible = visible;
    if (!visible) { hist.length = 0; return; }
    ball.position.set(p.x, p.y, p.z); ballGlow.position.copy(ball.position);
    ballShadow.position.set(p.x, 0.015, p.z);
    var k = 1 + p.y * 0.25; ballShadow.scale.setScalar(k); ballShadow.material.opacity = Math.max(0.08, 0.38 - p.y * 0.05);
    hist.unshift(p.x, p.y, p.z); if (hist.length > 60) hist.length = 60;
  };
  S.setBallStyle = function (color, power) { S.ball.color.set(color); S.ball.power = power; ballGlow.material.color.set(color); ball.material.color.set(power > 1 ? color : '#E4FF4A'); };
  function updateTrail() {
    var pw = S.ball.power;
    for (var i = 0; i < trail.length; i++) {
      var s = trail[i], k = i * 3;
      if (!S.ball.visible || k + 2 >= hist.length) { s.material.opacity = 0; continue; }
      s.position.set(hist[k], hist[k + 1], hist[k + 2]);
      var f = 1 - i / trail.length; s.material.color.copy(S.ball.color);
      s.material.opacity = f * (0.25 + pw * 0.3); s.scale.setScalar((0.35 + pw * 0.45) * (0.4 + f));
    }
    ballGlow.scale.setScalar(1.2 + pw * 0.9 + Math.sin(time * 20) * 0.1 * pw);
  }

  /* ---------- Partículas, ondas y confeti ---------- */
  function Pool(n, additive, size) {
    this.n = n; this.i = 0; this.additive = additive;
    this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 3); this.base = new Float32Array(n * 3);
    this.vel = new Float32Array(n * 3); this.life = new Float32Array(n); this.max = new Float32Array(n); this.grav = new Float32Array(n);
    for (var i = 0; i < n; i++) this.pos[i * 3 + 1] = -999;
    var geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(this.pos, 3)); geo.setAttribute('color', new T.BufferAttribute(this.col, 3));
    var mat = new T.PointsMaterial({ size: size, vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true });
    if (additive) { mat.map = glowTex; mat.blending = T.AdditiveBlending; }
    this.pts = new T.Points(geo, mat); this.pts.frustumCulled = false; scene.add(this.pts);
  }
  Pool.prototype.emit = function (p, color, count, speed, life, grav, up) {
    tmpC.set(color);
    for (var c = 0; c < count; c++) {
      var i = this.i; this.i = (this.i + 1) % this.n; var k = i * 3;
      var th = Math.random() * 6.283, ph = Math.acos(Math.random() * 2 - 1), sp = speed * (0.35 + Math.random() * 0.65);
      this.pos[k] = p.x; this.pos[k + 1] = p.y; this.pos[k + 2] = p.z;
      this.vel[k] = Math.sin(ph) * Math.cos(th) * sp; this.vel[k + 1] = Math.abs(Math.cos(ph)) * sp * (up || 1) + (up ? sp * 0.3 : 0) - (up ? 0 : sp * 0.3); this.vel[k + 2] = Math.sin(ph) * Math.sin(th) * sp;
      var j = 0.75 + Math.random() * 0.5;
      this.base[k] = tmpC.r * j; this.base[k + 1] = tmpC.g * j; this.base[k + 2] = tmpC.b * j;
      this.life[i] = this.max[i] = life * (0.6 + Math.random() * 0.4); this.grav[i] = grav;
    }
  };
  Pool.prototype.update = function (dt) {
    for (var i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue;
      var k = i * 3; this.life[i] -= dt;
      if (this.life[i] <= 0 || this.pos[k + 1] < 0) { this.life[i] = 0; this.pos[k + 1] = -999; continue; }
      this.vel[k + 1] -= this.grav[i] * dt;
      if (!this.additive) { this.vel[k] *= 0.985; this.vel[k + 2] *= 0.985; if (this.vel[k + 1] < -2.2) this.vel[k + 1] = -2.2; }
      this.pos[k] += this.vel[k] * dt; this.pos[k + 1] += this.vel[k + 1] * dt; this.pos[k + 2] += this.vel[k + 2] * dt;
      var f = this.additive ? this.life[i] / this.max[i] : 1;
      this.col[k] = this.base[k] * f; this.col[k + 1] = this.base[k + 1] * f; this.col[k + 2] = this.base[k + 2] * f;
    }
    this.pts.geometry.attributes.position.needsUpdate = true; this.pts.geometry.attributes.color.needsUpdate = true;
  };
  var sparks, confetti, shocks = [];
  function buildFx() {
    sparks = new Pool(900, true, 0.42); confetti = new Pool(500, false, 0.2);
    for (var i = 0; i < 6; i++) {
      var m = new T.Mesh(new T.RingGeometry(0.78, 1, 40), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending }));
      m.userData.t = 1; scene.add(m); shocks.push(m);
    }
  }
  S.burst = function (p, color, count, speed, life) { sparks.emit(p, color, count || 20, speed || 6, life || 0.6, 9, 0); };
  S.fountain = function (p, color, count, speed) { sparks.emit(p, color, count || 30, speed || 8, 1.0, 10, 1.2); };
  var CONF = ['#FF3D8B', '#22E1FF', '#FFE83A', '#7CFF4D', '#FF7A3D', '#B26BFF', '#FFFFFF'];
  S.confetti = function (n) {
    for (var i = 0; i < (n || 160); i++) {
      tmp.set((Math.random() - 0.5) * 14, 7 + Math.random() * 6, 2 + Math.random() * 10);
      confetti.emit(tmp, CONF[i % CONF.length], 1, 3, 5, 3, 0);
    }
  };
  S.firework = function () {
    tmp.set((Math.random() - 0.5) * 24, 9 + Math.random() * 8, -12 - Math.random() * 10);
    sparks.emit(tmp, CONF[Math.floor(Math.random() * CONF.length)], 70, 11, 1.4, 5, 0);
  };
  S.shock = function (p, color, flat) {
    var m = shocks.shift(); shocks.push(m);
    m.position.set(p.x, flat ? 0.05 : p.y, p.z); m.material.color.set(color); m.userData.t = 0; m.userData.flat = !!flat;
  };

  /* ---------- Aro de timing, blancos y lanzapelotas ---------- */
  var ringBase, ringClose, ringBeam;
  function buildRing() {
    ringBase = new T.Mesh(new T.RingGeometry(0.5, 0.64, 40), basic(0xffffff, 0.85)); ringBase.rotation.x = -Math.PI / 2;
    ringClose = new T.Mesh(new T.RingGeometry(0.9, 1.0, 48), basic(0xffffff, 0.95)); ringClose.rotation.x = -Math.PI / 2;
    ringBeam = glowSprite('#D8FF3A', 2.4, 0.0);
    ringBase.visible = ringClose.visible = ringBeam.visible = false;
    scene.add(ringBase); scene.add(ringClose); scene.add(ringBeam);
  }
  // frac: 1 = falta mucho, 0 = momento ideal
  S.ring = function (p, frac, color) {
    if (!p) { ringBase.visible = ringClose.visible = ringBeam.visible = false; return; }
    ringBase.visible = ringClose.visible = ringBeam.visible = true;
    ringBase.position.set(p.x, 0.04, p.z); ringClose.position.set(p.x, 0.05, p.z); ringBeam.position.set(p.x, 0.3, p.z);
    var f = Math.max(0, Math.min(1, frac)), near = f < 0.22;
    ringClose.scale.setScalar(0.62 + f * 2.2);
    ringClose.material.color.set(near ? '#D8FF3A' : (color || '#ffffff')); ringBase.material.color.set(near ? '#D8FF3A' : '#ffffff');
    ringBeam.material.opacity = near ? 0.9 : 0.25; ringBeam.material.color.set(near ? '#D8FF3A' : (color || '#ffffff'));
  };
  var targets = [];
  function buildTargets() {
    var tx = canvasTex(128, 128, function (c) {
      var cols = ['#FF3D8B', '#ffffff', '#FF3D8B', '#ffffff', '#FFE83A'];
      for (var i = 0; i < 5; i++) { c.fillStyle = cols[i]; c.beginPath(); c.arc(64, 64, 62 - i * 12, 0, 7); c.fill(); }
    });
    for (var i = 0; i < 3; i++) {
      var m = new T.Mesh(new T.CircleGeometry(1.25, 32), new T.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.y = 0.03; m.visible = false; scene.add(m);
      var gl = glowSprite('#FF3D8B', 4, 0.5); gl.visible = false; scene.add(gl);
      targets.push({ m: m, gl: gl });
    }
  }
  S.setTarget = function (i, p) {
    var t = targets[i]; t.m.visible = t.gl.visible = !!p;
    if (p) { t.m.position.set(p.x, 0.03, p.z); t.gl.position.set(p.x, 0.4, p.z); }
  };
  var machine;
  function buildMachine() {
    machine = new T.Group();
    var b = box(1.1, 0.9, 1.1, '#FF3D8B'); b.position.y = 0.45; machine.add(b);
    var c = new T.Mesh(new T.CylinderGeometry(0.28, 0.34, 1.1, 14), new T.MeshLambertMaterial({ color: '#22E1FF' }));
    c.rotation.x = Math.PI / 2.6; c.position.set(0, 1.15, 0.35); machine.add(c);
    var e = box(0.5, 0.14, 0.05, '#FFE83A'); e.position.set(0, 0.55, 0.56); machine.add(e);
    machine.position.set(0, 0, -8.6); machine.visible = false; scene.add(machine);
  }
  S.showMachine = function (v) { machine.visible = v; };

  /* ---------- Cámara ---------- */
  S.shake = function (a) { shake = Math.max(shake, a); };
  S.punch = function (a) { punch = Math.max(punch, a); };
  S.project = function (p) {
    tmp.set(p.x, p.y, p.z).project(camera);
    return { x: (tmp.x * 0.5 + 0.5) * W, y: (-tmp.y * 0.5 + 0.5) * H, behind: tmp.z > 1 };
  };

  S.render = function (dt, gdt) {
    time += dt;
    S.excite = Math.max(0, S.excite - dt * 0.6);
    if (crowd) {
      var amp = 0.06 + S.excite * 0.55;
      for (var i = 0; i < crowdData.length; i++) {
        var c = crowdData[i];
        dummy.position.set(c.x, c.y + Math.abs(Math.sin(time * c.sp * (1 + S.excite) + c.ph)) * amp, c.z);
        dummy.updateMatrix(); crowd.setMatrixAt(i, dummy.matrix);
      }
      crowd.instanceMatrix.needsUpdate = true;
    }
    sparks.update(gdt); confetti.update(dt); updateTrail();
    for (var s = 0; s < shocks.length; s++) {
      var m = shocks[s], u = m.userData;
      if (u.t >= 1) { m.material.opacity = 0; continue; }
      u.t += dt * 2.6; var sc = 0.3 + u.t * 3.2; m.scale.setScalar(sc); m.material.opacity = Math.max(0, 1 - u.t);
      if (u.flat) m.rotation.set(-Math.PI / 2, 0, 0); else m.lookAt(camera.position);
    }
    for (var k = 0; k < targets.length; k++) if (targets[k].m.visible) { var ps = 1 + Math.sin(time * 5 + k) * 0.07; targets[k].m.scale.setScalar(ps); }

    shake *= Math.pow(0.0015, dt); punch *= Math.pow(0.002, dt);
    var sx = (Math.random() - 0.5) * shake, sy = (Math.random() - 0.5) * shake;
    if (S.mode === 'menu') {
      var a = Math.sin(time * 0.16) * 0.55, r = camBase.z * 0.92;
      camera.position.set(Math.sin(a) * r, camBase.y * 1.25 + Math.sin(time * 0.3) * 0.5, Math.cos(a) * r);
      camera.lookAt(0, 1.2, -1.5);
    } else {
      camera.position.set(camBase.x + S.followX * 0.14 + sx, camBase.y + sy, camBase.z);
      camera.lookAt(camLook.x + S.followX * 0.22 + sx, camLook.y + sy, camLook.z);
    }
    var fv = baseFov - punch * 7;
    if (Math.abs(camera.fov - fv) > 0.01) { camera.fov = fv; camera.updateProjectionMatrix(); }
    renderer.render(scene, camera);
  };
})();
