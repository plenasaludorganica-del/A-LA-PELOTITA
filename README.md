# A la Pelotita · pádel arcade 3D

Juego de pádel por niveles para celular y compu. Corre en el navegador, sin instalación ni compilación:
HTML + JavaScript + Three.js (incluido en `vendor/`).

## Probarlo

**Enlace público para jugar y compartir:** https://a-la-pelotita.lovable.app

El juego está publicado dentro del proyecto de Lovable "A La Pelotita" (carpeta `public/juego/`). Ese sitio es una copia:
cuando cambia el código de este repositorio hay que volver a subir los archivos a Lovable y publicar de nuevo.
Antes de subir, correr `python3 tools/stamp.py`: marca cada archivo con su versión para que los celulares no usen una copia vieja.

Para probarlo en la compu sin publicar:

Servir la carpeta con cualquier servidor estático y abrir `index.html`:

```bash
python3 -m http.server 8080
```

Después abrir `http://localhost:8080`. También funciona publicado en GitHub Pages o dentro de Padel Coach
(como ruta o `<iframe src="index.html">`).

## Cómo se juega

Un solo control: **el jugador lo movés siempre vos** (ya no existe el modo "Fácil" que corría solo; desde el 19/11/2026).

- **Palanca fija en la esquina izquierda:** apoyás el pulgar en la mitad izquierda de la pantalla y el jugador va hacia donde apunta
  el dedo visto desde el centro de la palanca. En compu, WASD o flechas.
- **Pegar:** con el otro dedo, en la mitad derecha, deslizar de abajo hacia arriba. El **aro** en el piso marca dónde llega la pelota:
  pegar cuando se cierra da un **PERFECTO**. Si no llegaste a la pelota, sale "¡Lejos!". En compu también J K L, I globo, U O dejadas.
- La dirección del gesto apunta el tiro: derecho va **al medio**, inclinado abre hacia ese lado, **hacia abajo = globo**, gesto corto = dejada.
- A la derecha del jugador sale drive, a la izquierda revés, antes del pique volea.
- **Sin textos abajo mientras se juega** (`setHint` no muestra nada): la cancha se ve limpia. Cómo se juega está en "¿Cómo se juega?" del inicio.
- Lo mismo en el **Partido EN VIVO**: cada uno mueve a su jugador; si no llega a la pelota (más de `REACH` = 2,4 m) sale "¡No llegás!".

Si la pelota viene alta sale bandeja, víbora o remate, y un remate perfecto **la saca por 3**.
Los perfectos y buenos cargan el **especial** (botón redondo o barra espaciadora).

## Qué trae

- 40 niveles en 4 mundos (Club del Barrio, Playa Pádel, Neón City, World Tour) con 4 jefes.
- 4 tipos de nivel: partido, puntería con blancos, peloteo y jefe.
- 4 jugadores con atributos, mejoras y un especial distinto cada uno.
- Estrellas por nivel, combos, categorías de pádel (8va → LEYENDA), misiones diarias, premio diario con racha,
  cofre cada 3 victorias, vidas que se recargan con el tiempo.
- Tienda con monedas, gemas y Pase Pelotita. **Los pagos son simulados** (ver abajo).

## Gimnasio mental

Modo de entrenamiento táctico y visual, con un "IQ de pádel" que sube con la mejor marca de cada ejercicio:

- **Leé la jugada:** se congela un punto de dobles y hay que elegir el golpe correcto. Es por etapas y casi infinito:
  5 jugadas por etapa, cada etapa con menos segundos (10, 8,5, 7, 6, 5… hasta 2,5) y la pelota más rápida; 3 vidas,
  puntos multiplicados por etapa y bonus por racha. 40 jugadas en `PP.PLAYS` dentro de `js/data.js`; para sumar una alcanza con agregar un objeto.
  Las jugadas están en `PP.PLAYS` dentro de `js/data.js`; para sumar una alcanza con agregar un objeto.
- **Anticipación** (oculto por ahora, no funcionaba bien; se reactiva quitando `hidden: true` en `PP.DRILLS`): la pelota desaparece en el aire y hay que tocar dónde va a picar.
- **Tablero de luces:** entrenamiento del cerebro por niveles (`PP.LIGHT_LEVELS` en `js/data.js`), con 3 vidas. Cada nivel tiene
  una meta de aciertos en un tiempo; si no se llega, se pierde una vida y se repite. Doce niveles basados en ejercicios de
  psicología cognitiva: Go/No-Go (verdes sí, rojas no), más velocidad, dos colores buenos, regla al revés, paciencia
  (amarillas que se ponen verdes), visión periférica, doradas que valen triple, luces que se mueven, efecto Stroop (color
  contra palabra), cambio de regla, todo junto y modo leyenda. Después del 12 vuelve a empezar, cada vuelta un 15 % más rápida.
