/*
 * Unequal Access to Food
 * A standalone p5.js generative study for SDG 2 — Zero Hunger.
 *
 * The simulation is intentionally organized by concern so the artwork can be
 * tuned as a visual system: layout, text/glyph geometry, particles, rings,
 * and rendering are independent enough to iterate safely.
 * Water motion is adapted from the supplied OpenProcessing reference:
 * tp5_250806_StaircaseWaterway, credited to はぅ君. The adapted idea is
 * documented again at flowField(); the surrounding particle, typography,
 * ring-collision, and rendering systems are specific to this project.
 */

// Lesson 01-02: named variables and constants keep the visual system readable.
// The fixed design space is 1920 x 1080; CSS scales it to the browser viewport.
const CONFIG = {
  logicalWidth: 1920,
  logicalHeight: 1080,
  particleCount: 3400,
  maxCapturedPerRing: [24, 24, 86, 8, 24, 24],
  upperRetention: 0.31,
  centralRetention: 0.88,
  bottomRetention: 0.065,
  gravity: 0.23,
  flowSpeed: 0.88,
  drag: 0.992,
  collisionPadding: 3.2,
  emissionRampFrames: 120,
  debugSeed: null,
  debugMode: false,
  textColor: [17, 17, 17],
  water: [209, 106, 94],
  red: [137, 45, 43],
};

const FLOW_STREAMS = [0.10, 0.22, 0.34, 0.46, 0.58, 0.70, 0.82, 0.92];

const TOP_TEXT =
  "Food is essential to everyone, yet access is not equal. While food may be available, financial, geographical and structural barriers can leave disadvantaged communities with fewer opportunities to obtain sufficient nutrition.";

const BOTTOM_TEXT =
  "Food availability does not guarantee access. High food prices can place nutritious meals out of reach. Distance and limited transportation can restrict access to food. Unequal circumstances create unequal opportunities to obtain sufficient, safe and nutritious food, even when food is available within the wider community.";

let ringImage;
let icelandFont;
let glyphMask;
let glyphPixels;
let flowLayer;
let mistLayer;
let canvas;
let layout;
let rings = [];
let particles = [];
let disturbances = [];
let glyphs = [];
let glyphBuckets = new Map();
const GLYPH_CELL_SIZE = 32;
let grainRng;
let pixelScale = 1;
let lastFrame = 0;
let fixedAccumulator = 0;
let simulationAge = 0;
let flowFrame = 0;
let mistFrame = 0;
let sourceTime = 0;
let emissionSerial = 0;
let MIST_WIDTH = 360;
let MIST_HEIGHT = 211;
const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

function preload() {
  ringImage = loadImage("assets/ceramic-ring.png");
  icelandFont = loadFont(
    "https://fonts.gstatic.com/s/iceland/v22/rax9HiuFsdMNOnWPWKw.ttf"
  );
}

// Lesson 01 and Supplement 08: p5 calls setup once, then draw repeatedly.
// Setup creates the arrays and image buffers before the animation begins.
function setup() {
  // The artwork is already rendered from a stable logical coordinate system.
  // A single backing pixel keeps the particle simulation responsive in Chrome
  // while CSS still scales the composition cleanly for the prototype.
  pixelScale = 1;
  syncViewportSize();
  canvas = createCanvas(CONFIG.logicalWidth, CONFIG.logicalHeight);
  canvas.parent("canvas-holder");
  pixelDensity(pixelScale);
  flowLayer = createGraphics(CONFIG.logicalWidth, CONFIG.logicalHeight);
  flowLayer.pixelDensity(1);
  flowLayer.background(255);
  mistLayer = createGraphics(MIST_WIDTH, MIST_HEIGHT);
  mistLayer.pixelDensity(1);
  flowFrame = 0;
  mistFrame = 0;
  frameRate(60);
  grainRng = CONFIG.debugSeed === null ? randomSeed : seededRandom(CONFIG.debugSeed);
  layout = buildLayout();
  buildGlyphGeometry();
  buildGlyphMask();
  buildRings();
  seedParticles();
  lastFrame = millis();
}

function draw() {
  const now = millis();
  const elapsed = constrain((now - lastFrame) / 16.6667, 0, 4);
  lastFrame = now;

  background(255);
  fixedAccumulator += elapsed;
  while (fixedAccumulator >= 1) {
    simulationAge += 1;
    updateRings(1);
    updateParticles(1);
    updateGlyphs(1);
    updateDisturbances(1);
    fixedAccumulator -= 1;
  }
  renderArtwork();
}

function windowResized() {
  syncViewportSize();
  resizeCanvas(CONFIG.logicalWidth, CONFIG.logicalHeight);
  layout = buildLayout();
  buildGlyphGeometry();
  buildGlyphMask();
  flowLayer.remove();
  flowLayer = createGraphics(CONFIG.logicalWidth, CONFIG.logicalHeight);
  flowLayer.pixelDensity(1);
  flowLayer.background(255);
  mistLayer.remove();
  mistLayer = createGraphics(MIST_WIDTH, MIST_HEIGHT);
  mistLayer.pixelDensity(1);
  rebuildRingGeometry();
  resizeParticlePool();
}

function syncViewportSize() {
  // Keep the internal artwork at full-HD; the stylesheet handles fullscreen
  // presentation without changing the coordinate system used by the sketch.
  CONFIG.logicalWidth = DESIGN_WIDTH;
  CONFIG.logicalHeight = DESIGN_HEIGHT;
  const widthScale = CONFIG.logicalWidth / DESIGN_WIDTH;
  CONFIG.particleCount = Math.round(3400 * constrain(widthScale, 0.8, 1.8));
  MIST_WIDTH = Math.max(180, Math.round(CONFIG.logicalWidth / 3.5));
  MIST_HEIGHT = Math.max(120, Math.round(CONFIG.logicalHeight / 3.5));
}

function layoutScale() {
  return Math.min(CONFIG.logicalWidth / DESIGN_WIDTH, CONFIG.logicalHeight / DESIGN_HEIGHT);
}

