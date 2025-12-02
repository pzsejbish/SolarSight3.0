/**
 * ArrayToGridReconciler.js
 * Converts user-created arrays back into the "giant grid" format
 * that engineers use in Excel calculations
 */

/**
 * Reconciles multiple arrays into a single giant grid representation
 * for each polygon/building outline
 */
export class ArrayToGridReconciler {
  constructor(formData, buildingPolygon, setbackPolygon, buildingRotation) {
    this.formData = formData;
    this.buildingPolygon = buildingPolygon;
    this.setbackPolygon = setbackPolygon;
    this.buildingRotation = buildingRotation;
  }

  /**
   * Get panel dimensions in meters
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
   * Calculate the bounding box that encompasses all arrays
   */
  calculateGlobalBounds(arrays) {
    if (arrays.length === 0) return null;

    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    arrays.forEach(array => {
      array.panelPolygons.forEach(panel => {
        panel.getPath().forEach(latLng => {
          minLat = Math.min(minLat, latLng.lat());
          maxLat = Math.max(maxLat, latLng.lat());
          minLng = Math.min(minLng, latLng.lng());
          maxLng = Math.max(maxLng, latLng.lng());
        });
      });
    });

    return {
      minLat, maxLat, minLng, maxLng,
      centerLat: (minLat + maxLat) / 2,
      centerLng: (minLng + maxLng) / 2
    };
  }

  /**
   * Convert lat/lng to grid coordinates aligned with building rotation
   */
  latLngToGridCoords(latLng, origin, rotation) {
    const angleRad = rotation * Math.PI / 180;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);

    // Calculate offset in meters
    const latDiff = (latLng.lat() - origin.lat) * 111111;
    const lngDiff = (latLng.lng() - origin.lng) * 111111 * Math.cos(origin.lat * Math.PI / 180);

    // Rotate to align with building
    const x = lngDiff * cos + latDiff * sin;
    const y = -lngDiff * sin + latDiff * cos;

