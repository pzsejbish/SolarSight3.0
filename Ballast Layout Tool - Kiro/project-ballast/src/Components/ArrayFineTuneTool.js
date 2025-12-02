/**
 * ArrayFineTuneTool.js
 * Handles fine-tuning of individual rows/columns in an array
 */

import React, { useState, useEffect, useCallback } from "react";

const ArrayFineTuneTool = ({
  mapRef,
  arrayManager,
  currentArray,
  isActive,
  onArrayUpdated,
  buildingRotation,
  mode = "row", // Accept mode as prop with default
  onModeChange, // Callback to notify parent of mode changes
  onHoveredPanelChange, // Callback to notify parent of hovered panel
}) => {
  const [hoveredPanelCoords, setHoveredPanelCoords] = useState(null); // { rowOffset, colOffset }
  const [fineTuneArrows, setFineTuneArrows] = useState(null);
  const [isDraggingArrow, setIsDraggingArrow] = useState(false);
  const [updateCounter, setUpdateCounter] = useState(0);
  const [addPanelMarkers, setAddPanelMarkers] = useState(null); // Plus signs for adding panels

  // Notify parent when hovered panel changes
  useEffect(() => {
    if (onHoveredPanelChange) {
      onHoveredPanelChange(hoveredPanelCoords);
    }
  }, [hoveredPanelCoords, onHoveredPanelChange]);

  // Store listeners in a ref so we can access them without causing re-renders
  const listenersRef = React.useRef([]);

  // Use refs for values that listeners need but shouldn't trigger re-setup
  const modeRef = React.useRef(mode);
  const isDraggingArrowRef = React.useRef(isDraggingArrow);

  // Keep refs in sync
  useEffect(() => {
    modeRef.current = mode;
    isDraggingArrowRef.current = isDraggingArrow;
  }, [mode, isDraggingArrow]);

  // Highlight row or column based on mode when hovering
  useEffect(() => {
    if (!currentArray) return;

    // If no hover, reset all panels to default style
    if (!hoveredPanelCoords) {
      currentArray.panelPolygons.forEach((panel) => {
        panel.setOptions({
          strokeColor: "#FFFFFF",
          strokeWeight: 2,
          fillOpacity: 0.6,
        });
      });
      return;
    }

    const { rowOffset, colOffset } = hoveredPanelCoords;

    currentArray.panelPolygons.forEach((panel) => {
      const { rowOffset: r, colOffset: c } = panel.arrayIndex;

      if (mode === "toggle") {
        // In toggle mode, highlight individual panel
        if (r === rowOffset && c === colOffset) {
          panel.setOptions({
            strokeColor: "#FF9800",
            strokeWeight: 3,
            fillOpacity: 0.8,
          });
        } else {
          panel.setOptions({
            strokeColor: "#FFFFFF",
            strokeWeight: 2,
            fillOpacity: 0.6,
          });
        }
      } else if (mode === "row" && r === rowOffset) {
        // Highlight this row
        panel.setOptions({
          strokeColor: "#4CAF50",
          strokeWeight: 3,
          fillOpacity: 0.7,
        });
      } else if (mode === "column" && c === colOffset) {
        // Highlight this column
        panel.setOptions({
          strokeColor: "#2196F3",
          strokeWeight: 3,
          fillOpacity: 0.7,
        });
      } else if (mode === "add") {
        // In add mode, highlight individual panel
        if (r === rowOffset && c === colOffset) {
          panel.setOptions({
            strokeColor: "#9C27B0",
            strokeWeight: 3,
            fillOpacity: 0.8,
          });
        } else {
          panel.setOptions({
            strokeColor: "#FFFFFF",
            strokeWeight: 2,
            fillOpacity: 0.6,
          });
        }
      } else {
        // Dim other panels
        panel.setOptions({
          strokeColor: "#FFFFFF",
          strokeWeight: 1,
          fillOpacity: 0.4,
        });
      }
    });

    // Create arrows at the ends of the hovered row/column (not in toggle or add mode)
    if (mode !== "toggle" && mode !== "add") {
      createFineTuneArrows(rowOffset, colOffset);
    }

    // Create plus signs for adding panels (only in add mode)
    if (mode === "add") {
      createAddPanelMarkers(rowOffset, colOffset);
    }
  }, [hoveredPanelCoords, mode, currentArray]);

  // Helper function to create ghost panel corners
  const createGhostPanelCorners = useCallback(
    (targetRowOffset, targetColOffset) => {
      const dims = arrayManager.getPanelDimensions();
      const absoluteRotation = buildingRotation + (currentArray.rotation || 0);
      const origin = new window.google.maps.LatLng(
        currentArray.origin.lat,
        currentArray.origin.lng
      );

      // Calculate position for the target panel
      const rowDistance = targetRowOffset * dims.unitWidth;
      const colDistance = targetColOffset * dims.unitLength;

      let panelOrigin = origin;

      // Move along building edge (row direction)
      if (rowDistance !== 0) {
        panelOrigin = window.google.maps.geometry.spherical.computeOffset(
          panelOrigin,
          Math.abs(rowDistance),
          rowDistance > 0 ? absoluteRotation : (absoluteRotation + 180) % 360
        );
      }

      // Move perpendicular to building edge (column direction)
      if (colDistance !== 0) {
        panelOrigin = window.google.maps.geometry.spherical.computeOffset(
          panelOrigin,
          Math.abs(colDistance),
          colDistance > 0
            ? (absoluteRotation + 90) % 360
            : (absoluteRotation + 270) % 360
        );
      }

      // Create panel corners (same logic as in ArrayManager)
      const corners = [];

      // Corner 0: origin (bottom-left)
      corners.push(panelOrigin);

      // Corner 1: move along building edge by panel width (bottom-right)
      corners.push(
        window.google.maps.geometry.spherical.computeOffset(
          panelOrigin,
          dims.width,
          absoluteRotation
        )
      );

      // Corner 2: from corner 1, move perpendicular by panel length (top-right)
      corners.push(
        window.google.maps.geometry.spherical.computeOffset(
          corners[1],
          dims.length,
          (absoluteRotation + 90) % 360
        )
      );

      // Corner 3: from origin, move perpendicular by panel length (top-left)
      corners.push(
        window.google.maps.geometry.spherical.computeOffset(
          panelOrigin,
          dims.length,
          (absoluteRotation + 90) % 360
        )
      );

      return corners;
    },
    [arrayManager, buildingRotation, currentArray]
  );

  // Create ghost panels for adding
  const createAddPanelMarkers = useCallback(
    (rowOffset, colOffset) => {
      // Clean up existing markers
      if (addPanelMarkers) {
        addPanelMarkers.forEach((marker) => marker.setMap(null));
      }

      if (!currentArray || !mapRef.current) return;

      // Check which adjacent panels exist
      const hasTop = currentArray.panelCoords.has(
        `${rowOffset - 1},${colOffset}`
      );
      const hasBottom = currentArray.panelCoords.has(
        `${rowOffset + 1},${colOffset}`
      );
      const hasLeft = currentArray.panelCoords.has(
        `${rowOffset},${colOffset - 1}`
      );
      const hasRight = currentArray.panelCoords.has(
        `${rowOffset},${colOffset + 1}`
      );

      const ghostPanels = [];

      // Create ghost panel for each available direction
      // Top (negative row direction)
      if (!hasTop) {
        const corners = createGhostPanelCorners(rowOffset - 1, colOffset);
        const ghostPanel = new window.google.maps.Polygon({
          paths: corners,
          map: mapRef.current,
          fillColor: "#9C27B0",
          fillOpacity: 0.15,
          strokeColor: "#9C27B0",
          strokeWeight: 2,
          strokeOpacity: 0.6,
          clickable: true,
          zIndex: 999,
        });

        ghostPanel.addListener("click", () => {
          arrayManager.addPanel(
            currentArray,
            rowOffset - 1,
            colOffset,
            mapRef.current
          );
          if (onArrayUpdated) {
            onArrayUpdated(currentArray);
          }
          setUpdateCounter((c) => c + 1);
        });

        // Add hover effect
        ghostPanel.addListener("mouseover", () => {
          ghostPanel.setOptions({
            fillOpacity: 0.3,
            strokeOpacity: 0.9,
          });
        });

        ghostPanel.addListener("mouseout", () => {
          ghostPanel.setOptions({
            fillOpacity: 0.15,
            strokeOpacity: 0.6,
          });
        });

        ghostPanels.push(ghostPanel);
      }

      // Bottom (positive row direction)
      if (!hasBottom) {
        const corners = createGhostPanelCorners(rowOffset + 1, colOffset);
        const ghostPanel = new window.google.maps.Polygon({
          paths: corners,
          map: mapRef.current,
          fillColor: "#9C27B0",
          fillOpacity: 0.15,
          strokeColor: "#9C27B0",
          strokeWeight: 2,
          strokeOpacity: 0.6,
          clickable: true,
          zIndex: 999,
        });

        ghostPanel.addListener("click", () => {
          arrayManager.addPanel(
            currentArray,
            rowOffset + 1,
            colOffset,
            mapRef.current
          );
          if (onArrayUpdated) {
            onArrayUpdated(currentArray);
          }
          setUpdateCounter((c) => c + 1);
        });

        ghostPanel.addListener("mouseover", () => {
          ghostPanel.setOptions({
            fillOpacity: 0.3,
            strokeOpacity: 0.9,
          });
        });

        ghostPanel.addListener("mouseout", () => {
          ghostPanel.setOptions({
            fillOpacity: 0.15,
            strokeOpacity: 0.6,
          });
        });

        ghostPanels.push(ghostPanel);
      }

      // Left (negative column direction)
      if (!hasLeft) {
        const corners = createGhostPanelCorners(rowOffset, colOffset - 1);
        const ghostPanel = new window.google.maps.Polygon({
          paths: corners,
          map: mapRef.current,
          fillColor: "#9C27B0",
          fillOpacity: 0.15,
          strokeColor: "#9C27B0",
          strokeWeight: 2,
          strokeOpacity: 0.6,
          clickable: true,
          zIndex: 999,
        });

        ghostPanel.addListener("click", () => {
          arrayManager.addPanel(
            currentArray,
            rowOffset,
            colOffset - 1,
            mapRef.current
          );
          if (onArrayUpdated) {
            onArrayUpdated(currentArray);
          }
          setUpdateCounter((c) => c + 1);
        });

        ghostPanel.addListener("mouseover", () => {
          ghostPanel.setOptions({
            fillOpacity: 0.3,
            strokeOpacity: 0.9,
          });
        });

        ghostPanel.addListener("mouseout", () => {
          ghostPanel.setOptions({
            fillOpacity: 0.15,
            strokeOpacity: 0.6,
          });
        });

        ghostPanels.push(ghostPanel);
      }

      // Right (positive column direction)
      if (!hasRight) {
        const corners = createGhostPanelCorners(rowOffset, colOffset + 1);
        const ghostPanel = new window.google.maps.Polygon({
          paths: corners,
          map: mapRef.current,
          fillColor: "#9C27B0",
          fillOpacity: 0.15,
          strokeColor: "#9C27B0",
          strokeWeight: 2,
          strokeOpacity: 0.6,
          clickable: true,
          zIndex: 999,
        });

        ghostPanel.addListener("click", () => {
          arrayManager.addPanel(
            currentArray,
            rowOffset,
            colOffset + 1,
            mapRef.current
          );
          if (onArrayUpdated) {
            onArrayUpdated(currentArray);
          }
          setUpdateCounter((c) => c + 1);
        });

        ghostPanel.addListener("mouseover", () => {
          ghostPanel.setOptions({
            fillOpacity: 0.3,
            strokeOpacity: 0.9,
          });
        });

        ghostPanel.addListener("mouseout", () => {
          ghostPanel.setOptions({
            fillOpacity: 0.15,
            strokeOpacity: 0.6,
          });
        });

        ghostPanels.push(ghostPanel);
      }

      setAddPanelMarkers(ghostPanels);
    },
    [
      currentArray,
      arrayManager,
      buildingRotation,
      mapRef,
      addPanelMarkers,
      onArrayUpdated,
      createGhostPanelCorners,
    ]
  );

  // Create arrows for fine-tuning
  const createFineTuneArrows = useCallback(
    (rowOffset, colOffset) => {
      // Clean up existing arrows
      if (fineTuneArrows) {
        fineTuneArrows.forEach((arrow) => arrow.setMap(null));
      }

      if (!currentArray || !mapRef.current) return;

      const dims = arrayManager.getPanelDimensions();
      const absoluteRotation = buildingRotation + (currentArray.rotation || 0);
      const origin = new window.google.maps.LatLng(
        currentArray.origin.lat,
        currentArray.origin.lng
      );

      const arrows = [];

      if (mode === "row") {
        // Find the extents of this row
        const rowPanels = currentArray.panelPolygons.filter(
          (p) => p.arrayIndex.rowOffset === rowOffset
        );

        if (rowPanels.length === 0) return;

        const colOffsets = rowPanels.map((p) => p.arrayIndex.colOffset);
        const minCol = Math.min(...colOffsets);
        const maxCol = Math.max(...colOffsets);

        // Calculate positions for left and right arrows
        const rowDistance = rowOffset * dims.unitWidth;
        const leftColDistance = minCol * dims.unitLength;
        const rightColDistance = maxCol * dims.unitLength;

        // Left arrow position - at the LEFT edge of the leftmost panel in this row
        let leftPos = origin;
        // Move to the row
        if (rowDistance !== 0) {
          leftPos = window.google.maps.geometry.spherical.computeOffset(
            leftPos,
            Math.abs(rowDistance),
            rowDistance > 0 ? absoluteRotation : (absoluteRotation + 180) % 360
          );
        }
        // Move to the center of the row (perpendicular axis - width)
        leftPos = window.google.maps.geometry.spherical.computeOffset(
          leftPos,
          dims.unitWidth / 2,
          absoluteRotation
        );
        // Move to the leftmost column
        if (leftColDistance !== 0) {
          leftPos = window.google.maps.geometry.spherical.computeOffset(
            leftPos,
            Math.abs(leftColDistance),
            leftColDistance > 0
              ? (absoluteRotation + 90) % 360
              : (absoluteRotation + 270) % 360
          );
        }

        // Right arrow position - at the RIGHT edge of the rightmost panel in this row
        let rightPos = origin;
        // Move to the row
        if (rowDistance !== 0) {
          rightPos = window.google.maps.geometry.spherical.computeOffset(
            rightPos,
            Math.abs(rowDistance),
            rowDistance > 0 ? absoluteRotation : (absoluteRotation + 180) % 360
          );
        }
        // Move to the center of the row (perpendicular axis - width)
        rightPos = window.google.maps.geometry.spherical.computeOffset(
          rightPos,
          dims.unitWidth / 2,
          absoluteRotation
        );
        // Move to the rightmost column
        if (rightColDistance !== 0) {
          rightPos = window.google.maps.geometry.spherical.computeOffset(
            rightPos,
            Math.abs(rightColDistance),
            rightColDistance > 0
              ? (absoluteRotation + 90) % 360
              : (absoluteRotation + 270) % 360
          );
        }
        // Now we're at the center of the rightmost panel
        // Move to the far edge of the panel (add full unitLength)
        rightPos = window.google.maps.geometry.spherical.computeOffset(
          rightPos,
          dims.unitLength,
          (absoluteRotation + 90) % 360
        );

        // Create left arrow (points perpendicular - up/negative direction)
        const leftArrow = new window.google.maps.Marker({
          position: leftPos,
          map: mapRef.current,
          icon: {
            path: "M 0,0 L 10,-5 L 10,5 Z",
            fillColor: "#4CAF50",
            fillOpacity: 0.9,
            strokeColor: "#FFFFFF",
            strokeWeight: 2,
            scale: 2,
            anchor: new window.google.maps.Point(0, 0),
            rotation: (absoluteRotation + 270 + 90) % 360, // Point perpendicular up
          },
          draggable: true,
          clickable: false,
          zIndex: 10002,
        });

        // Create right arrow (points perpendicular - down/positive direction)
        const rightArrow = new window.google.maps.Marker({
          position: rightPos,
          map: mapRef.current,
          icon: {
            path: "M 0,0 L 10,-5 L 10,5 Z",
            fillColor: "#4CAF50",
            fillOpacity: 0.9,
            strokeColor: "#FFFFFF",
            strokeWeight: 2,
            scale: 2,
            anchor: new window.google.maps.Point(0, 0),
            rotation: (absoluteRotation + 90 + 90) % 360, // Point perpendicular down
          },
          draggable: true,
          clickable: false,
          zIndex: 10002,
        });

        // Add drag handlers
        setupRowArrowDrag(leftArrow, rightArrow, rowOffset, "left", leftPos);
        setupRowArrowDrag(rightArrow, leftArrow, rowOffset, "right", rightPos);

        arrows.push(leftArrow, rightArrow);
      } else {
        // Column mode - similar logic but for columns
        const colPanels = currentArray.panelPolygons.filter(
          (p) => p.arrayIndex.colOffset === colOffset
        );

        if (colPanels.length === 0) return;

        const rowOffsets = colPanels.map((p) => p.arrayIndex.rowOffset);
        const minRow = Math.min(...rowOffsets);
        const maxRow = Math.max(...rowOffsets);

        // Calculate positions for up and down arrows
        const colDistance = colOffset * dims.unitLength;
        const topRowDistance = minRow * dims.unitWidth;
        const bottomRowDistance = maxRow * dims.unitWidth;

        // Up arrow position - at the TOP edge of the topmost panel in this column
        let upPos = origin;
        // Move to the column
        if (colDistance !== 0) {
          upPos = window.google.maps.geometry.spherical.computeOffset(
            upPos,
            Math.abs(colDistance),
            colDistance > 0
              ? (absoluteRotation + 90) % 360
              : (absoluteRotation + 270) % 360
          );
        }
        // Move to the center of the column (perpendicular axis - length)
        upPos = window.google.maps.geometry.spherical.computeOffset(
          upPos,
          dims.unitLength / 2,
          (absoluteRotation + 90) % 360
        );
        // Move to the topmost row
        if (topRowDistance !== 0) {
          upPos = window.google.maps.geometry.spherical.computeOffset(
            upPos,
            Math.abs(topRowDistance),
            topRowDistance > 0
              ? absoluteRotation
              : (absoluteRotation + 180) % 360
          );
        }

        // Down arrow position - at the BOTTOM edge of the bottommost panel in this column
        let downPos = origin;
        // Move to the column
        if (colDistance !== 0) {
          downPos = window.google.maps.geometry.spherical.computeOffset(
            downPos,
            Math.abs(colDistance),
            colDistance > 0
              ? (absoluteRotation + 90) % 360
              : (absoluteRotation + 270) % 360
          );
        }
        // Move to the center of the column (perpendicular axis - length)
        downPos = window.google.maps.geometry.spherical.computeOffset(
          downPos,
          dims.unitLength / 2,
          (absoluteRotation + 90) % 360
        );
        // Move to the bottommost row
        if (bottomRowDistance !== 0) {
          downPos = window.google.maps.geometry.spherical.computeOffset(
            downPos,
            Math.abs(bottomRowDistance),
            bottomRowDistance > 0
              ? absoluteRotation
              : (absoluteRotation + 180) % 360
          );
        }
        // Now we're at the center of the bottommost panel
        // Move to the far edge of the panel (add full unitWidth)
        downPos = window.google.maps.geometry.spherical.computeOffset(
          downPos,
          dims.unitWidth,
          absoluteRotation
        );

        // Create up arrow (points along edge - left/negative direction)
        const upArrow = new window.google.maps.Marker({
          position: upPos,
          map: mapRef.current,
          icon: {
            path: "M 0,0 L 10,-5 L 10,5 Z",
            fillColor: "#2196F3",
            fillOpacity: 0.9,
            strokeColor: "#FFFFFF",
            strokeWeight: 2,
            scale: 2,
            anchor: new window.google.maps.Point(0, 0),
            rotation: (absoluteRotation + 180 + 90) % 360, // Point along edge left
          },
          draggable: true,
          clickable: false,
          zIndex: 10002,
        });

        // Create down arrow (points along edge - right/positive direction)
        const downArrow = new window.google.maps.Marker({
          position: downPos,
          map: mapRef.current,
          icon: {
            path: "M 0,0 L 10,-5 L 10,5 Z",
            fillColor: "#2196F3",
            fillOpacity: 0.9,
            strokeColor: "#FFFFFF",
            strokeWeight: 2,
            scale: 2,
            anchor: new window.google.maps.Point(0, 0),
            rotation: (absoluteRotation + 90) % 360, // Point along edge right
          },
          draggable: true,
          clickable: false,
          zIndex: 10002,
        });

        // Add drag handlers
        setupColArrowDrag(upArrow, downArrow, colOffset, "up", upPos);
        setupColArrowDrag(downArrow, upArrow, colOffset, "down", downPos);

        arrows.push(upArrow, downArrow);
      }

      setFineTuneArrows(arrows);
    },
    [mode, currentArray, arrayManager, buildingRotation, mapRef, fineTuneArrows]
  );

  // Setup drag handler for row arrows (not using useCallback to avoid closure issues)
  const setupRowArrowDrag = (
    arrow,
    otherArrow,
    rowOffset,
    direction,
    initialPos
  ) => {
    let startDistance = 0;
    let initialPanelCount = 0;
    let lastPanelCount = 0;
    let startArrowPos = null;

    arrow.addListener("dragstart", () => {
      setIsDraggingArrow(true);
      startArrowPos = arrow.getPosition();
      const origin = new window.google.maps.LatLng(
        currentArray.origin.lat,
        currentArray.origin.lng
      );
      startDistance =
        window.google.maps.geometry.spherical.computeDistanceBetween(
          origin,
          startArrowPos
        );

      // Count current panels in this row
      initialPanelCount = currentArray.panelPolygons.filter(
        (p) => p.arrayIndex.rowOffset === rowOffset
      ).length;
      lastPanelCount = initialPanelCount;

      console.log("🎯 Drag start - row has", initialPanelCount, "panels");
    });

    arrow.addListener("drag", (e) => {
      const dragPos = e.latLng;

      // Calculate the row's actual position
      const dims = arrayManager.getPanelDimensions();
      const absoluteRotation = buildingRotation + (currentArray.rotation || 0);

      // Get the row's base position
      const origin = new window.google.maps.LatLng(
        currentArray.origin.lat,
        currentArray.origin.lng
      );

      // For rows: rowOffset moves ALONG the building edge
      // But the row itself extends PERPENDICULAR to the building edge (in colOffset direction)
      // So arrows should move perpendicular (up/down relative to building)
      const rowDistance = rowOffset * dims.unitWidth;
      let rowOrigin = origin;
      if (rowDistance !== 0) {
        rowOrigin = window.google.maps.geometry.spherical.computeOffset(
          rowOrigin,
          Math.abs(rowDistance),
          rowDistance > 0 ? absoluteRotation : (absoluteRotation + 180) % 360
        );
      }

      // Project drag position onto the perpendicular axis (where the row extends)
      const heading = window.google.maps.geometry.spherical.computeHeading(
        rowOrigin,
        dragPos
      );
      const distance =
        window.google.maps.geometry.spherical.computeDistanceBetween(
          rowOrigin,
          dragPos
        );

      // Arrows move perpendicular to building edge (up/down)
      const targetHeading =
        direction === "left"
          ? (absoluteRotation + 270) % 360 // Up (perpendicular, negative)
          : (absoluteRotation + 90) % 360; // Down (perpendicular, positive)
      const projectedDistance =
        distance * Math.cos(((heading - targetHeading) * Math.PI) / 180);

      // Constrain arrow position to the row axis
      if (projectedDistance > 0) {
        const constrainedPos =
          window.google.maps.geometry.spherical.computeOffset(
            rowOrigin,
            projectedDistance,
            targetHeading
          );
        arrow.setPosition(constrainedPos);
      } else {
        arrow.setPosition(rowOrigin);
        return;
      }

      // Calculate the change in distance from the start position
      const startHeading = window.google.maps.geometry.spherical.computeHeading(
        rowOrigin,
        startArrowPos
      );
      const startDistanceFromOrigin =
        window.google.maps.geometry.spherical.computeDistanceBetween(
          rowOrigin,
          startArrowPos
        );
      const startProjectedDistance =
        startDistanceFromOrigin *
        Math.cos(((startHeading - targetHeading) * Math.PI) / 180);

      // Calculate how many panels to add/remove based on the CHANGE in distance
      const distanceChange = projectedDistance - startProjectedDistance;
      const panelChange = Math.round(distanceChange / dims.unitLength);
      const targetPanelCount = Math.max(1, initialPanelCount + panelChange);

      // Calculate the delta from last update
      const delta = targetPanelCount - lastPanelCount;

      if (delta !== 0) {
        console.log("🔧 Row drag:", {
          targetPanelCount,
          lastPanelCount,
          delta,
          direction,
        });

        if (delta > 0) {
          // Extend
          if (direction === "left") {
            arrayManager.extendRowLeft(
              currentArray,
              rowOffset,
              delta,
              mapRef.current
            );
          } else {
            arrayManager.extendRowRight(
              currentArray,
              rowOffset,
              delta,
              mapRef.current
            );
          }
        } else {
          // Shrink
          if (direction === "left") {
            arrayManager.shrinkRowLeft(
              currentArray,
              rowOffset,
              Math.abs(delta),
              mapRef.current
            );
          } else {
            arrayManager.shrinkRowRight(
              currentArray,
              rowOffset,
              Math.abs(delta),
              mapRef.current
            );
          }
        }

        lastPanelCount = targetPanelCount;
      }

      if (onArrayUpdated) {
        onArrayUpdated(currentArray);
      }
    });

    arrow.addListener("dragend", () => {
      setIsDraggingArrow(false);
      setUpdateCounter((c) => c + 1); // Force listener re-setup after drag
      // Snap arrow back to the row axis
      const dims = arrayManager.getPanelDimensions();
      const absoluteRotation = buildingRotation + (currentArray.rotation || 0);
      const origin = new window.google.maps.LatLng(
        currentArray.origin.lat,
        currentArray.origin.lng
      );

      const rowDistance = rowOffset * dims.unitWidth;
      let rowOrigin = origin;
      if (rowDistance !== 0) {
        rowOrigin = window.google.maps.geometry.spherical.computeOffset(
          rowOrigin,
          Math.abs(rowDistance),
          rowDistance > 0 ? absoluteRotation : (absoluteRotation + 180) % 360
        );
      }

      const finalPos = arrow.getPosition();
      const distance =
        window.google.maps.geometry.spherical.computeDistanceBetween(
          rowOrigin,
          finalPos
        );
      const targetHeading =
        direction === "left"
          ? (absoluteRotation + 270) % 360
          : (absoluteRotation + 90) % 360;
      const snappedPos = window.google.maps.geometry.spherical.computeOffset(
        rowOrigin,
        distance,
        targetHeading
      );
      arrow.setPosition(snappedPos);
    });
  };

  // Setup drag handler for column arrows (not using useCallback to avoid closure issues)
  const setupColArrowDrag = (
    arrow,
    otherArrow,
    colOffset,
    direction,
    initialPos
  ) => {
    let startDistance = 0;
    let initialPanelCount = 0;
    let lastPanelCount = 0;
    let startArrowPos = null;

    arrow.addListener("dragstart", () => {
      setIsDraggingArrow(true);
      startArrowPos = arrow.getPosition();
      const origin = new window.google.maps.LatLng(
        currentArray.origin.lat,
        currentArray.origin.lng
      );
      startDistance =
        window.google.maps.geometry.spherical.computeDistanceBetween(
          origin,
          startArrowPos
        );

      // Count current panels in this column
      initialPanelCount = currentArray.panelPolygons.filter(
        (p) => p.arrayIndex.colOffset === colOffset
      ).length;
      lastPanelCount = initialPanelCount;

      console.log("🎯 Drag start - column has", initialPanelCount, "panels");
    });

    arrow.addListener("drag", (e) => {
      const dragPos = e.latLng;

      // Calculate the column's actual position
      const dims = arrayManager.getPanelDimensions();
      const absoluteRotation = buildingRotation + (currentArray.rotation || 0);

      // Get the column's base position
      const origin = new window.google.maps.LatLng(
        currentArray.origin.lat,
        currentArray.origin.lng
      );

      // For columns: colOffset is the position PERPENDICULAR to the building edge
      // The column extends ALONG the building edge (rowOffset direction)
      // Move to the column's position (perpendicular to the edge)
      const colDistance = colOffset * dims.unitLength;
      let colOrigin = origin;
      if (colDistance !== 0) {
        colOrigin = window.google.maps.geometry.spherical.computeOffset(
          colOrigin,
          colDistance,
          (absoluteRotation + 90) % 360
        );
      }

      // Project drag position onto the along-edge axis (where the column extends)
      const heading = window.google.maps.geometry.spherical.computeHeading(
        colOrigin,
        dragPos
      );
      const distance =
        window.google.maps.geometry.spherical.computeDistanceBetween(
          colOrigin,
          dragPos
        );

      // Arrows move along the building edge (the column extends this way)
      const targetHeading =
        direction === "up"
          ? (absoluteRotation + 180) % 360 // Along edge, one direction
          : absoluteRotation; // Along edge, other direction
      const projectedDistance =
        distance * Math.cos(((heading - targetHeading) * Math.PI) / 180);

      // Constrain arrow position to the column axis
      if (projectedDistance > 0) {
        const constrainedPos =
          window.google.maps.geometry.spherical.computeOffset(
            colOrigin,
            projectedDistance,
            targetHeading
          );
        arrow.setPosition(constrainedPos);
      } else {
        arrow.setPosition(colOrigin);
        return;
      }

      // Calculate the change in distance from the start position
      const startHeading = window.google.maps.geometry.spherical.computeHeading(
        colOrigin,
        startArrowPos
      );
      const startDistanceFromOrigin =
        window.google.maps.geometry.spherical.computeDistanceBetween(
          colOrigin,
          startArrowPos
        );
      const startProjectedDistance =
        startDistanceFromOrigin *
        Math.cos(((startHeading - targetHeading) * Math.PI) / 180);

      // Calculate how many panels to add/remove based on the CHANGE in distance
      const distanceChange = projectedDistance - startProjectedDistance;
      const panelChange = Math.round(distanceChange / dims.unitWidth);
      const targetPanelCount = Math.max(1, initialPanelCount + panelChange);

      // Calculate the delta from last update
      const delta = targetPanelCount - lastPanelCount;

      if (delta !== 0) {
        console.log("🔧 Column drag:", {
          targetPanelCount,
          lastPanelCount,
          delta,
          direction,
        });

        if (delta > 0) {
          // Extend
          if (direction === "up") {
            arrayManager.extendColUp(
              currentArray,
              colOffset,
              delta,
              mapRef.current
            );
          } else {
            arrayManager.extendColDown(
              currentArray,
              colOffset,
              delta,
              mapRef.current
            );
          }
        } else {
          // Shrink
          if (direction === "up") {
            arrayManager.shrinkColUp(
              currentArray,
              colOffset,
              Math.abs(delta),
              mapRef.current
            );
          } else {
            arrayManager.shrinkColDown(
              currentArray,
              colOffset,
              Math.abs(delta),
              mapRef.current
            );
          }
        }

        lastPanelCount = targetPanelCount;
      }

      if (onArrayUpdated) {
        onArrayUpdated(currentArray);
      }
    });

    arrow.addListener("dragend", () => {
      setIsDraggingArrow(false);
      setUpdateCounter((c) => c + 1); // Force listener re-setup after drag
      // Snap arrow back to the column axis
      const dims = arrayManager.getPanelDimensions();
      const absoluteRotation = buildingRotation + (currentArray.rotation || 0);
      const origin = new window.google.maps.LatLng(
        currentArray.origin.lat,
        currentArray.origin.lng
      );

      const colDistance = colOffset * dims.unitLength;
      let colOrigin = origin;
      if (colDistance !== 0) {
        colOrigin = window.google.maps.geometry.spherical.computeOffset(
          colOrigin,
          colDistance,
          (absoluteRotation + 90) % 360
        );
      }

      const finalPos = arrow.getPosition();
      const distance =
        window.google.maps.geometry.spherical.computeDistanceBetween(
          colOrigin,
          finalPos
        );
      const targetHeading =
        direction === "up" ? (absoluteRotation + 180) % 360 : absoluteRotation;
      const snappedPos = window.google.maps.geometry.spherical.computeOffset(
        colOrigin,
        distance,
        targetHeading
      );
      arrow.setPosition(snappedPos);
    });
  };

  // Setup panel hover and click listeners directly on each panel
  useEffect(() => {
    if (!isActive || !mapRef.current || !currentArray) {
      // Clean up existing listeners
      listenersRef.current.forEach((listener) => {
        window.google.maps.event.removeListener(listener);
      });
      listenersRef.current = [];
      return;
    }

    const map = mapRef.current;
    const setupId = Date.now();
    console.log("🔧 Setting up fine-tune hover listeners", {
      setupId,
      panelCount: currentArray.panelPolygons.length,
      mode,
      firstPanelHasIndex: !!currentArray.panelPolygons[0]?.arrayIndex,
    });

    // Clean up existing listeners first
    listenersRef.current.forEach((listener) => {
      window.google.maps.event.removeListener(listener);
    });
    listenersRef.current = [];

    // Keep map dragging enabled for better UX
    map.setOptions({
      draggable: true,
      gestureHandling: "auto",
      disableDoubleClickZoom: false,
    });

    // Add hover and click listeners directly to each panel
    currentArray.panelPolygons.forEach((panel, idx) => {
      if (!panel.arrayIndex) {
        console.error("❌ Panel missing arrayIndex!", idx);
        return;
      }

      panel.setOptions({
        clickable: true,
        zIndex: 1001, // Ensure panels are above other elements
      });

      const mouseOverListener = panel.addListener("mouseover", () => {
        console.log(
          "✅ Panel hover! Setup:",
          setupId,
          "Panel:",
          panel.arrayIndex
        );
        setHoveredPanelCoords(panel.arrayIndex);
      });

      const mouseOutListener = panel.addListener("mouseout", () => {
        console.log("✅ Panel hover out!", panel.arrayIndex);

        // Don't clear if dragging (use ref)
        if (isDraggingArrowRef.current) {
          console.log("🎯 Ignored - dragging");
          return;
        }

        // Small delay to prevent flickering
        setTimeout(() => {
          if (!isDraggingArrowRef.current) {
            setHoveredPanelCoords((current) => {
              // Only clear if still on the same panel
              return current?.rowOffset === panel.arrayIndex.rowOffset &&
                current?.colOffset === panel.arrayIndex.colOffset
                ? null
                : current;
            });
          }
        }, 50);
      });

      const clickListener = panel.addListener("click", () => {
        // Use ref to check mode
        if (modeRef.current !== "toggle") return;
        console.log("✅ Panel click!", panel.arrayIndex);

        const { rowOffset, colOffset } = panel.arrayIndex;
        arrayManager.togglePanel(
          currentArray,
          rowOffset,
          colOffset,
          mapRef.current
        );

        if (onArrayUpdated) {
          onArrayUpdated(currentArray);
        }

        // Force listener re-setup after toggle
        setUpdateCounter((c) => c + 1);
      });

      listenersRef.current.push(
        mouseOverListener,
        mouseOutListener,
        clickListener
      );
    });

    return () => {
      console.log("🔧 Cleaning up fine-tune hover listeners");
      listenersRef.current.forEach((listener) => {
        window.google.maps.event.removeListener(listener);
      });
      listenersRef.current = [];
    };
  }, [
    isActive,
    updateCounter, // Force re-setup when counter changes
    currentArray?.panelPolygons?.length, // Also check length
    arrayManager,
    mapRef,
    onArrayUpdated,
    // mode and isDraggingArrow are accessed via refs, so not needed here
  ]);

  // Debug: log when dependencies change
  useEffect(() => {
    console.log("📊 Listener dependencies changed:", {
      isActive,
      updateCounter,
      panelCount: currentArray?.panelPolygons?.length,
    });
  }, [isActive, updateCounter, currentArray?.panelPolygons?.length]);

  // Cleanup arrows when component unmounts or becomes inactive
  useEffect(() => {
    return () => {
      if (fineTuneArrows) {
        fineTuneArrows.forEach((arrow) => arrow.setMap(null));
      }
    };
  }, [fineTuneArrows]);

  // Cleanup when not active
  useEffect(() => {
    if (!isActive && fineTuneArrows) {
      fineTuneArrows.forEach((arrow) => arrow.setMap(null));
      setFineTuneArrows(null);
      setHoveredPanelCoords(null);
    }
  }, [isActive, fineTuneArrows]);

  // Hide arrows when in toggle or add mode
  useEffect(() => {
    if ((mode === "toggle" || mode === "add") && fineTuneArrows) {
      fineTuneArrows.forEach((arrow) => arrow.setMap(null));
      setFineTuneArrows(null);
    }
  }, [mode, fineTuneArrows]);

  // Cleanup add panel markers when mode changes or component unmounts
  useEffect(() => {
    return () => {
      if (addPanelMarkers) {
        addPanelMarkers.forEach((marker) => marker.setMap(null));
      }
    };
  }, [addPanelMarkers]);

  // Hide add panel markers when not in add mode
  useEffect(() => {
    if (mode !== "add" && addPanelMarkers) {
      addPanelMarkers.forEach((marker) => marker.setMap(null));
      setAddPanelMarkers(null);
    }
  }, [mode, addPanelMarkers]);

  // This component no longer renders UI - it only handles map interactions
  // The UI is now in ArrayWorkflowPanel
  if (!isActive || !currentArray) {
    console.log("🚫 ArrayFineTuneTool not rendering", {
      isActive,
      hasArray: !!currentArray,
    });
    return null;
  }

  console.log("✅ ArrayFineTuneTool active (no UI)", {
    isActive,
    panelCount: currentArray.panelPolygons.length,
  });

  return null;
};

export default ArrayFineTuneTool;
