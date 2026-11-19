# Unequal Access to Food

Standalone p5.js generative artwork exploring SDG 2 — Zero Hunger through unequal access to food.

The experiment uses the supplied transparent ceramic ring asset, a coral adaptation of the
OpenProcessing “Staircase Waterway” motion principle, glyph-level typography collisions,
ring capture/overflow states, and spring-driven ceramic rings. Credit for the source motion:
はぅ君 / the supplied `tp5_250806_StaircaseWaterway` fork.

## Run locally

From this folder, start any static server, for example:

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>.

The p5.js runtime is loaded from jsDelivr; the artwork itself is contained in `index.html`, `style.css`, `sketch.js`, and `assets/ceramic-ring.png`.

## Tuning

The main constants are at the top of `sketch.js`: particle count, gravity, retention rates, text content, bar behavior, and an optional deterministic debug seed.
