/**
 * ObstructionSetback.js
 * Generates setback polygons around obstructions (expanding outward)
 */

/**
 * Determine if a polygon is drawn clockwise or counter-clockwise
 * Uses the shoelace formula to calculate signed area
 * @param {Array} path - Array of {lat, lng} points
 * @returns {boolean} True if clockwise, false if counter-clockwise
 */
function isPolygonClockwise(path) {
  let sum = 0;
  for (let i = 0; i < path.length; i++) {
    const current = path[i];
    const next = path[(i + 1) % path.length];
    sum += (next.lng - current.lng) * (next.lat + current.lat);
  }
  return sum > 0;
}

/**
 * Offset a single edge perpendicular to itself
 * @param {Object} p1 - Start point {lat, lng}
 * @param {Object} p2 - End point {lat, lng}
 * @param {number} distance - Offset distance in degrees
 * @param {number} windingMultiplier - 1 for clockwise, -1 for counter-clockwise
 * @returns {Object} {p1: offsetStart, p2: offsetEnd}
 */
function offsetEdge(p1, p2, distance, windingMultiplier) {
  // Calculate edge vector
  const dx = p2.lng - p1.lng;
  const dy = p2.lat - p1.lat;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  if (length === 0) return { p1, p2 };
  
  // Calculate perpendicular vector (outward normal)
  const perpX = windingMultiplier * -dy / length * distance;
  const perpY = windingMultiplier * dx / length * distance;
  
  return {
    p1: { lat: p1.lat + perpY, lng: p1.lng + perpX },
    p2: { lat: p2.lat + perpY, lng: p2.lng + perpX }
  };
}

/**
 * Find intersection of two line segments
 * @param {Object} line1 - {p1: {lat, lng}, p2: {lat, lng}}
 * @param {Object} line2 - {p1: {lat, lng}, p2: {lat, lng}}
 * @returns {Object|null} Intersection point {lat, lng} or null
 */
function lineIntersection(line1, line2) {
  const x1 = line1.p1.lng, y1 = line1.p1.lat;
  const x2 = line1.p2.lng, y2 = line1.p2.lat;
  const x3 = line2.p1.lng, y3 = line2.p1.lat;
  const x4 = line2.p2.lng, y4 = line2.p2.lat;
  
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  
  if (Math.abs(denom) < 1e-10) {
    // Lines are parallel, return midpoint of closest endpoints
    return {
      lat: (line1.p2.lat + line2.p1.lat) / 2,
      lng: (line1.p2.lng + line2.p1.lng) / 2
    };
  }
  
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  
  return {
    lat: y1 + t * (y2 - y1),
    lng: x1 + t * (x2 - x1)
  };
}

/**
 * Generate a setback polygon around an obstruction
 * Unlike building setbacks which go inward, obstruction setbacks expand outward
 * Automatically detects winding order to ensure setback goes outward
 * Uses edge offsetting and intersection method for consistent buffer distance
 * 
 * @param {Array} path - Array of {lat, lng} points defining the obstruction
 * @param {number} setbackDistanceMeters - Distance to expand outward in meters
 * @returns {Array} Array of {lat, lng} points for the setback polygon
 */
export function generateObstructionSetback(path, setbackDistanceMeters) {
  if (!path || path.length < 3) {
    console.error('Invalid path for obstruction setback');
    return [];
  }

  // Detect winding order
  const isClockwise = isPolygonClockwise(path);
  console.log('🔴 Obstruction polygon winding:', isClockwise ? 'CLOCKWISE' : 'COUNTER-CLOCKWISE');
  
  // For outward expansion:
  // - Clockwise polygons: normal to the RIGHT of edge (positive perpendicular)
  // - Counter-clockwise polygons: normal to the LEFT of edge (negative perpendicular)
  const windingMultiplier = isClockwise ? 1 : -1;

  // Convert meters to degrees (approximate)
  // At equator: 1 degree latitude ≈ 111,320 meters
  const avgLat = path.reduce((sum, p) => sum + p.lat, 0) / path.length;
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = metersPerDegreeLat * Math.cos(avgLat * Math.PI / 180);
  
  // Use average of lat/lng conversion for simplicity
  const degreesPerMeter = (1 / metersPerDegreeLat + 1 / metersPerDegreeLng) / 2;
  const offsetDistance = setbackDistanceMeters * degreesPerMeter;

  // Offset each edge
  const offsetEdges = [];
  const numPoints = path.length;
  
  for (let i = 0; i < numPoints; i++) {
    const p1 = path[i];
    const p2 = path[(i + 1) % numPoints];
    offsetEdges.push(offsetEdge(p1, p2, offsetDistance, windingMultiplier));
  }

  // Find intersections of consecutive offset edges
  const expandedPath = [];
  for (let i = 0; i < offsetEdges.length; i++) {
    const currentEdge = offsetEdges[i];
    const nextEdge = offsetEdges[(i + 1) % offsetEdges.length];
    
    // Find intersection of current edge's end with next edge's start
    const intersection = lineIntersection(currentEdge, nextEdge);
    expandedPath.push(intersection);
  }

  return expandedPath;
}

/**
 * Generate setback polygons for all obstructions
 * 
 * @param {Array} obstructions - Array of obstruction objects with path and height
 * @param {number} defaultSetbackFeet - Default setback distance in feet (if not calculated from height)
 * @returns {Array} Array of obstruction objects with setback polygons added
 */
export function generateObstructionSetbacks(obstructions, defaultSetbackFeet = 2) {
  return obstructions.map(obstruction => {
    // For now, use default setback
    // Later, this can be calculated based on obstruction height
    const setbackDistanceMeters = defaultSetbackFeet * 0.3048;
    
    const setbackPath = generateObstructionSetback(obstruction.path, setbackDistanceMeters);
    
    return {
      ...obstruction,
      setbackPath: setbackPath,
      setbackDistanceFeet: defaultSetbackFeet
    };
  });
}

/**
 * Check if a point is inside any obstruction setback
 * 
 * @param {Object} point - {lat, lng} point to check
 * @param {Array} obstructions - Array of obstruction objects with setbackPath
 * @returns {boolean} True if point is inside any obstruction setback
 */
export function isPointInObstructionSetback(point, obstructions) {
  if (!obstructions || obstructions.length === 0) {
    return false;
  }

  // Check each obstruction setback
  for (const obstruction of obstructions) {
    if (!obstruction.setbackPath || obstruction.setbackPath.length < 3) {
      continue;
    }

    // Create a temporary polygon to use Google Maps containsLocation
    const setbackPolygon = new window.google.maps.Polygon({
      paths: obstruction.setbackPath
    });

    const latLng = new window.google.maps.LatLng(point.lat, point.lng);
    const isInside = window.google.maps.geometry.poly.containsLocation(latLng, setbackPolygon);
    
    // Clean up
    setbackPolygon.setMap(null);

    if (isInside) {
      return true;
    }
  }

  return false;
}