function buildLayout() {
  // Lesson 04-06: this array of objects stores reusable positions and sizes.
  // Later loops read these properties instead of repeating drawing constants.
  const W = CONFIG.logicalWidth;
  const H = CONFIG.logicalHeight;
  const s = layoutScale();
  return {
    topText: { x: W * 0.105, y: H * 0.105, width: W * 0.79 },
    centralGuide: { x: W * 0.5, y: H * 0.515 },
    bottomBlock: { x: W * 0.52, y: H * 0.82 },
    ringSpecs: [
      { x: W * 0.15, y: H * 0.36, size: 135 * s, type: "upper-left" },
      { x: W * 0.27, y: H * 0.405, size: 112 * s, type: "upper-left" },
      { x: W * 0.50, y: H * 0.53, size: 250 * s, type: "central" },
      { x: W * 0.73, y: H * 0.415, size: 112 * s, type: "upper-right" },
      { x: W * 0.85, y: H * 0.365, size: 135 * s, type: "upper-right" },
      { x: W * 0.50, y: H * 0.82, size: 74 * s, type: "bottom" },
    ],
  };
}

function buildGlyphGeometry() {
  glyphs = [];
  glyphBuckets = new Map();
  const s = layoutScale();
  textFont(artworkFont());
  textStyle(NORMAL);

  const topSize = 24 * s;
  const bottomSize = 20 * s;
  textSize(topSize);
  const topLines = wrapText(TOP_TEXT, layout.topText.width, topSize);
  topLines.forEach((line, lineIndex) => {
    addGlyphLine(line, layout.topText.x, layout.topText.y + lineIndex * 29 * s, topSize, "top");
  });

  buildBottomTextFlow(bottomSize).forEach((run) => {
    addGlyphLine(run.text, run.x, run.y, bottomSize, "bottom");
  });

  for (const glyph of glyphs) {
    const key = glyphBucketKey(glyph.baseX, glyph.baseY);
    if (!glyphBuckets.has(key)) glyphBuckets.set(key, []);
    glyphBuckets.get(key).push(glyph);
  }
}

function artworkFont() {
  return icelandFont || "Iceland";
}

function buildBottomTextFlow(fontSize) {
  const ring = layout.ringSpecs[5];
  const s = layoutScale();
  const paragraphWidth = Math.min(CONFIG.logicalWidth * 0.42, 430 * s);
  const paragraphLeft = ring.x - paragraphWidth / 2;
  const paragraphRight = ring.x + paragraphWidth / 2;
  const lineHeight = 23 * s;
  const centralRing = layout.ringSpecs[2];
  const centralDrawH = centralRing.size * (232 / 229);
  const clearBelowCentral = centralRing.y + centralDrawH * 0.5 + 28 * s;
  const keepNearSmallTorus = ring.y - 126 * s;
  const firstY = Math.max(clearBelowCentral, keepNearSmallTorus);
  // Keep the resting text geometry fixed to the ring's anchor. The ceramic
  // can spring a few pixels during the simulation without making the
  // paragraph reflow or jitter. The exclusion uses the rendered outer radius,
  // a readable margin, and the ring's maximum spring travel as a stable
  // envelope so the live image can never catch the resting glyphs.
  const torus = {
    cx: ring.x,
    cy: ring.y,
    radius: Math.max(ring.size, ring.size * (232 / 229)) * 0.5,
    margin: 14 * s,
    springEnvelope: 0,
  };
  const tokens = BOTTOM_TEXT.match(/\S+\s*/g) || [];
  const runs = [];
  let tokenIndex = 0;
  let lineIndex = 0;
  const maxLines = 14;

  textFont(artworkFont());
  textSize(fontSize);

  // These two lines sit in the clear space below the large torus. They are
  // measured and centered as whole lines, then the remaining words continue
  // through the circular exclusion flow below.
  const leadLines = [
    "Food availability does not guarantee access.",
    "High food prices can place nutritious meals out of reach.",
  ];
  for (const leadLine of leadLines) {
    const leadTokens = leadLine.match(/\S+\s*/g) || [];
    const leadWidth = textWidth(leadLine);
    runs.push({ text: leadLine, x: ring.x - leadWidth * 0.5, y: firstY + lineIndex * lineHeight });
    tokenIndex += leadTokens.length;
    lineIndex += 1;
  }

  while (tokenIndex < tokens.length && lineIndex < maxLines) {
    const y = firstY + lineIndex * lineHeight;
    const lineTop = y;
    const lineBottom = y + fontSize * 1.12;
    const exclusion = circularTextExclusion(torus, lineTop, lineBottom);
    const intersectsRing = exclusion !== null;
    let placedOnLine = false;

    if (intersectsRing) {
      const leftWidth = exclusion.left - paragraphLeft;
      const rightWidth = paragraphRight - exclusion.right;
      const leftRun = consumeFlowSegment(tokens, tokenIndex, leftWidth);
      const rightRun = consumeFlowSegment(tokens, leftRun.nextIndex, rightWidth);
      const leftTokens = leftRun.tokens.slice();
      const rightTokens = rightRun.tokens.slice();

      // Preserve reading order while avoiding a visibly stunted right run:
      // move a whole final word across the split only when it still fits the
      // right segment. This keeps the measured word flow natural.
      if (leftTokens.length > 1 && rightTokens.length > 0 && rightRun.width < leftRun.width) {
        const candidate = leftTokens[leftTokens.length - 1];
        const candidateWidth = textWidth(candidate);
        if (rightRun.width + candidateWidth <= rightWidth) {
          leftTokens.pop();
          rightTokens.unshift(candidate);
        }
      }

      const leftText = leftTokens.join("");
      const rightText = rightTokens.join("");
      const rightTextWidth = rightTokens.reduce((sum, token) => sum + textWidth(token), 0);
      if (leftText.trim()) {
        runs.push({ text: leftText, x: paragraphLeft, y });
        placedOnLine = true;
      }
      if (rightText.trim()) {
        runs.push({ text: rightText, x: paragraphRight - rightTextWidth, y });
        placedOnLine = true;
      }
      tokenIndex = rightRun.nextIndex;
    } else {
      const fullRun = consumeFlowSegment(tokens, tokenIndex, paragraphWidth);
      if (fullRun.tokens.length > 0) {
        const centeredX = paragraphLeft + (paragraphWidth - fullRun.width) * 0.5;
        runs.push({ text: fullRun.tokens.join(""), x: centeredX, y });
        tokenIndex = fullRun.nextIndex;
        placedOnLine = true;
      }
    }

    // A word that cannot fit beside the ring gets a clean full-width line
    // below it, rather than being forced into the ceramic exclusion zone.
    if (!placedOnLine && !intersectsRing) {
      const token = tokens[tokenIndex];
      runs.push({ text: token, x: paragraphLeft, y });
      tokenIndex += 1;
    }
    lineIndex += 1;
  }

  return runs;
}

