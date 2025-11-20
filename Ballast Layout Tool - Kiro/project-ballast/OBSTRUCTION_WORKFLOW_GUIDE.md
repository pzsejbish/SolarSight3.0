# Obstruction Workflow Implementation Guide

## Overview
Added a new workflow step between building polygon drawing and array creation that allows users to draw obstruction polygons (vents, skylights, etc.) on the roof. Panels will automatically avoid these obstructions when creating arrays.

## Workflow States

The application now has three workflow states:

1. **Building** - Draw the building outline polygon
2. **Obstructions** - Draw obstruction polygons within the building
3. **Arrays** - Create panel arrays with click-and-drag

## New Features

### 1. Obstruction Drawing Tool (`ObstructionDrawingTool.js`)
- Activates automatically after building polygon is complete
- Allows drawing multiple obstruction polygons
- Prompts for obstruction height after each polygon
- Shows count of obstructions drawn
- "Done with Obstructions" button to proceed to array creation

### 2. Obstruction Setback Generation (`ObstructionSetback.js`)
- Generates setback polygons around obstructions (expanding outward)
- Default 2ft setback (can be calculated from height later)
- Utility functions:
  - `generateObstructionSetback()` - Creates outward-expanding setback
  - `generateObstructionSetbacks()` - Processes all obstructions
  - `isPointInObstructionSetback()` - Checks if point is in any obstruction

### 3. ArrayManager Obstruction Support
- Updated constructor to accept obstructions array
- `setObstructions()` method to update obstructions
- Panel visibility now checks:
  - Inside fire setback polygon ✓
  - Intersects building polygon ✓
  - NOT inside any obstruction setback ✓ (NEW)

### 4. Visual Indicators
- Obstruction polygons: Red fill with 30% opacity
- Obstruction setbacks: Light red fill with 20% opacity
- Panels automatically hidden in obstruction setback areas

## User Workflow

1. **Draw Building**
   - Click points to draw building outline
   - Complete polygon
   - Fire setback (orange) appears automatically

2. **Draw Obstructions** (NEW)
   - Obstruction drawing tool appears
   - Click to draw obstruction polygons (vents, skylights, etc.)
   - Enter height for each obstruction
   - Click "Done with Obstructions" when finished

3. **Create Arrays**
   - Click inside setback area to place array origin
   - Drag arrows to create rows and columns
   - Panels automatically avoid obstruction setbacks
   - Finalize and create additional arrays as needed

## Technical Details

### Data Structure

```javascript
// Obstruction object
{
  id: timestamp,
  polygon: GoogleMapsPolygon,
  path: [{lat, lng}, ...],
  height: number (feet),
  setbackPath: [{lat, lng}, ...],
  setbackDistanceFeet: number
}
```

### State Management

```javascript
// New state variables in SolarSight.js
const [workflowState, setWorkflowState] = useState('building');
const [obstructions, setObstructions] = useState([]);
const [obstructionSetbackPolygons, setObstructionSetbackPolygons] = useState([]);
```

### Polygon Data

Each building polygon now includes:
```javascript
{
  ...existingFields,
  obstructions: [] // Array of obstruction objects with setbacks
}
```

## Future Enhancements

1. **Height-Based Setbacks**
   - Calculate setback distance based on obstruction height
   - Formula: setback = height * factor

2. **Obstruction Editing**
   - Allow editing/deleting obstructions
   - Adjust heights after creation

3. **Obstruction Types**
   - Different types (vent, skylight, HVAC)
   - Different setback rules per type

4. **Visual Improvements**
   - Labels showing obstruction heights
   - Different colors for different types
   - Measurement tools

## Testing

1. Draw a building polygon
2. Verify obstruction drawing tool appears
3. Draw 2-3 obstruction polygons
4. Enter heights for each
5. Click "Done with Obstructions"
6. Verify obstruction setbacks appear (light red)
7. Create an array that spans across obstructions
8. Verify panels are hidden in obstruction setback areas
9. Drag rows/columns across obstructions
10. Verify holes appear in the array where obstructions are

## Files Modified

- `src/SolarSight.js` - Added workflow state and obstruction handlers
- `src/utils/ArrayManager.js` - Added obstruction support and visibility checking
- `src/Components/ObstructionDrawingTool.js` - NEW component
- `src/utils/ObstructionSetback.js` - NEW utility functions

## Notes

- Obstruction setbacks expand OUTWARD (unlike fire setbacks which go inward)
- Default 2ft setback can be changed in `handleFinishObstructions()`
- Obstructions are stored per-building polygon
- Drawing manager is reused for both building and obstruction polygons