- **Pelota fantasma:** peloteo con la pelota que parpadea.

## Personajes

Los jugadores, jefes y rivales son pixel art animado por cuadros. Cada uno tiene un atlas de 8 poses en
`assets/sprites/` (espera, corrida ×2, festejo, armado, golpe, remate, derrota).
`tools/slice-sprites.py` arma el atlas a partir de planchas PNG con fondo transparente.

## Comunidad

Pantalla con cuatro pestañas: **Ranking** (estrellas, IQ de pádel, pronósticos acertados), **Torneos**, **Sponsors** y **Cuenta**.

- **Cuenta:** registro con mail, contraseña, nombre, categoría y lado.
- **Torneos (solo PRO):** verlos y pronosticar es para todos; anotarse y crear torneos es para PRO (reglas `tp_ins` y `t_ins`). Cualquier usuario PRO crea uno (peloteo por puntos o Leé la jugada, individual o parejas, día, hora y duración).
  Al crearlo sale un cartel para capturar, con código y enlace (`#torneo-CODIGO`). Mientras está en juego cada inscripto
  juega las veces que quiera y cuenta su mejor turno. Gana el mayor puntaje al cierre.
- **Pronósticos:** gratis y sin plata. Cada usuario elige un ganador hasta 5 minutos antes del inicio.
- **Sponsors:** solo dos rubros (cancha o club, tienda de insumos de pádel). Cada pedido queda en revisión hasta aprobarlo.

### Jugadas PRO (suscripción)

Botón "Jugadas PRO" en el inicio y pestaña **Jugadas** en Comunidad.

- **Gratis:** cualquiera ve las 50 jugadas con su indicación, de la más fácil a la más difícil (`PP.CHALLENGES` en `js/data.js`).
- **Con suscripción Pro:** subir hasta 12 videos por mes (máximo 20 segundos). Si el video pesa más de 8 MB, el juego lo
  achica en el mismo celular a 720p antes de subirlo (unos 3 a 7 MB), sin servicios pagos; el servidor acepta hasta 15 MB, ver los videos de los demás
  y votar con me gusta. Cada video queda en revisión hasta que la administración lo aprueba.
- **Administración** (cuentas con `is_admin` en la tabla `profiles`): en la misma pantalla aparecen "Revisar videos"
  (aprobar o rechazar) y "Usuarios": buscador por nombre o mail, estado Pro de cada cuenta y botones para dar un mes o quitar el Pro.
- **Buscador de jugadores:** en la pestaña Ranking, cualquiera con cuenta busca a otro jugador por nombre.
- **Privacidad:** cada jugador lee solo sus datos; el ranking, el buscador y los torneos se ven con cuenta y solo muestran lo público.
- **Pago:** además de Jugadas, la pestaña Cuenta muestra el precio y el botón "Pagar con Mercado Pago".
- **Cobro:** pago único con Mercado Pago que habilita 30 días de Pro (no es débito automático). El botón "Quiero ser PRO"
  llama a `/api/public/pro-checkout` del proyecto de Lovable, que crea el pago; cuando Mercado Pago avisa que se aprobó,
  el servidor suma 30 días al alta (`vip_until`) una sola vez por pago. El precio en pesos está en la tabla `app_settings`
  (clave `pro_price_ars`); vacío = cobro deshabilitado y el cartel pide el alta manual. La administración también puede
  dar el alta a mano. La clave de Mercado Pago está guardada como secreto en Lovable, no en este repositorio.
- Los topes los hace cumplir el servidor (`supabase/schema.sql`): nadie puede darse el alta solo ni pasar de 12 videos por mes.

### Panel de administración

En la compu: **https://a-la-pelotita.lovable.app/juego/admin.html** (archivo `admin.html`). Se entra con la cuenta
administradora del juego; cualquier otra cuenta ve "no es administradora". Muestra estadísticas (usuarios, activos,
Pro activos, los que no renovaron, ingresos, videos, opiniones), las **opiniones** de "Dejá tu opinión" (privadas,
solo las lee la administración), el listado de **usuarios** con buscador, filtros y descarga en planilla, los **pagos**
y los **videos por revisar**. Todo se lee con funciones del servidor que rechazan a quien no es administrador.

### Servidor

El servidor ya está conectado: es la base Supabase de un proyecto de Lovable Cloud llamado **"A la Pelotita Servidor"**
(la dirección y la clave pública están en `js/config.js`). Cuentas, ranking, torneos y pronósticos se comparten entre jugadores.

