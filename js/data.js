/* A la Pelotita · datos del juego (personajes, mundos, niveles, tienda) */
(function () {
  'use strict';
  var PP = window.PP = window.PP || {};

  PP.VERSION = '2.0.0';

  // Atributos 1..10: pot = potencia, pre = precisión, ref = reflejos, def = defensa, res = resistencia
  PP.CHARS = [
    { id: 'tornado', name: 'Tornado', tag: 'Un poco de todo, todo bien.', img: 'assets/chars/tornado.png',
      accent: '#22E1FF', stats: { pot: 6, pre: 7, ref: 6, def: 6, res: 6 }, price: null,
      special: { name: 'Remolino', desc: 'Tu próximo golpe sale con efecto imposible y vale doble.' },
      look: { shirt: '#F2A21E', chest: '#F4EBDD', shorts: '#3B3B44', hair: '#6B3A1E', skin: '#F0B98A', hat: 'hair' } },
    { id: 'muro', name: 'Muro', tag: 'No pasa nada sin su permiso.', img: 'assets/chars/muro.png',
      accent: '#FFB020', stats: { pot: 5, pre: 6, ref: 5, def: 9, res: 7 }, price: { coins: 1500 },
      special: { name: 'Pared de vidrio', desc: 'Las próximas 3 pelotas las devuelve solo, perfectas.' },
      look: { shirt: '#F4EBDD', chest: '#F2A21E', shorts: '#3B3B44', hair: '#4A2A16', skin: '#F0B98A', hat: 'cap' } },
    { id: 'relampago', name: 'Relámpago', tag: 'Llega a todas. Siempre.', img: 'assets/chars/relampago.png',
      accent: '#FF4FA3', stats: { pot: 5, pre: 6, ref: 9, def: 5, res: 5 }, price: { coins: 4000 },
      special: { name: 'Cámara lenta', desc: 'El tiempo va a la mitad 6 segundos y todo golpe es perfecto.' },
      look: { shirt: '#F4EBDD', chest: '#F4EBDD', shorts: '#F4EBDD', hair: '#5A3219', skin: '#F0B98A', hat: 'visor' } },
    { id: 'rayo', name: 'Rayo', tag: 'Cada golpe, una bomba.', img: 'assets/chars/rayo.png',
      accent: '#FFE83A', stats: { pot: 9, pre: 5, ref: 6, def: 4, res: 6 }, price: { gems: 60 },
      special: { name: 'Smash eléctrico', desc: 'Tu próximo golpe es un remate que nadie devuelve.' },
      look: { shirt: '#F4EBDD', chest: '#F4EBDD', shorts: '#FFFFFF', hair: '#4A2A16', skin: '#F0B98A', hat: 'band' } }
  ];
  PP.CHARS.forEach(function (c) { c.sprite = 'assets/sprites/' + c.id + '.png'; });
  PP.STAT_NAMES = { pot: 'Potencia', pre: 'Precisión', ref: 'Reflejos', def: 'Defensa', res: 'Resistencia' };
  PP.STAT_HELP = {
    pot: 'Golpes más rápidos', pre: 'Perfectos más fáciles', ref: 'Más tiempo para pegar',
    def: 'Llegás a más pelotas', res: 'El especial carga antes'
  };

  PP.WORLDS = [
    { name: 'Club del Barrio', sub: 'Donde empieza todo', bg: 'assets/bg/w1.jpg',
      court: '#1F6BFF', court2: '#1857D6', out: '#162F2E', line: '#FFFFFF', neon: '#FFB020', neon2: '#FF3D8B',
      sky: ['#3A1B7A', '#FF3D8B', '#FF9A3D'], ui: '#FFB020' },
    { name: 'Playa Pádel', sub: 'Arena, sol y globos', bg: 'assets/bg/w2.jpg',
      court: '#00B8A9', court2: '#00A093', out: '#EBA36A', line: '#FFFFFF', neon: '#FF3D8B', neon2: '#FFE83A',
      sky: ['#22C1FF', '#FF8FB1', '#FFE27A'], ui: '#22E1FF' },
    { name: 'Neón City', sub: 'La noche es de los que atacan', bg: 'assets/bg/w3.jpg',
      court: '#6A2BFF', court2: '#5520D9', out: '#140A42', line: '#E9FBFF', neon: '#22E1FF', neon2: '#FF2FB3',
      sky: ['#070320', '#3B0F7A', '#FF2FB3'], ui: '#FF4FA3' },
    { name: 'World Tour', sub: 'La final del mundo', bg: 'assets/bg/w4.jpg',
      court: '#E0263C', court2: '#BF1D31', out: '#5E0808', line: '#FFF6D6', neon: '#FFD23A', neon2: '#FF7A3D',
      sky: ['#05030F', '#3A0A2A', '#FFB020'], ui: '#FFD23A' }
  ];

  var RIVALS = [
    ['El Profe', 'Coco', 'Tía Marta', 'Lucho', 'Pipa', 'Nacho Volea', 'Rulo', 'La Zurda', 'Chino'],
    ['Sol', 'Brisa', 'Caracol', 'Marea', 'Tiburón', 'Ola', 'Coral', 'Capitán', 'Arena'],
    ['Pixel', 'Glitch', 'Láser', 'Turbo', 'Neutrón', 'Vértigo', 'Sombra', 'Ciber', 'Eco'],
    ['Titán', 'Fénix', 'Cometa', 'Leyenda', 'Huracán', 'Maestra', 'Meteoro', 'As', 'Imperio']
  ];
  PP.BOSSES = [
    { name: 'Don Globo', img: 'assets/chars/boss1.png', line: 'Te la paso por arriba, pibe.', lob: 0.5 },
    { name: 'La Víbora', img: 'assets/chars/boss2.png', line: 'Mi víbora no perdona.', lob: 0.1 },
    { name: 'Neón Kid', img: 'assets/chars/boss3.png', line: 'Demasiado rápido para vos.', lob: 0.1 },
    { name: 'El Número 1', img: 'assets/chars/boss4.png', line: 'Nadie me ganó. Nadie.', lob: 0.08 }
  ];
  var OUTFITS = ['#FF3D8B', '#22E1FF', '#7CFF4D', '#FFE83A', '#FF7A3D', '#B26BFF', '#FF5252', '#3DFFC8', '#FFFFFF'];
  var HAIRS = ['#2A1A12', '#6B3A1E', '#E8C06A', '#B5482A', '#111118', '#8A8A99'];
  var HATS = ['hair', 'cap', 'band', 'visor'];
  var PATTERN = ['match', 'match', 'targets', 'match', 'rally', 'match', 'match', 'targets', 'match', 'boss'];

  PP.LEVELS = [];
  for (var i = 0; i < 40; i++) {
    var w = Math.floor(i / 10), k = i % 10, type = PATTERN[k];
    var lv = { n: i + 1, world: w, type: type, diff: i };
    if (type === 'boss') {
      lv.rival = PP.BOSSES[w].name; lv.boss = PP.BOSSES[w]; lv.toWin = 5;
      lv.goal = 'Ganale a ' + lv.rival + ' a 5 puntos';
    } else if (type === 'match') {
      lv.rival = RIVALS[w][k]; lv.toWin = i < 2 ? 3 : (i < 20 ? 4 : 5);
      lv.goal = 'Llegá a ' + lv.toWin + ' puntos antes que ' + lv.rival;
    } else if (type === 'targets') {
      lv.rival = 'Lanzapelotas'; lv.balls = 10; lv.need = 4 + w;
      lv.goal = 'Rompé ' + lv.need + ' blancos con ' + lv.balls + ' pelotas';
    } else {
      lv.rival = RIVALS[w][k]; lv.need = 12 + w * 6; lv.misses = 3;
      lv.goal = 'Peloteo de ' + lv.need + ' golpes · 3 errores máximo';
    }
    lv.look = {
      shirt: OUTFITS[(i * 3 + 1) % OUTFITS.length], chest: OUTFITS[(i * 5 + 4) % OUTFITS.length],
      shorts: ['#22222B', '#FFFFFF', '#2B2F77'][i % 3], hair: HAIRS[(i * 7) % HAIRS.length],
      skin: ['#F0B98A', '#D99A6C', '#A86F4A', '#FFD2B0'][(i * 3) % 4], hat: HATS[(i + 1) % 4]
    };
    if (type === 'boss') {
      lv.look = [
        { shirt: '#22D3C5', chest: '#FFFFFF', shorts: '#FFFFFF', hair: '#B9B9C6', skin: '#F0B98A', hat: 'cap' },
        { shirt: '#12A85A', chest: '#101418', shorts: '#101418', hair: '#17110E', skin: '#D99A6C', hat: 'band' },
        { shirt: '#7B4DFF', chest: '#22E1FF', shorts: '#15103A', hair: '#22B8FF', skin: '#FFD2B0', hat: 'visor' },
        { shirt: '#D81E2C', chest: '#FFD23A', shorts: '#15121A', hair: '#111118', skin: '#C98A5E', hat: 'hair' }
      ][w];
    }
    lv.sprite = 'assets/sprites/' + (type === 'boss' ? 'boss' + (w + 1) : 'r' + (1 + (i * 3 + w) % 4)) + '.png';
    PP.LEVELS.push(lv);
  }

  // Categorías de pádel como nivel de jugador
  PP.RANKS = ['8va', '7ma', '6ta', '5ta', '4ta', '3ra', '2da', '1ra', 'PRO', 'LEYENDA'];
  PP.xpFor = function (rank) { return 120 + rank * 140; };

  PP.DAILY = [
    { coins: 100 }, { coins: 200 }, { gems: 5 }, { coins: 400 }, { gems: 10 }, { coins: 800 }, { gems: 30, coins: 1000 }
  ];

  PP.MISSION_POOL = [
    { id: 'perf', text: 'Hacé {n} golpes PERFECTOS', n: [12, 20, 30], reward: { coins: 150 } },
    { id: 'wins', text: 'Ganá {n} niveles', n: [2, 3, 5], reward: { coins: 200 } },
    { id: 'rally', text: 'Lográ un peloteo de {n} golpes', n: [8, 12, 16], reward: { gems: 3 } },
    { id: 'x3', text: 'Sacala por 3 con un remate {n} veces', n: [1, 2, 3], reward: { gems: 4 } },
    { id: 'stars', text: 'Juntá {n} estrellas', n: [3, 6, 9], reward: { coins: 250 } },
    { id: 'super', text: 'Usá tu especial {n} veces', n: [2, 3, 5], reward: { coins: 180 } },
    { id: 'combo', text: 'Llegá a un combo x{n}', n: [5, 8, 12], reward: { gems: 3 } }
  ];

  // Gimnasio mental: jugadas para leer. La primera opción es siempre la correcta (se mezclan al mostrarlas).
  // Posiciones [x, z]: tu lado es z > 0, la red está en z = 0.
  PP.DRILLS = [
    { id: 'read', name: 'Leé la jugada', desc: 'Se congela el punto: elegí el golpe correcto. Cada etapa tiene menos tiempo y más ritmo. Tenés 3 vidas.', color: '#FFB020' },
    // Oculto por ahora: no funcionaba bien. Para volver a mostrarlo, quitar "hidden: true".
    { id: 'antic', hidden: true, name: 'Anticipación', desc: 'La pelota desaparece en el aire. Tocá donde creés que va a picar.', color: '#22E1FF' },
    { id: 'lights', name: 'Tablero de luces', desc: 'Entrenamiento del cerebro por niveles: reflejos, paciencia, visión periférica y cambios de regla. Cada nivel, más difícil.', color: '#7CFF4D' },
    { id: 'ghost', name: 'Pelota fantasma', desc: 'Peloteo con la pelota que parpadea, como entrenar con lentes estroboscópicos.', color: '#FF4FA3' }
  ];
  // Tablero de luces por niveles. Cada nivel entrena una habilidad con un ejercicio clásico de psicología cognitiva
  // (Go/No-Go, Stroop, cambio de regla, visión periférica, seguimiento). Después del nivel 12 se repite todo más rápido.
  // mix: peso de cada tipo de luz. go = verde, no = roja, blue = azul (se toca), gold = dorada (vale triple),
  // wait = amarilla (esperar a que se ponga verde), word = color con palabra (Stroop). life = segundos visible.
  PP.LIGHT_LEVELS = [
    { name: 'Verdes sí, rojas no', rule: 'Tocá las <b>verdes</b>. Las <b class="no">rojas</b> no se tocan.', skill: 'Control de impulsos (ejercicio Go/No-Go): frenar el golpe cuando no corresponde.', need: 11, dur: 22, spawn: 1.0, life: 1.6, size: 80, mix: { go: 8, no: 2 } },
    { name: 'Más rápido', rule: 'Lo mismo, pero aparecen más rápido y duran menos.', skill: 'Velocidad de reacción: ver, decidir y tocar en menos tiempo.', need: 13, dur: 22, spawn: 0.7, life: 1.1, size: 76, mix: { go: 7, no: 3 } },
    { name: 'Dos colores buenos', rule: '<b>Verdes</b> y <b style="color:#4DA6FF">azules</b> sí. <b class="no">Rojas</b> no.', skill: 'Decisión con más opciones: elegir rápido entre varias señales.', need: 13, dur: 22, spawn: 0.8, life: 1.2, size: 76, mix: { go: 4, blue: 4, no: 3 } },
    { name: 'Al revés', rule: 'Ahora se tocan las <b class="no">rojas</b>. Las <b>verdes</b> no.', skill: 'Flexibilidad: cambiar una costumbre que el cerebro ya tenía automatizada.', need: 9, dur: 22, spawn: 0.85, life: 1.2, size: 76, mix: { go: 4, no: 5 }, invert: true },
    { name: 'Paciencia', rule: 'Las <b style="color:#FFD23A">amarillas</b> se tocan recién cuando se ponen <b>verdes</b>. Lento, pero sin apurarse.', skill: 'Esperar el momento justo: como dejar pasar la pelota y jugarla de la pared.', need: 10, dur: 24, spawn: 1.2, life: 2.4, size: 80, mix: { wait: 6, go: 2, no: 2 } },
    { name: 'Mirada al centro', rule: 'Mirá la pelota del centro. Las luces salen en los <b>bordes</b> y son más chicas.', skill: 'Visión periférica: ver a los rivales sin sacar los ojos de la pelota.', need: 12, dur: 22, spawn: 0.8, life: 1.15, size: 62, mix: { go: 7, no: 3 }, periph: true },
    { name: 'Doradas', rule: 'Las <b style="color:#FFD23A">doradas</b> valen triple pero son chicas y rápidas. Las <b class="no">rojas</b> no.', skill: 'Atención selectiva: encontrar lo importante entre muchas cosas.', need: 14, dur: 22, spawn: 0.65, life: 1.1, size: 72, mix: { go: 5, gold: 2, no: 3 } },
    { name: 'En movimiento', rule: 'Las luces <b>se mueven</b>. Verdes sí, rojas no.', skill: 'Seguimiento de objetos: como seguir la pelota y a los cuatro jugadores a la vez.', need: 11, dur: 22, spawn: 0.85, life: 1.7, size: 74, mix: { go: 7, no: 3 }, move: true },
    { name: 'Color, no palabra', rule: 'Tocá si el <b>color</b> es verde, aunque la palabra diga otra cosa.', skill: 'Efecto Stroop: ignorar la información que distrae y decidir bien igual.', need: 8, dur: 24, spawn: 1.0, life: 1.7, size: 92, mix: { word: 10 } },
    { name: 'Cambio de regla', rule: 'La regla cambia cada pocos segundos: mirá arriba si hay que tocar <b>verdes</b> o <b class="no">rojas</b>.', skill: 'Cambiar de plan en medio del punto sin perder la cabeza.', need: 10, dur: 26, spawn: 0.8, life: 1.2, size: 74, mix: { go: 5, no: 5 }, flip: 5 },
    { name: 'Todo junto', rule: 'Verdes, azules y doradas sí. Amarillas, esperá. Rojas no. Y se mueven.', skill: 'Todo lo anterior a la vez, como en un partido de verdad.', need: 16, dur: 26, spawn: 0.7, life: 1.4, size: 70, mix: { go: 4, blue: 2, gold: 1, wait: 2, no: 3 }, move: true },
    { name: 'Modo leyenda', rule: 'Rápido, chico, en los bordes y con cambio de regla. Suerte.', skill: 'Decidir bajo presión, que es lo que separa a los mejores.', need: 13, dur: 26, spawn: 0.6, life: 1.0, size: 62, mix: { go: 5, no: 4, gold: 1 }, periph: true, flip: 4 }
  ];
  // Fichas "La mente también se entrena". Solo datos con fuente; lo que es cálculo propio o consenso de entrenadores está aclarado.
  PP.MIND = [
    { t: 'Un golpe por segundo', b: 'En el pádel de élite un punto dura en promedio unos 9 segundos y tiene unos 9 golpes. Haciendo la cuenta, entre que pega el rival y te toca a vos pasa más o menos un segundo. Por eso acá el reloj corre: en la cancha tampoco hay tiempo para pensarlo.', s: 'Torres-Luque y otros, Revista Andaluza de Medicina del Deporte, 2015. El "un segundo" es una cuenta aproximada a partir de esos promedios.' },
    { t: 'El punto se decide en la red', b: 'En un análisis de pádel de élite, cerca del 60 % de los puntos se ganaron o se perdieron en la red. Saber cuándo subir, cuándo sacar al rival con un globo y cómo no perder la red vale tanto como pegarle fuerte.', s: 'Courel-Ibáñez y otros, 2015.' },
    { t: 'Los buenos no ven mejor: leen mejor', b: 'Un estudio con deportistas de élite encontró que la agudeza visual o la visión periférica no separan a los expertos de los principiantes. Lo que los separa es cómo procesan lo que ven: reconocen la jugada antes.', s: 'Revista Internacional de Medicina y Ciencias de la Actividad Física y el Deporte (UAM).' },
    { t: 'Mirá el brazo, no solo la pelota', b: 'Con lentes que registran la mirada, se vio que jugadores expertos de pádel miran la pelota y también el tronco, el brazo y la paleta del rival. En tenis, cuando a los expertos se les tapa el brazo y la raqueta del que saca, aciertan mucho menos adónde va. La pista está en el cuerpo del rival antes del golpe.', s: 'Estudio exploratorio con seguimiento de mirada en pádel; estudios de anticipación del saque en tenis.' },
    { t: 'Decidir rápido se entrena', b: 'En un estudio de entrenamiento en tenis, el grupo que practicó leyendo jugadas en secuencia decidió más rápido después, en una prueba en cancha. No es un don: mejora con práctica.', s: 'Broadbent y otros, PLoS ONE, 2017.' },
    { t: 'Los 20 segundos son tuyos', b: 'El reglamento da 20 segundos entre punto y punto. Es el único momento para pensar: respirar, hablar con tu pareja y decidir el plan del próximo punto. Durante el punto se ejecuta lo que ya decidiste.', s: 'Reglamento de pádel. Usar ese tiempo para planificar es consejo habitual de entrenadores.' },
    { t: 'Cómo subir de categoría', b: 'Lo que más repiten los entrenadores: moverse con la pareja como atados por una soga, usar el globo para recuperar la red, la bandeja para no perderla, jugar al medio cuando hay duda y decidir el golpe antes de que llegue la pelota. Cambiar de idea en pleno golpe casi siempre termina en error.', s: 'Consenso de guías de entrenadores de pádel; no son datos de un estudio.' }
  ];
  PP.PLAYS = [
    { q: 'Los dos rivales están pegados a la red y vos atrás. Te llega una pelota cómoda.', me: [2, 8], mate: [-2, 8], r1: [-2, -2.6], r2: [2, -2.6], ball: [2.7, 1, 7.6],
      opts: ['Globo profundo', 'Remate', 'Tiro fuerte al cuerpo'], why: 'El globo los saca de la red y te da tiempo para subir.', shot: [-2, -8.6, 2.0] },
    { q: 'Estás en la red y te tiran un globo profundo.', me: [2, 3.4], mate: [-2, 3], r1: [-2, -8], r2: [2, -8], ball: [2.5, 3.1, 5.2],
      opts: ['Bandeja', 'Remate a definir', 'Dejarla picar y esperar'], why: 'La bandeja no busca ganar el punto: busca que no pierdas la red.', shot: [-3, -8, 1.3] },
    { q: 'Estás en la red y el globo te queda corto y flotando.', me: [1.6, 3], mate: [-2, 3], r1: [-2, -8], r2: [2, -8], ball: [2.1, 3, 2.8],
      opts: ['Remate', 'Bandeja suave', 'Devolver otro globo'], why: 'Un globo corto es un regalo: se ataca con remate o víbora.', shot: [1.5, -5, 0.6] },
    { q: 'El globo te pasa muy alto y profundo. No llegás cómodo.', me: [2, 3.2], mate: [-2, 3], r1: [-2, -8], r2: [2, -8], ball: [2.2, 4.2, 7.6],
      opts: ['Dejarla y jugar de la pared', 'Saltar y rematar igual', 'Bandeja de espaldas'], why: 'Forzar un remate incómodo regala el punto. La pared te da otra oportunidad.', shot: [-2, -8.4, 2.0], move: [2, 8] },
    { q: 'Rivales en la red, vos atrás. La pelota te llega baja y lenta.', me: [1.6, 7.4], mate: [-2, 8], r1: [-2, -2.6], r2: [2, -2.6], ball: [2.2, 0.6, 7],
      opts: ['Chiquita a los pies y subir', 'Globo corto', 'Pegar fuerte a la reja'], why: 'La chiquita los obliga a volear desde abajo y te abre la subida a la red.', shot: [-1.6, -2.8, 1.1], move: [1.6, 3.5] },
    { q: 'Tu pareja sube a la red después de un buen globo.', me: [2, 8], mate: [-2, 3], r1: [-2, -8], r2: [2, -8], ball: [-1, 2.2, -7.6],
      opts: ['Subir con tu pareja', 'Quedarte atrás por las dudas', 'Ir al medio de la cancha'], why: 'La pareja se mueve junta, como atada con una soga. Si uno sube, suben los dos.', move: [2, 3] },
    { q: 'Estás en la red con una volea fácil y los rivales están separados.', me: [1.2, 2.9], mate: [-2, 3], r1: [-3.8, -7.5], r2: [3.8, -7.5], ball: [1.7, 1.4, 2.6],
      opts: ['Al medio, entre los dos', 'A la reja lateral', 'Dejada pegada a la red'], why: 'Al medio hay más cancha, menos riesgo, y los rivales dudan quién va.', shot: [0, -7, 0.8] },
    { q: 'Estás en la red y la pelota te llega por debajo de la cinta.', me: [1.5, 2.8], mate: [-2, 3], r1: [-2, -8], r2: [2, -8], ball: [2, 0.55, 2.5],
      opts: ['Volea profunda de control', 'Volea fuerte a definir', 'Remate'], why: 'Por debajo de la red no se define: se juega profundo y se espera la próxima.', shot: [-2, -8, 1.2] },
    { q: 'Tu pareja corre hacia atrás a defender un globo.', me: [2, 3], mate: [-2, 7.5], r1: [-2, -6], r2: [2, -6], ball: [-2.2, 3.4, 6.5],
      opts: ['Bajar y cubrir con tu pareja', 'Quedarte solo en la red', 'Cruzarte a su lado'], why: 'Si te quedás solo en la red dejás media cancha libre para el contraataque.', move: [2, 7.2] },
    { q: 'Acabás de sacar y el resto todavía no llegó.', me: [2, 7.2], mate: [-2, 3], r1: [-2, -8], r2: [2, -8], ball: [1.5, 1.2, -6.5],
      opts: ['Subir a la red detrás del saque', 'Quedarte en el fondo a esperar', 'Ir al medio de la cancha'], why: 'El saque es la mejor oportunidad para ganar la red: se saca y se sube.', move: [2, 3] },
    { q: 'Restás un saque cómodo y el que sacó viene subiendo a la red.', me: [2, 8], mate: [-2, 8], r1: [-2, -5], r2: [2, -2.6], ball: [2.6, 1, 7.6],
      opts: ['Resto bajo a los pies del que sube', 'Resto fuerte al cuerpo del que ya está en la red', 'Dejada'], why: 'El que sube todavía no está armado: una pelota baja a sus pies lo obliga a volear incómodo.', shot: [-2, -4.2, 1.0] },
    { q: 'Te llega una pelota muy fuerte y alta que va derecho a tu pared de fondo.', me: [2, 7.6], mate: [-2, 8], r1: [-2, -2.6], r2: [2, -2.6], ball: [2.4, 2.4, 6.2],
      opts: ['Dejarla pasar y jugarla después del rebote', 'Volearla de apuro', 'Bloquearla con la paleta arriba'], why: 'La pared le quita velocidad a la pelota y te regala tiempo para pegarle cómodo.', shot: [-2, -8.4, 2.0] },
    { q: 'Estás defendiendo en el fondo, los rivales dominan la red y la pelota te llega difícil.', me: [2.4, 8.6], mate: [-2, 8], r1: [-2, -2.6], r2: [2, -2.6], ball: [3.4, 0.7, 8.8],
      opts: ['Globo alto para ganar tiempo', 'Tiro fuerte paralelo', 'Dejada'], why: 'Con una pelota incómoda no se arriesga: el globo alto te da tiempo para volver a armarte.', shot: [-1, -8.6, 2.2] },
    { q: 'Tiraste un globo y te quedó corto. El rival se arma para rematar.', me: [2, 6], mate: [-2, 6], r1: [-2, -3], r2: [1.5, -3.4], ball: [1.5, 3.4, -3.6],
      opts: ['Quedarte atrás y prepararte para defender', 'Subir a la red igual', 'Quedarte quieto donde estás'], why: 'Con un globo corto viene un ataque. Atrás y bien parado tenés chance de devolverlo.', move: [2, 8.6] },
    { q: 'Tu globo pasó a los rivales y uno corre de espaldas a buscarlo.', me: [2, 8], mate: [-2, 8], r1: [-2, -7], r2: [2, -4], ball: [-2, 3, -8],
      opts: ['Subir a la red con tu pareja', 'Quedarte atrás', 'Subir solo vos'], why: 'Un buen globo es la llave de la red: cuando los rivales retroceden, se sube de a dos.', move: [2, 3] },
    { q: 'Estás por pegar una bandeja desde la mitad de tu cancha.', me: [2, 4.6], mate: [-2, 3.4], r1: [-2, -8], r2: [2, -8], ball: [2.4, 2.9, 4.6],
      opts: ['Profunda, buscando la esquina', 'Corta, cerca de la red', 'Con toda la fuerza al medio'], why: 'La bandeja profunda a la esquina obliga al rival a jugar con dos paredes y te deja volver a la red.', shot: [-4, -8.8, 1.3] },
    { q: 'Estás pegado a la red y te llega una volea alta y cómoda. Los rivales están en el fondo.', me: [1.6, 2], mate: [-2, 3], r1: [-2, -8.4], r2: [2, -8.4], ball: [2, 1.9, 1.8],
      opts: ['Volea corta y angulada para definir', 'Volea profunda de control', 'Globo'], why: 'Pelota alta, cerca de la red y rivales lejos: es el momento de definir con ángulo.', shot: [-4, -2.6, 0.7] },
    { q: 'Punto de oro y sacás vos.', me: [2, 7.4], mate: [-2, 3], r1: [-2, -8], r2: [2, -8], ball: [2.7, 1, 7],
      opts: ['Asegurar el primer saque y subir', 'Saque a matar', 'Saque raro para sorprender'], why: 'En el punto que define el game no se regala nada: primer saque adentro y a ganar la red.', shot: [-1.5, -5, 1.1], move: [2, 3] },
    { q: 'Estás en la red y te tiran una chiquita a los pies.', me: [1.6, 3], mate: [-2, 3], r1: [-2, -6], r2: [2, -6], ball: [2, 0.45, 3.2],
      opts: ['Flexionar y devolver baja, sin apurarte', 'Remate', 'Volea fuerte a ganar'], why: 'Desde abajo no hay ataque posible. Piernas flexionadas, pelota baja y a esperar la siguiente.', shot: [0, -6.5, 1.2] },
    { q: 'Te tiran un globo al medio y con tu pareja dudan quién va.', me: [1.6, 3], mate: [-1.6, 3], r1: [-2, -8], r2: [2, -8], ball: [0, 3.4, 4.6],
      opts: ['Avisar "mía" o "tuya" y va uno solo', 'Ir los dos por las dudas', 'Esperar a que vaya el otro'], why: 'La pelota del medio se pierde por no hablar. El que la pide la juega y el otro cubre.', shot: [3, -8, 1.3] },
    { q: 'El rival de la red se mete siempre al medio para cortar tus tiros.', me: [2, 8], mate: [-2, 8], r1: [-0.6, -2.6], r2: [2.6, -2.6], ball: [2.6, 1, 7.6],
      opts: ['Paralelo por el lugar que dejó libre', 'Al medio otra vez', 'Globo corto'], why: 'Si un rival se va al medio, deja su paralelo abierto. Se le juega ahí y deja de cruzarse.', shot: [-4.2, -6, 0.95] },
    { q: 'Les están ganando la red con globos una y otra vez.', me: [2, 2], mate: [-2, 2], r1: [-2, -8], r2: [2, -8], ball: [0, 2, -7.6],
      opts: ['Pararse un paso más atrás en la red', 'Pegarse todavía más a la red', 'Quedarse los dos en el fondo'], why: 'Muy pegado a la red cualquier globo te pasa. Un paso atrás cubrís el globo sin regalar la red.', move: [2, 3.6] },
    { q: 'Notaste que a un rival le cuesta mucho el revés.', me: [2, 3], mate: [-2, 3], r1: [-2.4, -8], r2: [2.4, -8], ball: [1.8, 1.4, 2.8],
      opts: ['Jugarle a ese revés con paciencia', 'Evitar tirarle para no despertarlo', 'Pegarle siempre lo más fuerte posible'], why: 'El pádel se gana insistiendo donde el rival sufre, no con un solo golpe ganador.', shot: [-1.2, -8, 1.0] },
    // Jugadas agregadas para el modo por etapas
    { q: 'Los rivales están en el fondo y ustedes dos en la red. Te llega una pelota a media altura.', me: [1.8, 3], mate: [-2, 3], r1: [-2, -8], r2: [2, -8], ball: [2.2, 1.2, 2.8],
      opts: ['Volea profunda al medio', 'Dejada', 'Globo'], why: 'Con los rivales atrás, la volea profunda al medio los mantiene lejos y les genera dudas.', shot: [0, -8.6, 1.0] },
    { q: 'La pareja rival se desarmó: uno quedó en la red y el otro atrás.', me: [2, 8], mate: [-2, 8], r1: [-2, -2.8], r2: [2, -8], ball: [2.4, 1, 7.4],
      opts: ['Tirar al hueco entre los dos', 'Globo al de atrás', 'Pegarle al de la red'], why: 'Cuando una pareja se desarma, el hueco entre los dos es lo más difícil de cubrir.', shot: [0.3, -5.2, 1.1] },
    { q: 'La pelota sale de la pared lateral muy pegada al vidrio.', me: [3, 8], mate: [-2, 8], r1: [-2, -3], r2: [2, -3], ball: [4.2, 1, 7],
      opts: ['Esperar que se despegue y jugarla cruzada', 'Pegarle antes de que toque el vidrio', 'Contrapared'], why: 'Esperar que se despegue del lateral te da espacio para pegar; apurarse contra el vidrio suele terminar en error.', shot: [-2.5, -7, 1.4] },
    { q: 'Te rematan fuerte y la pelota sale alta de tu vidrio de fondo.', me: [2, 7.6], mate: [-2, 7], r1: [-2, -3], r2: [2, -3], ball: [2.3, 2.2, 8.4],
      opts: ['Bajada de pared', 'Globo', 'Dejarla pasar'], why: 'Si la pelota sale alta del vidrio, es tu momento de atacar con una bajada a los pies.', shot: [-1.8, -4, 0.8] },
    { q: 'Vas ganando 40-0 y te llega una pelota dudosa para atacar.', me: [2, 8], mate: [-2, 8], r1: [-2, -3], r2: [2, -3], ball: [2.5, 1.1, 7.5],
      opts: ['Jugar seguro y profundo', 'Arriesgar a la línea', 'Dejada'], why: 'Con ventaja no hace falta arriesgar: un error regala confianza al rival.', shot: [0, -8.4, 1.4] },
    { q: 'El rival del revés se pega al vidrio lateral para defender.', me: [1.8, 3], mate: [-2, 3], r1: [-3.8, -8], r2: [2, -8], ball: [2.2, 1.3, 2.6],
      opts: ['Tirar al medio', 'Tirarle al vidrio de su lado', 'Globo a su lado'], why: 'Si se abre hacia el vidrio, el medio queda libre y su pareja duda.', shot: [-0.6, -7.8, 0.9] },
    { q: 'Tu globo quedó perfecto: los dos rivales corren hacia atrás.', me: [2, 8], mate: [-2, 8], r1: [-2, -8.6], r2: [2, -8.6], ball: [0, 3, -7.5],
      opts: ['Subir a la red con tu pareja', 'Quedarte atrás mirando', 'Subir solo vos'], why: 'Después de un buen globo la red queda libre: se sube en pareja, a la par.', move: [2, 3] },
    { q: 'Estás en la mitad de la cancha y te llega una pelota baja a los pies.', me: [2, 5.5], mate: [-2, 4], r1: [-2, -8], r2: [2, -8], ball: [2.3, 0.5, 5],
      opts: ['Volea de bloqueo y seguir hacia la red', 'Remate', 'Esperar a que pique dos veces'], why: 'En la zona de nadie, bloqueá suave y terminá de llegar a la red.', shot: [0, -6.5, 1.2], move: [2, 3] },
    { q: 'Estás en la red y el rival te tira un paralelo por tu lado.', me: [2.5, 3], mate: [-2, 3], r1: [-2, -8], r2: [2.5, -8], ball: [3.4, 1.2, 2.6],
      opts: ['Volea cruzada al hueco', 'Volea al mismo rival', 'Dejarla pasar'], why: 'La volea cruzada busca el espacio que dejó el rival al abrirse para el paralelo.', shot: [-3, -6, 0.9] },
    { q: 'El rival saca y sube a la red siempre de la misma manera.', me: [2, 8.4], mate: [-2, 4], r1: [2, -6], r2: [-2, -3], ball: [2.4, 0.9, 8],
      opts: ['Restar bajo a sus pies', 'Restar fuerte al vidrio', 'Restar siempre con globo alto'], why: 'Si sube rápido, el resto bajo a los pies lo obliga a volear desde abajo.', shot: [1.8, -3.2, 1.2] },
    { q: 'Tu pareja está en problemas defendiendo en el fondo y vos en la red.', me: [-1.8, 2.6], mate: [2.5, 8.4], r1: [-2, -3], r2: [2, -3], ball: [2.5, 2, 9],
      opts: ['Retroceder un poco para cubrir', 'Quedarte pegado a la red', 'Correr al fondo a ayudarla'], why: 'Si tu pareja defiende, dar un paso atrás evita que los ataquen fácil por tu lado.', move: [-1.6, 4.4] },
    { q: 'Te tiran una víbora que pica y se va contra la reja lateral.', me: [3, 7], mate: [-2, 7], r1: [-2, -3], r2: [2, -3], ball: [4.2, 0.6, 6],
      opts: ['Esperar el rebote y jugar al centro', 'Pegarle de volea antes', 'Darla por perdida'], why: 'Lo que rebota en la reja sale lento y bajo: paciencia y al centro.', shot: [0, -6, 1.4] },
    { q: 'Tenés una pelota alta cerca de la red y los rivales están atrás.', me: [1.6, 2.4], mate: [-2, 3], r1: [-2, -8], r2: [2, -8], ball: [1.8, 3.2, 2],
      opts: ['Remate por tres', 'Bandeja', 'Globo'], why: 'Pelota alta, cerca de la red y con los rivales atrás: es el momento de definir.', shot: [3.5, -4, 0.6] },
    { q: 'El rival remata mal y la pelota te queda a media altura, sin fuerza.', me: [2, 7], mate: [-2, 7], r1: [-2, -3], r2: [2, -3], ball: [2.3, 1.3, 6.4],
      opts: ['Contraatacar al medio', 'Globo defensivo', 'Dejada'], why: 'Una pelota sin fuerza se aprovecha: atacá al medio antes de que se acomoden.', shot: [0, -3.6, 0.8] },
    { q: 'Están en el tie-break y sentís la presión.', me: [2, 8], mate: [-2, 8], r1: [-2, -3], r2: [2, -3], ball: [2.3, 1.1, 7.5],
      opts: ['Jugar profundo y al medio', 'Buscar el golpe espectacular', 'Pegar todo fuerte'], why: 'En los puntos importantes gana la pareja que comete menos errores.', shot: [0, -8.4, 1.4] },
    { q: 'Estás en la red y la pelota viene muy rápida al cuerpo.', me: [2, 2.8], mate: [-2, 3], r1: [-2, -3], r2: [2, -3], ball: [2, 1.2, 2.5],
      opts: ['Bloquear con la paleta adelante', 'Correrte y pegar fuerte', 'Dejarla pasar'], why: 'Al cuerpo no hay tiempo de armar el golpe: paleta adelante y bloqueo.', shot: [0, -5, 1.0] },
    { q: 'Los rivales están cansados y les cuesta moverse.', me: [2, 8], mate: [-2, 8], r1: [-2, -8], r2: [2, -8], ball: [2.3, 1, 7.5],
      opts: ['Alternar chiquitas y globos', 'Pegar siempre fuerte', 'Jugarle siempre al mismo'], why: 'Mover al rival adelante y atrás castiga el cansancio más que la fuerza.', shot: [-1.5, -3, 1.3] }
  ];

  // Tienda: en esta demo los pagos son simulados. Los SKU son los que usaría la pasarela real.
  PP.SHOP = [
    { sku: 'gems_s', title: 'Puñado de gemas', give: { gems: 80 }, price: 'US$ 0,99', color: '#22E1FF' },
    { sku: 'gems_m', title: 'Bolso de gemas', give: { gems: 500 }, price: 'US$ 4,99', color: '#7B4DFF', badge: '+25%' },
    { sku: 'gems_l', title: 'Cofre de gemas', give: { gems: 1200 }, price: 'US$ 9,99', color: '#FF3D8B', badge: 'MEJOR VALOR' },
    { sku: 'starter', title: 'Pack Debutante', give: { gems: 150, coins: 3000, lives: 5 }, price: 'US$ 1,99', color: '#FFB020', badge: 'UNA SOLA VEZ', once: true },
    { sku: 'pass', title: 'Pase Pelotita', give: { pass: true, gems: 100 }, price: 'US$ 4,99 / mes', color: '#FFD23A', badge: 'VIDAS INFINITAS', desc: 'Vidas infinitas, doble de monedas y sin anuncios.' }
  ];
  // Jugadas PRO: 50 jugadas para copiar y subir en video, de la más fácil a la más difícil. [nivel, nombre, indicación]
  PP.CH_LEVELS = { 1: ['Básica', '#7CFF4D'], 2: ['Intermedia', '#22E1FF'], 3: ['Avanzada', '#FFB020'], 4: ['Profesional', '#FF3D8B'], 5: ['Para divertirse', '#C28BFF'] };
  PP.CHALLENGES = [
    [1, "Saque al medio", "Sacá por debajo de la cintura, con pique previo, y que la pelota caiga cerca de la línea central del cuadro de saque."],
    [1, "Saque al vidrio", "Sacá cruzado para que la pelota pique en el cuadro y vaya contra el vidrio lateral del que resta."],
    [1, "Diez derechas seguidas", "Peloteo de derecha con tu compañero: diez pelotas sin que se caiga. Contalas en voz alta."],
    [1, "Diez reveses seguidos", "Lo mismo, pero todo de revés. Diez seguidas sin errar."],
    [1, "Volea de derecha", "Parado cerca de la red, tres voleas de derecha seguidas, cortitas y firmes, sin dejar picar la pelota."],
    [1, "Volea de revés", "Tres voleas de revés seguidas desde la red, con la paleta adelante del cuerpo."],
    [1, "Globo alto", "Desde el fondo, un globo bien alto que pique pasando la línea de saque del otro lado."],
    [1, "Salida de pared de fondo", "Dejá que la pelota pique, pegue en el vidrio de fondo y devolvela de derecha por arriba de la red."],
    [1, "Resto cruzado", "Devolvé un saque cruzado y bajo, a los pies del que sacó."],
    [1, "Posición de espera", "Mostrá tu posición de espera: paleta arriba, rodillas flexionadas y saltito justo cuando el rival pega."],
    [1, "Subida a la red", "Pegá una pelota profunda y subí caminando hasta la red junto con tu compañero, los dos a la vez."],
    [1, "Dejada suave", "Desde la red, una volea cortita que pique dos veces antes de llegar a la línea de saque."],
    [2, "Bandeja cruzada", "Te tiran un globo: bandeja cruzada, sin saltar, que pique profundo y muera en el vidrio."],
    [2, "Bandeja paralela", "Bandeja por tu mismo lado, pegada al vidrio lateral."],
    [2, "Chiquita a los pies", "Desde el fondo, una pelota lenta y baja que caiga a los pies de los que están en la red."],
    [2, "Globo cruzado desde el fondo", "Globo cruzado que pase por arriba del jugador de red y lo obligue a correr hacia atrás."],
    [2, "Volea profunda al medio", "Volea firme entre los dos rivales, que pique cerca de la línea de fondo."],
    [2, "Salida de pared lateral", "La pelota pica y pega en el vidrio lateral: acompañala y devolvela cruzada."],
    [2, "Doble pared", "La pelota pega en el fondo y después en el lateral (o al revés). Girá con ella y devolvela."],
    [2, "Bajada de pared", "La pelota rebota alta en el vidrio de fondo: atacala de arriba hacia abajo, a los pies del rival."],
    [2, "Contrapared", "Pegale a la pelota contra tu propio vidrio de fondo para que pase al otro lado como un globo."],
    [2, "Volea de bloqueo", "Te tiran fuerte al cuerpo: poné la paleta firme y dejá que la pelota vuelva sola, corta."],
    [2, "Resto con globo", "Devolvé el saque con un globo profundo y ganá la red con tu compañero."],
    [2, "Saque y volea", "Sacá, subí y definí con la primera volea. Todo en un mismo video."],
    [2, "Remate al medio", "Remate plano entre los dos rivales, que pique y se vaya al vidrio de fondo."],
    [2, "Cambio de ritmo", "Tres pelotas lentas y la cuarta fuerte, para sorprender al rival."],
    [3, "Víbora", "Golpe de arriba con efecto lateral, cruzado, que pique y se meta contra la reja o el vidrio lateral."],
    [3, "Bandeja a la reja", "Bandeja buscando la reja lateral, para que el rebote salga para cualquier lado."],
    [3, "Remate por tres", "Remate con efecto que pique y salga de la cancha por arriba del vidrio lateral (tres metros)."],
    [3, "Rulo a la reja", "Remate liftado y corto que pica cerca de la red y se va contra la reja del costado."],
    [3, "Volea cortada que muere", "Volea con mucho corte que apenas rebota y se queda pegada al vidrio."],
    [3, "Dejada con retroceso", "Dejada con tanto efecto que, después de picar, vuelve hacia la red."],
    [3, "Globo de volea", "Desde la red y sin dejarla picar, un globo por arriba de los dos rivales."],
    [3, "Paralelo ganador", "Desde el fondo, una derecha paralela que pase entre el jugador de red y el vidrio lateral."],
    [3, "Passing al medio", "Los dos rivales en la red: pasá la pelota justo entre los dos, donde dudan quién va."],
    [3, "Salida de doble pared con globo", "De una doble pared difícil, sacá un globo profundo que te devuelva al punto."],
    [3, "Contraataque de bajada", "Te rematan, la pelota vuelve alta de tu vidrio: bajala fuerte y ganá el punto."],
    [3, "Bloqueo de remate", "Te rematan de cerca: bloqueá con la paleta y devolvé la pelota adentro."],
    [4, "Remate por cuatro", "Remate que pica y sale de la cancha por arriba del vidrio de fondo (cuatro metros)."],
    [4, "Traer la pelota de afuera", "El rival la sacó por tres: salí por la puerta, corré y devolvela desde afuera de la cancha."],
    [4, "Gancho", "Con la pelota alta del lado del revés, pegale por arriba de la cabeza sin cambiar la paleta de lado."],
    [4, "Volea entre las piernas", "Volea pegando la pelota por entre tus piernas, de frente a la red."],
    [4, "Gran Willy", "De espaldas a la red, corriendo hacia el fondo, pegale a la pelota por entre las piernas."],
    [4, "Golpe por la espalda", "Devolvé la pelota pasando la paleta por detrás de tu espalda."],
    [4, "Remate que vuelve a tu campo", "Remate tan fuerte que pica, pega en el vidrio de fondo rival y vuelve a tu lado sin que lo toquen."],
    [4, "Punto de más de veinte golpes", "Subí los últimos segundos de un punto largo de verdad, de más de veinte golpes."],
    [5, "El blooper", "Tu peor jugada: la que erraste más feo. Vale reírse."],
    [5, "Festejo de campeón", "Ganá un punto y festejalo como si fuera la final del mundo."],
    [5, "Punto con la mano cambiada", "Jugá un punto entero con tu mano menos hábil."],
    [5, "Jugada inventada", "Inventá un golpe que no exista y ponele nombre."]
  ];
  PP.GEM_SINKS = { refillLives: 30, continueMatch: 10, coinPack: { gems: 20, coins: 1500 } };
})();
