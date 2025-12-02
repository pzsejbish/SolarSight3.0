/**
 * ArrayCreationTool.js
 * Handles the interactive click-and-drag array creation workflow
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

const ArrayCreationTool = ({ 
  mapRef, 
  arrayManager, 
  isActive,
  arrayCreationStep = 'idle',
  currentArrayDraft = null,
  onArrayCreated,
  onArrayUpdated,
  buildingRotation
}) => {
  // Use external workflow step instead of internal state
  const creationState = arrayCreationStep;
  const currentArray = currentArrayDraft;
  const [dragStartPoint, setDragStartPoint] = useState(null);
  const [previewLine, setPreviewLine] = useState(null);
  const [rowCount, setRowCount] = useState(1);
  const [colCount, setColCount] = useState(1);
  
  const overlayRef = useRef(null);
  const mapDivRef = useRef(null);
  
  // Use refs to avoid recreating callbacks
  const creationStateRef = useRef(creationState);
  const currentArrayRef = useRef(currentArray);
  const dragStartPointRef = useRef(dragStartPoint);
  const rowCountRef = useRef(currentArray?.rows || 1);
  const colCountRef = useRef(currentArray?.cols || 1);
  
  // Keep refs in sync with state
  useEffect(() => {
    creationStateRef.current = creationState;
    currentArrayRef.current = currentArray;
    dragStartPointRef.current = dragStartPoint;
    rowCountRef.current = currentArray?.rows || 1;
    colCountRef.current = currentArray?.cols || 1;
  }, [creationState, currentArray, dragStartPoint]);

  // Handle arrow visibility based on workflow step
  useEffect(() => {
    if (!currentArray) return;
    
    if (creationState === 'rows') {
      console.log('Row mode - showing horizontal arrows');
      
      // Show horizontal arrows (rows)
      if (currentArray.leftArrow) {
        currentArray.leftArrow.setVisible(true);
      }
      if (currentArray.rightArrow) {
        currentArray.rightArrow.setVisible(true);
      }
      
      // Hide vertical arrows (columns)
      if (currentArray.upArrow) {
        currentArray.upArrow.setVisible(false);
      }
      if (currentArray.downArrow) {
        currentArray.downArrow.setVisible(false);
      }
    } else if (creationState === 'columns') {
      console.log('Column mode - showing vertical arrows');
      
      // Hide horizontal arrows (rows)
      if (currentArray.leftArrow) {
        currentArray.leftArrow.setVisible(false);
      }
      if (currentArray.rightArrow) {
        currentArray.rightArrow.setVisible(false);
      }
      
      // Show vertical arrows (columns)
      if (currentArray.upArrow) {
        currentArray.upArrow.setVisible(true);
      }
      if (currentArray.downArrow) {
        currentArray.downArrow.setVisible(true);
      }
    } else if (creationState === 'origin') {
      // Hide all arrows during origin placement
      if (currentArray.leftArrow) currentArray.leftArrow.setVisible(false);
      if (currentArray.rightArrow) currentArray.rightArrow.setVisible(false);
      if (currentArray.upArrow) currentArray.upArrow.setVisible(false);
      if (currentArray.downArrow) currentArray.downArrow.setVisible(false);
    }
  }, [creationState, currentArray]);

  // Update arrow positions and rotations when panel rotation changes
  // Update arrow positions and icons when rotation changes DURING CREATION
  // For editing existing arrays, handleEditArray positions them correctly
  useEffect(() => {
    if (!currentArray || !currentArray.origin) return;
    
    const arrayRotation = currentArray.rotation || 0;
    const totalRotation = buildingRotation + arrayRotation;
    
    // Check if this is a new array (rows=1, cols=1) or being edited
    const isNewArray = currentArray.rows === 1 && currentArray.cols === 1;
    
    console.log('🔄 Updating arrows for rotation:', {
      buildingRotation,
      arrayRotation,
      totalRotation,
      isNewArray
    });
    
    const origin = new window.google.maps.LatLng(
      currentArray.origin.lat,
      currentArray.origin.lng
    );
    const offsetMeters = 1.5; // Close to origin but not overlapping
    
    // Update LEFT/RIGHT arrows (rows)
    if (currentArray.leftArrow) {
      // Only reposition if it's a new array during creation
      if (isNewArray) {
        const leftPos = window.google.maps.geometry.spherical.computeOffset(
          origin,
          offsetMeters,
          (totalRotation + 180) % 360
        );
        currentArray.leftArrow.setPosition(leftPos);
      }
      // Always update icon rotation
      currentArray.leftArrow.setIcon({
        ...currentArray.leftArrow.getIcon(),
        rotation: totalRotation + 180 + 90
      });
    }
    
    if (currentArray.rightArrow) {
      if (isNewArray) {
        const rightPos = window.google.maps.geometry.spherical.computeOffset(
          origin,
          offsetMeters,
          totalRotation
        );
        currentArray.rightArrow.setPosition(rightPos);
      }
      currentArray.rightArrow.setIcon({
        ...currentArray.rightArrow.getIcon(),
        rotation: totalRotation + 90
      });
    }
    
    // Update UP/DOWN arrows (columns)
    if (currentArray.upArrow) {
      if (isNewArray) {
        const upPos = window.google.maps.geometry.spherical.computeOffset(
          origin,
          offsetMeters,
          (totalRotation + 90) % 360
        );
        currentArray.upArrow.setPosition(upPos);
      }
      currentArray.upArrow.setIcon({
        ...currentArray.upArrow.getIcon(),
        rotation: (totalRotation + 90 + 90) % 360
      });
    }
    
    if (currentArray.downArrow) {
      if (isNewArray) {
        const downPos = window.google.maps.geometry.spherical.computeOffset(
          origin,
          offsetMeters,
          (totalRotation + 270) % 360
        );
        currentArray.downArrow.setPosition(downPos);
      }
      currentArray.downArrow.setIcon({
        ...currentArray.downArrow.getIcon(),
        rotation: (totalRotation + 270 + 90) % 360
      });
    }
  }, [currentArray, currentArray?.rotation, buildingRotation]);

  // Initialize overlay for coordinate conversion
  useEffect(() => {
    if (mapRef.current && !overlayRef.current) {
      const overlay = new window.google.maps.OverlayView();
      overlay.draw = function() {};
      overlay.setMap(mapRef.current);
      overlayRef.current = overlay;
      mapDivRef.current = mapRef.current.getDiv();
    }
  }, [mapRef]);

  // Cleanup preview line when component unmounts or state changes
  useEffect(() => {
    return () => {
      if (previewLine) {
        previewLine.setMap(null);
      }
    };
  }, [previewLine]);

  /**
   * Calculate distance and panel count along the drag direction
   */
  const calculatePanelCount = useCallback((startLatLng, endLatLng) => {
    const distance = window.google.maps.geometry.spherical.computeDistanceBetween(
      startLatLng,
      endLatLng
    );

    const dims = arrayManager.getPanelDimensions();
    const panelCount = Math.max(1, Math.floor(distance / dims.unitWidth));

    return panelCount;
  }, [arrayManager]);

  /**
   * Create a preview line showing the drag direction
   */
  const createPreviewLine = useCallback((start, end, color = '#00FF00') => {
    if (previewLine) {
      previewLine.setMap(null);
    }

    const line = new window.google.maps.Polyline({
      path: [start, end],
      strokeColor: color,
      strokeOpacity: 0.8,
      strokeWeight: 3,
      map: mapRef.current,
      zIndex: 2000
    });

    setPreviewLine(line);
    return line;
  }, [mapRef, previewLine]);

  /**
   * Get the direction vector aligned with building rotation
   */
  const getAlignedDirection = useCallback((startLatLng, endLatLng) => {
    const angleRad = buildingRotation * Math.PI / 180;
    
    // Calculate raw direction
    const latDiff = endLatLng.lat() - startLatLng.lat();
    const lngDiff = endLatLng.lng() - startLatLng.lng();

    // Project onto building-aligned axes
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);

    const alongBuilding = lngDiff * cos + latDiff * sin;
    const perpBuilding = -lngDiff * sin + latDiff * cos;

    // Determine primary direction (horizontal or vertical relative to building)
    const isHorizontal = Math.abs(alongBuilding) > Math.abs(perpBuilding);

    return { isHorizontal, alongBuilding, perpBuilding };
  }, [buildingRotation]);

  /**
   * Calculate the end point snapped to building alignment
   */
  const snapToAlignment = useCallback((startLatLng, endLatLng, isHorizontal) => {
    const angleRad = buildingRotation * Math.PI / 180;
    const distance = window.google.maps.geometry.spherical.computeDistanceBetween(
      startLatLng,
      endLatLng
    );

    // Calculate direction based on alignment
    let heading;
    if (isHorizontal) {
      // Align with building's longest edge
      heading = buildingRotation;
      
      // Check if we're going backwards
      const latDiff = endLatLng.lat() - startLatLng.lat();
      const lngDiff = endLatLng.lng() - startLatLng.lng();
      const cos = Math.cos(angleRad);
      const sin = Math.sin(angleRad);
      const projection = lngDiff * cos + latDiff * sin;
      
      if (projection < 0) {
        heading = (buildingRotation + 180) % 360;
      }
    } else {
      // Perpendicular to building's longest edge
      heading = (buildingRotation + 90) % 360;
      
      // Check if we're going backwards
      const latDiff = endLatLng.lat() - startLatLng.lat();
      const lngDiff = endLatLng.lng() - startLatLng.lng();
      const cos = Math.cos((angleRad + Math.PI / 2));
      const sin = Math.sin((angleRad + Math.PI / 2));
      const projection = lngDiff * cos + latDiff * sin;
      
      if (projection < 0) {
        heading = (buildingRotation + 270) % 360;
      }
    }

    // Calculate snapped end point
    return window.google.maps.geometry.spherical.computeOffset(
      startLatLng,
      distance,
      heading
    );
  }, [buildingRotation]);

  /**
   * Handle map click to start array creation
   * Using refs to avoid recreating this callback
   */
  const handleMapClick = useCallback((event) => {
    console.log('handleMapClick called!', { 
      isActive, 
      creationState: creationStateRef.current, 
      event 
    });
    
    if (!isActive) {
      console.log('Not active, ignoring click');
      return;
    }

    const clickLatLng = event.latLng;
    console.log('Click LatLng:', clickLatLng?.toString());

    // Only allow clicking to place origin when in creation mode and no array exists yet
    if ((creationStateRef.current === 'idle' || creationStateRef.current === 'origin') && !currentArrayRef.current) {
      // Check if click is inside setback polygon
      const isInsideSetback = window.google.maps.geometry.poly.containsLocation(
        clickLatLng,
        arrayManager.setbackPolygon
      );
      
      if (!isInsideSetback) {
        console.warn('Click is outside setback area!');
        alert('⚠️ Please click inside the orange setback area (the safe zone away from the building edge)');
        return;
      }
      
      // Start new array
      console.log('Starting array creation at:', clickLatLng.toString());
      
      // Create a visible marker at the origin point
      const originMarker = new window.google.maps.Marker({
        position: clickLatLng,
        map: mapRef.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#4CAF50',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 3
        },
        title: 'Array Origin - Drag to adjust position',
        zIndex: 10000,
        draggable: true,
        cursor: 'grab'
      });
      
      console.log('Origin marker created at:', clickLatLng.toString());
      
      // Add drag listener to update array position
      originMarker.addListener('dragstart', () => {
        originMarker.setOptions({ cursor: 'grabbing' });
      });
      
      originMarker.addListener('drag', (e) => {
        const newPosition = e.latLng;
        
        // Check if still inside setback
        const isInsideSetback = window.google.maps.geometry.poly.containsLocation(
          newPosition,
          arrayManager.setbackPolygon
        );
        
        if (!isInsideSetback) {
          // Snap back to previous valid position
          originMarker.setPosition(clickLatLng);
          return;
        }
        
        // Update the array origin
        if (currentArrayRef.current) {
          currentArrayRef.current.origin = {
            lat: newPosition.lat(),
            lng: newPosition.lng()
          };
          
          // Regenerate panels at new position
          arrayManager.generateArrayPanels(currentArrayRef.current, mapRef.current);
          
          // Update arrow positions using total rotation (building + array rotation)
          const arrayRotation = currentArrayRef.current.rotation || 0;
          const totalRotation = buildingRotation + arrayRotation;
          const offsetMeters = 1.5; // Close to origin but not overlapping
          
          if (currentArrayRef.current.leftArrow) {
            const leftPos = window.google.maps.geometry.spherical.computeOffset(
              newPosition,
              offsetMeters,
              (totalRotation + 180) % 360
            );
            currentArrayRef.current.leftArrow.setPosition(leftPos);
          }
          
          if (currentArrayRef.current.rightArrow) {
            const rightPos = window.google.maps.geometry.spherical.computeOffset(
              newPosition,
              offsetMeters,
              totalRotation
            );
            currentArrayRef.current.rightArrow.setPosition(rightPos);
          }
          
          if (currentArrayRef.current.upArrow) {
            const upPos = window.google.maps.geometry.spherical.computeOffset(
              newPosition,
              offsetMeters,
              (totalRotation + 90) % 360
            );
            currentArrayRef.current.upArrow.setPosition(upPos);
          }
          
          if (currentArrayRef.current.downArrow) {
            const downPos = window.google.maps.geometry.spherical.computeOffset(
              newPosition,
              offsetMeters,
              (totalRotation + 270) % 360
            );
            currentArrayRef.current.downArrow.setPosition(downPos);
          }
          
          // Notify parent of update
          if (onArrayUpdated) {
            onArrayUpdated(currentArrayRef.current);
          }
        }
      });
      
      originMarker.addListener('dragend', () => {
        originMarker.setOptions({ cursor: 'grab' });
        console.log('Origin marker dragged to:', originMarker.getPosition().toString());
      });
      
      console.log('🎯 Building rotation received:', buildingRotation, '°');
      
      // Calculate positions for left and right arrow markers
      // Arrows should be on OPPOSITE SIDES of the origin point
      // One arrow goes in the building rotation direction, the other goes opposite
      const offsetMeters = 1.5; // Close to origin but not overlapping
      
      // Right arrow - in the direction of building rotation
      const rightArrowPos = window.google.maps.geometry.spherical.computeOffset(
        clickLatLng,
        offsetMeters,
        buildingRotation // Same direction as building edge
      );
      
      // Left arrow - OPPOSITE direction (180° from right arrow)
      const leftArrowPos = window.google.maps.geometry.spherical.computeOffset(
        clickLatLng,
        offsetMeters,
        (buildingRotation + 180) % 360 // Opposite direction
      );
      
      console.log('🎯 Arrow positions:', {
        rightArrowHeading: buildingRotation,
        leftArrowHeading: (buildingRotation + 180) % 360,
        rightArrowPos: rightArrowPos.toString(),
        leftArrowPos: leftArrowPos.toString()
      });
      
      console.log('🎯 Arrow positions calculated:', {
        leftArrowPos: leftArrowPos.toString(),
        rightArrowPos: rightArrowPos.toString()
      });
      
      // Debug line removed - no longer needed
      
      // Create LEFT arrow marker (pointing away from origin along building edge)
      const leftArrow = new window.google.maps.Marker({
        position: leftArrowPos,
        map: mapRef.current,
        icon: {
          path: 'M 0,0 L 10,-5 L 10,5 Z', // Right-pointing triangle (points away from origin)
          fillColor: '#4CAF50',
          fillOpacity: 0.8,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
          scale: 1.5,
          anchor: new window.google.maps.Point(0, 0),
          rotation: buildingRotation + 180 + 90 // Points in opposite direction of building rotation
        },
        title: 'Drag to add panels in this direction',
        zIndex: 10001,
        draggable: true,
        cursor: 'grab'
      });
      
      // Create RIGHT arrow marker (pointing away from origin along building edge)
      const rightArrow = new window.google.maps.Marker({
        position: rightArrowPos,
        map: mapRef.current,
        icon: {
          path: 'M 0,0 L 10,-5 L 10,5 Z', // Right-pointing triangle (points away from origin)
          fillColor: '#4CAF50',
          fillOpacity: 0.8,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
          scale: 1.5,
          anchor: new window.google.maps.Point(0, 0),
          rotation: buildingRotation + 90 // Points in same direction as building rotation
        },
        title: 'Drag to add panels in this direction',
        zIndex: 10001,
        draggable: true,
        cursor: 'grab'
      });
      
      console.log('Arrow markers created');
      
      // Add drag listeners to arrows with constraints
      leftArrow.addListener('drag', (e) => {
        const dragPos = e.latLng;
        
        // Get current origin position (may have been dragged)
        const currentOrigin = new window.google.maps.LatLng(
          currentArrayRef.current.origin.lat,
          currentArrayRef.current.origin.lng
        );
        
        // Calculate total rotation (building + array rotation)
        const arrayRotation = currentArrayRef.current.rotation || 0;
        const totalRotation = buildingRotation + arrayRotation;
        
        // Project drag position onto the line defined by total rotation
        // Calculate the vector from origin to drag position
        const heading = window.google.maps.geometry.spherical.computeHeading(currentOrigin, dragPos);
        const distance = window.google.maps.geometry.spherical.computeDistanceBetween(currentOrigin, dragPos);
        
        // Project onto rotation line (left direction = totalRotation + 180)
        const targetHeading = (totalRotation + 180) % 360;
        const projectedDistance = distance * Math.cos((heading - targetHeading) * Math.PI / 180);
        
        // Only allow movement in the left direction (positive distance along the target heading)
        if (projectedDistance > 0) {
          const constrainedPos = window.google.maps.geometry.spherical.computeOffset(
            currentOrigin,
            projectedDistance,
            targetHeading
          );
          leftArrow.setPosition(constrainedPos);
        } else {
          // Don't allow crossing origin
          leftArrow.setPosition(currentOrigin);
          return;
        }
        
        // Use the projected distance
        const finalDistance = projectedDistance;
        
        // Get panel width in meters
        const panelWidthFeet = parseFloat(arrayManager.formData.pv_module_ew_width);
        const panelWidthMeters = panelWidthFeet * 0.3048;
        const spacingMeters = parseFloat(arrayManager.formData.distance_between_panels_ew) * 0.3048;
        const unitWidth = panelWidthMeters + spacingMeters;
        
        // Calculate number of panels (snap to whole panels)
        const panelCount = Math.max(1, Math.floor(finalDistance / unitWidth));
        
        // Update array with panels going LEFT from origin
        arrayManager.updateArrayRowsLeft(currentArrayRef.current, panelCount, mapRef.current);
        setRowCount(currentArrayRef.current.rows); // Total row count
        
        // Notify parent of update
        if (onArrayUpdated) {
          onArrayUpdated(currentArrayRef.current);
        }
      });
      
      rightArrow.addListener('drag', (e) => {
        const dragPos = e.latLng;
        
        // Get current origin position (may have been dragged)
        const currentOrigin = new window.google.maps.LatLng(
          currentArrayRef.current.origin.lat,
          currentArrayRef.current.origin.lng
        );
        
        // Calculate total rotation (building + array rotation)
        const arrayRotation = currentArrayRef.current.rotation || 0;
        const totalRotation = buildingRotation + arrayRotation;
        
        // Project drag position onto the line defined by total rotation
        const heading = window.google.maps.geometry.spherical.computeHeading(currentOrigin, dragPos);
        const distance = window.google.maps.geometry.spherical.computeDistanceBetween(currentOrigin, dragPos);
        
        // Project onto rotation line (right direction = totalRotation)
        const targetHeading = totalRotation;
        const projectedDistance = distance * Math.cos((heading - targetHeading) * Math.PI / 180);
        
        // Only allow movement in the right direction (positive distance)
        if (projectedDistance > 0) {
          const constrainedPos = window.google.maps.geometry.spherical.computeOffset(
            currentOrigin,
            projectedDistance,
            targetHeading
          );
          rightArrow.setPosition(constrainedPos);
        } else {
          // Don't allow crossing origin
          rightArrow.setPosition(currentOrigin);
          return;
        }
        
        // Use the projected distance
        const finalDistance = projectedDistance;
        
        // Get panel width in meters
        const panelWidthFeet = parseFloat(arrayManager.formData.pv_module_ew_width);
        const panelWidthMeters = panelWidthFeet * 0.3048;
        const spacingMeters = parseFloat(arrayManager.formData.distance_between_panels_ew) * 0.3048;
        const unitWidth = panelWidthMeters + spacingMeters;
        
        // Calculate number of panels (snap to whole panels)
        const panelCount = Math.max(1, Math.floor(finalDistance / unitWidth));
        
        // Update array with panels going RIGHT from origin
        arrayManager.updateArrayRowsRight(currentArrayRef.current, panelCount, mapRef.current);
        setRowCount(currentArrayRef.current.rows); // Total row count
        
        // Notify parent of update
        if (onArrayUpdated) {
          onArrayUpdated(currentArrayRef.current);
        }
      });
      
      leftArrow.addListener('dragstart', () => {
        console.log('Started dragging LEFT arrow');
        leftArrow.setOptions({ cursor: 'grabbing' });
      });
      
      rightArrow.addListener('dragstart', () => {
        console.log('Started dragging RIGHT arrow');
        rightArrow.setOptions({ cursor: 'grabbing' });
      });
      
      leftArrow.addListener('dragend', (e) => {
        console.log('Stopped dragging LEFT arrow');
        leftArrow.setOptions({ cursor: 'grab' });
        
        // Snap arrow back to rotation line (building + array rotation)
        const arrayRotation = currentArrayRef.current.rotation || 0;
        const totalRotation = buildingRotation + arrayRotation;
        const finalPos = leftArrow.getPosition();
        const currentOrigin = new window.google.maps.LatLng(
          currentArrayRef.current.origin.lat,
          currentArrayRef.current.origin.lng
        );
        const distance = window.google.maps.geometry.spherical.computeDistanceBetween(currentOrigin, finalPos);
        const snappedPos = window.google.maps.geometry.spherical.computeOffset(
          currentOrigin,
          distance,
          (totalRotation + 180) % 360
        );
        leftArrow.setPosition(snappedPos);
        console.log('Snapped left arrow to rotation line');
      });
      
      rightArrow.addListener('dragend', (e) => {
        console.log('Stopped dragging RIGHT arrow');
        rightArrow.setOptions({ cursor: 'grab' });
        
        // Snap arrow back to rotation line (building + array rotation)
        const arrayRotation = currentArrayRef.current.rotation || 0;
        const totalRotation = buildingRotation + arrayRotation;
        const finalPos = rightArrow.getPosition();
        const currentOrigin = new window.google.maps.LatLng(
          currentArrayRef.current.origin.lat,
          currentArrayRef.current.origin.lng
        );
        const distance = window.google.maps.geometry.spherical.computeDistanceBetween(currentOrigin, finalPos);
        const snappedPos = window.google.maps.geometry.spherical.computeOffset(
          currentOrigin,
          distance,
          totalRotation
        );
        rightArrow.setPosition(snappedPos);
        console.log('Snapped right arrow to rotation line');
      });
      
      // Create UP/DOWN arrows for columns (perpendicular to building edge)
      const upArrowPos = window.google.maps.geometry.spherical.computeOffset(
        clickLatLng,
        offsetMeters,
        (buildingRotation + 90) % 360 // Perpendicular, up direction
      );
      
      const downArrowPos = window.google.maps.geometry.spherical.computeOffset(
        clickLatLng,
        offsetMeters,
        (buildingRotation + 270) % 360 // Perpendicular, down direction
      );
      
      // Create UP arrow marker (pointing perpendicular to building edge)
      const upArrow = new window.google.maps.Marker({
        position: upArrowPos,
        map: mapRef.current,
        icon: {
          path: 'M 0,0 L 10,-5 L 10,5 Z', // Right-pointing triangle (points away from origin)
          fillColor: '#2196F3', // Blue color for columns
          fillOpacity: 0.8,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
          scale: 1.5,
          anchor: new window.google.maps.Point(0, 0),
          rotation: (buildingRotation + 90 + 90) % 360 // Perpendicular to building
        },
        title: 'Drag to add columns in this direction',
        zIndex: 10001,
        draggable: true,
        cursor: 'grab',
        visible: false // Hidden initially until rows are confirmed
      });
      
      // Create DOWN arrow marker (pointing perpendicular to building edge)
      const downArrow = new window.google.maps.Marker({
        position: downArrowPos,
        map: mapRef.current,
        icon: {
          path: 'M 0,0 L 10,-5 L 10,5 Z', // Right-pointing triangle (points away from origin)
          fillColor: '#2196F3', // Blue color for columns
          fillOpacity: 0.8,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
          scale: 1.5,
          anchor: new window.google.maps.Point(0, 0),
          rotation: (buildingRotation + 270 + 90) % 360 // Perpendicular to building
        },
        title: 'Drag to add columns in this direction',
        zIndex: 10001,
        draggable: true,
        cursor: 'grab',
        visible: false // Hidden initially until rows are confirmed
      });
      
      // Add drag listeners for UP arrow
      upArrow.addListener('drag', (e) => {
        const dragPos = e.latLng;
        
        // Get current origin position (may have been dragged)
        const currentOrigin = new window.google.maps.LatLng(
          currentArrayRef.current.origin.lat,
          currentArrayRef.current.origin.lng
        );
        
        // Calculate total rotation (building + array rotation)
        const arrayRotation = currentArrayRef.current.rotation || 0;
        const totalRotation = buildingRotation + arrayRotation;
        
        const heading = window.google.maps.geometry.spherical.computeHeading(currentOrigin, dragPos);
        const distance = window.google.maps.geometry.spherical.computeDistanceBetween(currentOrigin, dragPos);
        
        const targetHeading = (totalRotation + 90) % 360;
        const projectedDistance = distance * Math.cos((heading - targetHeading) * Math.PI / 180);
        
        if (projectedDistance > 0) {
          const constrainedPos = window.google.maps.geometry.spherical.computeOffset(
            currentOrigin,
            projectedDistance,
            targetHeading
          );
          upArrow.setPosition(constrainedPos);
        } else {
          upArrow.setPosition(currentOrigin);
          return;
        }
        
        const finalDistance = projectedDistance;
        const panelLengthFeet = parseFloat(arrayManager.formData.pv_module_ns_length);
        const panelLengthMeters = panelLengthFeet * 0.3048;
        const spacingMeters = parseFloat(arrayManager.formData.distance_between_panels_ns) * 0.3048;
        const unitLength = panelLengthMeters + spacingMeters;
        
        const panelCount = Math.max(1, Math.floor(finalDistance / unitLength));
        arrayManager.updateArrayColsDown(currentArrayRef.current, panelCount, mapRef.current);
        setColCount(currentArrayRef.current.cols);
        
        // Notify parent of update
        if (onArrayUpdated) {
          onArrayUpdated(currentArrayRef.current);
        }
      });
      
      // Add drag listeners for DOWN arrow
      downArrow.addListener('drag', (e) => {
        const dragPos = e.latLng;
        
        // Get current origin position (may have been dragged)
        const currentOrigin = new window.google.maps.LatLng(
          currentArrayRef.current.origin.lat,
          currentArrayRef.current.origin.lng
        );
        
        // Calculate total rotation (building + array rotation)
        const arrayRotation = currentArrayRef.current.rotation || 0;
        const totalRotation = buildingRotation + arrayRotation;
        
        const heading = window.google.maps.geometry.spherical.computeHeading(currentOrigin, dragPos);
        const distance = window.google.maps.geometry.spherical.computeDistanceBetween(currentOrigin, dragPos);
        
        const targetHeading = (totalRotation + 270) % 360;
        const projectedDistance = distance * Math.cos((heading - targetHeading) * Math.PI / 180);
        
        if (projectedDistance > 0) {
          const constrainedPos = window.google.maps.geometry.spherical.computeOffset(
            currentOrigin,
            projectedDistance,
            targetHeading
          );
          downArrow.setPosition(constrainedPos);
        } else {
          downArrow.setPosition(currentOrigin);
          return;
        }
        
        const finalDistance = projectedDistance;
        const panelLengthFeet = parseFloat(arrayManager.formData.pv_module_ns_length);
        const panelLengthMeters = panelLengthFeet * 0.3048;
        const spacingMeters = parseFloat(arrayManager.formData.distance_between_panels_ns) * 0.3048;
        const unitLength = panelLengthMeters + spacingMeters;
        
        const panelCount = Math.max(1, Math.floor(finalDistance / unitLength));
        
        arrayManager.updateArrayColsUp(currentArrayRef.current, panelCount, mapRef.current);
        setColCount(currentArrayRef.current.cols);
        
        // Notify parent of update
        if (onArrayUpdated) {
          onArrayUpdated(currentArrayRef.current);
        }
      });
      
      // Add dragstart/dragend listeners
      upArrow.addListener('dragstart', () => {
        console.log('Started dragging UP arrow');
        upArrow.setOptions({ cursor: 'grabbing' });
      });
      
      downArrow.addListener('dragstart', () => {
        console.log('Started dragging DOWN arrow');
        downArrow.setOptions({ cursor: 'grabbing' });
      });
      
      upArrow.addListener('dragend', (e) => {
        console.log('Stopped dragging UP arrow');
        upArrow.setOptions({ cursor: 'grab' });
        
        // Snap arrow back to rotation line (building + array rotation)
        const arrayRotation = currentArrayRef.current.rotation || 0;
        const totalRotation = buildingRotation + arrayRotation;
        const finalPos = upArrow.getPosition();
        const currentOrigin = new window.google.maps.LatLng(
          currentArrayRef.current.origin.lat,
          currentArrayRef.current.origin.lng
        );
        const distance = window.google.maps.geometry.spherical.computeDistanceBetween(currentOrigin, finalPos);
        const snappedPos = window.google.maps.geometry.spherical.computeOffset(
          currentOrigin,
          distance,
          (totalRotation + 90) % 360
        );
        upArrow.setPosition(snappedPos);
        console.log('Snapped up arrow to perpendicular line');
      });
      
      downArrow.addListener('dragend', (e) => {
        console.log('Stopped dragging DOWN arrow');
        downArrow.setOptions({ cursor: 'grab' });
        
        // Snap arrow back to rotation line (building + array rotation)
        const arrayRotation = currentArrayRef.current.rotation || 0;
        const totalRotation = buildingRotation + arrayRotation;
        const finalPos = downArrow.getPosition();
        const currentOrigin = new window.google.maps.LatLng(
          currentArrayRef.current.origin.lat,
          currentArrayRef.current.origin.lng
        );
        const distance = window.google.maps.geometry.spherical.computeDistanceBetween(currentOrigin, finalPos);
        const snappedPos = window.google.maps.geometry.spherical.computeOffset(
          currentOrigin,
          distance,
          (totalRotation + 270) % 360
        );
        downArrow.setPosition(snappedPos);
        console.log('Snapped down arrow to perpendicular line');
      });
      
      const array = arrayManager.createArray(clickLatLng);
      array.originMarker = originMarker; // Store marker with array
      array.leftArrow = leftArrow;
      array.rightArrow = rightArrow;
      array.upArrow = upArrow;
      array.downArrow = downArrow;
      
      // State is now managed externally - just notify parent
      setDragStartPoint(clickLatLng);
      
      console.log('🎯 Array created with 4 arrows:', {
        leftArrow: !!leftArrow,
        rightArrow: !!rightArrow,
        upArrow: !!upArrow,
        downArrow: !!downArrow
      });

      // Generate initial single panel
      arrayManager.generateArrayPanels(array, mapRef.current);
      
      // Notify parent - this will set currentArrayDraft and move to 'origin' step
      if (onArrayCreated) {
        onArrayCreated(array);
      }
    }
  }, [isActive, arrayManager, mapRef, onArrayCreated]);

  /**
   * Handle mouse move for dragging
   * Using refs to avoid recreating this callback
   */
  const handleMouseMove = useCallback((event) => {
    if (!isActive || !currentArrayRef.current) return;

    const currentLatLng = event.latLng;

    if (creationStateRef.current === 'placing') {
      // Show preview of row direction
      const snappedEnd = snapToAlignment(dragStartPointRef.current, currentLatLng, true);
      
      createPreviewLine(dragStartPointRef.current, snappedEnd, '#00FF00');

      // Calculate panel count
      const count = calculatePanelCount(dragStartPointRef.current, snappedEnd);
      setRowCount(count);

      // Update array
      arrayManager.updateArrayRows(currentArrayRef.current, count, mapRef.current);
    } else if (creationStateRef.current === 'dragging-cols') {
      // Show preview of column direction
      const snappedEnd = snapToAlignment(dragStartPointRef.current, currentLatLng, false);
      
      createPreviewLine(dragStartPointRef.current, snappedEnd, '#0000FF');

      // Calculate panel count
      const count = calculatePanelCount(dragStartPointRef.current, snappedEnd);
      setColCount(count);

      // Update array
      arrayManager.updateArrayCols(currentArrayRef.current, count, mapRef.current);
    }
  }, [
    isActive, 
    arrayManager, 
    mapRef,
    snapToAlignment,
    calculatePanelCount,
    createPreviewLine
  ]);

  /**
   * Handle mouse up to finalize drag
   * Using refs to avoid recreating this callback
   */
  const handleMouseUp = useCallback(() => {
    if (!isActive || !currentArrayRef.current) return;

    // Mouse up handler is no longer needed - workflow is controlled by Next/Back buttons
    // Keeping this for potential future use but removing state changes
    return;
  }, [
    isActive, 
    previewLine,
    onArrayUpdated
  ]);

  /**
   * Set up event listeners and disable map dragging when active
   */
  useEffect(() => {
    console.log('ArrayCreationTool effect running:', { 
      hasMap: !!mapRef.current, 
      isActive,
      creationState 
    });
    
    if (!mapRef.current || !isActive) {
      console.log('Skipping listener setup - map or active not ready');
      return;
    }

    const map = mapRef.current;
    const mapDiv = map.getDiv();
    
    console.log('Setting up array creation listeners...');
    
    // Disable map dragging when in creation mode
    map.setOptions({ 
      draggable: false,
      gestureHandling: 'none', // Disable all gestures
      disableDoubleClickZoom: true
    });
    
    // Change cursor to crosshair
    mapDiv.style.cursor = 'crosshair';
    
    // Add Google Maps API listeners
    const clickListener = map.addListener('click', handleMapClick);
    // TEMPORARILY DISABLED for testing origin marker
    // const mouseMoveListener = map.addListener('mousemove', handleMouseMove);
    // const mouseUpListener = map.addListener('mouseup', handleMouseUp);
    
    // ALSO add DOM-level listeners as backup (these will fire even if Maps API blocks)
    const domClickHandler = (e) => {
      console.log('DOM click detected!', e);
      // Convert DOM click to lat/lng
      const bounds = mapDiv.getBoundingClientRect();
      const x = e.clientX - bounds.left;
      const y = e.clientY - bounds.top;
      
      // Use overlay to convert pixel to lat/lng
      if (overlayRef.current) {
        const projection = overlayRef.current.getProjection();
        if (projection) {
          const point = new window.google.maps.Point(x, y);
          const latLng = projection.fromContainerPixelToLatLng(point);
          console.log('Converted to LatLng:', latLng?.toString());
          
          // Call our handler with a fake event object
          handleMapClick({ latLng });
        }
      }
    };
    
    mapDiv.addEventListener('click', domClickHandler, true); // Use capture phase
    
    console.log('Listeners attached:', { clickListener });

    return () => {
      console.log('Cleaning up array creation listeners');
      
      // Re-enable map dragging when done
      map.setOptions({ 
        draggable: true,
        gestureHandling: 'auto',
        disableDoubleClickZoom: false
      });
      
      // Reset cursor
      mapDiv.style.cursor = '';
      
      // Remove DOM listener
      mapDiv.removeEventListener('click', domClickHandler, true);
      
      // Remove Google Maps listeners
      window.google.maps.event.removeListener(clickListener);
      // window.google.maps.event.removeListener(mouseMoveListener);
      // window.google.maps.event.removeListener(mouseUpListener);
    };
  }, [mapRef, isActive, handleMapClick, handleMouseMove, handleMouseUp]);

  /**
   * No UI rendering - ArrayWorkflowPanel handles all UI
   */
  return null;
};

export default React.memo(ArrayCreationTool);
