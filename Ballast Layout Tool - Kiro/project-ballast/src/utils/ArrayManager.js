/**
 * ArrayManager.js
 * Manages solar panel arrays as discrete units that can be positioned, rotated, and manipulated
 * independently before being reconciled into the giant grid format for Excel calculations
 */

/**
 * Array data structure:
 * {
 *   id: unique identifier
 *   origin: { lat, lng } - anchor point for the array
 *   rows: number of panels in horizontal direction
 *   cols: number of panels in vertical direction
 *   rotation: angle in degrees (relative to building's longest edge)
 *   panelPolygons: array of Google Maps Polygon objects
 *   state: 'creating' | 'active' | 'selected'
 * }
 */

export class ArrayManager {
  constructor(formData, setbackPolygon, buildingPolygon, buildingRotation, obstructions = []) {
    this.formData = formData;
    this.setbackPolygon = setbackPolygon;
    this.buildingPolygon = buildingPolygon;
    this.buildingRotation = buildingRotation; // Longest edge angle
    this.obstructions = obstructions; // Array of obstruction objects with setback paths
    this.arrays = [];
    this.nextArrayId = 1;
  }
  
  /**
   * Update obstructions (called after obstruction drawing is complete)
   */
  setObstructions(obstructions) {
    this.obstructions = obstructions;
    console.log('ArrayManager obstructions updated:', obstructions.length);
  }

  /**
   * Calculate panel dimensions in meters
   */
  getPanelDimensions() {
    const panelWidthMeters = parseFloat(this.formData.pv_module_ew_width) * 0.3048;
    const panelLengthMeters = parseFloat(this.formData.pv_module_ns_length) * 0.3048;
    const spacingEWMeters = parseFloat(this.formData.distance_between_panels_ew) * 0.3048;
    const spacingNSMeters = parseFloat(this.formData.distance_between_panels_ns) * 0.3048;

    return {
      width: panelWidthMeters,
      length: panelLengthMeters,
      spacingEW: spacingEWMeters,
      spacingNS: spacingNSMeters,
      unitWidth: panelWidthMeters + spacingEWMeters,
      unitLength: panelLengthMeters + spacingNSMeters
    };
  }

  /**
   * Create a new array at the given origin point
   */
  createArray(originLatLng) {
    const array = {
      id: this.nextArrayId++,
      origin: { lat: originLatLng.lat(), lng: originLatLng.lng() },
      rows: 1,
      cols: 1,
      rowsLeft: 0,   // Panels to the left of origin
      rowsRight: 0,  // Panels to the right of origin
      colsUp: 0,     // Panels above origin (perpendicular to building edge)
      colsDown: 0,   // Panels below origin (perpendicular to building edge)
      rotation: 0, // Relative to building rotation
      panelPolygons: [],
      state: 'creating',
      obstructions: [] // Track obstructed panels within this array
    };

    this.arrays.push(array);
    return array;
  }

  /**
   * Calculate the absolute rotation angle for an array
   */
  getAbsoluteRotation(array) {
    return (this.buildingRotation + array.rotation) % 360;
  }

  /**
   * Generate panel polygons for an array
   */
  generateArrayPanels(array, map) {
    // console.log('generateArrayPanels called:', {
    //   arrayId: array.id,
    //   rows: array.rows,
    //   cols: array.cols,
    //   hasMap: !!map
    // });
    
    // Clear existing panels
    array.panelPolygons.forEach(panel => panel.setMap(null));
    array.panelPolygons = [];

    const dims = this.getPanelDimensions();
    // console.log('Panel dimensions:', dims);
    
    // Use building rotation to align with longest edge
    // Panels extend ALONG the building edge, so we use the building rotation directly
    // But we need to ensure the direction matches the arrow drag direction
    const absoluteRotation = this.buildingRotation + array.rotation;
    // console.log('Panel rotation:', { buildingRotation: this.buildingRotation, arrayRotation: array.rotation, absolute: absoluteRotation });
    
    // Convert to radians - panels should extend along the building edge direction
    // The building rotation is the heading of the longest edge
    const angleRad = absoluteRotation * Math.PI / 180;

    // Calculate rotation vectors for positioning panels along the building edge
    // We want localX to move along the building edge direction
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);

    const origin = new window.google.maps.LatLng(array.origin.lat, array.origin.lng);
    // console.log('Array origin:', origin.toString());

    // Generate panels
    let panelsCreated = 0;
    
    // Calculate total rows and cols: left/up + origin + right/down
    const totalRows = array.rowsLeft + 1 + array.rowsRight;
    const totalCols = array.colsUp + 1 + array.colsDown;
    
    // console.log('🔧 Panel generation:', { 
    //   totalRows, 
    //   rowsLeft: array.rowsLeft, 
    //   rowsRight: array.rowsRight,
    //   totalCols,
    //   colsUp: array.colsUp,
    //   colsDown: array.colsDown,
    //   absoluteRotation 
    // });
    
