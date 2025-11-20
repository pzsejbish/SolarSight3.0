# Array-Based Panel Layout Integration Guide

## Overview
This guide explains how to integrate the new array-based panel layout system into your existing SolarSight component.

## What Changed

### Old System
- Generated a massive grid of panels covering the entire building
- Users clicked individual panels to select them
- Tedious for large arrays
- Prone to mistakes

### New System
- Users click-and-drag to create arrays of panels
- Each array can be positioned, rotated, and manipulated independently
- At submission time, arrays are reconciled back into the "giant grid" format for Excel
- Much faster and more intuitive

## Architecture

### New Files Created

1. **`src/utils/ArrayManager.js`**
   - Manages array creation, manipulation, and rendering
   - Handles panel generation for each array
   - Tracks array state (creating, active, selected)

2. **`src/utils/ArrayToGridReconciler.js`**
   - Converts arrays back to giant grid format
   - Aligns arrays to building rotation
   - Generates API-compatible layout data

3. **`src/Components/ArrayCreationTool.js`**
   - Interactive click-and-drag UI for creating arrays
   - Handles row/column sizing
   - Shows visual feedback during creation

4. **`src/Components/ArrayControlPanel.js`**
   - UI controls for managing arrays
   - Rotation controls
   - Array selection and deletion

## Integration Steps

### Step 1: Import New Components

Add these imports to `SolarSight.js`:

```javascript
import { ArrayManager } from '../utils/ArrayManager';
import { ArrayToGridReconciler } from '../utils/ArrayToGridReconciler';
import ArrayCreationTool from './ArrayCreationTool';
import ArrayControlPanel from './ArrayControlPanel';
```

### Step 2: Add State Management

Add these state variables to your SolarSightComponent:

```javascript
// Array-based layout state
const [arrayManager, setArrayManager] = useState(null);
const [arrays, setArrays] = useState([]);
const [selectedArrayId, setSelectedArrayId] = useState(null);
const [isArrayCreationMode, setIsArrayCreationMode] = useState(false);
const [useArrayMode, setUseArrayMode] = useState(true); // Toggle between old/new system
```

### Step 3: Initialize ArrayManager

Add this effect to initialize the ArrayManager when a polygon is created:

```javascript
useEffect(() => {
  if (selectedPolygonIndex !== null && polygons[selectedPolygonIndex]) {
    const polygon = polygons[selectedPolygonIndex];
    
    const manager = new ArrayManager(
      formData,
      polygon.setbackPolygon,
      polygon.originalPolygon,
      polygon.totalRotationAngle
    );
    
    setArrayManager(manager);
    setArrays([]);
  }
}, [selectedPolygonIndex, polygons, formData]);
```

### Step 4: Add Array Event Handlers

```javascript
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
    arrayManager.selectArray(arrayId);
    setSelectedArrayId(arrayId);
    setArrays(prev => [...prev]); // Force re-render
  }
}, [arrayManager]);

const handleRotateArray = useCallback((arrayId, rotation) => {
  if (arrayManager && mapRef.current) {
    const array = arrayManager.getArray(arrayId);
    if (array) {
      arrayManager.updateArrayRotation(array, rotation, mapRef.current);
      setArrays(prev => [...prev]);
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
```

### Step 5: Update handleSaveLayout

Replace the existing `handleSaveLayout` function with this version that reconciles arrays:

```javascript
const handleSaveLayout = useCallback(() => {
  const layoutData = polygons.map((polygon, index) => {
    console.log(`Processing polygon ${index}`);
    
    let layout, building_width, building_length, building_area;
    
    if (useArrayMode && arrayManager) {
      // NEW: Reconcile arrays to grid
      const reconciler = new ArrayToGridReconciler(
        formData,
        polygon.originalPolygon,
        polygon.setbackPolygon,
        polygon.totalRotationAngle
      );
      
      const { layout: reconciledLayout, metadata } = reconciler.reconcile(
        arrayManager.getAllArrays()
      );
      
      layout = reconciledLayout;
      building_width = polygon.buildingWidthFeet;
      building_length = polygon.buildingLengthFeet;
      building_area = polygon.buildingAreaFeet;
      
      console.log('Reconciled layout:', {
        rows: metadata.rows,
        cols: metadata.cols,
        totalPanels: metadata.totalPanels,
        selectedPanels: metadata.selectedPanels
      });
    } else {
      // OLD: Use existing panel selection method
      const data = getSelectedPanelData(polygon, formData);
      layout = data.layout;
      building_width = data.building_width;
      building_length = data.building_length;
      building_area = data.building_area;
    }

    // Get vertices
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

    return {
      polygon_id: index,
      layout: simplifiedLayout,
      building_width,
      building_length,
      building_area,
      building_rotation: polygon.rotationAngle || 0,
      orientation: polygon.orientation || 0,
      is_landscape: polygon.isLandscape,
      panel_width: parseFloat(formData.pv_module_ew_width),
      panel_length: parseFloat(formData.pv_module_ns_length),
      lat: polygon.originalPolygon.getPath().getAt(0).lat(),
      lng: polygon.originalPolygon.getPath().getAt(0).lng(),
      vertices: vertices,
      is_clockwise: polygon.isClockwise,
    };
  });

  const submissionData = {
    ...formData,
    lat: formData.latLng.lat,
    lng: formData.latLng.lng,
    panel_layout: layoutData,
    // ... rest of your submission data
  };

  console.log('Full submission data:', submissionData);
  sendLayoutToAPI(submissionData);
}, [polygons, formData, arrayManager, useArrayMode, sendLayoutToAPI]);
```

