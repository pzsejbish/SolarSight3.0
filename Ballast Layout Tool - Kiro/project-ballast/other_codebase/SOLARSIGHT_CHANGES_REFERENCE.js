/**
 * SOLARSIGHT_CHANGES_REFERENCE.js
 * 
 * This file shows the key changes needed in SolarSight.js
 * Copy these sections into your existing SolarSight.js file
 */

// ============================================================================
// 1. ADD THESE IMPORTS AT THE TOP
// ============================================================================

import { ArrayManager } from '../utils/ArrayManager';
import { ArrayToGridReconciler } from '../utils/ArrayToGridReconciler';
import ArrayCreationTool from './ArrayCreationTool';
import ArrayControlPanel from './ArrayControlPanel';


// ============================================================================
// 2. ADD THESE STATE VARIABLES (after existing useState declarations)
// ============================================================================

// Array-based layout state
const [arrayManager, setArrayManager] = useState(null);
const [arrays, setArrays] = useState([]);
const [selectedArrayId, setSelectedArrayId] = useState(null);
const [isArrayCreationMode, setIsArrayCreationMode] = useState(false);
const [useArrayMode, setUseArrayMode] = useState(true); // Toggle between old/new system


// ============================================================================
// 3. ADD THIS EFFECT TO INITIALIZE ARRAYMANAGER
// ============================================================================

// Initialize ArrayManager when polygon is selected
useEffect(() => {
  if (selectedPolygonIndex !== null && polygons[selectedPolygonIndex]) {
    const polygon = polygons[selectedPolygonIndex];
    
    if (!polygon.setbackPolygon || !polygon.originalPolygon) {
      console.warn('Polygon missing required polygons for ArrayManager');
      return;
    }
    
    const manager = new ArrayManager(
      formData,
      polygon.setbackPolygon,
      polygon.originalPolygon,
      polygon.totalRotationAngle || 0
    );
    
    setArrayManager(manager);
    setArrays([]);
    setSelectedArrayId(null);
    setIsArrayCreationMode(false);
    
    console.log('ArrayManager initialized for polygon', selectedPolygonIndex);
  }
}, [selectedPolygonIndex, polygons, formData]);


// ============================================================================
// 4. ADD THESE CALLBACK HANDLERS
// ============================================================================

const handleArrayCreated = useCallback((array) => {
  console.log('Array created:', array);
  setArrays(prev => [...prev]);
}, []);

const handleArrayUpdated = useCallback((array) => {
  console.log('Array updated:', array);
  setArrays(prev => [...prev]);
}, []);

const handleSelectArray = useCallback((arrayId) => {
  if (arrayManager) {
    const id = arrayId ? parseInt(arrayId) : null;
    arrayManager.selectArray(id);
    setSelectedArrayId(id);
    setArrays(arrayManager.getAllArrays());
  }
}, [arrayManager]);

const handleRotateArray = useCallback((arrayId, rotation) => {
  if (arrayManager && mapRef.current) {
    const array = arrayManager.getArray(arrayId);
    if (array) {
      arrayManager.updateArrayRotation(array, rotation, mapRef.current);
      setArrays(arrayManager.getAllArrays());
    }
  }
}, [arrayManager, mapRef]);

const handleDeleteArray = useCallback((arrayId) => {
  if (arrayManager) {
    arrayManager.deleteArray(arrayId);
    setArrays(arrayManager.getAllArrays());
    setSelectedArrayId(null);
  }
}, [arrayManager]);

const handleToggleCreationMode = useCallback(() => {
  setIsArrayCreationMode(prev => !prev);
  setSelectedArrayId(null);
}, []);


// ============================================================================
// 5. REPLACE handleSaveLayout WITH THIS VERSION
// ============================================================================