- Las tablas y reglas son las de `supabase/schema.sql`. Si cambia ese archivo hay que volver a ejecutarlo en la base
  (en Lovable: abrir el proyecto → Cloud → Database, o pedírselo a Claude).
- El registro entra directo, sin confirmar el mail. El servidor rechaza contraseñas muy comunes.
- Para aprobar un sponsor: en Lovable, proyecto "A la Pelotita Servidor" → Cloud → Database → tabla `sponsors` → poner `approved` en `true`.
- Para volver al modo demo (todo guardado en el dispositivo) alcanza con vaciar los dos valores de `js/config.js`.
- Para usar otro proyecto de Supabase: ejecutar `supabase/schema.sql` en su SQL Editor y pegar en `js/config.js` la URL y
  la clave pública (**anon** o **publishable**; nunca `service_role` ni `secret`).

La clave anon es pública por diseño; lo que protege los datos son las reglas del archivo SQL
(cada uno edita solo lo suyo, los pronósticos se bloquean 5 minutos antes, los puntajes solo durante el torneo).
Está probado con dos usuarios contra el servidor real (altas, ranking, sponsors, torneo, pronósticos, plazos y permisos).
**Falta la prueba con dos celulares de verdad.** Los puntajes los informa el propio juego,
así que alguien con conocimientos técnicos podría inflar el suyo; alcanza para un piloto, no para premios.

## Estado y próximos pasos

Hecho: juego por niveles, personajes animados, control fácil y pro, Gimnasio mental, tienda piloto, opiniones, comunidad conectada al servidor.

Pendiente, en orden sugerido:

1. Probar cuentas, ranking y un torneo entre dos celulares de verdad.
   Probar también Jugadas PRO con un video grabado desde un celular.
   Cargar la clave de producción de Mercado Pago y el precio, y probar un pago real de punta a punta.
2. Mail de recuperación de contraseña (falta el servicio de mail propio) y pantalla para aprobar sponsors sin entrar a Supabase.
3. Guardar el progreso del juego en la cuenta (hoy queda en el dispositivo).
4. Cobros reales: pasarela de pago para gemas y Pase.
5. Más ejercicios mentales y más jugadas para leer.
6. Instalable como app y registro anónimo de uso.

## Estado de la mudanza al servidor propio (noviembre 2026)

- **Servidor:** proyecto de Supabase `a-la-pelotita-sp` (id `lldifserfqgnjowgrfej`, São Paulo), plan gratis.
  Tiene todo `supabase/schema.sql` y las funciones `supabase/functions/` (`signup`, `pro-checkout`, `mp-webhook`).
  El proyecto viejo `a-la-pelotita` (Ohio, vacío) quedó pausado.
- **Sitio:** https://alapelotita.com/ (también www.alapelotita.com y https://a-la-pelotita.pages.dev/). Cloudflare Pages, proyecto `a-la-pelotita`.
  Dominio comprado en Cloudflare el 18/11/2026, vence el 18/11/2027 (renovación automática). Los dos registros CNAME (`@` y `www`) apuntan a `a-la-pelotita.pages.dev`.
  **Se publica solo:** cada cambio que se sube a la rama `claude/inspiring-cori-unoeia` (o `main`) lo publica
  `.github/workflows/publicar.yml`, con el secreto `CLOUDFLARE_API_TOKEN` guardado en GitHub. Panel: `/admin.html`.
- **Mercado Pago:** el secreto `MERCADO_PAGO_ACCESS_TOKEN` ya está en Supabase. Precio en `app_settings.pro_price_ars` (7999).
  `app_settings.site_url` apunta a https://alapelotita.com/index.html (ahí vuelve la gente después de pagar). Falta un pago real de prueba.
- **Administración:** `padelcoach.ar@gmail.com` es administradora (PRO gratis y panel). `gabrielcaranlarrosa@outlook.com`
  recupera el Pro que pagó (hasta el 18/12/2026) al registrarse. Lo hace la función `mark_admin` de la base.
- **Comunidad:** ranking top 20 con el puesto propio, seguir jugadores (pestaña Siguiendo) e invitaciones a torneos
  (tablas `follows` y `tournament_invites`). La ventana "Hacete PRO" se abre al crear la cuenta y con "Quiero ser PRO".
- **Antes de cada publicación:** correr `python3 tools/stamp.py` para que los celulares bajen los archivos nuevos.
- **Próximo:** @usuario único, recuperar contraseña, progreso en la cuenta, planillas de pagos y opiniones, cobro internacional.
- **Plan:** seguir en el plan gratis de Supabase hasta tener ingresos; después pasar a Pro (USD 25 por mes).

## Estadísticas en el panel (en vivo y anónimas)

