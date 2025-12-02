// PolygonProcessing.js

export const generateSetbackPolygon = (originalPath, setbackDistance) => {
  const setbackPath = [];
  const len = originalPath.length;

  // Determine the winding order of the polygon
  let area = 0;
  for (let i = 0; i < len; i++) {
    const j = (i + 1) % len;
    area += (originalPath[j].lng() - originalPath[i].lng()) * (originalPath[j].lat() + originalPath[i].lat());
  }
  const isClockwise = area > 0;

  for (let i = 0; i < len; i++) {
    const prev = originalPath[(i - 1 + len) % len];
    const curr = originalPath[i];
    const next = originalPath[(i + 1) % len];

    // Calculate vectors
    const toPrev = { lat: prev.lat() - curr.lat(), lng: prev.lng() - curr.lng() };
    const toNext = { lat: next.lat() - curr.lat(), lng: next.lng() - curr.lng() };

    // Normalize vectors
    const toPrevLength = Math.sqrt(toPrev.lat * toPrev.lat + toPrev.lng * toPrev.lng);
    const toNextLength = Math.sqrt(toNext.lat * toNext.lat + toNext.lng * toNext.lng);
    const toPrevNorm = { lat: toPrev.lat / toPrevLength, lng: toPrev.lng / toPrevLength };
    const toNextNorm = { lat: toNext.lat / toNextLength, lng: toNext.lng / toNextLength };

    // Calculate cross product to determine if it's an inner or outer corner
    const crossProduct = toPrevNorm.lat * toNextNorm.lng - toPrevNorm.lng * toNextNorm.lat;

    // Calculate bisector vector
    let bisector;
    if ((isClockwise && crossProduct > 0) || (!isClockwise && crossProduct < 0)) {
      // Outer corner (convex)
      bisector = {
        lat: toPrevNorm.lat + toNextNorm.lat,
        lng: toPrevNorm.lng + toNextNorm.lng
      };
    } else {
      // Inner corner (concave)
      bisector = {
        lat: -toPrevNorm.lat - toNextNorm.lat,
        lng: -toPrevNorm.lng - toNextNorm.lng
      };
    }

    // Normalize bisector
    const bisectorLength = Math.sqrt(bisector.lat * bisector.lat + bisector.lng * bisector.lng);
    const bisectorNorm = {
      lat: bisector.lat / bisectorLength,
      lng: bisector.lng / bisectorLength
    };

    // Calculate angle between vectors
    const dotProduct = toPrevNorm.lat * toNextNorm.lat + toPrevNorm.lng * toNextNorm.lng;
    const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct)));

    // Calculate setback distance for this corner
    const cornerSetback = -(setbackDistance / Math.sin(angle / 2));

    // Calculate setback point
    const setbackPoint = new window.google.maps.LatLng(
      curr.lat() + (cornerSetback * bisectorNorm.lat) / 111111,
      curr.lng() + (cornerSetback * bisectorNorm.lng) / (111111 * Math.cos(curr.lat() * Math.PI / 180))
    );

    setbackPath.push(setbackPoint);
  }

  return setbackPath;
};



export const findLongestEdge = (coordinates) => {
  if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 3) {
    console.error('Invalid coordinates:', coordinates);
    return { angle: 0, longestEdgeIndex: -1 };
  }

  let longestEdge = 0;
  let longestEdgeIndex = -1;
  let longestEdgeStart, longestEdgeEnd;
  let signedArea = 0;

  for (let i = 0; i < coordinates.length; i++) {
    const start = coordinates[i];
    const end = coordinates[(i + 1) % coordinates.length];

    const startLatLng = new window.google.maps.LatLng(start.lat, start.lng);
    const endLatLng = new window.google.maps.LatLng(end.lat, end.lng);

    const distance = window.google.maps.geometry.spherical.computeDistanceBetween(startLatLng, endLatLng);

    if (distance > longestEdge) {
      longestEdge = distance;
      longestEdgeIndex = i;
      longestEdgeStart = startLatLng;
      longestEdgeEnd = endLatLng;
    }

    // Calculate signed area for clockwise determination
    signedArea += (end.lng - start.lng) * (end.lat + start.lat);
  }

  if (longestEdgeIndex === -1) {
    console.error('No valid edges found in the polygon');
    return { angle: 0, longestEdgeIndex: -1 };
  }

  // Determine if the polygon is clockwise
  const isClockwise = signedArea > 0;

  // Calculate the heading of the longest edge
  let heading = window.google.maps.geometry.spherical.computeHeading(longestEdgeStart, longestEdgeEnd);

  // Normalize the heading to be between 0 and 360 degrees
  heading = (heading + 360) % 360;

  console.log('Longest edge details:', {
    startLat: longestEdgeStart.lat(),
    startLng: longestEdgeStart.lng(),
    endLat: longestEdgeEnd.lat(),
    endLng: longestEdgeEnd.lng(),
    heading: heading,
    isClockwise: isClockwise
  });

  return { 
    angle: heading,
    longestEdgeIndex,
    start: longestEdgeStart,
    end: longestEdgeEnd,
    isClockwise
  };
};



