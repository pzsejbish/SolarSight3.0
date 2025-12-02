import React, { useState, useCallback, useEffect, useRef } from 'react';
import { processSelectionBox, addInteractionListeners } from '../utils/PolygonProcessing';

function PanelObstructionManager({ polygons, setPolygons, selectedPolygonIndex, mapRef, formData, addTextOverlay }) {
  const [mode, setMode] = useState("panels");
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [showHeightPrompt, setShowHeightPrompt] = useState(false);
  const [obstructionHeight, setObstructionHeight] = useState("");
  const [selectedPanel, setSelectedPanel] = useState(null);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);

  const selectionBoxRef = useRef(null);
  const overlayRef = useRef(null);
  const mapDivRef = useRef(null);

  useEffect(() => {
    if (mapRef.current && !overlayRef.current) {
      const overlay = new window.google.maps.OverlayView();
      overlay.draw = function() {};
      overlay.setMap(mapRef.current);
      overlayRef.current = overlay;
      mapDivRef.current = mapRef.current.getDiv();

      // Set up event listeners here
      setupEventListeners();
    }
  }, [mapRef]);

  const setupEventListeners = useCallback(() => {
    if (mapDivRef.current) {
      mapDivRef.current.addEventListener('mousedown', handleMouseDown);
      mapDivRef.current.addEventListener('mousemove', handleMouseMove);
      mapDivRef.current.addEventListener('mouseup', handleMouseUp);
    }
  }, []);

  const cleanupEventListeners = useCallback(() => {
    if (mapDivRef.current) {
      mapDivRef.current.removeEventListener('mousedown', handleMouseDown);
      mapDivRef.current.removeEventListener('mousemove', handleMouseMove);
      mapDivRef.current.removeEventListener('mouseup', handleMouseUp);
    }
  }, []);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Control' && !isCtrlPressed) {
      setIsCtrlPressed(true);
      if (mapRef.current) {
        mapRef.current.setOptions({ draggable: false });
      }
    }
  }, [isCtrlPressed, mapRef]);

  const handleKeyUp = useCallback((event) => {
    if (event.key === 'Control' && isCtrlPressed) {
      setIsCtrlPressed(false);
      if (mapRef.current) {
        mapRef.current.setOptions({ draggable: true });
      }
      if (isDragging) {
        setIsDragging(false);
        setDragStart(null);
        setDragEnd(null);
        if (selectionBoxRef.current && mapDivRef.current) {
          mapDivRef.current.removeChild(selectionBoxRef.current);
          selectionBoxRef.current = null;
        }
      }
    }
  }, [isCtrlPressed, isDragging, mapRef]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      cleanupEventListeners();
    };
  }, [handleKeyDown, handleKeyUp, cleanupEventListeners]);

  const getMousePoint = useCallback((e) => {
    if (!mapDivRef.current) return null;
    const rect = mapDivRef.current.getBoundingClientRect();
    return new window.google.maps.Point(
      e.clientX - rect.left,
      e.clientY - rect.top
    );
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (isCtrlPressed && mapRef.current) {
      e.preventDefault();
      setIsDragging(true);
      const point = getMousePoint(e);
      if (!point) return;
      setDragStart(point);

      if (!selectionBoxRef.current && mapDivRef.current) {
        const div = document.createElement('div');
        div.style.border = '2px solid red';
        div.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
        div.style.position = 'absolute';
        mapDivRef.current.appendChild(div);
        selectionBoxRef.current = div;
      }
      if (selectionBoxRef.current) {
        selectionBoxRef.current.style.left = point.x + 'px';
        selectionBoxRef.current.style.top = point.y + 'px';
        selectionBoxRef.current.style.width = '0px';
        selectionBoxRef.current.style.height = '0px';
      }
    }
  }, [isCtrlPressed, getMousePoint, mapRef]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging && isCtrlPressed) {
      e.preventDefault();
      const point = getMousePoint(e);
      if (!point || !dragStart || !selectionBoxRef.current) return;
      setDragEnd(point);

      const left = Math.min(dragStart.x, point.x);
      const top = Math.min(dragStart.y, point.y);
      const width = Math.abs(dragStart.x - point.x);
      const height = Math.abs(dragStart.y - point.y);

      selectionBoxRef.current.style.left = left + 'px';
      selectionBoxRef.current.style.top = top + 'px';
      selectionBoxRef.current.style.width = width + 'px';
      selectionBoxRef.current.style.height = height + 'px';
    }
  }, [isDragging, isCtrlPressed, dragStart, getMousePoint]);

  const handleMouseUp = useCallback((e) => {
    if (isDragging) {
      e.preventDefault();
      setIsDragging(false);

      if (dragStart && dragEnd && overlayRef.current && mapRef.current) {
        const projection = overlayRef.current.getProjection();
        const sw = projection.fromContainerPixelToLatLng(new window.google.maps.Point(
          Math.min(dragStart.x, dragEnd.x),
          Math.max(dragStart.y, dragEnd.y)
        ));
        const ne = projection.fromContainerPixelToLatLng(new window.google.maps.Point(
          Math.max(dragStart.x, dragEnd.x),
          Math.min(dragStart.y, dragEnd.y)
        ));
        const bounds = new window.google.maps.LatLngBounds(sw, ne);

        processSelectionBox(bounds, polygons[selectedPolygonIndex], mode, setPolygons, addTextOverlay);
      }

      setDragStart(null);
      setDragEnd(null);

      if (selectionBoxRef.current && mapDivRef.current) {
        mapDivRef.current.removeChild(selectionBoxRef.current);
        selectionBoxRef.current = null;
      }
    }
  }, [isDragging, dragStart, dragEnd, mode, polygons, selectedPolygonIndex, setPolygons, addTextOverlay, mapRef]);


  useEffect(() => {
    if (mapDivRef.current) {
      mapDivRef.current.addEventListener('mousedown', handleMouseDown);
      mapDivRef.current.addEventListener('mousemove', handleMouseMove);
      mapDivRef.current.addEventListener('mouseup', handleMouseUp);

      return () => {
        mapDivRef.current.removeEventListener('mousedown', handleMouseDown);
        mapDivRef.current.removeEventListener('mousemove', handleMouseMove);
        mapDivRef.current.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [handleMouseDown, handleMouseMove, handleMouseUp]);



  const handlePanelClick = useCallback((panel, clickedPolygonIndex) => {
    setPolygons(prevPolygons => {
      const updatedPolygons = [...prevPolygons];
      const selectedPolygon = updatedPolygons[selectedPolygonIndex];
      
      if (!selectedPolygon.panelPolygons || !selectedPolygon.panelPolygons.grid) {
        console.error("Grid is not defined for the selected polygon.");
        return updatedPolygons;
      }
  
      const grid = selectedPolygon.panelPolygons.grid;
      
      // Check if we're using an east/west system
      const isEastWestSystem = formData.sun_ballast_system === "east-west-system";
  
      // For east/west system, handle panel pairs
      if (isEastWestSystem && panel.pairIndex !== undefined) {
        // Find both panels in the pair
        const pairIndex = panel.pairIndex;
        const eastRow = Math.floor(pairIndex / grid[0].length) * 2;
        const westRow = eastRow + 1;
        const pairCol = pairIndex % grid[0].length;
        
        const eastPanel = grid[eastRow] && grid[eastRow][pairCol];
        const westPanel = grid[westRow] && grid[westRow][pairCol];
        
        // Only proceed if both panels exist and are inside setback
        if (eastPanel && westPanel && eastPanel.isInsideSetback && westPanel.isInsideSetback) {
          const isSelected = eastPanel.state === "selected"; // Both should have same state
          
          if (mode === "panels") {
            // Update both panels
            // East panel
            eastPanel.state = isSelected ? "normal" : "selected";
            eastPanel.setOptions({
              fillColor: isSelected ? "#0000FF" : "#00FF00",
              fillOpacity: isSelected ? 0.25 : 0.5,
              zIndex: isSelected ? 1000 : 1001,
            });
            
            // West panel
            westPanel.state = isSelected ? "normal" : "selected";
            westPanel.setOptions({
              fillColor: isSelected ? "#000080" : "#00FF00", // Darker blue for west panels
              fillOpacity: isSelected ? 0.30 : 0.5,
              zIndex: isSelected ? 1000 : 1001,
            });
            
            // Make sure grid references are correct
            if (grid[eastRow][pairCol] !== eastPanel) {
              grid[eastRow][pairCol] = eastPanel;
            }
            if (grid[westRow][pairCol] !== westPanel) {
              grid[westRow][pairCol] = westPanel;
            }
          } else if (mode === "obstructions") {
            // For obstructions, we need to mark both panels
            // We'll use the height prompt for both
            
            // East panel
            eastPanel.state = "obstructed";
            eastPanel.setOptions({
              fillColor: "#FF0000",
              fillOpacity: 0.5,
              zIndex: 1002,
            });
            
            // West panel
            westPanel.state = "obstructed";
            westPanel.setOptions({
              fillColor: "#FF0000",
              fillOpacity: 0.5,
              zIndex: 1002,
            });
            
            // Update grid references
            if (grid[eastRow][pairCol] !== eastPanel) {
              grid[eastRow][pairCol] = eastPanel;
            }
            if (grid[westRow][pairCol] !== westPanel) {
              grid[westRow][pairCol] = westPanel;
            }
            
            // Store both panels for obstruction height
            setSelectedPanel({
              eastPanel,
              westPanel,
              isPair: true
            });
            setShowHeightPrompt(true);
          }
        }
      } else {
        // Original code for north/south single panel updates
        selectedPolygon.panelPolygons.panelPolygons = selectedPolygon.panelPolygons.panelPolygons.map(p => {
          if (p === panel) {
            const isSelected = p.state === "selected";
            const row = p.index?.row;
            const col = p.index?.col;
  
            if (row === undefined || col === undefined) {
              console.error("Panel index is not properly defined.");
              return p;
            }
  
            if (mode === "panels") {
              // Update the state on the panel object
              p.state = isSelected ? "normal" : "selected";
              p.setOptions({
                fillColor: isSelected ? "#0000FF" : "#00FF00",
                fillOpacity: isSelected ? 0.25 : 0.5,
                zIndex: isSelected ? 1000 : 1001,
              });
              
              // IMPORTANT: Make sure the grid reference is the same panel object
              // Don't replace it with a new object
              if (grid[row][col] !== p) {
                console.warn("Grid panel reference mismatch at row:", row, "col:", col);
                // Update the reference so they match, but preserve all properties
                grid[row][col] = p;
              }
            } else if (mode === "obstructions") {
              p.state = "obstructed";
              p.setOptions({
                fillColor: "#FF0000",
                fillOpacity: 0.5,
                zIndex: 1002,
              });
              
              // Make sure grid points to the same panel object
              if (grid[row][col] !== p) {
                grid[row][col] = p;
              }
              
              setSelectedPanel(p);
              setShowHeightPrompt(true);
            }
          }
          return p;
        });
      }
  
      return updatedPolygons;
    });
  }, [mode, setPolygons, selectedPolygonIndex, formData]);


// Updated handleHeightSubmit function for PanelObstructionManager.js
// This allows applying obstruction heights to panel pairs in east/west systems

  const handleHeightSubmit = useCallback(() => {
    if (selectedPanel) {
      // Check if this is a panel pair (for east/west system)
      if (selectedPanel.isPair && selectedPanel.eastPanel && selectedPanel.westPanel) {
        // Apply obstruction height to both panels in the pair
        addTextOverlay(selectedPanel.eastPanel, obstructionHeight);
        selectedPanel.eastPanel.obstructionHeight = obstructionHeight;
        
        addTextOverlay(selectedPanel.westPanel, obstructionHeight);
        selectedPanel.westPanel.obstructionHeight = obstructionHeight;
      } else {
        // Original single panel handling
        addTextOverlay(selectedPanel, obstructionHeight);
        selectedPanel.obstructionHeight = obstructionHeight;
      }
    }
    setShowHeightPrompt(false);
    setObstructionHeight("");
    setSelectedPanel(null);
  }, [obstructionHeight, selectedPanel, addTextOverlay]);

  useEffect(() => {
    polygons.forEach((polygon, polygonIndex) => {
      if (polygon.panelPolygons && Array.isArray(polygon.panelPolygons.panelPolygons)) {
        polygon.panelPolygons.panelPolygons.forEach(panel => {
          if (panel && typeof panel.addListener === 'function') {
            // Clear all existing listeners
            window.google.maps.event.clearInstanceListeners(panel);
            
            // Add mouseover and mouseout listeners to all panels
            panel.addListener('mouseover', () => {
              panel.setOptions({ fillColor: "#FFFF00" });
            });
            panel.addListener('mouseout', () => {
              panel.setOptions({ 
                fillColor: panel.state === "selected" ? "#00FF00" : 
                           panel.state === "obstructed" ? "#FF0000" : "#0000FF" 
              });
            });
            
            // Only add click listener to panels in the selected polygon
            if (polygonIndex === selectedPolygonIndex) {
              panel.addListener('click', () => handlePanelClick(panel, polygonIndex));
            }
          }
        });
      }
    });
  }, [polygons, selectedPolygonIndex, handlePanelClick]);

  return (
    <>
      <button 
        onClick={() => setMode(mode === "panels" ? "obstructions" : "panels")}
        style={{
          width: '100%',
          padding: '10px',
          backgroundColor: 'white',
          border: '1px solid #ccc',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        {mode === "panels" ? "Add Panels" : "Add Obstructions"}
      </button>
      {showHeightPrompt && (
        <div className="height-prompt" style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '5px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          zIndex: 10001
        }}>
          <h3>Set obstruction height</h3>
          <input 
            type="number" 
            value={obstructionHeight} 
            onChange={(e) => setObstructionHeight(e.target.value)}
            placeholder="Enter height in feet"
            style={{width: '100%', marginBottom: '10px', padding: '5px'}}
          />
          <button onClick={handleHeightSubmit} style={{width: '100%', padding: '5px'}}>Submit</button>
        </div>
      )}
    </>
  );
}

export default React.memo(PanelObstructionManager);