    for (let row = 0; row < totalRows; row++) {
      for (let col = 0; col < totalCols; col++) {
        // Calculate panel position relative to origin
        // Negative indices go left, positive go right
        const rowOffset = row - array.rowsLeft;
        
        // Calculate distances to move from origin
        // Negative indices go left/up, positive go right/down
        const colOffset = col - array.colsUp;
        
        const distanceAlongEdge = rowOffset * dims.unitWidth;      // Along building edge (rows)
        const distancePerpendicular = colOffset * dims.unitLength; // Perpendicular to edge (columns)

        // if (row < 3 && col === 0) {
        //   console.log(`🔧 Panel [${row},${col}] rowOffset=${rowOffset}, distanceAlongEdge=${distanceAlongEdge}m`);
        // }

        // Use Google Maps computeOffset to move along the building edge
        // First move along the building edge (using building rotation as heading)
        let panelOrigin = origin;
        
        if (distanceAlongEdge !== 0) {
          // Move along building edge - use the building rotation directly as the heading
          panelOrigin = window.google.maps.geometry.spherical.computeOffset(
            panelOrigin,
            Math.abs(distanceAlongEdge),
            distanceAlongEdge > 0 ? absoluteRotation : (absoluteRotation + 180) % 360
          );
        }
        
        if (distancePerpendicular !== 0) {
          // Move perpendicular to building edge (90° from building rotation)
          panelOrigin = window.google.maps.geometry.spherical.computeOffset(
            panelOrigin,
            distancePerpendicular,
            (absoluteRotation + 90) % 360
          );
        }
        
        // if (row < 3 && col === 0) {
        //   console.log(`🔧 Panel [${row},${col}] final position:`, {
        //     panelOrigin: panelOrigin.toString()
        //   });
        // }

        // Create panel corners
        const corners = this.createPanelCorners(panelOrigin, dims, absoluteRotation);

        // Check if panel is inside setback
        const isInsideSetback = corners.every(corner =>
          window.google.maps.geometry.poly.containsLocation(corner, this.setbackPolygon)
        );

        // Check if panel intersects building
        const intersectsBuilding = corners.some(corner =>
          window.google.maps.geometry.poly.containsLocation(corner, this.buildingPolygon)
        );
        
        // Check if panel is inside any obstruction setback
        const isInObstructionSetback = this.obstructions && this.obstructions.length > 0 
          ? corners.some(corner => {
              // Check each obstruction setback
              for (const obstruction of this.obstructions) {
                if (!obstruction.setbackPath || obstruction.setbackPath.length < 3) {
                  continue;
                }
                
                // Create temporary polygon for checking
                const setbackPolygon = new window.google.maps.Polygon({
                  paths: obstruction.setbackPath
                });
                
                const isInside = window.google.maps.geometry.poly.containsLocation(corner, setbackPolygon);
                setbackPolygon.setMap(null); // Clean up
                
                if (isInside) {
                  return true;
                }
              }
              return false;
            })
          : false;

        // if (row === 0 && col < 3) {
        //   console.log(`Panel [${row},${col}]:`, {
        //     isInsideSetback,
        //     intersectsBuilding,
        //     isInObstructionSetback,
        //     panelOrigin: panelOrigin.toString()
        //   });
        // }

        // Only create visible panels (not in obstruction setbacks)
        if (isInsideSetback && intersectsBuilding && !isInObstructionSetback) {
          const panel = new window.google.maps.Polygon({
            paths: corners,
            map: map,
            fillColor: "#4CAF50", // Green preview color
            fillOpacity: 0.6,      // More visible
            strokeWeight: 2,       // Thicker border
            strokeColor: "#FFFFFF", // White border
            clickable: true,
            zIndex: 1000
          });

          panel.arrayId = array.id;
          panel.arrayIndex = { row, col };
          panel.isInsideSetback = true;
          panel.state = 'normal';

          array.panelPolygons.push(panel);
          panelsCreated++;
        }
      }
    }