function consumeFlowSegment(tokens, startIndex, availableWidth) {
  const segmentTokens = [];
  let width = 0;
  let index = startIndex;
  while (index < tokens.length) {
    const token = tokens[index];
    const tokenWidth = textWidth(token);
    if (segmentTokens.length > 0 && width + tokenWidth > availableWidth) break;
    if (segmentTokens.length === 0 && tokenWidth > availableWidth) break;
    segmentTokens.push(token);
    width += tokenWidth;
    index += 1;
  }
  return { tokens: segmentTokens, width, nextIndex: index };
}

function circularTextExclusion(torus, lineTop, lineBottom) {
  const effectiveRadius = torus.radius + torus.margin + torus.springEnvelope;
  const dy = lineBottom < torus.cy
    ? torus.cy - lineBottom
    : lineTop > torus.cy
      ? lineTop - torus.cy
      : 0;
  if (dy >= effectiveRadius) return null;

  const dx = Math.sqrt(Math.max(0, effectiveRadius * effectiveRadius - dy * dy));
  return {
    left: torus.cx - dx,
    right: torus.cx + dx,
  };
}

function addGlyphLine(line, x, y, size, group) {
  textSize(size);
  let cursor = x;
  for (const character of line) {
    const width = textWidth(character);
    if (character !== " ") {
      glyphs.push({
        character,
        baseX: cursor,
        baseY: y,
        x: cursor,
        y,
        width,
        height: size * 1.15,
        fontSize: size,
        group,
        dx: 0,
        dy: 0,
        vx: 0,
        vy: 0,
        rotation: 0,
        rotationVelocity: 0,
        impactCooldown: 0,
        pressureX: 0,
        pressureY: 0,
      });
    }
    cursor += width;
  }
}

function buildGlyphMask() {
  if (glyphMask) glyphMask.remove();
  glyphMask = createGraphics(CONFIG.logicalWidth, CONFIG.logicalHeight);
  glyphMask.pixelDensity(1);
  glyphMask.background(0);
  glyphMask.noStroke();
  glyphMask.fill(255);
  glyphMask.textFont(artworkFont());
  glyphMask.textStyle(NORMAL);
  glyphMask.textAlign(LEFT, TOP);

  for (const glyph of glyphs) {
    glyphMask.textSize(glyph.fontSize);
    glyphMask.text(glyph.character, glyph.baseX, glyph.baseY);
  }
  glyphMask.loadPixels();
  glyphPixels = glyphMask.pixels;
}

function buildRings() {
  rings = layout.ringSpecs.map((spec, index) => createRing(spec, index));
}

function rebuildRingGeometry() {
  rings.forEach((ring, index) => {
    const spec = layout.ringSpecs[index];
    Object.assign(ring, ringGeometry(spec, index));
    ring.anchorX = spec.x;
    ring.anchorY = spec.y;
    syncRingCollisionGeometry(ring);
  });
}

function createRing(spec, index) {
  const ring = ringGeometry(spec, index);
  ring.captured = [];
  ring.type = spec.type;
  ring.maxCaptured = CONFIG.maxCapturedPerRing[index];
  ring.captureCount = 0;
  ring.anchorX = spec.x;
  ring.anchorY = spec.y;
  ring.dx = 0;
  ring.dy = 0;
  ring.vx = 0;
  ring.vy = 0;
  ring.rotation = 0;
  ring.angularVelocity = 0;
  ring.mass = spec.type === "central" ? 4.2 : spec.type === "bottom" ? 0.7 : 1.25;
  ring.spring = spec.type === "central" ? 0.012 : 0.022;
  ring.damping = spec.type === "central" ? 0.88 : 0.82;
  ring.angularSpring = spec.type === "central" ? 0.014 : 0.026;
  ring.angularDamping = spec.type === "central" ? 0.9 : 0.8;
  syncRingCollisionGeometry(ring);
  return ring;
}

function syncRingCollisionGeometry(ring) {
  const x = ring.anchorX + ring.dx;
  const y = ring.anchorY + ring.dy;
  const holeOffsetX = Math.sin(ring.rotation) * ring.drawH * 0.025;
  const holeOffsetY = Math.cos(ring.rotation) * ring.drawH * 0.025;
  ring.hole.x = x;
  ring.hole.x += holeOffsetX;
  ring.hole.y = y + holeOffsetY;
  ring.outer.x = x;
  ring.outer.y = y;
}

function updateRings(dt) {
  for (const ring of rings) {
    ring.vx += (-ring.dx * ring.spring - ring.vx * (1 - ring.damping)) / ring.mass * dt;
    ring.vy += (-ring.dy * ring.spring - ring.vy * (1 - ring.damping)) / ring.mass * dt;
    ring.vx *= Math.pow(ring.damping, dt);
    ring.vy *= Math.pow(ring.damping, dt);
    ring.dx = constrain(ring.dx + ring.vx * dt, -10, 10);
    ring.dy = constrain(ring.dy + ring.vy * dt, -8, 8);
    ring.angularVelocity += (-ring.rotation * ring.angularSpring - ring.angularVelocity * 0.12) / ring.mass * dt;
    ring.angularVelocity *= Math.pow(ring.angularDamping, dt);
    ring.rotation = constrain(ring.rotation + ring.angularVelocity * dt, -0.08, 0.08);
    syncRingCollisionGeometry(ring);
  }
}

function impactRing(ring, particle, strength = 1) {
  const centerX = ring.anchorX + ring.dx;
  const centerY = ring.anchorY + ring.dy;
  const direction = normalize({ x: particle.x - centerX, y: particle.y - centerY });
  const speed = Math.max(0.5, Math.hypot(particle.vx, particle.vy));
  const impulse = Math.min(0.72, speed * 0.035 * strength / ring.mass);
  ring.vx += direction.x * impulse;
  ring.vy += direction.y * impulse * 0.75;
  const torque = ((particle.x - centerX) * particle.vy - (particle.y - centerY) * particle.vx) * 0.000028;
  ring.angularVelocity += constrain(torque * strength / ring.mass, -0.012, 0.012);
}

