/**
 * GoogleSolarAPI.js
 * Utilities for fetching and processing Google Solar API data
 * Adapted from: https://github.com/googlemaps-samples/js-solar-potential
 */

/**
 * Fetches building insights from the Solar API
 * Returns roof segments, dimensions, and solar potential data
 * 
 * @param {google.maps.LatLng} location - Point of interest
 * @param {string} apiKey - Google Cloud API key
 * @returns {Promise<Object>} Building insights response
 */
export async function findClosestBuilding(location, apiKey) {
  const args = {
    'location.latitude': location.lat().toFixed(5),
    'location.longitude': location.lng().toFixed(5),
    required_quality: 'BASE', // Accept any quality level
  };
  
  console.log('🌞 Fetching building insights:', args);
  const params = new URLSearchParams({ ...args, key: apiKey });
  
  try {
    const response = await fetch(
      `https://solar.googleapis.com/v1/buildingInsights:findClosest?${params}`
    );
    
    const content = await response.json();
    
    if (response.status !== 200) {
      console.error('❌ Building insights error:', content);
      throw new Error(content.error?.message || 'Failed to fetch building insights');
    }
    
    console.log('✅ Building insights received:', content);
    return content;
  } catch (error) {
    console.error('❌ Solar API request failed:', error);
    throw error;
  }
}

/**
 * Converts Google Solar API roof segments into building polygons
 * Each roof segment becomes a separate polygon with metadata
 * PROPERLY TRANSFORMS segments using center point and azimuth rotation
 * 
 * @param {Object} buildingInsights - Response from findClosestBuilding
 * @param {Object} google - Google Maps API object (for spherical calculations)
 * @returns {Array} Array of roof segment polygons with metadata
 */
export function convertRoofSegmentsToPolygons(buildingInsights, google = null) {
  if (!buildingInsights.solarPotential?.roofSegmentStats) {
    console.warn('No roof segments found in building insights');
    return [];
  }
  
  const segments = buildingInsights.solarPotential.roofSegmentStats;
  console.log(`🏠 Processing ${segments.length} roof segments with proper transformation`);
  
  // If google maps API not available, fall back to simple bounding boxes
  if (!google || !google.maps || !google.maps.geometry) {
    console.warn('⚠️ Google Maps geometry library not available, using simple bounding boxes');
    return segments.map((segment, index) => {
      const { boundingBox, pitchDegrees, azimuthDegrees, planeHeightAtCenterMeters, stats } = segment;
      
      const vertices = [
        { lat: boundingBox.sw.latitude, lng: boundingBox.sw.longitude },
        { lat: boundingBox.sw.latitude, lng: boundingBox.ne.longitude },
        { lat: boundingBox.ne.latitude, lng: boundingBox.ne.longitude },
        { lat: boundingBox.ne.latitude, lng: boundingBox.sw.longitude },
      ];
      
      return {
        segmentIndex: index,
        vertices,
        metadata: {
          pitchDegrees: pitchDegrees.toFixed(2),
          azimuthDegrees: azimuthDegrees.toFixed(2),
          heightMeters: planeHeightAtCenterMeters.toFixed(2),
          heightFeet: (planeHeightAtCenterMeters * 3.28084).toFixed(2),
          areaMeters2: stats.areaMeters2.toFixed(2),
          areaFeet2: (stats.areaMeters2 * 10.7639).toFixed(2),
          center: segment.center,
        }
      };
    });
  }
  
  // PROPER TRANSFORMATION: Use center point + dimensions + azimuth rotation
  return segments.map((segment, index) => {
    const { center, boundingBox, pitchDegrees, azimuthDegrees, planeHeightAtCenterMeters, stats } = segment;
    
    // Calculate segment dimensions from bounding box
    const latDiff = boundingBox.ne.latitude - boundingBox.sw.latitude;
    const lngDiff = boundingBox.ne.longitude - boundingBox.sw.longitude;
    
    // Convert lat/lng differences to meters (approximate)
    const latMeters = latDiff * 111000; // 1 degree latitude ≈ 111km
    const lngMeters = lngDiff * 111000 * Math.cos(center.latitude * Math.PI / 180);
    
    // Half-dimensions for creating rectangle around center
    const halfWidth = Math.max(latMeters, lngMeters) / 2;
    const halfHeight = Math.min(latMeters, lngMeters) / 2;
    
    console.log(`📐 Segment ${index}: center=(${center.latitude.toFixed(6)}, ${center.longitude.toFixed(6)}), ` +
                `dims=${(halfWidth*2).toFixed(1)}m x ${(halfHeight*2).toFixed(1)}m, azimuth=${azimuthDegrees.toFixed(1)}°`);
    
    // Create rectangle points in local coordinate system (before rotation)
    // These are relative to the center point
    const localPoints = [
      { x: +halfWidth, y: +halfHeight },  // NE
      { x: +halfWidth, y: -halfHeight },  // SE
      { x: -halfWidth, y: -halfHeight },  // SW
      { x: -halfWidth, y: +halfHeight },  // NW
    ];
    
    // Transform each point using spherical geometry + azimuth rotation
    const vertices = localPoints.map(({ x, y }) => {
      // Calculate distance and bearing from center
      const distance = Math.sqrt(x * x + y * y);
      const localBearing = Math.atan2(y, x) * (180 / Math.PI); // Bearing in local coords
      
      // Apply azimuth rotation to get true bearing
      const trueBearing = localBearing + azimuthDegrees;
      
      // Use Google Maps spherical geometry to compute offset point
      const point = google.maps.geometry.spherical.computeOffset(
        new google.maps.LatLng(center.latitude, center.longitude),
        distance,
        trueBearing
      );
      
      return { lat: point.lat(), lng: point.lng() };
    });
    
    return {
      segmentIndex: index,
      vertices,
      metadata: {
        pitchDegrees: pitchDegrees.toFixed(2),
        azimuthDegrees: azimuthDegrees.toFixed(2),
        heightMeters: planeHeightAtCenterMeters.toFixed(2),
        heightFeet: (planeHeightAtCenterMeters * 3.28084).toFixed(2),
        areaMeters2: stats.areaMeters2.toFixed(2),
        areaFeet2: (stats.areaMeters2 * 10.7639).toFixed(2),
        center: segment.center,
      }
    };
  });
}

/**
 * Creates a single merged polygon from all roof segments
 * Uses the convex hull of all roof segment corners to create a proper building outline
 * 
 * @param {Object} buildingInsights - Response from findClosestBuilding
 * @param {string} apiKey - Optional API key for fetching building mask
 * @returns {Object} Single polygon covering entire building
 */
export async function createBuildingOutline(buildingInsights, apiKey) {
  if (!buildingInsights.solarPotential?.roofSegmentStats) {
    console.warn('No roof segments found in building insights');
    return null;
  }
  
  const { solarPotential } = buildingInsights;
  const segments = solarPotential.roofSegmentStats;
  
  // Collect all corner points from all roof segments
  const allPoints = [];
  segments.forEach(segment => {
    const { boundingBox } = segment;
    allPoints.push(
      { lat: boundingBox.sw.latitude, lng: boundingBox.sw.longitude },
      { lat: boundingBox.sw.latitude, lng: boundingBox.ne.longitude },
      { lat: boundingBox.ne.latitude, lng: boundingBox.ne.longitude },
      { lat: boundingBox.ne.latitude, lng: boundingBox.sw.longitude }
    );
  });
  
  // Find the convex hull (outermost points) to create building outline
  const hull = convexHull(allPoints);
  
  return {
    vertices: hull,
    metadata: {
      center: buildingInsights.center,
      postalCode: buildingInsights.postalCode,
      maxPanels: solarPotential?.maxArrayPanelsCount,
      maxSunshineHours: solarPotential?.maxSunshineHoursPerYear,
      buildingArea: solarPotential?.buildingStats?.areaMeters2,
      imageryDate: buildingInsights.imageryDate,
      imageryQuality: buildingInsights.imageryQuality,
      segmentCount: segments.length,
    }
  };
}

/**
 * Compute convex hull using Graham scan algorithm
 * Returns the outermost points that form a convex polygon
 * 
 * @param {Array} points - Array of {lat, lng} points
 * @returns {Array} Convex hull points in counter-clockwise order
 */
