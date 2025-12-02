/**
 * SYNTHETIC GEOMETRY VALIDATION TEST
 * Tests RVR pipeline (Moore Trace → Douglas-Peucker → PCA Regularization)
 * WITHOUT external API dependencies
 */

// ============================================================================
// EXTRACTED FUNCTIONS FROM GoogleSolarAPI.js
// ============================================================================

const POLYGON_CONFIG = {
  ORTHO_THRESHOLD: 20,
  MIN_AREA_PIXELS: 16,
  SIMPLIFY_TOLERANCE: 1.2,
};

function extractBuildingPolygons(maskData, width, height, pixelToLatLng) {
  const visited = new Uint8Array(width * height);
  const polygons = [];
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      
      if (maskData[idx] === 1 && visited[idx] === 0) {
        const contour = traceMooreNeighborOptimized(
          maskData, width, height, visited, x, y
        );
        
        if (contour.length > 3) {
          const simplified = simplifyDouglasPeuckerImpl(
            contour, 
            POLYGON_CONFIG.SIMPLIFY_TOLERANCE
          );
          
          const regularized = regularizeBuildingShape(simplified);
          
          if (calculatePolygonArea(regularized) >= POLYGON_CONFIG.MIN_AREA_PIXELS) {
            polygons.push(regularized.map(p => pixelToLatLng(p.x, p.y)));
          }
        }
      }
    }
  }
  
  return polygons;
}

function traceMooreNeighborOptimized(mask, w, h, visited, startX, startY) {
  const contour = [];
  const dirs = [
    {x: 0, y: -1},  {x: 1, y: -1},  {x: 1, y: 0},   {x: 1, y: 1},
    {x: 0, y: 1},   {x: -1, y: 1},  {x: -1, y: 0},  {x: -1, y: -1}
  ];
  
  let x = startX, y = startY;
  let backtrackIdx = 6;
  const startState = { x, y, entryDir: backtrackIdx };
  let iterations = 0;
  const MAX_ITERATIONS = w * h * 2; // Safety limit
  
  do {
    contour.push({ x, y });
    visited[y * w + x] = 1;
    
    let foundNext = false;
    
    for (let i = 0; i < 8; i++) {
      const idx = (backtrackIdx + 1 + i) % 8;
      const nx = x + dirs[idx].x;
      const ny = y + dirs[idx].y;
      
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        if (mask[ny * w + nx] === 1) {
          x = nx;
          y = ny;
          backtrackIdx = (idx + 4) % 8;
          foundNext = true;
          break;
        }
      }
    }
    
    if (!foundNext) break;
    
    iterations++;
    if (iterations > MAX_ITERATIONS) {
      console.warn(`SAFETY: Trace exceeded ${MAX_ITERATIONS} iterations`);
      break;
    }
    
    // Simplified stopping: return to start position after at least 4 points
    if (contour.length > 4 && x === startState.x && y === startState.y) break;
    
  } while (true);
  
  return contour;
}

function simplifyDouglasPeuckerImpl(points, tolerance) {
  if (points.length < 3) return points;
  
  const sqTolerance = tolerance * tolerance;
  
  function simplifyRecursive(pts, first, last) {
    let maxDist = 0;
    let maxIndex = 0;
    
    for (let i = first + 1; i < last; i++) {
      const dist = perpendicularDistanceSq(pts[i], pts[first], pts[last]);
      if (dist > maxDist) {
        maxDist = dist;
        maxIndex = i;
      }
    }
    
    if (maxDist > sqTolerance) {
      const left = simplifyRecursive(pts, first, maxIndex);
      const right = simplifyRecursive(pts, maxIndex, last);
      return left.slice(0, -1).concat(right);
    } else {
      return [pts[first], pts[last]];
    }
  }
  
  return simplifyRecursive(points, 0, points.length - 1);
}

