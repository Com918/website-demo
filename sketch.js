/*
 * AI-assisted generation note:
 * Review, edit, and personalize this prototype before submitting it. Add a
 * personal reflection about the body, growth, fragility, and nutrition.
 * The barbed-wire reference informs flow, overlap, and focus only. The
 * vertebra assembly and curve system are original and released under GPL-3.0.
 */

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const BACKGROUND = '#FFFFFF';
const ASSET_WIDTH = 2196;
const ASSET_HEIGHT = 1314;
const VERTEBRA_ONE_PATH = '3x/ver 1.png';
const VERTEBRA_TWO_TWO_PATH = '3x/ver 2-2.png?rev=20261119-2-2';
// These normalized points target the new high-resolution illustration landmarks.
const UPPER_NOTCH_ANCHOR = { x: 0.294, y: 0.205 };
const LOWER_TAIL_TIP_ANCHOR = { x: 0.176, y: 0.834 };
// Small source-pixel inset seats the tail inside the notch without shifting it freely.
const NOTCH_INSET_X = 2;
const NOTCH_INSET_Y = 4;
const GRID_COLUMNS = 6;
const GRID_ROWS = 4;
const MASK_BIN_SIZE = 8;
const STRAND_GAP = 14;
const JOINT_GAP = 16;
const VARIANT_BLINK_INTERVAL = 900;
let rawVertebraOne;
let rawVertebraTwoTwo;
let renderLayers;
let assetMask = [];
let seedValue;
let scene;
let strands = [];
let vertebrae = [];
let debugStage = 'final';
let debugEnabled = false;
let renderStarted = 0;
let isWebGL = false;
let variantVisible = true;
let renderLogged = false;

// preload() loads the supplied transparent illustration before setup begins.
function preload() {
  rawVertebraOne = loadImage(VERTEBRA_ONE_PATH);
  rawVertebraTwoTwo = loadImage(VERTEBRA_TWO_TWO_PATH);
}

// setup() prepares the seeded still composition and stops the animation loop.
function setup() {
  const forceWebGL = new URLSearchParams(window.location.search).get('webgl') === '1';
  isWebGL = forceWebGL && supportsWebGL();
  if (isWebGL) createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT, WEBGL);
  else createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  pixelDensity(min(window.devicePixelRatio || 1, 2));
  configureImageQuality();
  renderLayers = buildDepthLayers();
  assetMask = buildAssetMask(rawVertebraOne);
  initializeSeeds();
  debugStage = getStage();
  debugEnabled = new URLSearchParams(window.location.search).get('debug') === '1';
  scene = makeScene();
  strands = buildVariantReadyStrands();
  vertebrae = strands.flatMap((strand) => strand.vertebrae);
  assignVariantVertebrae(vertebrae);
  window.setInterval(toggleVariantVisibility, VARIANT_BLINK_INTERVAL);
  renderStarted = performance.now();
  noLoop();
}

// supportsWebGL() lets capable browsers opt into true perspective rendering.
function supportsWebGL() {
  const probe = document.createElement('canvas');
  return Boolean(probe.getContext('webgl') || probe.getContext('experimental-webgl'));
}

// toggleVariantVisibility creates a calm blink for selected deficiency bones.
function toggleVariantVisibility() {
  variantVisible = !variantVisible;
  draw();
}

// initializeSeeds() makes reloads unique while keeping URL seeds reproducible.
// Lesson 02: the conditional chooses either a reproducible user-provided value
// or a new random value for the next generated composition.
function initializeSeeds() {
  const rawSeed = new URLSearchParams(window.location.search).get('seed');
  const requested = rawSeed === null ? NaN : Number(rawSeed);
  seedValue = Number.isFinite(requested) ? floor(requested) : floor(Math.random() * 100000);
  randomSeed(seedValue);
  noiseSeed(seedValue);
  console.info(`[Spine] seed=${seedValue}`);
}

// getStage() keeps the old diagnostic URLs useful during visual testing.
function getStage() {
  const value = new URLSearchParams(window.location.search).get('stage');
  const stages = ['assembly', 'curve', 'perspective', 'dof', 'path'];
  return stages.includes(value) ? value : 'final';
}

// configureImageQuality enables smooth interpolation for the display canvas.
function configureImageQuality() {
  if (!isWebGL && drawingContext) {
    drawingContext.imageSmoothingEnabled = true;
    drawingContext.imageSmoothingQuality = 'high';
  }
}

// configureWebGLTextureFiltering keeps textured planes smoothly interpolated.
function configureWebGLTextureFiltering() {
  if (!isWebGL || !drawingContext) return;
  drawingContext.texParameteri(drawingContext.TEXTURE_2D,
    drawingContext.TEXTURE_MIN_FILTER, drawingContext.LINEAR);
  drawingContext.texParameteri(drawingContext.TEXTURE_2D,
    drawingContext.TEXTURE_MAG_FILTER, drawingContext.LINEAR);
}

// buildDepthLayers keeps original assets untouched while preparing tier looks.
function buildDepthLayers() {
  return { foreground: { 1: rawVertebraOne, 2: rawVertebraTwoTwo },
    midground: buildLayerPair(0.78, 0.97, 0),
    background: buildLayerPair(0.58, 0.92, 1.15) };
}

// buildLayerPair creates one filtered high-resolution layer for each asset.
function buildLayerPair(saturation, contrast, blur) {
  return { 1: makeFilteredLayer(rawVertebraOne, saturation, contrast, blur),
    2: makeFilteredLayer(rawVertebraTwoTwo, saturation, contrast, blur) };
}

// makeFilteredLayer applies only tier-specific appearance to a source PNG.
function makeFilteredLayer(source, saturation, contrast, blur) {
  const layer = createGraphics(ASSET_WIDTH, ASSET_HEIGHT);
  layer.pixelDensity(1);
  const context = layer.drawingContext;
  context.save();
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.filter = `saturate(${saturation}) contrast(${contrast}) blur(${blur}px)`;
  layer.image(source, 0, 0, ASSET_WIDTH, ASSET_HEIGHT);
  context.restore();
  return layer;
}