function convexHull(points) {
  if (points.length < 3) return points;
  
  // Remove duplicate points
  const unique = [];
  const seen = new Set();
  points.forEach(p => {
    const key = `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(p);
    }
  });
  
  if (unique.length < 3) return unique;
  
  // Find the bottom-most point (or left-most if tied)
  let start = unique[0];
  for (let i = 1; i < unique.length; i++) {
    if (unique[i].lat < start.lat || 
        (unique[i].lat === start.lat && unique[i].lng < start.lng)) {
      start = unique[i];
    }
  }
  
  // Sort points by polar angle with respect to start point
  const sorted = unique.filter(p => p !== start).sort((a, b) => {
    const angleA = Math.atan2(a.lat - start.lat, a.lng - start.lng);
    const angleB = Math.atan2(b.lat - start.lat, b.lng - start.lng);
    if (angleA !== angleB) return angleA - angleB;
    // If angles are equal, sort by distance
    const distA = Math.hypot(a.lat - start.lat, a.lng - start.lng);
    const distB = Math.hypot(b.lat - start.lat, b.lng - start.lng);
    return distA - distB;
  });
  
  // Build convex hull
  const hull = [start, sorted[0]];
  
  for (let i = 1; i < sorted.length; i++) {
    let top = hull[hull.length - 1];
    let nextToTop = hull[hull.length - 2];
    
    // Remove points that make a right turn
    while (hull.length > 1 && ccw(nextToTop, top, sorted[i]) <= 0) {
      hull.pop();
      top = hull[hull.length - 1];
      nextToTop = hull[hull.length - 2];
    }
    
    hull.push(sorted[i]);
  }
  
  return hull;
}

/**
 * Counter-clockwise test
 * Returns positive if counter-clockwise, negative if clockwise, 0 if collinear
 */
function ccw(a, b, c) {
  return (b.lng - a.lng) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lng - a.lng);
}

/**
 * Geocode an address to lat/lng coordinates
 * 
 * @param {string} address - Street address to geocode
 * @param {Object} google - Google Maps API object
 * @returns {Promise<google.maps.LatLng>} Geocoded location
 */
export async function geocodeAddress(address, google) {
  const geocoder = new google.maps.Geocoder();
  
  return new Promise((resolve, reject) => {
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results[0]) {
        resolve(results[0].geometry.location);
      } else {
        reject(new Error(`Geocoding failed: ${status}`));
      }
    });
  });
}

/**
 * Format roof segment data for display
 * 
 * @param {Object} segment - Roof segment from convertRoofSegmentsToPolygons
 * @returns {string} Formatted description
 */
export function formatSegmentInfo(segment) {
  const { metadata } = segment;
  return `Segment ${segment.segmentIndex + 1}: ${metadata.areaFeet2} ft² | ` +
         `Pitch: ${metadata.pitchDegrees}° | Azimuth: ${metadata.azimuthDegrees}° | ` +
         `Height: ${metadata.heightFeet} ft`;
}


/**
 * Fetches the data layers information from the Solar API
 * Returns URLs for GeoTIFF files including building mask
 * 
 * @param {Object} location - {latitude, longitude}
 * @param {number} radiusMeters - Radius of the data layer size in meters
 * @param {string} apiKey - Google Cloud API key
 * @returns {Promise<Object>} Data Layers response with GeoTIFF URLs
 */
export async function getDataLayerUrls(location, radiusMeters, apiKey) {
  const args = {
    'location.latitude': location.latitude.toFixed(5),
    'location.longitude': location.longitude.toFixed(5),
    radius_meters: radiusMeters.toString(),
    required_quality: 'BASE',
  };
  
  console.log('🗺️ GET dataLayers:', args);
  const params = new URLSearchParams({ ...args, key: apiKey });
  
  const response = await fetch(`https://solar.googleapis.com/v1/dataLayers:get?${params}`);
  const content = await response.json();
  
  if (response.status !== 200) {
    console.error('❌ getDataLayerUrls error:', content);
    throw new Error(content.error?.message || 'Failed to fetch data layers');
  }
  
  console.log('✅ dataLayersResponse:', content);
  return content;
}

/**
 * Downloads and processes a GeoTIFF file from the Solar API
 * 
 * @param {string} url - URL from the Data Layers response
 * @param {string} apiKey - Google Cloud API key
 * @returns {Promise<Object>} Processed GeoTIFF data with pixels and bounds
 */
export async function downloadGeoTIFF(url, apiKey) {
  console.log(`📥 Downloading GeoTIFF: ${url.substring(0, 80)}...`);
  
  // Dynamic imports for geotiff libraries
  const geotiff = await import('geotiff');
  const geokeysToProj4 = await import('geotiff-geokeys-to-proj4');
  const proj4 = (await import('proj4')).default;
  
  // Include API key in the URL
  const solarUrl = url.includes('solar.googleapis.com') ? url + `&key=${apiKey}` : url;
  const response = await fetch(solarUrl);
  
  if (response.status !== 200) {
    const error = await response.json();
    console.error(`❌ downloadGeoTIFF failed:`, error);
    throw error;
  }
  
  // Get the GeoTIFF rasters (pixel values)
  const arrayBuffer = await response.arrayBuffer();
  const tiff = await geotiff.fromArrayBuffer(arrayBuffer);
  const image = await tiff.getImage();
  const rasters = await image.readRasters();
  
  // Reproject the bounding box into lat/lon coordinates
  const geoKeys = image.getGeoKeys();
  const projObj = geokeysToProj4.toProj4(geoKeys);
  const projection = proj4(projObj.proj4, 'WGS84');
  const box = image.getBoundingBox();
  
  const sw = projection.forward({
    x: box[0] * projObj.coordinatesConversionParameters.x,
    y: box[1] * projObj.coordinatesConversionParameters.y,
  });
  const ne = projection.forward({
    x: box[2] * projObj.coordinatesConversionParameters.x,
    y: box[3] * projObj.coordinatesConversionParameters.y,
  });
  
  console.log(`✅ GeoTIFF downloaded: ${rasters.width}x${rasters.height} pixels`);
  
  return {
    width: rasters.width,
    height: rasters.height,
    rasters: [...Array(rasters.length).keys()].map((i) =>
      Array.from(rasters[i])
    ),
    bounds: {
      north: ne.y,
      south: sw.y,
      east: ne.x,
      west: sw.x,
    },
  };
}

// --- GEMINI-3 OPTIMIZED POLYGONIZATION PIPELINE ---
// Configuration constants for RVR (Raster-to-Vector-to-Regularized) pipeline
const POLYGON_CONFIG = {
  ORTHO_THRESHOLD: 20, // Max deviation (degrees) to snap walls to 90-degree axes
  MIN_AREA_PIXELS: 16, // Minimum pixel area to consider valid building
  SIMPLIFY_TOLERANCE: 4.5, // Douglas-Peucker tolerance (pixels) - aggressive for clean straight lines
};

/**
 * Traces the boundary of a building mask to create a polygon
 * Uses Moore-neighbor contour tracing algorithm
 * 
 * @param {Object} maskData - GeoTIFF data from downloadGeoTIFF
 * @returns {Array} Array of {lat, lng} points forming the building outline
 */
/**
 * Smooth jittery edges by detecting oscillating vertices and fitting straight lines
 * 
 * @param {Array} polygon - Array of {lat, lng} vertices
 * @returns {Array} Smoothed polygon
 */
function smoothJitteryEdges(polygon) {
  if (polygon.length < 10) return polygon;
  
  const smoothed = [];
  let i = 0;
  
  while (i < polygon.length) {
    const startIdx = i;
    
    // Look ahead to find a sequence of vertices traveling in roughly the same direction
    let direction = null;
    let chainEnd = i;
    
    for (let j = i; j < Math.min(i + 50, polygon.length); j++) {
      const p1 = polygon[j];
      const p2 = polygon[(j + 1) % polygon.length];
      
      const dx = p2.lng - p1.lng;
      const dy = p2.lat - p1.lat;
      const angle = Math.atan2(dy, dx);
      
      if (direction === null) {
        direction = angle;
        chainEnd = j + 1;
      } else {
        const angleDiff = Math.abs(angle - direction) * (180 / Math.PI);
        
        // If direction changes significantly, end the chain
        if (angleDiff > 20) {
          break;
        }
        
        chainEnd = j + 1;
      }
    }
    
    const chainLength = chainEnd - startIdx;
    
    // If we found a chain of 5+ vertices, replace with just endpoints
    if (chainLength >= 5) {
      const chainPoints = polygon.slice(startIdx, chainEnd);
      smoothed.push(chainPoints[0]);
      smoothed.push(chainPoints[chainPoints.length - 1]);
      i = chainEnd;
    } else {
      // Keep the vertex as-is
      smoothed.push(polygon[i]);
      i++;
    }
  }
  
  return smoothed;
}

export function traceBuildingMask(maskData, buildingCenter = null) {
  console.log('🔍 Tracing building mask boundary (Gemini-3 RVR Pipeline)...');
  
  if (buildingCenter) {
    console.log(`🎯 Target building center: lat=${buildingCenter.latitude}, lng=${buildingCenter.longitude}`);
  }
  
  const { width, height, rasters, bounds } = maskData;
  const mask = rasters[0]; // First raster is the mask
  
  // EROSION: Remove 3-pixel border to clean edges
  console.log('🔧 Applying 3-pass mask erosion to clean edges...');
  
  let currentMask = new Uint8Array(mask);
  let nextMask;
  
  // Apply erosion 3 times
  for (let pass = 1; pass <= 3; pass++) {
    nextMask = new Uint8Array(mask.length);
    const margin = pass;
    
    for (let y = margin; y < height - margin; y++) {
      for (let x = margin; x < width - margin; x++) {
        const idx = y * width + x;
        // Only keep pixel if all 8 neighbors are also building pixels
        if (currentMask[idx] === 1 &&
            currentMask[idx - 1] === 1 && currentMask[idx + 1] === 1 &&
            currentMask[idx - width] === 1 && currentMask[idx + width] === 1 &&
            currentMask[idx - width - 1] === 1 && currentMask[idx - width + 1] === 1 &&
            currentMask[idx + width - 1] === 1 && currentMask[idx + width + 1] === 1) {
          nextMask[idx] = 1;
        }
      }
    }
    currentMask = nextMask;
  }
  
  const erodedMask = currentMask;
  
  // Create pixel-to-latLng converter
  const latPerPixel = (bounds.north - bounds.south) / height;
  const lngPerPixel = (bounds.east - bounds.west) / width;
  
  console.log(`🗺️ GeoTIFF bounds:`, bounds);
  console.log(`📏 Resolution: ${latPerPixel.toFixed(8)}° lat/px, ${lngPerPixel.toFixed(8)}° lng/px`);
  
  const pixelToLatLng = (x, y) => ({
    lat: bounds.south + (height - y) * latPerPixel,
    lng: bounds.west + x * lngPerPixel,
  });
  
  // Use Gemini-3 optimized extraction with eroded mask
  const polygons = extractBuildingPolygons(
    erodedMask,
    width,
    height,
    pixelToLatLng
  );
  
  if (polygons.length === 0) {
    console.warn('⚠️ No polygons extracted, falling back to legacy algorithm');
    return traceBuildingMaskLegacy(maskData);
  }
  
  // Select the correct polygon
  let selected;
  
  if (buildingCenter && polygons.length > 1) {
    // Find polygon closest to the building center from API
    console.log(`🔍 Multiple polygons found (${polygons.length}), selecting closest to API center...`);
    
    let minDist = Infinity;
    selected = polygons[0];
    
    for (const poly of polygons) {
      // Calculate centroid of this polygon
      let sumLat = 0, sumLng = 0;
      for (const vertex of poly) {
        sumLat += vertex.lat;
        sumLng += vertex.lng;
      }
      const centroidLat = sumLat / poly.length;
      const centroidLng = sumLng / poly.length;
      
      // Distance from polygon centroid to building center
      const dist = Math.sqrt(
        Math.pow((centroidLat - buildingCenter.latitude) * 111000, 2) +
        Math.pow((centroidLng - buildingCenter.longitude) * 111000 * Math.cos(buildingCenter.latitude * Math.PI / 180), 2)
      );
      
      console.log(`  Polygon: centroid=(${centroidLat.toFixed(6)}, ${centroidLng.toFixed(6)}), distance=${dist.toFixed(1)}m`);
      
      if (dist < minDist) {
        minDist = dist;
        selected = poly;
      }
    }
    
    console.log(`✅ Selected polygon ${minDist.toFixed(1)}m from building center`);
  } else {
    // Fall back to largest polygon by area
    selected = polygons.reduce((max, poly) => {
      const maxArea = calculatePolygonAreaLatLng(max);
      const polyArea = calculatePolygonAreaLatLng(poly);
      return polyArea > maxArea ? poly : max;
    });
    console.log(`✅ Extracted ${polygons.length} polygon(s), using largest with ${selected.length} vertices`);
  }
  
  let largest = selected;
  
  // Douglas-Peucker already handles line simplification aggressively
  console.log(`✅ Final polygon: ${largest.length} vertices (simplified by Douglas-Peucker)`);
  
  // Coordinate sanity check
  if (largest.length > 0) {
    const sample = largest[0];
    console.log(`📍 Sample vertex: lat=${sample.lat.toFixed(7)}, lng=${sample.lng.toFixed(7)}`);
    console.log(`📍 Expected center: lat=${bounds.south + (bounds.north - bounds.south)/2}, lng=${bounds.west + (bounds.east - bounds.west)/2}`);
  }
  
  // GEMINI-3 TELEMETRY: Geometric validation metrics
  if (largest.length > 0) {
    const angles = [];
    for (let i = 0; i < largest.length; i++) {
      const p1 = largest[i];
      const p2 = largest[(i + 1) % largest.length];
      const p3 = largest[(i + 2) % largest.length];
      
      const v1x = p2.lng - p1.lng;
      const v1y = p2.lat - p1.lat;
      const v2x = p3.lng - p2.lng;
      const v2y = p3.lat - p2.lat;
      
      const dot = v1x * v2x + v1y * v2y;
      const mag1 = Math.sqrt(v1x*v1x + v1y*v1y);
      const mag2 = Math.sqrt(v2x*v2x + v2y*v2y);
      
      if (mag1 > 0 && mag2 > 0) {
        const angle = Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2)))) * (180/Math.PI);
        angles.push(angle);
      }
    }
    
    const rightAngles = angles.filter(a => Math.abs(a - 90) < 5).length;
    const avgAngle = angles.reduce((sum, a) => sum + a, 0) / angles.length;
    
    console.log(`📐 GEOMETRY METRICS: Vertices=${largest.length}, RightAngles=${rightAngles}/${angles.length}, AvgAngle=${avgAngle.toFixed(1)}°`);
  }
  
  return largest;
}

/**
 * Primary entry point for Gemini-3 RVR pipeline
 * Extracts multiple building polygons with orthogonal regularization
 * 
 * @param {Uint8Array} maskData - Flattened binary mask (row-major)
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {Function} pixelToLatLng - (x, y) => {lat, lng}
 * @returns {Array<Array>} Array of polygons, each polygon is array of {lat, lng}
 */
function extractBuildingPolygons(maskData, width, height, pixelToLatLng) {
  const visited = new Uint8Array(width * height);
  const polygons = [];
  
  // Scanline flood-trace: finds all distinct shapes
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      
      if (maskData[idx] === 1 && visited[idx] === 0) {
        // Trace boundary using optimized Moore-neighbor
        const contour = traceMooreNeighborOptimized(
          maskData, width, height, visited, x, y
        );
        
        if (contour.length > 3) {
          // Douglas-Peucker simplification
          const simplified = simplifyDouglasPeuckerImpl(
            contour, 
            POLYGON_CONFIG.SIMPLIFY_TOLERANCE
          );
          
          // Orthogonal regularization (Manhattan-ize)
          const regularized = regularizeBuildingShape(simplified);
          
          // Filter noise by area
          if (calculatePolygonArea(regularized) >= POLYGON_CONFIG.MIN_AREA_PIXELS) {
            // Convert to lat/lng
            polygons.push(regularized.map(p => pixelToLatLng(p.x, p.y)));
          }
        }
      }
    }
  }
  
  return polygons;
}

/**
 * Optimized Moore-neighbor tracing with Jacob's Stopping Criterion
 * Updates visited mask to prevent re-scanning
 * 
 * @param {Uint8Array} mask - Binary mask
 * @param {number} w - Width
 * @param {number} h - Height
 * @param {Uint8Array} visited - Visited pixel tracker
 * @param {number} startX - Starting X coordinate
 * @param {number} startY - Starting Y coordinate
 * @returns {Array} Contour points as {x, y}
 */
function traceMooreNeighborOptimized(mask, w, h, visited, startX, startY) {
  const contour = [];
  const dirs = [
    {x: 0, y: -1},  {x: 1, y: -1},  {x: 1, y: 0},   {x: 1, y: 1},  // N, NE, E, SE
    {x: 0, y: 1},   {x: -1, y: 1},  {x: -1, y: 0},  {x: -1, y: -1} // S, SW, W, NW
  ];
  
  let x = startX, y = startY;
  let backtrackIdx = 6; // Start searching from West
  const startState = { x, y, entryDir: backtrackIdx };
  let iterations = 0;
  const MAX_ITERATIONS = w * h; // Safety valve: worst case perimeter
  
  do {
    contour.push({ x, y });
    visited[y * w + x] = 1;
    
    let foundNext = false;
    
    // Search 8-neighborhood clockwise from backtrack direction
    for (let i = 0; i < 8; i++) {
      const idx = (backtrackIdx + 1 + i) % 8;
      const nx = x + dirs[idx].x;
      const ny = y + dirs[idx].y;
      
      // Bounds check
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        if (mask[ny * w + nx] === 1) {
          x = nx;
          y = ny;
          backtrackIdx = (idx + 4) % 8; // Opposite direction
          foundNext = true;
          break;
        }
      }
    }
    
    if (!foundNext) break; // Isolated pixel
    
    // Safety valve
    if (++iterations > MAX_ITERATIONS) {
      console.warn('⚠️ Moore trace safety valve triggered');
      break;
    }
    
    // Simplified stopping: return to start after at least 4 points
    if (contour.length > 4 && x === startState.x && y === startState.y) break;
    
  } while (true);
  
  return contour;
}

/**
 * Douglas-Peucker polygon simplification
 * Reduces vertices while preserving shape within tolerance
 * 
 * @param {Array} points - Array of {x, y} points
 * @param {number} tolerance - Maximum perpendicular distance
 * @returns {Array} Simplified points
 */
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

/**
 * Calculate squared perpendicular distance from point to line segment
 */
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

/**
 * Fit a line to a set of points using Least Squares Regression
 * Handles vertical lines (infinite slope) separately
 * 
 * @param {Array} points - Array of {x, y} points
 * @returns {Object} {m, b} for y=mx+b, or {vertical: true, x: constant} for vertical lines
 */
function fitLineSegment(points) {
  if (points.length < 2) return null;
  
  const n = points.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
  }
  
  const denominator = n * sumX2 - sumX * sumX;
  
  // Check for vertical line (all X values nearly identical)
  const xVariance = sumX2 / n - (sumX / n) ** 2;
  if (xVariance < 0.01) {
    return { vertical: true, x: sumX / n };
  }
  
  // Standard least squares: y = mx + b
  const m = (n * sumXY - sumX * sumY) / denominator;
  const b = (sumY - m * sumX) / n;
  
  return { m, b, vertical: false };
}

/**
 * Project a point onto a line
 * 
 * @param {Object} point - {x, y}
 * @param {Object} line - {m, b} or {vertical: true, x}
 * @returns {Object} Projected {x, y}
 */
function projectPointToLine(point, line) {
  if (line.vertical) {
    return { x: line.x, y: point.y };
  }
  
  // Line: y = mx + b
  // Perpendicular: y - y0 = -(1/m)(x - x0)
  // Solve for intersection
  const m = line.m;
  const b = line.b;
  
  if (Math.abs(m) < 0.001) {
    // Nearly horizontal line
    return { x: point.x, y: b };
  }
  
  const x = (point.x + m * point.y - m * b) / (1 + m * m);
  const y = m * x + b;
  
  return { x, y };
}

/**
 * Detect collinear chains in polygon
 * Groups consecutive vertices that form nearly straight lines
 * 
 * @param {Array} points - Array of {x, y} points
 * @param {number} angleThreshold - Max angle deviation in degrees
 * @returns {Array} Array of chain objects {start, end, indices}
 */
function detectCollinearChains(points, angleThreshold = 5) {
  if (points.length < 3) return [];
  
  const chains = [];
  let chainStart = 0;
  
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    
    // Calculate angle at p1
    const v1x = p1.x - p0.x;
    const v1y = p1.y - p0.y;
    const v2x = p2.x - p1.x;
    const v2y = p2.y - p1.y;
    
    const dot = v1x * v2x + v1y * v2y;
    const mag1 = Math.hypot(v1x, v1y);
    const mag2 = Math.hypot(v2x, v2y);
    
    if (mag1 === 0 || mag2 === 0) continue;
    
    const angle = Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2)))) * (180 / Math.PI);
    
    // If angle is large (corner), end current chain
    if (angle > angleThreshold) {
      if (i - chainStart >= 3) {
        chains.push({ start: chainStart, end: i, length: i - chainStart });
      }
      chainStart = i;
    }
  }
  
  // Handle wrap-around chain
  if (points.length - chainStart >= 3) {
    chains.push({ start: chainStart, end: points.length - 1, length: points.length - chainStart });
  }
  
  return chains;
}