// Updated processPolygon function to support both north/south and east/west systems

export const processPolygon = (
  coordinates, 
  setbackPolygon, 
  mapRef, 
  formData,  
  gridOffsetX=0, 
  gridOffsetY=0, 
  totalRotationAngle, 
  isClockwise, 
) => {
  // Extract panel dimensions and spacing
  const { 
    pv_module_ew_width: width, 
    pv_module_ns_length: length, 
    distance_between_panels_ns: spacingNS, 
    distance_between_panels_ew: spacingEW, 
    setback_distance: setback,
    sun_ballast_system: systemType,
    ridge_gap: ridgeGap,
    valley_gap: valleyGap,
    roof_clearance: roofClearance,
  } = formData;

  // Determine if we're using east/west system
  const isEastWestSystem = systemType === "east-west-system";
  
  // Convert dimensions to meters
  const panelWidthMeters = parseFloat(width) * 0.3048;
  const panelLengthMeters = parseFloat(length) * 0.3048;
  const spacingEWMeters = parseFloat(spacingEW) * 0.3048;
  
  // For east/west system, use valley gap as the north/south spacing if available
  const spacingNSMeters = isEastWestSystem && valleyGap ? 
    parseFloat(valleyGap) * 0.3048 : 
    parseFloat(spacingNS) * 0.3048;
    
  // Ridge gap is only used for east/west systems
  const ridgeGapMeters = isEastWestSystem && ridgeGap ? 
    parseFloat(ridgeGap) * 0.3048 : 0;
    
  const setbackDistanceMeters = parseFloat(setback) * 0.3048;

  const isRotated = (totalRotationAngle % 180) !== 0;
  const isLandscapeOrientation = (totalRotationAngle % 180) === 0;

  // Calculate bounds of the polygon
  const bounds = new window.google.maps.LatLngBounds();
  const polygonPath = coordinates.map(coord => {
    const latLng = new window.google.maps.LatLng(coord.lat, coord.lng);
    bounds.extend(latLng);
    return latLng;
  });

  const center = bounds.getCenter();
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();

  // Calculate polygon dimensions
  const polygonWidth = window.google.maps.geometry.spherical.computeDistanceBetween(
    new window.google.maps.LatLng(center.lat(), sw.lng()),
    new window.google.maps.LatLng(center.lat(), ne.lng())
  );
  const polygonHeight = window.google.maps.geometry.spherical.computeDistanceBetween(
    new window.google.maps.LatLng(sw.lat(), center.lng()),
    new window.google.maps.LatLng(ne.lat(), center.lng())
  );
  const maxDimension = Math.max(polygonWidth + 50, polygonHeight + 50) * Math.sqrt(2);

  // For east/west system, adjust the panel size calculation
  // Each "unit" in east/west is effectively two panels side-by-side
  let effectiveUnitWidth, effectiveUnitLength;
  
  if (isEastWestSystem) {
    // For east/west, width is the same but length is doubled + ridge gap
    effectiveUnitWidth = panelWidthMeters;
    effectiveUnitLength = (panelLengthMeters * 2) + ridgeGapMeters;
  } else {
    // For north/south, use standard dimensions
    effectiveUnitWidth = isLandscapeOrientation ? panelLengthMeters : panelWidthMeters;
    effectiveUnitLength = isLandscapeOrientation ? panelWidthMeters : panelLengthMeters;
  }
  
  // Calculate effective spacing based on orientation
  const effectiveSpacingNS = isLandscapeOrientation ? spacingEWMeters : spacingNSMeters;
  const effectiveSpacingEW = isLandscapeOrientation ? spacingNSMeters : spacingEWMeters;

  // Calculate number of panels that can fit in the area
  const panelsAcross = Math.ceil(maxDimension / (effectiveUnitWidth + effectiveSpacingEW));
  const panelsDown = isEastWestSystem ?
    // For east/west, each row is a dual-panel setup
    Math.ceil(maxDimension / (effectiveUnitLength + effectiveSpacingNS)) :
    Math.ceil(maxDimension / (effectiveUnitLength + effectiveSpacingNS));

  const panelAngle = totalRotationAngle;

  // Calculate edge vectors for panel orientation
  const edgeVector = {
    x: Math.sin(panelAngle * Math.PI / 180),
    y: Math.cos(panelAngle * Math.PI / 180)
  };

  // If the polygon is drawn clockwise, invert the edgeVector
  if (isClockwise) {
    edgeVector.x = -edgeVector.x;
    edgeVector.y = -edgeVector.y;
  }

  const perpVector = {
    x: -edgeVector.y,
    y: edgeVector.x
  };

  const edgeLength = Math.sqrt(edgeVector.x * edgeVector.x + edgeVector.y * edgeVector.y);
  const normalizedEdgeVector = {
    x: edgeVector.x / edgeLength,
    y: edgeVector.y / edgeLength
  };

  // Calculate the grid width and height
  const gridWidthMeters = panelsAcross * effectiveUnitWidth + (panelsAcross - 1) * effectiveSpacingEW;
  const gridHeightMeters = panelsDown * effectiveUnitLength + (panelsDown - 1) * effectiveSpacingNS;

  const gridStartX = -gridWidthMeters / 2;
  const gridStartY = gridHeightMeters / 2;

  // Create polygon for intersection testing
  const originalPolygon = new window.google.maps.Polygon({
    paths: polygonPath,
    map: null,
  });

  const panelPolygons = [];
  const grid = Array.from({ length: panelsDown * (isEastWestSystem ? 2 : 1) }, () => Array(panelsAcross).fill(null));

  // Function to create a panel polygon and add it to the grid
  const createPanelPolygon = (corners, row, col, panelType = null, pairIndex = null) => {
    const rotatedCorners = corners.map(corner => {
      const rotatedX = corner.x * normalizedEdgeVector.x - corner.y * perpVector.x;
      const rotatedY = corner.x * normalizedEdgeVector.y - corner.y * perpVector.y;

      return new window.google.maps.LatLng(
        center.lat() + rotatedY / 111111,
        center.lng() + rotatedX / (111111 * Math.cos(center.lat() * Math.PI / 180))
      );
    });

    const isInsideSetback = rotatedCorners.every(corner =>
      window.google.maps.geometry.poly.containsLocation(corner, setbackPolygon)
    );

    const intersectsOriginal = rotatedCorners.some(corner =>
      window.google.maps.geometry.poly.containsLocation(corner, originalPolygon)
    );

    if (isInsideSetback || intersectsOriginal) {
      const panelPolygon = new window.google.maps.Polygon({
        paths: rotatedCorners,
        map: mapRef.current,
        fillColor: isInsideSetback ? "#0000FF" : "#FFA500",
        fillOpacity: isInsideSetback ? 0.25 : 0,
        strokeWeight: isInsideSetback ? 1 : 0,
        strokeColor: "#000000",
        clickable: isInsideSetback,
        zIndex: isInsideSetback ? 1000 : 999
      });

      panelPolygon.addListener('mouseover', function() {
        // Simple direct highlight for this panel
        this.setOptions({ fillColor: "#00FFFF" });
        console.log('Panel hovered:', this.index, 'Pair:', this.pairIndex);
        
        // If this is part of an east-west pair, also highlight the partner panel
        if (isEastWestSystem && this.pairIndex !== undefined) {
          // Find the other panel in the pair
          const isPanelEast = this.panelType === "east";
          const r = isPanelEast ? this.index.row + 1 : this.index.row - 1; // Partner row
          const c = this.index.col; // Same column
          
          // If the partner panel exists, highlight it too
          if (grid[r] && grid[r][c]) {
            grid[r][c].setOptions({ fillColor: "#00FFFF" });
          }
        }
      });

      panelPolygon.addListener('mouseout', function() {
        // Reset this panel's color based on its state
        if (this.state === "selected") {
          this.setOptions({ fillColor: "#00FF00" });
        } else if (this.state === "obstructed") {
          this.setOptions({ fillColor: "#FF0000" });
        } else if (this.state === "normal") {
          // For normal panels, use the appropriate color based on panel type
          if (isEastWestSystem && this.panelType === "west") {
            this.setOptions({ fillColor: "#000080", fillOpacity: 0.30 });
          } else {
            this.setOptions({ fillColor: "#0000FF", fillOpacity: 0.25 });
          }
        } else {
          // For intersects or other states
          this.setOptions({ fillColor: "#FFA500" });
        }
        
        // If this is part of an east-west pair, also reset the partner panel
        if (isEastWestSystem && this.pairIndex !== undefined) {
          // Find the other panel in the pair
          const isPanelEast = this.panelType === "east";
          const r = isPanelEast ? this.index.row + 1 : this.index.row - 1; // Partner row
          const c = this.index.col; // Same column
          
          // If the partner panel exists, reset its color too
          if (grid[r] && grid[r][c]) {
            const partner = grid[r][c];
            if (partner.state === "selected") {
              partner.setOptions({ fillColor: "#00FF00" });
            } else if (partner.state === "obstructed") {
              partner.setOptions({ fillColor: "#FF0000" });
            } else if (partner.state === "normal") {
              // For normal panels, use the appropriate color based on panel type
              if (partner.panelType === "west") {
                partner.setOptions({ fillColor: "#000080", fillOpacity: 0.30 });
              } else {
                partner.setOptions({ fillColor: "#0000FF", fillOpacity: 0.25 });
              }
            } else {
              // For intersects or other states
              partner.setOptions({ fillColor: "#FFA500" });
            }
          }
        }
      });
      
      // Add click handler for east/west system to select/deselect both panels in a pair
      if (isEastWestSystem && pairIndex !== null) {
        panelPolygon.addListener('click', () => {
          const eastRow = Math.floor(pairIndex / panelsAcross) * 2;
          const westRow = eastRow + 1;
          const pairCol = pairIndex % panelsAcross;
          
          const eastPanel = grid[eastRow] && grid[eastRow][pairCol];
          const westPanel = grid[westRow] && grid[westRow][pairCol];
          
          // Only process if both panels exist and are inside setback
          if (eastPanel && westPanel && eastPanel.isInsideSetback && westPanel.isInsideSetback) {
            // Toggle state for both panels
            const newState = eastPanel.state === "selected" ? "normal" : "selected";
            
            // Update east panel
            eastPanel.state = newState;
            eastPanel.setOptions({
              fillColor: newState === "selected" ? "#00FF00" : "#0000FF",
              fillOpacity: newState === "selected" ? 0.5 : 0.25,
              zIndex: newState === "selected" ? 1001 : 1000
            });
            
            // Update west panel
            westPanel.state = newState;
            westPanel.setOptions({
              fillColor: newState === "selected" ? "#00FF00" : "#000080",
              fillOpacity: newState === "selected" ? 0.5 : 0.30,
              zIndex: newState === "selected" ? 1001 : 1000
            });
          }
        });
      }
      
      panelPolygon.state = isInsideSetback ? "normal" : (intersectsOriginal ? "intersects" : null);
      panelPolygon.index = { row, col };
      panelPolygon.isSelected = false;
      panelPolygon.isInsideSetback = isInsideSetback;
      panelPolygon.intersectsOriginal = intersectsOriginal;
      
      // Add panel type for east/west system - "east" or "west"
      if (panelType) {
        panelPolygon.panelType = panelType;
        panelPolygon.pairIndex = pairIndex;
        
        // For visual differentiation, make west panels slightly darker
        if (panelType === "west" && isInsideSetback) {
          panelPolygon.setOptions({ fillColor: "#000080", fillOpacity: 0.30 });
        }
      }

      // Store in grid and add to panel array
      grid[row][col] = panelPolygon;
      panelPolygons.push(panelPolygon);
      
      return panelPolygon;
    } else if (intersectsOriginal) {
      // For panels that intersect but aren't inside setback, create them but hide them
      const panelPolygon = new window.google.maps.Polygon({
        paths: rotatedCorners,
        map: null, // Don't show on map
        fillColor: "#FFA500",
        fillOpacity: 0,
        strokeWeight: 0,
        clickable: false
      });
      
      panelPolygon.state = "hidden";
      panelPolygon.index = { row, col };
      panelPolygon.isSelected = false;
      panelPolygon.isInsideSetback = false;
      panelPolygon.intersectsOriginal = true;
      panelPolygon.visible = false;
      
      if (panelType) {
        panelPolygon.panelType = panelType;
        panelPolygon.pairIndex = pairIndex;
      }
      
      // Still store in grid for data consistency
      grid[row][col] = panelPolygon;
      panelPolygons.push(panelPolygon);
      
      return panelPolygon;
    }
    return null;
  };

  // Generate panels based on system type
  if (isEastWestSystem) {
    // For east/west system, create alternating east-west panels
    for (let i = 0; i < panelsAcross; i++) {
      for (let j = 0; j < panelsDown; j++) {
        // Base position for this unit (a pair of east-west panels)
        const unitX = gridStartX + i * (effectiveUnitWidth + effectiveSpacingEW) + gridOffsetX;
        const unitY = gridStartY - j * (effectiveUnitLength + effectiveSpacingNS) + gridOffsetY;
        
        // Calculate the ridge midpoint
        const ridgeMidpointY = unitY - (panelLengthMeters + ridgeGapMeters/2);
        
        // Calculate the pair index for this east-west pair
        const pairIndex = j * panelsAcross + i;
        
        // Create east-facing panel (first panel in the pair)
        const eastCorners = [
          { x: unitX, y: unitY },                                       // Top-left
          { x: unitX + effectiveUnitWidth, y: unitY },                  // Top-right
          { x: unitX + effectiveUnitWidth, y: ridgeMidpointY },         // Bottom-right at ridge
          { x: unitX, y: ridgeMidpointY }                               // Bottom-left at ridge
        ];
        
        const eastRow = j * 2; // East panels are in even rows
        const eastPanel = createPanelPolygon(eastCorners, eastRow, i, "east", pairIndex);
        
        // Create west-facing panel (second panel in the pair)
        const westCorners = [
          { x: unitX, y: ridgeMidpointY - ridgeGapMeters },             // Top-left at ridge
          { x: unitX + effectiveUnitWidth, y: ridgeMidpointY - ridgeGapMeters }, // Top-right at ridge
          { x: unitX + effectiveUnitWidth, y: unitY - effectiveUnitLength }, // Bottom-right
          { x: unitX, y: unitY - effectiveUnitLength }                  // Bottom-left
        ];
        
        const westRow = j * 2 + 1; // West panels are in odd rows
        const westPanel = createPanelPolygon(westCorners, westRow, i, "west", pairIndex);
        
        // Handle linked visibility - if one panel in the pair is outside the setback or 
        // intersects the original, then both should be hidden
        if (eastPanel && westPanel) {
          // A panel is valid if it's inside the setback
          const eastValid = eastPanel.isInsideSetback;
          const westValid = westPanel.isInsideSetback;
          
          // If either panel is invalid (completely outside the setback), hide both panels
          if (!eastValid || !westValid) {
            // Hide both panels by removing them from the map
            eastPanel.setMap(null);
            westPanel.setMap(null);
            
            // Update their state for tracking purposes
            eastPanel.state = "hidden";
            westPanel.state = "hidden";
            
            // Keep them in the grid for data consistency, but mark them as not visible
            eastPanel.visible = false;
            westPanel.visible = false;
          }
        }
      }
    }
  } else {
    // Original north/south panel layout
    for (let i = 0; i < panelsAcross; i++) {
      for (let j = 0; j < panelsDown; j++) {
        const panelGridX = gridStartX + i * (effectiveUnitWidth + effectiveSpacingEW) + gridOffsetX;
        const panelGridY = gridStartY - j * (effectiveUnitLength + effectiveSpacingNS) + gridOffsetY;

        const corners = [
          { x: panelGridX, y: panelGridY },
          { x: panelGridX + effectiveUnitWidth, y: panelGridY },
          { x: panelGridX + effectiveUnitWidth, y: panelGridY - effectiveUnitLength },
          { x: panelGridX, y: panelGridY - effectiveUnitLength }
        ];

        createPanelPolygon(corners, j, i);
      }
    }
  }

  return { panelPolygons, grid };
};

