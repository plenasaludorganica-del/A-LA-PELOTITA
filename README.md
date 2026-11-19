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

Hay dos formas de control. Se eligen en "¿Cómo se juega?" (inicio) o en la pausa.

**Fácil (por defecto):** el jugador corre solo a la pelota. Se juega con un dedo.

- **Deslizar** de abajo hacia arriba para pegar. El golpe sale al soltar el dedo.
- El **aro** en el piso se cierra sobre la pelota: pegar cuando se cierra da un **PERFECTO**.
- La dirección del gesto apunta el tiro: derecho (o un toque) va **al medio**, inclinado abre hacia ese lado, **hacia abajo = globo**.
  Mientras se arrastra el dedo, una marca en la cancha rival muestra dónde va a caer. Gesto largo = más profundo
  (en modo Pro, gesto corto = dejada).

**Pro:** además se mueve al jugador.

- Pulgar izquierdo en la mitad izquierda de la pantalla: aparece una palanca. En compu, WASD o flechas.
- Pulgar derecho (o mouse) para pegar. En compu también J K L, I globo, U O dejadas.
- A la derecha del jugador sale drive, a la izquierda revés, antes del pique volea.

En los dos modos: si la pelota viene alta sale bandeja, víbora o remate, y un remate perfecto **la saca por 3**.
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
5. Partido en vivo con amigos (etapa 2 de los desafíos), más ejercicios mentales y más jugadas para leer.
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

## Panel de cada jugador

Tocando a cualquier jugador (ranking, Siguiendo, torneos, Copa, desafíos o el autor de un video) se abre su panel: categoría,
lado, estrellas, nivel, IQ, aciertos, seguidores, videos y me gusta, con botones **Seguir** y **Desafiar** (crea un 1 contra 1 y lo
invita). Los PRO ven ahí **sus videos publicados** y los votan con ♥. Servidor: función `player_profile` (`supabase/schema.sql`).

## Jugar con amigos (Desafíos)

Botón **Con amigos** en el inicio (muestra cuántas invitaciones o turnos pendientes tenés). Etapa 1: **por turnos**.
- **Formatos:** 1 contra 1 o 2 contra 2. **Juegos:** Peloteo por puntos, Leé la jugada o Tablero de luces. Duración: 1 hora, 1 día o 3 días.
- **Con quién:** con amigos (se invita a quienes seguís; en 2 contra 2 elegís **compañero** y **rivales**), **abierto a cualquiera**
  (aparece en "Abiertos a cualquiera") o pasando el **código** / el enlace `alapelotita.com/#desafio-CÓDIGO` por WhatsApp. **Solo:** el circuito de siempre.
- **Reglas:** cada jugador tiene **un solo turno** (si sale antes de terminar, cuenta lo que hizo). Gana el equipo que suma más.
  Termina cuando jugaron todos o al cierre. Después, botón **Revancha**.
- **Servidor:** `supabase/duels.sql` (ya aplicado). Tablas `duels`, `duel_players`, `duel_invites` sin acceso directo; todo por funciones
  que validan cuenta, lugar en el equipo, un turno por jugador y el cierre. Pantalla: `js/duel.js`.
- **Etapa 2 (pendiente):** partido **en vivo**, todos en la misma cancha al mismo tiempo desde su celular.

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
- **Puntaje:** cuentan todos los juegos del registro central `PP.GAMES` (`js/data.js`): los 40 niveles (0 a 3 estrellas) y los
  4 ejercicios del Gimnasio mental (0 a 100). Por cada juego vale la mejor marca durante la Copa, llevada a 0..tope
  (por defecto 100). Total = suma de las mejores marcas. Desempate: gana quien llegó primero a ese total.
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
| `js/duel.js` | Jugar con amigos: desafíos 1 contra 1 y 2 contra 2 por turnos |
| `supabase/duels.sql` | Desafíos: tablas, reglas y funciones |
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