const handleSaveLayout = useCallback(() => {    
  const layoutData = polygons.map((polygon, index) => {
    console.log(`Processing polygon ${index}:`, polygon);
    
    let layout, building_width, building_length, building_area;
    
    // NEW: Check if using array mode
    if (useArrayMode && arrayManager && arrayManager.getAllArrays().length > 0) {
      console.log('Using array mode - reconciling arrays to grid');
      
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
      
      console.log('Reconciled layout:', {
        rows: metadata.rows,
        cols: metadata.cols,
        totalPanels: metadata.totalPanels,
        selectedPanels: metadata.selectedPanels
      });
    } else {
      // OLD: Use existing panel selection method
      console.log('Using click mode - getting selected panel data');
      const data = getSelectedPanelData(polygon, formData);
      layout = data.layout;
      building_width = data.building_width;
      building_length = data.building_length;
      building_area = data.building_area;
    }

    // Get all vertices of the polygon
    const vertices = polygon.originalPolygon.getPath().getArray().map(point => ({
      lat: point.lat(),
      lng: point.lng()
    }));

    // Simplify layout for API
    const simplifiedLayout = layout.map(row => 
      row.map(cell => {
        if (typeof cell === 'object' && cell.isObstructed) {
          return cell.height;
        }
        return cell;
      })
    );

    // Get the original rotation value
    let buildingRotation = polygon.rotationAngle || 0;
  
    // For east-west systems, add 90 degrees to the rotation
    if (formData.sun_ballast_system === "east-west-system") {
      buildingRotation = buildingRotation + 90;
    }

    // Build polygon data
    const polygonData = {
      polygon_id: index,
      layout: simplifiedLayout,
      building_width,
      building_length,
      building_area,
      building_rotation: buildingRotation,
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
      polygonData.ridge_gap = formData.ridge_gap;
      polygonData.valley_gap = formData.valley_gap;
      
      const roofClearanceInches = formData.roof_clearance || "3.2";
      polygonData.roof_clearance = (parseFloat(roofClearanceInches) / 12).toString();
      
      if (formData.valley_gap) {
        polygonData.distance_between_panels_ns = formData.valley_gap;
      }
      
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
    building_width: layoutData.length > 0 ? layoutData[0].building_width : null,
    building_length: layoutData.length > 0 ? layoutData[0].building_length : null,
    building_area: layoutData.length > 0 ? layoutData[0].building_area : null,
    building_rotation: layoutData.length > 0 ? layoutData[0].building_rotation : 0
  };
  
  if (formData.sun_ballast_system === "east-west-system") {
    const temp = submissionData.panel_width;
    submissionData.panel_width = submissionData.panel_length;
    submissionData.panel_length = temp;
    
    if (submissionData.roof_clearance) {
      submissionData.roof_clearance = (parseFloat(submissionData.roof_clearance) / 12).toString();
    }
  }

  delete submissionData.latLng;

  const numericFields = [
    'allowable_pv_dead_load', 'avg_roof_pitch', 'distance_between_panels_ew', 
    'distance_between_panels_ns', 'ground_snow_load', 'parapet_height', 
    'pv_module_weight', 'roof_height', 'setback_distance', 'tilt_angle', 
    'wind_speed', 'ridge_gap', 'valley_gap'
  ];

  numericFields.forEach(field => {
    if (submissionData[field] != null && submissionData[field] !== '') {
      submissionData[field] = parseFloat(submissionData[field]);
    } else {
      submissionData[field] = 'non value';
    }
  });
  
  console.log('Full submission data:', submissionData);
  sendLayoutToAPI(submissionData);
}, [polygons, formData, arrayManager, useArrayMode, sendLayoutToAPI]);


// ============================================================================
// 6. UPDATE THE JSX RETURN STATEMENT
// ============================================================================

// Replace the left sidebar div with this:

return (
  <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
    {/* Tools Column */}
    <div style={{ 
      width: '250px', 
      backgroundColor: 'whitesmoke', 
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '15px',
      zIndex: 1000,
      overflowY: 'auto',
      maxHeight: '100vh'
    }}>
      {/* Mode Toggle */}
      <div style={{
        padding: '12px',
        backgroundColor: useArrayMode ? '#e8f5e9' : '#fff3e0',
        borderRadius: '5px',
        border: `2px solid ${useArrayMode ? '#4CAF50' : '#FF9800'}`,
        fontSize: '12px'
      }}>
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          cursor: 'pointer',
          fontWeight: 'bold'
        }}>
          <input
            type="checkbox"
            checked={useArrayMode}
            onChange={(e) => {
              setUseArrayMode(e.target.checked);
              if (e.target.checked) {
                setIsArrayCreationMode(false);
              }
            }}
            style={{ marginRight: '8px', width: '16px', height: '16px' }}
          />
          <span>
            {useArrayMode ? '✓ Array Mode (New)' : 'Click Mode (Legacy)'}
          </span>
        </label>
        <div style={{ 
          marginTop: '5px', 
          fontSize: '10px', 
          color: '#666',
          fontStyle: 'italic'
        }}>
          {useArrayMode 
            ? 'Click & drag to create panel arrays' 
            : 'Click individual panels to select'}
        </div>
      </div>

      {/* Polygon Selector */}
      <div>
        <label style={{ 
          display: 'block', 
          marginBottom: '5px', 
          fontSize: '12px',
          fontWeight: 'bold',
          color: '#666'
        }}>
          Building Outline
        </label>
        <select 
          value={selectedPolygonIndex !== null ? selectedPolygonIndex : ''}
          onChange={(e) => setSelectedPolygonIndex(Number(e.target.value))}
          style={{
            width: '100%',
            padding: '10px',
            border: '3px solid #00BFFF',
            borderRadius: '5px',
            fontSize: '14px'
          }}
        >
          <option value="" disabled>Select a polygon</option>
          {polygons.map((polygon, index) => (
            <option key={index} value={index}>
              Polygon {polygon.polygonId !== undefined ? polygon.polygonId + 1 : index + 1}
            </option>
          ))}
        </select>
      </div>

      {/* Array Controls (New Mode) */}
      {useArrayMode && arrayManager && (
        <ArrayControlPanel
          arrays={arrays}
          selectedArrayId={selectedArrayId}
          onSelectArray={handleSelectArray}
          onRotateArray={handleRotateArray}
          onDeleteArray={handleDeleteArray}
          onToggleCreationMode={handleToggleCreationMode}
          isCreationMode={isArrayCreationMode}
        />
      )}

      {/* Old Controls (Click Mode) */}
      {!useArrayMode && (
        <>
          <button 
            onClick={() => {
              if (selectedPolygonIndex !== null && polygons[selectedPolygonIndex]) {
                toggleOrientation();
              }
            }}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: 'white',
              border: '1px solid #ccc',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Rotate Panels
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
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridTemplateRows: 'repeat(3, 1fr)',
            gap: '5px',
            width: '100%',
            aspectRatio: '1',
            transform: `rotate(${selectedPolygonIndex !== null ? getDPadRotation() : 0}deg)`,
          }}>
            <div></div>
            <button onClick={() => shiftGrid('up', 0.1)} style={dPadButtonStyle}>↑</button>
            <div></div>
            <button onClick={() => shiftGrid('left', 0.1)} style={dPadButtonStyle}>←</button>
            <div style={{ backgroundColor: 'whitesmoke', border: '1px solid #ccc' }}></div>
            <button onClick={() => shiftGrid('right', 0.1)} style={dPadButtonStyle}>→</button>
            <div></div>
            <button onClick={() => shiftGrid('down', 0.1)} style={dPadButtonStyle}>↓</button>
            <div></div>
          </div>
        </>
      )}

      {/* 3D Solar Panel Model */}
      <div style={{ width: '100%', height: '200px', border: '1px solid #ccc' }}>
        <SolarPanelScene 
          totalRotationAngle={
            selectedPolygonIndex !== null && polygons[selectedPolygonIndex]
              ? polygons[selectedPolygonIndex].totalRotationAngle
              : 0
          }
          tiltAngleDegrees={parseFloat(formData.tilt_angle) || 30}
          isClockwise={
            selectedPolygonIndex !== null && polygons[selectedPolygonIndex]
              ? polygons[selectedPolygonIndex].isClockwise
              : true
          }
        />
      </div>

      {/* Submit Button */}
      <button 
        onClick={handleSaveLayout}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          marginTop: 'auto',
          fontWeight: 'bold',
          fontSize: '14px'
        }}
      >
        Submit Layout
      </button>
    </div>

    {/* Map Area */}
    <div style={{ flex: 1, position: 'relative' }}>
      <SolarSightMap
        isLoaded={isGoogleMapsLoaded}
        mapCenter={mapCenter}
        zoom={zoom || 20}
        options={{mapTypeId: 'satellite'}}
        drawingManagerOptions={drawingManagerOptions}
        onMapLoad={handleMapLoad}
        onMapUnmount={handleMapUnmount}
        onPolygonComplete={handlePolygonComplete}
        setbackPolygon={setbackPolygon}
        panelPolygons={panelPolygons}
        polygons={polygons}
        selectedPolygonIndex={selectedPolygonIndex}
      />
      
      {/* Array Creation Tool Overlay */}
      {useArrayMode && arrayManager && (
        <ArrayCreationTool
          mapRef={mapRef}
          arrayManager={arrayManager}
          isActive={isArrayCreationMode}
          onArrayCreated={handleArrayCreated}
          onArrayUpdated={handleArrayUpdated}
          buildingRotation={
            selectedPolygonIndex !== null && polygons[selectedPolygonIndex]
              ? polygons[selectedPolygonIndex].totalRotationAngle
              : 0
          }
        />
      )}
    </div>
  </div>
);


// ============================================================================
// NOTES:
// ============================================================================
// 
// 1. Keep all your existing functions (toggleOrientation, shiftGrid, etc.)
// 2. Keep all your existing effects for polygon processing
// 3. The new system runs in parallel with the old system
// 4. Users can toggle between modes with the checkbox
// 5. Test thoroughly before removing old code
//
// ============================================================================