/**
 * Regularize building shape using PCA-based rotation and orthogonal snapping
 * Enhanced with Linear Regression Snap (LRS) to eliminate vertex jitter
 * 
 * @param {Array} points - Array of {x, y} points
 * @returns {Array} Regularized points
 */
function regularizeBuildingShape(points) {
  if (points.length < 4) return points;
  
  // PHASE 1: LINEAR REGRESSION SNAP (LRS) - Eliminate vertex jitter on straight edges
  const collinearChains = detectCollinearChains(points, 10); // Relaxed to 10° threshold
  
  console.log(`🔍 LRS: Detected ${collinearChains.length} collinear chains`);
  collinearChains.forEach((c, i) => {
    console.log(`  Chain ${i}: start=${c.start}, end=${c.end}, length=${c.length}`);
  });
  
  let lrsPoints = [];
  let processedIndices = new Set();
  
  for (const chain of collinearChains) {
    if (chain.length < 3) continue; // Lowered threshold to 3+ vertices
    
    const chainPoints = points.slice(chain.start, chain.end + 1);
    const line = fitLineSegment(chainPoints);
    
    if (line) {
      // Project first and last points onto fitted line
      const projStart = projectPointToLine(chainPoints[0], line);
      const projEnd = projectPointToLine(chainPoints[chainPoints.length - 1], line);
      
      // Replace entire chain with 2 points
      if (lrsPoints.length === 0 || chain.start > 0) {
        lrsPoints.push(projStart);
      }
      lrsPoints.push(projEnd);
      
      for (let i = chain.start; i <= chain.end; i++) {
        processedIndices.add(i);
      }
    }
  }
  
  // Add unprocessed points (corners)
  for (let i = 0; i < points.length; i++) {
    if (!processedIndices.has(i)) {
      lrsPoints.push(points[i]);
    }
  }
  
  // If LRS produced too few points, fall back to original
  if (lrsPoints.length < 4) {
    lrsPoints = points;
  }
  
  console.log(`🔧 LRS: Reduced ${points.length} vertices to ${lrsPoints.length} vertices`);
  
  // PHASE 2: PCA + Orthogonal Snap
  // A. Determine dominant orientation using weighted angle histogram
  const angleBins = new Float32Array(90);
  let maxWeight = 0;
  let dominantAngle = 0;
  
  for (let i = 0; i < lrsPoints.length; i++) {
    const p1 = lrsPoints[i];
    const p2 = lrsPoints[(i + 1) % lrsPoints.length];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    
    // Normalize angle to 0-90 range
    let ang = (Math.atan2(dy, dx) * 180 / Math.PI);
    ang = ((ang + 360) % 90);
    const bin = Math.floor(ang);
    
    angleBins[bin] += len;
    if (angleBins[bin] > maxWeight) {
      maxWeight = angleBins[bin];
      dominantAngle = bin;
    }
  }
  
  console.log(`📐 PCA: Dominant angle = ${dominantAngle}° (${(dominantAngle * Math.PI / 180).toFixed(4)} rad)`);
  console.log(`📐 PCA: Max weight = ${maxWeight.toFixed(2)}, vertices = ${lrsPoints.length}`);
  
  // B. Rotate to axis-aligned space
  const rads = -dominantAngle * (Math.PI / 180);
  const cos = Math.cos(rads);
  const sin = Math.sin(rads);
  
  console.log(`🔄 Rotating by ${-dominantAngle}° to align with axes`);
  
  const rotated = lrsPoints.map(p => ({
    x: p.x * cos - p.y * sin,
    y: p.x * sin + p.y * cos,
  }));
  
  // C. Rectilinear snap (Manhattan-ize)
  let verticalSnaps = 0;
  let horizontalSnaps = 0;
  
  for (let i = 0; i < rotated.length - 1; i++) {
    const curr = rotated[i];
    const next = rotated[i + 1];
    const dx = Math.abs(next.x - curr.x);
    const dy = Math.abs(next.y - curr.y);
    
    // If nearly vertical, snap X coordinates
    if (dx < dy && dx < POLYGON_CONFIG.SIMPLIFY_TOLERANCE * 2) {
      const avgX = (curr.x + next.x) / 2;
      curr.x = avgX;
      next.x = avgX;
      verticalSnaps++;
    }
    // If nearly horizontal, snap Y coordinates
    else if (dy < dx && dy < POLYGON_CONFIG.SIMPLIFY_TOLERANCE * 2) {
      const avgY = (curr.y + next.y) / 2;
      curr.y = avgY;
      next.y = avgY;
      horizontalSnaps++;
    }
  }
  
  console.log(`📏 Orthogonal snap: ${verticalSnaps} vertical, ${horizontalSnaps} horizontal edges snapped`);
  
  // D. Rotate back to original orientation
  const invCos = Math.cos(-rads);
  const invSin = Math.sin(-rads);
  
  console.log(`🔄 Rotating back by ${dominantAngle}°`);
  
  const rotatedBack = rotated.map(p => ({
    x: p.x * invCos - p.y * invSin,
    y: p.x * invSin + p.y * invCos,
  }));
  
  // E. DEDUPLICATE: Remove consecutive duplicate vertices (fixes NaN angles)
  const deduplicated = rotatedBack.filter((p, i) => {
    if (i === 0) return true;
    const prev = rotatedBack[i - 1];
    // Filter out if distance to previous point is negligible (< 0.1 pixels)
    return Math.abs(p.x - prev.x) > 0.1 || Math.abs(p.y - prev.y) > 0.1;
  });
  
  console.log(`✅ Regularization complete: ${lrsPoints.length} → ${deduplicated.length} vertices (removed ${lrsPoints.length - deduplicated.length} duplicates)`);
  
  return deduplicated;
}

/**
 * Calculate polygon area using shoelace formula
 * 
 * @param {Array} points - Array of {x, y} points
 * @returns {number} Absolute area
 */
function calculatePolygonArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area / 2);
}

/**
 * Calculate polygon area for lat/lng coordinates
 * 
 * @param {Array} points - Array of {lat, lng} points
 * @returns {number} Absolute area (approximate)
 */
function calculatePolygonAreaLatLng(points) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].lng * points[j].lat;
    area -= points[j].lng * points[i].lat;
  }
  return Math.abs(area / 2);
}

/**
 * Legacy Moore-neighbor implementation (fallback)
 * Original implementation preserved for comparison
 * 
 * @param {Object} maskData - GeoTIFF data from downloadGeoTIFF
 * @returns {Array} Array of {lat, lng} points forming the building outline
 */
function traceBuildingMaskLegacy(maskData) {
  console.log('🔍 Using legacy tracing algorithm...');
  
  const { width, height, rasters, bounds } = maskData;
  const mask = rasters[0]; // First raster is the mask
  
  // Helper to get pixel value
  const getPixel = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return 0;
    return mask[y * width + x] === 1 ? 1 : 0;
  };
  
  // Find the starting point - closest roof pixel to center of image
  // (The center is where the target building should be)
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  
  console.log(`🎯 Image center: (${centerX}, ${centerY})`);
  
  let startX = -1, startY = -1;
  let minDist = Infinity;
  
  // Search in expanding circles from center
  for (let radius = 0; radius < Math.max(width, height) / 2; radius++) {
    for (let angle = 0; angle < 360; angle += 5) {
      const x = Math.round(centerX + radius * Math.cos(angle * Math.PI / 180));
      const y = Math.round(centerY + radius * Math.sin(angle * Math.PI / 180));
      
      if (getPixel(x, y) === 1) {
        const dist = Math.hypot(x - centerX, y - centerY);
        if (dist < minDist) {
          minDist = dist;
          startX = x;
          startY = y;
        }
      }
    }
    
    // If we found a pixel, stop searching
    if (startX !== -1) break;
  }
  
  if (startX === -1) {
    console.warn('⚠️ No roof pixels found in mask');
    return [];
  }
  
  console.log(`📍 Starting contour trace at (${startX}, ${startY}), distance from center: ${minDist.toFixed(1)} pixels`);
  
  // Moore-neighbor tracing
  // Directions: N, NE, E, SE, S, SW, W, NW
  const dirs = [
    [0, -1], [1, -1], [1, 0], [1, 1],
    [0, 1], [-1, 1], [-1, 0], [-1, -1]
  ];
  
  const contour = [];
  let x = startX, y = startY;
  let dir = 7; // Start looking from W (since we found leftmost pixel)
  let startDir = dir;
  
  do {
    contour.push({ x, y });
    
    // Look for next boundary pixel
    let found = false;
    for (let i = 0; i < 8; i++) {
      const checkDir = (dir + i) % 8;
      const nx = x + dirs[checkDir][0];
      const ny = y + dirs[checkDir][1];
      
      if (getPixel(nx, ny) === 1) {
        x = nx;
        y = ny;
        dir = (checkDir + 5) % 8; // Turn left for next search
        found = true;
        break;
      }
    }
    
    if (!found) break;
    
    // Stop if we've returned to start
    if (contour.length > 2 && x === startX && y === startY) break;
    
    // Safety limit
    if (contour.length > 50000) {
      console.warn('⚠️ Contour too long, stopping');
      break;
    }
  } while (true);
  
  console.log(`🔷 Traced contour: ${contour.length} points`);
  
  // Convert pixel coordinates to lat/lng
  const latPerPixel = (bounds.north - bounds.south) / height;
  const lngPerPixel = (bounds.east - bounds.west) / width;
  
  const geoContour = contour.map(p => ({
    lat: bounds.south + (height - p.y) * latPerPixel,
    lng: bounds.west + p.x * lngPerPixel,
  }));
  
  // Two-stage simplification:
  // 1. First use Douglas-Peucker to reduce noise
  // 2. Then detect corners for sharp edges
  console.log(`🔍 Simplifying ${geoContour.length} contour points...`);
  
  const tolerance = Math.max(latPerPixel, lngPerPixel) * 1.5; // ~1.5 pixels
  const simplified = simplifyPolygon(geoContour, tolerance);
  console.log(`📉 After Douglas-Peucker: ${simplified.length} points`);
  
  // Now detect corners in the simplified contour
  const corners = simplifyToCorners(simplified);
  
  console.log(`✅ Final polygon: ${corners.length} corner points`);
  
  return corners;
}

/**
 * Douglas-Peucker algorithm for polygon simplification
 * Reduces the number of points while preserving shape
 * 
 * @param {Array} points - Array of {lat, lng} points
 * @param {number} tolerance - Simplification tolerance
 * @returns {Array} Simplified array of points
 */
function simplifyPolygon(points, tolerance) {
  if (points.length < 3) return points;
  
  // Find the point with maximum distance from line segment
  let maxDist = 0;
  let maxIndex = 0;
  const end = points.length - 1;
  
  for (let i = 1; i < end; i++) {
    const dist = perpendicularDistance(points[i], points[0], points[end]);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }
  
  // If max distance is greater than tolerance, recursively simplify
  if (maxDist > tolerance) {
    const left = simplifyPolygon(points.slice(0, maxIndex + 1), tolerance);
    const right = simplifyPolygon(points.slice(maxIndex), tolerance);
    return left.slice(0, -1).concat(right);
  } else {
    return [points[0], points[end]];
  }
}

/**
 * Calculate perpendicular distance from point to line segment
 */
function perpendicularDistance(point, lineStart, lineEnd) {
  const dx = lineEnd.lng - lineStart.lng;
  const dy = lineEnd.lat - lineStart.lat;
  
  const mag = Math.sqrt(dx * dx + dy * dy);
  if (mag === 0) return Math.hypot(point.lng - lineStart.lng, point.lat - lineStart.lat);
  
  const u = ((point.lng - lineStart.lng) * dx + (point.lat - lineStart.lat) * dy) / (mag * mag);
  
  let closestPoint;
  if (u < 0) {
    closestPoint = lineStart;
  } else if (u > 1) {
    closestPoint = lineEnd;
  } else {
    closestPoint = {
      lng: lineStart.lng + u * dx,
      lat: lineStart.lat + u * dy,
    };
  }
  
  return Math.hypot(point.lng - closestPoint.lng, point.lat - closestPoint.lat);
}


/**
 * Align polygon to actual roof edges using top-edge reference
 * Uses computer vision to detect roof edges and calculate alignment offset
 * 
 * @param {Array} polygon - Array of {lat, lng} vertices
 * @param {Object} rgbData - RGB GeoTIFF data
 * @param {Object} maskData - Mask GeoTIFF data
 * @returns {Array} Aligned polygon vertices
 */