Panel → arriba **🟢 En vivo ahora** (se actualiza cada 20 s: cuántos hay, con o sin cuenta y en qué pantalla) y la pestaña
**Estadísticas**: visitantes de hoy (con y sin cuenta, nuevos), últimos 7 y 30 días, los que vuelven, partidas de hoy,
visitantes por día (14 días), **juegos que más se juegan** (partidas, jugadores, duración, % que ganó y % que abandonó) y
desde qué dispositivo. Cada navegador tiene un número al azar (`pelotita.vid`): no se guarda nombre, mail ni IP.
Juego: `js/track.js` (`PP.Track.start/end` al empezar y terminar cada partida). Servidor: `supabase/analytics.sql` (ya aplicado).

## PLAN PARA EL LUNES: vidas pagas (anotado el 19/11/2026)

**Hoy:** 5 vidas, se recupera 1 cada 15 minutos (`MAX_LIVES`, `LIFE_MS` en `js/game.js`). Sin vidas aparece `showNoLives`:
recargar con 30 gemas, un "anuncio" de prueba (no muestra nada real) y el "Pase Pelotita" de prueba. **Ojo:** la tienda todavía es
de prueba (`PP.Store.purchase` aprueba todo sin cobrar): hay que arreglarlo antes de cobrar cualquier cosa.

**Lo que hay que hacer:**
1. **Esperar o pagar:** sin vidas, elegir entre esperar (cuenta regresiva, recarga **1 vida cada 10 minutos**) o comprar vidas
   por Mercado Pago: **5 vidas a ~$100** o **vidas infinitas por 24 h a ~$200** (precios a confirmar, guardados en `app_settings`).
2. **Primero gratis:** las primeras 3 veces que alguien se queda sin vidas, la recarga es regalo (para que se enganche).
3. **Para todos, gratis y PRO.** A definir: ¿el PRO tiene más vidas o recarga más rápido como beneficio?
4. **Reglas de juego limpio (no negociables):** pagar da más intentos, **nunca** más suerte. No cambia la dificultad, la física,
   al rival ni los puntos. Precio claro antes de pagar, nada que se cobre solo, nada de ofertas engañosas.
5. **Copa y torneos:** las partidas de la Copa **no gastan vidas**, así comprar vidas no da ventaja para el premio.
6. **Técnico:** las compras de vidas van al servidor (como el PRO: `pro-checkout` + `mp-webhook`), así no se pierden al cambiar
   de celular y no se pueden inventar editando el celular. Las vidas no cuestan nada de servidor; solo la comisión de Mercado Pago
   (~7,6% al instante: ~$8 de cada $100).
7. Sacar el "anuncio" y el "Pase Pelotita" de prueba, o hacerlos reales.

## Tienda de ropa y Vestidor (EN PREPARACIÓN: está en la rama `ccr-ff06bfe6-9pwvjs`, no publicada)

Botón **Tienda** del inicio → "Tienda y vestidor". Cada jugador arma **su propio muñeco** y lo viste con ropa y accesorios
comprados con **Pelotitas**. Es solo apariencia: no cambia la fuerza, los puntos ni nada del juego.

- **Muñeco por capas** (`js/avatar.js`): lo dibuja el juego en pixel art (112×144, agrandado ×2 con contorno), con 8 poses
  como los personajes de siempre. De espalda en la cancha (atlas 896×576 para `S.makeSpriteChar`) y de frente en el vestidor y el inicio.
  Capas: cuerpo (varón o mujer), piel (6), ojos (6), cejas, barba o bigote, 12 peinados ("pelucas") y 12 colores de pelo,
  remera/chomba/manga larga/top corto/musculosa, short/bermuda/calza/pollera, medias (3 alturas), zapatillas, gorra/visera/vincha,
  muñequeras, mochila o paletero, paleta y color de la pelotita.
- **Diseños** (sacados de las fotos de referencia, sin marcas): lisa, rayas, franjas, bicolor, franja al medio, cuadrillé, degradé,
  degradé con puntos, degradé zigzag, paneles curvos con ribete, raglán, camuflada, Rayo, Grieta, oro y plata.
- **Catálogo** (`js/ropa.js`): ~340 artículos en conjuntos, remeras, tops y polleras, shorts, zapatillas, medias, gorras y vinchas,
  bolsos y muñequeras, paletas, pelotitas de juego y Colección PRO. Marcas propias del juego: Pelotita (común, 80),
  Bandeja (especial, 180), Víbora (épica, 350) y Por 3 (legendaria, 700). **Nunca marcas reales ni parecidas.**
