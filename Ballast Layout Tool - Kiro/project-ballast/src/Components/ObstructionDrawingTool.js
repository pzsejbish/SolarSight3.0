/**
 * ObstructionDrawingTool.js
 * Handles drawing obstruction polygons on the roof and collecting height data
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Swal from 'sweetalert2';

const ObstructionDrawingTool = ({ 
  mapRef, 
  drawingManagerRef,
  buildingPolygon,
  setbackPolygon,
  isActive,
  onObstructionComplete,
  onFinishObstructions
}) => {
  const [obstructions, setObstructions] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Debug logging
  console.log('🟣🟣🟣 ObstructionDrawingTool RENDER 🟣🟣🟣');
  console.log('isActive:', isActive);
  console.log('mapRef:', mapRef);
  console.log('drawingManagerRef:', drawingManagerRef);
  console.log('buildingPolygon:', buildingPolygon);

  /**
   * Handle completion of an obstruction polygon
   */
  const handleObstructionComplete = useCallback(async (polygon) => {
    console.log('🟣 ========================================');
    console.log('🟣 ObstructionDrawingTool: handleObstructionComplete called!');
    console.log('🟣 Polygon:', polygon);
    console.log('🟣 ========================================');
    
    // Check if polygon is inside the building
    const path = polygon.getPath();
    const pathArray = path.getArray();
    
    // Verify all points are inside building
    const allPointsInside = pathArray.every(point => 
      window.google.maps.geometry.poly.containsLocation(point, buildingPolygon)
    );
    
    if (!allPointsInside) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Obstruction',
        text: 'Obstruction must be completely inside the building polygon',
        confirmButtonText: 'OK'
      });
      polygon.setMap(null);
      
      // Re-enable drawing
      if (drawingManagerRef.current) {
        drawingManagerRef.current.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON);
      }
      return;
    }
    
    // Prompt for obstruction height in inches
    const { value: height } = await Swal.fire({
      title: 'Obstruction Height',
      input: 'number',
      inputLabel: 'Enter obstruction height (inches)',
      inputPlaceholder: 'e.g., 36',
      inputAttributes: {
        min: 0,
        step: 1
      },
      showCancelButton: true,
      confirmButtonText: 'Add Obstruction',
      cancelButtonText: 'Cancel',
      inputValidator: (value) => {
        if (!value || parseFloat(value) <= 0) {
          return 'Please enter a valid height greater than 0';
        }
      }
    });
    
    if (!height) {
      // User cancelled
      polygon.setMap(null);
      
      // Re-enable drawing
      if (drawingManagerRef.current) {
        drawingManagerRef.current.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON);
      }
      return;
    }
    
    // Style the obstruction polygon with strong red "no panels here" visual
    polygon.setOptions({
      fillColor: '#DC143C', // Crimson red
      fillOpacity: 0.5, // More visible
      strokeColor: '#8B0000', // Dark red border
      strokeOpacity: 1,
      strokeWeight: 3, // Thicker border
      editable: false,
      draggable: false,
      zIndex: 30
    });
    
    // Create obstruction object (height is in inches)
    const obstruction = {
      id: Date.now(),
      polygon: polygon,
      path: pathArray.map(p => ({ lat: p.lat(), lng: p.lng() })),
      heightInches: parseFloat(height), // Store in inches
      setbackPolygon: null // Will be generated later
    };
    
    setObstructions(prev => [...prev, obstruction]);
    
    if (onObstructionComplete) {
      onObstructionComplete(obstruction);
    }
    
    // Re-enable drawing for next obstruction
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON);
    }
    
    console.log('Obstruction added:', obstruction);
  }, [buildingPolygon, drawingManagerRef, onObstructionComplete]);

  /**
   * Set up drawing manager for obstructions
   * This effect needs to run whenever the drawing manager is available
   */
  useEffect(() => {
    console.log('🟣 ========================================');
    console.log('🟣 ObstructionDrawingTool useEffect triggered');
    console.log('🟣 isActive:', isActive);
    console.log('🟣 drawingManagerRef:', drawingManagerRef);
    console.log('🟣 drawingManagerRef.current:', drawingManagerRef?.current);
    console.log('🟣 mapRef:', mapRef);
    console.log('🟣 mapRef.current:', mapRef?.current);
    console.log('🟣 ========================================');
    
    if (!isActive) {
      console.log('🟣 Skipping setup - not active');
      return;
    }
    
    if (!drawingManagerRef?.current) {
      console.log('🟣 Skipping setup - no drawing manager, will retry when available');
      // Set up a check to retry when drawing manager becomes available
      const checkInterval = setInterval(() => {
        if (drawingManagerRef?.current) {
          console.log('🟣 Drawing manager now available, clearing interval');
          clearInterval(checkInterval);
          // Force a re-render by updating state
          setIsDrawing(prev => !prev);
        }
      }, 100);
      
      return () => clearInterval(checkInterval);
    }
    
    if (!mapRef?.current) {
      console.log('🟣 Skipping setup - no map');
      return;
    }
    
    console.log('🟣 ========================================');
    console.log('🟣 SETTING UP OBSTRUCTION DRAWING MODE');
    console.log('🟣 ========================================');
    
    // Enable polygon drawing with red "no panels" styling
    drawingManagerRef.current.setOptions({
      drawingControl: false, // Keep control hidden (workflow in sidebar)
      polygonOptions: {
        fillColor: '#DC143C', // Crimson red while drawing
        fillOpacity: 0.4,
        strokeColor: '#8B0000', // Dark red
        strokeOpacity: 0.9,
        strokeWeight: 3,
        editable: false,
        draggable: false,
        zIndex: 30
      }
    });
    
    // Set to polygon drawing mode
    drawingManagerRef.current.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON);
    
    // Add listener for polygon complete
    console.log('🟣 Adding polygoncomplete listener for obstructions');
    const listener = window.google.maps.event.addListener(
      drawingManagerRef.current,
      'polygoncomplete',
      handleObstructionComplete
    );
    console.log('🟣 Obstruction listener added:', listener);
    
    return () => {
      // Cleanup
      console.log('🟣 Cleaning up obstruction drawing mode');
      window.google.maps.event.removeListener(listener);
      if (drawingManagerRef?.current) {
        drawingManagerRef.current.setDrawingMode(null);
        drawingManagerRef.current.setOptions({ drawingControl: false });
      }
    };
  }, [isActive, isDrawing, handleObstructionComplete, drawingManagerRef, mapRef]);

  /**
   * Component doesn't render anything - workflow panel handles UI
   */
  return null;
};

export default ObstructionDrawingTool;