function ringGeometry(spec, index) {
  // The supplied PNG is a transparent 1181px square with the visible ceramic
  // object occupying this smaller region. Cropping to the opaque ring keeps
  // the intended scale relationships from the reference composition.
  const crop = { x: 501, y: 519, w: 229, h: 232 };
  const scale = spec.size / crop.w;
  const drawW = spec.size;
  const drawH = crop.h * scale;
  const hole = {
    x: spec.x,
    y: spec.y + drawH * 0.025,
    rx: spec.size * 0.175,
    ry: drawH * 0.17,
  };
  return {
    ...spec,
    index,
    crop,
    drawW,
    drawH,
    imageX: spec.x - drawW / 2,
    imageY: spec.y - drawH / 2,
    hole,
    outer: { x: spec.x, y: spec.y, rx: drawW * 0.5, ry: drawH * 0.5 },
  };
}

function seedParticles() {
  particles = [];
  for (let i = 0; i < CONFIG.particleCount; i += 1) {
    const particle = makeParticle(false, i);
    particle.state = "dormant";
    particles.push(particle);
  }
}

function resizeParticlePool() {
  if (!particles.length) return;
  while (particles.length < CONFIG.particleCount) {
    const particle = makeParticle(false, particles.length);
    particle.state = "dormant";
    particles.push(particle);
  }
  while (particles.length > CONFIG.particleCount) {
    const particle = particles.pop();
    if (particle && particle.state === "captured" && particle.ring) {
      const index = particle.ring.captured.indexOf(particle);
      if (index >= 0) particle.ring.captured.splice(index, 1);
    }
  }
}

function makeParticle(initial = false, index = 0) {
  // Lesson 06-07: each particle is an object with properties that describe
  // both its state and its visual behaviour during the animation.
  const W = CONFIG.logicalWidth;
  const streamId = Math.floor(grainRand(0, FLOW_STREAMS.length));
  const streamX = W * FLOW_STREAMS[streamId];
  const sourceX = (sourceTime * 99 + emissionSerial * 17 + index * 11) % W;
  emissionSerial += 1;
  const p = {
    x: initial ? streamX + grainRand(-92, 92) : sourceX + grainRand(-58, 58),
    y: initial ? grainRand(-H(0.08), H(0.86)) : -grainRand(8, 90),
    vx: grainRand(-0.55, 0.55),
    vy: grainRand(0.95, 1.8),
    g: 0,
    size: grainRand(1.05, 2.45),
    mass: grainRand(0.65, 1.25),
    state: "falling",
    age: initial ? grainRand(0, 600) : 0,
    safeFrames: 0,
    stuckFrames: 0,
    lastY: 0,
    avoidGlyph: null,
    avoidFrames: 0,
    ring: null,
    captureTarget: null,
    streamId,
    streamX,
    alpha: grainRand(165, 245),
    streamOffset: grainRand(0, 1000) + index * 0.013,
  };
  p.prevX = p.x;
  p.prevY = p.y;
  p.lastY = p.y;
  p.trail = [{ x: p.x, y: p.y }];
  return p;
}

function updateParticles(dt) {
  // Lesson 03 and Lessons 11-12: the loop updates every array element while
  // if/else branches move particles between dormant, falling, and captured states.
  sourceTime += 9 * dt;
  const emissionProgress = constrain(simulationAge / CONFIG.emissionRampFrames, 0, 1);
  const targetActive = Math.floor(CONFIG.particleCount * emissionProgress);
  let activeCount = 0;
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    if (p.state === "dormant") {
      if (activeCount < targetActive) {
        particles[i] = makeParticle(false, i);
        activeCount += 1;
      }
      continue;
    }
    if (p.state === "falling" || p.state === "captured") activeCount += 1;
    if (p.state === "captured") {
      updateCapturedParticle(p, dt);
      continue;
    }

    p.age += dt;
    p.size = Math.max(0.68, p.size * Math.pow(0.997, dt));
    p.safeFrames = Math.max(0, p.safeFrames - dt);
    p.avoidFrames = Math.max(0, p.avoidFrames - dt);
    if (p.avoidFrames <= 0) p.avoidGlyph = null;
    p.prevX = p.x;
    p.prevY = p.y;
    const prev = { x: p.x, y: p.y };
    const flow = flowField(p.x, p.y, sourceTime + p.streamOffset, p);
    p.vx = flow.dx;
    p.vy = flow.dy;
    p.vx *= Math.pow(CONFIG.drag, dt);
    p.vy *= Math.pow(CONFIG.drag, dt);

    guideTowardCentralHole(p, dt);
    if (nearTextBand(p.y) && ((Math.floor(p.age) + Math.floor(p.streamOffset)) % 2 === 0)) {
      applyGlyphPressure(p);
    }
    const next = { x: p.x + p.vx * dt, y: p.y + p.vy * dt };
    if (!collideWithGlyphs(p, prev, next)) {
      p.x = next.x;
      p.y = next.y;
    }


    const movementThisFrame = Math.hypot(p.x - prev.x, p.y - prev.y);
    if (movementThisFrame < 0.08) p.stuckFrames += 1;
    else p.stuckFrames = Math.max(0, p.stuckFrames - 2);
    p.lastY = p.y;
    if (p.stuckFrames > 24) recoverStuckParticle(p);

    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 6) p.trail.shift();

    collideWithRings(p, prev);
    p.vy = Math.min(p.vy, 7.2);

    if (p.y > CONFIG.logicalHeight + 24 || p.x < -80 || p.x > CONFIG.logicalWidth + 80) {
      particles[i] = makeParticle(false, i);
    }
  }
}

function flowField(x, y, t, particle) {
  // Adapted external principle: one shared Perlin sample decides whether a
  // droplet falls quickly or slides sideways along a stair-like edge. This is
  // the limited borrowed idea; the particle data and project-specific rules
  // around it were written for this artwork. See README for attribution.
  const W = CONFIG.logicalWidth;
  const noiseValue = noise(x / W, y / 9, t / W);
  if (noiseValue > 0.4) {
    particle.g = Math.min(particle.g + 0.5, 7.2);
    return { dx: 0, dy: particle.g };
  }

  particle.g = 0;
  const step = noiseValue % 0.1 > 0.05 ? 1 : -1;
  return { dx: step, dy: 0.5 };
}