- **Se desbloquea jugando:** especial desde 7ma, épica desde 5ta, legendaria desde 3ra (`R.TIERS`).
- **PRO:** cambia todo su físico (sin PRO: 3 peinados y 4 colores de pelo), Colección PRO exclusiva y 20 % menos en todo.
- **Mi casillero:** todo lo comprado. "Jugar con mi jugador" usa el muñeco en partidos, gimnasio, inicio y partido en vivo.
- **Portadas** de cada categoría hechas con Higgsfield (`assets/tienda/`), sin marcas.
- **Pendiente antes de abrirla:** las Pelotitas y lo comprado se guardan hoy en el dispositivo (`pelotita.ropa`, arranca con 150 de regalo):
  hay que pasarlos al servidor y conectar los paquetes de Pelotitas ($200 = 200, $500 = 550, $900 = 1.100) a Mercado Pago, como el PRO.
  Mostrar el muñeco de cada uno a los demás (partido en vivo, ranking) también necesita guardar el "look" en el servidor.

## Tiras visuales (solo PRO, no suma puntos)

Gimnasio mental → **Tiras visuales · PRO**. Entrenamiento visual y cognitivo con tiras largas en la pantalla, inspirado en las
herramientas de entrenamiento visual deportivo (tiras con números en hexágonos, palabras de colores, flechas y símbolos) y en
ejercicios conocidos de terapia visual y vestibular. Es **independiente de todo**: no suma puntos, IQ, Copa ni ranking.
Solo guarda en el dispositivo qué tarjetas hiciste (`pelotita.vis`). Archivo: `js/vision.js`.

- **57 tarjetas en 13 grupos:** precisión de la mirada, saltos de mirada (sacádicos), seguimiento, mirada firme con la cabeza en
  movimiento (VOR x1 y x2), enfoque cerca y lejos (tabla de Hart, cuerda de Brock, convergencia), visión periférica (tabla de Schulte),
  control de impulsos (Stroop, Go/No-Go, flechas al revés), memoria visual (con ojos cerrados), doble tarea con pelotita, con un ojo
  tapado (parche), equilibrio, con compañero y rutinas armadas (activación de 5 minutos y plan de 3 semanas). Cada una dice
  para qué sirve, cómo se hace, cómo hacerla más difícil y el beneficio en la cancha. Para sumar una: agregar un objeto a `C`.
- **Tiras al azar** (nunca se repiten): números en hexágonos de 4 colores, palabras de colores, flechas en 8 direcciones,
  símbolos, letras de Sloan (las de los oculistas), letras que se achican, mixta y tabla del 1 al 25. Una o dos tiras.
- **Fondo liso** (sin distracción) o **fondo en movimiento** (manchas y franjas). Punto central para la periférica.
- **Herramientas:** metrónomo (40 a 160), llamadas por voz (la app dice un objetivo cada 3,5 s), "Mirá y tapate" (la tira se ve
  2 a 5 s y se tapa), cronómetro y "Nueva tira". La pantalla no se apaga mientras se entrena.
- **PRO:** cualquiera ve las tarjetas; abrir las tiras pide PRO (si no tiene cuenta, la crea; si no es PRO, se abre "Hacete PRO").
- No se usa el nombre de ninguna marca comercial. Incluye avisos de cuidado (mareo, dolor de cabeza, visión doble, consultar al oculista).

## Panel de cada jugador

Tocando a cualquier jugador (ranking, Siguiendo, torneos, Copa, desafíos o el autor de un video) se abre su panel: categoría,
lado, estrellas, nivel, IQ, aciertos, seguidores, videos y me gusta, con botones **Seguir** y **Desafiar** (crea un 1 contra 1 y lo
invita). Los PRO ven ahí **sus videos publicados** y los votan con ♥. Servidor: función `player_profile` (`supabase/schema.sql`).

## Partido EN VIVO (1 contra 1 y 2 contra 2)

En **Con amigos**, arriba: todos en la misma cancha al mismo tiempo, cada uno desde su celular, a 5 puntos. Se juega **sin cuenta**
(pide un nombre) o con cuenta.
- **Con cualquiera, ya:** "1 contra 1" o "2 contra 2" busca una sala abierta o crea una. Si en 25 s no se completa, arranca con
  jugadores de la máquina. Las dos primeras personas quedan en equipos contrarios.
- **Con amigos:** "Sala 1 vs 1" o "Sala 2 vs 2" da un **código de 5 letras** y un enlace `alapelotita.com/#vivo-CÓDIGO` para WhatsApp.
  Arranca sola cuando están todos, o el anfitrión 👑 la empieza antes y completa con la máquina.
