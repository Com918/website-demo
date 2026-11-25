# The Fragility of Choice

A static p5.js generative study that deconstructs the supplied ceramic plate into photographic fragments and reconnects them with a fine, organic network.

## Run locally

From this folder:

```bash
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173/`.

## Reproducible compositions

The composition is regenerated on every load. For a reproducible test only, add
`lock=1` together with a seed:

```text
http://127.0.0.1:4173/?seed=2401&lock=1
```

For visual testing, `severity` can be set from `0.08` to `0.96`:

```text
http://127.0.0.1:4173/?seed=8421&severity=0.56&lock=1
```

The main tuning controls are grouped in `sketch.js` under `CONFIG`. On each reload, the fragments settle first and the graph then grows from the fractured edges before the final frame settles into a static composition.