function guideTowardCentralHole(p, dt) {
  const central = rings.find((ring) => ring.type === "central");
  const inFunnelY = p.y > CONFIG.logicalHeight * 0.22 && p.y < central.hole.y - central.hole.ry * 0.25;
  if (!inFunnelY) return;
  const dx = central.hole.x - p.x;
  const funnelWidth = 235;
  const influence = constrain(1 - Math.abs(dx) / funnelWidth, 0, 1);
  p.vx += constrain(dx * 0.0009 * influence * dt, -0.11, 0.11);
}

function collideWithGlyphs(p, prev, next) {
  if (p.safeFrames > 0 || next.y < 0 || next.y > CONFIG.logicalHeight) return false;
  if (!nearTextBand(next.y)) return false;
  const samples = [
    [next.x, next.y],
    [next.x - p.size * 0.6, next.y],
    [next.x + p.size * 0.6, next.y],
    [next.x, next.y - p.size * 0.65],
    [next.x, next.y + p.size * 0.65],
  ];
  let hit = false;
  let normalX = 0;
  let normalY = 0;
  let hitGlyph = null;
  let contactX = next.x;
  let contactY = next.y;
  for (const [x, y] of samples) {
    const glyph = dynamicGlyphAt(x, y, p.avoidGlyph);
    if (glyph) {
      hit = true;
      hitGlyph = glyph;
      contactX = x;
      contactY = y;
      normalX += x - prev.x;
      normalY += y - prev.y;
    }
  }
  if (!hit) return false;

  // The particle is moving into the glyph, so the outward normal points
  // opposite the incoming step. This resolves penetration before routing.
  const normal = normalize({ x: -normalX || 0, y: -normalY || -1 });
  const tangent = chooseSlidingTangent(p, contactX, contactY, normal, hitGlyph);
  const incomingSpeed = Math.max(0.55, Math.hypot(p.vx, p.vy));
  const tangentSpeed = Math.max(0.45, incomingSpeed * 0.72);

  p.x = contactX + normal.x * (p.size + 1.6);
  p.y = contactY + normal.y * (p.size + 1.6);
  p.vx = tangent.x * tangentSpeed + normal.x * 0.16;
  p.vy = Math.max(0.46, tangent.y * tangentSpeed + 0.18);
  p.safeFrames = 2;
  p.avoidGlyph = hitGlyph;
  p.avoidFrames = 12;
  p.stuckFrames = 0;
  jostleGlyph(hitGlyph, p.vx, p.vy);
  disturbances.push({
    x: p.x,
    y: p.y,
    radius: 2.5,
    life: 0.7,
    normalX: normal.x,
    normalY: normal.y,
    tangentX: tangent.x,
    tangentY: tangent.y,
  });
  return true;
}

function glyphAt(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= CONFIG.logicalWidth || iy >= CONFIG.logicalHeight) return false;
  const index = (iy * CONFIG.logicalWidth + ix) * 4;
  return glyphPixels && glyphPixels[index] > 100;
}

function dynamicGlyphAt(x, y, ignoredGlyph = null) {
  const cellX = Math.floor(x / GLYPH_CELL_SIZE);
  const cellY = Math.floor(y / GLYPH_CELL_SIZE);
  for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      const bucket = glyphBuckets.get(`${cellX + offsetX}:${cellY + offsetY}`) || [];
      for (const glyph of bucket) {
        if (glyph === ignoredGlyph) continue;
        const localX = x - glyph.dx;
        const localY = y - glyph.dy;
        const inGlyphBox = localX >= glyph.baseX - 2 && localX <= glyph.baseX + glyph.width + 2 &&
          localY >= glyph.baseY - 2 && localY <= glyph.baseY + glyph.height;
        if (inGlyphBox && glyphAt(localX, localY)) return glyph;
      }
    }
  }
  return null;
}

function nearbyGlyphCandidates(x, y) {
  const cellX = Math.floor(x / GLYPH_CELL_SIZE);
  const cellY = Math.floor(y / GLYPH_CELL_SIZE);
  const candidates = [];
  for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      const bucket = glyphBuckets.get(`${cellX + offsetX}:${cellY + offsetY}`) || [];
      candidates.push(...bucket);
    }
  }
  return candidates;
}

function applyGlyphPressure(p) {
  for (const glyph of nearbyGlyphCandidates(p.x, p.y)) {
    const centerX = glyph.baseX + glyph.width * 0.5 + glyph.dx;
    const centerY = glyph.baseY + glyph.height * 0.45 + glyph.dy;
    const localX = p.x - glyph.dx;
    const localY = p.y - glyph.dy;
    const expandedWidth = glyph.width * 0.5 + 14;
    const expandedHeight = glyph.height * 0.5 + 14;
    if (Math.abs(p.x - centerX) > expandedWidth || Math.abs(p.y - centerY) > expandedHeight) continue;

    const shapeHit = glyphAt(localX, localY) ||
      glyphAt(localX + p.vx * 2.2, localY + p.vy * 2.2) ||
      dynamicGlyphAt(p.x + p.vx * 5, p.y + p.vy * 5, p.avoidGlyph) === glyph;
    if (!shapeHit) continue;

    const fromGlyph = normalize({ x: p.x - centerX, y: p.y - centerY });
    const distance = Math.hypot(p.x - centerX, p.y - centerY);
    const influence = constrain(1 - distance / 26, 0, 1);
    const force = influence * 0.65 * (glyph.group === "bottom" ? 0.58 : 1);
    glyph.pressureX -= fromGlyph.x * force;
    glyph.pressureY -= fromGlyph.y * force;
    // The particle is nudged away from the displaced glyph, but its downward
    // component is never cancelled; this keeps the flow moving through gaps.
    p.vx += fromGlyph.x * influence * 0.065;
    p.vy += Math.max(0, fromGlyph.y) * influence * 0.03;
  }
}