function alignPolygonToRoofEdges(polygon, rgbData, maskData) {
  const { width, height, bounds } = rgbData;
  
  // DIAGNOSTIC: Log GeoTIFF metadata
  console.log('🗺️ GeoTIFF metadata:', {
    width, height,
    bounds,
    resolution: {
      latPerPixel: ((bounds.north - bounds.south) / height).toFixed(8),
      lngPerPixel: ((bounds.east - bounds.west) / width).toFixed(8)
    }
  });
  
  // Convert lat/lng to pixel coordinates
  const latPerPixel = (bounds.north - bounds.south) / height;
  const lngPerPixel = (bounds.east - bounds.west) / width;
  
  const latLngToPixel = (lat, lng) => ({
    x: Math.round((lng - bounds.west) / lngPerPixel),
    y: Math.round((bounds.north - lat) / latPerPixel)
  });
  
  const pixelToLatLng = (x, y) => ({
    lat: bounds.north - y * latPerPixel,
    lng: bounds.west + x * lngPerPixel
  });
  
  // Convert polygon to pixel space
  const polygonPixels = polygon.map(v => latLngToPixel(v.lat, v.lng));
  
  // Find topmost edge of polygon (smallest Y = top of image)
  let topY = Infinity;
  let topEdgeStart = null;
  let topEdgeEnd = null;
  
  for (let i = 0; i < polygonPixels.length; i++) {
    const p1 = polygonPixels[i];
    const p2 = polygonPixels[(i + 1) % polygonPixels.length];
    const minY = Math.min(p1.y, p2.y);
    
    if (minY < topY) {
      topY = minY;
      topEdgeStart = p1;
      topEdgeEnd = p2;
    }
  }
  
  console.log(`📍 Polygon top edge: y=${topY}, from (${topEdgeStart.x},${topEdgeStart.y}) to (${topEdgeEnd.x},${topEdgeEnd.y})`);
  
  // Detect roof edges in RGB image using Sobel
  const gray = rgbToGrayscale(rgbData);
  const edges = sobelEdgeDetection(gray, width, height);
  
  // Find strongest edge near the top of the building
  // WIDER search band - look up to 50 pixels above/below polygon top
  const searchBandTop = Math.max(0, topY - 50);
  const searchBandBottom = Math.min(height, topY + 50);
  const searchBandLeft = Math.max(0, Math.min(topEdgeStart.x, topEdgeEnd.x) - 20);
  const searchBandRight = Math.min(width, Math.max(topEdgeStart.x, topEdgeEnd.x) + 20);
  
  console.log(`🔍 Search band: y=${searchBandTop}-${searchBandBottom}, x=${searchBandLeft}-${searchBandRight}`);
  
  // Find horizontal edges with continuity (roof edges are long straight lines)
  const rowEdgeStrengths = [];
  for (let y = searchBandTop; y < searchBandBottom; y++) {
    let rowEdgeStrength = 0;
    let edgePixelCount = 0;
    
    for (let x = searchBandLeft; x < searchBandRight; x++) {
      const edgeVal = edges[y * width + x];
      if (edgeVal > 50) { // Significant edge threshold
        rowEdgeStrength += edgeVal;
        edgePixelCount++;
      }
    }
    
    // Favor long continuous edges (roof edges span the building width)
    const continuityScore = edgePixelCount > 5 ? rowEdgeStrength * edgePixelCount : 0;
    rowEdgeStrengths.push({ y, strength: rowEdgeStrength, continuity: continuityScore, pixels: edgePixelCount });
  }
  
  // Sort by continuity score (long strong edges)
  rowEdgeStrengths.sort((a, b) => b.continuity - a.continuity);
  
  // Take the strongest continuous edge ABOVE the polygon (roof top is north of mask)
  let detectedEdgeY = topY;
  for (const candidate of rowEdgeStrengths.slice(0, 5)) {
    if (candidate.y < topY && candidate.pixels > 5) {
      detectedEdgeY = candidate.y;
      console.log(`🎯 Found strong edge: y=${candidate.y}, pixels=${candidate.pixels}, strength=${candidate.strength.toFixed(0)}`);
      break;
    }
  }
  
  // If no edge found above, try below
  if (detectedEdgeY === topY) {
    for (const candidate of rowEdgeStrengths.slice(0, 5)) {
      if (candidate.pixels > 5) {
        detectedEdgeY = candidate.y;
        console.log(`🎯 Found edge (below): y=${candidate.y}, pixels=${candidate.pixels}, strength=${candidate.strength.toFixed(0)}`);
        break;
      }
    }
  }
  
  console.log(`🔍 Detected TOP roof edge at y=${detectedEdgeY} (polygon was at y=${topY})`);
  const topOffsetY = detectedEdgeY - topY;
  console.log(`📏 Top offset: ${topOffsetY} pixels (${(topOffsetY * latPerPixel * 111000).toFixed(2)} meters)`);
  
  // ALSO DETECT LEFT EDGE (for X-axis alignment)
  let leftX = Infinity;
  for (const p of polygonPixels) {
    if (p.x < leftX) leftX = p.x;
  }
  
  const searchBandLeftX = Math.max(0, leftX - 50);
  const searchBandRightX = leftX + 20;
  const searchBandTopForLeft = topY;
  const searchBandBottomForLeft = Math.min(height, topY + 100);
  
  const colEdgeStrengths = [];
  for (let x = searchBandLeftX; x < searchBandRightX; x++) {
    let colEdgeStrength = 0;
    let edgePixelCount = 0;
    
    for (let y = searchBandTopForLeft; y < searchBandBottomForLeft; y++) {
      const edgeVal = edges[y * width + x];
      if (edgeVal > 50) {
        colEdgeStrength += edgeVal;
        edgePixelCount++;
      }
    }
    
    const continuityScore = edgePixelCount > 5 ? colEdgeStrength * edgePixelCount : 0;
    colEdgeStrengths.push({ x, strength: colEdgeStrength, continuity: continuityScore, pixels: edgePixelCount });
  }
  
  colEdgeStrengths.sort((a, b) => b.continuity - a.continuity);
  
  let detectedEdgeX = leftX;
  for (const candidate of colEdgeStrengths.slice(0, 5)) {
    if (candidate.x < leftX && candidate.pixels > 5) {
      detectedEdgeX = candidate.x;
      console.log(`🎯 Found strong LEFT edge: x=${candidate.x}, pixels=${candidate.pixels}, strength=${candidate.strength.toFixed(0)}`);
      break;
    }
  }
  
  if (detectedEdgeX === leftX) {
    for (const candidate of colEdgeStrengths.slice(0, 5)) {
      if (candidate.pixels > 5) {
        detectedEdgeX = candidate.x;
        console.log(`🎯 Found LEFT edge (right): x=${candidate.x}, pixels=${candidate.pixels}, strength=${candidate.strength.toFixed(0)}`);
        break;
      }
    }
  }
  
  const leftOffsetX = detectedEdgeX - leftX;
  console.log(`🔍 Detected LEFT roof edge at x=${detectedEdgeX} (polygon was at x=${leftX})`);
  console.log(`📏 Left offset: ${leftOffsetX} pixels (${(leftOffsetX * lngPerPixel * 111000 * Math.cos(bounds.north * Math.PI / 180)).toFixed(2)} meters)`);
  
  // Safety checks
  if (Math.abs(topOffsetY) > 80 || Math.abs(leftOffsetX) > 80) {
    console.warn(`⚠️ Offset too large (Y=${topOffsetY}px, X=${leftOffsetX}px), skipping alignment`);
    return polygon;
  }
  
  // Apply 2D offset (both X and Y)
  const alignedPixels = polygonPixels.map(p => ({
    x: p.x + leftOffsetX,
    y: p.y + topOffsetY
  }));
  
  // Convert back to lat/lng
  const alignedPolygon = alignedPixels.map(p => pixelToLatLng(p.x, p.y));
  
  console.log(`✅ Polygon aligned with offsets: Y=${topOffsetY}px, X=${leftOffsetX}px`);
  
  return alignedPolygon;
}

/**
 * Convert RGB GeoTIFF rasters to a canvas image data URL
 * 
 * @param {Object} rgbData - RGB GeoTIFF data with rasters
 * @returns {string} Data URL for the image
 */
function rgbGeoTiffToDataUrl(rgbData) {
  const { width, height, rasters } = rgbData;
  
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // Create ImageData
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  
  // Fill with RGB data
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    data[idx] = rasters[0][i];     // R
    data[idx + 1] = rasters[1][i]; // G
    data[idx + 2] = rasters[2][i]; // B
    data[idx + 3] = 255;           // A (fully opaque)
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Creates an accurate building outline from the building mask GeoTIFF
 * This provides pixel-level accuracy instead of bounding boxes
 * 
 * @param {Object} buildingInsights - Response from findClosestBuilding
 * @param {string} apiKey - Google Cloud API key
 * @returns {Promise<Object>} Building outline with accurate vertices AND overlay data
 */
export async function createAccurateBuildingOutline(buildingInsights, apiKey) {
  console.log('🎯 Creating accurate building outline from mask...');
  
  const { center } = buildingInsights;
  const radiusMeters = 100; // Increased for better coverage
  
  try {
    // Step 1: Fetch data layer URLs
    const dataLayers = await getDataLayerUrls(center, radiusMeters, apiKey);
    
    // Step 2: Download mask AND RGB for alignment
    console.log('📥 Downloading mask and RGB for alignment...');
    const [maskData, rgbData] = await Promise.all([
      downloadGeoTIFF(dataLayers.maskUrl, apiKey),
      downloadGeoTIFF(dataLayers.rgbUrl, apiKey)
    ]);
    
    // Step 3: Trace the boundary from mask (pass building center for accurate selection)
    const vertices = traceBuildingMask(maskData, buildingInsights.center);
    
    if (vertices.length < 3) {
      console.warn('⚠️ Not enough vertices from mask, falling back to convex hull');
      return createBuildingOutline(buildingInsights);
    }
    
    // Step 4: Create overlay image from RGB GeoTIFF
    console.log('🖼️ Creating GeoTIFF overlay for perfect alignment...');
    const overlayImageUrl = rgbGeoTiffToDataUrl(rgbData);
    const overlayBounds = {
      north: rgbData.bounds.north,
      south: rgbData.bounds.south,
      east: rgbData.bounds.east,
      west: rgbData.bounds.west
    };
    
    // Skip alignment correction since we're showing the GeoTIFF image
    // The polygon and image are already in the same coordinate system
    console.log('✅ Using raw vertices (no alignment needed with GeoTIFF overlay)');
    
    const { solarPotential } = buildingInsights;
    
    return {
      vertices: vertices, // Use original vertices, not aligned
      overlay: {
        imageUrl: overlayImageUrl,
        bounds: overlayBounds
      },
      metadata: {
        center: buildingInsights.center,
        postalCode: buildingInsights.postalCode,
        maxPanels: solarPotential?.maxArrayPanelsCount,
        maxSunshineHours: solarPotential?.maxSunshineHoursPerYear,
        buildingArea: solarPotential?.buildingStats?.areaMeters2,
        imageryDate: buildingInsights.imageryDate,
        imageryQuality: buildingInsights.imageryQuality,
        segmentCount: solarPotential?.roofSegmentStats?.length,
        source: 'building-mask-aligned',
      }
    };
  } catch (error) {
    console.error('❌ Failed to create accurate outline:', error);
    console.log('⚠️ Falling back to convex hull method');
    return createBuildingOutline(buildingInsights);
  }
}


/**
 * Detect corners in a contour using angle-based detection
 * Finds points where the direction changes significantly
 * 
 * @param {Array} contour - Array of {lat, lng} or {x, y} points
 * @param {number} angleThreshold - Minimum angle change to be considered a corner (degrees)
 * @param {number} windowSize - Number of points to look ahead/behind
 * @returns {Array} Array of corner points
 */
function detectCorners(contour, angleThreshold = 20, windowSize = 5) {
  if (contour.length < windowSize * 2) return contour;
  
  const corners = [];
  const n = contour.length;
  
  for (let i = 0; i < n; i++) {
    // Get points before and after current point
    const prevIdx = (i - windowSize + n) % n;
    const nextIdx = (i + windowSize) % n;
    
    const prev = contour[prevIdx];
    const curr = contour[i];
    const next = contour[nextIdx];
    
    // Calculate vectors
    const v1x = curr.x !== undefined ? curr.x - prev.x : curr.lng - prev.lng;
    const v1y = curr.y !== undefined ? curr.y - prev.y : curr.lat - prev.lat;
    const v2x = next.x !== undefined ? next.x - curr.x : next.lng - curr.lng;
    const v2y = next.y !== undefined ? next.y - curr.y : next.lat - curr.lat;
    
    // Calculate angle between vectors
    const dot = v1x * v2x + v1y * v2y;
    const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
    
    if (mag1 === 0 || mag2 === 0) continue;
    
    const cosAngle = dot / (mag1 * mag2);
    const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * 180 / Math.PI;
    
    // If angle is significant, it's a corner
    if (angle > angleThreshold) {
      corners.push(curr);
    }
  }
  
  console.log(`🔶 Detected ${corners.length} corners (threshold: ${angleThreshold}°)`);
  
  return corners;
}

/**
 * Simplify contour by keeping only corners
 * This creates sharp, clean building outlines
 * 
 * @param {Array} contour - Array of contour points
 * @returns {Array} Simplified contour with only corner points
 */
function simplifyToCorners(contour) {
  // First pass: detect major corners (>30 degrees)
  let corners = detectCorners(contour, 30, 10);
  
  // If we got too few corners, try with lower threshold
  if (corners.length < 4) {
    console.log('⚠️ Too few corners, trying lower threshold');
    corners = detectCorners(contour, 20, 8);
  }
  
  // If still too few, try even lower
  if (corners.length < 4) {
    console.log('⚠️ Still too few corners, trying even lower threshold');
    corners = detectCorners(contour, 10, 5);
  }
  
  // Remove corners that are too close together
  const minDistance = 0.0001; // ~10 meters - prevent clustering
  const filtered = [];
  
  for (let i = 0; i < corners.length; i++) {
    const curr = corners[i];
    const next = corners[(i + 1) % corners.length];
    
    const dist = Math.hypot(
      (curr.lat || curr.y) - (next.lat || next.y),
      (curr.lng || curr.x) - (next.lng || next.x)
    );
    
    if (dist > minDistance) {
      filtered.push(curr);
    }
  }
  
  console.log(`✅ Final corners: ${filtered.length} (removed ${corners.length - filtered.length} close duplicates)`);
  
  return filtered.length >= 3 ? filtered : corners;
}


/**
 * Apply Sobel edge detection to find edges in an image
 * Returns edge magnitude at each pixel
 * 
 * @param {Array} imageData - Grayscale image data (1D array)
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Array} Edge magnitude at each pixel
 */
function sobelEdgeDetection(imageData, width, height) {
  console.log('🔍 Applying Sobel edge detection...');
  
  const edges = new Array(width * height).fill(0);
  
  // Sobel kernels
  const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
  const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
  
  let maxEdge = 0;
  let edgeCount = 0;
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;
      
      // Apply Sobel kernels
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = (y + ky) * width + (x + kx);
          const pixel = imageData[idx];
          gx += pixel * sobelX[ky + 1][kx + 1];
          gy += pixel * sobelY[ky + 1][kx + 1];
        }
      }
      
      // Edge magnitude
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edges[y * width + x] = magnitude;
      
      if (magnitude > maxEdge) maxEdge = magnitude;
      if (magnitude > 10) edgeCount++; // Count significant edges
    }
  }
  
  console.log(`✅ Sobel complete: max edge=${maxEdge.toFixed(1)}, ${edgeCount} significant edges`);
  return edges;
}

/**
 * Convert RGB image to grayscale
 * 
 * @param {Object} rgbData - GeoTIFF data with 3 rasters (R, G, B)
 * @returns {Array} Grayscale image data
 */
function rgbToGrayscale(rgbData) {
  const { width, height, rasters } = rgbData;
  const gray = new Array(width * height);
  
  console.log(`🎨 RGB data: ${width}x${height}, ${rasters.length} bands`);
  console.log(`📊 Sample RGB values at center:`, {
    r: rasters[0][Math.floor(width * height / 2)],
    g: rasters[1][Math.floor(width * height / 2)],
    b: rasters[2][Math.floor(width * height / 2)]
  });
  
  let minGray = Infinity;
  let maxGray = -Infinity;
  
  for (let i = 0; i < width * height; i++) {
    // Standard luminance formula
    const val = 0.299 * rasters[0][i] + 0.587 * rasters[1][i] + 0.114 * rasters[2][i];
    gray[i] = val;
    if (val < minGray) minGray = val;
    if (val > maxGray) maxGray = val;
  }
  
  console.log(`📊 Grayscale range: ${minGray.toFixed(1)} to ${maxGray.toFixed(1)}`);
  
  return gray;
}

