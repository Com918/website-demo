# Hidden Hunger — COMM2754 Assignment 1

Version 1.0.0 — 25 November 2026

This project is a generative website about SDG 2 — Zero Hunger and the right to adequate nutrition. It combines experimental editorial design with three p5.js prototypes. Each prototype explores a different visual interpretation of hidden hunger, access, the body, and choice.

Student: Bui Tam Nhu<br>
Student ID: s4140838<br>
Group member: Tran Anh Tuan<br>
Course: COMM2754 — Digital Media Specialisation 1<br>
Institution: RMIT University Vietnam, Saigon South Campus, School of Communication and Design, Digital Media Program<br>
Website: https://com918.github.io/website-demo/

## Run locally

Run the website through a local web server. Do not open `index.html` by
double-clicking it in Finder: that uses a `file://` URL, which can prevent
p5.js from loading local image assets inside the prototypes.

1. Open **Terminal**.
2. Change into the folder that contains this `index.html`. For a cloned copy
   of this repository, that is the repository root:

```bash
cd "/path/to/website-demo"
```

For the packaged submission copy, use:

```bash
cd "/Users/com/Documents/RMIT/Spec 1/COMM2754-26t3-s4140838-A1w04-HiddenHunger-Compilation/code"
```

3. Start the static server:

```bash
python3 -m http.server 8000
```

4. Open <http://localhost:8000/index.html> in Chrome or another browser.
5. Keep the Terminal window open while testing. Press `Control + C` in
   Terminal to stop the server when finished.

The homepage links to all three prototypes. The page requires an internet
connection for the p5.js CDN and the Iceland font used by the website. No
build step or package installation is required.

The experiments use a 1920 × 1080 design space and scale to the available browser viewport. Use a fullscreen browser window for the intended presentation.

## Website navigation

- `index.html` is the homepage and entry point.
- `prototype-01.html` opens Prototype 1.
- `prototype-02.html` opens Prototype 2.
- `prototype-03.html` opens Prototype 3.
- Each prototype page includes a link back to the homepage.

## Prototypes

### Prototype 1 — Generative Spine Sculpture

`sketch.js` generates one dominant articulated spine and supporting depth layers from transparent vertebra illustrations. The composition uses seeded randomness, Perlin noise, arrays, loops, transformations, a custom `Vertebra` class, forward-kinematic joints, alpha-mask separation checks, and an optional WebGL renderer. Reloading without a URL seed creates a new composition. `?seed=42` reproduces a composition for testing.

Useful diagnostic parameters include `?stage=assembly`, `?stage=path`, `?stage=perspective`, `?stage=dof`, and `?stage=assembly&debug=1`.

### Prototype 2 — Unequal Access to Food

`unequal-access-food/sketch.js` is an animated particle study. Particles move through a noise-based flow field, encounter glyph-level text barriers, and are captured or released by ceramic rings. The sketch demonstrates p5.js lifecycle functions, variables, arrays, objects, loops, conditionals, text measurement, image loading, Perlin noise, and animation.

The internal design canvas is fixed at 1920 × 1080. `unequal-access-food/style.css` scales that canvas proportionally to fullscreen without changing the artwork coordinate system.

Press `D` to toggle the optional debug overlay.

### Prototype 3 — The Fragility of Choice

`fragility-of-choice/sketch.js` procedurally fractures the edited ceramic plate into photographic fragments and generates a graph from the fractured edges. It uses anchor nodes, local graph clusters, long-distance bridges, force relaxation, obstacle-aware routing, collision checks, editorial containers, and orthogonal connector paths. The opening build is animated, then the artwork settles into a static composition.

Use `?seed=2401&lock=1` for a reproducible composition. The `severity` parameter can be used for controlled fragmentation tests, for example `?seed=8421&severity=0.56&lock=1`.

## Code concepts

The comments highlight techniques that are important to the artwork: seeded
randomness, arrays, loops, objects, classes, conditional logic, noise-based
motion, particle systems, collision checks, image loading, transformations,
procedural fracture, graph construction, and routed paths. They explain the
purpose of each technique in context instead of mapping every line to a class
exercise.

The project was developed with reference to the [12-Week p5.js course](https://renickbell.net/doku.php?id=12-week-p5js). The comments are intended to help explain the code during assessment; they do not claim that every line was written independently from a blank file.

## External libraries and references

### p5.js

The project loads p5.js from jsDelivr:

- Prototype 1: p5.js 1.9.4.
- Prototypes 2 and 3: p5.js 1.11.10.

p5.js is an external open-source library and retains its own license. The project source is released under GPL 3.0, but that project license does not replace the licenses of external libraries or references.

### Prototype 2 — OpenProcessing reference

The flow-field idea in Prototype 2 was adapted from the movement principle of `tp5_250806_StaircaseWaterway`, credited on the supplied OpenProcessing reference to はぅ君:

<https://openprocessing.org/@trumpliu/2942320>

The adapted idea is limited to the behaviour documented in `flowField()` in `unequal-access-food/sketch.js`: a shared Perlin-noise sample switches a particle between a fast vertical fall and a sideways stair-like slide. The particle data model, text barriers, ring interactions, typography layout, rendering layers, and tuning parameters are project-specific additions.

The supplied sketch's Attribute panel identifies it as **CC BY-NC-SA 3.0**. The source also identifies the work as a fork of `tp5_250806_StaircaseWaterway`, credits はぅ君, and states that the fork author extended the code for clarity. This project therefore preserves attribution, uses the reference only for the documented movement principle, and does not treat the reference as unrestricted public-domain code. The CC BY-NC-SA terms require attribution, prohibit commercial use, and require ShareAlike for adaptations; see the [Creative Commons license deed](https://creativecommons.org/licenses/by-nc-sa/3.0/) and the [OpenProcessing license FAQ](https://intercom.help/openprocessing/en/articles/5714786-choosing-a-license-for-your-sketches).

### Other visual references

The Prototype 1 barbed-wire image and anatomical/Procreate references informed composition, movement, and orientation only. No reference image is loaded by the website as an artwork asset. The supplied ceramic, food, vertebra, and ring images are stored locally in the relevant asset folders.

## AI assistance and student contribution

AI tools were used during code exploration, debugging, documentation support, and iterative implementation. The student selected the SDG, concept, visual direction, source assets, prototype structure, and evaluated successive compositions. The code comments identify external adaptations and course concepts so the student can explain them during assessment. The student should review this statement and adjust it if the final development record requires more specific attribution.

## Project structure

```text
index.html                         Homepage
homepage.css / homepage.js         Homepage layout and scroll behaviour
prototype-01.html                  Prototype 1 wrapper
prototype-02.html                  Prototype 2 wrapper
prototype-03.html                  Prototype 3 wrapper
sketch.js                          Prototype 1 p5.js sketch
unequal-access-food/               Prototype 2 source and asset
fragility-of-choice/               Prototype 3 source and assets
3x/                                Prototype 1 vertebra assets
human-spine.png                    Retained legacy reference asset
contact-sheet.html                 Prototype 1 seed preview page
CODE_HIGHLIGHTS.md                 Extended Prototype 1 technical notes
LICENSE                            Full GNU GPL v3.0 text
```

## License

The original project code is released under the GNU General Public License v3.0. See [`LICENSE`](LICENSE) for the complete license text. Third-party libraries, references, and any adapted code remain subject to their separate terms described above.

## Credits and contact

Created by Bui Tam Nhu and Tran Anh Tuan for COMM2754, RMIT University Vietnam.<br>
Contact: s4140838@rmit.edu.vn<br>
Website: <https://com918.github.io/website-demo/>