    // console.log('Panels created:', panelsCreated, 'Total in array:', array.panelPolygons.length);
    return array.panelPolygons;
  }

  /**
   * Create the four corners of a panel aligned with building rotation
   */
  createPanelCorners(origin, dims, rotation) {
    // Create panel corners by moving from origin along building-aligned directions
    // Panel width extends along the building edge (rotation direction)
    // Panel length extends perpendicular to the building edge (rotation + 90°)
    
    const corners = [];
    
    // Corner 0: origin (bottom-left)
    corners.push(origin);
    
    // Corner 1: move along building edge by panel width (bottom-right)
    corners.push(
      window.google.maps.geometry.spherical.computeOffset(
        origin,
        dims.width,
        rotation
      )
    );
    
    // Corner 2: from corner 1, move perpendicular by panel length (top-right)
    corners.push(
      window.google.maps.geometry.spherical.computeOffset(
        corners[1],
        dims.length,
        (rotation + 90) % 360
      )
    );
    
    // Corner 3: from origin, move perpendicular by panel length (top-left)
    corners.push(
      window.google.maps.geometry.spherical.computeOffset(
        origin,
        dims.length,
        (rotation + 90) % 360
      )
    );
    
    return corners;
  }

  /**
   * Update array row count (horizontal drag)
   */
  updateArrayRows(array, rows, map) {
    array.rows = Math.max(1, rows);
    return this.generateArrayPanels(array, map);
  }

  /**
   * Update left arrow (panels going left from origin)
   */
  updateArrayRowsLeft(array, count, map) {
    array.rowsLeft = Math.max(0, count);
    array.rows = array.rowsLeft + 1 + array.rowsRight;
    // console.log('Updated left:', { rowsLeft: array.rowsLeft, totalRows: array.rows });
    return this.generateArrayPanels(array, map);
  }

  /**
   * Update right arrow (panels going right from origin)
   */
  updateArrayRowsRight(array, count, map) {
    array.rowsRight = Math.max(0, count);
    array.rows = array.rowsLeft + 1 + array.rowsRight;
    // console.log('Updated right:', { rowsRight: array.rowsRight, totalRows: array.rows });
    return this.generateArrayPanels(array, map);
  }

  /**
   * Update array column count (vertical drag)
   */
  updateArrayCols(array, cols, map) {
    array.cols = Math.max(1, cols);
    return this.generateArrayPanels(array, map);
  }

  /**
   * Update up arrow (panels going up from origin - perpendicular to building edge)
   */
  updateArrayColsUp(array, count, map) {
    array.colsUp = Math.max(0, count);
    array.cols = array.colsUp + 1 + array.colsDown;
    // console.log('Updated up:', { colsUp: array.colsUp, totalCols: array.cols });
    return this.generateArrayPanels(array, map);
  }

  /**
   * Update down arrow (panels going down from origin - perpendicular to building edge)
   */
  updateArrayColsDown(array, count, map) {
    array.colsDown = Math.max(0, count);
    array.cols = array.colsUp + 1 + array.colsDown;
    // console.log('Updated down:', { colsDown: array.colsDown, totalCols: array.cols });
    return this.generateArrayPanels(array, map);
  }

  /**
   * Update array rotation
   */
  updateArrayRotation(array, rotation, map) {
    array.rotation = rotation % 360;
    return this.generateArrayPanels(array, map);
  }

  /**
   * Move array to new origin
   */
  moveArray(array, newOriginLatLng, map) {
    array.origin = { lat: newOriginLatLng.lat(), lng: newOriginLatLng.lng() };
    return this.generateArrayPanels(array, map);
  }

  /**
   * Delete an array
   */
  deleteArray(arrayId) {
    const index = this.arrays.findIndex(a => a.id === arrayId);
    if (index !== -1) {
      const array = this.arrays[index];
      array.panelPolygons.forEach(panel => panel.setMap(null));
      this.arrays.splice(index, 1);
    }
  }

  /**
   * Get array by ID
   */
  getArray(arrayId) {
    return this.arrays.find(a => a.id === arrayId);
  }

  /**
   * Select an array (highlight it)
   */
  selectArray(arrayId) {
    this.arrays.forEach(array => {
      const isSelected = array.id === arrayId;
      array.state = isSelected ? 'selected' : 'active';
      
      array.panelPolygons.forEach(panel => {
        if (panel.state !== 'obstructed') {
          panel.setOptions({
            strokeWeight: isSelected ? 2 : 1,
            strokeColor: isSelected ? "#00FF00" : "#000000",
            fillOpacity: isSelected ? 0.5 : 0.35
          });
        }
      });
    });
  }

  /**
   * Mark a panel as obstructed
   */
  markPanelObstructed(arrayId, row, col, height) {
    const array = this.getArray(arrayId);
    if (!array) return;

    const panel = array.panelPolygons.find(p => 
      p.arrayIndex.row === row && p.arrayIndex.col === col
    );

    if (panel) {
      panel.state = 'obstructed';
      panel.obstructionHeight = height;
      panel.setOptions({
        fillColor: "#FF0000",
        fillOpacity: 0.5,
        zIndex: 1002
      });

      // Track obstruction in array
      array.obstructions.push({ row, col, height });
    }
  }

  /**
   * Clear obstruction from a panel
   */
  clearPanelObstruction(arrayId, row, col) {
    const array = this.getArray(arrayId);
    if (!array) return;

    const panel = array.panelPolygons.find(p => 
      p.arrayIndex.row === row && p.arrayIndex.col === col
    );

    if (panel) {
      panel.state = 'normal';
      delete panel.obstructionHeight;
      panel.setOptions({
        fillColor: "#0000FF",
        fillOpacity: 0.35,
        zIndex: 1000
      });

      // Remove from obstructions list
      array.obstructions = array.obstructions.filter(
        o => !(o.row === row && o.col === col)
      );
    }
  }

  /**
   * Get all arrays
   */
  getAllArrays() {
    return this.arrays;
  }

  /**
   * Clear all arrays
   */
  clearAllArrays() {
    this.arrays.forEach(array => {
      array.panelPolygons.forEach(panel => panel.setMap(null));
    });
    this.arrays = [];
    this.nextArrayId = 1;
  }
}