- **Cómo se juega:** cada uno mueve a su jugador con la palanca de la esquina izquierda; al que le toca le aparece el aro, va hasta ahí y desliza
  el dedo para pegar y apuntar. Después de cada punto cada uno vuelve a su lugar. En 2 contra 2 cada uno cubre su mitad de la cancha. Cada uno ve la cancha desde su lado.
- **Cómo se sincroniza:** solo viajan los golpes (desde dónde, hacia dónde, cuánto tarda y cuándo); cada celular calcula la pelota con
  la misma física. Las posiciones se mandan ~6 veces por segundo. El anfitrión saca, decide los puntos (espera unas décimas antes de
  cobrar un doble pique, por si el golpe del rival viene en camino) y maneja a la máquina. Si se va, toma su lugar el siguiente.
- **Conexión:** consultas cortas al servidor (no WebSocket). Funciona bien con la demora normal de Argentina a São Paulo.
- Archivos: `js/live.js` (juego) y `supabase/live.sql` (salas, latido y eventos; ya aplicado). Las salas se borran solas al día.

## Jugar con amigos (Desafíos)

Botón **Con amigos** en el inicio (muestra cuántas invitaciones o turnos pendientes tenés). Etapa 1: **por turnos**.
- **Formatos:** 1 contra 1 o 2 contra 2. **Juegos:** Peloteo por puntos, Leé la jugada o Tablero de luces. Duración: 1 hora, 1 día o 3 días.
- **Con quién:** con amigos (se invita a quienes seguís; en 2 contra 2 elegís **compañero** y **rivales**), **abierto a cualquiera**
  (aparece en "Abiertos a cualquiera") o pasando el **código** / el enlace `alapelotita.com/#desafio-CÓDIGO` por WhatsApp. **Solo:** el circuito de siempre.
- **Reglas:** cada jugador tiene **un solo turno** (si sale antes de terminar, cuenta lo que hizo). Gana el equipo que suma más.
  Termina cuando jugaron todos o al cierre. Después, botón **Revancha**.
- **Servidor:** `supabase/duels.sql` (ya aplicado). Tablas `duels`, `duel_players`, `duel_invites` sin acceso directo; todo por funciones
  que validan cuenta, lugar en el equipo, un turno por jugador y el cierre. Pantalla: `js/duel.js`.
- **Etapa 2 (hecha):** ver "Partido EN VIVO".

## Partidos y pantalla horizontal

- **Movimiento real:** los jugadores ya no se quedan en el fondo. Con el saque, un buen globo o una bandeja suben a la red;
  con un golpe flojo vuelven a defender; en la red **volean** la pelota en el aire (`predict` en `js/game.js` busca la volea
  cuando el jugador está cerca de la red). Posiciones: `NET_Z` (red), `BACK_Z` (fondo).
- **Cada rival tiene su juego** (`rivalStyle`): **atacante** (vive en la red), **defensor** (espera atrás) o **mixto**. Se muestra
  junto al objetivo del nivel. El rival elige el golpe según dónde estás: si estás en la red te tira **globos** o te pasa por
  el costado; si estás atrás y él en la red, te tira **dejadas**. Se puede fijar el estilo de un nivel con `style` en `PP.LEVELS`.
- **Horizontal:** al empezar un partido en el celular se pide jugar acostado. En Android se pone pantalla completa y se gira sola;
  en iPhone (la web no puede girarla) aparece "Girá el celular" y el partido se pausa hasta girarlo. Hay un botón
  "Seguir en vertical" que queda guardado. En horizontal la cámara se acerca, el inicio va en dos columnas y los controles
  quedan en las esquinas. Los ejercicios del Gimnasio mental funcionan en las dos posiciones.

## Copa de la Cancha

Competencia con premio real (por ejemplo, "1 hora de cancha"), independiente del ranking general, la tienda y los torneos.
**Solo para PRO:** la ve cualquiera (barrita, ranking), pero inscribirse es para jugadores PRO (lo valida `cup_join`). Al que no es PRO
le aparece "Solo para jugadores PRO" y la ventana con los beneficios y el pago.
Botón propio en el inicio. El nombre se cambia en un solo lugar: `PP.CUP.name` en `js/data.js`.

- **Jugador:** ve la Copa activa (cancha, premio, precio y cuenta regresiva), toca "Quiero participar" (necesita cuenta) y
  ve el precio y cómo pagar. Gratis = entra al instante; con precio = queda **pendiente** hasta que la administración la apruebe.
  Solo los aprobados suman al ranking de la Copa (top 100 y el puesto propio).