// Updated processSelectionBox function in PolygonProcessing.js
// This handles the selection box for both single panels and east/west panel pairs

export const processSelectionBox = (bounds, selectedPolygon, mode, setPolygons, addTextOverlay) => {
  if (!selectedPolygon) return;

  setPolygons(prevPolygons => {
    const updatedPolygons = [...prevPolygons];
    const polygonIndex = prevPolygons.indexOf(selectedPolygon);

    if (polygonIndex === -1) return prevPolygons;

    // Check if we're using an east/west system
    const isEastWestSystem = selectedPolygon.panelPolygons.panelPolygons.some(
      panel => panel.panelType && (panel.panelType === "east" || panel.panelType === "west")
    );
    
    // Track processed pairs to avoid duplicates
    const processedPairs = new Set();

    selectedPolygon.panelPolygons.panelPolygons.forEach(panel => {
      const panelBounds = new window.google.maps.LatLngBounds();
      panel.getPath().forEach(latLng => panelBounds.extend(latLng));

      if (bounds.intersects(panelBounds)) {
        if (isEastWestSystem && panel.pairIndex !== undefined) {
          // Skip if we already processed this pair
          if (processedPairs.has(panel.pairIndex)) {
            return;
          }
          
          // Mark this pair as processed
          processedPairs.add(panel.pairIndex);
          
          // Find both panels in the pair
          const grid = selectedPolygon.panelPolygons.grid;
          const pairIndex = panel.pairIndex;
          const eastRow = Math.floor(pairIndex / grid[0].length) * 2;
          const westRow = eastRow + 1;
          const pairCol = pairIndex % grid[0].length;
          
          const eastPanel = grid[eastRow] && grid[eastRow][pairCol];
          const westPanel = grid[westRow] && grid[westRow][pairCol];
          
          // Only proceed if both panels exist and are inside setback
          if (eastPanel && westPanel && eastPanel.isInsideSetback && westPanel.isInsideSetback) {
            if (mode === "panels") {
              // Toggle both panels between selected and normal
              const isSelected = eastPanel.state === "selected"; // Both should have same state
              
              // Update east panel
              eastPanel.state = isSelected ? "normal" : "selected";
              eastPanel.setOptions({
                fillColor: isSelected ? "#0000FF" : "#00FF00",
                fillOpacity: isSelected ? 0.25 : 0.5,
                zIndex: isSelected ? 1000 : 1001,
              });
              
              // Update west panel
              westPanel.state = isSelected ? "normal" : "selected";
              westPanel.setOptions({
                fillColor: isSelected ? "#000080" : "#00FF00", // Darker blue for west panels
                fillOpacity: isSelected ? 0.30 : 0.5,
                zIndex: isSelected ? 1000 : 1001,
              });
            } else if (mode === "obstructions") {
              if (eastPanel.state !== "obstructed") {
                // Set both panels to obstructed with default height
                const height = 10; // Default height
                
                // East panel
                eastPanel.state = "obstructed";
                eastPanel.setOptions({
                  fillColor: "#FF0000",
                  fillOpacity: 0.5,
                  zIndex: 1002,
                });
                eastPanel.obstructionHeight = height;
                addTextOverlay(eastPanel, height);
                
                // West panel
                westPanel.state = "obstructed";
                westPanel.setOptions({
                  fillColor: "#FF0000",
                  fillOpacity: 0.5,
                  zIndex: 1002,
                });
                westPanel.obstructionHeight = height;
                addTextOverlay(westPanel, height);
              } else {
                // Clear obstruction from both panels
                
                // East panel
                eastPanel.state = "normal";
                eastPanel.setOptions({
                  fillColor: "#0000FF",
                  fillOpacity: 0.25,
                  zIndex: 1000,
                });
                if (eastPanel.textOverlay) {
                  eastPanel.textOverlay.setMap(null);
                }
                delete eastPanel.obstructionHeight;
                
                // West panel
                westPanel.state = "normal";
                westPanel.setOptions({
                  fillColor: "#000080", // Darker blue for west
                  fillOpacity: 0.30,
                  zIndex: 1000,
                });
                if (westPanel.textOverlay) {
                  westPanel.textOverlay.setMap(null);
                }
                delete westPanel.obstructionHeight;
              }
            }
          }
        } else {
          // Original code for single panels
          if (mode === "panels") {
            panel.state = panel.state === "selected" ? "normal" : "selected";
            panel.setOptions({
              fillColor: panel.state === "selected" ? "#00FF00" : "#0000FF",
              fillOpacity: panel.state === "selected" ? 0.5 : 0.25,
              zIndex: panel.state === "selected" ? 1001 : 1000,
            });
          } else if (mode === "obstructions") {
            if (panel.state !== "obstructed") {
              panel.state = "obstructed";
              panel.setOptions({
                fillColor: "#FF0000",
                fillOpacity: 0.5,
                zIndex: 1002,
              });
              // You might want to prompt for height here or use a default value
              const height = 10; // Default height, you can change this
              panel.obstructionHeight = height;
              addTextOverlay(panel, height);
            } else {
              panel.state = "normal";
              panel.setOptions({
                fillColor: "#0000FF",
                fillOpacity: 0.25,
                zIndex: 1000,
              });
              if (panel.textOverlay) {
                panel.textOverlay.setMap(null);
              }
              delete panel.obstructionHeight;
            }
          }
        }
      }
    });

    updatedPolygons[polygonIndex] = selectedPolygon;
    return updatedPolygons;
  });
};

