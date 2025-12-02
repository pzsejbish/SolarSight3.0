import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { GoogleMap, DrawingManager } from '@react-google-maps/api';
import { useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useFormData } from './FormDataContext';
import PanelGrid from './Components/PanelGrid';

function SatelliteLayoutTool({ isGoogleMapsLoaded}) {
  const location = useLocation();
  const { mapCenter, zoom, length, width, spacingNS, spacingEW, setback } = location.state || {};
  
  const { formData, setFormData } = useFormData();
  const mapRef = useRef(null);
  const drawingManagerRef = useRef(null);
  const [overlays, setOverlays] = useState([]);
  const [currentPolygon, setCurrentPolygon] = useState(null);
  const [polygonPath, setPolygonPath] = useState([]);
  const [drawingManagerOptions, setDrawingManagerOptions] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [selectedPanels, setSelectedPanels] = useState([]);
  const [panels, setPanels] = useState([]);
  const [selectedPanelCount, setSelectedPanelCount] = useState(0);
  const drawingManagerLoadedRef = useRef(false);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [hoveredPanels, setHoveredPanels] = useState(new Set());
  const [recordedPanels, setRecordedPanels] = useState([]);
  const [gridWidthMeters, setGridWidthMeters] = useState(0);
  const [gridHeightMeters, setGridHeightMeters] = useState(0);
  const [gridStartX, setGridStartX] = useState(0);
  const [gridStartY, setGridStartY] = useState(0);
  const [grid, setGrid] = useState([]);
  const [gridOffsetX, setGridOffsetX] = useState(0);
  const [gridOffsetY, setGridOffsetY] = useState(0);
  const [isLandscape, setIsLandscape] = useState(true);
  const [mode, setMode] = useState("panel");
  const gridRef = useRef(grid);
  

  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  useEffect(() => {
    console.log('Current formData:', formData);
  }, [formData]);

  const toggleMode = useCallback(() => {
    setMode(prevMode => (prevMode === "panel" ? "obstruction" : "panel"));
  }, []);

  const toggleOrientation = useCallback(() => {
    setIsLandscape(prev => !prev);
  }, []);

  const updateFormData = (newData) => {
    setFormData(prevData => ({
      ...prevData,
      ...newData
    }));
  };

  const findLongestEdge = (coordinates) => {
    console.log('findLongestEdge called with:', coordinates);

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
      console.error('Invalid coordinates:', coordinates);
      return { angle: 0, longestEdgeIndex: -1 };
    }

    let longestEdge = 0;
    let longestEdgeIndex = -1;
    let longestEdgeStart, longestEdgeEnd;

    for (let i = 0; i < coordinates.length; i++) {
      const start = coordinates[i];
      const end = coordinates[(i + 1) % coordinates.length];

      if (!start || !end || typeof start.lat !== 'number' || typeof start.lng !== 'number' ||
          typeof end.lat !== 'number' || typeof end.lng !== 'number') {
        console.warn(`Invalid coordinates at index ${i}:`, start, end);
        continue;
      }

      const startLatLng = new window.google.maps.LatLng(start.lat, start.lng);
      const endLatLng = new window.google.maps.LatLng(end.lat, end.lng);

      const distance = window.google.maps.geometry.spherical.computeDistanceBetween(startLatLng, endLatLng);

      if (distance > longestEdge) {
        longestEdge = distance;
        longestEdgeIndex = i;
        longestEdgeStart = startLatLng;
        longestEdgeEnd = endLatLng;
      }
    }

    if (longestEdgeIndex === -1) {
      console.error('No valid edges found in the polygon');
      return { angle: 0, longestEdgeIndex: -1 };
    }

    // Calculate the heading of the longest edge
    const heading = window.google.maps.geometry.spherical.computeHeading(longestEdgeStart, longestEdgeEnd);

    // Normalize the heading to be between -180 and 180 degrees
    const normalizedHeading = ((heading + 180) % 360) - 180;

    console.log(`Longest edge index: ${longestEdgeIndex}, Length: ${longestEdge}`);
    console.log(`Longest edge start: ${longestEdgeStart.toString()}`);
    console.log(`Longest edge end: ${longestEdgeEnd.toString()}`);
    console.log(`Edge heading: ${normalizedHeading}°`);

    return { 
      angle: normalizedHeading,
      longestEdgeIndex,
      start: longestEdgeStart,
      end: longestEdgeEnd
    };
  };

  const shiftGrid = (direction, amount) => {
    switch (direction) {
      case 'left':
        setGridOffsetX(prev => prev - amount);
        break;
      case 'right':
        setGridOffsetX(prev => prev + amount);
        break;
      case 'up':
        setGridOffsetY(prev => prev + amount);
        break;
      case 'down':
        setGridOffsetY(prev => prev - amount);
        break;
    }
  };


  const clearAll = useCallback(() => {
    overlays.forEach(overlay => overlay.setMap(null));
    setOverlays([]);
  }, [overlays]);

  const handleMapClick = useCallback((e) => {
    if (drawingManagerRef.current && drawingManagerRef.current.getDrawingMode() === window.google.maps.drawing.OverlayType.POLYGON) {
      const newPath = [...polygonPath, { lat: e.latLng.lat(), lng: e.latLng.lng() }];
      setPolygonPath(newPath);
      if (currentPolygon) {
        currentPolygon.setPath(newPath);
      } else {
        const newPolygon = new window.google.maps.Polygon({
          path: newPath,
          map: mapRef.current,
          editable: true
        });
        setCurrentPolygon(newPolygon);
      }
    }
  }, [polygonPath, currentPolygon]);

  const rotatePoint = (point, center, angle) => {
    const radians = angle * Math.PI / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const px = point.lng() - center.lng();
    const py = point.lat() - center.lat();
    const newX = px * cos - py * sin + center.lng();
    const newY = px * sin + py * cos + center.lat();
    return new window.google.maps.LatLng(newY, newX);
  };

  let modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  
  const processPolygon = useCallback((coordinates) => {
    panels.forEach(panel => panel.setMap(null));
    setOverlays(prevOverlays => {
      prevOverlays.forEach(overlay => {
        if (overlay && overlay instanceof window.google.maps.Polygon && overlay !== currentPolygon) {
          overlay.setMap(null);
        }
      });
      return [currentPolygon];
    });
    console.log("Processing polygon:", coordinates);
  
    // Panel dimensions and spacing in meters
    const panelWidthMeters = parseFloat(width) * 0.3048;
    const panelLengthMeters = parseFloat(length) * 0.3048;
    const spacingEWMeters = parseFloat(spacingEW) * 0.3048;
    const spacingNSMeters = parseFloat(spacingNS) * 0.3048;
    const setbackDistanceMeters = parseFloat(setback) * 0.3048;
    const newOverlays = [];
    const newPanels = [];
  
    // Create a bounds object and polygon from the coordinates
    const bounds = new window.google.maps.LatLngBounds();
    const polygonPath = coordinates.map(coord => {
      const latLng = new window.google.maps.LatLng(coord.lat, coord.lng);
      bounds.extend(latLng);
      return latLng;
    });
  
    const center = bounds.getCenter();
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
  
    // Calculate the maximum dimension of the polygon
    const polygonWidth = window.google.maps.geometry.spherical.computeDistanceBetween(
      new window.google.maps.LatLng(center.lat(), sw.lng()),
      new window.google.maps.LatLng(center.lat(), ne.lng())
    );
    const polygonHeight = window.google.maps.geometry.spherical.computeDistanceBetween(
      new window.google.maps.LatLng(sw.lat(), center.lng()),
      new window.google.maps.LatLng(ne.lat(), center.lng())
    );
    const maxDimension = Math.max(polygonWidth + 50, polygonHeight + 50) * Math.sqrt(2);
  
    // Calculate number of panels
    const panelsAcross = Math.ceil(maxDimension / (panelWidthMeters + spacingEWMeters));
    const panelsDown = Math.ceil(maxDimension / (panelLengthMeters + spacingNSMeters));
    console.log(`Panels: ${panelsAcross} across, ${panelsDown} down`);
  
    const { angle, start: longestEdgeStart, end: longestEdgeEnd } = findLongestEdge(coordinates);
    const panelAngle = angle;
    
    console.log(`Using panel angle: ${panelAngle}°`);
    
    // Calculate the vector of the longest edge using spherical geometry
    const edgeVector = {
      x: Math.sin(panelAngle * Math.PI / 180),
      y: Math.cos(panelAngle * Math.PI / 180)
    };
    
    // Calculate perpendicular vector
    const perpVector = {
      x: -edgeVector.y,
      y: edgeVector.x
    };
    
    console.log('Edge vector:', edgeVector);
    console.log('Perpendicular vector:', perpVector);
  
    // Normalize the edge vector
    const edgeLength = Math.sqrt(edgeVector.x * edgeVector.x + edgeVector.y * edgeVector.y);
    const normalizedEdgeVector = {
      x: edgeVector.x / edgeLength,
      y: edgeVector.y / edgeLength
    };
  
    // Swap panel dimensions if in portrait mode
    let effectivePanelWidth = isLandscape ? panelWidthMeters : panelLengthMeters;
    let effectivePanelLength = isLandscape ? panelLengthMeters : panelWidthMeters;
    let effectiveSpacingEW = isLandscape ? spacingEWMeters : spacingNSMeters;
    let effectiveSpacingNS = isLandscape ? spacingNSMeters : spacingEWMeters;

    // Recalculate grid dimensions
    const gridWidthMeters = panelsAcross * effectivePanelWidth + (panelsAcross - 1) * effectiveSpacingEW;
    const gridHeightMeters = panelsDown * effectivePanelLength + (panelsDown - 1) * effectiveSpacingNS;
  
    // Calculate grid starting point (top-left)
    const gridStartX = -gridWidthMeters / 2;
    const gridStartY = gridHeightMeters / 2;
  
    setGridWidthMeters(gridWidthMeters);
    setGridHeightMeters(gridHeightMeters);
    setGridStartX(gridStartX);
    setGridStartY(gridStartY);
  
    // Generate setback polygon
    const setbackPolygon = new window.google.maps.Polygon({
      paths: generateSetbackPolygon(polygonPath, setbackDistanceMeters),
      map: mapRef.current,
      strokeColor: "#FFA500",
      strokeOpacity: 1,
      strokeWeight: 2,
      fillColor: "#00FF00",
      fillOpacity: 0.1,
      zIndex: 2,
      geodesic: false,
      editable: false,
    });
  
    // Create original polygon for intersection check
    const originalPolygon = new window.google.maps.Polygon({
      paths: polygonPath,
      map: null, // Do not display this polygon on the map
    });
  
    // Create panels
    const recordedPanels = [];
    const grid = Array.from({ length: panelsDown }, () => Array(panelsAcross).fill(null));
  
    for (let i = 0; i < panelsAcross; i++) {
      for (let j = 0; j < panelsDown; j++) {
        // Calculate panel position in the grid, including the offset
        const panelGridX = gridStartX + i * (effectivePanelWidth + effectiveSpacingEW) + gridOffsetX;
        const panelGridY = gridStartY - j * (effectivePanelLength + effectiveSpacingNS) + gridOffsetY;
  
        // Rotate the panel position
        const rotatedX = panelGridX * normalizedEdgeVector.x - panelGridY * perpVector.x;
        const rotatedY = panelGridX * normalizedEdgeVector.y - panelGridY * perpVector.y;
  
        // Calculate panel corners
        const corners = [
          { x: panelGridX, y: panelGridY },
          { x: panelGridX + effectivePanelWidth, y: panelGridY },
          { x: panelGridX + effectivePanelWidth, y: panelGridY - effectivePanelLength },
          { x: panelGridX, y: panelGridY - effectivePanelLength }
        ];
  
        // Rotate and position the corners
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
  
        const panelData = {
          path: rotatedCorners.map(latLng => ({ lat: latLng.lat(), lng: latLng.lng() })),
          isInsideSetback,
          intersectsOriginal
        };
        recordedPanels.push(panelData);
  
        let state;
        if (isInsideSetback) {
          state = { index: recordedPanels.length - 1 };
        } else if (intersectsOriginal) {
          state = false;
        } else {
          state = 'obstruction';
        }
  
        grid[j][i] = state;
  
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
          
          panelPolygon.index = { row: j, col: i };
          panelPolygon.isSelected = false;
          
          let lastClickTime = 0;

          panelPolygon.addListener('click', function () {
            const isObstruction = grid[panelPolygon.index.row][panelPolygon.index.col] === true;
            const isSelected = this.isSelected;
          
            // Log the current state of the panel before making any changes
            console.log(`Panel at row ${panelPolygon.index.row}, col ${panelPolygon.index.col}:`, {
              isObstruction,
              isSelected,
              currentMode: modeRef.current
            });
          
            if (modeRef.current === "panel") {
              // Handle panel mode (toggle selection)
              setSelectedPanels(prevSelected => {
                const isCurrentlySelected = prevSelected.some(p => p.row === panelPolygon.index.row && p.col === panelPolygon.index.col);
                panelPolygon.isSelected = !isCurrentlySelected;
                if (isCurrentlySelected) {
                  panelPolygon.setOptions({
                    fillColor: "#0000FF",
                    fillOpacity: 0.25,
                    zIndex: 1000,

                  });
                  setGrid(prevGrid => {
                    const newGrid = prevGrid.map(row => row.slice());
                    newGrid[panelPolygon.index.row][panelPolygon.index.col] = { index: panelPolygon.index };
                    return newGrid;
                  });
                  setSelectedPanelCount(prev => prev - 1);
                  return prevSelected.filter(p => !(p.row === panelPolygon.index.row && p.col === panelPolygon.index.col));
                } else {
                  panelPolygon.setOptions({
                    fillColor: "#00FF00",
                    fillOpacity: 0.5,
                    zIndex: 1001,
                    isSelected: true
                  });
                  setGrid(prevGrid => {
                    const newGrid = prevGrid.map(row => row.slice());
                    newGrid[panelPolygon.index.row][panelPolygon.index.col] = { index: panelPolygon.index, selected: true };
                    return newGrid;
                  });
                  setSelectedPanelCount(prev => prev + 1);
                  return [...prevSelected, panelPolygon.index];
                }
              });
            } else if (modeRef.current === "obstruction") {
              // Handle obstruction mode
              setGrid(prevGrid => {
                const newGrid = prevGrid.map(row => row.slice());
                newGrid[panelPolygon.index.row][panelPolygon.index.col] = 'obstruction';
                gridRef.current = newGrid; // Update the ref as well
                console.log(`Grid updated at row ${panelPolygon.index.row}, col ${panelPolygon.index.col}:`, newGrid[panelPolygon.index.row][panelPolygon.index.col]);
                return newGrid;
              });
              
              panelPolygon.setOptions({
                fillColor: "#FF0000",
                fillOpacity: 0.5,
                zIndex: 1002,
                isObstruction: true
              });
            }
          });
          
          panelPolygon.addListener('mouseover', function() {
            // Check if the panel is marked as obstruction
            const isObstruction = grid[panelPolygon.index.row][panelPolygon.index.col] === 'obstruction';
            console.log(isObstruction)
            if (!isObstruction && !this.isSelected) {
              this.setOptions({ fillOpacity: 0.5, fillColor: "#00FFFF" });
            }
          });
  
          panelPolygon.addListener('mouseout', function() {
            const isObstruction = grid[panelPolygon.index.row][panelPolygon.index.col] === 'obstruction';
            if (isObstruction) {
              this.setOptions({ fillOpacity: 0.5, fillColor: "#FF0000" });
            } else if (!this.isSelected) {
              this.setOptions({ fillOpacity: 0.25, fillColor: "#0000FF" });
            } else {
              this.setOptions({ fillOpacity: 0.5, fillColor: "#00FF00", isObstruction: isObstruction });
            }
          });
  
          newOverlays.push(panelPolygon);
          newPanels.push(panelPolygon);
        }
      }
    }
    
    setOverlays(prevOverlays => [...prevOverlays, ...newOverlays, setbackPolygon]);
    setPanels(newPanels);
    setSelectedPanels([]);
    setSelectedPanelCount(0);
    
    setRecordedPanels(recordedPanels);
    setGrid(grid);
    console.log(`Created ${newPanels.length} panels`);
  
  }, [mapRef, width, length, spacingEW, spacingNS, setback, currentPolygon, gridOffsetX, gridOffsetY, isLandscape]);
  
  useEffect(() => {
    if (polygonPath.length > 0) {
      processPolygon(polygonPath);
    }
  }, [processPolygon, polygonPath, isLandscape]);

  const handleMouseDown = () => {
    setIsMouseDown(true);
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
    setHoveredPanels(new Set()); // Clear hovered panels on mouse up
  };

  const handleMouseMove = useCallback(() => {
    if (isMouseDown) {
      hoveredPanels.forEach(panel => {
        panel.isSelected = true;
        panel.setOptions({
          fillColor: "#00FF00",
          fillOpacity: 0.5,
          zIndex: 1001
        });
      });
    }
  }, [isMouseDown, hoveredPanels]);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.addListener('mousedown', handleMouseDown);
      mapRef.current.addListener('mouseup', handleMouseUp);
      mapRef.current.addListener('mousemove', handleMouseMove);
    }
  }, [handleMouseMove]);

  const handleOverlayComplete = useCallback((e) => {
    console.log("Overlay complete event:", e);
    if (e.type === window.google.maps.drawing.OverlayType.POLYGON) {
      setCurrentPolygon(e.overlay);
      const path = e.overlay.getPath();
      const pathArray = path.getArray().map(latLng => ({ lat: latLng.lat(), lng: latLng.lng() }));
      setPolygonPath(pathArray);
      if (drawingManagerRef.current) {
        drawingManagerRef.current.setDrawingMode(null);
      } else {
        console.warn("Drawing manager ref is null");
      }

      // Process the polygon and generate panels
      processPolygon(pathArray);
    }
  }, [processPolygon]);

  const onLoadDrawingManager = useCallback((drawingManager) => {
    console.log("onLoadDrawingManager called");
    if (!drawingManagerLoadedRef.current) {
      console.log("Setting drawingManagerRef");
      drawingManagerRef.current = drawingManager;
      drawingManagerLoadedRef.current = true;
      console.log("Drawing Manager loaded", drawingManager);
    } else {
      console.log("Drawing Manager already loaded, skipping initialization");
    }
  }, []);

  useCallback(() => {
    console.log("useEffect for drawingManagerOptions called");
    if (isGoogleMapsLoaded && window.google) {
      console.log("Setting drawingManagerOptions");
      setDrawingManagerOptions({
        drawingControl: true,
        drawingControlOptions: {
          position: window.google.maps.ControlPosition.TOP_CENTER,
          drawingModes: [window.google.maps.drawing.OverlayType.POLYGON],
        },
        polygonOptions: {
          fillColor: '#0000FF',
          fillOpacity: 0.1,
          strokeWeight: 2,
          clickable: true,
          editable: true,
          zIndex: 1,
          draggable: false,
        },
        polylineOptions: {
          editable: true,
          draggable: true,
          geodesic: false,
        }
      });
    }
  }, [isGoogleMapsLoaded]);

  const onLoad = useCallback((map) => {
    mapRef.current = map;
    console.log("Map loaded", map);
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
    drawingManagerRef.current = null;
    console.log("Map unmounted");
  }, []);

  // Function to generate setback polygon
  const generateSetbackPolygon = (originalPath, setbackDistance) => {
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
      const angle = Math.acos(dotProduct);
  
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

  useEffect(() => {
    if (polygonPath.length > 0) {
      processPolygon(polygonPath);
    }
  }, [processPolygon, polygonPath]);

  const getSelectedPanelData = useCallback(() => {
    if (!grid || grid.length === 0) return { panel_layout: [], building_width: 0, building_length: 0 };

    const building_length = grid.length * (parseFloat(length) + parseFloat(spacingNS));
    const building_width = grid[0].length * (parseFloat(width) + parseFloat(spacingEW));

    const layoutArray = grid.map(row => row.map(cell => {
      if (cell === 'obstruction') return 'obstruction';
      return cell.selected ? true : false;
    }));

  console.log('Full layout array:');
  layoutArray.forEach((row, rowIndex) => {
    console.log(`Row ${rowIndex}: ${row.join(', ')}`);
  });

    return {
      panel_layout: layoutArray,
      building_width: Math.round(building_width),
      building_length: Math.round(building_length)
    };
  }, [grid, width, length, spacingEW, spacingNS]);

  const sendLayoutToAPI = async (layoutData) => {
    const authToken = localStorage.getItem('authToken');

    try {
      const response = await fetch('https://api-training.pzse.com/api/internal/ballast/projects', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(layoutData),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Layout data successfully submitted:', data);
        Swal.fire({
          title: 'Success!',
          text: 'Layout data successfully submitted',
          icon: 'success',
          confirmButtonText: 'Ok'
        });
      } else {
        console.error('Failed to submit layout data:', response.status, response.statusText);
        Swal.fire({
          title: 'Error!',
          text: 'Failed to submit layout data',
          icon: 'error',
          confirmButtonText: 'Ok'
        });
      }
    } catch (error) {
      console.error('Error during API call:', error);
      Swal.fire({
        title: 'Error!',
        text: 'An error occurred during the API call',
        icon: 'error',
        confirmButtonText: 'Ok'
      });
    }
  };
  
  const handleSaveLayout = () => {
    const { panel_layout, building_width, building_length } = getSelectedPanelData();
    
    const submissionData = {
      ...formData, // Spread all existing form data
      panel_layout: panel_layout,
      building_width: building_width,
      building_length: building_length,
      building_rotation: 0, // Set building rotation to 0
      panel_width: parseFloat(formData.pv_module_ew_width),
      panel_length: parseFloat(formData.pv_module_ns_length),
      lat: parseFloat(formData.lat),
      lng: parseFloat(formData.lng)
    };
  
    // Remove any fields that shouldn't be sent to the API
    delete submissionData.latLng;
  
    // Ensure all numeric fields are parsed as numbers
    const numericFields = [
      'allowable_pv_dead_load', 'avg_roof_pitch', 'distance_between_panels_ew', 
      'distance_between_panels_ns', 'ground_snow_load', 'parapet_height', 
      'pv_module_weight', 'roof_height', 'setback_distance', 'tilt_angle', 
      'wind_speed'
    ];
  
    numericFields.forEach(field => {
      if (submissionData[field]) {
        submissionData[field] = parseFloat(submissionData[field]);
      }
    });
  
    console.log('Full submission data:', submissionData);
    sendLayoutToAPI(submissionData);
  };

  return (
    <div style={{ height: '800px', width: '100%', position: 'relative' }}>
      <div style={{
        position: 'absolute',
        top: '60px',
        left: '10px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'whitesmoke',
        border: '1px solid #ccc',
        borderRadius: '5px',
        gap: '3px'
      }}>
        <button onClick={() => shiftGrid('up', 0.1)}>Up</button>
        <button onClick={() => shiftGrid('down', 0.1)}>Down</button>
        <button onClick={() => shiftGrid('left', 0.1)}>Right</button>
        <button onClick={() => shiftGrid('right', 0.1)}>Left</button>
      </div>
      <button onClick={handleSaveLayout} style={{
        position: 'absolute',
        top: '10px',
        right: '60px',
        zIndex: 1000,
        padding: '7px',
        backgroundColor: 'whitesmoke',
        border: '1px solid #ccc',
        borderRadius: '3px'
      }}>
        Save Layout
      </button>
      <button onClick={clearAll} style={{
        position: 'absolute',
        top: '10px',
        left: '36%',
        zIndex: 1000,
        padding: '7px',
        backgroundColor: 'whitesmoke',
        border: '1px solid #ccc',
        borderRadius: '3px'
      }}>
        Clear All
      </button>
      <button 
        onClick={toggleOrientation} 
        style={{
          position: 'absolute',
          top: '10px',
          left: '30%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          padding: '7px',
          backgroundColor: 'whitesmoke',
          border: '1px solid #ccc',
          borderRadius: '3px'
        }}
      >
        {isLandscape ? 'Rotate Panels: 0°' : 'Rotate Panels: 90°'}
      </button>
      <div style={{
        position: 'absolute',
        width: '125px',
        top: '10px',
        right: '325px',
        zIndex: 1000,
        backgroundColor: 'whitesmoke',
        border: '1px solid #ccc',
        borderRadius: '3px',
        padding: '7px',
        display: 'flex',
        justifyItems: 'center'
      }}>
        <button onClick={toggleMode}>
          {mode === "panel" ? "Set Obstructions" : "Set Panels"}
        </button>
      </div>
      <GoogleMap
        mapContainerStyle={{ height: '100%', width: '100%' }}
        center={mapCenter}
        zoom={zoom || 20}
        options={{ mapTypeId: 'satellite' }}
        onLoad={onLoad}
        onUnmount={onUnmount}
        tilt={0}
        onClick={handleMapClick}
      >
        {drawingManagerOptions && (
          <DrawingManager
            onLoad={(drawingManager) => {
              drawingManagerRef.current = drawingManager;
              console.log("Drawing Manager loaded", drawingManager);
            }}
            onPolygonComplete={handleOverlayComplete}
            onOverlayComplete={handleOverlayComplete}
            options={drawingManagerOptions}
          />
        )}
      </GoogleMap>
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '170px',
        zIndex: 1000,
        padding: '7px',
        backgroundColor: 'whitesmoke',
        border: '1px solid #ccc',
        borderRadius: '3px'
      }}>
        Selected Panels: {selectedPanelCount}
      </div>
      <footer className="inline-flex bg-white rounded shadow dark:bg-gray-900 mt-3 mb-2 w-full  ">
          <div className="w-full max-w-screen-xl mx-auto px-4">
            <div className="sm:flex sm:flex-row sm:items-center sm:justify-between">
              <a
                href="https://portal.pzse.com/"
                rel="noreferrer"
                target="_blank"
                className="flex items-center mb-4 sm:mb-0 space-x-3 rtl:space-x-reverse"
              >
                <img
                  src="https://raw.githubusercontent.com/PZSE/HTMLImageHosting/main/final_pzse_logo_transparent.png"
                  className="h-20"
                  alt="Flowbite Logo"
                />
              </a>
              <span className="block text-sm text-gray-600 sm:text-center">
              © 2024{" "}
              <a
                href="https://portal.pzse.com/"
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
              >
                PZSE Structural Engineers
              </a>
              . All Rights Reserved.
              </span>
              <hr className="mt-1 mb-1 border-gray-200 sm:mx-auto dark:border-gray-700" />
              <span className="block text-xs text-gray-400 sm:text-center mb-1">
                This application is licensed by PZSE Structural Engineers and available under the terms and conditions of the agreement provided to selected clients for the specified software
              </span>
            </div>
          </div>
        </footer>
    </div>
  );
}

export default SatelliteLayoutTool;