- **Puntaje:** cuentan todos los juegos del registro central `PP.GAMES` (`js/data.js`). Por cada juego vale la mejor marca durante
  la Copa. Total = suma de las mejores marcas. Desempate: gana quien llegó primero a ese total.
  Con tope 100: los **niveles** valen según la dificultad (`weight`): el 1 hasta 50 puntos y el 40 hasta 100 (3 estrellas = el máximo
  de ese nivel). **Tablero de luces:** 24 niveles superados = 100. **Leé la jugada:** 50 jugadas bien = 100. El resto, 0 a 100.
  Máximo posible: 3400. El tope existe para que ningún juego decida solo la Copa y para limitar el efecto de una trampa.
  Cada juego avisa con `PP.Cup.report(id, puntajeCrudo)` al terminar; los envíos que fallan o llegan muy seguidos quedan en cola.
- **Sumar un juego nuevo:** agregar un objeto `{ id, name, max }` a `PP.GAMES`, la misma `id` en la tabla `cup_games`
  (`supabase/cups.sql`, una línea) y llamar a `PP.Cup.report(id, puntaje)` cuando termina la partida.
- **Ganador:** al cierre (o al cerrarla antes desde el panel) el servidor elige al ganador y le da un **código de canje de 6 caracteres**.
  El ganador coordina día y hora con la cancha fuera de la app y muestra el código. En el panel se marca como canjeado.
- **Panel de administración** (dentro del botón, solo para los mails de la tabla `admins`): crear y editar Copas (nombre, cancha,
  premio, inicio, cierre, precio en pesos, cómo pagar y puntos máximos por juego), ver inscriptos, aprobar (pagó) o rechazar
  (no pagó), cerrar antes de tiempo y marcar el premio como canjeado.
- **Pago:** hoy es manual. El único punto para enchufar Mercado Pago es `PP.CupPayment.checkout` en `js/cup.js`.
- **Seguridad:** todo en `supabase/cups.sql`. Las tablas (`admins`, `cup_games`, `cups`, `cup_entries`, `cup_scores`) tienen RLS
  y no se leen ni se escriben directo: todo pasa por funciones `security definer`. El puntaje entra solo por `cup_submit`, que valida
  jugador aprobado, Copa en curso, juego válido, 0 <= puntaje <= tope, que mejore la marca anterior y 15 segundos entre envíos.
  Igual que en el resto del juego, el puntaje lo calcula el celular: las reglas acotan cuánto se puede inflar, no lo hacen imposible.
- **Estado:** `supabase/cups.sql` ya está aplicado en el servidor (19/11/2026) y `padelcoach.ar@gmail.com` está en `admins`.
  Para sumar otra administradora: `insert into admins (email) values ('mail-en-minusculas') on conflict do nothing;`.
  Si cambia `cups.sql`, volver a ejecutarlo entero en el SQL Editor (es idempotente).
- **Modo demo:** funciona sin servidor (todo en el dispositivo, mismas reglas). La administración en demo es la cuenta
  `admin@demo.com` (se cambia con `cupDemoAdmins` en `js/config.js`).

**Barrita de la Copa en el inicio:** mientras haya una Copa próxima o en juego, arriba del inicio pasa una barrita con el nombre,
el premio, la cuenta regresiva y el top 3 en vivo (se actualiza cada minuto). La ve todo el mundo, con o sin cuenta; al tocarla
se abre la Copa. Cuando termina, muestra al ganador. Está en `js/cup.js` (función `paintBar`).

**Cartel de novedades:** al abrir el juego, una vez por día, aparece "¡Estamos creando algo increíble para vos!" con un botón
para compartir (WhatsApp o el menú de compartir del celular). Está en `js/cup.js` (función `news`).

## Entrar con Google (listo en el juego, falta activarlo)

El botón "Entrar con Google" aparece cuando `googleLogin: true` en `js/config.js`. La primera vez crea el perfil con el nombre
de Google. Antes hay que configurarlo (una sola vez):
1. Google Cloud Console → crear un proyecto → **Pantalla de consentimiento OAuth** (externa, nombre "A la Pelotita") →
   **Credenciales → Crear ID de cliente OAuth** tipo "Aplicación web", con URI de redireccionamiento autorizado
   `https://lldifserfqgnjowgrfej.supabase.co/auth/v1/callback`.
2. Supabase → Authentication → Sign In / Providers → **Google**: activar y pegar el ID de cliente y el secreto.
3. Supabase → Authentication → URL Configuration: Site URL `https://alapelotita.com` y en Redirect URLs `https://alapelotita.com/**`.
4. Poner `googleLogin: true` en `js/config.js`.

## Contraseñas

