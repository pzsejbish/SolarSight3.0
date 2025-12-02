/*!
 * --------------------------------------------------------------------------------
 * File: [RooftopVisualizer.js]
 * Project: [Ballast Engineering Tool]
 * Created Date: [D12/29/2023]
 * Author: [James Bish, Arsen Tamamyan ]
 * Organization: PZSE Structural Engineers
 * --------------------------------------------------------------------------------
 * 
 * Copyright (c) [2024] PZSE Structural Engineers
 * 
 * This source code is the proprietary property of PZSE Structural Engineers and is
 * protected by international copyright and trade secret laws and treaties. No part
 * of this source code may be reproduced, copied, distributed, transmitted, broadcast,
 * displayed, sold, licensed, or otherwise exploited for any commercial purpose
 * whatsoever without the express prior written consent of PZSE Structural Engineers.
 * 
 * Use of this source code is governed by the terms of the agreement under which it
 * has been provided, which typically includes restrictions on use, disclosure,
 * modification, and conditions of license. If you have not received this source code
 * under such an agreement, then you have no rights to use it in any manner that
 * infringes the intellectual property rights of PZSE Structural Engineers.
 * 
 * --------------------------------------------------------------------------------
 */

// RooftopVisualizer.js
import React, { useState, useEffect, useMemo, useRef } from "react";
// import "./App.css";


