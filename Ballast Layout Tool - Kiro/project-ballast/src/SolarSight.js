import React, { useState, useRef, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import {
  generateSetbackPolygon,
  processPolygon,
  findLongestEdge,
  getSelectedPanelData,
  calculateBoundingBoxDimensions,
} from "./utils/PolygonProcessing";
import { ArrayManager } from "./utils/ArrayManager";
import { ArrayToGridReconciler } from "./utils/ArrayToGridReconciler";
import ArrayCreationTool from "./Components/ArrayCreationTool";
import ArrayControlPanel from "./Components/ArrayControlPanel";
import ObstructionDrawingTool from "./Components/ObstructionDrawingTool";
import WorkflowControlPanel from "./Components/WorkflowControlPanel";
import ArrayWorkflowPanel from "./Components/ArrayWorkflowPanel";
import ErrorBoundary from "./Components/ErrorBoundary";
import SolarSightMap from "./Components/SolarSightMap";
import SolarPanelScene from "./Components/SolarPanelScene";
import PanelObstructionManager from "./Components/PanelObstructionManager";
import { generateObstructionSetbacks } from "./utils/ObstructionSetback";

function isPolygonClockwise(pathArray) {
  let sum = 0;
  for (let i = 0; i < pathArray.length; i++) {
    const current = pathArray[i];
    const next = pathArray[(i + 1) % pathArray.length];
    sum += (next.lng - current.lng) * (next.lat + current.lat);
  }
  return sum > 0; // If true, polygon is clockwise
}

function createGridMapping(fullGrid) {
  // First find the bounds of non-null panels
  let minRow = fullGrid.length;
  let maxRow = 0;
  let minCol = fullGrid[0].length;
  let maxCol = 0;

  // Scan grid for actual panel positions
  for (let row = 0; row < fullGrid.length; row++) {
    for (let col = 0; col < fullGrid[0].length; col++) {
      if (fullGrid[row][col] !== null) {
        minRow = Math.min(minRow, row);
        maxRow = Math.max(maxRow, row);
        minCol = Math.min(minCol, col);
        maxCol = Math.max(maxCol, col);
      }
    }
  }

  // Create arrays of valid indices
  const activeRows = [];
  const activeCols = [];

  for (let row = minRow; row <= maxRow; row++) {
    if (fullGrid[row].some((cell) => cell !== null)) {
      activeRows.push(row);
    }
  }

  for (let col = minCol; col <= maxCol; col++) {
    if (fullGrid.some((row) => row[col] !== null)) {
      activeCols.push(col);
    }
  }

  // Create mapping dictionaries
  const gridRowToLayout = {};
  const gridColToLayout = {};

  activeRows.forEach((row, index) => {
    gridRowToLayout[row] = index;
  });

  activeCols.forEach((col, index) => {
    gridColToLayout[col] = index;
  });

  console.log("Created grid mapping:", {
    activeRows,
    activeCols,
    gridRowToLayout,
    gridColToLayout,
    boundingBox: {
      minRow,
      maxRow,
      minCol,
      maxCol,
    },
  });

  return {
    activeRows,
    activeCols,
    gridRowToLayout,
    gridColToLayout,
    totalRows: activeRows.length,
    totalCols: activeCols.length,
  };
}

function SolarSightComponent({ formData, onSave, existingLayout }) {
  // formData is now passed as a prop instead of from context
  // onSave callback for when user saves the layout
  // existingLayout is optional - for loading saved layouts

  const mapRef = useRef(null);
  const drawingManagerRef = useRef(null); //
  const [drawingManagerOptions, setDrawingManagerOptions] = useState(null);
  const [setbackPolygon, setSetbackPolygon] = useState(null);
  const [panelPolygons, setPanelPolygons] = useState([]);
  const [polygonPath, setPolygonPath] = useState([]);
  const [polygons, setPolygons] = useState([]);
  const [selectedPolygonIndex, setSelectedPolygonIndex] = useState(null);

  const [isLandscape, setIsLandscape] = useState(true);
  const [dPadRotation, setDPadRotation] = useState(0); // State for D-pad rotation
  const [mode, setMode] = useState("panels");
  const [isMapInitialized, setIsMapInitialized] = useState(false);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [mapCenter, setMapCenter] = useState(
    formData?.latLng || { lat: 40.7128, lng: -74.006 }
  );
  const [zoom, setZoom] = useState(20);

  // Array-based layout state (NEW)
  const [arrayManager, setArrayManager] = useState(null);
  const [arrays, setArrays] = useState([]);
  const [selectedArrayId, setSelectedArrayId] = useState(null);
  const [isArrayCreationMode, setIsArrayCreationMode] = useState(false);
  const [useArrayMode, setUseArrayMode] = useState(true); // Toggle between old/new system

  // Array creation sub-workflow state
  const [arrayCreationStep, setArrayCreationStep] = useState("idle"); // 'idle' | 'origin' | 'rows' | 'columns' | 'finalize'
  const [currentArrayDraft, setCurrentArrayDraft] = useState(null); // Array being created

  // Obstruction workflow state
  const [workflowState, setWorkflowState] = useState("building"); // 'building' | 'building-edit' | 'obstructions' | 'obstructions-edit' | 'arrays'
  const [obstructions, setObstructions] = useState([]);
  const [obstructionSetbackPolygons, setObstructionSetbackPolygons] = useState(
    []
  );
  const [pendingBuildingPolygon, setPendingBuildingPolygon] = useState(null); // Polygon being edited

  // Memoize map options to prevent unnecessary re-renders
  const mapOptions = React.useMemo(
    () => ({
      mapTypeId: "satellite",
      tilt: 0, // Disable tilt (keep map flat/straight)
      rotateControl: false, // Hide the rotate/tilt control button
    }),
    []
  );

  // Add mount logging effect here
  useEffect(() => {
    console.log("SolarSight mounting with existing layout:", existingLayout);

    // Since we're wrapped in LoadScript, Google Maps should be loaded
    // Set it to true immediately
    setIsGoogleMapsLoaded(true);
  }, [existingLayout]);

  useEffect(() => {
    if (
      !existingLayout?.panel_layout ||
      !mapRef.current ||
      !isGoogleMapsLoaded
    ) {
      console.log("Skipping reconstruction - conditions not met");
      return;
    }

    const panels = existingLayout.panel_layout;
    console.log("Starting reconstruction with panels:", panels);

    setPolygons([]);
    setSelectedPolygonIndex(null);

    const processedPolygons = [];

    panels.forEach((polygonData, currentPolygonIndex) => {
      // When processing an existing polygon from saved data, preserve or calculate dimensions
      let buildingWidth, buildingLength, buildingArea;
      let buildingWidthFeet, buildingLengthFeet, buildingAreaFeet;

      // Check if building dimensions exist in the saved data
      if (polygonData.building_width && polygonData.building_length) {
        // Use the saved dimensions (they should be in feet)
        buildingWidthFeet = parseFloat(polygonData.building_width);
        buildingLengthFeet = parseFloat(polygonData.building_length);
        buildingAreaFeet = polygonData.building_area
          ? parseFloat(polygonData.building_area)
          : buildingWidthFeet * buildingLengthFeet;

        // Convert to meters for internal calculations
        buildingWidth = buildingWidthFeet / 3.28084;
        buildingLength = buildingLengthFeet / 3.28084;
        buildingArea = buildingAreaFeet / 10.7639;

        console.log(
          `Using saved building dimensions for polygon ${currentPolygonIndex}:`,
          {
            widthFeet: buildingWidthFeet,
            lengthFeet: buildingLengthFeet,
            areaFeet: buildingAreaFeet,
          }
        );
      } else {
        // Calculate dimensions from the vertices
        if (polygonData.vertices && Array.isArray(polygonData.vertices)) {
          const dimensions = calculateBoundingBoxDimensions(
            polygonData.vertices
          );
          buildingWidth = dimensions.width;
          buildingLength = dimensions.length;
          buildingArea = dimensions.area;
          buildingWidthFeet = dimensions.widthFeet;
          buildingLengthFeet = dimensions.lengthFeet;
          buildingAreaFeet = dimensions.areaFeet;

          console.log(
            `Calculated building dimensions for polygon ${currentPolygonIndex}:`,
            {
              widthFeet: buildingWidthFeet,
              lengthFeet: buildingLengthFeet,
              areaFeet: buildingAreaFeet,
            }
          );
        } else {
          // Fallback if no vertices available
          console.warn(
            `No vertices available for polygon ${currentPolygonIndex} - using default dimensions`
          );
          buildingWidthFeet = 0;
          buildingLengthFeet = 0;
          buildingAreaFeet = 0;
        }
      }

      if (!polygonData.vertices || !Array.isArray(polygonData.vertices)) {
        console.warn("Missing vertices data for polygon:", polygonData);
        return;
      }

      // Create the polygon path
      const path = polygonData.vertices.map(
        (vertex) => new window.google.maps.LatLng(vertex.lat, vertex.lng)
      );

      // Create original polygon
      const originalPolygon = new window.google.maps.Polygon({
        paths: path,
        fillColor: "#0000FF",
        fillOpacity: 0.1,
        strokeWeight: 2,
        clickable: true,
        editable: true,
        zIndex: 1,
        draggable: false,
        map: mapRef.current,
      });

      // Create setback polygon
      const setbackDistanceMeters =
        parseFloat(formData.setback_distance) * 0.3048;
      const pathForSetback = originalPolygon.getPath().getArray();
      const setbackPolygon = new window.google.maps.Polygon({
        paths: generateSetbackPolygon(pathForSetback, setbackDistanceMeters),
        strokeColor: "#FFA500",
        strokeOpacity: 1,
        strokeWeight: 2,
        fillColor: "#00FF00",
        fillOpacity: 0.1,
        zIndex: 20,
        geodesic: false,
        editable: false,
        map: mapRef.current,
      });

      // Process the polygon and create panel grid
      const newPanelPolygons = processPolygon(
        polygonData.vertices,
        setbackPolygon,
        mapRef,
        formData,
        0,
        0,
        polygonData.building_rotation,
        polygonData.is_clockwise
      );

      // Create grid mapping
      const gridMapping = createGridMapping(newPanelPolygons.grid);

      // Add detailed logging here
      console.log("Processing polygon layout:", {
        polygonIndex: currentPolygonIndex,
        layoutDimensions: {
          rows: polygonData.layout.length,
          cols: polygonData.layout[0].length,
        },
        gridDimensions: {
          rows: newPanelPolygons.grid.length,
          cols: newPanelPolygons.grid[0].length,
        },
        mapping: {
          activeRows: gridMapping.activeRows.length,
          activeCols: gridMapping.activeCols.length,
        },
        states: {
          trueCount: polygonData.layout.flat().filter((x) => x === true).length,
          obstructionCount: polygonData.layout
            .flat()
            .filter((x) => !isNaN(parseFloat(x)) && x !== true && x !== false)
            .length,
          intersectCount: polygonData.layout
            .flat()
            .filter((x) => x === "intersects").length,
        },
      });

      // Inside the panels.forEach loop in the reconstruction effect
      if (newPanelPolygons.panelPolygons) {
        const layout = polygonData.layout;
        const gridMapping = createGridMapping(newPanelPolygons.grid);

        console.log("Grid mapping created:", {
          totalGridRows: newPanelPolygons.grid.length,
          totalGridCols: newPanelPolygons.grid[0].length,
          activeRows: gridMapping.activeRows.length,
          activeCols: gridMapping.activeCols.length,
          layoutRows: layout.length,
          layoutCols: layout[0].length,
        });

        newPanelPolygons.panelPolygons.forEach((panel) => {
          // Don't process panels that are outside the setback
          if (!panel.isInsideSetback) {
            panel.setMap(null);
            return;
          }

          // Get the actual grid indices
          const gridRow = panel.index.row;
          const gridCol = panel.index.col;

          // Convert grid indices to layout indices
          const layoutRow = gridMapping.gridRowToLayout[gridRow];
          const layoutCol = gridMapping.gridColToLayout[gridCol];

          console.log("Panel mapping:", {
            gridRow,
            gridCol,
            layoutRow,
            layoutCol,
            hasState:
              layoutRow !== undefined &&
              layoutCol !== undefined &&
              layoutRow < layout.length &&
              layoutCol < layout[0].length,
          });

          if (
            layoutRow !== undefined &&
            layoutCol !== undefined &&
            layoutRow < layout.length &&
            layoutCol < layout[0].length
          ) {
            const state = layout[layoutRow][layoutCol];

            // Handle each possible state
            if (state === true) {
              panel.state = "selected";
              panel.setOptions({
                fillColor: "#00FF00",
                fillOpacity: 0.5,
                zIndex: 1001,
                clickable: true,
                visible: true, // Make sure panel remains clickable
              });
            } else if (state === false) {
              panel.state = "normal";
              panel.setOptions({
                fillColor: "#0000FF",
                fillOpacity: 0.25,
                zIndex: 1000,
                clickable: true, // Make sure panel remains clickable,
                visible: true,
              });
            } else if (
              typeof state === "number" ||
              (typeof state === "string" && !isNaN(state))
            ) {
              const height = parseFloat(state);
              panel.state = "obstructed";
              panel.obstructionHeight = height;
              panel.setOptions({
                fillColor: "#FF0000",
                fillOpacity: 0.5,
                zIndex: 1002,
                clickable: true, // Make sure panel remains clickable
                visible: true,
              });
              // Create the text overlay
              addTextOverlay(panel, height);
            } else if (state === "intersects") {
              panel.state = "intersects";
              panel.setOptions({
                fillColor: "#FFA500",
                fillOpacity: 0.5,
                zIndex: 999,
                clickable: false,
                visible: true,
              });
            }
          } else {
            panel.setOptions({
              visible: false,
            });
          }
        });
      }

      processedPolygons.push({
        originalPolygon,
        setbackPolygon,
        panelPolygons: newPanelPolygons,
        gridOffsetX: 0,
        gridOffsetY: 0,
        rotationAngle: polygonData.building_rotation,
        isClockwise: polygonData.is_clockwise,
        orientation: polygonData.orientation || 0,
        totalRotationAngle: polygonData.building_rotation,
        isLandscape: polygonData.orientation % 180 === 0,
        polygonId: polygonData.polygon_id,
        gridMapping,
        // Store the building dimensions
        buildingWidth,
        buildingLength,
        buildingArea,
        buildingWidthFeet,
        buildingLengthFeet,
        buildingAreaFeet,
      });
    });

    console.log("Setting processed polygons:", processedPolygons);
    setPolygons(processedPolygons);
    setSelectedPolygonIndex(0);
  }, [existingLayout, mapRef.current, isGoogleMapsLoaded, formData]);

  useEffect(() => {
    console.log("Form data:", formData);
  }, [formData]);

  useEffect(() => {
    if (isGoogleMapsLoaded && window.google) {
      setDrawingManagerOptions({
        drawingMode: window.google.maps.drawing.OverlayType.POLYGON, // Start in polygon mode by default
        drawingControl: false, // Hide the default drawing control (workflow is in sidebar)
        drawingControlOptions: {
          position: window.google.maps.ControlPosition.TOP_LEFT,
          drawingModes: [
            window.google.maps.drawing.OverlayType.POLYGON,
            window.google.maps.drawing.OverlayType.RECTANGLE,
          ],
        },
        polygonOptions: {
          fillColor: "#0000FF",
          fillOpacity: 0.1,
          strokeWeight: 2,
          clickable: true,
          editable: true,
          zIndex: 1,
          draggable: false,
        },
        rectangleOptions: {
          fillColor: "#00FF00",
          fillOpacity: 0.2,
          strokeWeight: 1,
          clickable: false,
          editable: false,
          draggable: false,
        },
      });
    }
  }, [isGoogleMapsLoaded]);

  // Function to check if a panel intersects with the selection rectangle
  const doesPanelIntersectRectangle = (panel, rectangle) => {
    // Create a rectangle path (clockwise)
    const bounds = rectangle.getBounds();
    const rectangleBounds = new window.google.maps.LatLngBounds(
      bounds.getSouthWest(),
      bounds.getNorthEast()
    );

    // Get the panel's path
    const panelPath = panel.getPath().getArray();

    // Check for intersection using Google Maps geometry library
    return panelPath.some((point) => rectangleBounds.contains(point));
  };

  const handleRectangleComplete = useCallback(
    (rectangle) => {
      if (selectedPolygonIndex === null) {
        rectangle.setMap(null);
        return;
      }

      const bounds = rectangle.getBounds();
      const selectedPolygon = polygons[selectedPolygonIndex];

      if (!selectedPolygon.panelPolygons?.panelPolygons) {
        rectangle.setMap(null);
        return;
      }

      setPolygons((prevPolygons) => {
        const updatedPolygons = [...prevPolygons];
        const currentPolygon = { ...updatedPolygons[selectedPolygonIndex] };
        const grid = currentPolygon.panelPolygons.grid; // Get reference to the grid

        // Check if we're using an East/West system
        const isEastWestSystem =
          formData.sun_ballast_system === "east-west-system";

        // Track which pairs have been processed (for East/West system)
        const processedPairs = new Set();

        currentPolygon.panelPolygons.panelPolygons.forEach((panel) => {
          if (
            doesPanelIntersectRectangle(panel, rectangle) &&
            panel.isInsideSetback
          ) {
            // Skip obstructed panels
            if (panel.state === "obstructed") {
              return;
            }

            // For East/West system, handle panels in pairs
            if (isEastWestSystem && panel.pairIndex !== undefined) {
              // Skip if we already processed this pair
              if (processedPairs.has(panel.pairIndex)) {
                return;
              }

              // Mark this pair as processed
              processedPairs.add(panel.pairIndex);

              // Find both panels in the pair
              const pairIndex = panel.pairIndex;
              const eastRow = Math.floor(pairIndex / grid[0].length) * 2;
              const westRow = eastRow + 1;
              const pairCol = pairIndex % grid[0].length;

              const eastPanel = grid[eastRow] && grid[eastRow][pairCol];
              const westPanel = grid[westRow] && grid[westRow][pairCol];

              // Only proceed if both panels exist and are inside setback
              if (
                eastPanel &&
                westPanel &&
                eastPanel.isInsideSetback &&
                westPanel.isInsideSetback
              ) {
                // Get current state of the east panel (they should be in sync)
                const newState =
                  eastPanel.state === "selected" ? "normal" : "selected";

                // Update east panel
                eastPanel.state = newState;
                eastPanel.setOptions({
                  fillColor: newState === "selected" ? "#00FF00" : "#0000FF",
                  fillOpacity: newState === "selected" ? 0.5 : 0.25,
                  zIndex: newState === "selected" ? 1001 : 1000,
                });

                // Update west panel
                westPanel.state = newState;
                westPanel.setOptions({
                  fillColor: newState === "selected" ? "#00FF00" : "#000080",
                  fillOpacity: newState === "selected" ? 0.5 : 0.3,
                  zIndex: newState === "selected" ? 1001 : 1000,
                });

                // Update grid references if needed
                if (grid[eastRow][pairCol] !== eastPanel) {
                  grid[eastRow][pairCol] = eastPanel;
                }
                if (grid[westRow][pairCol] !== westPanel) {
                  grid[westRow][pairCol] = westPanel;
                }
              }
            } else {
              // Original code for north/south system - single panel updates
              const row = panel.index.row;
              const col = panel.index.col;

              // Make sure we have valid indices
              if (
                row === undefined ||
                col === undefined ||
                !grid[row] ||
                !grid[row][col]
              ) {
                console.warn("Invalid panel indices:", row, col);
                return;
              }

              // Update both visual state and grid data
              if (panel.state === "selected") {
                panel.state = "normal";
                panel.setOptions({
                  fillColor: "#0000FF",
                  fillOpacity: 0.25,
                  zIndex: 1000,
                });
              } else {
                panel.state = "selected";
                panel.setOptions({
                  fillColor: "#00FF00",
                  fillOpacity: 0.5,
                  zIndex: 1001,
                });
              }

              if (grid[row][col] !== panel) {
                console.warn(
                  "Grid panel reference mismatch. Updating grid reference."
                );
                grid[row][col] = panel;
              }
            }
          }
        });

        // Log some stats to debug
        let selectedCount = 0;
        let normalCount = 0;
        currentPolygon.panelPolygons.panelPolygons.forEach((panel) => {
          if (panel.state === "selected") selectedCount++;
          if (panel.state === "normal") normalCount++;
        });
        console.log(
          `After rectangle: Selected panels: ${selectedCount}, Normal panels: ${normalCount}`
        );

        updatedPolygons[selectedPolygonIndex] = currentPolygon;
        return updatedPolygons;
      });

      rectangle.setMap(null);
      if (drawingManagerRef.current) {
        drawingManagerRef.current.setDrawingMode(null);
      }
    },
    [selectedPolygonIndex, polygons, formData]
  );

  // Add this helper function to check for self-intersection
  const isPolygonSelfIntersecting = (pathArray) => {
    const isLineIntersecting = (a1, a2, b1, b2) => {
      // Convert lat/lng to x,y coordinates for easier calculation
      const points = [a1, a2, b1, b2].map((p) => ({
        x: p.lng,
        y: p.lat,
      }));

      const ccw = (A, B, C) => {
        return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
      };

      return (
        ccw(points[0], points[2], points[3]) !==
          ccw(points[1], points[2], points[3]) &&
        ccw(points[0], points[1], points[2]) !==
          ccw(points[0], points[1], points[3])
      );
    };

    // Check each line segment against every other line segment
    for (let i = 0; i < pathArray.length; i++) {
      for (let j = i + 2; j < pathArray.length; j++) {
        // Skip adjacent segments
        if (i === 0 && j === pathArray.length - 1) continue;

        const line1Start = pathArray[i];
        const line1End = pathArray[(i + 1) % pathArray.length];
        const line2Start = pathArray[j];
        const line2End = pathArray[(j + 1) % pathArray.length];

        if (isLineIntersecting(line1Start, line1End, line2Start, line2End)) {
          return true;
        }
      }
    }
    return false;
  };

  const rotateLayoutGrid90Degrees = (layout) => {
    if (!layout || !layout.length || !layout[0].length) return layout;

    const rows = layout.length;
    const cols = layout[0].length;
    const rotated = Array(cols)
      .fill()
      .map(() => Array(rows).fill());

    // Rotate 90 degrees clockwise
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        rotated[c][rows - 1 - r] = layout[r][c];
      }
    }

    return rotated;
  };

  const handlePolygonComplete = useCallback(
    (polygon) => {
      console.log("🔵 handlePolygonComplete called!");
      console.log("🔵 Current workflowState:", workflowState);
      console.log("🔵 Polygon object:", polygon);

      // Only handle building polygons when in 'building' workflow state
      // Obstruction polygons are handled by ObstructionDrawingTool
      if (workflowState !== "building") {
        console.log(
          "🟢 IGNORING polygon - not in building mode, current state:",
          workflowState
        );
        console.log(
          "🟢 This polygon should be handled by ObstructionDrawingTool"
        );
        return;
      }

      console.log("🔴 PROCESSING as building polygon");

      const path = polygon.getPath().getArray();
      const pathArray = path.map((latLng) => ({
        lat: latLng.lat(),
        lng: latLng.lng(),
      }));

      // Check for self-intersection
      if (isPolygonSelfIntersecting(pathArray)) {
        Swal.fire({
          title: "Invalid Polygon",
          text: "The polygon cannot intersect itself. Please draw a simple polygon without crossing lines.",
          icon: "error",
          confirmButtonText: "OK",
        });
        // Remove the invalid polygon and reset drawing mode
        polygon.setMap(null);
        if (drawingManagerRef.current) {
          drawingManagerRef.current.setDrawingMode(
            window.google.maps.drawing.OverlayType.POLYGON
          );
        }
        return;
      }

      // Calculate bounding box dimensions
      const boundingBoxDimensions = calculateBoundingBoxDimensions(pathArray);
      console.log("Building bounding box dimensions:", boundingBoxDimensions);

      // Calculate minimum required size based on panel dimensions and setback
      const panelWidth = parseFloat(formData.pv_module_ew_width) * 0.3048; // Convert to meters
      const panelLength = parseFloat(formData.pv_module_ns_length) * 0.3048;
      const setbackDistance = parseFloat(formData.setback_distance) * 0.3048;
      const minSize = Math.max(panelWidth, panelLength) + setbackDistance * 2;

      if (
        boundingBoxDimensions.width < minSize ||
        boundingBoxDimensions.length < minSize
      ) {
        Swal.fire({
          title: "Polygon Too Small",
          text: "The building outline is too small to fit any panels with the current setback distance. Please draw a larger polygon.",
          icon: "warning",
          confirmButtonText: "OK",
        });
        // Remove the invalid polygon and reset drawing mode
        polygon.setMap(null);
        if (drawingManagerRef.current) {
          drawingManagerRef.current.setDrawingMode(
            window.google.maps.drawing.OverlayType.POLYGON
          );
        }
        return;
      }

      // If we get here, the polygon is valid, so disable drawing mode
      if (drawingManagerRef.current) {
        drawingManagerRef.current.setDrawingMode(null);
      }

      // Make the polygon editable and store it for later processing
      polygon.setOptions({
        editable: true,
        draggable: false,
        strokeColor: "#2196F3",
        strokeWeight: 3,
        fillColor: "#2196F3",
        fillOpacity: 0.2,
      });

      // Store the polygon and transition to edit mode
      setPendingBuildingPolygon({
        polygon: polygon,
        pathArray: pathArray,
        boundingBoxDimensions: boundingBoxDimensions,
      });

      console.log("🟡 Building polygon drawn, transitioning to EDIT mode");
      setWorkflowState("building-edit");
    },
    [formData, mapRef, workflowState, useArrayMode]
  );

  // Handle map initialization
  const handleMapLoad = useCallback(
    (map) => {
      console.log("Map loaded");
      mapRef.current = map;
      setIsMapInitialized(true);

      // Immediately initialize drawing manager if options are already set
      if (drawingManagerOptions) {
        const drawingManager = new window.google.maps.drawing.DrawingManager(
          drawingManagerOptions
        );
        drawingManager.setMap(map);
        drawingManagerRef.current = drawingManager;

        // Add polygon complete listener
        window.google.maps.event.addListener(
          drawingManager,
          "polygoncomplete",
          handlePolygonComplete
        );
      }
    },
    [drawingManagerOptions, handlePolygonComplete]
  );

  // Initialize or reinitialize drawing manager when map is loaded and options are set
  useEffect(() => {
    console.log("Drawing manager effect triggered:", {
      isMapInitialized,
      hasOptions: !!drawingManagerOptions,
      hasMap: !!mapRef.current,
    });

    if (!isMapInitialized || !drawingManagerOptions || !mapRef.current) {
      return;
    }

    // Clean up existing drawing manager
    if (drawingManagerRef.current) {
      window.google.maps.event.clearInstanceListeners(
        drawingManagerRef.current
      );
      drawingManagerRef.current.setMap(null);
    }

    // Create new drawing manager
    const drawingManager = new window.google.maps.drawing.DrawingManager(
      drawingManagerOptions
    );
    drawingManager.setMap(mapRef.current);
    drawingManagerRef.current = drawingManager;

    const polygonListener = window.google.maps.event.addListener(
      drawingManager,
      "polygoncomplete",
      handlePolygonComplete
    );

    const rectangleListener = window.google.maps.event.addListener(
      drawingManager,
      "rectanglecomplete",
      handleRectangleComplete
    );

    return () => {
      if (drawingManagerRef.current) {
        window.google.maps.event.removeListener(polygonListener);
        window.google.maps.event.removeListener(rectangleListener);
        drawingManagerRef.current.setMap(null);
        drawingManagerRef.current = null;
      }
    };
  }, [
    isMapInitialized,
    drawingManagerOptions,
    handlePolygonComplete,
    handleRectangleComplete,
    workflowState,
  ]);

  const handleMapUnmount = useCallback(() => {
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setMap(null);
    }
    mapRef.current = null;
    setIsMapInitialized(false);
  }, []);

  const addTextOverlay = useCallback(
    (panel, height) => {
      if (panel.textOverlay) {
        panel.textOverlay.setMap(null);
      }

      const bounds = new window.google.maps.LatLngBounds();
      panel.getPath().forEach((latLng) => bounds.extend(latLng));
      const center = bounds.getCenter();

      const textOverlay = new window.google.maps.OverlayView();
      textOverlay.setMap(mapRef.current);

      textOverlay.onAdd = function () {
        const div = document.createElement("div");
        div.style.position = "absolute";
        div.style.color = "black";
        div.style.fontWeight = "bold";
        div.style.textAlign = "center";
        div.style.textShadow =
          "1px 1px 2px rgba(255,255,255,0.7), -1px -1px 2px rgba(255,255,255,0.7), 1px -1px 2px rgba(255,255,255,0.7), -1px 1px 2px rgba(255,255,255,0.7)";
        div.innerHTML = `${height}'`;
        this.div_ = div;

        const panes = this.getPanes();
        panes.overlayLayer.appendChild(div);
      };

      textOverlay.draw = function () {
        const div = this.div_;
        const overlayProjection = this.getProjection();
        const position = overlayProjection.fromLatLngToDivPixel(center);

        // Get the bounds of the panel
        const sw = overlayProjection.fromLatLngToDivPixel(
          bounds.getSouthWest()
        );
        const ne = overlayProjection.fromLatLngToDivPixel(
          bounds.getNorthEast()
        );

        // Calculate the width of the panel in pixels
        const panelWidth = Math.abs(ne.x - sw.x);

        // Set the font size based on the panel width
        const fontSize = Math.max(16, Math.min(24, panelWidth / 4)); // Min 10px, Max 16px
        div.style.fontSize = `${fontSize}px`;

        // Position the div
        div.style.left = `${position.x - div.offsetWidth / 2}px`;
        div.style.top = `${position.y - div.offsetHeight / 2}px`;
      };

      // Add a method to remove the overlay
      textOverlay.onRemove = function () {
        if (this.div_) {
          this.div_.parentNode.removeChild(this.div_);
          delete this.div_;
        }
      };

      // Trigger a redraw when the zoom changes
      const zoomChangedListener = mapRef.current.addListener(
        "zoom_changed",
        () => {
          textOverlay.draw();
        }
      );

      panel.textOverlay = textOverlay;
      panel.zoomChangedListener = zoomChangedListener;
    },
    [mapRef]
  );

  // Array workflow navigation handlers (NEW)
  const handleArrayWorkflowNext = useCallback(() => {
    console.log(
      "🔵 Array workflow Next clicked, current step:",
      arrayCreationStep
    );

    if (arrayCreationStep === "origin" && currentArrayDraft) {
      // Move from origin placement to rotation
      setArrayCreationStep("rotate");
    } else if (arrayCreationStep === "rotate" && currentArrayDraft) {
      // Move from rotation to row configuration
      setArrayCreationStep("rows");
    } else if (arrayCreationStep === "rows" && currentArrayDraft) {
      // Move from rows to columns
      setArrayCreationStep("columns");
    } else if (arrayCreationStep === "columns" && currentArrayDraft) {
      // Move to finalize step
      setArrayCreationStep("finalize");
    } else if (arrayCreationStep === "finalize" && currentArrayDraft) {
      // Finalize the array - get the LATEST values from ArrayManager
      const latestArray = arrayManager.getArray(currentArrayDraft.id);
      console.log(
        "🔵 Array finalized - latest from ArrayManager:",
        latestArray
      );
      console.log("🔵 Current arrays state:", arrays);
      console.log("🔵 Looking for array with ID:", currentArrayDraft.id);

      // Hide and disable all arrows when saving the array
      if (currentArrayDraft.leftArrow) {
        currentArrayDraft.leftArrow.setVisible(false);
        currentArrayDraft.leftArrow.setDraggable(false);
      }
      if (currentArrayDraft.rightArrow) {
        currentArrayDraft.rightArrow.setVisible(false);
        currentArrayDraft.rightArrow.setDraggable(false);
      }
      if (currentArrayDraft.upArrow) {
        currentArrayDraft.upArrow.setVisible(false);
        currentArrayDraft.upArrow.setDraggable(false);
      }
      if (currentArrayDraft.downArrow) {
        currentArrayDraft.downArrow.setVisible(false);
        currentArrayDraft.downArrow.setDraggable(false);
      }

      // Check if we're editing an existing array or creating a new one
      // Use the callback form to get the latest arrays state
      setArrays((prev) => {
        console.log("🔵 Arrays in callback:", prev);
        const existingArrayIndex = prev.findIndex(
          (a) => a.id === currentArrayDraft.id
        );
        console.log("🔵 Existing array index:", existingArrayIndex);

        if (existingArrayIndex !== -1) {
          // Editing existing array - update it in place with latest values from ArrayManager
          console.log(
            "✏️ Updating existing array at index:",
            existingArrayIndex
          );
          const updated = [...prev];
          updated[existingArrayIndex] = latestArray;
          console.log("✏️ Updated arrays list:", updated);
          return updated;
        } else {
          // Creating new array - add it to the list with latest values from ArrayManager
          console.log("➕ Adding new array with ID:", currentArrayDraft.id);
          return [...prev, latestArray];
        }
      });

      // Also sync with ArrayManager to ensure consistency
      if (arrayManager) {
        console.log(
          "🔄 Syncing with ArrayManager, arrays:",
          arrayManager.getAllArrays()
        );
      }

      setCurrentArrayDraft(null);
      setArrayCreationStep("idle");
      setIsArrayCreationMode(false);
    }
  }, [arrayCreationStep, currentArrayDraft, arrays]);

  const handleArrayRotate = useCallback(() => {
    if (!currentArrayDraft || !arrayManager) return;

    console.log("🔄 Rotating array +90° - resetting rows and columns to 1");

    // Add 90 degrees each time (0° → 90° → 180° → 270° → 360°/0°)
    const currentRotation = currentArrayDraft.rotation || 0;
    const newRotation = (currentRotation + 90) % 360;
    currentArrayDraft.rotation = newRotation;

    // Reset rows and columns back to 1 when rotating
    // User needs to pick the right orientation before building the array
    currentArrayDraft.rows = 1;
    currentArrayDraft.cols = 1;

    // Regenerate panels with new rotation (will be a single panel)
    arrayManager.generateArrayPanels(currentArrayDraft, mapRef.current);

    // Update the draft
    setCurrentArrayDraft({ ...currentArrayDraft });

    console.log(
      "Array rotated from",
      currentRotation + "° to",
      newRotation + "° (rows and cols reset to 1)"
    );
  }, [currentArrayDraft, arrayManager, mapRef]);

  const handleArrayWorkflowBack = useCallback(() => {
    console.log(
      "🔴 Array workflow Back clicked, current step:",
      arrayCreationStep
    );

    if (arrayCreationStep === "finalize" && currentArrayDraft) {
      // Go back to columns from finalize (when editing)
      setArrayCreationStep("columns");
    } else if (arrayCreationStep === "columns" && currentArrayDraft) {
      // Go back to rows
      setArrayCreationStep("rows");
    } else if (arrayCreationStep === "rows" && currentArrayDraft) {
      // Go back to rotation
      setArrayCreationStep("rotate");
    } else if (arrayCreationStep === "rotate" && currentArrayDraft) {
      // Go back to origin placement
      setArrayCreationStep("origin");
    } else if (arrayCreationStep === "origin" && currentArrayDraft) {
      // Cancel array creation/editing
      if (currentArrayDraft.originMarker) {
        currentArrayDraft.originMarker.setMap(null);
      }
      // Remove any panels
      if (currentArrayDraft.panelPolygons) {
        currentArrayDraft.panelPolygons.forEach((panel) => panel.setMap(null));
      }
      // Remove arrows
      if (currentArrayDraft.leftArrow) currentArrayDraft.leftArrow.setMap(null);
      if (currentArrayDraft.rightArrow)
        currentArrayDraft.rightArrow.setMap(null);
      if (currentArrayDraft.upArrow) currentArrayDraft.upArrow.setMap(null);
      if (currentArrayDraft.downArrow) currentArrayDraft.downArrow.setMap(null);

      setCurrentArrayDraft(null);
      setArrayCreationStep("idle");
      setIsArrayCreationMode(false);
    }
  }, [arrayCreationStep, currentArrayDraft]);

  // Array management callbacks (NEW)
  const handleArrayCreated = useCallback((array) => {
    console.log("Array created:", array);
    setCurrentArrayDraft(array);
    setArrayCreationStep("origin");
  }, []);

  const handleArrayUpdated = useCallback((array) => {
    console.log("Array updated:", array);
    // Update the draft array - keep the reference to ArrayManager's array object
    // so we always have the latest values
    setCurrentArrayDraft(array);
  }, []);

  const handleSelectArray = useCallback(
    (arrayId) => {
      if (arrayManager) {
        const id = arrayId ? parseInt(arrayId) : null;
        arrayManager.selectArray(id);
        setSelectedArrayId(id);
        setArrays(arrayManager.getAllArrays());
      }
    },
    [arrayManager]
  );

  const handleRotateArray = useCallback(
    (arrayId, rotation) => {
      if (arrayManager && mapRef.current) {
        const array = arrayManager.getArray(arrayId);
        if (array) {
          arrayManager.updateArrayRotation(array, rotation, mapRef.current);
          setArrays(arrayManager.getAllArrays());
        }
      }
    },
    [arrayManager, mapRef]
  );

  const handleDeleteArray = useCallback(
    (arrayId) => {
      if (arrayManager) {
        arrayManager.deleteArray(arrayId);
        setArrays(arrayManager.getAllArrays());
        setSelectedArrayId(null);
      }
    },
    [arrayManager]
  );

  const handleEditArray = useCallback(
    (arrayId) => {
      if (!arrayManager || !mapRef.current) return;

      console.log("✏️ Editing array:", arrayId);

      // Get the array to edit
      const array = arrayManager.getArray(arrayId);
      if (!array) {
        console.error("Array not found:", arrayId);
        return;
      }

      // Keep the existing array panels visible during edit
      // They will be regenerated when arrows are moved
      console.log(
        "✏️ Keeping",
        array.panelPolygons.length,
        "panels visible for editing"
      );

      // Position arrows at the current extent of the array (not at origin)
      if (
        array.leftArrow &&
        array.rightArrow &&
        array.upArrow &&
        array.downArrow
      ) {
        const origin = new window.google.maps.LatLng(
          array.origin.lat,
          array.origin.lng
        );
        const buildingRotation = arrayManager.buildingRotation || 0;
        const arrayRotation = array.rotation || 0;
        const totalRotation = buildingRotation + arrayRotation;

        // Get panel dimensions
        const panelWidthFeet = parseFloat(
          arrayManager.formData.pv_module_ew_width
        );
        const panelWidthMeters = panelWidthFeet * 0.3048;
        const spacingEWMeters =
          parseFloat(arrayManager.formData.distance_between_panels_ew) * 0.3048;
        const unitWidth = panelWidthMeters + spacingEWMeters;

        const panelLengthFeet = parseFloat(
          arrayManager.formData.pv_module_ns_length
        );
        const panelLengthMeters = panelLengthFeet * 0.3048;
        const spacingNSMeters =
          parseFloat(arrayManager.formData.distance_between_panels_ns) * 0.3048;
        const unitLength = panelLengthMeters + spacingNSMeters;

        // Position arrows at their SAVED positions from creation
        // Left arrow: rowsLeft panels away (negative direction)
        // Right arrow: rowsRight panels away (positive direction)
        // Up arrow: colsUp panels away (perpendicular up)
        // Down arrow: colsDown panels away (perpendicular down)
        const minOffset = 1.5;

        console.log("✏️ Array dimensions:", {
          rows: array.rows,
          cols: array.cols,
          rowsLeft: array.rowsLeft,
          rowsRight: array.rowsRight,
          colsUp: array.colsUp,
          colsDown: array.colsDown,
          unitWidth,
          unitLength,
        });

        const leftDistance =
          array.rowsLeft > 0 ? array.rowsLeft * unitWidth : minOffset;
        const rightDistance =
          array.rowsRight > 0 ? array.rowsRight * unitWidth : minOffset;
        const upDistance =
          array.colsUp > 0 ? array.colsUp * unitLength : minOffset;
        const downDistance =
          array.colsDown > 0 ? array.colsDown * unitLength : minOffset;

        console.log("✏️ Calculated arrow distances:", {
          leftDistance,
          rightDistance,
          upDistance,
          downDistance,
        });

        // Position left/right arrows at the actual extent of the rows
        const leftPos = window.google.maps.geometry.spherical.computeOffset(
          origin,
          leftDistance,
          (totalRotation + 180) % 360
        );
        array.leftArrow.setPosition(leftPos);

        const rightPos = window.google.maps.geometry.spherical.computeOffset(
          origin,
          rightDistance,
          totalRotation
        );
        array.rightArrow.setPosition(rightPos);

        // Position up/down arrows at the actual extent of the columns
        const upPos = window.google.maps.geometry.spherical.computeOffset(
          origin,
          upDistance,
          (totalRotation + 90) % 360
        );
        array.upArrow.setPosition(upPos);

        const downPos = window.google.maps.geometry.spherical.computeOffset(
          origin,
          downDistance,
          (totalRotation + 270) % 360
        );
        array.downArrow.setPosition(downPos);

        console.log("✏️ Arrows repositioned to array extent:", {
          rows: array.rows,
          cols: array.cols,
          rowsLeft: array.rowsLeft,
          rowsRight: array.rowsRight,
          colsUp: array.colsUp,
          colsDown: array.colsDown,
          leftDistance,
          rightDistance,
          upDistance,
          downDistance,
        });
      }

      // Re-enable and show arrows for editing
      if (array.leftArrow) {
        array.leftArrow.setVisible(true);
        array.leftArrow.setDraggable(true);
      }
      if (array.rightArrow) {
        array.rightArrow.setVisible(true);
        array.rightArrow.setDraggable(true);
      }
      if (array.upArrow) {
        array.upArrow.setVisible(true);
        array.upArrow.setDraggable(true);
      }
      if (array.downArrow) {
        array.downArrow.setVisible(true);
        array.downArrow.setDraggable(true);
      }

      // IMPORTANT: Set the SAME array object as draft (not a copy)
      // This ensures drag handlers modify the actual array in ArrayManager
      console.log("✏️ Setting array as draft:", array);
      console.log(
        "✏️ Array has",
        array.panelPolygons.length,
        "panels currently"
      );
      setCurrentArrayDraft(array);

      // Enter creation mode
      setIsArrayCreationMode(true);

      // Jump to the last step (finalize) so user can navigate back through the workflow
      setArrayCreationStep("finalize");

      // Select this array
      setSelectedArrayId(arrayId);

      console.log(
        "✏️ Array loaded for editing - user can now navigate back through steps"
      );
    },
    [arrayManager, mapRef]
  );

  const handleToggleCreationMode = useCallback(() => {
    const newMode = !isArrayCreationMode;
    setIsArrayCreationMode(newMode);
    setSelectedArrayId(null);

    // When entering creation mode, start at 'origin' step
    if (newMode) {
      console.log(
        "🟢 Entering array creation mode - waiting for origin placement"
      );
      // Don't set arrayCreationStep yet - wait for user to click on map
      // The click will trigger onArrayCreated which sets the step to 'origin'
    } else {
      // When exiting creation mode, reset to idle
      setArrayCreationStep("idle");
      setCurrentArrayDraft(null);
    }
  }, [isArrayCreationMode]);

  const toggleOrientation = useCallback(() => {
    if (selectedPolygonIndex === null) return;

    setPolygons((prevPolygons) => {
      const updatedPolygons = [...prevPolygons];
      const selectedPolygon = { ...updatedPolygons[selectedPolygonIndex] };

      console.log("Selected Polygon before rotation:", selectedPolygon);

      if (
        !selectedPolygon.panelPolygons ||
        !selectedPolygon.panelPolygons.panelPolygons ||
        !Array.isArray(selectedPolygon.panelPolygons.panelPolygons)
      ) {
        console.error(
          "Invalid panelPolygons structure:",
          selectedPolygon.panelPolygons
        );
        return prevPolygons;
      }

      // Update orientation and rotationAngle
      selectedPolygon.orientation = (selectedPolygon.orientation + 90) % 360;
      selectedPolygon.isLandscape = selectedPolygon.orientation % 180 === 0;
      selectedPolygon.totalRotationAngle =
        (selectedPolygon.rotationAngle + selectedPolygon.orientation) % 360;

      // Store information about obstructed panels only (not selected ones)
      const obstructedPanels = [];

      // Clear existing panel polygons and text overlays
      selectedPolygon.panelPolygons.panelPolygons.forEach((panel) => {
        if (panel.state === "obstructed") {
          obstructedPanels.push({
            row: panel.index.row,
            col: panel.index.col,
            height: panel.obstructionHeight,
          });
        }

        if (panel.textOverlay) {
          panel.textOverlay.setMap(null);
          if (panel.zoomChangedListener) {
            window.google.maps.event.removeListener(panel.zoomChangedListener);
          }
        }
        if (panel.setMap) {
          panel.setMap(null);
        }
      });

      // Generate new panel polygons with updated orientation
      const originalPath = selectedPolygon.originalPolygon.getPath().getArray();
      const pathArray = originalPath.map((latLng) => ({
        lat: latLng.lat(),
        lng: latLng.lng(),
      }));

      const { panelPolygons, grid } = processPolygon(
        pathArray,
        selectedPolygon.setbackPolygon,
        mapRef,
        formData,
        selectedPolygon.gridOffsetX,
        selectedPolygon.gridOffsetY,
        selectedPolygon.totalRotationAngle,
        selectedPolygon.isClockwise
      );

      selectedPolygon.panelPolygons = { panelPolygons, grid };

      // Only reapply obstructions, not selections
      selectedPolygon.panelPolygons.panelPolygons.forEach((panel) => {
        const obstructed = obstructedPanels.find(
          (p) => p.row === panel.index.row && p.col === panel.index.col
        );
        if (obstructed) {
          panel.state = "obstructed";
          panel.obstructionHeight = obstructed.height;
          panel.setOptions({
            fillColor: "#FF0000",
            fillOpacity: 0.5,
            zIndex: 1002,
          });
          addTextOverlay(panel, obstructed.height);
        }
        // Don't reapply 'selected' state - all non-obstructed panels stay as 'normal'
      });

      console.log("After rotation:", {
        orientation: selectedPolygon.orientation,
        rotationAngle: selectedPolygon.rotationAngle,
        isLandscape: selectedPolygon.isLandscape,
      });
      selectedPolygon.eastWestRotationApplied =
        updatedPolygons[selectedPolygonIndex].eastWestRotationApplied;

      updatedPolygons[selectedPolygonIndex] = selectedPolygon;
      return updatedPolygons;
    });
  }, [selectedPolygonIndex, formData, mapRef, processPolygon, addTextOverlay]);

  useEffect(() => {
    // This effect will run when formData.sun_ballast_system changes
    if (
      formData.sun_ballast_system === "east-west-system" &&
      polygons.length > 0
    ) {
      console.log(
        "East-west system detected, applying 90 degree rotation to panels"
      );

      // Apply the rotation to each polygon
      setPolygons((prevPolygons) => {
        return prevPolygons.map((polygon) => {
          // Only modify orientation if it hasn't already been modified for east-west
          // We can use a flag in the polygon object to track this
          if (!polygon.eastWestRotationApplied) {
            return {
              ...polygon,
              orientation: (polygon.orientation || 0) + 90,
              totalRotationAngle: (polygon.rotationAngle || 0) + 90,
              eastWestRotationApplied: true, // Mark as rotated for east-west
              isLandscape: !polygon.isLandscape, // Toggle landscape/portrait
            };
          }
          return polygon;
        });
      });
    }
  }, [formData.sun_ballast_system, polygons.length]);

  useEffect(() => {
    if (polygonPath.length > 0 && setbackPolygon && mapRef.current) {
      panelPolygons.forEach((polygon) => polygon.setMap(null));
      const newPanelPolygons = processPolygon(
        polygonPath,
        setbackPolygon,
        mapRef,
        formData,
        isLandscape
      );
      setPanelPolygons(newPanelPolygons);
    }
  }, [isLandscape, polygonPath, setbackPolygon, formData]);

  const updatePolygonColors = useCallback(() => {
    polygons.forEach((poly, index) => {
      const color = index === selectedPolygonIndex ? "#00BFFF" : "#000000";
      poly.originalPolygon.setOptions({
        strokeColor: color,
        strokeWeight: index === selectedPolygonIndex ? 3 : 2,
      });
    });
  }, [polygons, selectedPolygonIndex]);

  useEffect(() => {
    updatePolygonColors();
  }, [selectedPolygonIndex, updatePolygonColors]);

  // Manage drawing manager based on workflow state and array creation mode (NEW)
  useEffect(() => {
    console.log("🔷 Drawing manager control effect triggered");
    console.log("🔷 workflowState:", workflowState);
    console.log("🔷 isArrayCreationMode:", isArrayCreationMode);
    console.log("🔷 drawingManagerRef.current:", !!drawingManagerRef.current);

    if (drawingManagerRef.current) {
      if (isArrayCreationMode || workflowState === "arrays") {
        console.log("🔷 Disabling drawing manager for array creation");
        drawingManagerRef.current.setDrawingMode(null);
        drawingManagerRef.current.setOptions({ drawingControl: false });
      } else if (workflowState === "building") {
        console.log("🔷 Enabling polygon drawing mode for building");
        drawingManagerRef.current.setDrawingMode(
          window.google.maps.drawing.OverlayType.POLYGON
        );
        drawingManagerRef.current.setOptions({
          drawingControl: false, // Keep control hidden (workflow in sidebar)
        });
      } else if (workflowState === "building-edit") {
        console.log(
          "🔷 Disabling drawing manager for building edit (polygon is editable)"
        );
        drawingManagerRef.current.setDrawingMode(null);
        drawingManagerRef.current.setOptions({ drawingControl: false });
      } else if (workflowState === "obstructions") {
        console.log("🔷 ========================================");
        console.log("🔷 WORKFLOW STATE IS OBSTRUCTIONS");
        console.log(
          "🔷 Drawing manager will be controlled by ObstructionDrawingTool"
        );
        console.log("🔷 ========================================");
        // ObstructionDrawingTool will take control of the drawing manager
        // We just need to make sure it's not disabled
      } else if (workflowState === "obstructions-edit") {
        console.log(
          "🔷 Disabling drawing manager for obstruction edit (polygons are editable)"
        );
        drawingManagerRef.current.setDrawingMode(null);
        drawingManagerRef.current.setOptions({ drawingControl: false });
      }
    }
  }, [isArrayCreationMode, workflowState]);

  // Initialize ArrayManager when polygon is selected and obstructions are complete (NEW)
  useEffect(() => {
    if (selectedPolygonIndex !== null && polygons[selectedPolygonIndex]) {
      const polygon = polygons[selectedPolygonIndex];

      // Only initialize ArrayManager when we're in the arrays workflow state
      if (workflowState !== "arrays") {
        return;
      }

      if (!polygon.setbackPolygon || !polygon.originalPolygon) {
        console.warn("Polygon missing required polygons for ArrayManager");
        return;
      }

      // Get obstructions for this polygon (if any)
      const polygonObstructions = polygon.obstructions || [];

      const manager = new ArrayManager(
        formData,
        polygon.setbackPolygon,
        polygon.originalPolygon,
        polygon.totalRotationAngle || 0,
        polygonObstructions
      );

      setArrayManager(manager);
      setArrays([]);
      setSelectedArrayId(null);
      setIsArrayCreationMode(false);

      console.log(
        "ArrayManager initialized for polygon",
        selectedPolygonIndex,
        "with",
        polygonObstructions.length,
        "obstructions"
      );
    }
  }, [selectedPolygonIndex, polygons, formData, workflowState]);

  const shiftGrid = useCallback(
    (direction, amount) => {
      if (selectedPolygonIndex === null) return;

      setPolygons((prevPolygons) => {
        const updatedPolygons = [...prevPolygons];
        const selectedPolygon = { ...updatedPolygons[selectedPolygonIndex] };

        // Store if this is an East-West system
        const isEastWestSystem =
          formData.sun_ballast_system === "east-west-system";

        // Get rotation angle in radians for grid movement calculation
        const theta = selectedPolygon.totalRotationAngle * (Math.PI / 180);
        const isTopEdge = selectedPolygon.isTopEdge;

        // Calculate movement based on the direction
        let deltaX_grid = 0;
        let deltaY_grid = 0;

        // Invert the direction if needed based on edge position and winding
        const shouldInvert =
          (selectedPolygon.isClockwise && !isTopEdge) ||
          (!selectedPolygon.isClockwise && isTopEdge);

        const effectiveDirection = shouldInvert
          ? {
              up: "down",
              down: "up",
              left: "right",
              right: "left",
            }[direction]
          : direction;

        // Calculate the movement perpendicular/parallel to longest edge
        switch (effectiveDirection) {
          case "up":
            deltaX_grid = -amount * Math.sin(theta);
            deltaY_grid = -amount * Math.cos(theta);
            break;
          case "down":
            deltaX_grid = amount * Math.sin(theta);
            deltaY_grid = amount * Math.cos(theta);
            break;
          case "left":
            deltaX_grid = -amount * Math.cos(theta);
            deltaY_grid = amount * Math.sin(theta);
            break;
          case "right":
            deltaX_grid = amount * Math.cos(theta);
            deltaY_grid = -amount * Math.sin(theta);
            break;
        }

        selectedPolygon.gridOffsetX += deltaX_grid;
        selectedPolygon.gridOffsetY += deltaY_grid;

        // Store information about obstructed and selected panels
        const panelStates = [];

        // For East-West systems, store pair information
        const pairStates = new Map();

        selectedPolygon.panelPolygons.panelPolygons.forEach((panel) => {
          if (panel.state === "obstructed" || panel.state === "selected") {
            if (isEastWestSystem && panel.pairIndex !== undefined) {
              // For East-West, store state by pair index
              if (!pairStates.has(panel.pairIndex)) {
                pairStates.set(panel.pairIndex, {
                  state: panel.state,
                  height: panel.obstructionHeight,
                });
              }
            } else {
              // For regular panels or South-facing systems
              panelStates.push({
                row: panel.index.row,
                col: panel.index.col,
                state: panel.state,
                height: panel.obstructionHeight,
              });
            }
          }

          if (panel.textOverlay) {
            panel.textOverlay.setMap(null);
          }
          if (panel.setMap) {
            panel.setMap(null);
          }
        });

        // Save all rotation properties
        const originalRotationAngle = selectedPolygon.rotationAngle;
        const originalOrientation = selectedPolygon.orientation || 0;
        const originalTotalRotation = selectedPolygon.totalRotationAngle;
        const originalIsLandscape = selectedPolygon.isLandscape;
        const wasEastWestRotated = selectedPolygon.eastWestRotationApplied;

        console.log("Before shift - Rotation properties:", {
          rotationAngle: originalRotationAngle,
          orientation: originalOrientation,
          totalRotation: originalTotalRotation,
          isLandscape: originalIsLandscape,
          eastWestRotationApplied: wasEastWestRotated,
        });

        // Calculate the rotation to use with processPolygon
        // Key insight: For East-West systems, we need to remove the 90-degree rotation
        // that was added automatically, but keep any manual rotations
        let rotationToUse = originalTotalRotation;

        if (isEastWestSystem && wasEastWestRotated) {
          // Extract just the building rotation and manual orientation, without the automatic 90°
          rotationToUse = originalRotationAngle;

          // Add any manual rotation from the "Rotate Panels" button
          if (originalOrientation !== 0 && originalOrientation !== 90) {
            rotationToUse += originalOrientation;
          }

          console.log("Adjusted rotation for East-West system:", {
            original: originalTotalRotation,
            adjusted: rotationToUse,
          });
        }

        // Generate new panel polygons with updated offsets
        const originalPath = selectedPolygon.originalPolygon
          .getPath()
          .getArray();
        const pathArray = originalPath.map((latLng) => ({
          lat: latLng.lat(),
          lng: latLng.lng(),
        }));

        const { panelPolygons, grid } = processPolygon(
          pathArray,
          selectedPolygon.setbackPolygon,
          mapRef,
          formData, // Keep using original formData to maintain East-West panel pairs
          selectedPolygon.gridOffsetX,
          selectedPolygon.gridOffsetY,
          rotationToUse, // Use our calculated rotation value
          selectedPolygon.isClockwise
        );

        selectedPolygon.panelPolygons = { panelPolygons, grid };

        // Restore all rotation properties
        selectedPolygon.rotationAngle = originalRotationAngle;
        selectedPolygon.orientation = originalOrientation;
        selectedPolygon.totalRotationAngle = originalTotalRotation;
        selectedPolygon.isLandscape = originalIsLandscape;
        selectedPolygon.eastWestRotationApplied = wasEastWestRotated;

        console.log("After shift - Restored rotation properties:", {
          rotationAngle: selectedPolygon.rotationAngle,
          orientation: selectedPolygon.orientation,
          totalRotationAngle: selectedPolygon.totalRotationAngle,
          isLandscape: selectedPolygon.isLandscape,
          eastWestRotationApplied: selectedPolygon.eastWestRotationApplied,
        });

        // Reapply panel states
        if (isEastWestSystem) {
          // For East-West systems, need to restore state by pair
          selectedPolygon.panelPolygons.panelPolygons.forEach((panel) => {
            if (
              panel.pairIndex !== undefined &&
              pairStates.has(panel.pairIndex)
            ) {
              const savedState = pairStates.get(panel.pairIndex);

              panel.state = savedState.state;
              if (savedState.state === "obstructed") {
                panel.obstructionHeight = savedState.height;
                panel.setOptions({
                  fillColor: "#FF0000",
                  fillOpacity: 0.5,
                  zIndex: 1002,
                });
                addTextOverlay(panel, savedState.height);
              } else if (savedState.state === "selected") {
                panel.setOptions({
                  fillColor: "#00FF00",
                  fillOpacity: 0.5,
                  zIndex: 1001,
                });
              }
            }
          });
        } else {
          // For standard systems, restore by row/col
          selectedPolygon.panelPolygons.panelPolygons.forEach((panel) => {
            const savedState = panelStates.find(
              (p) => p.row === panel.index.row && p.col === panel.index.col
            );
            if (savedState) {
              panel.state = savedState.state;
              if (savedState.state === "obstructed") {
                panel.obstructionHeight = savedState.height;
                panel.setOptions({
                  fillColor: "#FF0000",
                  fillOpacity: 0.5,
                  zIndex: 1002,
                });
                addTextOverlay(panel, savedState.height);
              } else if (savedState.state === "selected") {
                panel.setOptions({
                  fillColor: "#00FF00",
                  fillOpacity: 0.5,
                  zIndex: 1001,
                });
              }
            }
          });
        }

        updatedPolygons[selectedPolygonIndex] = selectedPolygon;
        return updatedPolygons;
      });
    },
    [selectedPolygonIndex, formData, mapRef, processPolygon, addTextOverlay]
  );

  const dPadButtonStyle = {
    backgroundColor: "white",
    border: "1px solid #ccc",
    borderRadius: "50%",
    fontSize: "20px",
    fontWeight: "bold",
    cursor: "pointer",
    outline: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  };

  // Define a new style specifically for the "↑" button
  const dPadButtonStyleUp = {
    backgroundColor: "red", // Red background to stand out
    color: "white", // White text for contrast
    border: "1px solid #ccc",
    borderRadius: "50%",
    fontSize: "20px",
    fontWeight: "bold",
    cursor: "pointer",
    outline: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  };

  const sendLayoutToAPI = async (layoutData) => {
    const authToken = localStorage.getItem("authToken");

    try {
      const response = await fetch(
        "https://api-training.pzse.com/api/internal/ballast/projects",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(layoutData),
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Layout data successfully submitted:", data);
        console.log("API Response:", JSON.stringify(data, null, 2));
        Swal.fire({
          title: "Success!",
          text: "Layout data successfully submitted",
          icon: "success",
          confirmButtonText: "Ok",
        });
      } else {
        console.error(
          "Failed to submit layout data:",
          response.status,
          response.statusText
        );
        Swal.fire({
          title: "Error!",
          text: "Failed to submit layout data",
          icon: "error",
          confirmButtonText: "Ok",
        });
      }
    } catch (error) {
      console.error("Error during API call:", error);
      Swal.fire({
        title: "Error!",
        text: "An error occurred during the API call",
        icon: "error",
        confirmButtonText: "Ok",
      });
    }
  };

  // This function should be in your SolarSightComponent

  // In SolarSightComponent.jsx, find the handleSaveLayout function and modify it as follows:

  const handleSaveLayout = useCallback(() => {
    const layoutData = polygons.map((polygon, index) => {
      console.log(`Processing polygon ${index}:`, polygon);
      console.log(`Polygon ${index} isClockwise:`, polygon.isClockwise);

      // Get the layout data
      let layout, building_width, building_length, building_area;

      // NEW: Check if using array mode
      if (
        useArrayMode &&
        arrayManager &&
        arrayManager.getAllArrays().length > 0
      ) {
        console.log("Using array mode - reconciling arrays to grid");

        // Create reconciler for this polygon
        const reconciler = new ArrayToGridReconciler(
          formData,
          polygon.originalPolygon,
          polygon.setbackPolygon,
          polygon.totalRotationAngle || 0
        );

        // Reconcile arrays to grid
        const { layout: reconciledLayout, metadata } = reconciler.reconcile(
          arrayManager.getAllArrays()
        );

        layout = reconciledLayout;
        building_width = polygon.buildingWidthFeet || 0;
        building_length = polygon.buildingLengthFeet || 0;
        building_area = polygon.buildingAreaFeet || 0;

        console.log("Reconciled layout:", {
          rows: metadata.rows,
          cols: metadata.cols,
          totalPanels: metadata.totalPanels,
          selectedPanels: metadata.selectedPanels,
        });
      } else {
        // OLD: Use existing panel selection method
        console.log("Using click mode - getting selected panel data");
        const data = getSelectedPanelData(polygon, formData);
        layout = data.layout;
        building_width = data.building_width;
        building_length = data.building_length;
        building_area = data.building_area;
      }

      // For east-west systems, actually rotate the layout grid
      let rotatedLayout = layout;
      if (formData.sun_ballast_system === "east-west-system") {
        console.log("East-west system: Rotating layout grid 90 degrees");
        rotatedLayout = rotateLayoutGrid90Degrees(layout);

        // Also swap width and length if needed for Excel representation
        const temp = building_width;
        building_width = building_length;
        building_length = temp;

        // Area should remain the same
      }

      // Get all vertices of the polygon
      const vertices = polygon.originalPolygon
        .getPath()
        .getArray()
        .map((point) => ({
          lat: point.lat(),
          lng: point.lng(),
        }));

      const simplifiedLayout = rotatedLayout.map((row) =>
        row.map((cell) => {
          if (typeof cell === "object" && cell.isObstructed) {
            return cell.height; // Just return the height value as a string
          }
          return cell; // Return other values as they are
        })
      );

      // Get the original rotation value
      let buildingRotation = polygon.rotationAngle || 0;

      // For east-west systems, add 90 degrees to the rotation
      if (formData.sun_ballast_system === "east-west-system") {
        buildingRotation = buildingRotation + 90;
        console.log(
          `Applied east-west transformation: rotation ${polygon.rotationAngle} → ${buildingRotation}`
        );
      }

      // Start with common data for both system types
      const polygonData = {
        polygon_id: index,
        layout: simplifiedLayout,
        building_width,
        building_length,
        building_area,
        building_rotation: buildingRotation, // Use the adjusted rotation value
        orientation: polygon.orientation || 0,
        is_landscape: polygon.isLandscape,
        panel_width: parseFloat(formData.pv_module_ew_width),
        panel_length: parseFloat(formData.pv_module_ns_length),
        lat: polygon.originalPolygon.getPath().getAt(0).lat(),
        lng: polygon.originalPolygon.getPath().getAt(0).lng(),
        vertices: vertices,
        is_clockwise: polygon.isClockwise,
      };

      // Add system-specific data
      if (formData.sun_ballast_system === "east-west-system") {
        // For East-West system, include both ridge and valley gaps
        polygonData.ridge_gap = formData.ridge_gap;
        polygonData.valley_gap = formData.valley_gap;

        // Convert roof_clearance from inches to feet - FIX HERE
        const roofClearanceInches = formData.roof_clearance || "3.2";
        polygonData.roof_clearance = (
          parseFloat(roofClearanceInches) / 12
        ).toString();

        // Keep distance_between_panels_ns for API compatibility, set to valley_gap
        if (formData.valley_gap) {
          polygonData.distance_between_panels_ns = formData.valley_gap;
        }

        // Also consider swapping panel width and length if needed
        // This depends on how your Excel calculator expects the dimensions
        const temp = polygonData.panel_width;
        polygonData.panel_width = polygonData.panel_length;
        polygonData.panel_length = temp;
      }

      console.log(`Polygon ${index} data:`, polygonData);
      return polygonData;
    });

    const submissionData = {
      ...formData,
      lat: formData.latLng.lat,
      lng: formData.latLng.lng,
      panel_layout: layoutData,
      panel_width: parseFloat(formData.pv_module_ew_width),
      panel_length: parseFloat(formData.pv_module_ns_length),
      building_width:
        layoutData.length > 0 ? layoutData[0].building_width : null,
      building_length:
        layoutData.length > 0 ? layoutData[0].building_length : null,
      building_area: layoutData.length > 0 ? layoutData[0].building_area : null,
      building_rotation:
        layoutData.length > 0 ? layoutData[0].building_rotation : 0,
    };

    // For east-west systems, swap the panel dimensions at the root level too
    if (formData.sun_ballast_system === "east-west-system") {
      const temp = submissionData.panel_width;
      submissionData.panel_width = submissionData.panel_length;
      submissionData.panel_length = temp;

      // Convert roof_clearance in the root submission data too - FIX HERE
      if (submissionData.roof_clearance) {
        submissionData.roof_clearance = (
          parseFloat(submissionData.roof_clearance) / 12
        ).toString();
      }
    }

    // Remove any fields that shouldn't be sent to the API
    delete submissionData.latLng;

    // Ensure all numeric fields are parsed as numbers
    const numericFields = [
      "allowable_pv_dead_load",
      "avg_roof_pitch",
      "distance_between_panels_ew",
      "distance_between_panels_ns",
      "ground_snow_load",
      "parapet_height",
      "pv_module_weight",
      "roof_height",
      "setback_distance",
      "tilt_angle",
      "wind_speed",
      "ridge_gap",
      "valley_gap",
    ];

    numericFields.forEach((field) => {
      if (submissionData[field] != null && submissionData[field] !== "") {
        submissionData[field] = parseFloat(submissionData[field]);
      } else {
        submissionData[field] = "non value"; // or any default value you prefer
      }
    });

    console.log("Full submission data:", submissionData);
    sendLayoutToAPI(submissionData);
  }, [polygons, formData, arrayManager, useArrayMode, sendLayoutToAPI]);

  const getDPadRotation = () => {
    const selectedPolygon = polygons[selectedPolygonIndex];
    return selectedPolygon ? selectedPolygon.totalRotationAngle : 0;
  };

  /**
   * Handle workflow navigation - Next button
   */
  const handleWorkflowNext = useCallback(() => {
    console.log("🟢 Workflow Next clicked, current state:", workflowState);

    if (workflowState === "building-edit" && pendingBuildingPolygon) {
      // Finalize the building polygon and create setback
      const polygon = pendingBuildingPolygon.polygon;
      const path = polygon.getPath().getArray();
      const pathArray = path.map((latLng) => ({
        lat: latLng.lat(),
        lng: latLng.lng(),
      }));
      const boundingBoxDimensions = calculateBoundingBoxDimensions(pathArray);

      // Make polygon non-editable
      polygon.setOptions({
        editable: false,
        strokeColor: "#FF0000",
        fillColor: "#FF0000",
        fillOpacity: 0.1,
      });

      // Create setback polygon
      const setbackDistanceFeet = parseFloat(formData.setback_distance) || 3;
      const setbackDistanceMeters = setbackDistanceFeet * 0.3048;

      const { angle, isClockwise } = findLongestEdge(pathArray);
      const totalRotationAngle = angle % 360;
      const isTopEdge = angle > 0 && angle < 180;

      console.log(
        "Creating setback polygon with distance:",
        setbackDistanceFeet,
        "feet"
      );

      const newSetbackPolygon = new window.google.maps.Polygon({
        paths: generateSetbackPolygon(path, setbackDistanceMeters),
        strokeColor: "#FFA500",
        strokeOpacity: 1,
        strokeWeight: 2,
        fillColor: "#00FF00",
        fillOpacity: 0.1,
        zIndex: 20,
        geodesic: false,
        editable: false,
        map: mapRef.current,
      });

      // Skip giant grid generation (array mode)
      const newPanelPolygons = { panelPolygons: [], grid: [] };

      // Add to polygons array
      const newPolygonData = {
        originalPolygon: polygon,
        setbackPolygon: newSetbackPolygon,
        panelPolygons: newPanelPolygons,
        gridOffsetX: 0,
        gridOffsetY: 0,
        rotationAngle: totalRotationAngle,
        longestEdgeAngle: angle,
        isTopEdge: isTopEdge,
        isClockwise: isClockwise,
        orientation: 0,
        totalRotationAngle: totalRotationAngle,
        isLandscape: true,
        buildingWidth: boundingBoxDimensions.width,
        buildingLength: boundingBoxDimensions.length,
        buildingWidthFeet: boundingBoxDimensions.widthFeet,
        buildingLengthFeet: boundingBoxDimensions.lengthFeet,
        buildingArea: boundingBoxDimensions.area,
        buildingAreaFeet: boundingBoxDimensions.areaFeet,
        obstructions: [],
      };

      // Update all state in sequence - React 18 will batch these automatically
      const newPolygonIndex = polygons.length; // Calculate index before updating
      setPolygons((prevPolygons) => [...prevPolygons, newPolygonData]);
      setSelectedPolygonIndex(newPolygonIndex);
      setPendingBuildingPolygon(null);
      setWorkflowState("obstructions");
      console.log("🟡 Transitioned to OBSTRUCTIONS mode");
    } else if (workflowState === "obstructions") {
      // Transition from drawing obstructions to editing them
      console.log("🟡 Transitioning from obstructions to obstructions-edit");

      // Make all obstruction polygons editable
      obstructions.forEach((obstruction) => {
        if (obstruction.polygon) {
          obstruction.polygon.setOptions({
            editable: true,
            draggable: false,
          });
        }
      });

      setWorkflowState("obstructions-edit");
    } else if (workflowState === "obstructions-edit") {
      // Finalize obstructions and create setbacks
      console.log("🟡 Finalizing obstructions");

      // Update obstruction paths from edited polygons and make them non-editable
      const updatedObstructions = obstructions.map((obstruction) => {
        if (obstruction.polygon) {
          // Get the current path from the edited polygon
          const currentPath = obstruction.polygon.getPath().getArray();
          const updatedPath = currentPath.map((latLng) => ({
            lat: latLng.lat(),
            lng: latLng.lng(),
          }));

          console.log("🔴 Updating obstruction path:", {
            id: obstruction.id,
            oldPathLength: obstruction.path.length,
            newPathLength: updatedPath.length,
            pathChanged:
              JSON.stringify(obstruction.path) !== JSON.stringify(updatedPath),
          });

          // Make polygon non-editable
          obstruction.polygon.setOptions({
            editable: false,
          });

          // Return updated obstruction with new path
          return {
            ...obstruction,
            path: updatedPath,
          };
        }
        return obstruction;
      });

      // Update the obstructions state with edited paths
      setObstructions(updatedObstructions);

      // Generate setback polygons using the UPDATED paths
      const obstructionsWithSetbacks = generateObstructionSetbacks(
        updatedObstructions,
        2
      ); // 2ft default

      // Create invisible polygons for obstruction setbacks
      const setbackPolygons = obstructionsWithSetbacks.map((obstruction) => {
        const setbackPoly = new window.google.maps.Polygon({
          paths: obstruction.setbackPath,
          fillColor: "#FFB6C1",
          fillOpacity: 0,
          strokeColor: "#DC143C",
          strokeOpacity: 0,
          strokeWeight: 0,
          map: mapRef.current,
          zIndex: 25,
          visible: false,
        });
        return setbackPoly;
      });

      setObstructionSetbackPolygons(setbackPolygons);

      // Store obstructions with the current polygon
      if (selectedPolygonIndex !== null) {
        setPolygons((prev) => {
          const updated = [...prev];
          updated[selectedPolygonIndex].obstructions = obstructionsWithSetbacks;
          return updated;
        });
      }

      // Update ArrayManager with obstructions
      if (arrayManager) {
        arrayManager.setObstructions(obstructionsWithSetbacks);
      }

      // Transition to array creation mode
      setWorkflowState("arrays");
      console.log("🟡 Transitioned to ARRAYS mode");

      Swal.fire({
        icon: "success",
        title: "Obstructions Set!",
        text: `${obstructionsWithSetbacks.length} obstruction(s) added. Now you can create panel arrays.`,
        timer: 2000,
        showConfirmButton: false,
      });
    }
  }, [
    workflowState,
    pendingBuildingPolygon,
    formData,
    mapRef,
    obstructions,
    selectedPolygonIndex,
    arrayManager,
  ]);

  /**
   * Handle workflow navigation - Back button
   */
  const handleWorkflowBack = useCallback(() => {
    console.log("🔴 Workflow Back clicked, current state:", workflowState);

    if (workflowState === "building-edit" && pendingBuildingPolygon) {
      // Remove the polygon and go back to drawing
      pendingBuildingPolygon.polygon.setMap(null);
      setPendingBuildingPolygon(null);
      setWorkflowState("building");

      // Re-enable drawing mode
      if (drawingManagerRef.current) {
        drawingManagerRef.current.setDrawingMode(
          window.google.maps.drawing.OverlayType.POLYGON
        );
      }
    } else if (workflowState === "obstructions") {
      // Go back to building edit
      console.log("🔴 Going back from obstructions to building-edit");

      // Remove setback polygon and building polygon from map
      if (selectedPolygonIndex !== null && polygons[selectedPolygonIndex]) {
        const polygon = polygons[selectedPolygonIndex];
        if (polygon.setbackPolygon) {
          polygon.setbackPolygon.setMap(null);
        }
        if (polygon.originalPolygon) {
          // Make it editable again
          polygon.originalPolygon.setOptions({
            editable: true,
            strokeColor: "#2196F3",
            fillColor: "#2196F3",
            fillOpacity: 0.2,
          });

          // Store as pending
          const path = polygon.originalPolygon.getPath().getArray();
          const pathArray = path.map((latLng) => ({
            lat: latLng.lat(),
            lng: latLng.lng(),
          }));
          const boundingBoxDimensions =
            calculateBoundingBoxDimensions(pathArray);

          setPendingBuildingPolygon({
            polygon: polygon.originalPolygon,
            pathArray: pathArray,
            boundingBoxDimensions: boundingBoxDimensions,
          });
        }
      }

      // Remove from polygons array
      setPolygons((prev) => prev.slice(0, -1));
      setSelectedPolygonIndex(null);

      setWorkflowState("building-edit");
    } else if (workflowState === "obstructions-edit") {
      // Go back to drawing obstructions
      console.log("🔴 Going back from obstructions-edit to obstructions");

      // Make all obstruction polygons non-editable
      obstructions.forEach((obstruction) => {
        if (obstruction.polygon) {
          obstruction.polygon.setOptions({
            editable: false,
          });
        }
      });

      // Re-enable drawing mode for obstructions
      if (drawingManagerRef.current) {
        drawingManagerRef.current.setDrawingMode(
          window.google.maps.drawing.OverlayType.POLYGON
        );
      }

      setWorkflowState("obstructions");
    }
  }, [
    workflowState,
    pendingBuildingPolygon,
    drawingManagerRef,
    selectedPolygonIndex,
    polygons,
    obstructions,
  ]);

  /**
   * Handle completion of a single obstruction
   */
  const handleObstructionComplete = useCallback((obstruction) => {
    console.log("Obstruction completed:", obstruction);
    setObstructions((prev) => [...prev, obstruction]);
  }, []);

  /**
   * Handle finish drawing obstructions - generate setbacks and transition to array mode
   */
  const handleFinishObstructions = useCallback(
    (completedObstructions) => {
      console.log("Finishing obstructions:", completedObstructions);

      // Generate setback polygons for all obstructions
      const obstructionsWithSetbacks = generateObstructionSetbacks(
        completedObstructions,
        2
      ); // 2ft default

      // Create invisible polygons for obstruction setbacks (used for calculations only)
      // The setback polygons are hidden to avoid visual clutter, but still used to hide panels
      const setbackPolygons = obstructionsWithSetbacks.map((obstruction) => {
        const setbackPoly = new window.google.maps.Polygon({
          paths: obstruction.setbackPath,
          fillColor: "#FFB6C1", // Color doesn't matter since it's invisible
          fillOpacity: 0, // Invisible
          strokeColor: "#DC143C",
          strokeOpacity: 0, // Invisible
          strokeWeight: 0, // No border
          map: mapRef.current,
          zIndex: 25,
          visible: false, // Explicitly hidden
        });
        return setbackPoly;
      });

      setObstructionSetbackPolygons(setbackPolygons);

      // Store obstructions with the current polygon
      if (selectedPolygonIndex !== null) {
        setPolygons((prev) => {
          const updated = [...prev];
          updated[selectedPolygonIndex].obstructions = obstructionsWithSetbacks;
          return updated;
        });
      }

      // Update ArrayManager with obstructions
      if (arrayManager) {
        arrayManager.setObstructions(obstructionsWithSetbacks);
      }

      // Transition to array creation mode
      setWorkflowState("arrays");
      console.log("Transitioning to array creation mode");

      Swal.fire({
        icon: "success",
        title: "Obstructions Set!",
        text: `${obstructionsWithSetbacks.length} obstruction(s) added. Now you can create panel arrays.`,
        timer: 2000,
        showConfirmButton: false,
      });
    },
    [selectedPolygonIndex, arrayManager, mapRef]
  );

  //const baseRotation = selectedPolygon.totalRotationAngle;

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
      {/* Tools Column */}
      <div
        style={{
          width: "250px",
          backgroundColor: "whitesmoke",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "15px",
          zIndex: 1000,
          overflowY: "auto",
          maxHeight: "100vh",
        }}
      >
        {/* Mode Toggle (NEW) */}
        <div
          style={{
            padding: "12px",
            backgroundColor: useArrayMode ? "#e8f5e9" : "#fff3e0",
            borderRadius: "5px",
            border: `2px solid ${useArrayMode ? "#4CAF50" : "#FF9800"}`,
            fontSize: "12px",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            <input
              type="checkbox"
              checked={useArrayMode}
              onChange={(e) => {
                setUseArrayMode(e.target.checked);
                if (e.target.checked) {
                  setIsArrayCreationMode(false);
                }
              }}
              style={{ marginRight: "8px", width: "16px", height: "16px" }}
            />
            <span>
              {useArrayMode ? "✓ Array Mode (New)" : "Click Mode (Legacy)"}
            </span>
          </label>
          <div
            style={{
              marginTop: "5px",
              fontSize: "10px",
              color: "#666",
              fontStyle: "italic",
            }}
          >
            {useArrayMode
              ? "Click & drag to create panel arrays"
              : "Click individual panels to select"}
          </div>
        </div>

        {/* Workflow Control Panel (Building/Obstructions) - IN SIDEBAR */}
        {useArrayMode &&
          (workflowState === "building" ||
            workflowState === "building-edit" ||
            workflowState === "obstructions" ||
            workflowState === "obstructions-edit") && (
            <WorkflowControlPanel
              currentStep={workflowState}
              onNext={handleWorkflowNext}
              onBack={handleWorkflowBack}
              canGoNext={
                (workflowState === "building-edit" &&
                  pendingBuildingPolygon !== null) ||
                workflowState === "obstructions" ||
                workflowState === "obstructions-edit"
              }
              canGoBack={
                workflowState === "building-edit" ||
                workflowState === "obstructions" ||
                workflowState === "obstructions-edit"
              }
            />
          )}

        {/* Array Workflow Panel (Array Creation) - IN SIDEBAR */}
        {useArrayMode &&
          workflowState === "arrays" &&
          (isArrayCreationMode || arrayCreationStep !== "idle") && (
            <ArrayWorkflowPanel
              currentStep={
                arrayCreationStep === "idle" ? "origin" : arrayCreationStep
              }
              onNext={handleArrayWorkflowNext}
              onBack={handleArrayWorkflowBack}
              onRotate={handleArrayRotate}
              canGoNext={arrayCreationStep !== "idle"} // Allow next on all steps including finalize (becomes "Save")
              canGoBack={arrayCreationStep !== "idle"} // Always allow back when not idle
              arrayCount={arrays.length}
              rowCount={currentArrayDraft?.rows || 0}
              colCount={currentArrayDraft?.cols || 0}
              currentRotation={currentArrayDraft?.rotation || 0}
            />
          )}

        {/* Polygon Selector */}
        <div>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontSize: "12px",
              fontWeight: "bold",
              color: "#666",
            }}
          >
            Building Outline
          </label>
          <select
            value={selectedPolygonIndex !== null ? selectedPolygonIndex : ""}
            onChange={(e) => setSelectedPolygonIndex(Number(e.target.value))}
            style={{
              width: "100%",
              padding: "10px",
              border: "3px solid #00BFFF",
              borderRadius: "5px",
            }}
          >
            <option value="" disabled>
              Select a polygon
            </option>
            {console.log("Current polygons:", polygons)}
            {polygons.map((polygon, index) => {
              console.log("Mapping polygon:", index, polygon);
              return (
                <option key={index} value={index}>
                  Polygon{" "}
                  {polygon.polygonId !== undefined
                    ? polygon.polygonId + 1
                    : index + 1}
                </option>
              );
            })}
          </select>
        </div>

        {/* Array Controls (New Mode) - Hidden during array creation workflow */}
        {useArrayMode && arrayManager && arrayCreationStep === "idle" && (
          <ArrayControlPanel
            arrays={arrays}
            selectedArrayId={selectedArrayId}
            onSelectArray={handleSelectArray}
            onEditArray={handleEditArray}
            onDeleteArray={handleDeleteArray}
            onToggleCreationMode={handleToggleCreationMode}
            isCreationMode={isArrayCreationMode}
          />
        )}

        {/* Old Controls (Click Mode) */}
        {!useArrayMode && (
          <>
            {/* Orientation Toggle Button */}
            <button
              onClick={() => {
                if (
                  selectedPolygonIndex !== null &&
                  polygons[selectedPolygonIndex]
                ) {
                  toggleOrientation();
                }
              }}
              style={{
                width: "100%",
                padding: "10px",
                backgroundColor: "white",
                border: "1px solid #ccc",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              {selectedPolygonIndex !== null &&
              polygons[selectedPolygonIndex]?.isLandscape
                ? "Rotate Panels"
                : "Rotate Panels"}
            </button>

            <PanelObstructionManager
              polygons={polygons}
              setPolygons={setPolygons}
              selectedPolygonIndex={selectedPolygonIndex}
              mapRef={mapRef}
              formData={formData}
              addTextOverlay={addTextOverlay}
            />

            {/* D-Pad Control */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gridTemplateRows: "repeat(3, 1fr)",
                gap: "5px",
                width: "100%",
                aspectRatio: "1",
                transform: `rotate(${
                  selectedPolygonIndex !== null ? getDPadRotation() : 0
                }deg)`,
              }}
            >
              <div></div>
              <button
                onClick={() => shiftGrid("up", 0.1)}
                style={dPadButtonStyle}
              >
                ↑
              </button>
              <div></div>
              <button
                onClick={() => shiftGrid("left", 0.1)}
                style={dPadButtonStyle}
              >
                ←
              </button>
              <div
                style={{
                  backgroundColor: "whitesmoke",
                  border: "1px solid #ccc",
                }}
              ></div>
              <button
                onClick={() => shiftGrid("right", 0.1)}
                style={dPadButtonStyle}
              >
                →
              </button>
              <div></div>
              <button
                onClick={() => shiftGrid("down", 0.1)}
                style={dPadButtonStyle}
              >
                ↓
              </button>
              <div></div>
            </div>
          </>
        )}

        {/* 3D Solar Panel Model - TEMPORARILY DISABLED - Causes map reload */}
        {/* The 3D component loads successfully but triggers a map remount */}
        {/* TODO: Investigate why Three.js loading causes React to remount the map */}
        {false &&
          arrayCreationStep === "rotate" &&
          selectedPolygonIndex !== null &&
          polygons[selectedPolygonIndex] &&
          currentArrayDraft && (
            <div
              style={{
                width: "100%",
                height: "200px",
                border: "2px solid #FF9800",
                borderRadius: "8px",
                overflow: "hidden",
                backgroundColor: "#FFF3E0",
              }}
            >
              <div
                style={{
                  padding: "8px",
                  backgroundColor: "#FF9800",
                  color: "white",
                  fontSize: "12px",
                  fontWeight: "bold",
                  textAlign: "center",
                }}
              >
                🔄 Panel Orientation Preview
              </div>
              <div style={{ width: "100%", height: "calc(100% - 32px)" }}>
                <ErrorBoundary
                  fallback={
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                        color: "#999",
                        fontSize: "12px",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <div>⚠️ 3D Preview Unavailable</div>
                      <div style={{ fontSize: "10px" }}>
                        Check console for details
                      </div>
                    </div>
                  }
                >
                  {(() => {
                    console.log("🎨 Rendering SolarPanelScene with:", {
                      totalRotationAngle:
                        (polygons[selectedPolygonIndex]?.totalRotationAngle ||
                          0) + (currentArrayDraft.rotation || 0),
                      tiltAngleDegrees: parseFloat(formData.tilt_angle) || 30,
                      isClockwise:
                        polygons[selectedPolygonIndex]?.isClockwise ?? true,
                    });
                    return (
                      <SolarPanelScene
                        totalRotationAngle={
                          (polygons[selectedPolygonIndex]?.totalRotationAngle ||
                            0) + (currentArrayDraft.rotation || 0)
                        }
                        tiltAngleDegrees={parseFloat(formData.tilt_angle) || 30}
                        isClockwise={
                          polygons[selectedPolygonIndex]?.isClockwise ?? true
                        }
                      />
                    );
                  })()}
                </ErrorBoundary>
              </div>
            </div>
          )}
        {/* Submit Button */}
        <button
          onClick={handleSaveLayout}
          style={{
            width: "100%",
            padding: "10px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            marginTop: "auto",
          }}
        >
          Submit Layout
        </button>
      </div>

      {/* Map Area */}
      <div style={{ flex: 1, position: "relative" }}>
        <SolarSightMap
          key="solar-sight-map-stable" // Stable key to prevent remounting
          isLoaded={isGoogleMapsLoaded}
          mapCenter={mapCenter}
          zoom={zoom || 20}
          options={mapOptions}
          drawingManagerOptions={drawingManagerOptions}
          onMapLoad={handleMapLoad}
          onMapUnmount={handleMapUnmount}
          onPolygonComplete={handlePolygonComplete}
          setbackPolygon={setbackPolygon}
          panelPolygons={panelPolygons}
          polygons={polygons}
          selectedPolygonIndex={selectedPolygonIndex}
        />

        {/* Obstruction Drawing Tool */}
        {(() => {
          const shouldRender =
            useArrayMode &&
            workflowState === "obstructions" &&
            selectedPolygonIndex !== null;
          console.log(
            "🟣 Should render ObstructionDrawingTool?",
            shouldRender,
            {
              useArrayMode,
              workflowState,
              selectedPolygonIndex,
              hasPolygon:
                selectedPolygonIndex !== null && polygons[selectedPolygonIndex],
            }
          );
          return shouldRender;
        })() && (
          <ObstructionDrawingTool
            mapRef={mapRef}
            drawingManagerRef={drawingManagerRef}
            buildingPolygon={polygons[selectedPolygonIndex].originalPolygon}
            setbackPolygon={polygons[selectedPolygonIndex].setbackPolygon}
            isActive={true}
            onObstructionComplete={handleObstructionComplete}
            onFinishObstructions={handleFinishObstructions}
          />
        )}

        {/* Array Creation Tool Overlay (NEW) */}
        {useArrayMode && arrayManager && workflowState === "arrays" && (
          <ArrayCreationTool
            mapRef={mapRef}
            arrayManager={arrayManager}
            isActive={isArrayCreationMode}
            arrayCreationStep={arrayCreationStep}
            currentArrayDraft={currentArrayDraft}
            onArrayCreated={handleArrayCreated}
            onArrayUpdated={handleArrayUpdated}
            buildingRotation={
              selectedPolygonIndex !== null && polygons[selectedPolygonIndex]
                ? polygons[selectedPolygonIndex].totalRotationAngle
                : 0
            }
          />
        )}

        {/* Workflow panels moved to sidebar */}
      </div>
    </div>
  );
}

export const SolarSight = React.memo(SolarSightComponent);
export default SolarSight;