export const addInteractionListeners = (panelPolygons, handlePanelClick, polygonIndex) => {
  if (!Array.isArray(panelPolygons)) {
    console.error('panelPolygons is not an array:', panelPolygons);
    return;
  }

  panelPolygons.forEach(panel => {
    panel.addListener('mouseover', () => {
      panel.setOptions({ fillColor: "#FFFF00" });
    });

    panel.addListener('mouseout', () => {
      panel.setOptions({ fillColor: panel.state === "selected" ? "#00FF00" : panel.state === "obstructed" ? "#FF0000" : "#0000FF" });
    });

    panel.addListener('click', () => handlePanelClick(panel, polygonIndex));
  });
};

export const getSelectedPanelData = (selectedPolygon, formData) => {
  if (!selectedPolygon || !selectedPolygon.panelPolygons) {
    return { layout: [], building_width: 0, building_length: 0 };
  }

  const grid = selectedPolygon.panelPolygons.grid;
  const filteredGrid = grid.filter(row => row.some(panel => panel !== null));
  
  // Add debug logging
  console.log("Panel states before API conversion:");
  const stateCounts = { true: 0, false: 0, intersects: 0, "non-value": 0, obstructed: 0, null: 0, undefined: 0 };
  
  const panelLayout = filteredGrid.map((row) =>
    row.map((panel) => {
      if (panel === null){
        stateCounts["non-value"]++;
        return "non-value";
      }

      if (panel.state === "obstructed") {
        stateCounts.obstructed++;
        return {
          isObstructed: true,
          height: panel.obstructionHeight
            ? panel.obstructionHeight.toString()
            : "0",
        };
      }
      if (panel.state === "selected") {
        stateCounts.true++;
        return true;
      }

      if (panel.state === "normal" && panel.isInsideSetback){
        stateCounts.false++;
        return false; // Panels inside setback but not selected
      }

      if (panel.intersectsOriginal){
        stateCounts.intersects++;
        return "intersects";
      }

      // Catch any unexpected states - this should never happen
      if (panel.state === undefined) {
        stateCounts.undefined++;
        console.warn("Found undefined panel state at row/col:", panel.index);
      } else {
        stateCounts.null++;
        console.warn("Unexpected panel state:", panel.state, "at row/col:", panel.index);
      }
      
      // Default - panels outside polygon  
      return "non-value";
    })
  );

  console.log("Panel state counts:", stateCounts);

  // Use the pre-calculated building dimensions from the bounding box if available
  let building_width, building_length, building_area;

  if (selectedPolygon.buildingWidthFeet && selectedPolygon.buildingLengthFeet) {
    // Use the stored values that were calculated when creating the polygon
    building_width = selectedPolygon.buildingWidthFeet;
    building_length = selectedPolygon.buildingLengthFeet;
    building_area = selectedPolygon.buildingAreaFeet;
    
    console.log('Using pre-calculated building dimensions:', {
      width: building_width,
      length: building_length,
      area: building_area
    });
  } else {
    // If not available, calculate from the polygon vertices as a fallback
    const vertices = selectedPolygon.originalPolygon.getPath().getArray().map(point => ({
      lat: point.lat(),
      lng: point.lng()
    }));
    
    const dimensions = calculateBoundingBoxDimensions(vertices);
    building_width = dimensions.widthFeet;
    building_length = dimensions.lengthFeet;
    building_area = dimensions.areaFeet;
    
    console.log('Calculated building dimensions on-the-fly:', {
      width: building_width,
      length: building_length,
      area: building_area
    });
  }

  return {
    layout: panelLayout,
    building_width: Math.round(building_width),
    building_length: Math.round(building_length),
    building_area: Math.round(building_area),
    panel_width: parseFloat(formData.pv_module_ew_width),
    panel_length: parseFloat(formData.pv_module_ns_length),
    lat: selectedPolygon.originalPolygon.getPath().getAt(0).lat(),
    lng: selectedPolygon.originalPolygon.getPath().getAt(0).lng(),
    is_clockwise: selectedPolygon.isClockwise,
    roof_clearance: formData.roof_clearance || "3.2"
  };
};