// buildAssetMask samples only opaque source pixels for silhouette validation.
function buildAssetMask(source) {
  source.loadPixels();
  const mask = [];
  const columns = 24;
  const rows = 16;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = floor((column + 0.5) * source.width / columns);
      const y = floor((row + 0.5) * source.height / rows);
      const alpha = source.pixels[(y * source.width + x) * 4 + 3];
      if (alpha > 24) mask.push({ x: (column + 0.5) / columns - 0.5,
        y: (row + 0.5) / rows - 0.5 });
    }
  }
  return mask;
}

// makeScene() stores spacing, curve, depth, and camera controls in one object.
function makeScene() {
  const diagnostic = debugStage === 'assembly';
  return { strandCount: floor(random(3, 5)), cardWidth: random(235, 285),
    jointStep: diagnostic ? 0.16 : random(0.15, 0.22),
    jointLimit: diagnostic ? 0.2 : random(0.22, 0.34),
    baseAngle: random(-0.05, 0.05),
    cameraDistance: 1550 };
}

// buildArray() creates a predictable seeded collection with a small for loop.
// Lessons 03-05: the loop increments an index and the arrow function builds
// one item per position, demonstrating arrays, callbacks, and push().
function buildArray(count, builder) {
  const items = [];
  for (let index = 0; index < count; index += 1) items.push(builder(index));
  return items;
}

// buildDepthPlan() creates one dominant foreground and quieter support layers.
function buildDepthPlan(count) {
  const foreground = floor(random(count));
  const midground = min(floor(random(1, 3)), count - 1);
  const depths = buildArray(count, () => random(-330, -210));
  depths[foreground] = random(190, 250);
  let mids = 0;
  for (let index = 0; index < count && mids < midground; index += 1) {
    if (index !== foreground) { depths[index] = random(-70, 60); mids += 1; }
  }
  return depths;
}

// buildStrands() retries complete candidates using lightweight occupancy scoring.
function buildStrands() {
  if (debugStage === 'assembly') return buildDiagnosticStrands();
  let best = null;
  let bestScore = -Infinity;
  let bestClean = null;
  let bestCleanScore = -Infinity;
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const maximum = scene.strandCount - 1;
    const fallbackCount = max(1, maximum - 1);
    const secondaryCount = attempt < 16 ? maximum : fallbackCount;
    const candidate = buildCompositionCandidate(secondaryCount);
    const score = compositionQuality(candidate);
    const clean = acceptClearStrands(candidate);
    const cleanScore = clean.length * 0.35 + compositionQuality(clean);
    if (score > bestScore) { best = candidate; bestScore = score; }
    if (cleanScore > bestCleanScore) { bestClean = clean; bestCleanScore = cleanScore; }
    if (compositionBalanced(candidate)) return candidate;
  }
  console.info(`[Spine] best composition score=${bestScore.toFixed(2)}`);
  return bestClean || acceptClearStrands(best);
}

// acceptClearStrands keeps the focal spine and rejects unsafe secondary chains.
function acceptClearStrands(collection) {
  const accepted = [collection[0]];
  for (let index = 1; index < collection.length; index += 1) {
    const strand = collection[index];
    const clean = strandContinuityValid(strand) && adjacentSpacingValid(strand) &&
      !detectExcessiveOverlap(strand, accepted);
    if (clean) accepted.push(strand);
  }
  return accepted;
}

// buildDiagnosticStrands() isolates a compact one-spine anchor test.
function buildDiagnosticStrands() {
  const depths = buildDepthPlan(1);
  return [buildCandidateStrand(0, depths[0], [])];
}

// buildCompositionCandidate() constructs one complete multi-strand proposal.
function buildCompositionCandidate(secondaryCount = scene.strandCount - 1) {
  const result = [buildValidatedMainStrand()];
  const depths = buildSecondaryDepths(secondaryCount);
  for (let index = 0; index < depths.length; index += 1)
    result.push(buildValidatedStrand(index + 1, depths[index], result));
  return result;
}

// buildValidatedMainStrand creates and validates the focal strand first.
function buildValidatedMainStrand() {
  let best = null;
  let bestScore = -Infinity;
  for (let attempt = 0; attempt < 18; attempt += 1) {
    const candidate = buildCandidateStrand(0, random(190, 250), [], 'foreground');
    const score = mainCompositionScore(candidate);
    if (score > bestScore) { best = candidate; bestScore = score; }
    if (!candidate.rejected && mainStrandValid(candidate)) return candidate;
  }
  return best;
}

// buildSecondaryDepths reserves the foreground tier for exactly one main strand.
function buildSecondaryDepths(count) {
  const depths = buildArray(count, () => random(-330, -210));
  if (count > 0) depths[0] = random(-70, 60);
  return depths;
}

// buildVariantReadyStrands retries until at least two cards are visibly eligible.
function buildVariantReadyStrands() {
  let candidate = buildStrands();
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const cards = candidate.flatMap((strand) => strand.vertebrae);
    if (visibleVariantCandidates(cards).length >= 2) return candidate;
    candidate = buildStrands();
  }
  return candidate;
}

// mainStrandValid requires a prominent, central, continuous focal spine.
function mainStrandValid(strand) {
  return strand.tier === 'foreground' && strand.scale > 1.5 &&
    mainVisibleRatio(strand) > 0.24 && mainPassesCenter(strand) &&
    strandCurvatureValid(strand);
}

// mainCompositionScore ranks focal candidates by visible coverage and centrality.
function mainCompositionScore(strand) {
  return mainVisibleRatio(strand) * 0.65 + (mainPassesCenter(strand) ? 0.35 : 0);
}

// mainVisibleRatio measures how much of the focal chain remains readable onscreen.
function mainVisibleRatio(strand) {
  const visible = strand.vertebrae.filter((vertebra) => visibleCardRatio(vertebra) > 0.35);
  return visible.length / max(1, strand.vertebrae.length);
}

// mainPassesCenter keeps the dominant strand near the visual centre.
function mainPassesCenter(strand) {
  return strand.points.some((point) => abs(point.x) < width * 0.34 &&
    abs(point.y) < height * 0.34);
}

// assignVariantVertebrae selects exactly two or three visible cards globally.
function assignVariantVertebrae(collection) {
  collection.forEach((vertebra) => { vertebra.variant = 1; });
  const eligible = visibleVariantCandidates(collection);
  const target = min(floor(random(2, 4)), eligible.length);
  selectDistributedVariants(eligible, target)
    .forEach((vertebra) => { vertebra.variant = 2; });
}

