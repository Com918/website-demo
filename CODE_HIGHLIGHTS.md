# Code Highlights: Flowing Spine Composition

This iteration keeps the successful vertebra card and anatomical-facing logic, then expands it into a layered generative composition. `3x/ver 1.png` is the primary bone asset, while `3x/ver 2-2.png` is a sparse nutritional-deficiency variation. The barbed-wire reference contributes ideas about path choreography, separation, and depth, not bone geometry or material.

## 1A. Interchangeable vertebra assets

The two transparent PNGs are loaded at their original high resolution and drawn directly; no `resize()`, `get()`, `copy()`, or low-resolution intermediate buffer is used. `assignVariantVertebrae()` runs after the entire composition is flattened, filters out heavily cropped cards, then selects exactly two or three visible Ver 2-2 cards with the seeded p5 random generator. Position, rotation, scale, depth, and both calibrated anchors remain unchanged.

## 1. Joint-based articulation

The critical rebuild replaces absolute path placement with forward kinematics. `UPPER_NOTCH_ANCHOR` and `LOWER_TAIL_TIP_ANCHOR` store editable normalized coordinates calibrated against the new 3x artwork.

`NOTCH_INSET_X` and `NOTCH_INSET_Y` add only a small calibrated source-pixel inset toward the inside of the upper notch. The offset changes the target landmark itself, not the transform rule, so the attached tail still lands exactly on it.

`JOINT_GAP` adds a small deterministic clearance along the next vertebra's calibrated chain tangent. This is a controlled spacing value, not a random X/Y displacement, so bends and attachment calculations remain reproducible while adjacent bodies stay visually distinct.

`buildArticulatedSpine()` starts at one root vertebra. For every next card, `calculateNextJointTransform()` reads the previous upper notch, advances a fixed `JOINT_GAP` along the chain tangent, rotates the new card around its own lower-tail tip, computes `newPosition = jointTarget - R * tailTip`, and stores the transform before continuing.

This prevents independent cards from sliding into one another. The posterior detail and rounded body remain in one rigid local relationship for every vertebra.

## 2. Cumulative C and S curvature

`generateJointAngles()` combines a broad seeded oscillation, a second reversal wave, and low-amplitude coherent noise. Each increment is limited by a strand-specific joint limit, then accumulated through `previous.angle + relativeAngle`.

The current heading profile is deliberately non-optional: every strand combines a primary broad wave with a smaller reversal wave, and `strandCurvatureValid()` measures lateral displacement, heading span, and a change in turning direction. Paths that look too straight are regenerated before composition validation.

The curve therefore emerges from successive joint rotations and translations. It is not made by moving cards sideways along an external Bézier path. The exact tail-tip-to-notch coincidence leaves only the natural wedge opening created by bending the rigid cards.

## 3. Diagnostic articulation mode

Use `?stage=assembly&debug=1` to isolate a 10-vertebra diagnostic chain. Red markers show upper notches and blue markers show lower tail tips; white lines connect each tail to the preceding notch, and the blue/red markers should overlap. `?stage=path` draws the centerline that emerges from the stored joint transforms.

## 4. Spatial layers and occlusion

`buildDepthPlan()` and `buildSecondaryDepths()` guarantee one dominant foreground plus planned midground/background depth values. The generator may reduce the number of secondary strands when collision validation finds insufficient room. Each accepted strand receives:

- a seeded z depth;
- a tier-specific apparent scale;
- a different root direction and correlated joint-angle wave;
- deliberate separation from other paths.

The foreground tier is deliberately much larger than the others. This creates a clear focal subject instead of treating every strand as equally important. Root positions are sampled relative to each strand's direction, so strands enter the frame from varied trajectories rather than a small set of templates.

`buildOccupancy()` marks a coarse 6×4 grid from articulated samples. `compositionQuality()` rewards occupied central cells and visible path length, while `compositionBalanced()` rejects candidates with large central voids, excessive edge concentration, or too few occupied cells.

`visibleCardGeometries()` transforms the opaque alpha mask of every visible vertebra into screen space. `cardSilhouettesTouch()` first uses rotated bounds as a broad phase, then checks actual mask samples with a 14px ink-to-ink safety gap. `pairIsClear()` compares every card in two different strands, so a background spine cannot pass through the foreground silhouette.

`framingQuality()` checks the first and last card centers against the canvas plus a silhouette margin. Candidate layouts are rewarded when strands enter or leave beyond the frame, while `visibleCoverage()` ensures they still travel through the artwork.

`strandContinuityValid()` is a hard acceptance rule: both rotated endpoints must clear the frame by the full silhouette bounds, the chain must enter the viewport, and every calibrated joint must remain exact. `extendStrandToExit()` can prepend or append more vertebrae through forward kinematics. `ensureFramePassage()` recentres only a complete chain that missed the viewport, preserving all joints instead of hiding or deleting an endpoint.

