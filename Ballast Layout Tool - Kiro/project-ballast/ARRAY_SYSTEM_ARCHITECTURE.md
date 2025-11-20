# Array-Based Panel Layout System Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER WORKFLOW                            │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  1. Draw Building      │
                    │     Polygon            │
                    └────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  2. Enable Array Mode  │
                    └────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  3. Click "Create      │
                    │     New Array"         │
                    └────────────────────────┘
                                 │
                                 ▼
        ┌────────────────────────────────────────────────┐
        │  4. Interactive Array Creation                 │
        │                                                 │
        │  a) Click on map → Place origin                │
        │  b) Drag horizontal → Set row count            │
        │  c) Release → Lock rows                        │
        │  d) Drag vertical → Set column count           │
        │  e) Release → Finalize array                   │
        └────────────────────────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  5. Manipulate Array   │
                    │     - Rotate           │
                    │     - Move             │
                    │     - Delete           │
                    └────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  6. Create More Arrays │
                    │     (Repeat 3-5)       │
                    └────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  7. Submit Layout      │
                    └────────────────────────┘
                                 │
                                 ▼
        ┌────────────────────────────────────────────────┐
        │  8. Reconciliation Process                     │
        │                                                 │
        │  Arrays → Giant Grid → API Format              │
        └────────────────────────────────────────────────┘
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SolarSight.js                             │
│                     (Main Component)                             │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    State Management                      │   │
│  │                                                           │   │
│  │  • polygons[]          - Building outlines               │   │
│  │  • arrayManager        - Array management instance       │   │
│  │  • arrays[]            - Current arrays                  │   │
│  │  • selectedArrayId     - Currently selected array        │   │
│  │  • isArrayCreationMode - Creation mode flag              │   │
│  │  • useArrayMode        - Toggle old/new system           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Child Components                        │   │
│  │                                                           │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │  ArrayControlPanel                               │   │   │
│  │  │  - Array list/selector                           │   │   │
│  │  │  - Rotation controls                             │   │   │
│  │  │  - Delete button                                 │   │   │
│  │  │  - Creation mode toggle                          │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  │                                                           │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │  ArrayCreationTool                               │   │   │
│  │  │  - Click-and-drag interaction                    │   │   │
│  │  │  - Preview lines                                 │   │   │
│  │  │  - Panel count calculation                       │   │   │
│  │  │  - Building alignment                            │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  │                                                           │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │  SolarSightMap                                   │   │   │
│  │  │  - Google Maps wrapper                           │   │   │
│  │  │  - Polygon drawing                               │   │   │
│  │  │  - Satellite imagery                             │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Array Creation Flow

```
User Click
    │
    ▼
┌─────────────────────┐
│ ArrayCreationTool   │
│ handleMapClick()    │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ ArrayManager        │
│ createArray()       │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ Generate Panels     │
│ generateArrayPanels()│
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ Render on Map       │
│ Google Maps Polygon │
└─────────────────────┘
```

### Array Manipulation Flow

```
User Action (Rotate/Move)
    │
    ▼
┌─────────────────────┐
│ ArrayControlPanel   │
│ onRotateArray()     │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ SolarSight          │
│ handleRotateArray() │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ ArrayManager        │
│ updateArrayRotation()│
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ Regenerate Panels   │
│ generateArrayPanels()│
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ Update Map Display  │
└─────────────────────┘
```

### Submission/Reconciliation Flow

```
User Clicks "Submit Layout"
    │
    ▼
┌─────────────────────────────┐
│ SolarSight                  │
│ handleSaveLayout()          │
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│ ArrayToGridReconciler       │
│ reconcile(arrays)           │
└─────────────────────────────┘
    │
    ├─────────────────────────────────────┐
    │                                     │
    ▼                                     ▼
┌──────────────────────┐    ┌──────────────────────┐
│ Calculate Bounds     │    │ Initialize Giant     │
│ of All Arrays        │    │ Grid (rows × cols)   │
└──────────────────────┘    └──────────────────────┘
    │                                     │
    └─────────────────┬───────────────────┘
                      ▼
        ┌──────────────────────────┐
        │ For Each Array Panel:    │
        │ 1. Get center lat/lng    │
        │ 2. Convert to grid coords│
        │ 3. Snap to grid cell     │
        │ 4. Mark as true/false    │
        └──────────────────────────┘
                      │
                      ▼
        ┌──────────────────────────┐
        │ Fill Empty Cells:        │
        │ - Inside setback = false │
        │ - Outside = "non-value"  │
        └──────────────────────────┘
                      │
                      ▼
        ┌──────────────────────────┐
        │ Convert to API Format    │
        │ (2D array of booleans)   │
        └──────────────────────────┘
                      │
                      ▼
        ┌──────────────────────────┐
        │ Send to API              │
        │ /api/internal/ballast/   │
        │ projects                 │
        └──────────────────────────┘
```

## Array Data Structure