- **Ojito** para ver u ocultar la contraseña al entrar, al crear la cuenta, al cambiarla y en el panel de administración.
- **Cambiar contraseña:** en Comunidad → Cuenta, con la sesión abierta.
- **¿Te olvidaste la contraseña?** (en "Ya tengo cuenta"): primero intenta mandar el mail de recuperación de Supabase; el enlace
  vuelve al juego, que pide la contraseña nueva. **Hoy ese mail no les llega a los jugadores:** sin un servicio de mail propio
  (SMTP), Supabase solo manda mails al equipo del proyecto. Mientras tanto, el juego ofrece "Pedir ayuda": el pedido llega a
  la administración en **Opiniones** (nombre "Recuperar contraseña"), con el mail y cómo avisarle.
- **La administración le pone una contraseña nueva:** panel → Usuarios → botón **Contraseña** en la fila del jugador (propone una
  al azar). Lo hace la función del servidor `supabase/functions/admin-password` (solo para administradoras: `profiles.is_admin`
  o el mail en `admins`), que usa `user_id_by_email` (solo la puede usar el servidor).
- **Para que el mail de recuperación funcione** (pendiente): crear una cuenta en un servicio de mail (por ejemplo Resend, que tiene
  plan gratis), verificar el dominio alapelotita.com en Cloudflare y cargar los datos SMTP en Supabase → Authentication → SMTP.
  También en Authentication → URL Configuration: Site URL `https://alapelotita.com` y agregar `https://alapelotita.com/**` a Redirect URLs.

## Estructura

| Archivo | Qué tiene |
|---|---|
| `index.html` | Pantallas, HUD y estilos |
| `js/data.js` | Personajes, mundos, niveles, misiones y productos de la tienda. Es lo que se toca para balancear |
| `js/scene.js` | Escena 3D: cancha, vidrios, hinchada, personajes de bloques, pelota, partículas, cámara |
| `js/game.js` | Reglas, física de la pelota, rival, progreso guardado y navegación |
| `js/backend.js` | Datos de la comunidad: modo demo local y cliente de Supabase |
| `js/social.js` | Pantalla Comunidad: ranking, torneos, pronósticos, sponsors y cuenta |
| `js/config.js` | URL y clave pública del servidor (vacío = modo demo) |
| `supabase/schema.sql` | Tablas y reglas de seguridad del servidor |
| `supabase/cups.sql` | Copa de la Cancha: tablas, reglas y funciones (se pega aparte en el SQL Editor) |
| `js/track.js` | Estadísticas anónimas: visitas, quién está en vivo y partidas |
| `supabase/analytics.sql` | Estadísticas: tablas y funciones (solo la administración las lee) |
| `js/live.js` | Partido en vivo: salas, sincronización, física compartida y máquina |
| `supabase/live.sql` | Partido en vivo: tablas y funciones |
| `js/duel.js` | Jugar con amigos: desafíos 1 contra 1 y 2 contra 2 por turnos |
| `supabase/duels.sql` | Desafíos: tablas, reglas y funciones |
| `js/avatar.js` | Muñeco por capas: dibuja al jugador (piel, pelo, ojos, ropa, paleta) y arma su atlas de 8 poses |
| `js/ropa.js` | Tienda de ropa, vestidor y casillero (catálogo, precios, desbloqueos, PRO) |
| `js/vision.js` | Tiras visuales: 57 ejercicios, tiras al azar, metrónomo, voz y fondos (solo PRO) |
| `js/cup.js` | Copa de la Cancha: pantalla, panel de administración, envío de puntajes y cartel de novedades |
| `js/audio.js` | Sonidos y música sintetizados (sin archivos de audio). Cuatro temas, uno por mundo, que rotan solos |
| `assets/` | Arte pixel art de jugadores, jefes y fondos de cada mundo |
| `tools/build-artifact.py` | Arma la versión que se publica como Artifact de Claude |

## Cobros y juego en línea (pendiente de conectar)

El juego ya tiene los ganchos, pero no hay cobros reales ni servidor todavía:

- `PP.Store.purchase(item, callback)` en `js/game.js` es el único punto por donde pasa toda compra.
  Hoy aprueba siempre. Ahí se conecta la pasarela real (Google Play Billing, App Store, Mercado Pago o Stripe).
- `PP.Online` es el gancho para ranking global y partidas en línea.
- El progreso se guarda en el dispositivo (`localStorage`, clave `pelotita.v2`). Antes de cobrar dinero real
  hay que mover monedas, gemas y compras a un servidor con cuentas de usuario, porque lo guardado en el
  dispositivo se puede editar.

## Integración con Padel Coach

`window.Pelotita` expone `start(nivel)`, `getSave()`, `state()`, `go(pantalla)` y `reset()`.

## Créditos de arte

Personajes y fondos generados con Higgsfield a partir del pixel art original del proyecto.
Sin nombres ni imágenes de jugadores profesionales reales.
