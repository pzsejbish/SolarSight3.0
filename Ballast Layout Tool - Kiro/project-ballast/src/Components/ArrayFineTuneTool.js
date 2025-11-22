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
}) => {
  const [selectedPanelCoords, setSelectedPanelCoords] = useState(null); // { rowOffset, colOffset }
  const [mode, setMode] = useState("row"); // 'row' | 'column'
  const [fineTuneArrows, setFineTuneArrows] = useState(null);

  // Handle panel click
  const handlePanelClick = useCallback(
    (event) => {
      console.log("🎯 Panel click detected in fine-tune mode", {
        isActive,
        hasArray: !!currentArray,
        latLng: event.latLng?.toString(),
      });

      if (!isActive || !currentArray) {
        console.log("❌ Not active or no array");
        return;
      }

      // Check if clicked on a panel using containsLocation
      let clickedPanel = null;
      for (const panel of currentArray.panelPolygons) {
        if (
          window.google.maps.geometry.poly.containsLocation(event.latLng, panel)
        ) {
          clickedPanel = panel;
          console.log("✅ Found clicked panel:", panel.arrayIndex);
          break;
        }
      }

      if (clickedPanel) {
        setSelectedPanelCoords(clickedPanel.arrayIndex);

        // Highlight the selected panel
        currentArray.panelPolygons.forEach((panel) => {
          if (panel === clickedPanel) {
            panel.setOptions({
              strokeColor: "#FF00FF",
              strokeWeight: 4,
              fillOpacity: 0.8,
            });
          } else {
            panel.setOptions({
              strokeColor: "#FFFFFF",
              strokeWeight: 2,
              fillOpacity: 0.6,
            });
          }
        });
      } else {
        console.log("❌ No panel found at click location");
      }
    },
    [isActive, currentArray]
  );

  // Highlight row or column based on mode
  useEffect(() => {
    if (!selectedPanelCoords || !currentArray) return;

    const { rowOffset, colOffset } = selectedPanelCoords;

    currentArray.panelPolygons.forEach((panel) => {
      const { rowOffset: r, colOffset: c } = panel.arrayIndex;

      if (mode === "row" && r === rowOffset) {
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
      } else {
        // Dim other panels
        panel.setOptions({
          strokeColor: "#FFFFFF",
          strokeWeight: 1,
          fillOpacity: 0.4,
        });
      }
    });

    // Create arrows at the ends of the selected row/column
    createFineTuneArrows(rowOffset, colOffset);
  }, [selectedPanelCoords, mode, currentArray]);

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

        // Left arrow position
        let leftPos = origin;
        if (rowDistance !== 0) {
          leftPos = window.google.maps.geometry.spherical.computeOffset(
            leftPos,
            Math.abs(rowDistance),
            rowDistance > 0 ? absoluteRotation : (absoluteRotation + 180) % 360
          );
        }
        if (leftColDistance !== 0) {
          leftPos = window.google.maps.geometry.spherical.computeOffset(
            leftPos,
            Math.abs(leftColDistance),
            leftColDistance > 0
              ? (absoluteRotation + 90) % 360
              : (absoluteRotation + 270) % 360
          );
        }
        // Position arrow at the edge of the last panel (one unit length away in the negative direction)
        leftPos = window.google.maps.geometry.spherical.computeOffset(
          leftPos,
          dims.unitLength,
          (absoluteRotation + 270) % 360
        );

        // Right arrow position
        let rightPos = origin;
        if (rowDistance !== 0) {
          rightPos = window.google.maps.geometry.spherical.computeOffset(
            rightPos,
            Math.abs(rowDistance),
            rowDistance > 0 ? absoluteRotation : (absoluteRotation + 180) % 360
          );
        }
        if (rightColDistance !== 0) {
          rightPos = window.google.maps.geometry.spherical.computeOffset(
            rightPos,
            Math.abs(rightColDistance),
            rightColDistance > 0
              ? (absoluteRotation + 90) % 360
              : (absoluteRotation + 270) % 360
          );
        }
        // Position arrow at the edge of the last panel (one unit length away in the positive direction)
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

        // Up arrow position
        let upPos = origin;
        if (colDistance !== 0) {
          upPos = window.google.maps.geometry.spherical.computeOffset(
            upPos,
            colDistance,
            (absoluteRotation + 90) % 360
          );
        }
        if (topRowDistance !== 0) {
          upPos = window.google.maps.geometry.spherical.computeOffset(
            upPos,
            Math.abs(topRowDistance),
            topRowDistance > 0
              ? absoluteRotation
              : (absoluteRotation + 180) % 360
          );
        }
        // Position arrow at the edge of the last panel (one unit width away in the negative direction)
        upPos = window.google.maps.geometry.spherical.computeOffset(
          upPos,
          dims.unitWidth,
          (absoluteRotation + 180) % 360
        );

        // Down arrow position
        let downPos = origin;
        if (colDistance !== 0) {
          downPos = window.google.maps.geometry.spherical.computeOffset(
            downPos,
            colDistance,
            (absoluteRotation + 90) % 360
          );
        }
        if (bottomRowDistance !== 0) {
          downPos = window.google.maps.geometry.spherical.computeOffset(
            downPos,
            Math.abs(bottomRowDistance),
            bottomRowDistance > 0
              ? absoluteRotation
              : (absoluteRotation + 180) % 360
          );
        }
        // Position arrow at the edge of the last panel (one unit width away in the positive direction)
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

    arrow.addListener("dragstart", () => {
      const origin = new window.google.maps.LatLng(
        currentArray.origin.lat,
        currentArray.origin.lng
      );
      startDistance =
        window.google.maps.geometry.spherical.computeDistanceBetween(
          origin,
          arrow.getPosition()
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

      // Calculate how many panels fit in the dragged distance
      // The arrow should be at the edge of the last panel
      const panelsFromDrag = Math.round(
        Math.abs(projectedDistance) / dims.unitLength
      );
      const targetPanelCount = Math.max(1, panelsFromDrag);

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

    arrow.addListener("dragstart", () => {
      const origin = new window.google.maps.LatLng(
        currentArray.origin.lat,
        currentArray.origin.lng
      );
      startDistance =
        window.google.maps.geometry.spherical.computeDistanceBetween(
          origin,
          arrow.getPosition()
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

      // Calculate how many panels fit in the dragged distance
      // The arrow should be at the edge of the last panel
      const panelsFromDrag = Math.round(
        Math.abs(projectedDistance) / dims.unitWidth
      );
      const targetPanelCount = Math.max(1, panelsFromDrag);

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

  // Setup panel click listeners directly on each panel
  // Re-run whenever panels change (after fine-tuning)
  useEffect(() => {
    if (!isActive || !mapRef.current || !currentArray) return;

    const map = mapRef.current;
    console.log("🔧 Setting up fine-tune click listeners", {
      panelCount: currentArray.panelPolygons.length,
      timestamp: Date.now(),
    });

    // Disable map dragging to allow panel clicks
    map.setOptions({
      draggable: false,
      gestureHandling: "none",
      disableDoubleClickZoom: true,
    });

    // Add click listeners directly to each panel
    const panelClickListeners = [];
    currentArray.panelPolygons.forEach((panel) => {
      panel.setOptions({
        clickable: true,
        zIndex: 1001, // Ensure panels are above other elements
      });

      const listener = panel.addListener("click", (event) => {
        console.log("✅ Panel clicked directly!", panel.arrayIndex);
        event.stop(); // Prevent event from bubbling to map

        setSelectedPanelCoords(panel.arrayIndex);

        // Highlight the selected panel
        currentArray.panelPolygons.forEach((p) => {
          if (p === panel) {
            p.setOptions({
              strokeColor: "#FF00FF",
              strokeWeight: 4,
              fillOpacity: 0.8,
            });
          } else {
            p.setOptions({
              strokeColor: "#FFFFFF",
              strokeWeight: 2,
              fillOpacity: 0.6,
            });
          }
        });
      });

      panelClickListeners.push(listener);
    });

    // Also add map click listener as fallback
    const mapClickListener = map.addListener("click", handlePanelClick);

    return () => {
      console.log("🔧 Cleaning up fine-tune click listeners");

      // Remove all panel click listeners
      panelClickListeners.forEach((listener) => {
        window.google.maps.event.removeListener(listener);
      });

      // Re-enable map dragging
      map.setOptions({
        draggable: true,
        gestureHandling: "auto",
        disableDoubleClickZoom: false,
      });

      window.google.maps.event.removeListener(mapClickListener);
    };
  }, [
    isActive,
    mapRef,
    currentArray,
    currentArray?.panelPolygons.length,
    handlePanelClick,
  ]);

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
      setSelectedPanelCoords(null);
    }
  }, [isActive, fineTuneArrows]);

  // Render mode toggle UI
  if (!isActive || !currentArray) {
    console.log("🚫 ArrayFineTuneTool not rendering", {
      isActive,
      hasArray: !!currentArray,
    });
    return null;
  }

  console.log("✅ ArrayFineTuneTool rendering", {
    isActive,
    panelCount: currentArray.panelPolygons.length,
  });

  return (
    <div
      style={{
        position: "absolute",
        top: "20px",
        right: "20px",
        backgroundColor: "white",
        padding: "15px",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        zIndex: 1000,
        border: "3px solid #FF9800",
      }}
    >
      <div
        style={{
          marginBottom: "10px",
          fontWeight: "bold",
          fontSize: "14px",
          color: "#FF9800",
        }}
      >
        🎯 Fine-Tune Mode ACTIVE
      </div>
      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={() => setMode("row")}
          style={{
            padding: "8px 16px",
            backgroundColor: mode === "row" ? "#4CAF50" : "#E0E0E0",
            color: mode === "row" ? "white" : "#333",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "600",
          }}
        >
          Row
        </button>
        <button
          onClick={() => setMode("column")}
          style={{
            padding: "8px 16px",
            backgroundColor: mode === "column" ? "#2196F3" : "#E0E0E0",
            color: mode === "column" ? "white" : "#333",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "600",
          }}
        >
          Column
        </button>
      </div>
      {selectedPanelCoords && (
        <>
          <div style={{ marginTop: "10px", fontSize: "11px", color: "#666" }}>
            Selected: Row {selectedPanelCoords.rowOffset}, Col{" "}
            {selectedPanelCoords.colOffset}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log("🔘 Done button clicked!");

              // Clear selection
              console.log("Clearing selection...");
              setSelectedPanelCoords(null);

              // Clean up arrows
              if (fineTuneArrows) {
                console.log("Cleaning up", fineTuneArrows.length, "arrows");
                fineTuneArrows.forEach((arrow) => arrow.setMap(null));
                setFineTuneArrows(null);
              }

              // Reset all panel styles
              console.log("Resetting panel styles...");
              currentArray.panelPolygons.forEach((panel) => {
                panel.setOptions({
                  strokeColor: "#FFFFFF",
                  strokeWeight: 2,
                  fillOpacity: 0.6,
                });
              });

              console.log(
                "✅ Selection cleared, ready to select another panel"
              );
            }}
            style={{
              marginTop: "10px",
              padding: "8px 16px",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "600",
              width: "100%",
            }}
          >
            ✓ Done - Select Another
          </button>
        </>
      )}
      {!selectedPanelCoords && (
        <div
          style={{
            marginTop: "10px",
            fontSize: "11px",
            color: "#999",
            fontStyle: "italic",
          }}
        >
          Click any panel to start fine-tuning
        </div>
      )}
    </div>
  );
};

export default ArrayFineTuneTool;
