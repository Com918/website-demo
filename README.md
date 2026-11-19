# Generative Flowing Spine Sculpture

This p5.js artwork uses the original high-resolution `3x/ver 1.png` as the primary repeated vertebra card and introduces exactly two or three `3x/ver 2-2.png` deficiency cards per composition. A seeded generator builds one to three articulated spine strands that travel beyond the 1920 × 1080 frame, curve through cumulative joint rotations, stay spatially separate, and keep the original anatomical facing. The selected Ver 2-2 bones blink slowly to signal nutritional deficiency.

The barbed-wire photograph is used only as a composition reference for flowing paths and perspective. It is not used as a bone or material model. Red threads, artificial breaks, full-scene animation, fingerprints, and decorative textures remain disabled.

## Run locally

```bash
python3 -m http.server
```

Open <http://localhost:8000> or use VS Code Live Server. The canvas is `1920 × 1080` and scales proportionally to fit the browser without scrollbars.

## Seeds and diagnostic stages

- Reload without a seed for a new composition.
- Use `?seed=42` to reproduce an exact strand arrangement.
- Use `?stage=assembly` to inspect one foreground articulated strand.
- Use `?stage=assembly&debug=1` to show one 10-vertebra diagnostic spine with red upper-notch dots, blue lower-tail dots, exact joint links, and index labels.
- Use `?stage=path` to inspect all articulated centerlines.
- Use `?stage=perspective` to see spatial scale without DOF.
- Use `?stage=dof` to inspect the scale-based depth composition and selective far-layer atmosphere.
- No stage parameter shows the final layered version.
- Use `?webgl=1` to opt into the full WEBGL renderer. The default 2D renderer uses the same seeded x/y/z data when a browser has unreliable WEBGL.

The normal render uses `noLoop()`, so each page load creates one still image. A low-frequency timer redraws the scene every 900ms only to hide or reveal the selected Ver 2-2 bones. The console reports the seed, strand count, vertebra count, continuity status, background colour, and render time.

## Main systems

- `UPPER_NOTCH_ANCHOR` and `LOWER_TAIL_TIP_ANCHOR` are editable normalized landmark coordinates calibrated on the new 3x artwork.
- `NOTCH_INSET_X` and `NOTCH_INSET_Y` move the previous-notch target a small source-pixel distance inward while keeping the tail-to-notch equation exact.
- `generateJointAngles()` creates correlated C-shaped or S-shaped angle increments.
- `headingProfile()` creates a mandatory smooth multi-wave heading change, while `strandCurvatureValid()` rejects paths with insufficient lateral travel or turning reversal.
- `buildValidatedMainStrand()` creates and validates the single dominant foreground strand before secondary depth layers are added.
- `buildArticulatedSpine()` places each new card from the previous card's world-space upper notch.
- `calculateNextJointTransform()` rotates the new card around its own lower-tail tip and applies `newPosition = jointTarget - R * tailTip`, where `jointTarget` is the previous notch plus the fixed chain clearance.
- `JOINT_GAP` adds a small, consistent clearance along the calibrated chain direction, so adjacent bodies do not pile up while the transform remains deterministic.
- `createSpineAssembly()` remains the reusable assembly entry point, but no longer distributes cards independently along an absolute curve.
- `validateComposition()` and `detectExcessiveOverlap()` compare every visible vertebra pair across strands with rotated alpha-mask geometry and a 14px ink-to-ink safety gap.
- `acceptClearStrands()` keeps the focal spine and rejects an unsafe secondary strand instead of forcing it into the composition; later retries may use fewer secondary strands.
- `buildOccupancy()` and `compositionQuality()` use a coarse 6×4 grid to reject edge-heavy or centrally empty candidates with bounded retries.
- `visibleCardGeometries()` and `cardSilhouettesTouch()` compare rotated alpha-mask silhouettes with a 14px negative-space gap, so separate strands are regenerated before they touch or cross.
- `framingQuality()` rewards endpoints that continue beyond the frame, so large foreground strands crop intentionally instead of stopping just inside the canvas.
- `strandContinuityValid()` requires both rotated silhouettes to clear the frame by the full margin; `extendStrandToExit()` can prepend and append connected cards, and `ensureFramePassage()` repairs complete chains without deleting vertebrae.
- Depth tiers assign one dominant foreground, supporting midground, and quieter background scale and z positions.
- Foreground cards use the untouched source PNGs; midground cards are sharp with mild saturation/contrast reduction; far cards use source-resolution filtered layers with only subtle blur.
- All tiers remain at 100% opacity; depth is created through scale, z ordering, and restrained layer-specific appearance.
- `assignVariantVertebrae()` selects exactly two or three sufficiently visible Ver 2-2 cards globally after all strands are built; both versions share the same transforms and anchors.
- `visibleCardRatio()` excludes offscreen or heavily cropped cards, while `selectDistributedVariants()` varies the chosen positions across strands and space.
- Far strands render first, but collision validation keeps separate strands from overlapping.
- Far-layer processing uses full 2196 × 1314 source-resolution buffers; no low-resolution blur buffer or global canvas filter is used.
- `?debug=1` draws red notch markers, blue tail markers, and white connection-distance lines; it is off in the normal artwork.
- Visible Ver 2-2 bones blink at a steady, slow interval to mark nutritional deficiency.

## Project files

- `index.html` loads p5.js and the fullscreen shell.
- `style.css` centers and scales the 16:9 canvas on a white background.
- `sketch.js` contains seeded joint-angle generation, forward-kinematic vertebra placement, depth ordering, perspective, and separation validation.
- `3x/ver 1.png` is the primary transparent vertebra illustration.
- `3x/ver 2-2.png` is the transparent nutritional-deficiency variation.
- `human-spine.png` is retained as the legacy source asset but is no longer rendered.
- `contact-sheet.html` opens reproducible seed previews.
- `CODE_HIGHLIGHTS.md` documents the independent techniques and references.
- `LICENSE` contains the complete GNU GPL v3.0 text.

The canvas enables high-quality image smoothing, and the optional WebGL renderer uses linear texture filtering for enlarged or rotated cards.

## License

This project is released under GNU GPL v3.0. See `LICENSE` for the full text. p5.js remains under its own license.