// Add this function to your PolygonProcessing.js file

/**
 * Calculates the bounding box dimensions for a polygon
 * 
 * @param {Array} vertices - Array of {lat, lng} objects representing polygon vertices
 * @returns {Object} Object containing width, length, area, rotation angle and their feet equivalents
 */
export const calculateOrientedBoundingBoxDimensions = (vertices) => {
  if (!vertices || vertices.length < 3) {
    console.warn('Not enough vertices to calculate dimensions');
    return {
      width: 0, length: 0, area: 0,
      widthFeet: 0, lengthFeet: 0, areaFeet: 0
    };
  }
  
  // Convert vertices to LatLng objects
  const latLngPoints = vertices.map(v => new window.google.maps.LatLng(v.lat, v.lng));
  
  // Create a polygon to help with computations
  const polygon = new window.google.maps.Polygon({
    paths: latLngPoints,
    map: null // Don't display on map
  });
  
  // Find the longest edge as a basis for orientation
  let longestEdge = 0;
  let longestEdgeIndex = 0;
  
  for (let i = 0; i < vertices.length; i++) {
    const p1 = latLngPoints[i];
    const p2 = latLngPoints[(i + 1) % vertices.length];
    
    const distance = window.google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
    if (distance > longestEdge) {
      longestEdge = distance;
      longestEdgeIndex = i;
    }
  }
  
  // Use the longest edge to determine the orientation
  const p1 = latLngPoints[longestEdgeIndex];
  const p2 = latLngPoints[(longestEdgeIndex + 1) % vertices.length];
  
  // Calculate heading of the longest edge (this will be the main axis of our bounding box)
  const heading = window.google.maps.geometry.spherical.computeHeading(p1, p2);
  const angleRadians = heading * Math.PI / 180;
  
  // Get the center of the polygon
  const bounds = new window.google.maps.LatLngBounds();
  latLngPoints.forEach(point => bounds.extend(point));
  const center = bounds.getCenter();
  
  // Project points to local coordinates based on the longest edge orientation
  const localCoords = vertices.map(vertex => {
    // Calculate distance from center
    const point = new window.google.maps.LatLng(vertex.lat, vertex.lng);
    const distance = window.google.maps.geometry.spherical.computeDistanceBetween(center, point);
    const pointHeading = window.google.maps.geometry.spherical.computeHeading(center, point);
    
    // Rotate the point to align with longest edge
    const rotatedHeading = (pointHeading - heading) * Math.PI / 180;
    
    // Project onto the x and y axes
    return {
      x: distance * Math.cos(rotatedHeading),
      y: distance * Math.sin(rotatedHeading)
    };
  });
  
  // Find min/max x and y to determine the bounding box
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  localCoords.forEach(point => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  });
  
  // Calculate oriented bounding box dimensions
  const orientedWidth = maxX - minX;
  const orientedLength = maxY - minY;
  
  // Ensure width is always the shorter dimension
  let width, length, rotationAngle;
  if (orientedWidth <= orientedLength) {
    width = orientedWidth;
    length = orientedLength;
    rotationAngle = heading;
  } else {
    width = orientedLength;
    length = orientedWidth;
    rotationAngle = (heading + 90) % 360;
  }
  
  // Calculate area
  const area = width * length;
  
  // Convert to feet
  const metersToFeet = 3.28084;
  const widthFeet = width * metersToFeet;
  const lengthFeet = length * metersToFeet;
  const areaFeet = area * 10.7639; // 1 sq meter = 10.7639 sq feet
  
  // Calculate actual polygon area - for more accurate area calculation
  const actualArea = window.google.maps.geometry.spherical.computeArea(polygon.getPath());
  const actualAreaFeet = actualArea * 10.7639;
  
  // Log results for debugging
  console.log('Oriented bounding box calculation:', {
    width,
    length,
    widthFeet,
    lengthFeet,
    area,
    areaFeet,
    rotationAngle,
    actualArea,
    actualAreaFeet
  });
  
  // Clean up polygon
  polygon.setMap(null);
  
  return {
    width,
    length,
    area: actualArea,  // Use actual polygon area instead of bounding box area
    widthFeet,
    lengthFeet,
    areaFeet: actualAreaFeet,
    rotationAngle
  };
};