// visibleVariantCandidates excludes offscreen and heavily cropped vertebrae.
function visibleVariantCandidates(collection) {
  return collection.filter((vertebra) => visibleCardRatio(vertebra) >= 0.45);
}

// visibleCardRatio estimates the visible area of a rotated card in the canvas.
function visibleCardRatio(vertebra) {
  const view = projectPoint(vertebra);
  const cardWidth = scene.cardWidth * view.scale;
  const cardHeight = cardWidth * ASSET_HEIGHT / ASSET_WIDTH;
  const halfWidth = (abs(cos(vertebra.angle)) * cardWidth +
    abs(sin(vertebra.angle)) * cardHeight) / 2;
  const halfHeight = (abs(sin(vertebra.angle)) * cardWidth +
    abs(cos(vertebra.angle)) * cardHeight) / 2;
  const visibleWidth = max(0, min(width, view.x + halfWidth) - max(0, view.x - halfWidth));
  const visibleHeight = max(0, min(height, view.y + halfHeight) - max(0, view.y - halfHeight));
  return visibleWidth * visibleHeight / max(1, 4 * halfWidth * halfHeight);
}

// selectDistributedVariants spreads fixed-count choices across strands and space.
function selectDistributedVariants(pool, target) {
  const shuffled = shuffleArray(pool);
  const selected = [];
  shuffled.forEach((candidate) => {
    if (selected.length < target && newStrandChoice(candidate, selected)) selected.push(candidate);
  });
  shuffled.forEach((candidate) => {
    if (selected.length < target && !selected.includes(candidate)) selected.push(candidate);
  });
  return selected;
}

// newStrandChoice favors different strands and separated local positions.
function newStrandChoice(candidate, selected) {
  const differentStrand = selected.every((item) => item.strandIndex !== candidate.strandIndex);
  const spaced = selected.every((item) => dist(item.position.x, item.position.y,
    candidate.position.x, candidate.position.y) > scene.cardWidth * 1.8);
  return selected.length === 0 || differentStrand || spaced;
}

// shuffleArray creates a seeded Fisher-Yates shuffle for natural variation.
function shuffleArray(items) {
  const result = items.slice();
  for (let index = result.length - 1; index > 0; index -= 1) {
    const pick = floor(random(index + 1));
    [result[index], result[pick]] = [result[pick], result[index]];
  }
  return result;
}

// countVariant() reports how many deficiency illustrations were selected.
function countVariant(collection, variant) {
  return collection.filter((vertebra) => vertebra.variant === variant).length;
}

// variantIndices() makes seeded Ver 2-2 placement easy to audit in the console.
function variantIndices(collection) {
  return collection.map((vertebra, index) => vertebra.variant === 2 ? index : null)
    .filter((index) => index !== null).join(',');
}

// shiftStrand translates every stored transform without changing any joint.
function shiftStrand(strand, dx, dy) {
  strand.origin.x += dx;
  strand.origin.y += dy;
  strand.screenCards = null;
  strand.curvePath.forEach((point) => { point.x += dx; point.y += dy; });
  strand.vertebrae.forEach((vertebra) => {
    vertebra.position.x += dx;
    vertebra.position.y += dy;
    vertebra.pivot.x += dx;
    vertebra.pivot.y += dy;
  });
}

// buildCandidateStrand() creates one sequential joint-based vertebra assembly.
function buildCandidateStrand(index, depth, existing, forcedTier = null) {
  const strand = makeStrand(index, depth, forcedTier);
  strand.vertebrae = createSpineAssembly(strand);
  strand.points = strand.vertebrae.map((vertebra) => vertebra.position);
  strand.curvePath = strand.points.map((point) => ({ x: point.x, y: point.y, z: point.z ?? 0 }));
  centerMissedChain(strand);
  if (debugStage !== 'assembly') {
    extendStrandToExit(strand);
    ensureFramePassage(strand);
  }
  strand.rejected = !strandContinuityValid(strand) || !adjacentSpacingValid(strand) ||
    detectExcessiveOverlap(strand, existing);
  return strand;
}

// centerMissedChain rescues a fully off-canvas proposal without breaking joints.
function centerMissedChain(strand) {
  if (strandIntersectsFrame(strand)) return;
  const middle = strand.points[floor(strand.points.length / 2)];
  shiftStrand(strand, -middle.x, -middle.y);
}

// buildValidatedStrand() gives crowded paths several cheap regeneration attempts.
function buildValidatedStrand(index, depth, existing) {
  let candidate = buildCandidateStrand(index, depth, existing);
  for (let attempt = 0; attempt < 22 && candidate.rejected; attempt += 1)
    candidate = buildCandidateStrand(index, depth, existing);
  return candidate;
}

// extendStrandToExit adds connected cards until both ends clear the frame.
function extendStrandToExit(strand) {
  extendStrandStart(strand);
  extendStrandEnd(strand);
  if (!strandIntersectsFrame(strand)) {
    centerMissedChain(strand);
    extendStrandStart(strand);
    extendStrandEnd(strand);
  }
  return strand;
}

// ensureFramePassage recentres only a complete chain that missed the viewport.
function ensureFramePassage(strand) {
  if (strandIntersectsFrame(strand)) return;
  centerMissedChain(strand);
  extendStrandStart(strand);
  extendStrandEnd(strand);
}

// extendStrandStart prepends connected cards when repair moved the entry inward.
function extendStrandStart(strand) {
  let attempts = 0;
  while (!endpointIsOutside(strand.points[0], strand) && attempts < 72) {
    const current = strand.vertebrae[0];
    const previous = calculatePreviousJointTransform(current, 0, strand);
    strand.vertebrae.unshift(previous);
    strand.points.unshift(previous.position);
    attempts += 1;
  }
}

// extendStrandEnd appends connected cards until the chain clears the frame.
function extendStrandEnd(strand) {
  let attempts = 0;
  while ((!endpointIsOutside(strand.points.at(-1), strand) ||
    !strandIntersectsFrame(strand)) && attempts < 72) {
    const previous = strand.vertebrae.at(-1);
    const next = calculateNextJointTransform(previous, 0, strand, strand.vertebrae.length);
    strand.vertebrae.push(next);
    strand.points.push(next.position);
    attempts += 1;
  }
}