function chooseSlidingTangent(p, x, y, normal, hitGlyph) {
  const candidates = [
    normalize({ x: -normal.y, y: Math.abs(normal.x) + 0.42 }),
    normalize({ x: normal.y, y: Math.abs(normal.x) + 0.42 }),
  ];
  let best = candidates[0];
  let bestScore = -Infinity;
  for (const candidate of candidates) {
    let score = candidate.y * 2.6;
    for (const distance of [5, 11, 18]) {
      const testX = x + candidate.x * distance;
      const testY = y + candidate.y * distance;
      if (dynamicGlyphAt(testX, testY, hitGlyph)) score -= 4.5;
      if (testY > y) score += 0.35;
    }
    const towardCenter = (CONFIG.logicalWidth * 0.5 - p.x) * candidate.x;
    score += towardCenter * 0.00012;
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

function recoverStuckParticle(p) {
  const nudge = p.vx >= 0 ? 1 : -1;
  p.x += nudge * 4.5;
  p.y += 2.5;
  p.vx = nudge * 0.8;
  p.vy = 1.2;
  p.avoidGlyph = null;
  p.avoidFrames = 0;
  p.safeFrames = 5;
  p.stuckFrames = 0;
}

function glyphBucketKey(x, y) {
  return `${Math.floor(x / GLYPH_CELL_SIZE)}:${Math.floor(y / GLYPH_CELL_SIZE)}`;
}

function nearTextBand(y) {
  const s = layoutScale();
  const topStart = layout.topText.y - 10 * s;
  const topEnd = layout.topText.y + 78 * s;
  const bottomStart = layout.ringSpecs[5].y - 160 * s;
  const bottomEnd = layout.ringSpecs[5].y + 150 * s;
  return (y >= topStart && y <= topEnd) || (y >= bottomStart && y <= bottomEnd);
}

function collideWithRings(p, prev) {
  for (const ring of rings) {
    if (p.safeFrames > 0) continue;
    const hole = ring.hole;
    const local = ringLocalPoint(ring, p.x, p.y);
    const holeLocalY = ring.drawH * 0.025;
    const localHoleY = local.y - holeLocalY;
    const inHole = ellipseContains(local.x, localHoleY, 0, 0, hole.rx, hole.ry);
    if (inHole && p.vy > -0.5) {
      const holeDistance = Math.hypot(local.x / hole.rx, localHoleY / hole.ry);
      if (holeDistance > 0.72) impactRing(ring, p, 0.45);
      if (shouldCapture(ring)) {
        captureParticle(p, ring);
        return;
      }
      // A missed opening remains a visible, physical escape: the particle exits
      // through the lower half rather than blinking away.
      p.vy *= 0.82;
      p.vx += grainRand(-0.33, 0.33);
      p.y = hole.y + hole.ry * 0.9;
      p.safeFrames = 5;
      continue;
    }

    const outer = ring.outer;
    if (ellipseContains(local.x, local.y, 0, 0, outer.rx, outer.ry)) {
      const distanceToHole = Math.hypot(local.x / hole.rx, localHoleY / hole.ry);
      if (distanceToHole < 1.45) continue;
      const nx = local.x / (outer.rx * outer.rx);
      const ny = local.y / (outer.ry * outer.ry);
      const normal = ringWorldVector(ring, normalize({ x: nx, y: ny }));
      const dot = p.vx * normal.x + p.vy * normal.y;
      p.vx = (p.vx - 1.6 * dot * normal.x) * 0.76;
      p.vy = (p.vy - 1.6 * dot * normal.y) * 0.76;
      p.x = prev.x + normal.x * 2.6;
      p.y = prev.y + normal.y * 2.6;
      p.safeFrames = 4;
      impactRing(ring, p, 1);
      disturbances.push({ x: p.x, y: p.y, radius: 3, life: 0.65 });
    }
  }
}

function ringLocalPoint(ring, x, y) {
  const dx = x - (ring.anchorX + ring.dx);
  const dy = y - (ring.anchorY + ring.dy);
  const c = Math.cos(ring.rotation);
  const s = Math.sin(ring.rotation);
  return { x: dx * c + dy * s, y: -dx * s + dy * c };
}

function ringWorldVector(ring, vector) {
  const c = Math.cos(ring.rotation);
  const s = Math.sin(ring.rotation);
  return { x: vector.x * c - vector.y * s, y: vector.x * s + vector.y * c };
}

function shouldCapture(ring) {
  if (ring.captured.length >= ring.maxCaptured) return false;
  if (ring.type === "central") return grainRand(0, 1) < CONFIG.centralRetention;
  if (ring.type === "bottom") return grainRand(0, 1) < CONFIG.bottomRetention;
  return grainRand(0, 1) < CONFIG.upperRetention;
}

function captureParticle(p, ring) {
  p.state = "captured";
  p.ring = ring;
  p.vx *= 0.18;
  p.vy *= 0.12;
  p.captureTarget = {
    x: grainRand(-ring.hole.rx * 0.7, ring.hole.rx * 0.7),
    y: grainRand(-ring.hole.ry * 0.56, ring.hole.ry * 0.56),
  };
  const target = ringWorldVector(ring, p.captureTarget);
  p.x = ring.hole.x + target.x;
  p.y = ring.hole.y + target.y;
  ring.captured.push(p);
  ring.captureCount += 1;
  disturbances.push({ x: p.x, y: p.y, radius: 8, life: 1 });
}

function updateCapturedParticle(p, dt) {
  const ring = p.ring;
  const target = p.captureTarget;
  const worldTarget = ringWorldVector(ring, target);
  p.x = lerp(p.x, ring.hole.x + worldTarget.x, 0.08 * dt);
  p.y = lerp(p.y, ring.hole.y + worldTarget.y, 0.08 * dt);
  // Low-retention rings periodically release the oldest particles as visible
  // overflow, while the central opening remains visibly full.
  const releaseChance = ring.type === "central" ? 0.0007 : ring.type === "bottom" ? 0.001 : 0.0042;
  if (grainRand(0, 1) < releaseChance * dt && ring.captured.length > Math.max(3, ring.maxCaptured * 0.35)) {
    releaseCapturedParticle(p, ring);
  }
}

function releaseCapturedParticle(p, ring) {
  const index = ring.captured.indexOf(p);
  if (index >= 0) ring.captured.splice(index, 1);
  p.state = "falling";
  p.ring = null;
  p.safeFrames = 10;
  const releaseTarget = ringWorldVector(ring, {
    x: grainRand(-ring.hole.rx * 0.75, ring.hole.rx * 0.75),
    y: ring.hole.ry * 0.78,
  });
  p.x = ring.hole.x + releaseTarget.x;
  p.y = ring.hole.y + releaseTarget.y;
  p.vx = grainRand(-0.9, 0.9);
  p.vy = grainRand(0.7, 1.8);
}

function renderArtwork() {
  noStroke();
  drawFlowLayer();
  drawMistLayer();
  drawMovingParticles();
  drawTopText();
  drawBottomText();
  drawRings();
  drawCapturedParticles();
  drawTextDisturbances();
  if (CONFIG.debugMode) drawDebugOverlay();
}

function keyPressed() {
  if (key === "d" || key === "D") CONFIG.debugMode = !CONFIG.debugMode;
}

function drawTopText() {
  fill(...CONFIG.textColor);
  textFont(artworkFont());
  textStyle(NORMAL);
  textAlign(LEFT, TOP);
  for (const glyph of glyphs) {
    if (glyph.group !== "top") continue;
    drawGlyph(glyph, false);
  }
}

function drawBottomText() {
  fill(...CONFIG.textColor);
  textFont(artworkFont());
  textStyle(NORMAL);
  textAlign(LEFT, TOP);
  for (const glyph of glyphs) {
    if (glyph.group !== "bottom") continue;
    drawGlyph(glyph, false);
  }
}

function drawGlyph(glyph, maskMode) {
  const offsetX = maskMode ? 0 : glyph.dx;
  const offsetY = maskMode ? 0 : glyph.dy;
  const rotation = maskMode ? 0 : glyph.rotation;
  push();
  translate(glyph.baseX + glyph.width * 0.5 + offsetX, glyph.baseY + glyph.fontSize * 0.42 + offsetY);
  rotate(rotation);
  textSize(glyph.fontSize);
  text(glyph.character, -glyph.width * 0.5, -glyph.fontSize * 0.42);
  pop();
}

function drawRings() {
  imageMode(CORNER);
  for (const ring of rings) {
    push();
    translate(ring.anchorX + ring.dx, ring.anchorY + ring.dy);
    rotate(ring.rotation);
    imageMode(CENTER);
    image(ringImage, 0, 0, ring.drawW, ring.drawH, ring.crop.x, ring.crop.y, ring.crop.w, ring.crop.h);
    pop();
  }
}

function drawCapturedParticles() {
  for (const ring of rings) {
    if (!ring.captured.length) continue;
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.ellipse(ring.hole.x, ring.hole.y, ring.hole.rx * 2, ring.hole.ry * 2, ring.rotation, 0, Math.PI * 2);
    drawingContext.clip();
    drawParticleBatch(ring.captured, true);
    drawingContext.restore();
  }
}

function drawMovingParticles() {
  drawParticleBatch(particles, false);
}

function drawParticleBatch(collection, captured) {
  const context = drawingContext;
  context.fillStyle = `rgba(${CONFIG.water[0]}, ${CONFIG.water[1]}, ${CONFIG.water[2]}, ${captured ? 0.82 : 0.76})`;
  for (const p of collection) {
    if (!captured && p.state !== "falling") continue;
    const radius = Math.max(0.48, p.size * (captured ? 0.72 : 0.74));
    context.fillRect(p.x - radius, p.y - radius, radius * 2, radius * 2);
  }
}

function drawFlowLayer() {
  flowFrame += 1;
  if (flowFrame % 2 === 0) {
    image(flowLayer, 0, 0);
    return;
  }
  const context = flowLayer.drawingContext;
  context.globalCompositeOperation = "source-over";
  context.fillStyle = "rgba(255, 255, 255, 0.94)";
  context.fillRect(0, 0, CONFIG.logicalWidth, CONFIG.logicalHeight);

  for (let trailIndex = 0; trailIndex < 6; trailIndex += 1) {
    const alpha = 0.026 + trailIndex * 0.010;
    const radius = 0.32 + trailIndex * 0.04;
    context.fillStyle = `rgba(${CONFIG.water[0]}, ${CONFIG.water[1]}, ${CONFIG.water[2]}, ${alpha})`;
    for (const p of particles) {
      if (p.state !== "falling" || !p.trail[trailIndex]) continue;
      const point = p.trail[trailIndex];
      context.fillRect(point.x - radius, point.y - radius, radius * 2, radius * 2);
    }
  }

  // Give active drops a little extra density so the vertical pour reads as a
  // curtain of particles, while the horizontal transport remains lighter.
  context.fillStyle = `rgba(${CONFIG.water[0]}, ${CONFIG.water[1]}, ${CONFIG.water[2]}, 0.13)`;
  for (const p of particles) {
    if (p.state !== "falling" || p.vy < 3.2) continue;
    for (const point of p.trail) {
      context.fillRect(point.x - 0.78, point.y - 0.78, 1.56, 1.56);
    }
  }

  image(flowLayer, 0, 0);
}

function drawMistLayer() {
  // The mist is a low-resolution density field rather than a halo attached to
  // each particle. This keeps it continuous around busy streams while sparse
  // particles remain almost invisible in the atmospheric layer.
  const context = mistLayer.drawingContext;
  const scaleX = MIST_WIDTH / CONFIG.logicalWidth;
  const scaleY = MIST_HEIGHT / CONFIG.logicalHeight;
  mistFrame += 1;
  if (mistFrame % 3 !== 0) {
    image(mistLayer, 0, 0, CONFIG.logicalWidth, CONFIG.logicalHeight);
    return;
  }
  context.clearRect(0, 0, MIST_WIDTH, MIST_HEIGHT);
  context.globalCompositeOperation = "source-over";
  context.fillStyle = `rgba(${CONFIG.water[0]}, ${CONFIG.water[1]}, ${CONFIG.water[2]}, 0.24)`;

  for (const p of particles) {
    if (p.state !== "falling") continue;
    const x = p.x * scaleX;
    const y = p.y * scaleY;
    const radius = 0.52 + p.size * 0.08;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    // A short contribution from the recent path makes horizontal shelves and
    // vertical curtains accumulate as one soft field.
    const trailPoint = p.trail[p.trail.length - 3];
    if (trailPoint) {
      const tx = trailPoint.x * scaleX;
      const ty = trailPoint.y * scaleY;
      context.fillRect(tx - radius * 0.7, ty - radius * 0.7, radius * 1.4, radius * 1.4);
    }
  }

  // Blur at the low buffer resolution so the mist is broad and translucent
  // after it is scaled up, without creating visible ovals per particle.
  mistLayer.filter(BLUR, 2.5);
  drawingContext.save();
  drawingContext.globalAlpha = 0.9;
  image(mistLayer, 0, 0, CONFIG.logicalWidth, CONFIG.logicalHeight);
  drawingContext.restore();
}

function drawTextDisturbances() {
  noFill();
  for (const d of disturbances) {
    stroke(120, 43, 38, 55 * d.life);
    strokeWeight(0.8);
    circle(d.x, d.y, d.radius * (1.5 - d.life * 0.4));
  }
}

function updateDisturbances(dt) {
  for (let i = disturbances.length - 1; i >= 0; i -= 1) {
    disturbances[i].life -= 0.045 * dt;
    disturbances[i].radius += 0.22 * dt;
    if (disturbances[i].life <= 0) disturbances.splice(i, 1);
  }
  if (disturbances.length > 260) disturbances.splice(0, disturbances.length - 260);
}

function updateGlyphs(dt) {
  for (const glyph of glyphs) {
    glyph.impactCooldown = Math.max(0, glyph.impactCooldown - dt);
    glyph.vx += glyph.pressureX * 0.085 * dt - glyph.dx * 0.11 * dt;
    glyph.vy += glyph.pressureY * 0.085 * dt - glyph.dy * 0.11 * dt;
    glyph.pressureX *= Math.pow(0.7, dt);
    glyph.pressureY *= Math.pow(0.7, dt);
    glyph.vx *= Math.pow(0.55, dt);
    glyph.vy *= Math.pow(0.55, dt);
    glyph.rotationVelocity += -glyph.rotation * 0.1 * dt;
    glyph.rotationVelocity *= Math.pow(0.5, dt);
    const horizontalLimit = glyph.group === "bottom" ? 5.5 : 8;
    const verticalLimit = glyph.group === "bottom" ? 3.5 : 4.5;
    glyph.dx = constrain(glyph.dx + glyph.vx * dt, -horizontalLimit, horizontalLimit);
    glyph.dy = constrain(glyph.dy + glyph.vy * dt, -verticalLimit, verticalLimit);
    glyph.rotation = constrain(glyph.rotation + glyph.rotationVelocity * dt, -0.06, 0.06);
  }
}

function drawDebugOverlay() {
  push();
  let aboveText = 0;
  let belowText = 0;
  let trapped = 0;
  let active = 0;
  let slowFall = 0;
  let fastFall = 0;
  for (const particle of particles) {
    if (particle.state !== "falling") continue;
    active += 1;
    if (particle.vy >= 3.2) fastFall += 1;
    else slowFall += 1;
    if (particle.y < layout.topText.y + 78) aboveText += 1;
    if (particle.y > layout.ringSpecs[5].y - 160) belowText += 1;
    if (particle.stuckFrames > 10) trapped += 1;
  }
  noFill();
  stroke(40, 120, 220, 110);
  strokeWeight(0.6);
  for (const glyph of glyphs) {
    rect(glyph.baseX + glyph.dx, glyph.baseY + glyph.dy, glyph.width, glyph.height);
    line(glyph.baseX, glyph.baseY, glyph.baseX + glyph.dx, glyph.baseY + glyph.dy);
  }
  stroke(CONFIG.water[0], CONFIG.water[1], CONFIG.water[2], 90);
  for (let index = 0; index < particles.length; index += 18) {
    const p = particles[index];
    if (p.state !== "falling") continue;
    line(p.x, p.y, p.x + p.vx * 12, p.y + p.vy * 12);
  }
  stroke(35, 120, 220, 150);
  for (const contact of disturbances) {
    if (contact.normalX === undefined) continue;
    line(contact.x, contact.y, contact.x + contact.normalX * 16, contact.y + contact.normalY * 16);
    line(contact.x, contact.y, contact.x + contact.tangentX * 13, contact.y + contact.tangentY * 13);
  }
  noStroke();
  fill(20);
  textAlign(LEFT, TOP);
  textSize(14);
  const emitted = Math.round((constrain(simulationAge / CONFIG.emissionRampFrames, 0, 1)) * CONFIG.particleCount);
  text(`DEBUG · active: ${active}/${emitted} · glyphs: ${glyphs.length} · fps: ${Math.round(frameRate())}`, 18, 18);
  text(`slow fall: ${slowFall} · fast fall: ${fastFall} · trapped: ${trapped} · contacts: ${disturbances.length}`, 18, 36);
  pop();
}

function jostleGlyph(nearest, vx, vy) {
  if (!nearest || nearest.impactCooldown > 0) return;

  const impulseX = constrain(vx * 0.55 + grainRand(-0.3, 0.3), -1.8, 1.8);
  const impulseY = constrain(vy * 0.08 + grainRand(-0.18, 0.18), -0.8, 0.8);
  nearest.pressureX += impulseX;
  nearest.pressureY += impulseY;
  nearest.rotationVelocity += grainRand(-0.012, 0.012);
  nearest.impactCooldown = 7;

  // A nearby letter receives only a small part of the impact, creating a
  // local chain reaction instead of shaking the whole text block.
  for (const glyph of glyphs) {
    if (glyph === nearest || glyph.group !== nearest.group) continue;
    const sameLine = Math.abs(glyph.baseY - nearest.baseY) < 2;
    const distance = Math.abs(glyph.baseX - nearest.baseX);
    if (sameLine && distance > 0 && distance < 34) {
      const direction = glyph.baseX > nearest.baseX ? 1 : -1;
      glyph.pressureX += impulseX * 0.12 * direction;
    }
  }
}

function wrapText(value, maxWidth, size) {
  textSize(size);
  const words = value.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (textWidth(candidate) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function ellipseContains(x, y, cx, cy, rx, ry) {
  return ((x - cx) ** 2) / (rx * rx) + ((y - cy) ** 2) / (ry * ry) <= 1;
}

function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy || 1;
  const t = constrain(((px - x1) * dx + (py - y1) * dy) / lengthSq, 0, 1);
  const x = x1 + t * dx;
  const y = y1 + t * dy;
  return Math.hypot(px - x, py - y);
}

function normalize(v) {
  const length = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / length, y: v.y / length };
}

function H(fraction) {
  return CONFIG.logicalHeight * fraction;
}

function grainRand(minimum, maximum) {
  if (CONFIG.debugSeed !== null) return grainRng(minimum, maximum);
  return random(minimum, maximum);
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return (minimum, maximum) => {
    value = (1664525 * value + 1013904223) >>> 0;
    const normalized = value / 4294967296;
    return lerp(minimum, maximum, normalized);
  };
}
