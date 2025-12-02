/*!
 * --------------------------------------------------------------------------------
 * File: [MapLayoutVisualizer.js]
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

import React, { useEffect, useState } from 'react';

const MapLayoutVisualizer = ({ polygonCoordinates, distances, scaleFactor }) => {
  const [gridDimensions, setGridDimensions] = useState({ width: 0, height: 0 });
  const [transformedPolygon, setTransformedPolygon] = useState([]);

  useEffect(() => {
    const transformedCoords = transformPolygonCoordinates(polygonCoordinates, distances, scaleFactor);
    setTransformedPolygon(transformedCoords);

    // Example logic to determine grid dimensions
    const maxCoords = transformedCoords.reduce((acc, coords) => ({
      x: Math.max(acc.x, coords.x),
      y: Math.max(acc.y, coords.y)
    }), { x: 0, y: 0 });
    setGridDimensions({ width: maxCoords.x, height: maxCoords.y });
  }, [polygonCoordinates, distances, scaleFactor]);

  const transformPolygonCoordinates = (polygonCoordinates, distances, scaleFactor) => {
    let transformedCoordinates = [];
    let currentX = 0;
    let currentY = 0;

    for (let i = 0; i < polygonCoordinates.length - 1; i++) {
      transformedCoordinates.push({ x: currentX, y: currentY });

      let angle = calculateAngleBetweenPoints(polygonCoordinates[i], polygonCoordinates[i + 1]);
      let dx = Math.cos(angle) * distances[i] * scaleFactor;
      let dy = Math.sin(angle) * distances[i] * scaleFactor;

      currentX += dx;
      currentY += dy;
    }

    transformedCoordinates.push({ x: currentX, y: currentY });

    return transformedCoordinates;
  };

  const calculateAngleBetweenPoints = (pointA, pointB) => {
    let dy = pointB[1] - pointA[1];
    let dx = pointB[0] - pointA[0];
    return Math.atan2(dy, dx);
  };

  const renderGrid = () => {
    // Render the grid and panels based on transformedPolygon and gridDimensions
    // This is where you would map over your grid cells and render them
  };

  return (
    <div className="map-layout-visualizer">
      <h2>Map Layout Visualizer</h2>
      <div className="grid-container" style={{ width: gridDimensions.width, height: gridDimensions.height}}>
        {renderGrid()}
        {/* Render the transformed polygon here */}
      </div>
    </div>
  );
};

export default MapLayoutVisualizer;