// strandContinuityValid requires complete off-canvas endpoints and exact joints.
function strandContinuityValid(strand) {
  if (debugStage === 'assembly') return maxAnchorError(strand.vertebrae) < 0.01;
  const first = strand.points[0];
  const last = strand.points[strand.points.length - 1];
  return endpointIsOutside(first, strand) && endpointIsOutside(last, strand) &&
    strandIntersectsFrame(strand) && strandCurvatureValid(strand) &&
    maxAnchorError(strand.vertebrae) < 0.01;
}

// strandIntersectsFrame prevents a complete chain from missing the canvas.
function strandIntersectsFrame(strand) {
  return strand.points.some((point) => abs(point.x) <= width / 2 && abs(point.y) <= height / 2);
}

// adjacentSpacingValid rejects merged neighboring vertebra silhouettes.
function adjacentSpacingValid(strand) {
  return maxAdjacentOverlap(strand) <= 0.44;
}

// maxAdjacentOverlap reports the worst neighboring silhouette intersection.
function maxAdjacentOverlap(strand) {
  let maximum = 0;
  for (let index = 1; index < strand.vertebrae.length; index += 1)
    maximum = max(maximum, cardOverlapRatio(strand.vertebrae[index - 1], strand.vertebrae[index]));
  return maximum;
}

// cardOverlapRatio estimates actual rotated image-box overlap between two cards.
function cardOverlapRatio(first, second) {
  const a = projectedCardBounds(first);
  const b = projectedCardBounds(second);
  if (a.right < b.left || b.right < a.left || a.bottom < b.top || b.bottom < a.top) return 0;
  return maskOverlapRatio(first, second);
}

// maskOverlapRatio compares transformed opaque samples instead of transparent bounds.
function maskOverlapRatio(first, second) {
  const firstPoints = transformedMask(first);
  const secondPoints = transformedMask(second);
  const bins = buildMaskBins(secondPoints);
  let hits = 0;
  firstPoints.forEach((point) => { if (maskHasNeighbor(bins, point)) hits += 1; });
  return hits / max(1, min(firstPoints.length, secondPoints.length));
}

// transformedMask places source-alpha samples using the current card transform.
function transformedMask(vertebra) {
  const view = projectPoint(vertebra);
  const widthScale = scene.cardWidth * view.scale;
  const heightScale = widthScale * ASSET_HEIGHT / ASSET_WIDTH;
  return assetMask.map((point) => ({
    x: view.x + (point.x * widthScale * cos(vertebra.angle) -
      point.y * heightScale * sin(vertebra.angle)),
    y: view.y + (point.x * widthScale * sin(vertebra.angle) +
      point.y * heightScale * cos(vertebra.angle))
  }));
}

// buildMaskBins makes neighbor queries fast enough for repeated candidates.
function buildMaskBins(points) {
  const bins = new Set();
  points.forEach((point) => bins.add(`${floor(point.x / MASK_BIN_SIZE)},${floor(point.y / MASK_BIN_SIZE)}`));
  return bins;
}

// maskHasNeighbor tolerates small sampling differences between transformed masks.
function maskHasNeighbor(bins, point, range = 1) {
  const x = floor(point.x / MASK_BIN_SIZE);
  const y = floor(point.y / MASK_BIN_SIZE);
  for (let row = -range; row <= range; row += 1)
    for (let column = -range; column <= range; column += 1)
      if (bins.has(`${x + column},${y + row}`)) return true;
  return false;
}

// projectedCardBounds includes rotation so spacing follows the visible artwork.
function projectedCardBounds(vertebra) {
  const view = projectPoint(vertebra);
  const cardWidth = scene.cardWidth * view.scale;
  const cardHeight = cardWidth * ASSET_HEIGHT / ASSET_WIDTH;
  const halfWidth = (abs(cos(vertebra.angle)) * cardWidth + abs(sin(vertebra.angle)) * cardHeight) / 2;
  const halfHeight = (abs(sin(vertebra.angle)) * cardWidth + abs(cos(vertebra.angle)) * cardHeight) / 2;
  return { left: view.x - halfWidth, right: view.x + halfWidth,
    top: view.y - halfHeight, bottom: view.y + halfHeight, area: halfWidth * halfHeight * 4 };
}

// strandCurvatureValid makes noticeable bending a required generation rule.
function strandCurvatureValid(strand) {
  const metrics = curvatureMetrics(strand);
  return metrics.lateralRatio > 0.9 && metrics.headingSpan > 0.38 && metrics.reversals > 0;
}

// curvatureMetrics measures lateral travel and smooth heading reversals.
function curvatureMetrics(strand) {
  const source = strand.curvePath || strand.points;
  const allPoints = source.map(projectPathPoint);
  const points = visibleCurvePoints(allPoints);
  const first = points[0];
  const last = points[points.length - 1];
  const axis = normalized(last.x - first.x, last.y - first.y, 0);
  const lateral = points.map((point) => abs((point.x - first.x) * axis.y -
    (point.y - first.y) * axis.x));
  const headings = points.slice(1).map((point, index) => atan2(point.y - points[index].y,
    point.x - points[index].x));
  return { lateralRatio: max(lateral) / max(1, scene.cardWidth * strand.scale),
    headingSpan: max(headings) - min(headings), reversals: countHeadingReversals(headings) };
}

// visibleCurvePoints ignores long off-canvas exit tails during curve validation.
function visibleCurvePoints(points) {
  const visible = points.filter((point) => abs(point.x) < width * 0.62 &&
    abs(point.y) < height * 0.62);
  return visible.length >= 6 ? visible : points;
}

// countHeadingReversals detects a broad change from turning one way to the other.
function countHeadingReversals(headings) {
  let reversals = 0;
  for (let index = 2; index < headings.length; index += 1) {
    const firstTurn = wrapAngle(headings[index - 1] - headings[index - 2]);
    const secondTurn = wrapAngle(headings[index] - headings[index - 1]);
    if (firstTurn * secondTurn < -0.001) reversals += 1;
  }
  return reversals;
}

