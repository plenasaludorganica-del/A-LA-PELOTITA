/* Tiras visuales: entrenamiento visual y cognitivo con tiras largas en la pantalla (solo PRO).
   Es independiente de todo: no suma puntos, ni IQ, ni Copa, ni ranking. Solo marca qué tarjetas hiciste (en el dispositivo).
   Basado en ejercicios de entrenamiento visual deportivo y de rehabilitación visual/vestibular conocidos:
   movimientos sacádicos, seguimiento, estabilización de la mirada (VOR x1 y x2), enfoque cerca-lejos (tabla de Hart),
   convergencia (cuerda de Brock), visión periférica (tabla de Schulte), control inhibitorio (Stroop, Go/No-Go),
   memoria visual y doble tarea. */
(function () {
  'use strict';
  var PP = window.PP, U = null, DB = PP.DB;
  var V = PP.Vision = {};
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* ---------- Tiras ---------- */
  var COLORS = [{ n: 'rojo', c: '#E53935' }, { n: 'azul', c: '#1E5BD8' }, { n: 'amarillo', c: '#FFC400' }, { n: 'verde', c: '#2E9E44' }];
  var NUM = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
  // Letras de Sloan: las que usan los oculistas en las tablas de agudeza visual (se distinguen igual de bien entre sí)
  var SLOAN = ['C', 'D', 'H', 'K', 'N', 'O', 'R', 'S', 'V', 'Z'];
  var ARROWS = [{ a: 0, n: 'arriba' }, { a: 45, n: 'arriba a la derecha' }, { a: 90, n: 'derecha' }, { a: 135, n: 'abajo a la derecha' },
    { a: 180, n: 'abajo' }, { a: 225, n: 'abajo a la izquierda' }, { a: 270, n: 'izquierda' }, { a: 315, n: 'arriba a la izquierda' }];
  var SYMS = [{ s: '★', n: 'estrella' }, { s: '●', n: 'círculo' }, { s: '▲', n: 'triángulo' }, { s: '■', n: 'cuadrado' }, { s: '◆', n: 'rombo' },
    { s: '♥', n: 'corazón' }, { s: '♣', n: 'trébol' }, { s: '♠', n: 'pica' }, { s: '✚', n: 'cruz' }, { s: '☾', n: 'luna' }, { s: '✿', n: 'flor' }, { s: '♪', n: 'nota' }];
  V.TYPES = {
    num: 'Números en hexágonos', stroop: 'Palabras de colores', flechas: 'Flechas', simbolos: 'Símbolos',
    letras: 'Letras', precision: 'Letras que se achican', mixta: 'Mixta', tabla: 'Tabla del 1 al 25'
  };
  var CELLS = 16;
  function cell(type, i) {
    var col = pick(COLORS);
    if (type === 'mixta') type = pick(['num', 'stroop', 'flechas', 'simbolos', 'letras']);
    if (type === 'num') { var d = rnd(10); return { h: '<b class="hex" style="background:' + col.c + ';color:' + (col.n === 'amarillo' ? '#1b1033' : '#fff') + '">' + d + '</b>', say: col.n + ' ' + NUM[d] }; }
    if (type === 'stroop') {
      var w = pick(COLORS), ink = Math.random() < 0.8 ? pick(COLORS.filter(function (x) { return x !== w; })) : w;
      return { h: '<b class="word" style="color:' + ink.c + '">' + w.n.toUpperCase() + '</b>', say: 'palabra ' + w.n + ', color ' + ink.n };
    }
    if (type === 'flechas') { var ar = pick(ARROWS); return { h: '<b class="arr" style="transform:rotate(' + (ar.a - 90) + 'deg);color:' + col.c + '">➜</b>', say: 'flecha ' + ar.n }; }   // ➜ apunta a la derecha
    if (type === 'simbolos') { var sy = pick(SYMS); return { h: '<b class="sym" style="color:' + col.c + '">' + sy.s + '︎</b>', say: sy.n + ' ' + col.n }; }
    if (type === 'letras') { var l = pick(SLOAN); return { h: '<b class="let">' + l + '</b>', say: 'letra ' + l }; }
    if (type === 'precision') { var p = pick(SLOAN), sz = Math.max(9, Math.round(34 - i * 1.7)); return { h: '<b class="let" style="font-size:' + sz + 'px">' + p + '</b>', say: 'letra ' + p }; }
    return { h: '', say: '' };
  }
  function makeStrip(type) {
    if (type === 'tabla') { var n = shuffle(Array.from({ length: 25 }, function (_, i) { return i + 1; })); return { type: type, cells: n.map(function (x) { return { h: '<b>' + x + '</b>', say: 'el ' + x }; }) }; }
    var cs = []; for (var i = 0; i < CELLS; i++) cs.push(cell(type, i)); return { type: type, cells: cs };
  }
  function stripHtml(s, cls) {
    if (s.type === 'tabla') return '<div class="vgrid">' + s.cells.map(function (c) { return '<div>' + c.h + '</div>'; }).join('') + '</div>';
    return '<div class="vstrip ' + (cls || '') + '"><div class="vtag">' + esc(V.TYPES[s.type]) + '</div>' + s.cells.map(function (c) { return '<div class="vc">' + c.h + '</div>'; }).join('') + '</div>';
  }

  /* ---------- Tarjetas ---------- */
  var TAGS = { solo: 'Solo', pelota: 'Con pelotita', parche: 'Un ojo tapado', ojos: 'Ojos cerrados', compa: 'Con compañero', equi: 'Equilibrio', metro: 'Metrónomo', voz: 'Llamadas por voz' };
  var CATS = [
    ['fij', 'Precisión de la mirada', '#22E1FF'], ['sac', 'Saltos de mirada', '#7CFF4D'], ['seg', 'Seguimiento', '#FFD23A'],
    ['vor', 'Mirada firme con la cabeza en movimiento', '#FF7A3D'], ['foco', 'Enfoque cerca y lejos', '#C28BFF'], ['peri', 'Visión periférica', '#22E1FF'],
    ['inh', 'Control de impulsos', '#FF3D8B'], ['mem', 'Memoria visual', '#FFD23A'], ['dual', 'Doble tarea con pelotita', '#7CFF4D'],
    ['mono', 'Con un ojo tapado', '#FF7A3D'], ['equi', 'Equilibrio y visión', '#C28BFF'], ['compa', 'Con compañero', '#FF3D8B'], ['rut', 'Rutinas armadas', '#FFD23A']
  ];
  // c: categoría · lv: 1 fácil, 2 medio, 3 difícil · s: tira {t: tipo, n: cantidad, bg: 'liso'|'mov', dot, metro, voz, flash}
  var C = [
    // Precisión de la mirada
    { c: 'fij', lv: 1, t: 'Mirada quieta', tags: ['solo'], s: { t: 'num', n: 1, bg: 'liso' }, time: '3 × 20 segundos',
      para: 'Sostener la mirada clavada en un punto sin que se escape.',
      como: ['Celular a la distancia del brazo, a la altura de los ojos.', 'Elegí un hexágono del medio y miralo fijo 20 segundos.', 'Si la mirada se va a otro lado, volvé al mismo hexágono.', 'Descansá 10 segundos y repetí con otro.'],
      prog: 'Pasá al fondo en movimiento: la mirada tiene que quedarse en el hexágono aunque todo se mueva alrededor.',
      ben: 'Es la base para mirar la pelota hasta el impacto sin levantar la vista antes de tiempo.' },
    { c: 'fij', lv: 1, t: 'Escalera', tags: ['solo'], s: { t: 'num', n: 1, bg: 'liso' }, time: '3 vueltas',
      para: 'Leer en orden y con precisión, sin saltear casillas.',
      como: ['Leé en voz alta cada casilla de arriba hacia abajo: color y número ("azul 4").', 'Después leela de abajo hacia arriba.', 'La cabeza queda quieta: se mueven solo los ojos.', 'Tocá "Nueva tira" y repetí.'],
      prog: 'Usá el cronómetro y tratá de bajar el tiempo sin equivocarte.',
      ben: 'Ordena la mirada para leer la jugada de forma prolija y rápida.' },
    { c: 'fij', lv: 2, t: 'Detalle chico', tags: ['solo'], s: { t: 'precision', n: 1, bg: 'liso' }, time: '2 series',
      para: 'Afinar la precisión con objetivos cada vez más chicos.',
      como: ['Las letras se achican de arriba hacia abajo.', 'Apoyá el celular en un lugar fijo y parate a 1 metro.', 'Leé de arriba abajo hasta la última letra que puedas leer sin entrecerrar los ojos.', 'Anotá hasta dónde llegaste.'],
      prog: 'Alejate medio paso cada vez. Hacelo también con el fondo en movimiento.',
      ben: 'Ayuda a captar detalles chicos: el efecto de la pelota y la posición de la paleta del rival.' },
    { c: 'fij', lv: 2, t: 'Cazador de color', tags: ['solo'], s: { t: 'num', n: 1, bg: 'liso' }, time: '4 rondas',
      para: 'Buscar rápido un solo tipo de objetivo entre muchos.',
      como: ['Antes de mirar, elegí un color (por ejemplo, azul).', 'Recorré la tira de arriba abajo y decí solo los números de ese color.', 'Cada ronda, tocá "Nueva tira" y cambiá de color.'],
      prog: 'Buscá dos cosas a la vez: "azules pares" o "rojos mayores que 5".',
      ben: 'Entrena la búsqueda visual: encontrar rápido lo importante (la pelota, el hueco) entre todo lo que pasa.' },
    // Saltos de mirada (sacádicos)
    { c: 'sac', lv: 1, t: 'Salto izquierda y derecha', tags: ['solo'], s: { t: 'num', n: 2, bg: 'liso' }, time: '3 × 30 segundos',
      para: 'Mover los ojos rápido y exacto de un objetivo a otro (movimientos sacádicos).',
      como: ['Celular a la distancia del brazo, con dos tiras en los bordes.', 'Leé la primera casilla de la tira izquierda, después la primera de la derecha, la segunda de la izquierda, la segunda de la derecha, y así.', 'La cabeza no se mueve: solo los ojos.'],
      prog: 'Más rápido, o con el fondo en movimiento.',
      ben: 'En la cancha la mirada salta todo el tiempo entre la pelota, el rival y tu compañero.' },
    { c: 'sac', lv: 2, t: 'Saltos al ritmo', tags: ['solo', 'metro'], s: { t: 'num', n: 2, bg: 'liso', metro: 60 }, time: '3 × 30 segundos',
      para: 'Saltar con la mirada a un ritmo parejo.',
      como: ['Prendé el metrónomo en 60.', 'En cada "bip", un salto: izquierda, derecha, izquierda…', 'Si te atrasás, no aceleres: esperá el próximo bip.'],
      prog: 'Subí de a 10: 70, 80, 90, 100.',
      ben: 'El ritmo ayuda a sincronizar la mirada con el golpe.' },
    { c: 'sac', lv: 2, t: 'Zigzag', tags: ['solo'], s: { t: 'flechas', n: 2, bg: 'liso' }, time: '3 vueltas',
      para: 'Saltos en diagonal, más difíciles que los horizontales.',
      como: ['Leé la casilla 1 de la izquierda, la 2 de la derecha, la 3 de la izquierda, y así hasta abajo.', 'En las flechas, decí hacia dónde apunta cada una.', 'Después subí haciendo el zigzag al revés.'],
      prog: 'Agregá el metrónomo, o decí la dirección contraria a la flecha.',
      ben: 'La pelota casi nunca viene derecha: los saltos en diagonal se parecen más al juego.' },
    { c: 'sac', lv: 2, t: 'Saltos grandes y chicos', tags: ['solo'], s: { t: 'letras', n: 2, bg: 'liso' }, time: '2 × 30 segundos por distancia',
      para: 'Practicar saltos de distintos tamaños.',
      como: ['Con el celular cerca de la cara (30 centímetros), los saltos entre las tiras son grandes.', 'Con el celular lejos (brazo estirado o apoyado a 1 metro), los saltos son chicos y piden más precisión.', 'Hacé la misma lectura izquierda-derecha a las dos distancias.'],
      prog: 'Alterná: una serie cerca, una lejos, sin parar entre medio.',
      ben: 'En pádel mirás cosas cerca (tu golpe) y lejos (el fondo de la cancha rival).' },
    { c: 'sac', lv: 1, t: 'Arriba y abajo', tags: ['solo'], s: { t: 'num', n: 1, bg: 'liso' }, time: '3 vueltas',
      para: 'Saltos verticales de la mirada.',
      como: ['Leé la primera casilla y después la última.', 'Seguí con la segunda y la anteúltima, y así hasta encontrarte en el medio.', 'Cabeza quieta.'],
      prog: 'Más rápido, o con el metrónomo.',
      ben: 'Sirve para los globos y las pelotas altas: la mirada sube y baja rápido.' },
    // Seguimiento
    { c: 'seg', lv: 1, t: 'Seguimiento lento', tags: ['solo'], s: { t: 'simbolos', n: 1, bg: 'liso' }, time: '3 × 30 segundos',
      para: 'Seguir algo que se mueve sin perderlo (seguimiento suave).',
      como: ['Sostené el celular con el brazo estirado.', 'Mirá un símbolo y mové el celular despacio de izquierda a derecha.', 'La cabeza queda quieta: lo siguen solo los ojos.', 'El símbolo tiene que verse nítido todo el tiempo.'],
      prog: 'Movelo arriba y abajo, y después en diagonal.',
      ben: 'Es lo que hacés al seguir la pelota desde la paleta del rival hasta la tuya.' },
    { c: 'seg', lv: 2, t: 'Ocho acostado', tags: ['solo'], s: { t: 'simbolos', n: 1, bg: 'liso' }, time: '2 × 30 segundos por lado',
      para: 'Seguimiento en curvas.',
      como: ['Mové el celular dibujando un 8 acostado (∞) grande delante tuyo.', 'Seguí siempre el mismo símbolo con los ojos, con la cabeza quieta.', 'Cambiá el sentido a mitad de la serie.'],
      prog: 'Que un compañero mueva el celular sin avisarte para dónde.',
      ben: 'La pelota en pádel hace curvas: pique, vidrio, rebote.' },
    { c: 'seg', lv: 2, t: 'Seguí y leé', tags: ['solo'], s: { t: 'num', n: 1, bg: 'liso' }, time: '3 × 30 segundos',
      para: 'Seguir algo que se mueve y además leerlo.',
      como: ['Mové el celular despacio en cualquier dirección.', 'Mientras se mueve, leé las casillas de arriba hacia abajo.', 'Si se borronea, movelo más lento.'],
      prog: 'Más rápido, o con el fondo en movimiento.',
      ben: 'Leer la pelota en movimiento: ver para dónde gira y cuánto pica.' },
    { c: 'seg', lv: 2, t: 'Pelotita al aire', tags: ['pelota'], s: { t: 'num', n: 1, bg: 'liso' }, time: '20 tiros',
      para: 'Seguir la pelota de verdad y volver a un objetivo fijo.',
      como: ['Apoyá el celular a la altura de los ojos.', 'Tirá la pelotita hacia arriba, seguila con la mirada y atrapala.', 'Apenas la atrapás, leé la próxima casilla de la tira.'],
      prog: 'Tirala más alto, o atrapala con la mano no hábil.',
      ben: 'Así es el juego: seguir la pelota y enseguida mirar al rival.' },
    // Mirada firme (estabilización, VOR)
    { c: 'vor', lv: 1, t: 'La cabeza dice que no', tags: ['solo'], s: { t: 'letras', n: 1, bg: 'liso' }, time: '3 × 30 segundos',
      para: 'Mantener la vista nítida mientras la cabeza se mueve (estabilización de la mirada, ejercicio VOR x1).',
      como: ['Celular a la distancia del brazo, quieto.', 'Mirá fijo una letra.', 'Girá la cabeza de lado a lado, como diciendo que no, sin dejar de mirar la letra.', 'La letra tiene que seguir nítida. Si se borronea, girá más lento.'],
      prog: 'Más rápido, siempre que la letra se siga leyendo.',
      ben: 'Corrés y frenás con la cabeza en movimiento, y la pelota se tiene que seguir viendo clara.' },
    { c: 'vor', lv: 1, t: 'La cabeza dice que sí', tags: ['solo'], s: { t: 'letras', n: 1, bg: 'liso' }, time: '3 × 30 segundos',
      para: 'Lo mismo, con movimiento de arriba hacia abajo.',
      como: ['Mirá fijo una letra.', 'Mové la cabeza arriba y abajo, como diciendo que sí.', 'La letra tiene que seguir nítida.'],
      prog: 'Más rápido, o con el fondo en movimiento.',
      ben: 'Sirve para las bandejas y los remates: la cabeza sube y baja mientras mirás la pelota.' },
    { c: 'vor', lv: 2, t: 'Mirada firme con ritmo', tags: ['solo', 'metro'], s: { t: 'letras', n: 1, bg: 'liso', metro: 120 }, time: '2 × 1 minuto',
      para: 'Estabilizar la mirada a una velocidad pareja (en rehabilitación se usa 2 veces por segundo con metrónomo).',
      como: ['Metrónomo en 120 (2 bips por segundo).', 'Un giro de cabeza en cada bip, sin dejar de mirar la letra.', 'Si la letra se borronea, bajá el metrónomo a 90.'],
      prog: 'Subí a 140 o 160 con la letra siempre nítida.',
      ben: 'Ver bien mientras te movés rápido.' },
    { c: 'vor', lv: 3, t: 'Para lados opuestos', tags: ['solo'], s: { t: 'letras', n: 1, bg: 'liso' }, time: '2 × 30 segundos',
      para: 'Versión difícil de la estabilización (VOR x2): el objetivo y la cabeza se mueven en direcciones contrarias.',
      como: ['Sostené el celular con el brazo estirado y mirá una letra.', 'Mové el celular hacia la derecha mientras la cabeza gira hacia la izquierda, y al revés.', 'La letra tiene que seguir nítida.', 'Empezá muy despacio.'],
      prog: 'Más rápido, y después arriba y abajo.',
      ben: 'Es la situación más exigente: vos y la pelota moviéndose en direcciones distintas.' },
    { c: 'vor', lv: 2, t: 'Caminando hacia la tira', tags: ['solo'], s: { t: 'num', n: 1, bg: 'liso' }, time: '4 idas y vueltas',
      para: 'Leer mientras el cuerpo se mueve.',
      como: ['Apoyá el celular a la altura de los ojos, a 3 o 4 metros.', 'Caminá hacia el celular leyendo cada casilla en voz alta.', 'Volvé caminando hacia atrás, despacio y con cuidado.'],
      prog: 'Caminá de costado (paso lateral, como en la cancha).',
      ben: 'En la cancha casi nunca mirás estando quieto.' },
    // Enfoque cerca y lejos
    { c: 'foco', lv: 1, t: 'Cerca y lejos', tags: ['solo'], s: { t: 'letras', n: 1, bg: 'liso' }, time: '2 × 1 minuto',
      para: 'Cambiar el enfoque rápido entre cerca y lejos (como la tabla de Hart de los ópticos).',
      como: ['Sostené el celular cerca, a unos 40 centímetros.', 'Elegí un cartel o una letra grande lejos (3 metros o más).', 'Leé una letra de la tira y enseguida leé lo de lejos. Volvé a la tira con la letra siguiente.', 'Cada cosa tiene que verse nítida antes de pasar a la otra.'],
      prog: 'Acercá más el celular, alejá el objetivo lejano o seguí el ritmo del metrónomo.',
      ben: 'Pasás de mirar tu golpe a mirar el fondo de la cancha rival en un instante.' },
    { c: 'foco', lv: 2, t: 'Acercar hasta ver doble', tags: ['solo'], s: { t: 'letras', n: 1, bg: 'liso' }, time: '10 repeticiones',
      para: 'Que los dos ojos trabajen juntos de cerca (convergencia).',
      como: ['Mirá una letra con el celular a la distancia del brazo.', 'Acercalo despacio hacia la nariz sin dejar de mirarla.', 'Cuando la letra se vea doble, pará y alejalo hasta que vuelva a verse una sola.', 'Repetí.'],
      prog: 'Tratá de acercarlo un poco más cada día sin que se duplique.',
      ben: 'Ver la pelota bien cerca del cuerpo, en las voleas y las pelotas pegadas al vidrio.' },
    { c: 'foco', lv: 2, t: 'Cuerda de Brock', tags: ['solo'], s: null, time: '3 × 1 minuto',
      para: 'Coordinar los dos ojos a distintas distancias. La usan los ópticos en terapia visual.',
      como: ['Necesitás un cordón de unos 3 metros con 3 cuentas o botones de colores.', 'Atá una punta a un picaporte y sostené la otra contra la punta de la nariz.', 'Poné una cuenta cerca (15 centímetros), otra al medio y otra lejos.', 'Mirá la cuenta cercana: tenés que ver una sola cuenta y dos cordones que se cruzan en ella, formando una X.', 'Pasá la mirada a la del medio y a la lejana, y volvé.'],
      prog: 'Acercá la cuenta más cercana a la nariz.',
      ben: 'Mejor cálculo de la distancia y la profundidad de la pelota.' },
    { c: 'foco', lv: 2, t: '¿Dónde está la pelotita?', tags: ['pelota', 'compa'], s: { t: 'num', n: 1, bg: 'liso' }, time: '20 tiros',
      para: 'Calcular la distancia mientras la cabeza está ocupada.',
      como: ['Tu compañero se para delante tuyo y sostiene el celular.', 'Te tira la pelotita a distintas distancias y alturas.', 'Antes de atraparla, decí la casilla que él te marca con el dedo.'],
      prog: 'Que te la tire con pique, o más rápido.',
      ben: 'Calcular el pique y la distancia mientras pensás qué hacer.' },
    // Visión periférica
    { c: 'peri', lv: 1, t: 'Centro fijo', tags: ['solo'], s: { t: 'num', n: 1, bg: 'liso', dot: true }, time: '3 rondas',
      para: 'Ver con el rabillo del ojo sin mover la mirada (visión periférica).',
      como: ['Mirá fijo el punto rojo del medio.', 'Sin mover los ojos, decí el color de la casilla de arriba y de la de abajo del punto.', 'Andá abriendo: las dos siguientes, y así.', 'Si movés los ojos, volvé a empezar.'],
      prog: 'Decí el número además del color.',
      ben: 'Ver a tu compañero y al rival mientras mirás la pelota.' },
    { c: 'peri', lv: 2, t: 'Dos tiras sin mover los ojos', tags: ['solo'], s: { t: 'num', n: 2, bg: 'liso', dot: true }, time: '3 rondas',
      para: 'Abrir la visión hacia los costados.',
      como: ['Celular cerca de la cara, a unos 30 centímetros.', 'Mirá fijo el punto rojo del medio.', 'Sin mover los ojos, decí el color de las casillas de la tira izquierda y de la derecha, de a una por lado.'],
      prog: 'Acercá el celular (las tiras quedan más afuera de tu vista) o usá el fondo en movimiento.',
      ben: 'Ver la pared, la red y al jugador de al lado sin girar la cabeza.' },
    { c: 'peri', lv: 3, t: 'Periférica con distracción', tags: ['solo'], s: { t: 'simbolos', n: 2, bg: 'mov', dot: true }, time: '3 rondas',
      para: 'Lo mismo, con movimiento alrededor que intenta distraerte.',
      como: ['Fondo en movimiento.', 'Mirada fija en el punto rojo.', 'Nombrá los símbolos de los costados sin mover los ojos.'],
      prog: 'Prendé las llamadas por voz: cuando te nombran un símbolo, decí de qué lado está.',
      ben: 'En la cancha hay luces, gente y movimiento: ver lo importante igual.' },
    { c: 'peri', lv: 2, t: 'Tabla del 1 al 25', tags: ['solo'], s: { t: 'tabla', n: 1, bg: 'liso' }, time: '3 tablas',
      para: 'Atención y visión amplia (tabla de Schulte).',
      como: ['Encontrá los números del 1 al 25 en orden, lo más rápido posible.', 'Truco: mirá el centro de la tabla y tratá de encontrarlos sin mover tanto los ojos.', 'Usá el cronómetro. Cada vuelta, "Nueva tira".'],
      prog: 'Del 25 al 1, o con el fondo en movimiento.',
      ben: 'Abarcar toda la cancha con la mirada y no quedarte "pegado" a la pelota.' },
    // Control de impulsos (Stroop, Go/No-Go)
    { c: 'inh', lv: 1, t: 'Leé las palabras', tags: ['solo'], s: { t: 'stroop', n: 1, bg: 'liso' }, time: '2 vueltas',
      para: 'Entrar en calor para el ejercicio de colores (efecto Stroop).',
      como: ['Leé en voz alta cada palabra, de arriba abajo.', 'No importa de qué color esté escrita: decí la palabra.'],
      prog: 'Más rápido, con el cronómetro.',
      ben: 'Es la base del próximo ejercicio.' },
    { c: 'inh', lv: 2, t: 'Decí el color, no la palabra', tags: ['solo'], s: { t: 'stroop', n: 1, bg: 'liso' }, time: '3 vueltas',
      para: 'Frenar la respuesta automática (control inhibitorio). Es la prueba de Stroop, de las más estudiadas en psicología.',
      como: ['Decí el COLOR de la tinta, no lo que dice la palabra.', 'Si dice ROJO escrito en azul, decís "azul".', 'Leé de arriba hacia abajo sin parar. Si te equivocás, corregí y seguí.'],
      prog: 'Con el cronómetro, o con el fondo en movimiento.',
      ben: 'Frenar a tiempo: no tirarte a una pelota que va afuera, no pegar el remate cuando conviene la bandeja.' },
    { c: 'inh', lv: 3, t: 'Stroop alternado', tags: ['solo'], s: { t: 'stroop', n: 1, bg: 'liso' }, time: '3 vueltas',
      para: 'Cambiar de regla rápido (flexibilidad mental).',
      como: ['En las casillas impares decí la palabra, y en las pares el color.', 'Leé de arriba abajo sin parar.'],
      prog: 'Con dos tiras: en la izquierda decís la palabra y en la derecha el color.',
      ben: 'Cambiar de plan en medio del punto cuando el rival te sorprende.' },
    { c: 'inh', lv: 2, t: 'Stroop con ritmo', tags: ['solo', 'metro'], s: { t: 'stroop', n: 1, bg: 'liso', metro: 50 }, time: '2 vueltas',
      para: 'Frenar la respuesta automática con poco tiempo para pensar.',
      como: ['Metrónomo en 50.', 'En cada bip, decí el color de la tinta de la siguiente palabra.'],
      prog: 'Subí de a 10.',
      ben: 'Decidir bien con el reloj apurando, como en un punto rápido en la red.' },
    { c: 'inh', lv: 2, t: 'Solo los azules', tags: ['solo'], s: { t: 'num', n: 1, bg: 'liso' }, time: '4 vueltas',
      para: 'Responder a unos y no a otros (ejercicio Go/No-Go).',
      como: ['Recorré la tira: si el hexágono es azul, decí el número y hacé un gesto de golpe con la mano.', 'Si es de otro color, quedate quieto y en silencio.', 'Cada vuelta, cambiá el color "bueno".'],
      prog: 'Con dos colores buenos, o con la regla al revés (todos menos el azul).',
      ben: 'Pegarle solo a la pelota que conviene y dejar pasar la que va afuera.' },
    { c: 'inh', lv: 2, t: 'Flechas al revés', tags: ['solo'], s: { t: 'flechas', n: 1, bg: 'liso' }, time: '3 vueltas',
      para: 'Ir en contra de lo automático.',
      como: ['Decí la dirección CONTRARIA a la que marca cada flecha.', 'Si apunta para arriba, decís "abajo".'],
      prog: 'Alterná: una flecha al derecho y otra al revés.',
      ben: 'Control para no ir para donde el rival te quiere llevar.' },
    { c: 'inh', lv: 2, t: 'Flechas con el cuerpo', tags: ['solo'], s: { t: 'flechas', n: 1, bg: 'liso' }, time: '3 × 30 segundos',
      para: 'De ver a mover: la decisión termina en un gesto.',
      como: ['Apoyá el celular a 2 metros, a la altura de los ojos.', 'Por cada flecha, dá un paso corto en esa dirección y volvé al centro.', 'Izquierda = paso de revés, derecha = paso de drive.'],
      prog: 'Al revés: paso hacia el lado contrario de la flecha.',
      ben: 'Pasar de leer la jugada a moverte, sin quedarte pensando.' },
    // Memoria visual
    { c: 'mem', lv: 1, t: 'Foto y ojos cerrados', tags: ['ojos'], s: { t: 'num', n: 1, bg: 'liso', flash: 4 }, time: '5 rondas',
      para: 'Memoria visual: guardar lo que viste en un instante.',
      como: ['Modo "Mirá y tapate": la tira se muestra 4 segundos y se tapa.', 'Mirá las primeras 4 casillas.', 'Cerrá los ojos y decí en orden los colores y números.', 'Tocá para verla de nuevo y comprobar.'],
      prog: 'Más casillas, o menos tiempo de vista (2 segundos).',
      ben: 'Recordar dónde estaban los rivales después de mirar la pelota.' },
    { c: 'mem', lv: 2, t: 'Al revés', tags: ['ojos'], s: { t: 'letras', n: 1, bg: 'liso', flash: 4 }, time: '5 rondas',
      para: 'Memoria de trabajo: tener la información en la cabeza y además darla vuelta.',
      como: ['Mirá 5 letras.', 'Cerrá los ojos y decilas de la última a la primera.'],
      prog: 'Sumá una letra cada vez que te salga bien.',
      ben: 'Pensar la jugada mientras tenés en la cabeza dónde está cada uno.' },
    { c: 'mem', lv: 2, t: 'Memoria de símbolos', tags: ['ojos', 'compa'], s: { t: 'simbolos', n: 1, bg: 'liso' }, time: '5 rondas',
      para: 'Recordar qué había y en qué lugar.',
      como: ['Mirá los primeros 6 símbolos durante 5 segundos.', 'Cerrá los ojos o tapátelos con la mano.', 'Tu compañero te pregunta: "¿Qué había en el lugar 3?" o "¿Dónde estaba la estrella?".'],
      prog: 'Que te pregunte también el color.',
      ben: 'Memoria de la jugada: qué hizo el rival la última vez en esa situación.' },
    { c: 'mem', lv: 3, t: 'Suma por color', tags: ['solo'], s: { t: 'num', n: 1, bg: 'liso' }, time: '3 tiras',
      para: 'Mirar, calcular y recordar a la vez.',
      como: ['Sumá en voz alta solo los números rojos, de arriba abajo.', 'Cuando terminás, sin volver a mirar, decí cuántos rojos había.'],
      prog: 'Restá los azules mientras sumás los rojos.',
      ben: 'Llevar la cuenta del partido y de lo que hace el rival sin desconcentrarte.' },
    { c: 'mem', lv: 2, t: 'Cadena que crece', tags: ['ojos'], s: { t: 'mixta', n: 1, bg: 'liso', flash: 3 }, time: 'Hasta equivocarte 2 veces',
      para: 'Medir y estirar cuánto podés recordar de un vistazo.',
      como: ['Empezá recordando 3 casillas de un vistazo de 3 segundos.', 'Ojos cerrados: decilas.', 'Si te sale bien, la próxima vez una casilla más. Anotá tu récord.'],
      prog: 'Bajá el tiempo de vista.',
      ben: 'Captar más información en cada mirada.' },
    // Doble tarea con pelotita
    { c: 'dual', lv: 1, t: 'Bote y lectura', tags: ['pelota'], s: { t: 'num', n: 1, bg: 'liso' }, time: '3 × 30 segundos',
      para: 'Hacer dos cosas a la vez: controlar la pelota y leer (doble tarea).',
      como: ['Apoyá el celular a la altura de los ojos.', 'Hacé botar la pelotita en la paleta (o en la mano).', 'En cada bote, leé la siguiente casilla.'],
      prog: 'Botes contra el piso, o con la mano no hábil.',
      ben: 'En los estudios con deportistas, pensar y moverse a la vez cuesta más que hacer cada cosa por separado. Entrenarlo juntos achica esa diferencia.' },
    { c: 'dual', lv: 2, t: 'Pared y lectura', tags: ['pelota'], s: { t: 'stroop', n: 1, bg: 'liso' }, time: '3 × 30 segundos',
      para: 'Golpear y decidir a la vez.',
      como: ['Celular apoyado al costado, a la altura de los ojos, cerca de una pared.', 'Peloteá contra la pared con la mano o la paleta.', 'Entre golpe y golpe, decí el color de la tinta de la siguiente palabra.'],
      prog: 'Con dos tiras: una palabra de cada lado.',
      ben: 'Pensar mientras peloteás, como en un punto largo.' },
    { c: 'dual', lv: 2, t: 'Pase de manos', tags: ['pelota'], s: { t: 'flechas', n: 1, bg: 'liso' }, time: '3 × 30 segundos',
      para: 'Coordinar las manos sin mirarlas.',
      como: ['Pasá la pelotita de una mano a la otra en arco, a la altura de los ojos.', 'En cada pase, decí la dirección de la siguiente flecha.'],
      prog: 'Con dos pelotitas, o con la dirección al revés.',
      ben: 'Las manos trabajan solas mientras los ojos leen el juego.' },
    { c: 'dual', lv: 2, t: 'Tiro, llamada y atrapada', tags: ['pelota', 'voz'], s: { t: 'num', n: 2, bg: 'liso', voz: true }, time: '20 tiros',
      para: 'Encontrar un objetivo mientras la pelota está en el aire.',
      como: ['Prendé las llamadas por voz: la app dice un objetivo ("azul cinco").', 'Tirá la pelotita hacia arriba.', 'Antes de atraparla, señalá de qué lado está lo que te pidieron.'],
      prog: 'Tiros más bajos (menos tiempo).',
      ben: 'Mirar al rival mientras la pelota viene: decidir antes de pegar.' },
    { c: 'dual', lv: 3, t: 'Golpe según la flecha', tags: ['compa'], s: { t: 'flechas', n: 1, bg: 'liso' }, time: '3 × 30 segundos',
      para: 'De la decisión al golpe de pádel.',
      como: ['Tu compañero sostiene el celular a 2 metros y te marca una flecha con el dedo.', 'Flecha a la izquierda: hacé el gesto de revés. A la derecha: drive. Arriba: bandeja. Abajo: globo.', 'Gesto completo, sin pelota, y volvé a la posición de espera.'],
      prog: 'Con paleta y una pelota que te tira tu compañero.',
      ben: 'Es lo más parecido al juego: ver, decidir y pegar.' },
    // Con un ojo tapado (monocular)
    { c: 'mono', lv: 1, t: 'Lectura con un ojo', tags: ['parche'], s: { t: 'num', n: 2, bg: 'liso' }, time: '2 × 30 segundos por ojo',
      para: 'Hacer trabajar a cada ojo por separado.',
      como: ['Tapate un ojo con un parche o con la palma (sin apretar el ojo).', 'Hacé el salto izquierda-derecha con el cronómetro.', 'Cambiá de ojo y repetí.', 'Compará los tiempos.'],
      prog: 'Con el fondo en movimiento.',
      ben: 'Si un ojo es mucho más lento o le cuesta más, es bueno saberlo. Si notás mucha diferencia, consultá a un oculista.' },
    { c: 'mono', lv: 2, t: 'Cerca y lejos con un ojo', tags: ['parche'], s: { t: 'letras', n: 1, bg: 'liso' }, time: '1 minuto por ojo',
      para: 'El ejercicio de enfoque cerca-lejos, con cada ojo por separado (así se hace en terapia visual).',
      como: ['Tapate un ojo.', 'Alterná: una letra del celular cerca, el cartel de lejos.', 'Cambiá de ojo.'],
      prog: 'Seguí el ritmo del metrónomo.',
      ben: 'Que cada ojo enfoque rápido por su cuenta.' },
    { c: 'mono', lv: 2, t: 'Atrapar con un ojo', tags: ['parche', 'pelota'], s: null, time: '15 tiros por ojo',
      para: 'Sentir lo difícil que es calcular la distancia con un solo ojo.',
      como: ['Tapate un ojo.', 'Tirá la pelotita hacia arriba y atrapala.', 'Después que te la tire un compañero desde 3 metros.', 'Cambiá de ojo.'],
      prog: 'Atrapala con una sola mano.',
      ben: 'Al volver a jugar con los dos ojos, la distancia se calcula mejor y con más confianza.' },
    // Equilibrio y visión
    { c: 'equi', lv: 1, t: 'En un pie', tags: ['equi'], s: { t: 'num', n: 2, bg: 'liso' }, time: '2 × 30 segundos por pierna',
      para: 'Mirar con precisión mientras el cuerpo busca el equilibrio.',
      como: ['Parate en un pie, cerca de una pared por seguridad.', 'Hacé el salto izquierda-derecha leyendo en voz alta.', 'Cambiá de pierna.'],
      prog: 'Con el fondo en movimiento.',
      ben: 'En la cancha golpeás muchas veces apoyado en una sola pierna.' },
    { c: 'equi', lv: 2, t: 'Piso blando', tags: ['equi'], s: { t: 'stroop', n: 1, bg: 'liso' }, time: '3 × 30 segundos',
      para: 'Equilibrio, vista y control de impulsos juntos.',
      como: ['Parate sobre un almohadón firme o una colchoneta doblada.', 'Hacé el Stroop: decí el color de la tinta.', 'Que haya una pared o una silla cerca para agarrarte.'],
      prog: 'En un pie sobre el almohadón.',
      ben: 'Pensar bien aunque estés incómodo o fuera de posición.' },
    { c: 'equi', lv: 2, t: 'Ojos abiertos, ojos cerrados', tags: ['equi', 'ojos'], s: { t: 'letras', n: 1, bg: 'liso' }, time: '5 rondas',
      para: 'Que el equilibrio no dependa solo de la vista.',
      como: ['En un pie: leé 3 letras.', 'Cerrá los ojos y quedate en equilibrio 10 segundos.', 'Abrí y leé las 3 letras siguientes.', 'Siempre cerca de una pared.'],
      prog: '15 segundos con los ojos cerrados.',
      ben: 'Mejor equilibrio cuando mirás la pelota y no el piso.' },
    // Con compañero
    { c: 'compa', lv: 1, t: 'El que manda', tags: ['compa'], s: { t: 'num', n: 2, bg: 'liso' }, time: '20 llamadas cada uno',
      para: 'Encontrar rápido lo que te piden.',
      como: ['Tu compañero dice un objetivo: "amarillo 7".', 'Vos lo encontrás y lo señalás lo más rápido que puedas.', 'Después cambian. Si están solos, usen las llamadas por voz.'],
      prog: 'Dos objetivos por llamada.',
      ben: 'Reaccionar a lo que te pide tu compañero en el punto ("¡tuya!", "¡al medio!").' },
    { c: 'compa', lv: 2, t: 'La tira se mueve', tags: ['compa'], s: { t: 'num', n: 1, bg: 'liso' }, time: '3 × 30 segundos',
      para: 'Leer algo que se mueve sin aviso.',
      como: ['Tu compañero sostiene el celular y lo mueve despacio para cualquier lado.', 'Vos, con la cabeza quieta, leés las casillas de arriba abajo.'],
      prog: 'Que lo mueva más rápido o lo acerque y lo aleje.',
      ben: 'La pelota cambia de dirección sin avisar.' },
    { c: 'compa', lv: 2, t: 'Desafío de velocidad', tags: ['compa'], s: { t: 'stroop', n: 1, bg: 'liso' }, time: '3 rondas',
      para: 'Ponerle presión al ejercicio, como en un partido.',
      como: ['Cada uno hace el Stroop (decir el color) con el cronómetro.', 'Cada error suma 2 segundos.', 'Gana el tiempo más bajo. (No suma puntos en el juego: es entre ustedes.)'],
      prog: 'Con el fondo en movimiento.',
      ben: 'Aprender a pensar con presión.' },
    { c: 'compa', lv: 3, t: 'Llamada y pelotita', tags: ['compa', 'pelota'], s: { t: 'mixta', n: 2, bg: 'mov' }, time: '20 tiros',
      para: 'Todo junto: visión, decisión y pelota.',
      como: ['Tu compañero sostiene el celular con el fondo en movimiento.', 'Te tira la pelotita y en el mismo momento te dice un objetivo.', 'Antes de atraparla, señalá el objetivo.'],
      prog: 'Atrapá con la mano no hábil.',
      ben: 'Es lo más parecido a un punto de verdad.' },
    // Rutinas armadas
    { c: 'rut', lv: 1, t: 'Activación antes de jugar (5 minutos)', tags: ['solo', 'pelota'], s: { t: 'num', n: 2, bg: 'liso' }, time: '5 minutos',
      para: 'Despertar la vista y la cabeza antes de entrar a la cancha.',
      como: ['1 minuto: Salto izquierda y derecha.', '1 minuto: La cabeza dice que no.', '1 minuto: Cerca y lejos.', '1 minuto: Decí el color, no la palabra.', '1 minuto: Bote y lectura.'],
      prog: 'Agregá el metrónomo en el salto y en el bote.',
      ben: 'Entrás a la cancha con la mirada ya en marcha.' },
    { c: 'rut', lv: 1, t: 'Plan semana 1: la base', tags: ['solo'], s: { t: 'num', n: 1, bg: 'liso' }, time: '10 minutos · 3 días',
      para: 'Empezar de a poco y con técnica.',
      como: ['Día por medio, 10 minutos.', 'Mirada quieta, Escalera, Salto izquierda y derecha, Arriba y abajo, Seguimiento lento, La cabeza dice que no.', 'Siempre con el fondo liso.'],
      prog: 'Cuando todo te salga sin errores, pasá a la semana 2.',
      ben: 'Primero precisión, después velocidad.' },
    { c: 'rut', lv: 2, t: 'Plan semana 2: velocidad', tags: ['solo', 'metro'], s: { t: 'num', n: 2, bg: 'liso', metro: 70 }, time: '12 minutos · 3 días',
      para: 'Sumar ritmo y control de impulsos.',
      como: ['Saltos al ritmo, Zigzag, Mirada firme con ritmo, Decí el color no la palabra, Solo los azules, Tabla del 1 al 25.'],
      prog: 'Subí el metrónomo de a 10 cada día.',
      ben: 'La misma precisión, pero más rápido.' },
    { c: 'rut', lv: 3, t: 'Plan semana 3: como en la cancha', tags: ['pelota', 'equi'], s: { t: 'mixta', n: 2, bg: 'mov' }, time: '15 minutos · 3 días',
      para: 'Llevar todo a situaciones de juego.',
      como: ['Fondo en movimiento.', 'Periférica con distracción, Stroop alternado, Pared y lectura, Tiro llamada y atrapada, En un pie, Golpe según la flecha.'],
      prog: 'Repetí la semana 3 y cada tanto volvé a la 1 para cuidar la técnica.',
      ben: 'La mirada y la cabeza entrenadas en situaciones parecidas al juego, que es donde más sirve.' }
  ];
  C.forEach(function (x, i) { x.id = i + 1; });
  V.CARDS = C;

  /* ---------- Guardado (solo en el dispositivo: no suma puntos) ---------- */
  var KEY = 'pelotita.vis';
  function done() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function markDone(id) { var d = done(); d[id] = (d[id] || 0) + 1; try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }

  /* ---------- Pantalla ---------- */
  var open = 0, catF = '';
  function isPro() { return !!(DB && DB.isVip && DB.isVip()); }
  V.render = function () {
    var d = done(), n = Object.keys(d).length, pro = isPro(), h = '';
    h += '<div class="card" style="border-color:#22E1FF"><h3 class="disp" style="color:#22E1FF;font-size:22px">Entrená la vista como un profesional</h3>' +
      '<p style="color:#fff">' + C.length + ' ejercicios con tiras largas en la pantalla: saltos de mirada, seguimiento, mirada firme, enfoque cerca y lejos, visión periférica, control de impulsos, memoria y doble tarea con pelotita.</p>' +
      '<p>Es un entrenamiento aparte: <b style="color:#fff">no suma puntos</b> en el juego. Cada tira se arma al azar, así nunca te la aprendés de memoria.</p>' +
      '<div class="rew"><span>' + n + ' de ' + C.length + ' hechos</span></div>' +
      '<div class="row" style="justify-content:flex-start;flex-wrap:wrap"><button class="btn small" data-v="free">Abrir tiras libres</button><button class="btn small ghost" data-v="info">Antes de empezar</button></div></div>';
    if (!pro) h += '<div class="card" style="border-color:#FFD23A;box-shadow:0 0 18px rgba(255,210,58,.4)"><h3 class="disp" style="color:#FFD23A;font-size:22px">🔒 Solo para jugadores PRO</h3>' +
      '<p style="color:#fff">Mirá todas las tarjetas y cómo se hacen. Para abrir las tiras y entrenar tenés que ser PRO.</p><button class="btn lime" data-v="pro">Quiero ser PRO</button></div>';
    h += '<div class="vcats"><button class="tab' + (catF ? '' : ' on') + '" data-vc="">Todos</button>' + CATS.map(function (c) { return '<button class="tab' + (catF === c[0] ? ' on' : '') + '" data-vc="' + c[0] + '">' + c[1] + '</button>'; }).join('') + '</div>';
    CATS.forEach(function (cat) {
      if (catF && catF !== cat[0]) return;
      var list = C.filter(function (x) { return x.c === cat[0]; }); if (!list.length) return;
      h += '<h3 class="disp" style="margin:14px 4px 6px;color:' + cat[2] + '">' + cat[1] + '</h3>';
      list.forEach(function (x) {
        var isOpen = open === x.id;
        h += '<div class="card vcard" style="--c:' + cat[2] + '">' +
          '<button class="vhead" data-vo="' + x.id + '"><span class="vn">' + x.id + '</span><span class="vt"><b>' + esc(x.t) + (d[x.id] ? ' <i class="vok">✓</i>' : '') + '</b><small>' + esc(x.para) + '</small></span><span class="vlv">' + '●●●'.slice(0, x.lv) + '<em>' + '●●●'.slice(x.lv) + '</em></span></button>' +
          '<div class="vtags">' + x.tags.map(function (t) { return '<span>' + TAGS[t] + '</span>'; }).join('') + '<span>' + esc(x.time) + '</span></div>';
        if (isOpen) {
          h += '<div class="vbody"><h4>Cómo se hace</h4><ol>' + x.como.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
            '<h4>Para hacerlo más difícil</h4><p>' + esc(x.prog) + '</p><h4>Beneficio en la cancha</h4><p>' + esc(x.ben) + '</p>' +
            (x.s ? '<p class="note" style="text-align:left">Tira: ' + esc(V.TYPES[x.s.t]) + (x.s.n === 2 ? ' · dos tiras' : '') + ' · fondo ' + (x.s.bg === 'mov' ? 'en movimiento' : 'liso') + (x.s.metro ? ' · metrónomo ' + x.s.metro : '') + '</p>' : '<p class="note" style="text-align:left">Este ejercicio se hace sin el celular.</p>') +
            '<div class="row" style="justify-content:flex-start;flex-wrap:wrap">' + (x.s ? '<button class="btn lime small" data-vs="' + x.id + '">' + (pro ? 'Empezar' : '🔒 Empezar') + '</button>' : '') +
            '<button class="btn small ghost" data-vd="' + x.id + '">Lo hice ✓</button></div></div>';
        }
        h += '</div>';
      });
    });
    h += '<p class="note">Estos ejercicios no reemplazan la consulta con un oculista. Si sentís mareo, dolor de cabeza o visión doble que no se va, pará.</p>';
    $('visBody').innerHTML = h;
  };
  function showInfo() {
    U.modal('<h2>Antes de empezar</h2>' +
      '<p style="text-align:left"><b style="color:#fff">Cómo usar las tiras:</b> sostené el celular en vertical a la distancia del brazo, a la altura de los ojos, o apoyalo en un lugar fijo. Con buena luz y con el brillo de la pantalla alto. Si usás anteojos o lentes de contacto para ver de lejos, ponételos.</p>' +
      '<p style="text-align:left"><b style="color:#fff">Fondos:</b> el <b>liso</b> es para aprender la técnica sin distracciones. El <b>fondo en movimiento</b> suma manchas y franjas que se mueven, como la gente y las luces de una cancha. Usalo cuando ya te sale bien.</p>' +
      '<p style="text-align:left"><b style="color:#fff">Herramientas:</b> metrónomo (marca el ritmo), llamadas por voz (la app te pide un objetivo), "Mirá y tapate" (la tira se ve unos segundos y se tapa) y cronómetro.</p>' +
      '<p style="text-align:left"><b style="color:#fff">Lo que dice la ciencia:</b> los deportistas suelen tener mejores habilidades visuales que quienes no hacen deporte, y lo que más se mejora es justamente lo que se entrena. Por eso muchas tarjetas mezclan la vista con pelotita, gestos de pádel y equilibrio: así se parece más al juego.</p>' +
      '<p style="text-align:left"><b style="color:#fff">Cuidado:</b> pocos minutos y bien hechos valen más que mucho tiempo. Si aparece mareo, dolor de cabeza o visión doble, pará y descansá. Si tuviste un golpe en la cabeza o te operaron de la vista, consultá antes. Los ejercicios con un ojo tapado se hacen con un parche o con la palma, sin apretar el ojo.</p>' +
      '<button class="btn lime" id="vInfoOk">Entendido</button>', function () { U.on($('vInfoOk'), U.closeModal); });
  }
  function needPro() {
    if (!DB.user) {
      U.modal('<h2 style="color:#FFD23A">Solo para jugadores PRO</h2><p style="color:#fff">Las tiras visuales son para jugadores PRO. Primero creá tu cuenta.</p><button class="btn lime" id="vAcc">Crear mi cuenta</button>',
        function () { U.on($('vAcc'), function () { U.closeModal(); PP.Social.open('acc'); U.go('social'); }); });
      return;
    }
    if (PP.Social.offerPro) PP.Social.offerPro();
  }

  /* ---------- Visor de tiras ---------- */
  var VW = null;
  function startViewer(cfg) {
    if (!isPro()) { needPro(); return; }
    stopViewer();
    VW = { t: cfg.t || 'num', n: cfg.n || 1, bg: cfg.bg || 'liso', dot: !!cfg.dot, metro: cfg.metro || 0, voz: !!cfg.voz, flash: cfg.flash || 0, ui: false, strips: [], sw: null, card: cfg.card || null };
    var el = document.createElement('div'); el.id = 'visView'; document.body.appendChild(el);
    el.addEventListener('click', onViewClick);
    build(); paint();
    if (VW.metro) metroOn(); if (VW.voz) vozOn();
    try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { if (VW) VW.lock = l; }, function () {}); } catch (e) {}
  }
  function stopViewer() {
    if (!VW) return; metroOff(); vozOff(); clearTimeout(VW.flashT); cancelAnimationFrame(VW.raf);
    try { if (VW.lock) VW.lock.release(); } catch (e) {}
    var el = $('visView'); if (el) el.remove(); VW = null;
  }
  function build() { VW.strips = []; for (var i = 0; i < (VW.t === 'tabla' ? 1 : VW.n); i++) VW.strips.push(makeStrip(VW.t)); }
  function bar() {
    var opt = function (v, l, cur) { return '<option value="' + v + '"' + (String(cur) === String(v) ? ' selected' : '') + '>' + l + '</option>'; };
    return '<div class="vbar">' +
      '<button data-x="close" class="vb">✕</button>' +
      '<select data-x="t" class="vb">' + Object.keys(V.TYPES).map(function (k) { return opt(k, V.TYPES[k], VW.t); }).join('') + '</select>' +
      '<button data-x="n" class="vb">' + (VW.n === 2 ? 'Dos tiras' : 'Una tira') + '</button>' +
      '<button data-x="bg" class="vb">' + (VW.bg === 'mov' ? 'Fondo en movimiento' : 'Fondo liso') + '</button>' +
      '<button data-x="dot" class="vb' + (VW.dot ? ' on' : '') + '">Punto central</button>' +
      '<select data-x="metro" class="vb">' + opt(0, 'Metrónomo apagado', VW.metro) + [40, 50, 60, 70, 80, 90, 100, 120, 140, 160].map(function (b) { return opt(b, 'Metrónomo ' + b, VW.metro); }).join('') + '</select>' +
      '<button data-x="voz" class="vb' + (VW.voz ? ' on' : '') + '">Llamadas por voz</button>' +
      '<select data-x="flash" class="vb">' + opt(0, 'Mirá y tapate: no', VW.flash) + [2, 3, 4, 5].map(function (s) { return opt(s, 'Mirá y tapate: ' + s + ' s', VW.flash); }).join('') + '</select>' +
      '<button data-x="sw" class="vb">' + swLabel() + '</button>' +
      '<button data-x="new" class="vb lime">Nueva tira</button>' +
      (VW.card ? '<button data-x="done" class="vb">Lo hice ✓</button>' : '') +
      '<button data-x="ui" class="vb">Ocultar controles</button></div>';
  }
  // Botones chicos cuando los controles están ocultos: en las esquinas con una tira, en el medio con dos
  function mini() {
    var pos = VW.t !== 'tabla' && VW.n === 2 ? 'center' : 'corner';
    return '<div class="vmini ' + pos + '"><div><button data-x="close" class="vb">✕ Salir</button></div><div><button data-x="new" class="vb lime">↻ Nueva</button>' +
      (VW.sw ? '<button data-x="sw" class="vb">' + swLabel() + '</button>' : '') + '<button data-x="ui" class="vb">⚙ Ajustes</button></div></div>';
  }
  function swLabel() { if (!VW.sw) return 'Cronómetro'; var ms = (VW.sw.stop || Date.now()) - VW.sw.start; return (VW.sw.stop ? '⏱ ' : '⏸ ') + (ms / 1000).toFixed(1).replace('.', ',') + ' s'; }
  function paint() {
    var el = $('visView'); if (!el) return;
    var s = VW.strips, body = VW.t === 'tabla' ? stripHtml(s[0]) : (s.length === 2 ? stripHtml(s[0], 'l') + stripHtml(s[1], 'r') : stripHtml(s[0], 'c'));
    el.className = 'bg-' + VW.bg + (VW.ui ? ' ui' : '');
    el.innerHTML = (VW.bg === 'mov' ? '<canvas id="visBg"></canvas>' : '') + '<div class="vstage">' + body + (VW.dot ? '<i class="vdot"></i>' : '') + '</div>' + (VW.covered ? '<div class="vcover">Cerrá los ojos y decí lo que viste.<br><small>Tocá para ver la tira de nuevo</small></div>' : '') + (VW.ui ? bar() : mini());
    if (VW.bg === 'mov') bgAnim();
    if (VW.flash && !VW.covered) { clearTimeout(VW.flashT); VW.flashT = setTimeout(function () { if (VW) { VW.covered = true; paint(); } }, VW.flash * 1000); }
  }
  function onViewClick(e) {
    if (!VW) return;
    var b = e.target.closest('[data-x]');
    if (!b) {
      if (VW.covered) { VW.covered = false; build(); paint(); return; }
      if (e.target.closest('.vbar') || e.target.closest('.vmini')) return;
      if (VW.ui) { VW.ui = false; paint(); }
      return;
    }
    var x = b.dataset.x;
    if (b.tagName === 'SELECT') return;
    if (x === 'close') { stopViewer(); return; }
    if (x === 'ui') { VW.ui = !VW.ui; paint(); return; }
    if (x === 'n') { VW.n = VW.n === 2 ? 1 : 2; build(); }
    else if (x === 'bg') VW.bg = VW.bg === 'mov' ? 'liso' : 'mov';
    else if (x === 'dot') VW.dot = !VW.dot;
    else if (x === 'voz') { VW.voz = !VW.voz; VW.voz ? vozOn() : vozOff(); }
    else if (x === 'sw') { if (!VW.sw || VW.sw.stop) VW.sw = { start: Date.now() }; else VW.sw.stop = Date.now(); swTick(); }
    else if (x === 'new') { VW.covered = false; build(); }
    else if (x === 'done') { markDone(VW.card); U.toast('¡Bien! Lo marcamos como hecho.'); }
    paint();
  }
  function onViewChange(e) {
    if (!VW) return; var s = e.target.closest('select[data-x]'); if (!s) return;
    var x = s.dataset.x;
    if (x === 't') { VW.t = s.value; build(); }
    else if (x === 'metro') { VW.metro = +s.value; metroOff(); if (VW.metro) metroOn(); }
    else if (x === 'flash') { VW.flash = +s.value; VW.covered = false; }
    paint();
  }
  function swTick() { clearInterval(swTick.t); swTick.t = setInterval(function () { if (!VW || !VW.sw || VW.sw.stop) { clearInterval(swTick.t); return; } Array.prototype.forEach.call(document.querySelectorAll('#visView [data-x="sw"]'), function (b) { b.textContent = swLabel(); }); }, 100); }

  // Fondo en movimiento: manchas de colores y franjas que se mueven (como gente y luces alrededor de la cancha)
  function bgAnim() {
    var cv = $('visBg'); if (!cv) return; cancelAnimationFrame(VW.raf);
    var dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.width = innerWidth * dpr, H = cv.height = innerHeight * dpr, ctx = cv.getContext('2d');
    if (!VW.blobs) { VW.blobs = []; var cs = ['#E53935', '#1E5BD8', '#FFC400', '#2E9E44', '#FF3D8B', '#22E1FF', '#ffffff']; for (var i = 0; i < 26; i++) VW.blobs.push({ x: Math.random(), y: Math.random(), r: 0.02 + Math.random() * 0.06, vx: (Math.random() - 0.5) * 0.004, vy: (Math.random() - 0.5) * 0.004, c: cs[i % cs.length] }); }
    var t0 = performance.now();
    (function loop(t) {
      if (!VW || !$('visBg')) return; VW.raf = requestAnimationFrame(loop);
      var k = (t - t0) / 1000; ctx.fillStyle = '#2b2440'; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 0.18; ctx.fillStyle = '#ffffff';
      for (var s = -1; s < 12; s++) { var y = ((s * 0.11 + k * 0.05) % 1.2 - 0.1) * H; ctx.fillRect(0, y, W, H * 0.025); }
      ctx.globalAlpha = 0.75;
      VW.blobs.forEach(function (b) { b.x += b.vx; b.y += b.vy; if (b.x < 0 || b.x > 1) b.vx *= -1; if (b.y < 0 || b.y > 1) b.vy *= -1; ctx.fillStyle = b.c; ctx.beginPath(); ctx.arc(b.x * W, b.y * H, b.r * Math.min(W, H) * (1 + 0.2 * Math.sin(k * 3 + b.x * 9)), 0, 7); ctx.fill(); });
      ctx.globalAlpha = 1;
    })(t0);
  }
  // Metrónomo
  var AC = null;
  function metroOn() {
    metroOff(); try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { return; }
    var beat = function () { try { var o = AC.createOscillator(), g = AC.createGain(); o.frequency.value = 1320; g.gain.setValueAtTime(0.25, AC.currentTime); g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 0.06); o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime + 0.07); } catch (e) {} };
    beat(); VW.metroT = setInterval(beat, 60000 / VW.metro);
  }
  function metroOff() { if (VW && VW.metroT) { clearInterval(VW.metroT); VW.metroT = null; } }
  // Llamadas por voz: la app pide un objetivo de las tiras cada 3,5 segundos
  function vozOn() {
    vozOff(); if (!('speechSynthesis' in window)) { U.toast('Este celular no tiene voz.'); VW.voz = false; return; }
    var say = function () {
      if (!VW) return; var all = []; VW.strips.forEach(function (s) { s.cells.forEach(function (c) { if (c.say) all.push(c.say); }); }); if (!all.length) return;
      try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(pick(all)); u.lang = 'es-AR'; u.rate = 1.05; speechSynthesis.speak(u); } catch (e) {}
    };
    say(); VW.vozT = setInterval(say, 3500);
  }
  function vozOff() { if (VW && VW.vozT) { clearInterval(VW.vozT); VW.vozT = null; } try { speechSynthesis.cancel(); } catch (e) {} }

  V.init = function () {
    U = PP.ui;
    $('visBody').addEventListener('click', function (e) {
      var b;
      if ((b = e.target.closest('[data-vo]'))) { var id = +b.dataset.vo; open = open === id ? 0 : id; V.render(); return; }
      if ((b = e.target.closest('[data-vc]'))) { catF = b.dataset.vc; open = 0; V.render(); return; }
      if ((b = e.target.closest('[data-vs]'))) { var c = C[+b.dataset.vs - 1]; startViewer(Object.assign({ card: c.id }, c.s)); return; }
      if ((b = e.target.closest('[data-vd]'))) { markDone(+b.dataset.vd); V.render(); U.toast('¡Bien! Lo marcamos como hecho.'); return; }
      if ((b = e.target.closest('[data-v]'))) { var a = b.dataset.v; if (a === 'free') startViewer({ t: 'num', n: 2, bg: 'liso' }); else if (a === 'info') showInfo(); else if (a === 'pro') needPro(); }
    });
    document.addEventListener('change', onViewChange);
    window.addEventListener('resize', function () { if (VW && VW.bg === 'mov') bgAnim(); });
  };
  V.close = stopViewer;
})();