    return { x, y };
  }

  /**
   * Snap a coordinate to the nearest grid position
   */
  snapToGrid(coord, unitSize) {
    return Math.round(coord / unitSize);
  }

  /**
   * Generate the giant grid from arrays
   */
  reconcileArraysToGrid(arrays) {
    if (arrays.length === 0) {
      return {
        grid: [],
        metadata: {
          rows: 0,
          cols: 0,
          totalPanels: 0,
          selectedPanels: 0
        }
      };
    }

    const dims = this.getPanelDimensions();
    const bounds = this.calculateGlobalBounds(arrays);
    
    // Use building rotation as the grid alignment
    const gridRotation = this.buildingRotation;
    
    // Calculate grid origin (southwest corner of bounds)
    const gridOrigin = {
      lat: bounds.minLat,
      lng: bounds.minLng
    };

    // Calculate grid dimensions needed to cover all arrays
    const swCorner = new window.google.maps.LatLng(bounds.minLat, bounds.minLng);
    const neCorner = new window.google.maps.LatLng(bounds.maxLat, bounds.maxLng);
    
    const widthMeters = window.google.maps.geometry.spherical.computeDistanceBetween(
      new window.google.maps.LatLng(bounds.centerLat, bounds.minLng),
      new window.google.maps.LatLng(bounds.centerLat, bounds.maxLng)
    );
    
    const heightMeters = window.google.maps.geometry.spherical.computeDistanceBetween(
      new window.google.maps.LatLng(bounds.minLat, bounds.centerLng),
      new window.google.maps.LatLng(bounds.maxLat, bounds.centerLng)
    );

    // Calculate grid size with padding
    const gridCols = Math.ceil(widthMeters / dims.unitWidth) + 2;
    const gridRows = Math.ceil(heightMeters / dims.unitLength) + 2;

    console.log('Grid dimensions:', { gridRows, gridCols, widthMeters, heightMeters });

    // Initialize grid with "non-value" (outside building)
    const grid = Array.from({ length: gridRows }, () => 
      Array(gridCols).fill('non-value')
    );

    // Map to track which grid cells have panels
    const gridCellMap = new Map();

    // Process each array
    arrays.forEach(array => {
      array.panelPolygons.forEach(panel => {
        // Get panel center
        const bounds = new window.google.maps.LatLngBounds();
        panel.getPath().forEach(latLng => bounds.extend(latLng));
        const center = bounds.getCenter();

        // Convert to grid coordinates
        const gridCoords = this.latLngToGridCoords(
          { lat: center.lat(), lng: center.lng() },
          gridOrigin,
          gridRotation
        );

        // Snap to grid
        const gridRow = this.snapToGrid(gridCoords.y, dims.unitLength);
        const gridCol = this.snapToGrid(gridCoords.x, dims.unitWidth);

        // Ensure within bounds
        if (gridRow >= 0 && gridRow < gridRows && gridCol >= 0 && gridCol < gridCols) {
          const key = `${gridRow},${gridCol}`;
          
          // Check if panel is obstructed
          if (panel.state === 'obstructed') {
            grid[gridRow][gridCol] = {
              isObstructed: true,
              height: panel.obstructionHeight?.toString() || "0"
            };
          } else {
            // Panel is available (false = not selected, true = selected)
            // For now, all panels in arrays are considered "selected"
            grid[gridRow][gridCol] = true;
          }

          gridCellMap.set(key, {
            arrayId: panel.arrayId,
            arrayIndex: panel.arrayIndex,
            state: panel.state
          });
        }
      });
    });

    // Mark cells inside setback but without panels as available (false)
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        if (grid[row][col] === 'non-value') {
          // Calculate lat/lng for this grid cell
          const x = col * dims.unitWidth;
          const y = row * dims.unitLength;
          
          // Rotate back to world coordinates
          const angleRad = gridRotation * Math.PI / 180;
          const cos = Math.cos(angleRad);
          const sin = Math.sin(angleRad);
          
          const worldX = x * cos - y * sin;
          const worldY = x * sin + y * cos;
          
          const latOffset = worldY / 111111;
          const lngOffset = worldX / (111111 * Math.cos(gridOrigin.lat * Math.PI / 180));
          
          const cellLatLng = new window.google.maps.LatLng(
            gridOrigin.lat + latOffset,
            gridOrigin.lng + lngOffset
          );

          // Check if inside setback
          const insideSetback = window.google.maps.geometry.poly.containsLocation(
            cellLatLng,
            this.setbackPolygon
          );

          const insideBuilding = window.google.maps.geometry.poly.containsLocation(
            cellLatLng,
            this.buildingPolygon
          );

          if (insideSetback && insideBuilding) {
            grid[row][col] = false; // Available but not selected
          }
        }
      }
    }

    // Calculate statistics
    let totalPanels = 0;
    let selectedPanels = 0;
    let obstructedPanels = 0;

    grid.forEach(row => {
      row.forEach(cell => {
        if (cell === true) {
          totalPanels++;
          selectedPanels++;
        } else if (cell === false) {
          totalPanels++;
        } else if (typeof cell === 'object' && cell.isObstructed) {
          totalPanels++;
          obstructedPanels++;
        }
      });
    });

    console.log('Grid reconciliation complete:', {
      rows: gridRows,
      cols: gridCols,
      totalPanels,
      selectedPanels,
      obstructedPanels
    });

    return {
      grid,
      metadata: {
        rows: gridRows,
        cols: gridCols,
        totalPanels,
        selectedPanels,
        obstructedPanels,
        gridOrigin,
        gridRotation
      }
    };
  }

  /**
   * Convert grid to the format expected by the API
   */
  gridToAPIFormat(grid) {
    return grid.map(row => 
      row.map(cell => {
        if (typeof cell === 'object' && cell.isObstructed) {
          return cell.height;
        }
        return cell;
      })
    );
  }

  /**
   * Main reconciliation method - converts arrays to API-ready format
   */
  reconcile(arrays) {
    const { grid, metadata } = this.reconcileArraysToGrid(arrays);
    const apiGrid = this.gridToAPIFormat(grid);

    return {
      layout: apiGrid,
      metadata
    };
  }
}