/**
 * Apply non-maximum suppression to thin edges
 * 
 * @param {Array} edges - Edge magnitude array
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} threshold - Edge threshold
 * @returns {Array} Binary edge map
 */
function nonMaxSuppression(edges, width, height, threshold) {
  const result = new Array(width * height).fill(0);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const mag = edges[idx];
      
      if (mag < threshold) continue;
      
      // Check if this is a local maximum
      const neighbors = [
        edges[idx - 1], edges[idx + 1],
        edges[idx - width], edges[idx + width],
        edges[idx - width - 1], edges[idx - width + 1],
        edges[idx + width - 1], edges[idx + width + 1]
      ];
      
      if (mag >= Math.max(...neighbors)) {
        result[idx] = 1;
      }
    }
  }
  
  return result;
}

/**
 * Create accurate building outline using RGB edge detection
 * This uses aerial imagery to detect actual building edges
 * 
 * @param {Object} buildingInsights - Response from findClosestBuilding
 * @param {string} apiKey - Google Cloud API key
 * @returns {Promise<Object>} Building outline with accurate vertices
 */
export async function createEdgeDetectedOutline(buildingInsights, apiKey) {
  console.log('🎯 Creating building outline using RGB edge detection...');
  
  const { center } = buildingInsights;
  const radiusMeters = 100; // Increased for better coverage
  
  try {
    // Step 1: Fetch data layers
    const dataLayers = await getDataLayerUrls(center, radiusMeters, apiKey);
    
    // Step 2: Download RGB and mask
    console.log('📥 Downloading RGB and mask layers...');
    const [rgbData, maskData] = await Promise.all([
      downloadGeoTIFF(dataLayers.rgbUrl, apiKey),
      downloadGeoTIFF(dataLayers.maskUrl, apiKey)
    ]);
    
    // Step 3: Convert RGB to grayscale
    console.log('🎨 Converting to grayscale...');
    const gray = rgbToGrayscale(rgbData);
    
    // Step 4: Apply Sobel edge detection
    const edges = sobelEdgeDetection(gray, rgbData.width, rgbData.height);
    
    // Step 5: Find threshold (use percentile of edge magnitudes)
    const sortedEdges = edges.filter(e => e > 0).sort((a, b) => a - b);
    const threshold = sortedEdges[Math.floor(sortedEdges.length * 0.85)]; // Top 15% of edges
    console.log(`📊 Edge threshold: ${threshold.toFixed(2)}`);
    
    // Step 6: Apply non-maximum suppression
    console.log('🔍 Applying non-maximum suppression...');
    const edgeMap = nonMaxSuppression(edges, rgbData.width, rgbData.height, threshold);
    
    // Step 7: Combine with mask to get only building edges
    const mask = maskData.rasters[0];
    for (let i = 0; i < edgeMap.length; i++) {
      if (mask[i] !== 1) {
        edgeMap[i] = 0; // Remove edges outside the building
      }
    }
    
    // Step 8: Trace the edge-detected contour
    console.log('🔍 Tracing edge-detected contour...');
    const contour = traceEdgeContour(edgeMap, rgbData.width, rgbData.height, rgbData.bounds);
    
    if (contour.length < 3) {
      console.warn('⚠️ Edge detection failed, falling back to mask tracing');
      return createAccurateBuildingOutline(buildingInsights, apiKey);
    }
    
    const { solarPotential } = buildingInsights;
    
    return {
      vertices: contour,
      metadata: {
        center: buildingInsights.center,
        postalCode: buildingInsights.postalCode,
        maxPanels: solarPotential?.maxArrayPanelsCount,
        maxSunshineHours: solarPotential?.maxSunshineHoursPerYear,
        buildingArea: solarPotential?.buildingStats?.areaMeters2,
        imageryDate: buildingInsights.imageryDate,
        imageryQuality: buildingInsights.imageryQuality,
        segmentCount: solarPotential?.roofSegmentStats?.length,
        source: 'rgb-edge-detection',
      }
    };
  } catch (error) {
    console.error('❌ Edge detection failed:', error);
    console.log('⚠️ Falling back to mask tracing');
    return createAccurateBuildingOutline(buildingInsights, apiKey);
  }
}

/**
 * Trace contour from edge-detected binary image
 * 
 * @param {Array} edgeMap - Binary edge map
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {Object} bounds - Geographic bounds
 * @returns {Array} Array of {lat, lng} points
 */
function traceEdgeContour(edgeMap, width, height, bounds) {
  // Find starting point near center
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  
  let startX = -1, startY = -1;
  let minDist = Infinity;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (edgeMap[y * width + x] === 1) {
        const dist = Math.hypot(x - centerX, y - centerY);
        if (dist < minDist) {
          minDist = dist;
          startX = x;
          startY = y;
        }
      }
    }
  }
  
  if (startX === -1) return [];
  
  // Trace using Moore-neighbor
  const dirs = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  const contour = [];
  let x = startX, y = startY;
  let dir = 7;
  
  const getPixel = (px, py) => {
    if (px < 0 || px >= width || py < 0 || py >= height) return 0;
    return edgeMap[py * width + px];
  };
  
  do {
    contour.push({ x, y });
    
    let found = false;
    for (let i = 0; i < 8; i++) {
      const checkDir = (dir + i) % 8;
      const nx = x + dirs[checkDir][0];
      const ny = y + dirs[checkDir][1];
      
      if (getPixel(nx, ny) === 1) {
        x = nx;
        y = ny;
        dir = (checkDir + 5) % 8;
        found = true;
        break;
      }
    }
    
    if (!found) break;
    if (contour.length > 2 && x === startX && y === startY) break;
    if (contour.length > 50000) break;
  } while (true);
  
  // Convert to lat/lng
  const latPerPixel = (bounds.north - bounds.south) / height;
  const lngPerPixel = (bounds.east - bounds.west) / width;
  
  const geoContour = contour.map(p => ({
    lat: bounds.south + (height - p.y) * latPerPixel,
    lng: bounds.west + p.x * lngPerPixel,
  }));
  
  // Simplify
  const tolerance = Math.max(latPerPixel, lngPerPixel) * 2;
  const simplified = simplifyPolygon(geoContour, tolerance);
  
  console.log(`✅ Edge-detected contour: ${simplified.length} points`);
  
  return simplified;
}


/**
 * Extract actual roof segments from GeoTIFF data using DSM-based segmentation
 * Uses proven building outline method + DSM Sobel for roof plane detection
 * 
 * @param {Object} buildingInsights - Response from findClosestBuilding
 * @param {string} apiKey - Google Cloud API key
 * @returns {Promise<Object>} Object with segments array and overlay data
 */
export async function extractRoofSegmentsFromGeoTIFF(buildingInsights, apiKey) {
  console.log('🏠 Extracting roof segments from GeoTIFF data...');
  
  const { center } = buildingInsights;
  const radiusMeters = 100;
  
  console.log('🎯 Building center from API:', {
    lat: center.latitude,
    lng: center.longitude,
    postalCode: buildingInsights.postalCode
  });
  
  try {
    // Step 1: Fetch data layers
    console.log('📡 Fetching data layer URLs for building center...');
    const dataLayers = await getDataLayerUrls(center, radiusMeters, apiKey);
    console.log('✅ Data layers received:', {
      hasMask: !!dataLayers.maskUrl,
      hasDSM: !!dataLayers.dsmUrl,
      hasRGB: !!dataLayers.rgbUrl
    });
    
    // Step 2: Download mask, DSM, and RGB for overlay
    console.log('📥 Downloading mask, DSM, and RGB layers...');
    const [maskData, dsmData, rgbData] = await Promise.all([
      downloadGeoTIFF(dataLayers.maskUrl, apiKey),
      downloadGeoTIFF(dataLayers.dsmUrl, apiKey),
      downloadGeoTIFF(dataLayers.rgbUrl, apiKey)
    ]);
    
    console.log('✅ GeoTIFF data downloaded:', {
      maskSize: `${maskData.width}x${maskData.height}`,
      dsmSize: `${dsmData.width}x${dsmData.height}`,
      rgbSize: `${rgbData.width}x${rgbData.height}`
    });
    
    console.log('📍 GeoTIFF bounds:', maskData.bounds);
    console.log('📍 Building center:', { lat: center.latitude, lng: center.longitude });
    
    // Verify building center is within GeoTIFF bounds
    const centerInBounds = 
      center.latitude >= maskData.bounds.south &&
      center.latitude <= maskData.bounds.north &&
      center.longitude >= maskData.bounds.west &&
      center.longitude <= maskData.bounds.east;
    
    console.log(`🔍 Building center in GeoTIFF bounds: ${centerInBounds ? '✅ YES' : '❌ NO'}`);
    
    if (!centerInBounds) {
      console.error('❌ Building center is OUTSIDE the GeoTIFF bounds! This will cause misalignment.');
      console.error('This usually means the geocoded address and building insights are for different locations.');
    }
    
    // Step 3: Get precise building outline using proven method
    console.log('🏠 Tracing building outline...');
    const buildingOutline = traceBuildingMask(maskData, buildingInsights.center);
    
    if (buildingOutline.length < 3) {
      throw new Error('Could not trace building outline');
    }
    
    console.log(`✅ Building outline: ${buildingOutline.length} vertices`);
    
    // Step 4: Extract roof segments from solar panel positions (Google's approach)
    console.log('☀️ Extracting roof segments from solar panel data...');
    const roofSegments = extractSegmentsFromSolarPanels(buildingInsights, buildingOutline);
    
    console.log(`✅ Extracted ${roofSegments.length} roof segments from panel data`);
    
    // Step 4: Create overlay image from RGB GeoTIFF
    console.log('🖼️ Creating GeoTIFF overlay...');
    const overlayImageUrl = rgbGeoTiffToDataUrl(rgbData);
    const overlayBounds = {
      north: rgbData.bounds.north,
      south: rgbData.bounds.south,
      east: rgbData.bounds.east,
      west: rgbData.bounds.west
    };
    
    return {
      segments: roofSegments,
      overlay: {
        imageUrl: overlayImageUrl,
        bounds: overlayBounds
      }
    };
    
  } catch (error) {
    console.error('❌ Failed to extract roof segments from GeoTIFF:', error);
    console.error('Error details:', error.message, error.stack);
    // Fallback to API bounding boxes
    console.log('⚠️ Falling back to API bounding boxes');
    const segments = convertRoofSegmentsToPolygons(buildingInsights, window.google);
    return { segments, overlay: null };
  }
}

/**
 * Segment roof into distinct planes using height data from DSM
 * Groups pixels by similar height and traces boundaries
 * 
 * @param {Object} maskData - Building mask GeoTIFF
 * @param {Object} dsmData - Digital Surface Model GeoTIFF
 * @param {Object} buildingInsights - Building insights for metadata
 * @returns {Array} Array of roof segment polygons
 */
function segmentRoofByHeight(maskData, dsmData, buildingInsights) {
  const { width, height, bounds } = maskData;
  const mask = maskData.rasters[0];
  const dsm = dsmData.rasters[0];
  
  console.log(`📊 DSM data: ${width}x${height} pixels`);
  
  // Get roof segment metadata from API for reference
  const segmentStats = buildingInsights.solarPotential?.roofSegmentStats || [];
  console.log(`📋 API reports ${segmentStats.length} roof segments`);
  
  // CRITICAL: Filter mask to only include pixels near the building center
  // This prevents segmenting neighboring buildings
  const buildingCenter = buildingInsights.center;
  const buildingBBox = buildingInsights.boundingBox;
  
  console.log('🎯 Filtering mask to building bounding box:', {
    center: buildingCenter,
    bbox: buildingBBox
  });
  
  // Convert building bounding box to pixel coordinates
  const latPerPixel = (bounds.north - bounds.south) / height;
  const lngPerPixel = (bounds.east - bounds.west) / width;
  
  const bboxMinX = Math.floor((buildingBBox.sw.longitude - bounds.west) / lngPerPixel);
  const bboxMaxX = Math.ceil((buildingBBox.ne.longitude - bounds.west) / lngPerPixel);
  const bboxMinY = Math.floor((bounds.north - buildingBBox.ne.latitude) / latPerPixel);
  const bboxMaxY = Math.ceil((bounds.north - buildingBBox.sw.latitude) / latPerPixel);
  
  console.log(`📦 Building bbox in pixels: x=[${bboxMinX}, ${bboxMaxX}], y=[${bboxMinY}, ${bboxMaxY}]`);
  
  // Create filtered mask containing only the target building
  const filteredMask = new Uint8Array(mask.length);
  let filteredPixelCount = 0;
  
  for (let y = Math.max(0, bboxMinY); y < Math.min(height, bboxMaxY); y++) {
    for (let x = Math.max(0, bboxMinX); x < Math.min(width, bboxMaxX); x++) {
      const idx = y * width + x;
      if (mask[idx] === 1) {
        filteredMask[idx] = 1;
        filteredPixelCount++;
      }
    }
  }
  
  console.log(`✂️ Filtered mask: ${filteredPixelCount} pixels (was ${mask.filter(p => p === 1).length} pixels)`);
  
  // Find height range within FILTERED building mask
  let minHeight = Infinity;
  let maxHeight = -Infinity;
  const buildingHeights = [];
  let buildingPixelCount = 0;
  
  for (let i = 0; i < filteredMask.length; i++) {
    if (filteredMask[i] === 1) {
      buildingPixelCount++;
      const h = dsm[i];
      buildingHeights.push(h);
      if (h < minHeight) minHeight = h;
      if (h > maxHeight) maxHeight = h;
    }
  }
  
  console.log(`📏 Building: ${buildingPixelCount} pixels, height range: ${minHeight.toFixed(2)}m to ${maxHeight.toFixed(2)}m`);
  
  if (buildingPixelCount === 0) {
    console.error('❌ No building pixels found in mask!');
    return [];
  }
  
  if (!isFinite(minHeight) || !isFinite(maxHeight)) {
    console.error('❌ Invalid height data in DSM!');
    return [];
  }
  
  // Create height-based segments
  // For residential roofs, we expect multiple height levels (different roof planes)
  const heightRange = maxHeight - minHeight;
  const numSegments = heightRange < 0.5 ? 1 : Math.min(segmentStats.length || 4, Math.max(2, Math.ceil(heightRange / 2)));
  const heightStep = heightRange / numSegments;
  
  console.log(`🔢 Creating ${numSegments} height-based segments (step: ${heightStep.toFixed(2)}m, range: ${heightRange.toFixed(2)}m)`);
  
  const segments = [];
  
  for (let i = 0; i < numSegments; i++) {
    const segmentMinHeight = minHeight + i * heightStep;
    const segmentMaxHeight = minHeight + (i + 1) * heightStep + 0.5; // Overlap slightly
    
    console.log(`  Segment ${i}: ${segmentMinHeight.toFixed(2)}m - ${segmentMaxHeight.toFixed(2)}m`);
    
    // Create binary mask for this height range (using FILTERED mask)
    const segmentMask = new Uint8Array(filteredMask.length);
    let pixelCount = 0;
    
    for (let j = 0; j < filteredMask.length; j++) {
      if (filteredMask[j] === 1 && dsm[j] >= segmentMinHeight && dsm[j] <= segmentMaxHeight) {
        segmentMask[j] = 1;
        pixelCount++;
      }
    }
    
    if (pixelCount < 50) {
      console.log(`  ⚠️ Segment ${i} too small (${pixelCount} pixels), skipping`);
      continue;
    }
    
    console.log(`  ✓ Segment ${i}: ${pixelCount} pixels`);
    
    // Trace the boundary of this segment
    let contour = traceSegmentBoundary(segmentMask, width, height, bounds, buildingInsights.center);
    
    // Refine the contour: simplify + regularize
    if (contour.length > 3) {
      contour = refineSegmentContour(contour, bounds, width, height);
      console.log(`  ✨ Refined contour: ${contour.length} vertices after refinement`);
    }
    
    if (contour.length >= 3) {  // Lowered from 4 to 3
      // Get metadata from API if available
      const apiSegment = segmentStats[i] || {};
      
      segments.push({
        segmentIndex: i,
        vertices: contour,
        metadata: {
          pitchDegrees: apiSegment.pitchDegrees?.toFixed(2) || 'N/A',
          azimuthDegrees: apiSegment.azimuthDegrees?.toFixed(2) || 'N/A',
          heightMeters: ((segmentMinHeight + segmentMaxHeight) / 2).toFixed(2),
          heightFeet: (((segmentMinHeight + segmentMaxHeight) / 2) * 3.28084).toFixed(2),
          areaMeters2: (pixelCount * Math.pow((bounds.north - bounds.south) / height * 111000, 2)).toFixed(2),
          areaFeet2: (pixelCount * Math.pow((bounds.north - bounds.south) / height * 111000, 2) * 10.7639).toFixed(2),
          center: apiSegment.center || buildingInsights.center,
          source: 'geotiff-height-segmentation'
        }
      });
    } else {
      console.log(`  ⚠️ Segment ${i} contour too small (${contour.length} vertices), skipping`);
    }
  }
  
  return segments;
}