/**
 * Replacement for the existing calculateBoundingBoxDimensions function
 * This combines the standard axis-aligned bounding box with the oriented bounding box
 * approach to get the most accurate measurements
 * 
 * @param {Array} vertices - Array of {lat, lng} objects representing polygon vertices
 * @returns {Object} Object containing width, length, and area of the bounding box
 */
export const calculateBoundingBoxDimensions = (vertices) => {
  if (!vertices || vertices.length < 3) {
    console.warn('Not enough vertices to calculate dimensions');
    return {
      width: 0, length: 0, area: 0,
      widthFeet: 0, lengthFeet: 0, areaFeet: 0
    };
  }
  
  // First try the oriented bounding box approach - this will handle rotated buildings better
  const orientedBB = calculateOrientedBoundingBoxDimensions(vertices);
  
  // Create a standard axis-aligned bounding box for comparison/fallback
  const bounds = new window.google.maps.LatLngBounds();
  
  // Extend the bounds to include each vertex
  vertices.forEach(vertex => {
    bounds.extend(new window.google.maps.LatLng(vertex.lat, vertex.lng));
  });
  
  // Get the northeast and southwest corners
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  
  // Calculate width (east-west distance)
  const standardWidth = window.google.maps.geometry.spherical.computeDistanceBetween(
    new window.google.maps.LatLng(ne.lat(), sw.lng()),
    new window.google.maps.LatLng(ne.lat(), ne.lng())
  );
  
  // Calculate length (north-south distance)
  const standardLength = window.google.maps.geometry.spherical.computeDistanceBetween(
    new window.google.maps.LatLng(ne.lat(), sw.lng()),
    new window.google.maps.LatLng(sw.lat(), sw.lng())
  );
  
  // Convert to feet
  const metersToFeet = 3.28084;
  const standardWidthFeet = standardWidth * metersToFeet;
  const standardLengthFeet = standardLength * metersToFeet;
  
  // Calculate polygon area (this is more accurate than bounding box area)
  const polygon = new window.google.maps.Polygon({
    paths: vertices.map(v => new window.google.maps.LatLng(v.lat, v.lng)),
    map: null
  });
  const actualArea = window.google.maps.geometry.spherical.computeArea(polygon.getPath());
  const actualAreaFeet = actualArea * 10.7639;
  
  // Log comparison of standard vs oriented bounding box
  console.log('Bounding box comparison:', {
    standard: {
      width: standardWidth,
      length: standardLength,
      widthFeet: standardWidthFeet,
      lengthFeet: standardLengthFeet,
      area: standardWidth * standardLength,
      areaFeet: standardWidthFeet * standardLengthFeet
    },
    oriented: {
      width: orientedBB.width,
      length: orientedBB.length,
      widthFeet: orientedBB.widthFeet,
      lengthFeet: orientedBB.lengthFeet,
      area: orientedBB.area,
      areaFeet: orientedBB.areaFeet,
      angle: orientedBB.rotationAngle
    },
    actualPolygonArea: actualArea,
    actualPolygonAreaFeet: actualAreaFeet
  });
  
  // Clean up polygon
  polygon.setMap(null);
  
  // Choose the oriented bounding box results (smaller area = better fit)
  return {
    width: orientedBB.width,
    length: orientedBB.length,
    area: actualArea,  // Use actual polygon area
    widthFeet: orientedBB.widthFeet,
    lengthFeet: orientedBB.lengthFeet,
    areaFeet: actualAreaFeet,
    bounds,
    rotationAngle: orientedBB.rotationAngle
  };
};