// makeStrand() assigns scale, root transform, and joint-curve type to one strand.
function makeStrand(index, depth, forcedTier = null) {
  const tier = forcedTier || (depth > 130 ? 'foreground' : depth < -180 ? 'background' : 'midground');
  const scale = debugStage === 'assembly' ? 1.0 : tier === 'foreground' ? random(1.55, 1.85) :
    tier === 'background' ? random(0.46, 0.62) : random(0.72, 0.9);
  const mode = floor(random(4));
  const rootAngle = rootAngleFor(mode);
  return { index, depth, tier, scale, mode, count: strandCount(tier),
    rootAngle, origin: rootOrigin(rootAngle, tier, scale),
    curveType: debugStage === 'assembly' ? 'C' : random() > 0.5 ? 'S' : 'C',
    noiseOffset: random(1000), curvature: random(0.95, 1.35),
    bendCount: random(0.85, 1.35), reverseCount: random(1.25, 2.2),
    curveAmplitude: random(0.62, 0.98), reverseAmplitude: random(0.2, 0.42),
    curvePhase: random(TWO_PI), reversePhase: random(TWO_PI), curveBias: random(-0.35, 0.35),
    localVariation: random(0.01, 0.025), jointLimit: random(0.22, 0.34) };
}

// strandCount() gives small background chains enough joints to cross the frame.
function strandCount(tier) {
  if (debugStage === 'assembly') return 10;
  if (tier === 'foreground') return floor(random(18, 27));
  if (tier === 'midground') return floor(random(16, 28));
  return floor(random(20, 38));
}

// rootAngleFor() points the local joint chain toward varied canvas directions.
function rootAngleFor(mode) {
  if (debugStage === 'assembly') return -0.35;
  return random(-PI, PI);
}

// rootOrigin() samples continuous canvas regions instead of fixed templates.
function rootOrigin(angle, tier, scale) {
  if (debugStage === 'assembly') return { x: -330, y: 360 };
  const direction = chainTangent(angle, 1);
  const normal = { x: -direction.y, y: direction.x };
  const margin = scene.cardWidth * scale * 0.86;
  const lead = tier === 'foreground' ? random(70, 150) : random(140, 360);
  const distance = outsideDistance(direction, margin) + lead;
  const corridor = width * abs(normal.x) / 2 + height * abs(normal.y) / 2;
  const tierSpread = tier === 'foreground' ? 240 : tier === 'midground' ? 420 : 620;
  const spread = tier === 'foreground' ? min(tierSpread, corridor * 0.05) : min(tierSpread, corridor * 0.12);
  const offset = random(-spread, spread);
  const origin = { x: -direction.x * distance + normal.x * offset,
    y: -direction.y * distance + normal.y * offset };
  return pointOutsideFrame(origin, margin) ? origin : {
    x: origin.x - direction.x * 260, y: origin.y - direction.y * 260
  };
}

// outsideDistance finds the directional distance needed to clear the frame.
function outsideDistance(direction, margin) {
  const xNeed = (width / 2 + margin) / max(abs(direction.x), 0.05);
  const yNeed = (height / 2 + margin) / max(abs(direction.y), 0.05);
  return max(xNeed, yNeed);
}

// generateJointAngles() creates smooth correlated C or S turning increments.
function generateJointAngles(count, strand) {
  return buildArray(count, (index) => {
    if (index === 0) return strand.rootAngle;
    const t = index / max(1, count - 1);
    const now = headingProfile(t, strand);
    const prior = headingProfile((index - 1) / max(1, count - 1), strand);
    const drift = (noise(strand.noiseOffset + t * 1.8) - 0.5) * strand.localVariation;
    const desired = (now - prior) * strand.curvature + drift;
    return constrain(desired, -strand.jointLimit, strand.jointLimit);
  });
}

// headingProfile creates a smooth primary bend plus a smaller reversal wave.
function headingProfile(t, strand) {
  const primary = sin(t * TWO_PI * strand.bendCount + strand.curvePhase);
  const reverse = sin(t * TWO_PI * strand.reverseCount + strand.reversePhase);
  return primary * strand.curveAmplitude + reverse * strand.reverseAmplitude +
    (t - 0.5) * strand.curveBias;
}

// createSpineAssembly() now builds the chain through forward kinematics.
function createSpineAssembly(strand) {
  return buildArticulatedSpine(strand);
}

// buildArticulatedSpine() stores every transform before creating the next bone.
// Lessons 04-06: an indexed array and a for loop build a chain of custom
// Vertebra objects, while each object reads the previous object's properties.
function buildArticulatedSpine(strand) {
  const angles = generateJointAngles(strand.count, strand);
  const bones = [makeRootVertebra(strand, angles[0])];
  for (let index = 1; index < strand.count; index += 1)
    bones.push(calculateNextJointTransform(bones[index - 1], angles[index], strand, index));
  return bones;
}

// makeRootVertebra() places the first rigid segment from its calibrated pivot.
function makeRootVertebra(strand, angle) {
  const position = { x: strand.origin.x, y: strand.origin.y, z: strand.depth };
  const pivot = worldAnchor(position, angle, 'lowerTailTip', strand.scale);
  return new Vertebra(position, chainTangent(angle, strand.scale), 0, angle,
    strand.scale, strand.index, pivot);
}

// calculateNextJointTransform() pins the next tail tip to the previous notch.
function calculateNextJointTransform(previous, relativeAngle, strand, index) {
  const angle = previous.angle + relativeAngle;
  const upperNotch = jointTarget(previous, angle, strand);
  const tailLocal = anchorLocal('lowerTailTip', strand.scale);
  const position = subtractPoint(upperNotch, rotateLocal(tailLocal, angle));
  const pivot = worldAnchor(position, angle, 'lowerTailTip', strand.scale);
  return new Vertebra({ x: position.x, y: position.y, z: strand.depth },
    chainTangent(angle, strand.scale), index, angle, strand.scale, strand.index, pivot);
}

// calculatePreviousJointTransform adds a predecessor using the same fixed joint.
function calculatePreviousJointTransform(current, relativeAngle, strand) {
  const angle = current.angle - relativeAngle;
  const tail = moveAlongChain(current.worldAnchor('lowerTailTip'), angle, strand.scale, -JOINT_GAP);
  const notchLocal = anchorLocal('upperNotch', strand.scale);
  const position = subtractPoint(tail, rotateLocal(notchLocal, angle));
  const pivot = worldAnchor(position, angle, 'lowerTailTip', strand.scale);
  return new Vertebra({ x: position.x, y: position.y, z: strand.depth },
    chainTangent(angle, strand.scale), 0, angle, strand.scale, strand.index, pivot);
}