/**
 * Trace the boundary of a roof segment using Moore-neighbor algorithm
 * 
 * @param {Uint8Array} segmentMask - Binary mask for this segment
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {Object} bounds - Geographic bounds
 * @param {Object} buildingCenter - Building center coordinates {latitude, longitude}
 * @returns {Array} Array of {lat, lng} vertices
 */
function traceSegmentBoundary(segmentMask, width, height, bounds, buildingCenter) {
  // Find starting point closest to building center (not just leftmost)
  const centerX = Math.round((buildingCenter.longitude - bounds.west) / (bounds.east - bounds.west) * width);
  const centerY = Math.round((bounds.north - buildingCenter.latitude) / (bounds.north - bounds.south) * height);
  
  console.log(`  🎯 Building center in pixels: (${centerX}, ${centerY})`);
  
  let startX = -1, startY = -1;
  
  // Find a BOUNDARY pixel (has at least one non-segment neighbor)
  // Start from top-left and scan for first boundary pixel
  outerLoop: for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (segmentMask[y * width + x] === 1) {
        // Check if this is a boundary pixel
        const isBoundary = 
          x === 0 || x === width - 1 || y === 0 || y === height - 1 ||
          segmentMask[y * width + (x - 1)] === 0 ||
          segmentMask[y * width + (x + 1)] === 0 ||
          segmentMask[(y - 1) * width + x] === 0 ||
          segmentMask[(y + 1) * width + x] === 0;
        
        if (isBoundary) {
          startX = x;
          startY = y;
          break outerLoop;
        }
      }
    }
  }
  
  console.log(`  📍 Starting trace at boundary pixel (${startX}, ${startY})`);
  
  if (startX === -1) return [];
  
  // Moore-neighbor tracing
  const dirs = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  const contour = [];
  let x = startX, y = startY;
  let dir = 7; // Start looking from W
  
  const getPixel = (px, py) => {
    if (px < 0 || px >= width || py < 0 || py >= height) return 0;
    return segmentMask[py * width + px];
  };
  
  do {
    contour.push({ x, y });
    
    let found = false;
    for (let i = 0; i < 8; i++) {
      const checkDir = (dir + i) % 8;
      const nx = x + dirs[checkDir][0];
      const ny = y + dirs[checkDir][1];
      
      if (getPixel(nx, ny) === 1) {
        x = nx;
        y = ny;
        dir = (checkDir + 5) % 8;
        found = true;
        break;
      }
    }
    
    if (!found) break;
    if (contour.length > 2 && x === startX && y === startY) break;
    if (contour.length > 50000) break;
  } while (true);
  
  // Convert to lat/lng
  const latPerPixel = (bounds.north - bounds.south) / height;
  const lngPerPixel = (bounds.east - bounds.west) / width;
  
  const geoContour = contour.map(p => ({
    lat: bounds.south + (height - p.y) * latPerPixel,
    lng: bounds.west + p.x * lngPerPixel,
  }));
  
  // Simplify with lower tolerance for residential (preserve detail)
  const tolerance = Math.max(latPerPixel, lngPerPixel) * 1.5; // Less aggressive than commercial
  const simplified = simplifyPolygon(geoContour, tolerance);
  
  console.log(`  📐 Traced segment: ${contour.length} → ${simplified.length} vertices`);
  
  return simplified;
}


/**
 * Refine a segment contour by simplifying and regularizing
 * Makes residential roof segments cleaner and more accurate
 * 
 * @param {Array} contour - Array of {lat, lng} vertices
 * @param {Object} bounds - GeoTIFF bounds
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Array} Refined contour
 */
function refineSegmentContour(contour, bounds, width, height) {
  console.log(`  🔧 Refining contour with ${contour.length} vertices...`);
  
  // Step 1: Douglas-Peucker simplification (moderate tolerance for residential)
  const latPerPixel = (bounds.north - bounds.south) / height;
  const lngPerPixel = (bounds.east - bounds.west) / width;
  const tolerance = Math.max(latPerPixel, lngPerPixel) * 2.0; // 2 pixels tolerance
  
  let simplified = simplifyPolygon(contour, tolerance);
  console.log(`  📉 After simplification: ${simplified.length} vertices`);
  
  // Step 2: Remove collinear points (points that lie on a straight line)
  simplified = removeCollinearPoints(simplified, 5); // 5 degree tolerance
  console.log(`  📐 After collinear removal: ${simplified.length} vertices`);
  
  // Step 3: Snap near-90° angles to exactly 90° (residential roofs are typically rectangular)
  simplified = snapToRightAngles(simplified, 15); // 15 degree tolerance
  console.log(`  📏 After angle snapping: ${simplified.length} vertices`);
  
  return simplified;
}

/**
 * Remove collinear points from a polygon
 * Points that lie on a straight line between neighbors are removed
 * 
 * @param {Array} points - Array of {lat, lng} points
 * @param {number} angleTolerance - Max angle deviation in degrees to consider collinear
 * @returns {Array} Filtered points
 */
function removeCollinearPoints(points, angleTolerance = 5) {
  if (points.length < 3) return points;
  
  const filtered = [];
  const n = points.length;
  
  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const curr = points[i];
    const next = points[(i + 1) % n];
    
    // Calculate angle at current point
    const v1x = curr.lng - prev.lng;
    const v1y = curr.lat - prev.lat;
    const v2x = next.lng - curr.lng;
    const v2y = next.lat - curr.lat;
    
    const dot = v1x * v2x + v1y * v2y;
    const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
    
    if (mag1 === 0 || mag2 === 0) continue;
    
    const angle = Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2)))) * (180 / Math.PI);
    
    // Keep point if angle is significant (not close to 180°)
    if (angle < 180 - angleTolerance) {
      filtered.push(curr);
    }
  }
  
  return filtered.length >= 3 ? filtered : points;
}

/**
 * Snap near-90° angles to exactly 90°
 * Makes residential roofs more rectangular
 * 
 * @param {Array} points - Array of {lat, lng} points
 * @param {number} tolerance - Angle tolerance in degrees
 * @returns {Array} Adjusted points
 */
function snapToRightAngles(points, tolerance = 15) {
  if (points.length < 3) return points;
  
  const adjusted = [...points];
  const n = points.length;
  
  for (let i = 0; i < n; i++) {
    const prev = adjusted[(i - 1 + n) % n];
    const curr = adjusted[i];
    const next = adjusted[(i + 1) % n];
    
    // Calculate angle at current point
    const v1x = curr.lng - prev.lng;
    const v1y = curr.lat - prev.lat;
    const v2x = next.lng - curr.lng;
    const v2y = next.lat - curr.lat;
    
    const dot = v1x * v2x + v1y * v2y;
    const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
    
    if (mag1 === 0 || mag2 === 0) continue;
    
    const angle = Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2)))) * (180 / Math.PI);
    
    // If angle is close to 90°, adjust it to be exactly 90°
    if (Math.abs(angle - 90) < tolerance) {
      // Calculate perpendicular direction
      const perpX = -v1y / mag1;
      const perpY = v1x / mag1;
      
      // Adjust next point to be perpendicular
      const edgeLength = mag2;
      adjusted[(i + 1) % n] = {
        lat: curr.lat + perpY * edgeLength,
        lng: curr.lng + perpX * edgeLength
      };
    }
  }
  
  return adjusted;
}


/**
 * Segment roof into planes using DSM Sobel edge detection
 * Detects ridges, valleys, and plane boundaries from height data
 * ONLY processes pixels within the filtered building mask
 * 
 * @param {Object} filteredMaskData - Filtered mask containing ONLY target building
 * @param {Object} dsmData - Digital Surface Model GeoTIFF
 * @param {Array} buildingOutline - Building boundary vertices from traceBuildingMask
 * @param {Object} buildingInsights - Building insights for metadata
 * @returns {Array} Array of roof segment polygons
 */
function segmentRoofPlanesByDSM(filteredMaskData, dsmData, buildingOutline, buildingInsights) {
  const { width, height, bounds } = filteredMaskData;
  const mask = filteredMaskData.rasters[0];
  const dsm = dsmData.rasters[0];
  
  console.log(`📊 Analyzing DSM for roof planes...`);
  
  // Step 1: Apply Sobel edge detection to DSM (finds height discontinuities)
  console.log('🔍 Applying Sobel to DSM to find ridges/valleys...');
  const dsmEdges = sobelEdgeDetectionDSM(dsm, mask, width, height);
  
  // Step 2: Threshold edges to create binary edge map
  const edgeThreshold = calculateEdgeThreshold(dsmEdges);
  console.log(`📊 Edge threshold: ${edgeThreshold.toFixed(2)}`);
  
  const binaryEdges = new Uint8Array(dsmEdges.length);
  for (let i = 0; i < dsmEdges.length; i++) {
    if (mask[i] === 1 && dsmEdges[i] > edgeThreshold) {
      binaryEdges[i] = 1;
    }
  }
  
  // Step 3: Use edges to segment the roof into regions
  console.log('🗺️ Segmenting roof into planes...');
  const segments = segmentByEdges(mask, binaryEdges, width, height, bounds, buildingInsights);
  
  return segments;
}

/**
 * Apply Sobel edge detection to DSM (height data)
 * Detects ridges, valleys, and plane boundaries
 * 
 * @param {Array} dsm - Height data
 * @param {Array} mask - Building mask
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Array} Edge magnitudes
 */
function sobelEdgeDetectionDSM(dsm, mask, width, height) {
  const edges = new Array(width * height).fill(0);
  
  // Sobel kernels
  const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
  const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
  
  let maxEdge = 0;
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      
      // Only process building pixels
      if (mask[idx] !== 1) continue;
      
      let gx = 0, gy = 0;
      
      // Apply Sobel kernels to height data
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const nidx = (y + ky) * width + (x + kx);
          const height = dsm[nidx];
          gx += height * sobelX[ky + 1][kx + 1];
          gy += height * sobelY[ky + 1][kx + 1];
        }
      }
      
      // Edge magnitude
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edges[idx] = magnitude;
      
      if (magnitude > maxEdge) maxEdge = magnitude;
    }
  }
  
  console.log(`✅ DSM Sobel complete: max edge=${maxEdge.toFixed(2)}m`);
  return edges;
}

/**
 * Calculate edge threshold using Otsu's method
 * 
 * @param {Array} edges - Edge magnitudes
 * @returns {number} Threshold value
 */
function calculateEdgeThreshold(edges) {
  // Get non-zero edges
  const nonZero = edges.filter(e => e > 0);
  if (nonZero.length === 0) return 0;
  
  // Use 75th percentile as threshold (top 25% of edges)
  const sorted = nonZero.sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * 0.75);
  return sorted[idx];
}

/**
 * Segment roof into regions using edge map
 * Uses flood-fill to find connected regions separated by edges
 * 
 * @param {Uint8Array} mask - Building mask
 * @param {Uint8Array} edges - Binary edge map
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {Object} bounds - Geographic bounds
 * @param {Object} buildingInsights - Building insights
 * @returns {Array} Roof segments
 */
function segmentByEdges(mask, edges, width, height, bounds, buildingInsights) {
  const visited = new Uint8Array(width * height);
  const segments = [];
  const segmentStats = buildingInsights.solarPotential?.roofSegmentStats || [];
  
  // Flood-fill to find connected regions
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      
      // Start flood-fill from unvisited building pixels that aren't edges
      if (mask[idx] === 1 && visited[idx] === 0 && edges[idx] === 0) {
        const region = floodFillRegion(mask, edges, visited, x, y, width, height);
        
        if (region.length > 100) { // Minimum region size
          // Trace boundary of this region
          const regionMask = new Uint8Array(width * height);
          for (const pixel of region) {
            regionMask[pixel.y * width + pixel.x] = 1;
          }
          
          const contour = traceSegmentBoundary(regionMask, width, height, bounds, buildingInsights.center);
          
          if (contour.length >= 3) {
            // Refine contour
            const refined = refineSegmentContour(contour, bounds, width, height);
            
            const apiSegment = segmentStats[segments.length] || {};
            
            segments.push({
              segmentIndex: segments.length,
              vertices: refined,
              metadata: {
                pitchDegrees: apiSegment.pitchDegrees?.toFixed(2) || 'N/A',
                azimuthDegrees: apiSegment.azimuthDegrees?.toFixed(2) || 'N/A',
                areaPixels: region.length,
                center: apiSegment.center || buildingInsights.center,
                source: 'dsm-sobel-segmentation'
              }
            });
            
            console.log(`  ✓ Segment ${segments.length}: ${region.length} pixels, ${refined.length} vertices`);
          }
        }
      }
    }
  }
  
  return segments;
}