const RooftopVisualizer = ({ buildingWidth, buildingLength, panelNsLength, panelEwWidth, distanceBetweenPanelsEW, distanceBetweenPanelsNS, transformState, isObstructionMode, setbackDistance, building_rotation, panel_layout, onLayoutChange}) => {
  // Scale factor (e.g., 1 ft = 30 pixels)
  const scaleFactor = 100;

  // Rotating only the building dimensions, not the panel dimensions
  const rotatedBuildingWidth = building_rotation === 90 ? buildingLength : buildingWidth;
  const rotatedBuildingLength = building_rotation === 90 ? buildingWidth : buildingLength;

  const scaledWidth = rotatedBuildingWidth * scaleFactor;
  const scaledLength = rotatedBuildingLength * scaleFactor;
  const scaledPanelWidth = panelEwWidth * scaleFactor; // Panel dimensions remain constant
  const scaledPanelLength = panelNsLength * scaleFactor;

  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [selectionBox, setSelectionBox] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const { panelsAcrossWidth, panelsAlongLength } = useMemo(() => {
    const effectiveWidth = scaledWidth - setbackDistance * 2 * scaleFactor;
    const effectiveLength = scaledLength - setbackDistance * 2 * scaleFactor;

      const totalPanelAndGapWidth = scaledPanelWidth + distanceBetweenPanelsEW * scaleFactor;
      const totalPanelAndGapLength = scaledPanelLength + distanceBetweenPanelsNS * scaleFactor;
    
      let panelsAcrossWidth = Math.floor(effectiveWidth / totalPanelAndGapWidth);
      let panelsAlongLength = Math.floor(effectiveLength / totalPanelAndGapLength);
    
      // Adjust for the off-by-one error if there's enough space for at least one more panel
      if (effectiveWidth - panelsAcrossWidth * totalPanelAndGapWidth >= scaledPanelWidth) {
        panelsAcrossWidth += 1;
      }
      if (effectiveLength - panelsAlongLength * totalPanelAndGapLength >= scaledPanelLength) {
        panelsAlongLength += 1;
      }
    
      return { panelsAcrossWidth, panelsAlongLength };
  }, [scaledWidth, scaledPanelWidth, scaledLength, scaledPanelLength, distanceBetweenPanelsEW, distanceBetweenPanelsNS, scaleFactor, setbackDistance]);
    
  const remainingWidth = scaledWidth - (panelsAcrossWidth * scaledPanelWidth + (panelsAcrossWidth - 1) * distanceBetweenPanelsEW * scaleFactor);
  const remainingLength = scaledLength - (panelsAlongLength * scaledPanelLength + (panelsAlongLength - 1) * distanceBetweenPanelsNS * scaleFactor);
  const additionalMarginTop = remainingLength / 2;
  const additionalMarginLeft = remainingWidth / 1.5; //mathematically this should be 2, however 1.5 achieves desired affect? @arsentamamyan

  const inputRefs = useRef(
    [...Array(panelsAlongLength)].map(() => Array(panelsAcrossWidth).fill(null))
  );

  // Calculate total row width based on number of panels and their width
  const totalRowWidth = panelsAcrossWidth * scaledPanelWidth + (panelsAcrossWidth - 1) * distanceBetweenPanelsEW * scaleFactor;

  // Update cellsClicked state when panel dimensions change
  const initialCellsState = useMemo(() =>
      Array(panelsAlongLength)
        .fill(null)
        .map(() => Array(panelsAcrossWidth).fill(false)),
    [panelsAcrossWidth, panelsAlongLength]
  );
  
  const [cellsClicked, setCellsClicked] = useState(initialCellsState);
  const lastPanelLayoutRef = useRef(null);
  const [isSelectionProcessed, setIsSelectionProcessed] = useState(false);

  useEffect(() => {
    if (panel_layout && 
        panel_layout.length === panelsAlongLength && 
        panel_layout[0].length === panelsAcrossWidth &&
        JSON.stringify(panel_layout) !== JSON.stringify(lastPanelLayoutRef.current)) {
      console.log("Updating layout from new panel_layout prop");
      setCellsClicked(panel_layout);
      lastPanelLayoutRef.current = panel_layout;
    }
  }, [panel_layout, panelsAlongLength, panelsAcrossWidth]);

  // Update the useEffect for onLayoutChange
  useEffect(() => {
    if (onLayoutChange && JSON.stringify(cellsClicked) !== JSON.stringify(lastPanelLayoutRef.current)) {
      console.log("Calling onLayoutChange from RooftopVisualizer");
      onLayoutChange(cellsClicked);
      lastPanelLayoutRef.current = cellsClicked;
    }
  }, [cellsClicked, onLayoutChange]);

  function createNewGridState(panelsAcross, panelsAlong, existingCells) {
    let newCellsClicked = [];
  
    for (let rowIndex = 0; rowIndex < panelsAlong; rowIndex++) {
      let newRow = [];
      for (let colIndex = 0; colIndex < panelsAcross; colIndex++) {
        // Use the existing cell state if available; otherwise, initialize to false.
        newRow.push(
          existingCells[rowIndex] && existingCells[rowIndex][colIndex] !== undefined
            ? existingCells[rowIndex][colIndex]
            : false
        );
      }
      newCellsClicked.push(newRow);
    }
    return newCellsClicked;
  }
  

  useEffect(() => {
    function areArraysEqual(arr1, arr2) {
      if (arr1.length !== arr2.length) {
        return false;
      }

      for (let i = 0; i < arr1.length; i++) {
        if (!arraysEqual(arr1[i], arr2[i])) {
          return false;
        }
      }

      return true;
    }

    // Helper function to compare nested arrays
    function arraysEqual(arr1, arr2) {
      return JSON.stringify(arr1) === JSON.stringify(arr2);
    }

    // Flag to check if an update is needed
    let shouldUpdate = false;

    const updatedCellsClicked = createNewGridState(
      panelsAcrossWidth,
      panelsAlongLength,
      cellsClicked
    );

    // Check if the new state is different from the current state
    if (!areArraysEqual(updatedCellsClicked, cellsClicked)) {
      shouldUpdate = true;
    }

    // Update the state only if necessary
    if (shouldUpdate) {
      setCellsClicked(updatedCellsClicked);
    }
  }, [panelsAcrossWidth, panelsAlongLength, cellsClicked]);

  useEffect(() => {
    if (dragEnd && !isSelectionProcessed) {
      const newCellsClicked = cellsClicked.map((row) => [...row]);
      const scaledGapEW = distanceBetweenPanelsEW * scaleFactor;
      const scaledGapNS = distanceBetweenPanelsNS * scaleFactor;
      const setbackOffsetX = setbackDistance * scaleFactor;
      const setbackOffsetY = setbackDistance * scaleFactor;

      for (let rowIndex = 0; rowIndex < panelsAlongLength; rowIndex++) {
        for (let colIndex = 0; colIndex < panelsAcrossWidth; colIndex++) {
          const cellTop =
            rowIndex * (scaledPanelLength + scaledGapNS) + setbackOffsetY;
          const cellLeft =
            colIndex * (scaledPanelWidth + scaledGapEW) + setbackOffsetX;
          const cellBottom = cellTop + scaledPanelLength;
          const cellRight = cellLeft + scaledPanelWidth;

          // Check if the cell intersects with the selection box
          if (
            cellLeft < selectionBox.x + selectionBox.width &&
            cellRight > selectionBox.x &&
            cellTop < selectionBox.y + selectionBox.height &&
            cellBottom > selectionBox.y
          ) {
            if (isObstructionMode) {
              // Toggle the obstruction state of the cell
              newCellsClicked[rowIndex][colIndex] =
                newCellsClicked[rowIndex][colIndex] === "obstruction"
                  ? false
                  : "obstruction";
            } else {
              // Toggle the panel selection state
              newCellsClicked[rowIndex][colIndex] =
                !newCellsClicked[rowIndex][colIndex];
            }
          }
        }
      }
      setCellsClicked(newCellsClicked);
      setSelectionBox({ x: 0, y: 0, width: 0, height: 0 });
      setIsSelectionProcessed(true);
      setDragEnd(null);

    }
  }, [
    dragEnd,
    panelsAlongLength,
    panelsAcrossWidth,
    scaledPanelLength,
    scaledPanelWidth,
    selectionBox,
    cellsClicked,
    isSelectionProcessed,
    distanceBetweenPanelsNS,
    distanceBetweenPanelsEW,
    isObstructionMode,
    setbackDistance
  ]);

  useEffect(() => {
    // Reset the selection processed flag when starting a new drag
    if (dragStart) {
      setIsSelectionProcessed(false);
    }
  }, [dragStart]);

  // Handle cell click
  const handleCellClick = (rowIndex, colIndex, e) => {
    console.log({ rowIndex, colIndex });
    if (e.ctrlKey) {
      // Do nothing if Control key is pressed
      return;
    }
    if (e.target.tagName === "INPUT") {
      // Do not toggle state if the click is on an input element
      return;
    }
    const newCellsClicked = cellsClicked.map((row) => [...row]);
    if (isObstructionMode) {
      const cell = newCellsClicked[rowIndex][colIndex];
      newCellsClicked[rowIndex][colIndex] = {
        ...cell,
        isObstructed: !cell?.isObstructed,
        height: cell?.isObstructed ? 0 : cell?.height, // Reset height if not an obstruction anymore
      };
    } else {
      newCellsClicked[rowIndex][colIndex] =
        !newCellsClicked[rowIndex][colIndex];
    }
    setCellsClicked(newCellsClicked);
  };

  const eventToCellPosition = (e, transformState) => {
    // console.log('Mouse Event:', { clientX: e.clientX, clientY: e.clientY });

    const containerRect = document
      .getElementById("rooftopContainer")
      .getBoundingClientRect();
    console.log("Container Rect:", containerRect);
    console.log("Transform State:", transformState);
    console.log("transform State Scale:", transformState.scale);

    const x = (e.clientX - containerRect.left) / transformState.scale;
    const y = (e.clientY - containerRect.top) / transformState.scale;

    // console.log('Calculated Grid Coordinates:', { x, y });
    return { x, y };
  };

  const handleMouseDown = (e) => {
    if (e.button === 0) {
      // Left mouse button
      const start = eventToCellPosition(e, transformState);
      //console.log('Mouse Down at:', start);
      setDragStart(start);
      setDragEnd(null);
    }
  };

  const handleMouseUp = (e) => {
    if (e.button === 0 && dragStart) {
      const end = eventToCellPosition(e, transformState);
      //console.log('Mouse Up at:', end);
      setDragEnd(end);

      // Add any additional logic you have here
    }
  };

  const handleMouseMove = (e) => {
    if (e.buttons === 1 && dragStart) {
      // Left mouse button is held down
      const newDragEnd = eventToCellPosition(e, transformState);
      //console.log('Mouse Move from:', dragStart, 'to:', newDragEnd);

      const minX = Math.min(dragStart.x, newDragEnd.x);
      const minY = Math.min(dragStart.y, newDragEnd.y);
      const width = Math.abs(newDragEnd.x - dragStart.x);
      const height = Math.abs(newDragEnd.y - dragStart.y);

      //console.log('Selection Box:', { minX, minY, width, height });
      setSelectionBox({ x: minX, y: minY, width, height });
    }
  };

  const handleHeightChange = (rowIndex, colIndex, e) => {
    const newHeight = e.target.value;
    setCellsClicked((prevCells) => {
      const newCells = [...prevCells];
      newCells[rowIndex][colIndex] = {
        ...newCells[rowIndex][colIndex],
        height: newHeight,
      };
      return newCells;
    });
  };

    // Use useEffect to detect changes in cellsClicked and call onLayoutChange
    useEffect(() => {
      if (onLayoutChange) {
        onLayoutChange(cellsClicked);
      }
    }, [cellsClicked, onLayoutChange]);
    
  return (
    <div
      id="rooftopContainer"
      className="absolute w-full h-full border-2 border-solid m-5 overflow-visible bg-gray-200"
      style={{
        width: scaledWidth,
        height: scaledLength,
      }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
    >
      <div
        className="absolute z-10 bg-amber-200 top-0 left-0 right-0"
        style={{ height: setbackDistance * scaleFactor }}
      ></div>
      <div
        className="absolute z-10 bg-amber-200 bottom-0 left-0 right-0"
        style={{ height: setbackDistance * scaleFactor }}
      ></div>
      <div
        className="absolute z-10 bg-amber-200 top-0 bottom-0 left-0"
        style={{ width: setbackDistance * scaleFactor }}
      ></div>
      <div
        className="absolute z-10 bg-amber-200 top-0 bottom-0 right-0"
        style={{ width: setbackDistance * scaleFactor }}
      ></div>

      <div
        className="absolute top-0 left-0"
        style={{
          marginTop: `${
            (setbackDistance * scaleFactor + additionalMarginTop) / 2
          }px`,
          marginLeft: `${
            (setbackDistance * scaleFactor + additionalMarginLeft) / 2
          }px`,
        }}
      >
        {[...Array(panelsAlongLength)].map((_, rowIndex) => (
          <div key={rowIndex} className="flex" style={{ width: totalRowWidth }}>
            {[...Array(panelsAcrossWidth)].map((_, colIndex) => (
              <div 
                key={colIndex}
                className={`border border-stone-500 box-border w-full h-full cursor-pointer ${
                  cellsClicked[rowIndex] &&
                  cellsClicked[rowIndex][colIndex] === true
                    ? "bg-blue-900 border-black-800 bg-contain"
                    : ""
                } ${
                  cellsClicked[rowIndex] &&
                  cellsClicked[rowIndex][colIndex] === "obstruction"
                    ? "bg-red-400 border-red-500 bg-contain w-full h-full"
                    : !cellsClicked[rowIndex]
                        ? "bg-stone-300"
                        : ""
                }`}
                style={{
                  width: scaledPanelWidth,
                  height: scaledPanelLength,
                  marginRight:
                    colIndex < panelsAcrossWidth - 1
                      ? distanceBetweenPanelsEW * scaleFactor
                      : 0,
                  marginBottom:
                    rowIndex < panelsAlongLength - 1
                      ? distanceBetweenPanelsNS * scaleFactor
                      : 0,
                }}
                onClick={(e) => handleCellClick(rowIndex, colIndex, e)}
              >
                {cellsClicked[rowIndex] &&
                  cellsClicked[rowIndex][colIndex] &&
                  cellsClicked[rowIndex][colIndex]?.isObstructed && (
                    <input
                      type="number"
                      value={cellsClicked[rowIndex][colIndex].height}
                      onChange={(e) =>
                        handleHeightChange(rowIndex, colIndex, e)
                      }
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => e.stopPropagation()}
                      className="w-full h-full text-center text-9xl bg-red-400 outline-0 appearance-none"
                      //   className="obstruction-height-input"
                      min="0"
                      tabIndex="0"
                      ref={(el) => (inputRefs.current[rowIndex][colIndex] = el)}
                    />
                  )}
                {/* Each cell represents a potential solar panel location */}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div
        className="absolute top-0 border-3 border-dashed pointer-events-none box-border"
        style={{ width: scaledWidth, height: scaledLength }}
      />
      <div
        className="absolute border-2 border-dashed border-stone-500 bg-stone-400 opacity-50"
        style={{
          left: selectionBox.x,
          top: selectionBox.y,
          width: selectionBox.width,
          height: selectionBox.height,
        }}
      />
    </div>
  );
};

export default RooftopVisualizer;