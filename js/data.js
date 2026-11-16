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
    { id: 'read', name: 'Leé la jugada', desc: 'Se congela el punto. Elegí el golpe correcto antes de que se acabe el tiempo.', color: '#FFB020' },
    { id: 'antic', name: 'Anticipación', desc: 'La pelota desaparece en el aire. Tocá donde creés que va a picar.', color: '#22E1FF' },
    { id: 'lights', name: 'Tablero de luces', desc: 'Tocá las luces verdes apenas aparecen. Las rojas no se tocan.', color: '#7CFF4D' },
    { id: 'ghost', name: 'Pelota fantasma', desc: 'Peloteo con la pelota que parpadea, como entrenar con lentes estroboscópicos.', color: '#FF4FA3' }
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
      opts: ['Bajar y cubrir con tu pareja', 'Quedarte solo en la red', 'Cruzarte a su lado'], why: 'Si te quedás solo en la red dejás media cancha libre para el contraataque.', move: [2, 7.2] }
  ];

  // Tienda: en esta demo los pagos son simulados. Los SKU son los que usaría la pasarela real.
  PP.SHOP = [
    { sku: 'gems_s', title: 'Puñado de gemas', give: { gems: 80 }, price: 'US$ 0,99', color: '#22E1FF' },
    { sku: 'gems_m', title: 'Bolso de gemas', give: { gems: 500 }, price: 'US$ 4,99', color: '#7B4DFF', badge: '+25%' },
    { sku: 'gems_l', title: 'Cofre de gemas', give: { gems: 1200 }, price: 'US$ 9,99', color: '#FF3D8B', badge: 'MEJOR VALOR' },
    { sku: 'starter', title: 'Pack Debutante', give: { gems: 150, coins: 3000, lives: 5 }, price: 'US$ 1,99', color: '#FFB020', badge: 'UNA SOLA VEZ', once: true },
    { sku: 'pass', title: 'Pase Pelotita', give: { pass: true, gems: 100 }, price: 'US$ 4,99 / mes', color: '#FFD23A', badge: 'VIDAS INFINITAS', desc: 'Vidas infinitas, doble de monedas y sin anuncios.' }
  ];
  PP.GEM_SINKS = { refillLives: 30, continueMatch: 10, coinPack: { gems: 20, coins: 1500 } };
})();