// jointTarget adds a small constant clearance along the anatomical chain axis.
function jointTarget(previous, angle, strand) {
  return moveAlongChain(previous.worldAnchor('upperNotch'), angle, strand.scale, JOINT_GAP);
}

// moveAlongChain shifts only along the calibrated tail-to-notch direction.
function moveAlongChain(point, angle, scale, distance) {
  const tangent = chainTangent(angle, scale);
  return { x: point.x + tangent.x * distance, y: point.y + tangent.y * distance, z: point.z };
}

// validateComposition() checks every new strand against earlier strands.
function validateComposition(collection) {
  return collection.every((strand, index) =>
    !detectExcessiveOverlap(strand, collection.slice(0, index)));
}

// compositionQuality rewards central coverage while preserving open space.
function compositionQuality(collection) {
  const cells = buildOccupancy(collection);
  const occupied = cells.filter((value) => value > 0).length / cells.length;
  const central = centerCoverage(cells);
  const visible = visibleCoverage(collection);
  const framing = framingQuality(collection);
  const continuous = collection.filter((strand) => strandContinuityValid(strand)).length /
    max(1, collection.length);
  const rejected = collection.filter((strand) => strand.rejected).length;
  return occupied * 0.25 + central * 0.2 + visible * 0.25 + framing * 0.15 +
    continuous * 0.15 - rejected * 0.08;
}

// compositionBalanced rejects candidates with voids or mostly off-screen paths.
function compositionBalanced(collection) {
  const cells = buildOccupancy(collection);
  const main = collection.find((strand) => strand.tier === 'foreground');
  const foregroundCount = collection.filter((strand) => strand.tier === 'foreground').length;
  return centerCoverage(cells) >= 0.5 && visibleCoverage(collection) >= 0.4 &&
    framingQuality(collection) >= 0.28 && cells.filter((value) => value > 0).length >= 8 &&
    foregroundCount === 1 && mainStrandValid(main) && collection.every(strandContinuityValid) &&
    collection.every(adjacentSpacingValid) && validateComposition(collection);
}

// buildOccupancy marks a coarse grid from sparse articulated spine samples.
function buildOccupancy(collection) {
  const cells = buildArray(GRID_COLUMNS * GRID_ROWS, () => 0);
  collection.forEach((strand) => sampledPoints(strand).forEach((point) => markCell(cells, point)));
  return cells;
}

// markCell converts a projected point into one occupancy-grid cell.
function markCell(cells, point) {
  const column = constrain(floor(map(point.x, -width / 2, width / 2, 0, GRID_COLUMNS)), 0, GRID_COLUMNS - 1);
  const row = constrain(floor(map(point.y, -height / 2, height / 2, 0, GRID_ROWS)), 0, GRID_ROWS - 1);
  cells[row * GRID_COLUMNS + column] = 1;
}

// centerCoverage measures the four middle cells without demanding uniform fill.
function centerCoverage(cells) {
  let covered = 0;
  for (let row = 1; row < 3; row += 1)
    for (let column = 2; column < 4; column += 1)
      covered += cells[row * GRID_COLUMNS + column];
  return covered / 4;
}

// visibleCoverage estimates how much of the generated path enters the canvas.
function visibleCoverage(collection) {
  let visible = 0;
  let total = 0;
  collection.forEach((strand) => sampledPoints(strand).forEach((point) => {
    total += 1;
    if (abs(point.x) < width * 0.55 && abs(point.y) < height * 0.55) visible += 1;
  }));
  return visible / max(1, total);
}

// framingQuality prefers endpoints that deliberately continue beyond the frame.
function framingQuality(collection) {
  let outside = 0;
  let total = 0;
  collection.forEach((strand) => {
    [strand.points[0], strand.points[strand.points.length - 1]].forEach((point) => {
      total += 1;
      if (endpointIsOutside(point, strand)) outside += 1;
    });
  });
  return outside / max(1, total);
}

// endpointIsOutside waits until the rotated card silhouette clears the frame.
function endpointIsOutside(point, strand) {
  const index = point === strand.points[0] ? 0 : strand.vertebrae.length - 1;
  const bounds = projectedCardBounds(strand.vertebrae[index]);
  return bounds.right < 0 || bounds.left > width || bounds.bottom < 0 || bounds.top > height;
}

// pointOutsideFrame checks whether a center clears the full silhouette margin.
function pointOutsideFrame(point, margin) {
  return abs(point.x) > width / 2 + margin || abs(point.y) > height / 2 + margin;
}

// detectExcessiveOverlap() rejects every contact between separate strands.
function detectExcessiveOverlap(candidate, existing) {
  return existing.some((other) => !pairIsClear(candidate, other));
}

// pairIsClear checks the actual rotated opaque silhouettes of two strands.
function pairIsClear(candidate, other) {
  const first = visibleCardGeometries(candidate);
  const second = visibleCardGeometries(other);
  return !first.some((a) => second.some((b) => cardSilhouettesTouch(a, b)));
}

// visibleCardGeometries caches screen-space masks for visible vertebra cards.
function visibleCardGeometries(strand) {
  if (strand.screenCards) return strand.screenCards;
  strand.screenCards = strand.vertebrae.map((vertebra) => ({ vertebra,
    bounds: projectedCardBounds(vertebra) }))
    .filter((card) => boundsNearViewport(card.bounds, STRAND_GAP))
    .map((card) => cardGeometry(card.vertebra, card.bounds));
  return strand.screenCards;
}

// cardGeometry stores rotated bounds, opaque samples, and fast lookup bins.
function cardGeometry(vertebra, bounds) {
  const points = transformedMask(vertebra);
  return { bounds, points, bins: buildMaskBins(points) };
}

// boundsNearViewport excludes cards too far outside the visible composition.
function boundsNearViewport(bounds, margin) {
  return bounds.right > -margin && bounds.left < width + margin &&
    bounds.bottom > -margin && bounds.top < height + margin;
}

// cardSilhouettesTouch rejects overlap or an insufficient ink-to-ink gap.
function cardSilhouettesTouch(first, second) {
  if (!boundsOverlap(first.bounds, second.bounds, STRAND_GAP)) return false;
  return first.points.some((point) => maskHasNeighbor(second.bins, point, 2));
}

