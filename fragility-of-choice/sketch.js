/*
 * The Fragility of Choice
 * A static p5.js study in photographic fragmentation and fragile connection.
 *
 * URL controls:
 *   ?seed=2401&lock=1          reproduce a composition for testing
 *   ?severity=0.25             mild / moderate / severe fragmentation
 *
 * The rendering is intentionally built from a 1920 x 1080 design space and
 * scaled to the browser. All visible randomness is seeded for reproducibility.
 */

const DESIGN = { width: 1920, height: 1080 };

// The replacement plate is a 1536 x 1024 PNG with transparent padding. Its
// visible alpha-bound plate occupies this square source region, so texture
// mapping stays aligned with the existing square fracture coordinate space.
const PLATE_ASSET = {
  path: "assets/Plate edited.png",
  sourceX: 311,
  sourceY: 74,
  sourceWidth: 906,
  sourceHeight: 906,
};

// These are the edited food assets copied into the experiment's local assets
// folder. The source folder currently contains five files, so the generated
// composition uses all five without inventing a sixth placeholder.
const FOOD_ASSETS = [
  { key: "goose-liver", path: "assets/food/goose-liver edited.png" },
  { key: "kiwi", path: "assets/food/kiwi edited.png" },
  { key: "onion", path: "assets/food/onion edited.png" },
  { key: "pepero", path: "assets/food/pepero edited.png" },
  { key: "whip", path: "assets/food/whip edited.png" },
];

const EDITORIAL = {
  frameInset: 28,
  frameOuterWeight: 18,
  frameInnerInset: 48,
  frameInnerWeight: 2,
  blue: [26, 50, 224],
  deepBlue: [11, 26, 142],
  containerHeader: 26,
  containerBorder: 3,
  containerPadding: 12,
  containerGap: 30,
  connectorWeight: 2.6,
  connectorCell: 32,
  textGap: 28,
};

const CONFIG = {
  // Primary controls. Secondary variation is derived from the seed.
  fragmentCount: [8, 24],
  displacement: [8, 142],
  networkDensity: [0.32, 1.0],
  branching: [0.18, 0.82],
  lineThickness: [1.08, 2.75],
  lineOpacity: [204, 255],
  shadowIntensity: [12, 34],
  plateSize: 720,
  background: [246, 242, 235],
  ink: [26, 50, 224],
  warmInk: [125, 91, 64],
  copper: [142, 92, 62],
  cobalt: [26, 50, 224],
  cobaltDeep: [11, 26, 142],
  sky: [74, 192, 255],
};

let plateImage;
let foodImages = [];
let fragments = [];
let threads = [];
let graphNodes = [];
let graphEdges = [];
let graphClusters = [];
let fractureFocus = { x: 0, y: 0 };
let graphEnvelopeRadius = 0;
let graphEnvelope = null;
let peripheralMarks = [];
let validationReport = null;
let seedValue;
let fractureSeverity;
let canvas;
let scaleFactor = 1;
let artW = DESIGN.width;
let artH = DESIGN.height;
let renderDensity = 1;
let plateLayout;
let rng;
let fragmentProgress = 1;
let networkProgress = 1;
let animationStart = 0;
let foodContainers = [];
let editorialConnectors = [];
let editorialTextBlocks = [];
const FRACTURE_BUILD_DELAY = 180;
const FRACTURE_BUILD_DURATION = 900;
const NETWORK_BUILD_DELAY = 1120;
const NETWORK_BUILD_DURATION = 3200;

function preload() {
  plateImage = loadImage(PLATE_ASSET.path);
  foodImages = FOOD_ASSETS.map((asset) => loadImage(asset.path));
}

function setup() {
  renderDensity = constrain(window.devicePixelRatio || 1, 1, 2);
  pixelDensity(renderDensity);
  seedValue = readSeed();
  fractureSeverity = readSeverity();
  randomSeed(seedValue);
  noiseSeed(seedValue);
  rng = new SeededRandom(seedValue);

  syncViewport();
  canvas = createCanvas(artW, artH);
  canvas.parent("canvas-holder");
  pixelDensity(renderDensity);
  animationStart = millis();
  loop();
  buildComposition();
}

function draw() {
  const elapsed = millis() - animationStart;
  fragmentProgress = easeOutCubic(constrain((elapsed - FRACTURE_BUILD_DELAY) / FRACTURE_BUILD_DURATION, 0, 1));
  networkProgress = constrain((elapsed - NETWORK_BUILD_DELAY) / NETWORK_BUILD_DURATION, 0, 1);
  renderPaper();
  renderAtmosphere();
  renderNetwork();
  renderEditorialConnectors();
  renderFragments();
  renderAnchorTips();
  renderFoodContainers();
  renderEditorialTypography();
  renderEditorialFrame();
  renderSurfaceDetails();
  if (fragmentProgress >= 1 && networkProgress >= 1) noLoop();
}

function windowResized() {
  syncViewport();
  resizeCanvas(artW, artH);
  redraw();
}

function syncViewport() {
  artW = max(320, windowWidth || DESIGN.width);
  artH = max(240, windowHeight || DESIGN.height);
  scaleFactor = min(artW / DESIGN.width, artH / DESIGN.height);
}

function readSeed() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("seed");
  const locked = params.get("lock") === "1";
  if (locked && raw !== null && raw !== "" && Number.isFinite(Number(raw))) {
    return abs(floor(Number(raw))) % 2147483647 || 1;
  }
  return floor(Math.random() * 2147483646) + 1;
}

function readSeverity() {
  const raw = new URLSearchParams(window.location.search).get("severity");
  if (raw !== null && raw !== "" && Number.isFinite(Number(raw))) {
    return constrain(Number(raw), 0.08, 0.96);
  }
  // A weighted middle keeps the work composed while preserving variation.
  return constrain(0.14 + Math.pow(random(), 0.78) * 0.78, 0.08, 0.96);
}

function buildComposition() {
  const count = round(lerp(CONFIG.fragmentCount[0], CONFIG.fragmentCount[1], fractureSeverity));
  let placementsValid = false;
  for (let attempt = 0; attempt < 8 && !placementsValid; attempt++) {
    plateLayout = {
      x: DESIGN.width * lerp(0.28, 0.35, rng.float()),
      y: DESIGN.height * lerp(0.49, 0.56, rng.float()),
      size: CONFIG.plateSize * lerp(0.88, 1.02, rng.float()),
    };
    const sites = buildSites(count);
    fragments = buildFragments(sites);
    resolveFragmentCollisions(fragments);
    refreshFragmentGeometry(fragments);
    placementsValid = validateFragmentPlacements(fragments);
  }

  // The bounded solver above is deterministic for a given generated layout.
  // This final pass is a safe fallback, preventing an invalid composition from
  // ever reaching graph generation if every retry was unusually dense.
  if (!placementsValid) {
    resolveFragmentCollisions(fragments, 140);
    refreshFragmentGeometry(fragments);
  }

  let networkValid = false;
  for (let attempt = 0; attempt < 5 && !networkValid; attempt++) {
    buildNetwork();
    networkValid = validateNetwork();
  }
  buildPeripheralMarks();
  centerComposition();
  buildEditorialComposition();
  publishValidation();
}

function publishValidation() {
  if (typeof window !== "undefined") window.__fragilityValidation = { ...validationReport };
}

function centerComposition() {
  const bounds = {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
  };
  const include = (x, y, padding = 0) => {
    bounds.minX = min(bounds.minX, x - padding);
    bounds.maxX = max(bounds.maxX, x + padding);
    bounds.minY = min(bounds.minY, y - padding);
    bounds.maxY = max(bounds.maxY, y + padding);
  };

  fragments.forEach((fragment) => include(fragment.x, fragment.y, fragment.radius + 18));
  graphNodes.forEach((node) => include(node.x, node.y, 4));
  graphEdges.forEach((edge) => (edge.path || []).forEach((point) => include(point.x, point.y, 3)));

  if (!Number.isFinite(bounds.minX)) return;
  const dx = DESIGN.width * 0.5 - (bounds.minX + bounds.maxX) * 0.5;
  const dy = DESIGN.height * 0.5 - (bounds.minY + bounds.maxY) * 0.5;

  plateLayout.x += dx;
  plateLayout.y += dy;
  graphEnvelope.cx += dx;
  graphEnvelope.cy += dy;

  fragments.forEach((fragment) => {
    fragment.baseX += dx;
    fragment.baseY += dy;
    fragment.x += dx;
    fragment.y += dy;
    fragment.anchorPoints = fragment.anchorPoints.map((point) => ({ x: point.x + dx, y: point.y + dy }));
    fragment.edgePoints = fragment.edgePoints.map((point) => ({ x: point.x + dx, y: point.y + dy }));
  });
  graphClusters.forEach((cluster) => {
    cluster.x += dx;
    cluster.y += dy;
  });
  graphNodes.forEach((node) => {
    node.x += dx;
    node.y += dy;
    if (Number.isFinite(node.homeX)) node.homeX += dx;
    if (Number.isFinite(node.homeY)) node.homeY += dy;
  });
  graphEdges.forEach((edge) => {
    edge.path = edge.path.map((point) => ({ x: point.x + dx, y: point.y + dy }));
  });
}

function buildSites(count) {
  const radius = plateLayout.size * 0.46;
  const sites = [];
  const targetMinDistance = lerp(108, 42, fractureSeverity);

  // Keep the fracture local. A single site on the opposite side of the plate
  // becomes a deliberately large, relatively intact ceramic section.
  // The break opens toward the negative space on the right. This keeps the
  // intact mass readable on the left and gives the fragments a clear escape
  // direction instead of making them collide with the plate silhouette.
  const focusAngle = rng.float(-0.34, 0.34);
  const focusDistance = radius * rng.float(0.25, 0.40);
  fractureFocus = {
    x: cos(focusAngle) * focusDistance,
    y: sin(focusAngle) * focusDistance,
  };
  const intactAnchor = {
    x: -fractureFocus.x * rng.float(0.82, 1.1) + rng.float(-24, 24),
    y: -fractureFocus.y * rng.float(0.82, 1.1) + rng.float(-24, 24),
    role: "intact",
  };
  sites.push(intactAnchor);

  const fractureRadius = radius * lerp(0.16, 0.43, fractureSeverity);

  let attempts = 0;
  while (sites.length < count && attempts < count * 70) {
    attempts++;
    const angle = rng.float(0, TWO_PI);
    const distance = sqrt(rng.float()) * fractureRadius;
    const candidate = {
      x: fractureFocus.x + cos(angle) * distance * rng.float(0.72, 1.12),
      y: fractureFocus.y + sin(angle) * distance * rng.float(0.58, 1.06),
    };
    const localMin = targetMinDistance * lerp(0.64, 1.16, rng.float());
    if (dist(candidate.x, candidate.y, 0, 0) < radius * 0.94
      && sites.every((site) => dist(candidate.x, candidate.y, site.x, site.y) > localMin)) {
      sites.push(candidate);
    }
  }

  while (sites.length < count) {
    const angle = rng.float(0, TWO_PI);
    const distance = sqrt(rng.float()) * fractureRadius;
    sites.push({
      x: fractureFocus.x + cos(angle) * distance,
      y: fractureFocus.y + sin(angle) * distance,
    });
  }
  return sites;
}

