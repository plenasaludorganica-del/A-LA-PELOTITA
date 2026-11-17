# A la Pelotita · pádel arcade 3D

Juego de pádel por niveles para celular y compu. Corre en el navegador, sin instalación ni compilación:
HTML + JavaScript + Three.js (incluido en `vendor/`).

## Probarlo

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
- La dirección del gesto apunta el tiro. Gesto corto = dejada, largo = profundo, **hacia abajo = globo**.

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

- **Leé la jugada:** se congela un punto de dobles y hay que elegir el golpe correcto (globo, bandeja, chiquita, al medio).
  Las jugadas están en `PP.PLAYS` dentro de `js/data.js`; para sumar una alcanza con agregar un objeto.
- **Anticipación:** la pelota desaparece en el aire y hay que tocar dónde va a picar.
- **Tablero de luces:** tocar las verdes, no tocar las rojas, mirando el centro.
- **Pelota fantasma:** peloteo con la pelota que parpadea.

## Personajes

Los jugadores, jefes y rivales son pixel art animado por cuadros. Cada uno tiene un atlas de 8 poses en
`assets/sprites/` (espera, corrida ×2, festejo, armado, golpe, remate, derrota).
`tools/slice-sprites.py` arma el atlas a partir de planchas PNG con fondo transparente.

## Comunidad

Pantalla con cuatro pestañas: **Ranking** (estrellas, IQ de pádel, pronósticos acertados), **Torneos**, **Sponsors** y **Cuenta**.

- **Cuenta:** registro con mail, contraseña, nombre, categoría y lado.
- **Torneos:** cualquier usuario crea uno (peloteo por puntos o Leé la jugada, individual o parejas, día, hora y duración).
  Al crearlo sale un cartel para capturar, con código y enlace (`#torneo-CODIGO`). Mientras está en juego cada inscripto
  juega las veces que quiera y cuenta su mejor turno. Gana el mayor puntaje al cierre.
- **Pronósticos:** gratis y sin plata. Cada usuario elige un ganador hasta 5 minutos antes del inicio.
- **Sponsors:** solo dos rubros (cancha o club, tienda de insumos de pádel). Cada pedido queda en revisión hasta aprobarlo.

### Modo demo y servidor

Con `js/config.js` vacío todo se guarda en el dispositivo (sirve para probar, no hay datos compartidos).
Para activarlo entre jugadores:

1. Crear un proyecto gratuito en supabase.com.
2. En SQL Editor pegar y ejecutar `supabase/schema.sql`.
3. En Authentication → Sign In / Providers → Email, desactivar "Confirm email" (o dejarlo y avisar que llega un mail).
4. Copiar de Project Settings → API la **Project URL** y la clave **anon public** a `js/config.js`.
5. Para aprobar un sponsor: Table Editor → `sponsors` → poner `approved` en `true`.

La clave anon es pública por diseño; lo que protege los datos son las reglas del archivo SQL
(cada uno edita solo lo suyo, los pronósticos se bloquean 5 minutos antes, los puntajes solo durante el torneo).
**El modo servidor todavía no se probó contra un proyecto real.** Los puntajes los informa el propio juego,
así que alguien con conocimientos técnicos podría inflar el suyo; alcanza para un piloto, no para premios.

## Estado y próximos pasos

Hecho: juego por niveles, personajes animados, control fácil y pro, Gimnasio mental, tienda piloto, opiniones, comunidad en modo demo.

Pendiente, en orden sugerido:

1. Conectar Supabase y probar cuentas, ranking y torneos entre dos celulares.
2. Recuperar contraseña y pantalla para aprobar sponsors sin entrar a Supabase.
3. Guardar el progreso del juego en la cuenta (hoy queda en el dispositivo).
4. Cobros reales: pasarela de pago para gemas y Pase.
5. Dobles 2 contra 2, más ejercicios mentales y más jugadas para leer.
6. Instalable como app y registro anónimo de uso.

## Estructura

| Archivo | Qué tiene |
|---|---|
| `index.html` | Pantallas, HUD y estilos |
| `js/data.js` | Personajes, mundos, niveles, misiones y productos de la tienda. Es lo que se toca para balancear |
| `js/scene.js` | Escena 3D: cancha, vidrios, hinchada, personajes de bloques, pelota, partículas, cámara |
| `js/game.js` | Reglas, física de la pelota, rival, progreso guardado y navegación |
| `js/backend.js` | Datos de la comunidad: modo demo local y cliente de Supabase |
| `js/social.js` | Pantalla Comunidad: ranking, torneos, pronósticos, sponsors y cuenta |
| `js/config.js` | URL y clave del servidor (vacío = modo demo) |
| `supabase/schema.sql` | Tablas y reglas de seguridad del servidor |
| `js/audio.js` | Sonidos y música sintetizados (sin archivos de audio) |
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