The composition is generated in dependency order: `buildValidatedMainStrand()` first chooses one large, central foreground spine, then `buildSecondaryDepths()` and `buildValidatedStrand()` add midground and background strands around it. `compositionBalanced()` requires exactly one foreground, visible central coverage, continuity, adjacent-card spacing, and separation before accepting a candidate. If the full secondary count cannot fit, later attempts reduce that count; `acceptClearStrands()` rejects unsafe secondary chains rather than forcing them through the focal spine.

The renderer sorts strands from farthest to nearest before drawing them. The same data drives the WEBGL renderer and the portable 2D projection fallback.

Depth uses scale and z ordering first, then restrained tier-specific processing. Foreground cards use the original PNGs; midground cards receive mild saturation/contrast reduction while remaining sharp; far cards receive stronger reduction plus only a subtle blur. No alpha reduction, tint, white overlay, or global canvas filter is used.

## 5. Selective far-layer atmosphere

`buildDepthLayers()` creates source-resolution 2196 × 1314 buffers only for the midground and far background. `makeFilteredLayer()` enables high-quality interpolation and applies the layer's saturation, contrast, and optional blur while preserving alpha. The foreground remains a direct draw of the original loaded PNG.

Canvas 2D smoothing and high-quality interpolation keep enlarged or rotated cards clean. The blur is restricted to the far layer and never touches the white background, foreground, or midground.

The background is configurable through the `BACKGROUND` constant and is currently crisp white `#FFFFFF`. The vertebra illustrations retain their original colors and transparency.

## 6. Seed behavior and performance

Normal reloads use a new `Math.random()` seed. A URL seed such as `?seed=42` is passed to both `randomSeed()` and `noiseSeed()`, making strand count, joint angles, spacing, and depth reproducible. `noLoop()` renders one still image, and the console reports the generated strand and vertebra counts.

Twenty visual test seeds were checked during this revision: `1`, `3`, `17`, `42`, `81`, `123`, `256`, `417`, `608`, `999`, `1201`, `1603`, `2048`, `4096`, `8191`, `12000`, `22000`, `33000`, `44000`, and `55000`. They produced varied one-to-three-strand compositions with one dominant foreground strand, mandatory visible curvature, continuous off-canvas endpoints, exact anchors, actual silhouette separation, and exactly two or three visible Ver 2-2 cards.

## 7. Disabled systems

Red threads, broken sections, full-scene animation, fingerprint backgrounds, and decorative textures remain disabled as requested. A low-frequency timer redraws the scene only to blink the selected Ver 2-2 cards, keeping the deficiency signal readable without adding labels.

## 8. Lecturer lesson connections

| Lesson | Link | Applied technique |
|---|---|---|
| 01 | [Functions, variables, shapes](https://renickbell.net/doku.php?id=p5js-week-01) | `setup()`, `draw()`, helpers, background, and image drawing. |
| 02 | [Randomness and color](https://renickbell.net/doku.php?id=p5js-week-02) | Seeded strand variation and configurable red. |
| 03 | [Increment and for loops](https://renickbell.net/doku.php?id=p5js-week-03) | Sequential joint stepping and card construction. |
| 04 | [Arrays and transformations](https://renickbell.net/doku.php?id=p5js-week-04) | Arrays plus `translate()`, `rotate()`, and depth ordering. |
| 05 | [buildArray and shapes](https://renickbell.net/doku.php?id=p5js-week-05) | Reusable `buildArray()` and joint diagnostics. |
| 06 | [Objects, classes, and forEach](https://renickbell.net/doku.php?id=p5js-week-06) | `Vertebra` and collection callbacks. |
| 07 | [Classes and map](https://renickbell.net/doku.php?id=p5js-week-07) | `map()` controls depth-based apparent scale. |
| 08 | [Classes and filter](https://renickbell.net/doku.php?id=p5js-week-08) | Image filtering and interpolation are reviewed as part of clean asset rendering. |
| 09 | [Review](https://renickbell.net/doku.php?id=p5js-week-09) | Combines assets, curves, arrays, classes, seeds, and still rendering. |
| 10 | [Making and drawing with a class](https://renickbell.net/doku.php?id=p5js-week-10) | `Vertebra.display()` separates data from rendering. |
| 11 | [if statements and two-argument forEach](https://renickbell.net/doku.php?id=p5js-week-11) | Stage selection and renderer branches. |
| 12 | [else, else if, and includes](https://renickbell.net/doku.php?id=p5js-week-12) | Tier selection, stage logic, and explicit focus conditions. |

The course index is [Renick Bell's 12-week p5.js course](https://renickbell.net/doku.php?id=12-week-p5js).

## 9. Reference and licensing note

The supplied anatomical/Procreate references determine the card orientation and assembly relationship. The barbed-wire photograph is credited as a visual composition reference only. No reference implementation was copied. The project is released under GNU GPL v3.0 in `LICENSE`.
