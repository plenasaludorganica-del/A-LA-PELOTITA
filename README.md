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

- **Deslizar** (o hacer un gesto con el mouse) para pegarle. La dirección del gesto apunta el tiro.
- El **aro** en el piso se cierra sobre el punto de golpe: pegar justo cuando se cierra da un **PERFECTO**.
- Gesto corto hacia arriba = dejada. Gesto largo = tiro profundo. **Gesto hacia abajo = globo.**
- Si la pelota viene alta, el golpe es bandeja, víbora o remate. Un remate perfecto **la saca por 3**.
- Los perfectos y buenos cargan el **especial** (botón redondo o barra espaciadora).
- Teclado: flechas o A/W/D para pegar, flecha abajo o S para globo, Q/E dejadas, espacio especial, P pausa.

## Qué trae

- 40 niveles en 4 mundos (Club del Barrio, Playa Pádel, Neón City, World Tour) con 4 jefes.
- 4 tipos de nivel: partido, puntería con blancos, peloteo y jefe.
- 4 jugadores con atributos, mejoras y un especial distinto cada uno.
- Estrellas por nivel, combos, categorías de pádel (8va → LEYENDA), misiones diarias, premio diario con racha,
  cofre cada 3 victorias, vidas que se recargan con el tiempo.
- Tienda con monedas, gemas y Pase Pelotita. **Los pagos son simulados** (ver abajo).

## Estructura

| Archivo | Qué tiene |
|---|---|
| `index.html` | Pantallas, HUD y estilos |
| `js/data.js` | Personajes, mundos, niveles, misiones y productos de la tienda. Es lo que se toca para balancear |
| `js/scene.js` | Escena 3D: cancha, vidrios, hinchada, personajes de bloques, pelota, partículas, cámara |
| `js/game.js` | Reglas, física de la pelota, rival, progreso guardado y navegación |
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