### Step 6: Update JSX Layout

Replace the left sidebar in your SolarSight component with this:

```javascript
<div style={{ 
  width: '250px', 
  backgroundColor: 'whitesmoke', 
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
  zIndex: 1000,
  overflowY: 'auto',
  maxHeight: '100vh'
}}>
  {/* Mode Toggle */}
  <div style={{
    padding: '10px',
    backgroundColor: useArrayMode ? '#e8f5e9' : '#fff3e0',
    borderRadius: '5px',
    fontSize: '12px'
  }}>
    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={useArrayMode}
        onChange={(e) => setUseArrayMode(e.target.checked)}
        style={{ marginRight: '8px' }}
      />
      <span style={{ fontWeight: 'bold' }}>
        {useArrayMode ? 'Array Mode (New)' : 'Click Mode (Old)'}
      </span>
    </label>
  </div>

  {/* Polygon Selector */}
  <select 
    value={selectedPolygonIndex !== null ? selectedPolygonIndex : ''}
    onChange={(e) => setSelectedPolygonIndex(Number(e.target.value))}
    style={{
      width: '100%',
      padding: '10px',
      border: '3px solid #00BFFF',
      borderRadius: '5px',
    }}
  >
    <option value="" disabled>Select a polygon</option>
    {polygons.map((polygon, index) => (
      <option key={index} value={index}>
        Polygon {polygon.polygonId !== undefined ? polygon.polygonId + 1 : index + 1}
      </option>
    ))}
  </select>

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

  {/* 3D Preview */}
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
      padding: '10px',
      backgroundColor: '#4CAF50',
      color: 'white',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
      marginTop: 'auto'
    }}
  >
    Submit Layout
  </button>
</div>
```

### Step 7: Add ArrayCreationTool to Map

Add this component inside your map container (after SolarSightMap):

```javascript
{/* Array Creation Tool */}
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
```

## Testing the Integration

### Test Sequence

1. **Draw a building polygon**
   - Should work as before
   - Setback polygon generates automatically

2. **Enable Array Mode**
   - Toggle should show "Array Mode (New)"
   - Click "Create New Array" button

3. **Create an array**
   - Click on map within setback
   - Drag horizontally to set row length
   - Release and drag vertically for columns
   - Release to finalize

4. **Manipulate array**
   - Select array from dropdown
   - Change rotation angle
   - Use quick rotate buttons
   - Drag array origin to move

5. **Submit layout**
   - Click "Submit Layout"
   - Check console for reconciled grid
   - Verify API payload format

## Backward Compatibility

The integration maintains full backward compatibility:

- Toggle `useArrayMode` to switch between old and new systems
- Old click-based selection still works
- Existing saved layouts can still be loaded
- API format remains unchanged

## Next Steps

After basic integration:

1. Add array movement by dragging origin point
2. Add obstruction marking for array panels
3. Add array duplication/copy feature
4. Add keyboard shortcuts
5. Add undo/redo functionality

## Troubleshooting

### Arrays not appearing
- Check that ArrayManager is initialized
- Verify setback and building polygons exist
- Check console for errors

### Rotation not working
- Verify buildingRotation is passed correctly
- Check that map reference is valid
- Ensure array is selected

### Reconciliation issues
- Check grid dimensions in console
- Verify panel dimensions match formData
- Test with simple single array first

## Questions?

This is a significant architectural change. Test incrementally and let me know if you hit any issues!