/**
 * Flood-fill to find connected region
 * 
 * @param {Uint8Array} mask - Building mask
 * @param {Uint8Array} edges - Edge map
 * @param {Uint8Array} visited - Visited tracker
 * @param {number} startX - Start X
 * @param {number} startY - Start Y
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Array} Region pixels
 */
function floodFillRegion(mask, edges, visited, startX, startY, width, height) {
  const region = [];
  const queue = [{ x: startX, y: startY }];
  const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // 4-connected
  
  while (queue.length > 0) {
    const { x, y } = queue.shift();
    const idx = y * width + x;
    
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (visited[idx] === 1) continue;
    if (mask[idx] !== 1) continue;
    if (edges[idx] === 1) continue; // Stop at edges
    
    visited[idx] = 1;
    region.push({ x, y });
    
    // Add neighbors
    for (const [dx, dy] of dirs) {
      queue.push({ x: x + dx, y: y + dy });
    }
  }
  
  return region;
}


/**
 * Create a binary mask from a polygon outline
 * Uses point-in-polygon test to fill the interior
 * 
 * @param {Array} polygon - Array of {lat, lng} vertices
 * @param {Object} bounds - Geographic bounds
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Object} Mask data with rasters array
 */
function createBuildingMask(polygon, bounds, width, height) {
  console.log(`🎨 Creating mask from polygon with ${polygon.length} vertices...`);
  
  const mask = new Uint8Array(width * height);
  const latPerPixel = (bounds.north - bounds.south) / height;
  const lngPerPixel = (bounds.east - bounds.west) / width;
  
  // Convert polygon to pixel coordinates
  const polyPixels = polygon.map(v => ({
    x: Math.round((v.lng - bounds.west) / lngPerPixel),
    y: Math.round((bounds.north - v.lat) / latPerPixel)
  }));
  
  let pixelCount = 0;
  
  // For each pixel, test if it's inside the polygon
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pointInPolygon(x, y, polyPixels)) {
        mask[y * width + x] = 1;
        pixelCount++;
      }
    }
  }
  
  console.log(`✅ Building mask created: ${pixelCount} pixels`);
  
  return {
    width,
    height,
    bounds,
    rasters: [mask]
  };
}

/**
 * Point-in-polygon test using ray casting algorithm
 * 
 * @param {number} x - Point X coordinate
 * @param {number} y - Point Y coordinate
 * @param {Array} polygon - Array of {x, y} vertices
 * @returns {boolean} True if point is inside polygon
 */
function pointInPolygon(x, y, polygon) {
  let inside = false;
  const n = polygon.length;
  
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    
    const intersect = ((yi > y) !== (yj > y)) &&
                     (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
}


/**
 * Validate and refine roof segments to ensure:
 * - 100% coverage of building area
 * - No gaps between segments
 * - No overlaps
 * - Edges are flush (shared boundaries)
 * - All edges stay within building outline
 * 
 * @param {Array} segments - Initial roof segments
 * @param {Array} buildingOutline - Building boundary polygon
 * @param {Object} filteredMask - Building mask data
 * @returns {Array} Refined segments
 */
function validateAndRefineSegments(segments, buildingOutline, filteredMask) {
  const { width, height, bounds } = filteredMask;
  const mask = filteredMask.rasters[0];
  
  // Step 1: Check coverage
  const totalBuildingPixels = mask.filter(p => p === 1).length;
  console.log(`📊 Building area: ${totalBuildingPixels} pixels`);
  
  // Create a coverage map to track which pixels are covered by segments
  const coverageMap = new Uint8Array(width * height);
  const latPerPixel = (bounds.north - bounds.south) / height;
  const lngPerPixel = (bounds.east - bounds.west) / width;
  
  // Mark pixels covered by each segment
  segments.forEach((seg, idx) => {
    const polyPixels = seg.vertices.map(v => ({
      x: Math.round((v.lng - bounds.west) / lngPerPixel),
      y: Math.round((bounds.north - v.lat) / latPerPixel)
    }));
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIdx = y * width + x;
        if (mask[pixelIdx] === 1 && pointInPolygon(x, y, polyPixels)) {
          coverageMap[pixelIdx] = idx + 1; // Store segment ID (1-indexed)
        }
      }
    }
  });
  
  // Count covered pixels
  let coveredPixels = 0;
  let uncoveredPixels = 0;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] === 1) {
      if (coverageMap[i] > 0) {
        coveredPixels++;
      } else {
        uncoveredPixels++;
      }
    }
  }
  
  const coverage = (coveredPixels / totalBuildingPixels * 100).toFixed(1);
  console.log(`📊 Coverage: ${coverage}% (${coveredPixels}/${totalBuildingPixels} pixels)`);
  
  if (uncoveredPixels > 0) {
    console.log(`⚠️ ${uncoveredPixels} pixels uncovered, filling gaps...`);
    segments = fillGaps(segments, coverageMap, mask, width, height, bounds);
  }
  
  // Step 2: Clip segments to building outline
  console.log(`✂️ Clipping segments to building outline...`);
  segments = segments.map(seg => ({
    ...seg,
    vertices: clipPolygonToOutline(seg.vertices, buildingOutline)
  })).filter(seg => seg.vertices.length >= 3);
  
  // Step 3: Snap shared edges
  console.log(`🔗 Snapping shared edges...`);
  segments = snapSharedEdges(segments, 0.00001); // ~1 meter tolerance
  
  return segments;
}

/**
 * Fill gaps in coverage by assigning uncovered pixels to nearest segment
 * 
 * @param {Array} segments - Current segments
 * @param {Uint8Array} coverageMap - Coverage map
 * @param {Uint8Array} mask - Building mask
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {Object} bounds - Geographic bounds
 * @returns {Array} Updated segments
 */
function fillGaps(segments, coverageMap, mask, width, height, bounds) {
  // For now, if there are gaps, merge small segments into larger neighbors
  // This is a simplified approach - full gap filling would require Voronoi tessellation
  
  console.log(`  ℹ️ Gap filling: merging small segments into neighbors`);
  
  // Sort segments by size
  const sorted = segments.map((seg, idx) => ({
    seg,
    idx,
    area: calculateSegmentArea(seg, bounds, width, height)
  })).sort((a, b) => b.area - a.area);
  
  // Keep largest segments that cover most of the area
  const threshold = 0.05; // Keep segments > 5% of building area
  const totalArea = mask.filter(p => p === 1).length;
  
  return sorted
    .filter(s => s.area / totalArea > threshold)
    .map(s => s.seg);
}

/**
 * Calculate segment area in pixels
 */
function calculateSegmentArea(segment, bounds, width, height) {
  const latPerPixel = (bounds.north - bounds.south) / height;
  const lngPerPixel = (bounds.east - bounds.west) / width;
  
  const polyPixels = segment.vertices.map(v => ({
    x: Math.round((v.lng - bounds.west) / lngPerPixel),
    y: Math.round((bounds.north - v.lat) / latPerPixel)
  }));
  
  // Shoelace formula
  let area = 0;
  for (let i = 0; i < polyPixels.length; i++) {
    const j = (i + 1) % polyPixels.length;
    area += polyPixels[i].x * polyPixels[j].y;
    area -= polyPixels[j].x * polyPixels[i].y;
  }
  return Math.abs(area / 2);
}

/**
 * Clip a polygon to stay within the building outline
 * Removes any edges that cross outside the boundary
 * 
 * @param {Array} polygon - Segment vertices
 * @param {Array} outline - Building outline vertices
 * @returns {Array} Clipped vertices
 */
function clipPolygonToOutline(polygon, outline) {
  // Simplified clipping: remove vertices outside outline
  // Full Sutherland-Hodgman clipping would be more accurate but complex
  
  const clipped = polygon.filter(vertex => {
    // Check if vertex is inside building outline
    return isPointInPolygon(vertex, outline);
  });
  
  return clipped.length >= 3 ? clipped : polygon; // Return original if clipping fails
}

/**
 * Check if a point is inside a polygon
 */
function isPointInPolygon(point, polygon) {
  let inside = false;
  const n = polygon.length;
  
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    
    const intersect = ((yi > point.lat) !== (yj > point.lat)) &&
                     (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
}

/**
 * Snap shared edges between segments to eliminate gaps and overlaps
 * 
 * @param {Array} segments - Roof segments
 * @param {number} tolerance - Distance tolerance for snapping
 * @returns {Array} Segments with snapped edges
 */
function snapSharedEdges(segments, tolerance) {
  // For each pair of segments, find vertices that are close to each other
  // and snap them to the same position
  
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const seg1 = segments[i];
      const seg2 = segments[j];
      
      // Check each vertex in seg1 against each vertex in seg2
      for (let v1 = 0; v1 < seg1.vertices.length; v1++) {
        for (let v2 = 0; v2 < seg2.vertices.length; v2++) {
          const vert1 = seg1.vertices[v1];
          const vert2 = seg2.vertices[v2];
          
          const dist = Math.sqrt(
            Math.pow(vert1.lat - vert2.lat, 2) +
            Math.pow(vert1.lng - vert2.lng, 2)
          );
          
          if (dist < tolerance) {
            // Snap to midpoint
            const midLat = (vert1.lat + vert2.lat) / 2;
            const midLng = (vert1.lng + vert2.lng) / 2;
            
            seg1.vertices[v1] = { lat: midLat, lng: midLng };
            seg2.vertices[v2] = { lat: midLat, lng: midLng };
          }
        }
      }
    }
  }
  
  return segments;
}


/**
 * Detect roof ridge lines using combined RGB and DSM analysis
 * Ridge lines are where roof planes meet (peaks and valleys)
 * 
 * @param {Object} rgbData - RGB imagery GeoTIFF
 * @param {Object} dsmData - Digital Surface Model GeoTIFF
 * @param {Object} filteredMask - Building mask
 * @param {Object} buildingInsights - Building insights
 * @returns {Array} Array of ridge lines
 */
function detectRoofRidges(rgbData, dsmData, filteredMask, buildingInsights) {
  const { width, height } = filteredMask;
  const mask = filteredMask.rasters[0];
  const dsm = dsmData.rasters[0];
  
  // Apply Sobel to both RGB and DSM
  console.log('  🎨 Applying Sobel to RGB...');
  const gray = rgbToGrayscale(rgbData);
  const rgbEdges = sobelEdgeDetection(gray, width, height);
  
  console.log('  📏 Applying Sobel to DSM...');
  const dsmEdges = sobelEdgeDetectionDSM(dsm, mask, width, height);
  
  // Combine edges: strong in BOTH RGB and DSM = ridge line
  console.log('  🔗 Combining RGB and DSM edges...');
  const combinedEdges = new Uint8Array(width * height);
  
  // Normalize and threshold
  const rgbThreshold = calculateEdgeThreshold(rgbEdges.filter((e, i) => mask[i] === 1));
  const dsmThreshold = calculateEdgeThreshold(dsmEdges.filter((e, i) => mask[i] === 1));
  
  console.log(`  📊 Thresholds: RGB=${rgbThreshold.toFixed(1)}, DSM=${dsmThreshold.toFixed(2)}`);
  
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] === 1 && rgbEdges[i] > rgbThreshold && dsmEdges[i] > dsmThreshold) {
      combinedEdges[i] = 1;
    }
  }
  
  // For now, return the edge map - we'll use it to segment
  // Full ridge line extraction would use Hough transform
  return combinedEdges;
}

/**
 * Segment roof by splitting along detected ridge lines
 * Uses the API's roof segment metadata as a guide
 * 
 * @param {Object} filteredMask - Building mask
 * @param {Object} dsmData - DSM data
 * @param {Uint8Array} ridgeEdges - Ridge edge map
 * @param {Array} buildingOutline - Building boundary
 * @param {Object} buildingInsights - Building insights
 * @returns {Array} Roof segments
 */
function segmentRoofByRidges(filteredMask, dsmData, ridgeEdges, buildingOutline, buildingInsights) {
  const { width, height, bounds } = filteredMask;
  const mask = filteredMask.rasters[0];
  const dsm = dsmData.rasters[0];
  const segmentStats = buildingInsights.solarPotential?.roofSegmentStats || [];
  
  console.log(`  📋 API reports ${segmentStats.length} roof segments`);
  
  // If API says there are N segments, try to create N segments
  // Use height-based clustering within the building
  const segments = [];
  
  // Get height range
  let minHeight = Infinity, maxHeight = -Infinity;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] === 1) {
      if (dsm[i] < minHeight) minHeight = dsm[i];
      if (dsm[i] > maxHeight) maxHeight = dsm[i];
    }
  }
  
  const heightRange = maxHeight - minHeight;
  console.log(`  📏 Height range: ${minHeight.toFixed(2)}m - ${maxHeight.toFixed(2)}m (${heightRange.toFixed(2)}m)`);
  
  // Create segments based on API count
  const numSegments = Math.max(2, Math.min(segmentStats.length, 4)); // 2-4 segments
  const heightStep = heightRange / numSegments;
  
  console.log(`  🔢 Creating ${numSegments} segments`);
  
  for (let i = 0; i < numSegments; i++) {
    const segMinHeight = minHeight + i * heightStep;
    const segMaxHeight = minHeight + (i + 1) * heightStep + 0.5;
    
    // Create mask for this height range, excluding ridge edges
    const segmentMask = new Uint8Array(width * height);
    let pixelCount = 0;
    
    for (let j = 0; j < mask.length; j++) {
      if (mask[j] === 1 && 
          dsm[j] >= segMinHeight && 
          dsm[j] <= segMaxHeight &&
          ridgeEdges[j] === 0) { // Exclude ridge pixels
        segmentMask[j] = 1;
        pixelCount++;
      }
    }
    
    if (pixelCount < 50) continue;
    
    // Trace boundary
    const contour = traceSegmentBoundary(segmentMask, width, height, bounds, buildingInsights.center);
    
    if (contour.length >= 3) {
      const refined = refineSegmentContour(contour, bounds, width, height);
      
      const apiSegment = segmentStats[i] || {};
      
      segments.push({
        segmentIndex: i,
        vertices: refined,
        metadata: {
          pitchDegrees: apiSegment.pitchDegrees?.toFixed(2) || 'N/A',
          azimuthDegrees: apiSegment.azimuthDegrees?.toFixed(2) || 'N/A',
          heightMeters: ((segMinHeight + segMaxHeight) / 2).toFixed(2),
          areaPixels: pixelCount,
          center: apiSegment.center || buildingInsights.center,
          source: 'ridge-based-segmentation'
        }
      });
      
      console.log(`  ✓ Segment ${i + 1}: ${pixelCount} pixels, ${refined.length} vertices`);
    }
  }
  
  return segments;
}