function perpendicularDistanceSq(point, lineStart, lineEnd) {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const mag = dx * dx + dy * dy;
  
  if (mag === 0) {
    return (point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2;
  }
  
  const u = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / mag;
  
  let closestX, closestY;
  if (u < 0) {
    closestX = lineStart.x;
    closestY = lineStart.y;
  } else if (u > 1) {
    closestX = lineEnd.x;
    closestY = lineEnd.y;
  } else {
    closestX = lineStart.x + u * dx;
    closestY = lineStart.y + u * dy;
  }
  
  return (point.x - closestX) ** 2 + (point.y - closestY) ** 2;
}

function regularizeBuildingShape(points) {
  if (points.length < 4) return points;
  
  const angleBins = new Float32Array(90);
  let maxWeight = 0;
  let dominantAngle = 0;
  
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    
    let ang = (Math.atan2(dy, dx) * 180 / Math.PI);
    ang = ((ang + 360) % 90);
    const bin = Math.floor(ang);
    
    angleBins[bin] += len;
    if (angleBins[bin] > maxWeight) {
      maxWeight = angleBins[bin];
      dominantAngle = bin;
    }
  }
  
  const rads = -dominantAngle * (Math.PI / 180);
  const cos = Math.cos(rads);
  const sin = Math.sin(rads);
  
  const rotated = points.map(p => ({
    x: p.x * cos - p.y * sin,
    y: p.x * sin + p.y * cos,
  }));
  
  for (let i = 0; i < rotated.length - 1; i++) {
    const curr = rotated[i];
    const next = rotated[i + 1];
    const dx = Math.abs(next.x - curr.x);
    const dy = Math.abs(next.y - curr.y);
    
    if (dx < dy && dx < POLYGON_CONFIG.SIMPLIFY_TOLERANCE * 2) {
      const avgX = (curr.x + next.x) / 2;
      curr.x = avgX;
      next.x = avgX;
    }
    else if (dy < dx && dy < POLYGON_CONFIG.SIMPLIFY_TOLERANCE * 2) {
      const avgY = (curr.y + next.y) / 2;
      curr.y = avgY;
      next.y = avgY;
    }
  }
  
  const invCos = Math.cos(-rads);
  const invSin = Math.sin(-rads);
  
  return rotated.map(p => ({
    x: p.x * invCos - p.y * invSin,
    y: p.x * invSin + p.y * invCos,
  }));
}

function calculatePolygonArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area / 2);
}

// ============================================================================
// SYNTHETIC TEST SUITE
// ============================================================================

async function runSyntheticTest() {
  console.log("--- STARTING SYNTHETIC RVR TEST ---");
  
  // 1. SETUP: Create a 40x40 grid with a rotated rectangle
  const W = 40, H = 40;
  const mask = new Uint8Array(W * H);
  
  // Draw a diamond shape (rotated square) centered at 20,20
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (Math.abs(x - 20) + Math.abs(y - 20) < 8) {
        mask[y * W + x] = 1;
      }
    }
  }
  
  // 2. MOCK DEPENDENCIES
  const mockPixelToLatLng = (x, y) => ({ lat: y, lng: x });
  
  // 3. EXECUTION
  const t0 = performance.now();
  const polygons = extractBuildingPolygons(mask, W, H, mockPixelToLatLng);
  const t1 = performance.now();
  
  // 4. ASSERTIONS
  console.log(`Execution Time: ${(t1 - t0).toFixed(2)}ms`);
  console.log(`Polygons Found: ${polygons.length}`);
  
  if (polygons.length === 0) {
    console.error("FAIL: No polygons detected.");
    return;
  }
  
  const poly = polygons[0];
  console.log(`Vertex Count (Regularized): ${poly.length}`);
  
  // 5. ORTHOGONALITY CHECK
  let rightAngles = 0;
  for (let i = 0; i < poly.length; i++) {
    const p1 = poly[i];
    const p2 = poly[(i + 1) % poly.length];
    const p3 = poly[(i + 2) % poly.length];
    
    const v1x = p2.lng - p1.lng;
    const v1y = p2.lat - p1.lat;
    const v2x = p3.lng - p2.lng;
    const v2y = p3.lat - p2.lat;
    
    const dot = v1x * v2x + v1y * v2y;
    const mag1 = Math.sqrt(v1x*v1x + v1y*v1y);
    const mag2 = Math.sqrt(v2x*v2x + v2y*v2y);
    const angle = Math.acos(dot / (mag1 * mag2)) * (180/Math.PI);
    
    console.log(`Corner ${i} Angle: ${angle.toFixed(2)}°`);
    
    if (Math.abs(angle - 90) < 5) rightAngles++;
  }
  
  console.log(`Right Angles Detected: ${rightAngles}`);
  
  if (poly.length <= 6 && rightAngles >= 3) {
    console.log("SUCCESS: Algorithm successfully simplified and regularized the shape.");
  } else {
    console.warn("WARNING: Output may still be jagged or over-simplified.");
    console.log("Raw Vertices:", JSON.stringify(poly));
  }
  
  console.log("--- TEST COMPLETE ---");
}

// EXECUTE
runSyntheticTest();