// boundsOverlap is a rotated-card broad phase with a deliberate safety gap.
function boundsOverlap(first, second, gap) {
  return first.right + gap > second.left && second.right + gap > first.left &&
    first.bottom + gap > second.top && second.bottom + gap > first.top;
}

// sampledPoints() checks every vertebra centre for reliable separation.
function sampledPoints(strand) {
  const points = strand.points.map((point, index) => ({ ...projectPathPoint(point), sourceIndex: index }));
  const visible = points.filter((point) => abs(point.x) < width * 0.62 &&
    abs(point.y) < height * 0.62);
  return visible.length ? visible : points;
}

// projectPathPoint() matches the fallback's restrained spatial projection.
function projectPathPoint(point) {
  const scale = constrain(scene.cameraDistance / (scene.cameraDistance - point.z), 0.86, 1.18);
  return { x: point.x * scale, y: point.y * scale };
}

// maxAnchorError() verifies every tail tip lands on the preceding notch.
function maxAnchorError(bones) {
  let error = 0;
  for (let index = 1; index < bones.length; index += 1) {
    const notch = moveAlongChain(bones[index - 1].worldAnchor('upperNotch'),
      bones[index].angle, bones[index].strandScale, JOINT_GAP);
    const tail = bones[index].worldAnchor('lowerTailTip');
    error = max(error, dist(notch.x, notch.y, tail.x, tail.y));
  }
  return error;
}

// anchorLocal() converts editable normalized anchors into card-space coordinates.
function anchorLocal(name, scale) {
  const anchor = name === 'upperNotch' ? UPPER_NOTCH_ANCHOR : LOWER_TAIL_TIP_ANCHOR;
  const height = scene.cardWidth * ASSET_HEIGHT / ASSET_WIDTH;
  const pixelScale = scene.cardWidth * scale / ASSET_WIDTH;
  const insetX = name === 'upperNotch' ? NOTCH_INSET_X * pixelScale : 0;
  const insetY = name === 'upperNotch' ? NOTCH_INSET_Y * pixelScale : 0;
  return { x: (anchor.x - 0.5) * scene.cardWidth * scale + insetX,
    y: (anchor.y - 0.5) * height * scale + insetY };
}

// rotateLocal() rotates a local anchor around the calibrated pivot frame.
function rotateLocal(point, angle) {
  return { x: point.x * cos(angle) - point.y * sin(angle),
    y: point.x * sin(angle) + point.y * cos(angle) };
}

// worldAnchor() calculates an anchor position from a card center and angle.
function worldAnchor(position, angle, name, scale) {
  const local = rotateLocal(anchorLocal(name, scale), angle);
  return { x: position.x + local.x, y: position.y + local.y, z: position.z };
}

// chainTangent() derives the visible chain direction from its two anchors.
function chainTangent(angle, scale) {
  const notch = rotateLocal(anchorLocal('upperNotch', scale), angle);
  const tail = rotateLocal(anchorLocal('lowerTailTip', scale), angle);
  return normalized(notch.x - tail.x, notch.y - tail.y, 0);
}

// addPoint() adds two-dimensional world-space coordinates safely.
function addPoint(a, b) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z ?? 0 };
}

// subtractPoint() subtracts two-dimensional world-space coordinates safely.
function subtractPoint(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z ?? 0 };
}

// wrapAngle() keeps adjacent rotations on the shortest angular path.
function wrapAngle(angle) {
  while (angle > PI) angle -= TWO_PI;
  while (angle < -PI) angle += TWO_PI;
  return angle;
}

// normalized() returns a safe unit vector for tangent and normal calculations.
function normalized(x, y, z) {
  const length = max(0.001, sqrt(x * x + y * y + z * z));
  return { x: x / length, y: y / length, z: z / length };
}

// draw() renders the red field and the one-shot layered composition.
function draw() {
  background(BACKGROUND);
  if (!isWebGL) return drawFallback();
  setCamera();
  if (debugStage === 'path') drawDebugPaths();
  else drawStrands();
  if (debugEnabled) drawJointDebugOverlay();
  resetMatrix();
  reportRender();
}

// drawFallback() uses the same spatial data when WEBGL is unavailable.
function drawFallback() {
  if (debugStage === 'path') drawFallbackPaths();
  else drawFallbackStrands();
  if (debugEnabled) drawJointDebugOverlay();
  reportRender();
}

// drawStrands() draws far layers first while preserving scale-based depth order.
function drawStrands() {
  const visible = getVisibleStrands();
  visible.slice().sort((a, b) => a.depth - b.depth).forEach((strand) =>
    strand.vertebrae.forEach((vertebra) => vertebra.display()));
}

// drawFallbackStrands() mirrors depth order with the smooth 2D projection.
function drawFallbackStrands() {
  const visible = getVisibleStrands();
  visible.slice().sort((a, b) => a.depth - b.depth).forEach((strand) =>
    strand.vertebrae.forEach((vertebra) => drawFallbackCard(vertebra)));
}

// getVisibleStrands() isolates one assembly during the old stage-A diagnostic.
function getVisibleStrands() {
  return debugStage === 'assembly' ? strands.slice(0, 1) : strands;
}

// projectPoint() adds restrained perspective while keeping all paths in frame.
function projectPoint(vertebra) {
  const perspective = ['perspective', 'dof', 'final'].includes(debugStage);
  const zScale = perspective ? constrain(scene.cameraDistance /
    (scene.cameraDistance - vertebra.position.z), 0.86, 1.18) : 1;
  return { x: width / 2 + vertebra.position.x * zScale,
    y: height / 2 + vertebra.position.y * zScale,
    scale: vertebra.strandScale * zScale };
}

// drawFallbackCard() keeps the supplied illustration flat and anatomically faced.
function drawFallbackCard(vertebra) {
  if (vertebra.variant === 2 && !variantVisible) return;
  const view = projectPoint(vertebra);
  const layer = textureForDepth(vertebra.position.z, vertebra.variant);
  push();
  translate(view.x, view.y);
  rotate(vertebra.angle);
  imageMode(CENTER);
  image(layer, 0, 0, scene.cardWidth * view.scale,
    scene.cardWidth * ASSET_HEIGHT / ASSET_WIDTH * view.scale);
  pop();
}