function buildFragments(sites) {
  const boundary = circlePolygon(0, 0, plateLayout.size * 0.485, 64);
  const result = [];
  const blastDirection = createVector(1, rng.float(-0.22, 0.22)).normalize();

  for (let i = 0; i < sites.length; i++) {
    let cell = boundary.map((point) => ({ x: point.x, y: point.y }));
    for (let j = 0; j < sites.length; j++) {
      if (i === j) continue;
      cell = clipToBisector(cell, sites[i], sites[j]);
      if (cell.length < 3) break;
    }
    if (cell.length < 3 || polygonArea(cell) < 230) continue;

    const center = polygonCentroid(cell);
    const cellBounds = polygonBounds(cell);
    // Micro-perturbation makes the clipped cells feel chipped rather than
    // like clean diagrammatic Voronoi polygons.
    cell = softenCell(cell, center, lerp(0.014, 0.045, fractureSeverity));
    const anchorLocal = extractFractureBoundary(cell, plateLayout.size * 0.485);

    const explode = lerp(44, 176, fractureSeverity);
    const drift = sites[i].role === "intact"
      ? createVector(0, 0)
      : p5.Vector.mult(blastDirection, explode * rng.float(0.78, 1.24));
    drift.add(
      sites[i].role === "intact" ? 0 : rng.float(0.02, 0.16) * explode,
      sites[i].role === "intact" ? 0 : rng.float(-0.52, 0.52) * explode
    );

    result.push({
      id: i,
      local: cell,
      center,
      area: polygonArea(cell),
      intact: sites[i].role === "intact",
      baseX: plateLayout.x + center.x,
      baseY: plateLayout.y + center.y,
      driftX: drift.x,
      driftY: drift.y,
      x: plateLayout.x + center.x + drift.x,
      y: plateLayout.y + center.y + drift.y,
      rotation: rng.float(-0.085, 0.085) * (0.32 + fractureSeverity * 1.2),
      scale: rng.float(0.985, 1.025),
      opacity: rng.float(0.94, 1),
      depth: rng.float(0, 1),
      radius: sqrt(cellBounds.width * cellBounds.width + cellBounds.height * cellBounds.height) * 0.5,
      image: null,
      anchorLocal,
      anchorPoints: [],
      edgePoints: [],
    });
  }

  // The Voronoi cells are disjoint in the plate's original position, but the
  // blast translation can make their photographic bounds overlap again. Push
  // detached cells into a clean rightward cascade before rendering them.
  applyFragmentSeparation(result);

  // The largest pieces render first, allowing the small displaced pieces to
  // sit visually on top and creating a quiet material hierarchy.
  result.sort((a, b) => b.area - a.area);
  result.forEach((fragment) => {
    fragment.image = makeFragmentTexture(fragment.local);
    fragment.anchorPoints = fragment.anchorLocal.map((point) => transformLocal(point, fragment));
    fragment.edgePoints = fragment.local.map((point) => transformLocal(point, fragment));
  });
  return result;
}

function refreshFragmentGeometry(items) {
  items.forEach((fragment) => {
    fragment.transformedPolygon = fragment.local.map((point) => transformLocal(point, fragment));
    fragment.anchorPoints = fragment.anchorLocal.map((point) => transformLocal(point, fragment));
    fragment.edgePoints = fragment.local.map((point) => transformLocal(point, fragment));
  });
}

function resolveFragmentCollisions(items, maxPasses = 96) {
  const clearance = 18;
  for (let pass = 0; pass < maxPasses; pass++) {
    refreshFragmentGeometry(items);
    let conflictFound = false;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        if (!polygonsConflict(a.transformedPolygon, b.transformedPolygon, clearance)) continue;
        conflictFound = true;

        let direction = createVector(b.x - a.x, b.y - a.y);
        if (direction.mag() < 2) direction.set(1, rng.float(-0.35, 0.35));
        direction.normalize();

        // The intact section remains the visual anchor. Detached pieces are
        // always resolved toward the right-hand burst rather than being
        // pushed back across the plate.
        if (a.intact && !b.intact) {
          direction.set(1, constrain(direction.y, -0.62, 0.62)).normalize();
          const push = max(18, clearance + b.radius * 0.08);
          b.x += direction.x * push;
          b.y += direction.y * push;
          b.driftX += direction.x * push;
          b.driftY += direction.y * push;
        } else if (b.intact && !a.intact) {
          direction.set(1, constrain(direction.y, -0.62, 0.62)).normalize();
          const push = max(18, clearance + a.radius * 0.08);
          a.x += direction.x * push;
          a.y += direction.y * push;
          a.driftX += direction.x * push;
          a.driftY += direction.y * push;
        } else {
          const moving = a.area < b.area ? a : b;
          const sign = moving === b ? 1 : -1;
          const push = max(16, clearance + moving.radius * 0.07);
          moving.x += direction.x * push * sign;
          moving.y += direction.y * push * sign;
          moving.driftX += direction.x * push * sign;
          moving.driftY += direction.y * push * sign;
        }
      }
    }
    if (!conflictFound) break;
  }
  refreshFragmentGeometry(items);
}

function validateFragmentPlacements(items) {
  let overlapPairs = 0;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (polygonsConflict(items[i].transformedPolygon, items[j].transformedPolygon, 18)) overlapPairs++;
    }
  }
  validationReport = validationReport || {};
  validationReport.fragmentOverlapPairs = overlapPairs;
  return overlapPairs === 0;
}

function polygonsConflict(a, b, gap = 0) {
  if (polygonsIntersect(a, b)) return true;
  return polygonDistance(a, b) < gap;
}

function polygonsIntersect(a, b) {
  for (let i = 0; i < a.length; i++) {
    const a1 = a[i];
    const a2 = a[(i + 1) % a.length];
    for (let j = 0; j < b.length; j++) {
      const b1 = b[j];
      const b2 = b[(j + 1) % b.length];
      if (segmentsIntersect(a1, a2, b1, b2)) return true;
    }
  }
  return pointInPolygon(a[0], b) || pointInPolygon(b[0], a);
}

function polygonDistance(a, b) {
  let minimum = Infinity;
  for (let i = 0; i < a.length; i++) {
    const a1 = a[i];
    const a2 = a[(i + 1) % a.length];
    for (let j = 0; j < b.length; j++) {
      const b1 = b[j];
      const b2 = b[(j + 1) % b.length];
      minimum = min(minimum, segmentDistance(a1, a2, b1, b2));
    }
  }
  return minimum;
}

function segmentDistance(a1, a2, b1, b2) {
  if (segmentsIntersect(a1, a2, b1, b2)) return 0;
  return min(
    pointSegmentDistance(a1, b1, b2),
    pointSegmentDistance(a2, b1, b2),
    pointSegmentDistance(b1, a1, a2),
    pointSegmentDistance(b2, a1, a2)
  );
}

function pointSegmentDistance(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared < 1 ? 0 : constrain(((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared, 0, 1);
  return dist(point.x, point.y, a.x + dx * t, a.y + dy * t);
}

function segmentsIntersect(a, b, c, d) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  const epsilon = 0.0001;
  if (((o1 > epsilon && o2 < -epsilon) || (o1 < -epsilon && o2 > epsilon))
    && ((o3 > epsilon && o4 < -epsilon) || (o3 < -epsilon && o4 > epsilon))) return true;
  return (abs(o1) <= epsilon && pointOnSegment(c, a, b))
    || (abs(o2) <= epsilon && pointOnSegment(d, a, b))
    || (abs(o3) <= epsilon && pointOnSegment(a, c, d))
    || (abs(o4) <= epsilon && pointOnSegment(b, c, d));
}

function orientation(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function pointOnSegment(point, a, b) {
  return point.x >= min(a.x, b.x) - 0.001
    && point.x <= max(a.x, b.x) + 0.001
    && point.y >= min(a.y, b.y) - 0.001
    && point.y <= max(a.y, b.y) + 0.001;
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const crosses = ((a.y > point.y) !== (b.y > point.y))
      && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function extractFractureBoundary(polygon, outerRadius) {
  const points = [];
  const outerThreshold = outerRadius - 18;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const midpoint = { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 };
    const midpointRadius = sqrt(midpoint.x * midpoint.x + midpoint.y * midpoint.y);
    if (midpointRadius < outerThreshold) {
      points.push(a, midpoint, b);
    }
  }
  return points.length >= 3 ? dedupePoints(points) : polygon.slice();
}

function dedupePoints(points) {
  const result = [];
  points.forEach((point) => {
    const duplicate = result.some((other) => dist(point.x, point.y, other.x, other.y) < 8);
    if (!duplicate) result.push({ x: point.x, y: point.y });
  });
  return result;
}

function applyFragmentSeparation(items) {
  const intact = items.find((fragment) => fragment.intact) || items[0];
  const detached = items.filter((fragment) => fragment !== intact);
  if (!intact || detached.length === 0) return;

  // Establish the main read first: the displaced fragments should leave the
  // intact mass on its right side, not drift back over the plate.
  detached.forEach((fragment) => {
    const clearX = intact.x + intact.radius * 0.82 + fragment.radius * 0.48 + 42;
    if (fragment.x < clearX) {
      const shift = clearX - fragment.x;
      fragment.x += shift;
      fragment.driftX += shift;
    }
  });

  // A few compact passes are enough to remove the obvious overlaps while
  // preserving a deliberately irregular, non-grid arrangement.
  for (let pass = 0; pass < 12; pass++) {
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        if (a.intact && b.intact) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = max(1, sqrt(dx * dx + dy * dy));
        const clearance = (a.radius + b.radius) * 0.88 + 34;
        if (distance >= clearance) continue;

        const direction = createVector(dx, dy);
        if (direction.mag() < 2) direction.set(1, rng.float(-0.35, 0.35));
        direction.normalize();
        // Keep the separation biased toward the intended rightward burst.
        direction.x = max(0.34, direction.x);
        direction.normalize();
        const push = (clearance - distance) * 0.58;

        if (a.intact) {
          b.x += direction.x * push;
          b.y += direction.y * push;
          b.driftX += direction.x * push;
          b.driftY += direction.y * push;
        } else if (b.intact) {
          a.x += direction.x * push;
          a.y += direction.y * push;
          a.driftX += direction.x * push;
          a.driftY += direction.y * push;
        } else {
          // Move the smaller piece more so the large intact silhouette stays
          // visually dominant and the fragment group remains legible.
          const moving = a.area < b.area ? a : b;
          const sign = moving === b ? 1 : -1;
          moving.x += direction.x * push * sign;
          moving.y += direction.y * push * sign;
          moving.driftX += direction.x * push * sign;
          moving.driftY += direction.y * push * sign;
        }
      }
    }
  }

  // Reassert the one-sided composition after pairwise relaxation. This keeps
  // a small shard from being pushed back over the intact plate by a later
  // collision pass.
  detached.forEach((fragment) => {
    const clearX = intact.x + intact.radius * 0.82 + fragment.radius * 0.48 + 42;
    if (fragment.x < clearX) {
      const shift = clearX - fragment.x;
      fragment.x += shift;
      fragment.driftX += shift;
    }
    // Keep the burst inside the editorial frame; the spread should read as
    // intentional whitespace, not as accidental cropping at the canvas edge.
    const verticalMargin = fragment.radius + 32;
    const clampedY = constrain(fragment.y, verticalMargin, DESIGN.height - verticalMargin);
    fragment.driftY += clampedY - fragment.y;
    fragment.y = clampedY;
  });
}

