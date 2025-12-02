// src/components/PanelGrid.js
import React, { useCallback, useEffect, useRef } from 'react';
import { Polygon } from '@react-google-maps/api';

function PanelGrid({ 
  grid, 
  panelDimensions, 
  spacing, 
  setback,
  centerPoint,
  panelAngle,
  isLandscape,
  gridOffsetX,
  gridOffsetY,
  onPanelClick,
  mode
}) {
  const panelsRef = useRef([]);

  const createPanel = useCallback((i, j, panelGridX, panelGridY, rotatedCorners, isInsideSetback) => {
    const panelPolygon = new window.google.maps.Polygon({
      paths: rotatedCorners,
      fillColor: isInsideSetback ? "#0000FF" : "#FFA500",
      fillOpacity: isInsideSetback ? 0.25 : 0,
      strokeWeight: isInsideSetback ? 1 : 0,
      strokeColor: "#000000",
      clickable: isInsideSetback,
      zIndex: isInsideSetback ? 1000 : 999
    });
    
    panelPolygon.index = { row: j, col: i };
    panelPolygon.isSelected = false;

    panelPolygon.addListener('click', () => onPanelClick(panelPolygon));

    panelPolygon.addListener('mouseover', function() {
      const isObstruction = grid[j][i] === 'obstruction';
      if (!isObstruction && !this.isSelected) {
        this.setOptions({ fillOpacity: 0.5, fillColor: "#00FFFF" });
      }
    });

    panelPolygon.addListener('mouseout', function() {
      const isObstruction = grid[j][i] === 'obstruction';
      if (isObstruction) {
        this.setOptions({ fillOpacity: 0.5, fillColor: "#FF0000" });
      } else if (!this.isSelected) {
        this.setOptions({ fillOpacity: 0.25, fillColor: "#0000FF" });
      } else {
        this.setOptions({ fillOpacity: 0.5, fillColor: "#00FF00" });
      }
    });

    return panelPolygon;
  }, [grid, onPanelClick]);

  const updatePanels = useCallback(() => {
    // Clear existing panels
    panelsRef.current.forEach(panel => panel.setMap(null));
    panelsRef.current = [];

    const { width: panelWidth, length: panelLength } = panelDimensions;
    const { ew: spacingEW, ns: spacingNS } = spacing;

    const effectivePanelWidth = isLandscape ? panelWidth : panelLength;
    const effectivePanelLength = isLandscape ? panelLength : panelWidth;
    const effectiveSpacingEW = isLandscape ? spacingEW : spacingNS;
    const effectiveSpacingNS = isLandscape ? spacingNS : spacingEW;

    const edgeVector = {
      x: Math.sin(panelAngle * Math.PI / 180),
      y: Math.cos(panelAngle * Math.PI / 180)
    };
    
    const perpVector = {
      x: -edgeVector.y,
      y: edgeVector.x
    };

    const normalizedEdgeVector = {
      x: edgeVector.x / Math.sqrt(edgeVector.x * edgeVector.x + edgeVector.y * edgeVector.y),
      y: edgeVector.y / Math.sqrt(edgeVector.x * edgeVector.x + edgeVector.y * edgeVector.y)
    };

    grid.forEach((row, j) => {
      row.forEach((cell, i) => {
        const panelGridX = i * (effectivePanelWidth + effectiveSpacingEW) + gridOffsetX;
        const panelGridY = -j * (effectivePanelLength + effectiveSpacingNS) + gridOffsetY;

        const corners = [
          { x: panelGridX, y: panelGridY },
          { x: panelGridX + effectivePanelWidth, y: panelGridY },
          { x: panelGridX + effectivePanelWidth, y: panelGridY - effectivePanelLength },
          { x: panelGridX, y: panelGridY - effectivePanelLength }
        ];

        const rotatedCorners = corners.map(corner => {
          const rotatedX = corner.x * normalizedEdgeVector.x - corner.y * perpVector.x;
          const rotatedY = corner.x * normalizedEdgeVector.y - corner.y * perpVector.y;
          
          return new window.google.maps.LatLng(
            centerPoint.lat() + rotatedY / 111111,
            centerPoint.lng() + rotatedX / (111111 * Math.cos(centerPoint.lat() * Math.PI / 180))
          );
        });

        const isInsideSetback = cell !== false && cell !== 'obstruction';
        const panel = createPanel(i, j, panelGridX, panelGridY, rotatedCorners, isInsideSetback);
        panelsRef.current.push(panel);
      });
    });

    // Set the map for all panels at once
    panelsRef.current.forEach(panel => panel.setMap(window.map));
  }, [grid, panelDimensions, spacing, isLandscape, panelAngle, gridOffsetX, gridOffsetY, centerPoint, createPanel]);

  useEffect(() => {
    updatePanels();
    return () => {
      panelsRef.current.forEach(panel => panel.setMap(null));
    };
  }, [updatePanels]);

  return null; // This component doesn't render anything directly
}

export default PanelGrid;