// setCamera() creates a fixed perspective so only the generated scene changes.
function setCamera() {
  perspective(PI / 3, width / height, 1, 4000);
  camera(0, 0, scene.cameraDistance, 0, 0, 0, 0, 1, 0);
}

// drawDebugPaths() shows every articulated centerline for composition inspection.
function drawDebugPaths() {
  strands.forEach((strand) => {
    noFill();
    stroke(255, 210);
    strokeWeight(4);
    beginShape();
    strand.points.forEach((point) => vertex(point.x, point.y, point.z));
    endShape();
  });
}

// drawFallbackPaths() projects the same diagnostic paths onto the 2D canvas.
function drawFallbackPaths() {
  strands.forEach((strand) => {
    noFill();
    stroke(255, 210);
    strokeWeight(3);
    beginShape();
    strand.points.forEach((point) => vertex(width / 2 + point.x, height / 2 + point.y));
    endShape();
  });
}

// drawJointDebugOverlay() exposes pivots, anchors, tangents, and joint links.
function drawJointDebugOverlay() {
  getVisibleStrands().forEach((strand) => strand.vertebrae.forEach((vertebra, index) => {
    const notch = vertebra.worldAnchor('upperNotch');
    const tail = vertebra.worldAnchor('lowerTailTip');
    drawDebugPoint(notch, '#FF2E2E', 14);
    drawDebugPoint(tail, '#2490FF', 8);
    if (index > 0) {
      const target = moveAlongChain(strand.vertebrae[index - 1].worldAnchor('upperNotch'),
        vertebra.angle, vertebra.strandScale, JOINT_GAP);
      drawDebugLine(tail, target, '#FFFFFF');
    }
    if (index % 2 === 0) drawDebugLabel(vertebra.position, index);
  }));
}

// drawDebugPoint() draws colored markers in either renderer.
function drawDebugPoint(point, colorValue, size = 10) {
  const view = isWebGL ? point : projectPoint({ position: point, strandScale: 1 });
  push();
  noStroke();
  fill(colorValue);
  if (isWebGL) { translate(view.x, view.y, view.z); sphere(size / 2); }
  else ellipse(view.x, view.y, size, size);
  pop();
}

// drawDebugLine() connects local anchors and successive joints.
function drawDebugLine(start, end, colorValue) {
  const first = isWebGL ? start : projectPoint({ position: start, strandScale: 1 });
  const second = isWebGL ? end : projectPoint({ position: end, strandScale: 1 });
  stroke(colorValue);
  strokeWeight(2);
  if (isWebGL) line(first.x, first.y, first.z, second.x, second.y, second.z);
  else line(first.x, first.y, second.x, second.y);
}

// drawDebugLabel() adds optional index labels near every second pivot.
function drawDebugLabel(point, index) {
  const view = isWebGL ? point : projectPoint({ position: point, strandScale: 1 });
  push();
  fill('#FFFFFF');
  noStroke();
  textSize(18);
  if (isWebGL) { translate(view.x + 8, view.y - 8, view.z); text(index, 0, 0); }
  else text(index, view.x + 8, view.y - 8);
  pop();
}

// sharpTexture() returns the original selected version at full quality.
function sharpTexture(variant) {
  return variant === 2 ? rawVertebraTwoTwo : rawVertebraOne;
}

// textureForDepth selects a sharp or atmospheric tier without changing alpha.
function textureForDepth(z, variant) {
  return renderLayers[depthTier(z)][variant];
}

// depthTier maps z positions to the three visual distance layers.
function depthTier(z) {
  if (z > 130) return 'foreground';
  if (z < -180) return 'background';
  return 'midground';
}

// depthScale() creates perspective depth without changing opacity or color.
function depthScale(z) {
  return constrain(map(z, -330, 255, 0.9, 1.12), 0.88, 1.14);
}

// reportRender() records the generated scene for reproducible visual testing.
function reportRender() {
  if (renderLogged) return;
  renderLogged = true;
  const elapsed = round(performance.now() - renderStarted);
  const main = strands.find((strand) => strand.tier === 'foreground') || strands[0];
  const end = main.points[main.points.length - 1];
  console.info(`[Spine] seed=${seedValue} stage=${debugStage} strands=${strands.length} ` +
    `vertebrae=${vertebrae.length} main=${main.tier}/${main.mode} ` +
    `scale=${main.scale.toFixed(2)} end=${round(end.x)},${round(end.y)} ` +
    `anchorError=${maxAnchorError(main.vertebrae).toFixed(3)} ` +
    `continuous=${strands.every(strandContinuityValid)} ` +
    `ver2-2=${countVariant(vertebrae, 2)}@${variantIndices(vertebrae)} ` +
    `background=${BACKGROUND} debug=${debugEnabled} renderMs=${elapsed}`);
}

// Vertebra owns one original illustration card and its local curve orientation.
// Lessons 06-07: this class groups data (properties) and behaviour (methods)
// so one Vertebra object can be transformed and drawn consistently.
class Vertebra {
  constructor(position, tangent, index, angle, strandScale, strandIndex, pivot) {
    this.position = position;
    this.tangent = tangent;
    this.index = index;
    this.angle = angle;
    this.strandScale = strandScale;
    this.strandIndex = strandIndex;
    this.pivot = pivot;
  }

  // worldAnchor() returns a named local attachment in world coordinates.
  worldAnchor(name) {
    return worldAnchor(this.position, this.angle, name, this.strandScale);
  }

  // display() draws the original asset without changing anatomical facing.
  display() {
    drawCard(this, textureForDepth(this.position.z, this.variant), depthScale(this.position.z));
  }
}

// drawCard() uses a textured plane and preserves the asset's original facing.
function drawCard(vertebra, textureLayer, perspectiveScale) {
  if (vertebra.variant === 2 && !variantVisible) return;
  const scale = vertebra.strandScale * perspectiveScale;
  push();
  translate(vertebra.position.x, vertebra.position.y, vertebra.position.z);
  rotateZ(vertebra.angle);
  texture(textureLayer);
  configureWebGLTextureFiltering();
  noStroke();
  plane(scene.cardWidth * scale, scene.cardWidth * ASSET_HEIGHT / ASSET_WIDTH * scale);
  pop();
}