function makeFragmentTexture(polygon) {
  const padding = 12;
  const bounds = polygonBounds(polygon);
  const width = max(2, ceil(bounds.width + padding * 2));
  const height = max(2, ceil(bounds.height + padding * 2));
  const tile = createGraphics(width, height);
  const mask = createGraphics(width, height);
  tile.pixelDensity(renderDensity);
  mask.pixelDensity(renderDensity);
  tile.clear();
  mask.clear();

  const minX = bounds.minX - padding;
  const minY = bounds.minY - padding;
  tile.image(
    plateImage,
    -plateLayout.size / 2 - minX,
    -plateLayout.size / 2 - minY,
    plateLayout.size,
    plateLayout.size,
    PLATE_ASSET.sourceX,
    PLATE_ASSET.sourceY,
    PLATE_ASSET.sourceWidth,
    PLATE_ASSET.sourceHeight
  );
  mask.noStroke();
  mask.fill(255);
  mask.beginShape();
  polygon.forEach((point) => mask.vertex(point.x - minX, point.y - minY));
  mask.endShape(CLOSE);

  const tileImage = tile.get();
  tileImage.mask(mask.get());
  tile.remove();
  mask.remove();
  return { image: tileImage, minX, minY, width, height };
}

function buildNetwork() {
  threads = [];
  graphNodes = [];
  graphEdges = [];
  graphClusters = [];

  const density = lerp(CONFIG.networkDensity[0], CONFIG.networkDensity[1], fractureSeverity);
  const intact = fragments.find((fragment) => fragment.intact) || fragments[0];
  const detached = fragments.filter((fragment) => fragment !== intact);
  const focusX = plateLayout.x + fractureFocus.x;
  const focusY = plateLayout.y + fractureFocus.y;
  const edgeKeys = new Set();

  const link = (a, b, kind = "mesh") => {
    if (!a || !b || a === b) return;
    const key = a.id < b.id ? `${a.id}:${b.id}` : `${b.id}:${a.id}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    graphEdges.push({ a, b, kind, weight: rng.float(CONFIG.lineThickness[0], CONFIG.lineThickness[1]) });
  };

  const addAnchorNodes = (fragment, amount, preferFocus) => {
    const points = (fragment.anchorPoints && fragment.anchorPoints.length > 0
      ? fragment.anchorPoints
      : fragment.edgePoints)
      .map((point) => ({ point, distance: dist(point.x, point.y, focusX, focusY) }))
      .sort((a, b) => {
        // Always choose the fracture-facing side of a fragment. A wide
        // random jitter can select the back edge and make a connector swing
        // around the whole plate before reaching the graph.
        const jitterA = preferFocus ? 0 : rng.float(0, 18);
        const jitterB = preferFocus ? 0 : rng.float(0, 18);
        return (a.distance + jitterA) - (b.distance + jitterB);
      });
    for (let i = 0; i < amount; i++) {
      const item = points[(i * 2 + round(rng.float(0, 2))) % points.length];
      const node = {
        id: graphNodes.length,
        x: item.point.x,
        y: item.point.y,
        vx: 0,
        vy: 0,
        anchor: true,
        fragment,
        cluster: -1,
      };
      graphNodes.push(node);
    }
  };

  // The intact section contributes only a small number of edge anchors. The
  // detached pieces contribute more, making the graph visibly emerge from the
  // selected fracture region rather than from the plate's whole circumference.
  addAnchorNodes(intact, round(lerp(2, 4, density)), true);
  detached.forEach((fragment) => {
    addAnchorNodes(fragment, constrain(round(lerp(1, 3, density)), 1, 3), false);
  });

  const clusterCount = round(lerp(2, 5, density));
  const focusHeading = atan2(fractureFocus.y, fractureFocus.x);
  const chainHeading = focusHeading + HALF_PI + rng.float(-0.28, 0.28);
  for (let c = 0; c < clusterCount; c++) {
    const chainPosition = clusterCount === 1 ? 0 : c / (clusterCount - 1) - 0.5;
    const along = chainPosition * plateLayout.size * rng.float(0.58, 0.86);
    const lateral = rng.float(-0.19, 0.19) * plateLayout.size;
    const cluster = {
      id: c,
      x: focusX + cos(chainHeading) * along + cos(focusHeading) * lateral,
      y: focusY + sin(chainHeading) * along + sin(focusHeading) * lateral,
      nodes: [],
    };
    graphClusters.push(cluster);

    const nodeCount = round(lerp(18, 52, density) * rng.float(0.78, 1.24));
    for (let i = 0; i < nodeCount; i++) {
      const localAngle = rng.float(0, TWO_PI);
      const localRadius = plateLayout.size * rng.float(0.012, 0.095) * (0.55 + fractureSeverity * 0.72);
      const node = {
        id: graphNodes.length,
        x: cluster.x + cos(localAngle) * localRadius,
        y: cluster.y + sin(localAngle) * localRadius * rng.float(0.54, 1.0),
        homeX: cluster.x,
        homeY: cluster.y,
        vx: 0,
        vy: 0,
        anchor: false,
        fragment: null,
        cluster: c,
      };
      graphNodes.push(node);
      cluster.nodes.push(node);
    }
  }

  // Local graph structure: nearest-neighbour meshes produce the dense cores.
  const localK = round(lerp(3, 7, density));
  graphClusters.forEach((cluster) => {
    cluster.nodes.forEach((node) => {
      const neighbors = cluster.nodes
        .filter((other) => other !== node)
        .sort((a, b) => dist(node.x, node.y, a.x, a.y) - dist(node.x, node.y, b.x, b.y));
      neighbors.slice(0, localK).forEach((neighbor) => link(node, neighbor, "mesh"));
      if (neighbors.length > localK && rng.float() < density * 0.72) {
        link(node, neighbors[round(rng.float(localK, neighbors.length - 1))], "mesh");
      }
    });
  });

  const graphInterior = graphNodes.filter((node) => !node.anchor);
  graphNodes.filter((node) => node.anchor).forEach((anchor) => {
    const nearest = graphInterior
      .slice()
      .sort((a, b) => dist(anchor.x, anchor.y, a.x, a.y) - dist(anchor.x, anchor.y, b.x, b.y));
    nearest.slice(0, round(lerp(4, 9, density))).forEach((node) => link(anchor, node, "anchor"));
  });

  // Long-distance bridges keep the composition from becoming a collection of
  // isolated blobs. They are routed through shared bundle fields below.
  const bridgeCount = round(lerp(8, 30, density));
  for (let i = 0; i < bridgeCount; i++) {
    const aCluster = graphClusters[round(rng.float(0, graphClusters.length - 1))];
    const other = graphClusters.filter((cluster) => cluster !== aCluster);
    const bCluster = other[round(rng.float(0, other.length - 1))];
    link(
      aCluster.nodes[round(rng.float(0, aCluster.nodes.length - 1))],
      bCluster.nodes[round(rng.float(0, bCluster.nodes.length - 1))],
      "long"
    );
  }

  forceRelaxGraph();
  projectGraphNodesToEmptySpace();
  routeAndValidateGraph();
  const networkRadius = plateLayout.size * lerp(0.22, 0.32, fractureSeverity);
  graphEnvelopeRadius = networkRadius;
  graphEnvelope = {
    cx: focusX + plateLayout.size * 0.13,
    cy: focusY,
    rx: plateLayout.size * lerp(0.22, 0.31, fractureSeverity),
    ry: plateLayout.size * lerp(0.27, 0.39, fractureSeverity),
  };
  graphEdges.forEach((edge) => {
    if (!edge.path) edge.path = makeBundledPath(edge);
    edge.keep = true;
    edge.filaments = edge.kind === "anchor"
      ? 1
      : edge.kind === "long" ? round(lerp(1, 2, density)) : round(lerp(1, 3, density));
    edge.alpha = edge.kind === "long" ? rng.float(164, 220) : rng.float(188, 252);
    edge.color = rng.float() < 0.74
      ? CONFIG.cobalt
      : rng.float() < 0.66 ? CONFIG.cobaltDeep : CONFIG.sky;
    edge.start = edge.kind === "anchor"
      ? rng.float(0.02, 0.18)
      : edge.kind === "mesh"
        ? rng.float(0.16, 0.56)
        : rng.float(0.34, 0.76);
    edge.duration = edge.kind === "anchor" ? rng.float(0.18, 0.34) : rng.float(0.22, 0.42);
    edge.phase = rng.float(0, TWO_PI);
  });
}

function projectGraphNodesToEmptySpace() {
  graphNodes.forEach((node) => {
    if (node.anchor) return;
    for (let attempt = 0; attempt < 24; attempt++) {
      const obstacle = fragments.find((fragment) => pointInPolygon(node, fragment.transformedPolygon));
      if (!obstacle) break;
      const obstacleCenter = polygonCentroid(obstacle.transformedPolygon);
      const direction = createVector(node.x - obstacleCenter.x, node.y - obstacleCenter.y);
      if (direction.mag() < 1) direction.set(1, rng.float(-0.45, 0.45));
      direction.normalize();
      node.x += direction.x * 18;
      node.y += direction.y * 18;
    }
    node.x = constrain(node.x, 30, DESIGN.width - 30);
    node.y = constrain(node.y, 30, DESIGN.height - 30);
    node.homeX = node.x;
    node.homeY = node.y;
  });
}

function routeAndValidateGraph() {
  const routingGrid = buildRoutingGrid(42);
  const routed = [];
  graphEdges.forEach((edge) => {
    const bundled = makeBundledPath(edge);
    const direct = [
      { x: edge.a.x, y: edge.a.y },
      { x: edge.b.x, y: edge.b.y },
    ];
    let route = null;
    if (pathIsClear(bundled, edge)) route = bundled;
    else if (pathIsClear(direct, edge)) route = direct;
    else route = routeAroundObstacles(edge, routingGrid);
    if (!route || !pathIsClear(route, edge)) return;
    edge.path = route;
    edge.keep = true;
    routed.push(edge);
  });
  graphEdges = routed;
  ensureFragmentConnections(routingGrid);
  reconnectGraphComponents(routingGrid);
  graphNodes.forEach((node) => {
    node.active = graphEdges.some((edge) => edge.a === node || edge.b === node);
  });
  graphNodes = graphNodes.filter((node) => node.active);
  validationReport = validationReport || {};
  validationReport.graphEdgeInteriorIntersections = graphEdges.filter((edge) => !pathIsClear(edge.path, edge)).length;
  validationReport.isolatedGraphNodes = graphNodes.filter((node) => node.active === false).length;
  validationReport.disconnectedFragments = fragments.filter((fragment) => (
    !graphEdges.some((edge) => edge.a.fragment === fragment || edge.b.fragment === fragment)
  )).length;
}

function validateNetwork() {
  const components = collectGraphComponents();
  const disconnectedFragments = fragments.filter((fragment) => (
    !graphEdges.some((edge) => edge.a.fragment === fragment || edge.b.fragment === fragment)
  )).length;
  const invalidEdges = graphEdges.filter((edge) => !edge.path || edge.path.length < 2 || !pathIsClear(edge.path, edge)).length;
  const isolatedComponents = max(0, components.length - 1);
  validationReport = validationReport || {};
  validationReport.graphEdgeInteriorIntersections = invalidEdges;
  validationReport.danglingEndpoints = graphEdges.filter((edge) => !edge.path || edge.path.length < 2).length;
  validationReport.isolatedComponents = isolatedComponents;
  validationReport.disconnectedFragments = disconnectedFragments;
  validationReport.invalidAttachmentPoints = graphNodes.filter((node) => node.anchor && !node.active).length;
  return invalidEdges === 0
    && validationReport.danglingEndpoints === 0
    && isolatedComponents === 0
    && disconnectedFragments === 0
    && validationReport.invalidAttachmentPoints === 0;
}

function ensureFragmentConnections(routingGrid) {
  const interior = graphNodes.filter((node) => !node.anchor);
  fragments.forEach((fragment) => {
    const connected = graphEdges.some((edge) => edge.a.fragment === fragment || edge.b.fragment === fragment);
    if (connected || interior.length === 0) return;
    const anchor = graphNodes.find((node) => node.anchor && node.fragment === fragment);
    if (!anchor) return;
    const target = interior.slice().sort((a, b) => dist(anchor.x, anchor.y, a.x, a.y) - dist(anchor.x, anchor.y, b.x, b.y))[0];
    const edge = {
      a: anchor,
      b: target,
      kind: "anchor",
      weight: rng.float(CONFIG.lineThickness[0], CONFIG.lineThickness[1]),
      filaments: 1,
      alpha: rng.float(188, 252),
      color: CONFIG.cobalt,
      start: 0.02,
      duration: 0.24,
      phase: rng.float(0, TWO_PI),
      keep: true,
    };
    const bundled = makeBundledPath(edge);
    const route = pathIsClear(bundled, edge) ? bundled : routeAroundObstacles(edge, routingGrid);
    if (route && pathIsClear(route, edge)) {
      edge.path = route;
      graphEdges.push(edge);
    }
  });
}

function reconnectGraphComponents(routingGrid) {
  for (let pass = 0; pass < graphNodes.length; pass++) {
    const components = collectGraphComponents();
    if (components.length <= 1) return;
    let best = null;
    for (let i = 0; i < components.length; i++) {
      for (let j = i + 1; j < components.length; j++) {
        components[i].forEach((a) => {
          components[j].forEach((b) => {
            const distance = dist(a.x, a.y, b.x, b.y);
            if (!best || distance < best.distance) best = { a, b, distance };
          });
        });
      }
    }
    if (!best) return;
    const edge = {
      a: best.a,
      b: best.b,
      kind: "long",
      weight: rng.float(CONFIG.lineThickness[0], CONFIG.lineThickness[1]),
      filaments: 1,
      alpha: rng.float(184, 236),
      color: CONFIG.cobalt,
      start: 0.18,
      duration: 0.32,
      phase: rng.float(0, TWO_PI),
      keep: true,
    };
    const bundled = makeBundledPath(edge);
    const route = pathIsClear(bundled, edge)
      ? bundled
      : routeAroundObstacles(edge, routingGrid);
    if (!route || !pathIsClear(route, edge)) return;
    edge.path = route;
    graphEdges.push(edge);
  }
}

function collectGraphComponents() {
  const adjacency = new Map();
  graphNodes.forEach((node) => adjacency.set(node, []));
  graphEdges.forEach((edge) => {
    adjacency.get(edge.a).push(edge.b);
    adjacency.get(edge.b).push(edge.a);
  });
  const seen = new Set();
  const components = [];
  graphNodes.forEach((node) => {
    if (seen.has(node) || adjacency.get(node).length === 0) return;
    const component = [];
    const stack = [node];
    seen.add(node);
    while (stack.length) {
      const current = stack.pop();
      component.push(current);
      adjacency.get(current).forEach((next) => {
        if (!seen.has(next)) {
          seen.add(next);
          stack.push(next);
        }
      });
    }
    components.push(component);
  });
  return components;
}

function buildRoutingGrid(cellSize) {
  const columns = ceil(DESIGN.width / cellSize);
  const rows = ceil(DESIGN.height / cellSize);
  const blocked = new Array(columns * rows).fill(false);
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const point = { x: (column + 0.5) * cellSize, y: (row + 0.5) * cellSize };
      blocked[row * columns + column] = fragments.some((fragment) => pointNearPolygon(point, fragment.transformedPolygon, 14));
    }
  }
  return { cellSize, columns, rows, blocked };
}

function routeAroundObstacles(edge, grid) {
  const start = nearestOpenGridCell(edge.a, grid);
  const goal = nearestOpenGridCell(edge.b, grid);
  if (!start || !goal) return null;
  const startKey = start.row * grid.columns + start.column;
  const goalKey = goal.row * grid.columns + goal.column;
  const open = [{ key: startKey, f: 0 }];
  const cameFrom = new Map();
  const cost = new Map([[startKey, 0]]);
  const directions = [-1, 0, 1].flatMap((x) => [-1, 0, 1].map((y) => ({ x, y }))).filter((step) => step.x || step.y);

  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift().key;
    if (current === goalKey) {
      const cells = [];
      let key = current;
      while (key !== undefined) {
        const row = floor(key / grid.columns);
        const column = key % grid.columns;
        cells.push({ x: (column + 0.5) * grid.cellSize, y: (row + 0.5) * grid.cellSize });
        key = cameFrom.get(key);
      }
      cells.reverse();
      const route = [{ x: edge.a.x, y: edge.a.y }, ...cells, { x: edge.b.x, y: edge.b.y }];
      return simplifyRoute(route, edge);
    }
    const row = floor(current / grid.columns);
    const column = current % grid.columns;
    directions.forEach((step) => {
      const nextColumn = column + step.x;
      const nextRow = row + step.y;
      if (nextColumn < 0 || nextColumn >= grid.columns || nextRow < 0 || nextRow >= grid.rows) return;
      const nextKey = nextRow * grid.columns + nextColumn;
      if (grid.blocked[nextKey]) return;
      const nextCost = (cost.get(current) || 0) + (step.x && step.y ? 1.414 : 1);
      if (nextCost >= (cost.get(nextKey) ?? Infinity)) return;
      cost.set(nextKey, nextCost);
      cameFrom.set(nextKey, current);
      const heuristic = dist(nextColumn, nextRow, goal.column, goal.row);
      open.push({ key: nextKey, f: nextCost + heuristic });
    });
  }
  return null;
}

function nearestOpenGridCell(point, grid) {
  const originColumn = constrain(floor(point.x / grid.cellSize), 0, grid.columns - 1);
  const originRow = constrain(floor(point.y / grid.cellSize), 0, grid.rows - 1);
  for (let radius = 0; radius < max(grid.columns, grid.rows); radius++) {
    for (let y = -radius; y <= radius; y++) {
      for (let x = -radius; x <= radius; x++) {
        const column = originColumn + x;
        const row = originRow + y;
        if (column < 0 || column >= grid.columns || row < 0 || row >= grid.rows) continue;
        if (!grid.blocked[row * grid.columns + column]) return { column, row };
      }
    }
  }
  return null;
}

function simplifyRoute(route, edge) {
  const result = [route[0]];
  let index = 0;
  while (index < route.length - 1) {
    let next = index + 1;
    for (let candidate = index + 1; candidate < route.length; candidate++) {
      if (pathIsClear([route[index], route[candidate]], edge)) next = candidate;
    }
    result.push(route[next]);
    index = next;
  }
  return result;
}

function pathIsClear(path, edge) {
  if (!path || path.length < 2) return false;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const midpoint = { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 };
    for (const fragment of fragments) {
      const isAnchorFragment = (edge.a.anchor && edge.a.fragment === fragment && i === 0)
        || (edge.b.anchor && edge.b.fragment === fragment && i === path.length - 2);
      if (pointInPolygon(midpoint, fragment.transformedPolygon)) return false;
      if (polygonSegmentIntersects(fragment.transformedPolygon, a, b) && !isAnchorFragment) return false;
    }
  }
  return true;
}

function pointNearPolygon(point, polygon, padding = 0) {
  return pointInPolygon(point, polygon)
    || polygonDistance([point], polygon) < padding;
}

function polygonSegmentIntersects(polygon, a, b) {
  for (let i = 0; i < polygon.length; i++) {
    if (segmentsIntersect(a, b, polygon[i], polygon[(i + 1) % polygon.length])) return true;
  }
  return false;
}

function forceRelaxGraph() {
  const iterations = round(lerp(105, 185, fractureSeverity));
  const nodes = graphNodes;
  const edges = graphEdges;
  const bounds = {
    left: plateLayout.x - plateLayout.size * 0.82,
    right: plateLayout.x + plateLayout.size * 0.90,
    top: plateLayout.y - plateLayout.size * 0.76,
    bottom: plateLayout.y + plateLayout.size * 0.74,
  };

  for (let step = 0; step < iterations; step++) {
    const force = nodes.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d2 = max(18, dx * dx + dy * dy);
        const d = sqrt(d2);
        const repulse = (a.anchor || b.anchor ? 155 : 260) / d2;
        const fx = (dx / d) * repulse;
        const fy = (dy / d) * repulse;
        force[i].x -= fx;
        force[i].y -= fy;
        force[j].x += fx;
        force[j].y += fy;
      }
    }

    edges.forEach((edge) => {
      const a = edge.a;
      const b = edge.b;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = max(1, sqrt(dx * dx + dy * dy));
      const rest = edge.kind === "long" ? plateLayout.size * 0.16 : plateLayout.size * 0.055;
      const spring = (d - rest) * (edge.kind === "long" ? 0.0048 : 0.0082);
      const fx = (dx / d) * spring;
      const fy = (dy / d) * spring;
      force[a.id].x += fx;
      force[a.id].y += fy;
      force[b.id].x -= fx;
      force[b.id].y -= fy;
    });

    nodes.forEach((node, index) => {
      if (node.anchor) return;
      const homeX = node.homeX - node.x;
      const homeY = node.homeY - node.y;
      force[index].x += homeX * 0.0018;
      force[index].y += homeY * 0.0018;
      node.vx = constrain((node.vx + force[index].x) * 0.76, -3.4, 3.4);
      node.vy = constrain((node.vy + force[index].y) * 0.76, -3.4, 3.4);
      node.x = constrain(node.x + node.vx, bounds.left, bounds.right);
      node.y = constrain(node.y + node.vy, bounds.top, bounds.bottom);
    });
  }
}

function makeBundledPath(edge) {
  const a = edge.a;
  const b = edge.b;
  const sameCluster = !a.anchor && !b.anchor && a.cluster === b.cluster;
  const anchorEdge = a.anchor || b.anchor;
  const bundle = sameCluster
    ? graphClusters[a.cluster]
    : anchorEdge
      ? {
        x: lerp(a.x, b.x, 0.58),
        y: lerp(a.y, b.y, 0.58),
      }
    : {
      x: lerp(a.x, b.x, 0.5) + (fractureFocus.x * 0.22),
      y: lerp(a.y, b.y, 0.5) + (fractureFocus.y * 0.22),
    };
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = max(1, sqrt(dx * dx + dy * dy));
  const nx = -dy / length;
  const ny = dx / length;
  const bend = (sameCluster ? length * 0.18 : anchorEdge ? length * 0.045 : length * 0.08) * rng.float(-1, 1);
  const c1 = {
    x: lerp(a.x, bundle.x, 0.56) + nx * bend,
    y: lerp(a.y, bundle.y, 0.56) + ny * bend,
  };
  const c2 = {
    x: lerp(b.x, bundle.x, 0.56) + nx * bend,
    y: lerp(b.y, bundle.y, 0.56) + ny * bend,
  };
  const points = [];
  const count = edge.kind === "long" ? 15 : anchorEdge ? 9 : 11;
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const mt = 1 - t;
    points.push({
      x: mt * mt * mt * a.x + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t * t * t * b.x,
      y: mt * mt * mt * a.y + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t * t * t * b.y,
    });
  }
  return points;
}

function buildEditorialComposition() {
  foodContainers = [];
  editorialConnectors = [];
  editorialTextBlocks = [];

  const slots = buildEditorialSlots();
  const assetOrder = shuffledIndices(foodImages.length);
  assetOrder.forEach((assetIndex) => {
    const imageAsset = foodImages[assetIndex];
    if (!imageAsset || !imageAsset.width || !imageAsset.height) return;

    const imageScale = rng.float(0.88, 1.08);
    const maxImageWidth = rng.float(168, 224) * imageScale;
    const maxImageHeight = rng.float(126, 184) * imageScale;
    const aspect = imageAsset.width / imageAsset.height;
    let imageWidth = maxImageWidth;
    let imageHeight = imageWidth / aspect;
    if (imageHeight > maxImageHeight) {
      imageHeight = maxImageHeight;
      imageWidth = imageHeight * aspect;
    }

    const width = ceil(imageWidth + EDITORIAL.containerPadding * 2);
    const height = ceil(
      EDITORIAL.containerHeader
      + imageHeight
      + EDITORIAL.containerPadding * 2
    );
    const rect = chooseFoodContainerRect(width, height, slots, foodContainers);
    if (!rect) return;

    foodContainers.push({
      id: foodContainers.length,
      assetKey: FOOD_ASSETS[assetIndex].key,
      image: imageAsset,
      x: rect.x,
      y: rect.y,
      width,
      height,
      imageX: rect.x + (width - imageWidth) * 0.5,
      imageY: rect.y + EDITORIAL.containerHeader + EDITORIAL.containerPadding,
      imageWidth,
      imageHeight,
    });
  });

  editorialTextBlocks = buildEditorialTextBlocks(slots);
  editorialConnectors = buildEditorialConnectors();
  updateEditorialValidation();
}

function buildEditorialSlots() {
  const slots = [];
  const left = EDITORIAL.frameInnerInset + 26;
  const top = EDITORIAL.frameInnerInset + 22;
  for (let y = top; y <= DESIGN.height - top - 120; y += 164) {
    for (let x = left; x <= DESIGN.width - left - 180; x += 214) {
      slots.push({
        x: snapGrid(x + rng.float(-18, 18), 12),
        y: snapGrid(y + rng.float(-16, 16), 12),
      });
    }
  }
  return shuffled(slots);
}

function chooseFoodContainerRect(width, height, slots, existing) {
  let best = null;
  let bestScore = Infinity;
  for (const slot of slots) {
    const rect = {
      x: slot.x,
      y: slot.y,
      width,
      height,
    };
    if (!rectInsideEditorialFrame(rect, 14)) continue;
    if (existing.some((other) => rectsOverlap(rect, other, EDITORIAL.containerGap))) continue;

    const plateCoverage = editorialFragmentCoverage(rect);
    const networkCoverage = editorialNetworkCoverage(rect);
    // The outer grid gives the collage its negative space. Small plate
    // overlaps remain possible, but a container cannot bury the focal mass.
    if (plateCoverage > 0.18 || networkCoverage > 0.08) continue;
    const edgeDistance = min(
      rect.x - EDITORIAL.frameInnerInset,
      rect.y - EDITORIAL.frameInnerInset,
      DESIGN.width - EDITORIAL.frameInnerInset - (rect.x + rect.width),
      DESIGN.height - EDITORIAL.frameInnerInset - (rect.y + rect.height)
    );
    const score = plateCoverage * 560 + networkCoverage * 400 + max(0, 42 - edgeDistance) * 0.4 + rng.float(0, 12);
    if (score < bestScore) {
      bestScore = score;
      best = rect;
    }
  }
  return best;
}

function buildEditorialTextBlocks(slots) {
  const specs = [
    {
      key: "cta",
      lines: ["USE YOUR FREEDOM TO CHOOSE", "NUTRITIOUS FOOD."],
      style: "blue",
      size: 29,
      leading: 32,
      padding: 16,
    },
    {
      key: "full",
      lines: ["FULL ≠ NOURISHED"],
      style: "white",
      size: 19,
      leading: 21,
      padding: 12,
    },
    {
      key: "beyond",
      lines: ["BEYOND FULLNESS"],
      style: "blue",
      size: 18,
      leading: 20,
      padding: 12,
    },
    {
      key: "right",
      lines: ["FOOD IS A HUMAN RIGHT."],
      style: "white",
      size: 15,
      leading: 17,
      padding: 11,
    },
    {
      key: "nutrients",
      lines: ["NUTRIENTS MATTER."],
      style: "white",
      size: 18,
      leading: 20,
      padding: 11,
    },
    {
      key: "meal",
      lines: ["EVERY MEAL IS AN OPPORTUNITY."],
      style: "white",
      size: 14,
      leading: 16,
      padding: 10,
    },
    {
      key: "choose",
      lines: ["CHOOSE BEYOND CALORIES."],
      style: "blue",
      size: 15,
      leading: 17,
      padding: 10,
    },
    {
      key: "support",
      lines: ["Start with your next meal."],
      style: "white",
      size: 13,
      leading: 15,
      padding: 10,
    },
  ];

  textFont("Arial");
  const placed = [];
  return specs.map((spec) => {
    textSize(spec.size);
    const measuredWidth = max(...spec.lines.map((line) => textWidth(line)));
    const width = ceil(measuredWidth + spec.padding * 2);
    const height = ceil(spec.lines.length * spec.leading + spec.padding * 2);
    const rect = chooseEditorialTextRect(width, height, slots, placed);
    const block = {
      ...spec,
      x: rect ? rect.x : EDITORIAL.frameInnerInset,
      y: rect ? rect.y : EDITORIAL.frameInnerInset,
      width,
      height,
    };
    placed.push(block);
    return block;
  });
}

function chooseEditorialTextRect(width, height, slots, placed = editorialTextBlocks) {
  let best = null;
  let bestScore = Infinity;
  let fallback = null;
  let fallbackScore = Infinity;
  for (const slot of slots) {
    const rect = { x: slot.x, y: slot.y, width, height };
    if (!rectInsideEditorialFrame(rect, 12)) continue;
    if (foodContainers.some((container) => rectsOverlap(rect, container, EDITORIAL.textGap))) continue;
    if (placed.some((block) => rectsOverlap(rect, block, EDITORIAL.textGap))) continue;

    const plateCoverage = editorialFragmentCoverage(rect);
    const networkCoverage = editorialNetworkCoverage(rect);
    const fallbackCandidateScore = plateCoverage * 500 + networkCoverage * 320 + rng.float(0, 16);
    if (fallbackCandidateScore < fallbackScore) {
      fallbackScore = fallbackCandidateScore;
      fallback = rect;
    }
    if (plateCoverage > 0.16 || networkCoverage > 0.08) continue;
    const score = fallbackCandidateScore;
    if (score < bestScore) {
      bestScore = score;
      best = rect;
    }
  }
  return best || fallback;
}

function buildEditorialConnectors() {
  const targets = [...foodContainers, ...editorialTextBlocks];
  if (targets.length === 0) return [];
  const strictGrid = buildEditorialObstacleGrid(EDITORIAL.connectorCell, true);
  const looseGrid = buildEditorialObstacleGrid(EDITORIAL.connectorCell, false);
  // If the plate completely separates a container from the graph, allow a
  // final route through ceramic geometry. Connectors are rendered beneath the
  // fragments, so the plate masks that portion while preserving continuity in
  // the surrounding negative space.
  const openGrid = buildEditorialObstacleGrid(EDITORIAL.connectorCell, false, false);
  const starts = shuffled(graphNodes.filter((node) => (
    node.active !== false
  )));
  const connectors = [];

  targets.forEach((target) => {
    const ranked = starts
      .sort((a, b) => (
        dist(a.x, a.y, target.x + target.width * 0.5, target.y + target.height * 0.5)
        - dist(b.x, b.y, target.x + target.width * 0.5, target.y + target.height * 0.5)
      ));

    for (const start of ranked.slice(0, 20)) {
      const entry = editorialContainerEntry(target, start);
      const routeResult = routeEditorialOrthogonal(start, entry, target, looseGrid, true)
        || routeEditorialOrthogonal(start, entry, target, strictGrid, false)
        || routeEditorialOrthogonal(start, entry, target, openGrid, true, true)
        || editorialFrameCorridorRoute(start, entry, target);
      if (!routeResult) continue;
      connectors.push({
        start,
        container: target,
        path: routeResult.path,
        ignoresFragments: routeResult.ignoresFragments,
      });
      break;
    }
  });
  return connectors;
}

function buildEditorialObstacleGrid(cellSize, includeText = true, includeFragments = true) {
  const columns = ceil(DESIGN.width / cellSize);
  const rows = ceil(DESIGN.height / cellSize);
  const blocked = new Array(columns * rows).fill(false);
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const point = {
        x: (column + 0.5) * cellSize,
        y: (row + 0.5) * cellSize,
      };
      blocked[row * columns + column] = !pointInsideEditorialFrame(point, 8)
        || (includeFragments && fragments.some((fragment) => (
          pointNearPolygon(point, fragment.transformedPolygon, 12)
        ))) || foodContainers.some((container) => (
        pointInRect(point, container, 8)
        )) || (includeText && editorialTextBlocks.some((block) => (
          pointInRect(point, block, 6)
        )));
    }
  }
  return { cellSize, columns, rows, blocked };
}

function editorialContainerEntry(container, start) {
  const cx = container.x + container.width * 0.5;
  const cy = container.y + container.height * 0.5;
  const dx = start.x - cx;
  const dy = start.y - cy;
  const inset = 18;
  if (abs(dx) >= abs(dy)) {
    const y = constrain(start.y + rng.float(-22, 22), container.y + inset, container.y + container.height - inset);
    const x = dx < 0 ? container.x : container.x + container.width;
    return {
      border: { x, y },
      approach: { x: x + (dx < 0 ? -EDITORIAL.containerGap : EDITORIAL.containerGap), y },
    };
  }
  const x = constrain(start.x + rng.float(-22, 22), container.x + inset, container.x + container.width - inset);
  const y = dy < 0 ? container.y : container.y + container.height;
  return {
    border: { x, y },
    approach: { x, y: y + (dy < 0 ? -EDITORIAL.containerGap : EDITORIAL.containerGap) },
  };
}

function routeEditorialOrthogonal(start, entry, targetContainer, grid, ignoreText = false, ignoreFragments = false) {
  const startCell = nearestEditorialOpenGridCell(start, grid);
  const goalCell = nearestEditorialOpenGridCell(entry.approach, grid);
  if (!startCell || !goalCell) return null;
  const gridPath = editorialAStar(startCell, goalCell, grid);
  if (!gridPath || gridPath.length < 1) return null;

  const joinOrders = ["horizontal-first", "vertical-first"];
  for (const startOrder of joinOrders) {
    for (const endOrder of joinOrders) {
      const route = [{ x: start.x, y: start.y }];
      const first = gridPath[0];
      appendOrthogonalJoin(route, first, startOrder);
      gridPath.slice(1).forEach((point) => route.push(point));
      appendOrthogonalJoin(route, entry.approach, endOrder);
      route.push(entry.border);
      const simplified = simplifyOrthogonalPath(route);
      if (editorialPathIsClear(simplified, targetContainer, start.fragment, ignoreText, ignoreFragments)) {
        return { path: simplified, ignoresFragments: ignoreFragments };
      }
    }
  }
  return null;
}

function editorialFrameCorridorRoute(start, entry, targetContainer) {
  const top = EDITORIAL.frameInnerInset + 16;
  const bottom = DESIGN.height - EDITORIAL.frameInnerInset - 16;
  const left = EDITORIAL.frameInnerInset + 16;
  const right = DESIGN.width - EDITORIAL.frameInnerInset - 16;
  const horizontalY = entry.border.y > DESIGN.height * 0.5 ? bottom : top;
  const verticalX = entry.border.x > DESIGN.width * 0.5 ? right : left;
  const routes = [
    [
      { x: start.x, y: start.y },
      { x: start.x, y: horizontalY },
      { x: entry.approach.x, y: horizontalY },
      entry.approach,
      entry.border,
    ],
    [
      { x: start.x, y: start.y },
      { x: verticalX, y: start.y },
      { x: verticalX, y: entry.approach.y },
      entry.approach,
      entry.border,
    ],
    [
      { x: start.x, y: start.y },
      { x: start.x, y: top },
      { x: entry.approach.x, y: top },
      entry.approach,
      entry.border,
    ],
    [
      { x: start.x, y: start.y },
      { x: start.x, y: bottom },
      { x: entry.approach.x, y: bottom },
      entry.approach,
      entry.border,
    ],
  ];
  for (const route of routes) {
    const simplified = simplifyOrthogonalPath(route);
    if (editorialPathIsClear(simplified, targetContainer, start.fragment, true, true)) {
      return { path: simplified, ignoresFragments: true };
    }
  }
  return null;
}

function editorialAStar(start, goal, grid) {
  const startKey = start.row * grid.columns + start.column;
  const goalKey = goal.row * grid.columns + goal.column;
  const open = [{ key: startKey, f: 0 }];
  const cameFrom = new Map();
  const cost = new Map([[startKey, 0]]);
  const directions = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  grid.blocked[startKey] = false;
  grid.blocked[goalKey] = false;
  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift().key;
    if (current === goalKey) {
      const path = [];
      let key = current;
      while (key !== undefined) {
        const row = floor(key / grid.columns);
        const column = key % grid.columns;
        path.push({
          x: (column + 0.5) * grid.cellSize,
          y: (row + 0.5) * grid.cellSize,
        });
        key = cameFrom.get(key);
      }
      return path.reverse();
    }
    const row = floor(current / grid.columns);
    const column = current % grid.columns;
    directions.forEach((direction) => {
      const nextColumn = column + direction.x;
      const nextRow = row + direction.y;
      if (nextColumn < 0 || nextColumn >= grid.columns || nextRow < 0 || nextRow >= grid.rows) return;
      const nextKey = nextRow * grid.columns + nextColumn;
      if (grid.blocked[nextKey]) return;
      const nextCost = (cost.get(current) || 0) + 1;
      if (nextCost >= (cost.get(nextKey) ?? Infinity)) return;
      cost.set(nextKey, nextCost);
      cameFrom.set(nextKey, current);
      const heuristic = abs(nextColumn - goal.column) + abs(nextRow - goal.row);
      open.push({ key: nextKey, f: nextCost + heuristic });
    });
  }
  return null;
}

function nearestEditorialOpenGridCell(point, grid) {
  const originColumn = constrain(floor(point.x / grid.cellSize), 0, grid.columns - 1);
  const originRow = constrain(floor(point.y / grid.cellSize), 0, grid.rows - 1);
  for (let radius = 0; radius < max(grid.columns, grid.rows); radius++) {
    for (let y = -radius; y <= radius; y++) {
      for (let x = -radius; x <= radius; x++) {
        const column = originColumn + x;
        const row = originRow + y;
        if (column < 0 || column >= grid.columns || row < 0 || row >= grid.rows) continue;
        if (!grid.blocked[row * grid.columns + column]) return { column, row };
      }
    }
  }
  return null;
}

function appendOrthogonalJoin(route, point, order = "horizontal-first") {
  const previous = route[route.length - 1];
  if (previous.x === point.x || previous.y === point.y) {
    route.push(point);
    return;
  }
  if (order === "horizontal-first") {
    route.push({ x: point.x, y: previous.y }, point);
  } else {
    route.push({ x: previous.x, y: point.y }, point);
  }
}

function simplifyOrthogonalPath(path) {
  const result = [];
  path.forEach((point) => {
    const previous = result[result.length - 1];
    if (previous && dist(previous.x, previous.y, point.x, point.y) < 0.5) return;
    result.push(point);
    while (result.length >= 3) {
      const a = result[result.length - 3];
      const b = result[result.length - 2];
      const c = result[result.length - 1];
      if ((a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y)) result.splice(result.length - 2, 1);
      else break;
    }
  });
  return result;
}

function editorialPathIsClear(path, targetContainer, startFragment = null, ignoreText = false, ignoreFragments = false) {
  if (!path || path.length < 2) return false;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const isTargetEntry = i === path.length - 2;
    const midpoint = { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 };
    if (!ignoreFragments) {
      for (const fragment of fragments) {
        if (fragment === startFragment && i === 0) continue;
        if (pointInPolygon(midpoint, fragment.transformedPolygon)) return false;
        if (polygonSegmentIntersects(fragment.transformedPolygon, a, b)) return false;
      }
    }
    for (const container of foodContainers) {
      if (container === targetContainer && isTargetEntry) continue;
      if (segmentIntersectsRect(a, b, container, 4)) return false;
    }
    if (!ignoreText) {
      for (const block of editorialTextBlocks) {
        if (block === targetContainer && isTargetEntry) continue;
        if (segmentIntersectsRect(a, b, block, 3)) return false;
      }
    }
  }
  return ignoreFragments || path.every((point, index) => (
    index === 0 && startFragment
      ? true
      : index === path.length - 1 || !fragments.some((fragment) => pointInPolygon(point, fragment.transformedPolygon))
  ));
}

function renderEditorialConnectors() {
  beginDesignSpace();
  noFill();
  stroke(EDITORIAL.blue[0], EDITORIAL.blue[1], EDITORIAL.blue[2], 238);
  strokeWeight(EDITORIAL.connectorWeight);
  drawingContext.lineCap = "square";
  drawingContext.lineJoin = "miter";
  editorialConnectors.forEach((connector) => {
    beginShape();
    connector.path.forEach((point) => vertex(point.x, point.y));
    endShape();
  });
  endDesignSpace();
}

function renderFoodContainers() {
  beginDesignSpace();
  imageMode(CORNER);
  foodContainers.forEach((container) => {
    noStroke();
    fill(255);
    rect(container.x, container.y, container.width, container.height);
    image(container.image, container.imageX, container.imageY, container.imageWidth, container.imageHeight);
    fill(EDITORIAL.blue[0], EDITORIAL.blue[1], EDITORIAL.blue[2]);
    rect(container.x, container.y, container.width, EDITORIAL.containerHeader);
    noFill();
    stroke(EDITORIAL.blue[0], EDITORIAL.blue[1], EDITORIAL.blue[2]);
    strokeWeight(EDITORIAL.containerBorder);
    rect(
      container.x + EDITORIAL.containerBorder * 0.5,
      container.y + EDITORIAL.containerBorder * 0.5,
      container.width - EDITORIAL.containerBorder,
      container.height - EDITORIAL.containerBorder
    );
  });
  endDesignSpace();
}

function renderEditorialTypography() {
  beginDesignSpace();
  textFont("Arial");
  textAlign(LEFT, TOP);
  drawingContext.lineJoin = "miter";
  editorialTextBlocks.forEach((block) => {
    if (block.style === "blue") {
      noStroke();
      fill(EDITORIAL.blue[0], EDITORIAL.blue[1], EDITORIAL.blue[2]);
      rect(block.x, block.y, block.width, block.height);
      fill(255);
    } else if (block.style === "white") {
      fill(255);
      stroke(EDITORIAL.blue[0], EDITORIAL.blue[1], EDITORIAL.blue[2]);
      strokeWeight(2);
      rect(block.x, block.y, block.width, block.height);
      noStroke();
      fill(EDITORIAL.blue[0], EDITORIAL.blue[1], EDITORIAL.blue[2]);
    } else {
      noStroke();
      fill(EDITORIAL.blue[0], EDITORIAL.blue[1], EDITORIAL.blue[2]);
    }
    textSize(block.size);
    textStyle(block.key === "cta" ? BOLD : NORMAL);
    block.lines.forEach((line, index) => {
      text(line, block.x + block.padding, block.y + block.padding + index * block.leading);
    });
  });
  textStyle(NORMAL);
  endDesignSpace();
}

function renderEditorialFrame() {
  beginDesignSpace();
  noFill();
  stroke(EDITORIAL.blue[0], EDITORIAL.blue[1], EDITORIAL.blue[2]);
  strokeWeight(EDITORIAL.frameOuterWeight);
  rect(
    EDITORIAL.frameInset + EDITORIAL.frameOuterWeight * 0.5,
    EDITORIAL.frameInset + EDITORIAL.frameOuterWeight * 0.5,
    DESIGN.width - 2 * (EDITORIAL.frameInset + EDITORIAL.frameOuterWeight * 0.5),
    DESIGN.height - 2 * (EDITORIAL.frameInset + EDITORIAL.frameOuterWeight * 0.5)
  );
  strokeWeight(EDITORIAL.frameInnerWeight);
  rect(
    EDITORIAL.frameInnerInset,
    EDITORIAL.frameInnerInset,
    DESIGN.width - EDITORIAL.frameInnerInset * 2,
    DESIGN.height - EDITORIAL.frameInnerInset * 2
  );
  endDesignSpace();
}

function updateEditorialValidation() {
  validationReport = validationReport || {};
  validationReport.foodContainerOverlapPairs = countRectOverlaps(foodContainers, EDITORIAL.containerGap);
  const textPairs = [];
  for (let i = 0; i < editorialTextBlocks.length; i++) {
    for (let j = i + 1; j < editorialTextBlocks.length; j++) {
      if (rectsOverlap(editorialTextBlocks[i], editorialTextBlocks[j], EDITORIAL.textGap)) {
        textPairs.push(`${editorialTextBlocks[i].key}:${editorialTextBlocks[j].key}`);
      }
    }
  }
  const textContainerPairs = [];
  editorialTextBlocks.forEach((block) => foodContainers.forEach((container) => {
    if (rectsOverlap(block, container, 0)) textContainerPairs.push(`${block.key}:${container.assetKey}`);
  }));
  validationReport.editorialTextOverlapPairs = textPairs.length + textContainerPairs.length;
  validationReport.editorialConnectorCount = editorialConnectors.length;
  const disconnectedContainers = foodContainers.filter((container) => (
    !editorialConnectors.some((connector) => connector.container === container)
  ));
  validationReport.editorialDisconnectedContainers = disconnectedContainers.length;
  validationReport.editorialDisconnectedTextBlocks = editorialTextBlocks.filter((block) => (
    !editorialConnectors.some((connector) => connector.container === block)
  )).length;
  validationReport.editorialInvalidRoutes = editorialConnectors.filter((connector) => (
    !editorialPathIsClear(
      connector.path,
      connector.container,
      connector.start.fragment,
      true,
      connector.ignoresFragments
    )
  )).length;
}

function editorialFragmentCoverage(rect) {
  let hits = 0;
  const samples = 6;
  for (let y = 0; y < samples; y++) {
    for (let x = 0; x < samples; x++) {
      const point = {
        x: rect.x + ((x + 0.5) / samples) * rect.width,
        y: rect.y + ((y + 0.5) / samples) * rect.height,
      };
      if (fragments.some((fragment) => pointInPolygon(point, fragment.transformedPolygon))) hits++;
    }
  }
  return hits / (samples * samples);
}

function editorialNetworkCoverage(rect) {
  let hits = 0;
  const samples = 5;
  for (let y = 0; y < samples; y++) {
    for (let x = 0; x < samples; x++) {
      const point = {
        x: rect.x + ((x + 0.5) / samples) * rect.width,
        y: rect.y + ((y + 0.5) / samples) * rect.height,
      };
      const nearNode = graphNodes.some((node) => dist(point.x, point.y, node.x, node.y) < 12);
      const nearEdge = graphEdges.some((edge) => (
        edge.path && edge.path.some((current, index) => index > 0 && pointSegmentDistance(
          point,
          edge.path[index - 1],
          current
        ) < 9)
      ));
      if (nearNode || nearEdge) hits++;
    }
  }
  return hits / (samples * samples);
}

function rectInsideEditorialFrame(rect, padding = 0) {
  const left = EDITORIAL.frameInnerInset + padding;
  const top = EDITORIAL.frameInnerInset + padding;
  const right = DESIGN.width - left;
  const bottom = DESIGN.height - top;
  return rect.x >= left
    && rect.y >= top
    && rect.x + rect.width <= right
    && rect.y + rect.height <= bottom;
}

function pointInsideEditorialFrame(point, padding = 0) {
  return point.x >= EDITORIAL.frameInnerInset + padding
    && point.x <= DESIGN.width - EDITORIAL.frameInnerInset - padding
    && point.y >= EDITORIAL.frameInnerInset + padding
    && point.y <= DESIGN.height - EDITORIAL.frameInnerInset - padding;
}

function rectsOverlap(a, b, gap = 0) {
  return a.x < b.x + b.width + gap
    && a.x + a.width + gap > b.x
    && a.y < b.y + b.height + gap
    && a.y + a.height + gap > b.y;
}

function countRectOverlaps(items, gap = 0) {
  let count = 0;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (rectsOverlap(items[i], items[j], gap)) count++;
    }
  }
  return count;
}

function pointInRect(point, rect, padding = 0) {
  return point.x >= rect.x - padding
    && point.x <= rect.x + rect.width + padding
    && point.y >= rect.y - padding
    && point.y <= rect.y + rect.height + padding;
}

function segmentIntersectsRect(a, b, rect, padding = 0) {
  const expanded = {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
  if (pointInRect(a, expanded) || pointInRect(b, expanded)) return true;
  const topLeft = { x: expanded.x, y: expanded.y };
  const topRight = { x: expanded.x + expanded.width, y: expanded.y };
  const bottomRight = { x: expanded.x + expanded.width, y: expanded.y + expanded.height };
  const bottomLeft = { x: expanded.x, y: expanded.y + expanded.height };
  return segmentsIntersect(a, b, topLeft, topRight)
    || segmentsIntersect(a, b, topRight, bottomRight)
    || segmentsIntersect(a, b, bottomRight, bottomLeft)
    || segmentsIntersect(a, b, bottomLeft, topLeft);
}

function shuffledIndices(length) {
  return shuffled(Array.from({ length }, (_, index) => index));
}

function shuffled(items) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = floor(rng.float(0, i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function snapGrid(value, size) {
  return round(value / size) * size;
}

function renderPaper() {
  background(...CONFIG.background);
  beginDesignSpace();
  noStroke();
  fill(255, 255, 255, 14);
  rect(0, 0, DESIGN.width, DESIGN.height);
  // Quiet paper grain: sparse and almost imperceptible at full resolution.
  randomSeed(seedValue + 991);
  for (let i = 0; i < 1300; i++) {
    const x = random(DESIGN.width);
    const y = random(DESIGN.height);
    const a = random(2, 10);
    fill(93, 82, 68, a);
    rect(x, y, random(0.3, 1.1), random(0.3, 1.1));
  }
  randomSeed(seedValue);
  endDesignSpace();
}

function renderAtmosphere() {
  beginDesignSpace();
  // Keep the negative space empty. The graph itself is the only line system;
  // orbital guides and registration marks made the network feel detached from
  // the fracture zone.
  endDesignSpace();
}

function renderNetwork() {
  beginDesignSpace();
  drawingContext.lineCap = "round";
  drawingContext.lineJoin = "round";
  noFill();
  graphEdges.forEach((edge) => {
    if (!edge.keep) return;
    const edgeProgress = constrain((networkProgress - edge.start) / edge.duration, 0, 1);
    if (edgeProgress <= 0) return;
    const partial = partialPath(edge.path, easeOutCubic(edgeProgress));
    // Every path has already passed obstacle validation. Do not clip it at
    // render time: clipping would recreate the floating, abruptly terminated
    // endpoints this experiment is designed to avoid.
    const visiblePath = partial;
    if (visiblePath.length < 2) return;
    const filaments = edge.filaments || 2;
    for (let i = 0; i < filaments; i++) {
      const centre = (filaments - 1) / 2;
      const spread = (i - centre) * (edge.kind === "long" ? 0.82 : 0.52);
      stroke(edge.color[0], edge.color[1], edge.color[2], edge.alpha / (i === centre ? 1.0 : 1.12));
      strokeWeight(max(0.82, edge.weight * (i === centre ? 1.18 : 0.88)));
      drawPath(offsetPath(visiblePath, spread, edge.phase + i * 0.53));
    }
  });

  // Tiny graph points keep the topology legible without turning the artwork
  // into a node diagram. The dark cores come from overlapping edges instead.
  noStroke();
  graphNodes.forEach((node, index) => {
    if (node.active === false) return;
    if (!node.anchor && index % 8 !== 0) return;
    fill(CONFIG.cobaltDeep[0], CONFIG.cobaltDeep[1], CONFIG.cobaltDeep[2], node.anchor ? 190 : 130);
    circle(node.x, node.y, node.anchor ? 1.9 : 1.05);
  });
  endDesignSpace();
}

function partialPath(path, progress) {
  if (progress >= 1) return path;
  const position = constrain(progress, 0, 1) * (path.length - 1);
  const index = floor(position);
  const visible = path.slice(0, index + 1);
  if (index < path.length - 1) {
    visible.push({
      x: lerp(path[index].x, path[index + 1].x, position - index),
      y: lerp(path[index].y, path[index + 1].y, position - index),
    });
  }
  return visible;
}

function clipPathToCircle(path, cx, cy, radius) {
  if (path.length < 2) return path;
  const result = [];
  const isInside = (point) => dist(point.x, point.y, cx, cy) <= radius;

  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const aInside = isInside(a);
    const bInside = isInside(b);
    if (aInside && (result.length === 0 || result[result.length - 1] !== a)) result.push(a);
    if (aInside !== bInside) {
      let low = 0;
      let high = 1;
      for (let step = 0; step < 12; step++) {
        const middle = (low + high) / 2;
        const point = { x: lerp(a.x, b.x, middle), y: lerp(a.y, b.y, middle) };
        if (isInside(point) === aInside) low = middle;
        else high = middle;
      }
      const t = (low + high) / 2;
      result.push({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
    }
    if (bInside && i === path.length - 2) result.push(b);
  }
  return result;
}

function clipPathToEllipse(path, cx, cy, radiusX, radiusY) {
  if (path.length < 2) return path;
  const result = [];
  const isInside = (point) => {
    const dx = (point.x - cx) / radiusX;
    const dy = (point.y - cy) / radiusY;
    return dx * dx + dy * dy <= 1;
  };

  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const aInside = isInside(a);
    const bInside = isInside(b);
    if (aInside && (result.length === 0 || result[result.length - 1] !== a)) result.push(a);
    if (aInside !== bInside) {
      let low = 0;
      let high = 1;
      for (let step = 0; step < 14; step++) {
        const middle = (low + high) / 2;
        const point = { x: lerp(a.x, b.x, middle), y: lerp(a.y, b.y, middle) };
        if (isInside(point) === aInside) low = middle;
        else high = middle;
      }
      const t = (low + high) / 2;
      result.push({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
    }
    if (bInside && i === path.length - 2) result.push(b);
  }
  return result;
}

function offsetPath(path, offset, phase) {
  if (!offset) return path;
  return path.map((point, index) => {
    const previous = path[max(0, index - 1)];
    const next = path[min(path.length - 1, index + 1)];
    const dx = next.x - previous.x;
    const dy = next.y - previous.y;
    const length = max(1, sqrt(dx * dx + dy * dy));
    const wobble = sin(phase + index * 0.65) * 0.6;
    return {
      x: point.x + (-dy / length) * (offset + wobble),
      y: point.y + (dx / length) * (offset + wobble),
    };
  });
}

function renderFragments() {
  beginDesignSpace();
  fragments.forEach((fragment) => {
    const t = fragment.image;
    const bounds = polygonBounds(fragment.local);
    const currentX = lerp(fragment.baseX, fragment.x, fragmentProgress);
    const currentY = lerp(fragment.baseY, fragment.y, fragmentProgress);

    push();
    translate(currentX, currentY);
    rotate(fragment.rotation);
    scale(fragment.scale);

    // A warm offset underpainting gives the broken ceramic a tangible edge.
    drawingContext.save();
    drawingContext.shadowColor = `rgba(70, 51, 37, ${map(CONFIG.shadowIntensity[0] + fragment.depth * 10, 0, 50, 0.06, 0.24)})`;
    drawingContext.shadowBlur = lerp(5, 18, fractureSeverity);
    drawingContext.shadowOffsetX = 4 + fragment.depth * 4;
    drawingContext.shadowOffsetY = 7 + fragment.depth * 7;
    image(t.image, t.minX - fragment.center.x, t.minY - fragment.center.y);
    drawingContext.restore();

    // Keep the ceramic photographic and unoutlined. The graph and the actual
    // shadowed gaps provide the fracture read.
    image(t.image, t.minX - fragment.center.x, t.minY - fragment.center.y);
    pop();
  });
  endDesignSpace();
}

function renderAnchorTips() {
  beginDesignSpace();
  drawingContext.lineCap = "round";
  drawingContext.lineJoin = "round";
  graphEdges.forEach((edge) => {
    if (edge.kind !== "anchor" || !edge.keep) return;
    const edgeProgress = constrain((networkProgress - edge.start) / edge.duration, 0, 1);
    if (edgeProgress <= 0) return;

    const anchor = edge.a.anchor ? edge.a : edge.b;
    const fragment = anchor.fragment;
    if (!fragment) return;
    const outward = createVector(anchor.x - fragment.x, anchor.y - fragment.y);
    if (outward.mag() < 1) return;
    outward.normalize();
    const start = {
      x: anchor.x + outward.x * 0.75,
      y: anchor.y + outward.y * 0.75,
    };
    const end = {
      x: anchor.x + outward.x * 24,
      y: anchor.y + outward.y * 24,
    };

    // Ceramic shadows are painted after the network and can visually mask a
    // mathematically correct endpoint. This short overpainted tip removes the
    // false white gap while leaving the rest of the graph beneath the object.
    stroke(edge.color[0], edge.color[1], edge.color[2], min(255, edge.alpha + 24));
    strokeWeight(max(1.15, edge.weight * 1.02));
    line(start.x, start.y, end.x, end.y);
  });
  endDesignSpace();
}

function pathPrefix(path, maxLength) {
  if (path.length < 2) return path;
  const result = [path[0]];
  let length = 0;
  for (let i = 1; i < path.length; i++) {
    const previous = path[i - 1];
    const current = path[i];
    const segment = dist(previous.x, previous.y, current.x, current.y);
    if (length + segment <= maxLength) {
      result.push(current);
      length += segment;
      continue;
    }
    const remaining = maxLength - length;
    const t = constrain(remaining / max(1, segment), 0, 1);
    result.push({
      x: lerp(previous.x, current.x, t),
      y: lerp(previous.y, current.y, t),
    });
    break;
  }
  return result;
}

function renderSurfaceDetails() {
  beginDesignSpace();
  endDesignSpace();
}

function beginDesignSpace() {
  push();
  translate(
    (artW - DESIGN.width * scaleFactor) / 2,
    (artH - DESIGN.height * scaleFactor) / 2
  );
  scale(scaleFactor);
}

function endDesignSpace() {
  pop();
}

function buildPeripheralMarks() {
  peripheralMarks = [];
  const count = round(lerp(8, 22, fractureSeverity));
  for (let i = 0; i < count; i++) {
    const angle = rng.float(0, TWO_PI);
    const radius = plateLayout.size * rng.float(0.72, 1.18) + rng.float(20, 210);
    peripheralMarks.push({
      x: plateLayout.x + cos(angle) * radius * rng.float(0.65, 1.22),
      y: plateLayout.y + sin(angle) * radius * rng.float(0.54, 1.05),
      size: rng.float(2.3, 7.5),
      weight: rng.float(0.34, 0.85),
      alpha: rng.float(18, 54),
      color: rng.float() > 0.72 ? CONFIG.warmInk : CONFIG.ink,
      ring: rng.float() > 0.83,
    });
  }
}

function transformLocal(point, fragment) {
  const c = cos(fragment.rotation);
  const s = sin(fragment.rotation);
  const x = (point.x - fragment.center.x) * fragment.scale;
  const y = (point.y - fragment.center.y) * fragment.scale;
  return {
    x: fragment.x + x * c - y * s,
    y: fragment.y + x * s + y * c,
  };
}

function organicPath(start, end, turbulence, longGesture = false) {
  const distance = dist(start.x, start.y, end.x, end.y);
  const steps = longGesture ? 9 : constrain(round(distance / 54), 5, 13);
  const normal = createVector(-(end.y - start.y), end.x - start.x);
  if (normal.mag() > 0) normal.normalize();
  const points = [];
  const seed = rng.float(0, 1000);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const bow = sin(t * PI) * distance * rng.float(-0.18, 0.18) * turbulence;
    const noiseOffset = (noise(seed + i * 0.31, fractureSeverity * 3.7) - 0.5) * distance * 0.14 * turbulence;
    points.push({
      x: lerp(start.x, end.x, t) + normal.x * (bow + noiseOffset),
      y: lerp(start.y, end.y, t) + normal.y * (bow + noiseOffset),
    });
  }
  return points;
}

function drawPath(points) {
  if (points.length < 2) return;
  beginShape();
  curveVertex(points[0].x, points[0].y);
  points.forEach((point) => curveVertex(point.x, point.y));
  curveVertex(points[points.length - 1].x, points[points.length - 1].y);
  endShape();
}

function circlePolygon(cx, cy, radius, count) {
  const polygon = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * TWO_PI;
    const wobble = radius * rng.float(0.988, 1.012);
    polygon.push({ x: cx + cos(angle) * wobble, y: cy + sin(angle) * wobble });
  }
  return polygon;
}

function clipToBisector(polygon, first, second) {
  if (polygon.length === 0) return [];
  const a = 2 * (second.x - first.x);
  const b = 2 * (second.y - first.y);
  const c = second.x * second.x + second.y * second.y - first.x * first.x - first.y * first.y;
  const output = [];
  for (let i = 0; i < polygon.length; i++) {
    const current = polygon[i];
    const previous = polygon[(i + polygon.length - 1) % polygon.length];
    const currentInside = a * current.x + b * current.y <= c + 0.001;
    const previousInside = a * previous.x + b * previous.y <= c + 0.001;
    if (currentInside !== previousInside) {
      const currentValue = a * current.x + b * current.y - c;
      const previousValue = a * previous.x + b * previous.y - c;
      const t = previousValue / (previousValue - currentValue);
      output.push({ x: lerp(previous.x, current.x, t), y: lerp(previous.y, current.y, t) });
    }
    if (currentInside) output.push({ x: current.x, y: current.y });
  }
  return output;
}

function softenCell(polygon, center, amount) {
  const result = [];
  polygon.forEach((point, index) => {
    const previous = polygon[(index + polygon.length - 1) % polygon.length];
    const next = polygon[(index + 1) % polygon.length];
    const pointX = lerp(point.x, (previous.x + next.x) / 2, rng.float(0.02, amount));
    const pointY = lerp(point.y, (previous.y + next.y) / 2, rng.float(0.02, amount));
    result.push({
      x: pointX + (pointX - center.x) * rng.float(-amount, amount),
      y: pointY + (pointY - center.y) * rng.float(-amount, amount),
    });
  });
  return result;
}

function polygonArea(polygon) {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    area += a.x * b.y - b.x * a.y;
  }
  return abs(area) / 2;
}

function polygonCentroid(polygon) {
  let x = 0;
  let y = 0;
  let signedArea = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const cross = a.x * b.y - b.x * a.y;
    signedArea += cross;
    x += (a.x + b.x) * cross;
    y += (a.y + b.y) * cross;
  }
  signedArea *= 0.5;
  if (abs(signedArea) < 0.001) return { x: 0, y: 0 };
  return { x: x / (6 * signedArea), y: y / (6 * signedArea) };
}

function polygonBounds(polygon) {
  const xs = polygon.map((point) => point.x);
  const ys = polygon.map((point) => point.y);
  const minX = min(xs);
  const maxX = max(xs);
  const minY = min(ys);
  const maxY = max(ys);
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - constrain(value, 0, 1), 3);
}

class SeededRandom {
  constructor(seed) {
    this.state = seed >>> 0;
  }

  float(minimum = 0, maximum = 1) {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    const value = this.state / 4294967296;
    return lerp(minimum, maximum, value);
  }
}