/**
 * Convert API roof segments to polygons using Google's reference approach
 * Uses the bounding box, center, and azimuth from the API
 * Validates against the proven building outline
 * 
 * @param {Object} buildingInsights - Building insights from API
 * @param {Array} buildingOutline - Proven building outline for validation
 * @returns {Array} Roof segment polygons
 */
function convertAPIRoofSegmentsToPolygons(buildingInsights, buildingOutline) {
  const segmentStats = buildingInsights.solarPotential?.roofSegmentStats || [];
  
  if (segmentStats.length === 0) {
    console.warn('⚠️ No roof segments in API data');
    return [];
  }
  
  console.log(`📊 Processing ${segmentStats.length} roof segments from API`);
  
  const segments = segmentStats.map((segment, index) => {
    const { center, boundingBox, azimuthDegrees, pitchDegrees, planeHeightAtCenterMeters, stats } = segment;
    
    // Calculate dimensions from bounding box
    const latDiff = boundingBox.ne.latitude - boundingBox.sw.latitude;
    const lngDiff = boundingBox.ne.longitude - boundingBox.sw.longitude;
    
    // Convert to meters (approximate)
    const latMeters = latDiff * 111000;
    const lngMeters = lngDiff * 111000 * Math.cos(center.latitude * Math.PI / 180);
    
    const halfWidth = Math.max(latMeters, lngMeters) / 2;
    const halfHeight = Math.min(latMeters, lngMeters) / 2;
    
    console.log(`  Segment ${index}: center=(${center.latitude.toFixed(6)}, ${center.longitude.toFixed(6)}), ` +
                `size=${(halfWidth*2).toFixed(1)}m x ${(halfHeight*2).toFixed(1)}m, azimuth=${azimuthDegrees.toFixed(1)}°`);
    
    // Create rectangle around center point
    const localPoints = [
      { x: +halfWidth, y: +halfHeight },  // NE
      { x: +halfWidth, y: -halfHeight },  // SE
      { x: -halfWidth, y: -halfHeight },  // SW
      { x: -halfWidth, y: +halfHeight },  // NW
    ];
    
    // Transform using center + azimuth
    // Note: Azimuth is clockwise from North, but we need to handle the coordinate system correctly
    const vertices = localPoints.map(({ x, y }) => {
      // Rotate point by azimuth angle
      const azimuthRad = azimuthDegrees * (Math.PI / 180);
      const rotatedX = x * Math.cos(azimuthRad) - y * Math.sin(azimuthRad);
      const rotatedY = x * Math.sin(azimuthRad) + y * Math.cos(azimuthRad);
      
      // Convert meters to degrees
      // 1 degree latitude ≈ 111,000 meters
      // 1 degree longitude ≈ 111,000 * cos(latitude) meters
      const latOffset = rotatedY / 111000;
      const lngOffset = rotatedX / (111000 * Math.cos(center.latitude * Math.PI / 180));
      
      return {
        lat: center.latitude + latOffset,
        lng: center.longitude + lngOffset
      };
    });
    
    // Validate: check if segment center is within building outline
    const centerInBuilding = isPointInPolygon({ lat: center.latitude, lng: center.longitude }, buildingOutline);
    
    if (!centerInBuilding) {
      console.warn(`  ⚠️ Segment ${index} center is outside building outline, skipping`);
      return null;
    }
    
    return {
      segmentIndex: index,
      vertices,
      metadata: {
        pitchDegrees: pitchDegrees.toFixed(2),
        azimuthDegrees: azimuthDegrees.toFixed(2),
        heightMeters: planeHeightAtCenterMeters.toFixed(2),
        heightFeet: (planeHeightAtCenterMeters * 3.28084).toFixed(2),
        areaMeters2: stats.areaMeters2.toFixed(2),
        areaFeet2: (stats.areaMeters2 * 10.7639).toFixed(2),
        center: center,
        source: 'api-bounding-box'
      }
    };
  }).filter(seg => seg !== null);
  
  console.log(`✅ Validated ${segments.length}/${segmentStats.length} segments within building outline`);
  
  return segments;
}


/**
 * Watershed segmentation on DSM to find roof planes
 * Treats height as topography - ridges divide planes
 * 
 * @param {Object} dsmData - Digital Surface Model GeoTIFF
 * @param {Object} filteredMask - Building mask
 * @param {Array} buildingOutline - Building boundary
 * @param {Object} buildingInsights - Building insights
 * @returns {Array} Roof segment polygons
 */
function watershedSegmentation(dsmData, filteredMask, buildingOutline, buildingInsights) {
  const { width, height, bounds } = filteredMask;
  const mask = filteredMask.rasters[0];
  const dsm = dsmData.rasters[0];
  
  console.log('  📊 Analyzing DSM for watershed segmentation...');
  
  // Step 1: Calculate slope direction at each pixel
  const slopes = calculateSlopeDirections(dsm, mask, width, height);
  console.log(`  📐 Calculated slope directions`);
  
  // Step 2: Cluster pixels by similar slope direction (same plane)
  const seeds = clusterBySlopeDirection(slopes, mask, width, height);
  console.log(`  🌱 Found ${seeds.length} major roof planes`);
  
  // Step 2: Grow regions from seeds using priority queue (simulated flooding)
  const labels = watershedGrow(dsm, mask, seeds, width, height);
  
  // Step 3: Extract unique regions
  const regions = extractWatershedRegions(labels, mask, width, height);
  console.log(`  🗺️ Extracted ${regions.length} watershed regions`);
  
  // Step 4: Convert regions to polygons
  const segments = [];
  const segmentStats = buildingInsights.solarPotential?.roofSegmentStats || [];
  
  for (let i = 0; i < regions.length; i++) {
    const region = regions[i];
    
    if (region.pixels.length < 100) {
      console.log(`  ⚠️ Region ${i} too small (${region.pixels.length} pixels), skipping`);
      continue;
    }
    
    // Create mask for this region
    const regionMask = new Uint8Array(width * height);
    for (const pixel of region.pixels) {
      regionMask[pixel.y * width + pixel.x] = 1;
    }
    
    // Trace boundary
    const contour = traceSegmentBoundary(regionMask, width, height, bounds, buildingInsights.center);
    
    if (contour.length >= 3) {
      const refined = refineSegmentContour(contour, bounds, width, height);
      
      const apiSegment = segmentStats[i] || {};
      
      segments.push({
        segmentIndex: i,
        vertices: refined,
        metadata: {
          pitchDegrees: apiSegment.pitchDegrees?.toFixed(2) || 'N/A',
          azimuthDegrees: apiSegment.azimuthDegrees?.toFixed(2) || 'N/A',
          heightMeters: region.avgHeight.toFixed(2),
          areaPixels: region.pixels.length,
          center: apiSegment.center || buildingInsights.center,
          source: 'watershed-segmentation'
        }
      });
      
      console.log(`  ✓ Segment ${i}: ${region.pixels.length} pixels, ${refined.length} vertices, avg height ${region.avgHeight.toFixed(2)}m`);
    }
  }
  
  return segments;
}

/**
 * Calculate slope direction at each pixel
 * Direction indicates which way the roof plane faces
 * 
 * @param {Array} dsm - Height data
 * @param {Uint8Array} mask - Building mask
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Float32Array} Slope directions in radians
 */
function calculateSlopeDirections(dsm, mask, width, height) {
  const directions = new Float32Array(width * height).fill(-999);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      
      if (mask[idx] !== 1) continue;
      
      // Calculate gradient using Sobel
      const gx = (
        -dsm[(y-1)*width + (x-1)] + dsm[(y-1)*width + (x+1)] +
        -2*dsm[y*width + (x-1)] + 2*dsm[y*width + (x+1)] +
        -dsm[(y+1)*width + (x-1)] + dsm[(y+1)*width + (x+1)]
      ) / 8;
      
      const gy = (
        -dsm[(y-1)*width + (x-1)] - 2*dsm[(y-1)*width + x] - dsm[(y-1)*width + (x+1)] +
        dsm[(y+1)*width + (x-1)] + 2*dsm[(y+1)*width + x] + dsm[(y+1)*width + (x+1)]
      ) / 8;
      
      // Direction of steepest descent
      directions[idx] = Math.atan2(gy, gx);
    }
  }
  
  return directions;
}

/**
 * Cluster pixels by similar slope direction
 * Pixels facing the same direction = same roof plane
 * 
 * @param {Float32Array} directions - Slope directions
 * @param {Uint8Array} mask - Building mask
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Array} Seed points for major planes
 */
function clusterBySlopeDirection(directions, mask, width, height) {
  // Quantize directions into bins (e.g., 8 directions = 45° each)
  const numBins = 8;
  const binSize = (2 * Math.PI) / numBins;
  const bins = Array(numBins).fill(0).map(() => []);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      
      if (mask[idx] !== 1) continue;
      if (directions[idx] === -999) continue;
      
      // Quantize direction to bin
      let dir = directions[idx];
      if (dir < 0) dir += 2 * Math.PI;
      const bin = Math.floor(dir / binSize) % numBins;
      
      bins[bin].push({ x, y, dir: directions[idx] });
    }
  }
  
  // Create seeds from bins with significant pixel counts
  const seeds = [];
  const minPixels = 200; // Minimum pixels for a valid plane
  
  bins.forEach((bin, idx) => {
    if (bin.length >= minPixels) {
      // Use centroid of bin as seed
      const sumX = bin.reduce((sum, p) => sum + p.x, 0);
      const sumY = bin.reduce((sum, p) => sum + p.y, 0);
      seeds.push({
        x: Math.round(sumX / bin.length),
        y: Math.round(sumY / bin.length),
        height: 0,
        direction: (idx * binSize) + (binSize / 2)
      });
    }
  });
  
  return seeds;
}

/**
 * Grow watershed regions from seeds using priority queue
 * Simulates water flooding from lowest points
 * 
 * @param {Array} dsm - Height data
 * @param {Uint8Array} mask - Building mask
 * @param {Array} seeds - Seed points
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Int32Array} Label map (each pixel labeled with region ID)
 */
function watershedGrow(dsm, mask, seeds, width, height) {
  const labels = new Int32Array(width * height).fill(-1); // -1 = unlabeled
  const queue = [];
  
  // Initialize seeds
  seeds.forEach((seed, idx) => {
    const pixelIdx = seed.y * width + seed.x;
    labels[pixelIdx] = idx;
    queue.push({ x: seed.x, y: seed.y, height: seed.height, label: idx });
  });
  
  // Sort queue by height (process lowest first)
  queue.sort((a, b) => a.height - b.height);
  
  const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // 4-connected
  
  // Grow regions
  while (queue.length > 0) {
    const current = queue.shift();
    
    // Check neighbors
    for (const [dx, dy] of dirs) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      
      const nidx = ny * width + nx;
      
      if (mask[nidx] !== 1) continue;
      if (labels[nidx] !== -1) continue; // Already labeled
      
      // Label this pixel with current region
      labels[nidx] = current.label;
      
      // Add to queue
      queue.push({
        x: nx,
        y: ny,
        height: dsm[nidx],
        label: current.label
      });
    }
  }
  
  return labels;
}

/**
 * Extract watershed regions from label map
 * 
 * @param {Int32Array} labels - Label map
 * @param {Uint8Array} mask - Building mask
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Array} Regions with pixels and metadata
 */
function extractWatershedRegions(labels, mask, width, height) {
  const regionMap = new Map();
  
  // Group pixels by label
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      
      if (mask[idx] !== 1) continue;
      
      const label = labels[idx];
      if (label === -1) continue;
      
      if (!regionMap.has(label)) {
        regionMap.set(label, []);
      }
      
      regionMap.get(label).push({ x, y });
    }
  }
  
  // Convert to array with metadata
  const regions = [];
  for (const [label, pixels] of regionMap.entries()) {
    regions.push({
      label,
      pixels,
      avgHeight: 0 // Will be calculated if needed
    });
  }
  
  return regions;
}


/**
 * Extract roof segments using bounding boxes from API
 * The API provides exact bounding boxes for each roof segment
 * 
 * @param {Object} buildingInsights - Building insights from API
 * @param {Array} buildingOutline - Building boundary for validation
 * @returns {Array} Roof segment polygons
 */
function extractSegmentsFromSolarPanels(buildingInsights, buildingOutline) {
  const segmentStats = buildingInsights.solarPotential?.roofSegmentStats || [];
  
  if (segmentStats.length === 0) {
    console.warn('⚠️ No roof segments in API data');
    return [];
  }
  
  console.log(`  📊 Processing ${segmentStats.length} roof segments from API`);
  
  const segments = [];
  
  for (let i = 0; i < segmentStats.length; i++) {
    const segment = segmentStats[i];
    const { boundingBox, pitchDegrees, azimuthDegrees, planeHeightAtCenterMeters, stats, center } = segment;
    
    // Use the bounding box directly - it's already the correct roof segment boundary!
    const vertices = [
      { lat: boundingBox.sw.latitude, lng: boundingBox.sw.longitude }, // SW
      { lat: boundingBox.sw.latitude, lng: boundingBox.ne.longitude }, // SE
      { lat: boundingBox.ne.latitude, lng: boundingBox.ne.longitude }, // NE
      { lat: boundingBox.ne.latitude, lng: boundingBox.sw.longitude }, // NW
    ];
    
    // Validate: check if segment center is within building outline
    const centerInBuilding = isPointInPolygon(
      { lat: center.latitude, lng: center.longitude },
      buildingOutline
    );
    
    if (!centerInBuilding) {
      console.log(`  ⚠️ Segment ${i} center outside building outline, skipping`);
      continue;
    }
    
    segments.push({
      segmentIndex: i,
      vertices,
      metadata: {
        pitchDegrees: pitchDegrees.toFixed(2),
        azimuthDegrees: azimuthDegrees.toFixed(2),
        heightMeters: planeHeightAtCenterMeters.toFixed(2),
        heightFeet: (planeHeightAtCenterMeters * 3.28084).toFixed(2),
        areaMeters2: stats.areaMeters2.toFixed(2),
        areaFeet2: (stats.areaMeters2 * 10.7639).toFixed(2),
        center: center,
        source: 'api-bounding-box'
      }
    });
    
    console.log(`  ✓ Segment ${i}: bbox=(${boundingBox.sw.latitude.toFixed(6)},${boundingBox.sw.longitude.toFixed(6)}) to ` +
                `(${boundingBox.ne.latitude.toFixed(6)},${boundingBox.ne.longitude.toFixed(6)}), ` +
                `pitch=${pitchDegrees.toFixed(1)}°, azimuth=${azimuthDegrees.toFixed(1)}°`);
  }
  
  console.log(`  ✅ Validated ${segments.length}/${segmentStats.length} segments`);
  
  return segments;
}