```javascript
{
  id: 1,                          // Unique identifier
  origin: {                       // Anchor point
    lat: 38.7545,
    lng: -121.2499
  },
  rows: 4,                        // Horizontal panels
  cols: 8,                        // Vertical panels
  rotation: 15,                   // Degrees (relative to building)
  state: 'active',                // 'creating' | 'active' | 'selected'
  panelPolygons: [                // Google Maps Polygon objects
    {
      arrayId: 1,
      arrayIndex: { row: 0, col: 0 },
      state: 'normal',            // 'normal' | 'obstructed'
      isInsideSetback: true,
      // ... Google Maps Polygon properties
    },
    // ... more panels
  ],
  obstructions: [                 // Tracked obstructions
    { row: 2, col: 3, height: 10 }
  ]
}
```

## Giant Grid Format (Excel Compatible)

```javascript
// Example 5×5 grid
[
  [false, false, true,  true,  false],  // Row 0
  [false, true,  true,  true,  false],  // Row 1
  [true,  true,  "10",  true,  true ],  // Row 2 (10 = obstruction height)
  [false, true,  true,  true,  false],  // Row 3
  ["non-value", "non-value", false, false, "non-value"]  // Row 4
]

// Legend:
// true          = Panel selected for installation
// false         = Panel available but not selected
// "10"          = Obstruction with height (feet)
// "non-value"   = Outside building boundary
// "intersects"  = Partially outside setback
```

## Coordinate Systems

### 1. Geographic Coordinates (Lat/Lng)
- Used by Google Maps
- WGS84 datum
- Example: `{ lat: 38.7545, lng: -121.2499 }`

### 2. Local Cartesian Coordinates
- Origin at building corner
- Aligned with building rotation
- Units: meters
- Example: `{ x: 15.5, y: 23.2 }`

### 3. Grid Coordinates
- Discrete row/column indices
- Snapped to panel dimensions
- Example: `{ row: 3, col: 7 }`

### Conversion Flow

```
Geographic (Lat/Lng)
    │
    │ latLngToGridCoords()
    ▼
Local Cartesian (x, y meters)
    │
    │ snapToGrid()
    ▼
Grid Coordinates (row, col)
```

## Key Algorithms

### 1. Panel Count Calculation

```javascript
// Calculate how many panels fit in a distance
const distance = computeDistanceBetween(start, end);
const panelCount = Math.floor(distance / (panelWidth + spacing));
```

### 2. Building Alignment

```javascript
// Snap drag direction to building edges
const angleRad = buildingRotation * Math.PI / 180;
const alongBuilding = dx * cos(angleRad) + dy * sin(angleRad);
const perpBuilding = -dx * sin(angleRad) + dy * cos(angleRad);
const isHorizontal = abs(alongBuilding) > abs(perpBuilding);
```

### 3. Grid Snapping

```javascript
// Snap lat/lng to nearest grid cell
const gridRow = Math.round(localY / unitLength);
const gridCol = Math.round(localX / unitWidth);
```

### 4. Rotation Transform

```javascript
// Rotate panel corners around origin
const rotatedX = x * cos(angle) - y * sin(angle);
const rotatedY = x * sin(angle) + y * cos(angle);
```

## Performance Considerations

### Optimization Strategies

1. **Lazy Panel Generation**
   - Only create visible panels
   - Hide panels outside setback
   - Reduce DOM elements

2. **Batch Updates**
   - Update all panels in array together
   - Minimize map redraws
   - Use requestAnimationFrame for smooth dragging

3. **Efficient Grid Reconciliation**
   - Calculate bounds once
   - Use Map for O(1) lookups
   - Avoid nested loops where possible

4. **Memory Management**
   - Clean up old panels when regenerating
   - Remove event listeners properly
   - Clear preview lines

## Testing Checklist

- [ ] Create single array
- [ ] Create multiple arrays
- [ ] Rotate array (0°, 90°, 180°, 270°)
- [ ] Move array by dragging origin
- [ ] Delete array
- [ ] Switch between arrays
- [ ] Mark obstructions
- [ ] Submit layout
- [ ] Verify API payload format
- [ ] Test with multiple polygons
- [ ] Test edge cases (tiny arrays, huge arrays)
- [ ] Test performance with 10+ arrays
- [ ] Toggle between old/new modes
- [ ] Load existing layout

## Future Enhancements

1. **Array Duplication**
   - Copy/paste arrays
   - Mirror arrays

2. **Smart Placement**
   - Auto-fill setback area
   - Optimize panel count

3. **Collision Detection**
   - Prevent array overlap
   - Show warnings

4. **Undo/Redo**
   - Command pattern
   - History stack

5. **Keyboard Shortcuts**
   - Arrow keys for nudging
   - Delete key for removal
   - Ctrl+C/V for copy/paste

6. **Array Templates**
   - Save common configurations
   - Quick apply presets

7. **Batch Operations**
   - Rotate all arrays
   - Delete multiple arrays
   - Bulk obstruction marking
