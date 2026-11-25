# Unequal Access to Food

Standalone p5.js generative artwork exploring SDG 2 — Zero Hunger through unequal access to food.

The internal design canvas is fixed at 1920 × 1080 and is scaled proportionally by `style.css` for fullscreen presentation. The experiment uses the supplied transparent ceramic ring asset, a documented adaptation of the OpenProcessing “Staircase Waterway” motion principle, glyph-level typography collisions, ring capture/overflow states, and spring-driven ceramic rings.

## Run locally

From this folder, start any static server, for example:

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>.

The p5.js runtime is loaded from jsDelivr; the artwork itself is contained in `index.html`, `style.css`, `sketch.js`, and `assets/ceramic-ring.png`.

## External code reference

The movement idea documented in `flowField()` was adapted from the supplied OpenProcessing reference, `tp5_250806_StaircaseWaterway`, credited to はぅ君:

<https://openprocessing.org/@trumpliu/2942320>

The adaptation is limited to the noise-controlled switch between a fast vertical fall and a sideways stair-like slide. The particle objects, text barriers, ceramic-ring interactions, typography layout, and rendering layers are project-specific additions. The exact license shown in the sketch's Attribute panel must be confirmed before final submission. OpenProcessing's license FAQ describes CC BY-NC-SA as its default license; if that is the selected license, credit, non-commercial use, and ShareAlike conditions apply.

## Tuning

The main constants are at the top of `sketch.js`: particle count, gravity, retention rates, text content, bar behavior, and an optional deterministic debug seed.
