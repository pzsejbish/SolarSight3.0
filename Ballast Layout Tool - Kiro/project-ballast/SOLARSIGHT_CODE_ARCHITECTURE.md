# SolarSight Code Architecture - Step-by-Step Breakdown

## File Structure Overview

```
src/
├── SolarSight.js              # Main component (2800+ lines)
├── App.js                     # Entry point with LoadScript wrapper
├── Components/
│   ├── ArrayCreationTool.js   # Array creation overlay & interaction
│   ├── ArrayControlPanel.js   # Array list & management UI
│   ├── ArrayWorkflowPanel.js  # Array creation workflow controls
│   ├── ObstructionDrawingTool.js  # Obstruction drawing & editing
│   ├── WorkflowControlPanel.js    # Building/Obstruction workflow controls
│   ├── PanelObstructionManager.js # Legacy panel obstruction UI
│   ├── SolarSightMap.js       # Google Maps wrapper
│   ├── SolarPanelScene.js     # 3D panel preview (placeholder)
│   └── ErrorBoundary.js       # Error handling wrapper
└── utils/
    ├── PolygonProcessing.js   # Polygon & panel grid generation
    ├── ArrayManager.js        # Array state management
    ├── ArrayToGridReconciler.js  # Convert arrays to grid layout
    └── ObstructionSetback.js  # Obstruction setback calculations
```

---

## State Management in SolarSight.js

### Core State Variables (Lines ~110-150)

```javascript
// Map & Drawing
const mapRef = useRef(null); // Google Maps instance
const drawingManagerRef = useRef(null); // Drawing manager instance
const [isMapInitialized, setIsMapInitialized] = useState(false);
const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);

// Building Polygons
const [polygons, setPolygons] = useState([]); // Array of building polygons
const [selectedPolygonIndex, setSelectedPolygonIndex] = useState(null);
const [pendingBuildingPolygon, setPendingBuildingPolygon] = useState(null);

// Workflow State
const [workflowState, setWorkflowState] = useState("building");
// Possible values: 'building' | 'building-edit' | 'obstructions' | 'obstructions-edit' | 'arrays'

// Obstructions
const [obstructions, setObstructions] = useState([]);
const [obstructionSetbackPolygons, setObstructionSetbackPolygons] = useState(
  []
);

// Array Mode (NEW)
const [arrayManager, setArrayManager] = useState(null);
const [arrays, setArrays] = useState([]);
const [selectedArrayId, setSelectedArrayId] = useState(null);
const [isArrayCreationMode, setIsArrayCreationMode] = useState(false);
const [arrayCreationStep, setArrayCreationStep] = useState("idle");
// Possible values: 'idle' | 'origin' | 'rotate' | 'rows' | 'columns' | 'finalize'
const [currentArrayDraft, setCurrentArrayDraft] = useState(null);

// Mode Toggle
const [useArrayMode, setUseArrayMode] = useState(true); // true = Array Mode, false = Click Mode
```

---

## Step-by-Step Code Breakdown

---

## **STEP 1: Building Outline (Drawing Mode)**

### Location in Code

- **Lines 730-830**: `handlePolygonComplete` callback
- **Lines 2130-2230**: Workflow state initialization

### Key Functions

#### `handlePolygonComplete(polygon)` - Lines 730-830

```javascript
// Called when user finishes drawing a polygon
// Only processes if workflowState === 'building'

1. Validates polygon isn't self-intersecting
   - Uses: isPolygonSelfIntersecting() helper (Lines 690-730)

2. Calculates building dimensions
   - Uses: calculateBoundingBoxDimensions() from utils/PolygonProcessing.js
   - Returns: { width, length, area, widthFeet, lengthFeet, areaFeet }

3. Checks minimum size requirements
   - Compares against panel size + setback
   - Shows error if too small (using Swal.fire)

4. Makes polygon editable
   - Sets editable: true, draggable: false
   - Changes color to blue (#2196F3)

5. Stores pending polygon
   - setPendingBuildingPolygon({ polygon, pathArray, boundingBoxDimensions })

6. Transitions to edit mode
   - setWorkflowState('building-edit')
```

### Components Used

- **SweetAlert2 (Swal)**: Error dialogs for invalid polygons
- **Google Maps Polygon**: Drawing and display
- **DrawingManager**: Enables polygon drawing mode

### Utils Used

- **calculateBoundingBoxDimensions()**: `utils/PolygonProcessing.js`
  - Calculates width, length, area from vertices
  - Converts meters to feet

---

## **STEP 2: Building Edit Mode**

### Location in Code

- **Lines 2130-2180**: `handleWorkflowNext` callback (building-edit case)
- **Lines 2280-2320**: `handleWorkflowBack` callback

### Key Functions

#### `handleWorkflowNext()` - Building Edit Case (Lines 2130-2180)

```javascript
// Called when user clicks "Next" in WorkflowControlPanel

1. Gets the pending polygon
   - const polygon = pendingBuildingPolygon.polygon

2. Finalizes polygon appearance
   - Sets editable: false
   - Changes color to red (#FF0000)

3. Creates setback polygon
   - Uses: generateSetbackPolygon() from utils/PolygonProcessing.js
   - Distance: formData.setback_distance (default 3 feet)
   - Creates orange outline inside building

4. Calculates building rotation
   - Uses: findLongestEdge() from utils/PolygonProcessing.js
   - Returns: { angle, isClockwise }
   - Determines panel orientation

5. Creates polygon data object
   - Stores: originalPolygon, setbackPolygon, dimensions, rotation, etc.

6. Adds to polygons array
   - setPolygons([...polygons, newPolygonData])
   - setSelectedPolygonIndex(newIndex)

7. Transitions to obstructions mode
   - setWorkflowState('obstructions')
   - setPendingBuildingPolygon(null)
```

### Components Used

- **WorkflowControlPanel**: Sidebar controls with Next/Back buttons
  - Location: `src/Components/WorkflowControlPanel.js`
  - Props: currentStep, onNext, onBack, canGoNext, canGoBack

### Utils Used

- **generateSetbackPolygon()**: `utils/PolygonProcessing.js`
  - Creates inset polygon at specified distance
  - Uses geometric calculations for parallel offset
- **findLongestEdge()**: `utils/PolygonProcessing.js`
  - Finds longest edge of polygon
  - Calculates angle for panel orientation
  - Determines if polygon is clockwise

---

## **STEP 3: Obstructions (Drawing Mode)**

### Location in Code

- **Lines 2470-2520**: ObstructionDrawingTool component rendering
- **Lines 2360-2380**: `handleObstructionComplete` callback

### Key Functions

#### `handleObstructionComplete(obstruction)` - Lines 2360-2380

```javascript
// Called when ObstructionDrawingTool completes one obstruction

1. Receives obstruction object
   - { id, path: [{lat, lng}], height, polygon }

2. Adds to obstructions array
   - setObstructions(prev => [...prev, obstruction])

3. Obstruction remains editable
   - User can continue drawing more obstructions
```

### Components Used

- **ObstructionDrawingTool**: `src/Components/ObstructionDrawingTool.js`
  - Manages obstruction drawing workflow
  - Prompts for height input (Swal)
  - Creates red polygons with height labels
  - Props:
    - mapRef: Google Maps instance
    - drawingManagerRef: Drawing manager
    - buildingPolygon: Building outline
    - setbackPolygon: Setback boundary
    - isActive: true when in obstruction mode
    - onObstructionComplete: Callback for each obstruction
    - onFinishObstructions: Callback when done

### How ObstructionDrawingTool Works

```javascript
// Inside ObstructionDrawingTool.js

1. Listens for polygon complete events
2. Shows Swal prompt for height
3. Creates red polygon with height label
4. Validates obstruction is inside building
5. Calls onObstructionComplete(obstruction)
6. User can draw more or click "Next"
```

---

## **STEP 4: Obstructions Edit Mode**

### Location in Code

- **Lines 2180-2260**: `handleWorkflowNext` callback (obstructions-edit case)

### Key Functions

#### `handleWorkflowNext()` - Obstructions Edit Case (Lines 2180-2260)

```javascript
// Called when user clicks "Next" after editing obstructions

1. Updates obstruction paths from edited polygons
   - Loops through obstructions array
   - Gets current path from polygon.getPath()
   - Updates obstruction.path with new coordinates

2. Makes obstructions non-editable
   - obstruction.polygon.setOptions({ editable: false })

3. Generates setback polygons for obstructions
   - Uses: generateObstructionSetbacks() from utils/ObstructionSetback.js
   - Default 2-foot setback around each obstruction
   - Returns: obstructionsWithSetbacks array

4. Creates invisible setback polygons
   - Creates Google Maps Polygons with visible: false
   - Used for calculations only (not displayed)
   - Stored in obstructionSetbackPolygons state

5. Stores obstructions with selected polygon
   - Updates polygons[selectedPolygonIndex].obstructions

6. Initializes ArrayManager with obstructions
   - arrayManager.setObstructions(obstructionsWithSetbacks)

7. Transitions to arrays mode
   - setWorkflowState('arrays')
   - Shows success message (Swal)
```

### Utils Used

- **generateObstructionSetbacks()**: `utils/ObstructionSetback.js`
  - Takes array of obstructions with paths
  - Generates setback polygons around each
  - Returns obstructions with added setbackPath property

---

## **STEP 5: Array Creation Mode**

### Location in Code

- **Lines 1950-2100**: Array workflow handlers
- **Lines 2470-2520**: ArrayCreationTool component rendering
- **Lines 1340-1450**: ArrayManager initialization

### State Flow

```
arrayCreationStep: 'idle' → 'origin' → 'rotate' → 'rows' → 'columns' → 'finalize'
```

---

### **STEP 5a: Place Array Origin**

#### ArrayCreationTool Component

**Location**: `src/Components/ArrayCreationTool.js`

```javascript
// When isActive && arrayCreationStep === 'idle'

1. Listens for map clicks
   - google.maps.event.addListener(map, 'click', handleMapClick)

2. On click, creates new array
   - Calls arrayManager.createArray(clickLatLng)
   - Returns array object with origin point

3. Places origin marker
   - Creates draggable marker at click location
   - Marker shows array origin

4. Calls onArrayCreated(array)
   - Parent sets currentArrayDraft
   - Parent sets arrayCreationStep to 'origin'

5. Generates initial single panel
   - arrayManager.generateArrayPanels(array, map)
   - Shows one panel at origin with current rotation
```

#### ArrayManager Class

**Location**: `utils/ArrayManager.js`

```javascript
class ArrayManager {
  constructor(
    formData,
    setbackPolygon,
    buildingPolygon,
    buildingRotation,
    obstructions
  ) {
    this.formData = formData;
    this.setbackPolygon = setbackPolygon;
    this.buildingPolygon = buildingPolygon;
    this.buildingRotation = buildingRotation;
    this.obstructions = obstructions;
    this.arrays = [];
    this.nextArrayId = 1;
  }

  createArray(origin) {
    // Creates new array object
    return {
      id: this.nextArrayId++,
      origin: { lat: origin.lat(), lng: origin.lng() },
      rotation: 0,
      rows: 1,
      cols: 1,
      rowsLeft: 0,
      rowsRight: 1,
      colsUp: 0,
      colsDown: 1,
      panelPolygons: [],
      // ... markers and arrows
    };
  }
}
```

---

### **STEP 5b: Set Array Rotation**

#### Location in Code

- **Lines 880-920**: `handleArrayRotate` callback

#### `handleArrayRotate()` - Lines 880-920

```javascript
// Called when user clicks "Rotate" button in ArrayWorkflowPanel

1. Gets current rotation
   - const currentRotation = currentArrayDraft.rotation || 0

2. Adds 90 degrees
   - const newRotation = (currentRotation + 90) % 360
   - Cycles: 0° → 90° → 180° → 270° → 0°

3. Resets rows and columns to 1
   - User must choose orientation before building array

4. Regenerates panels with new rotation
   - arrayManager.generateArrayPanels(currentArrayDraft, map)
   - Shows single panel at new rotation

5. Updates draft
   - setCurrentArrayDraft({...currentArrayDraft})
```

#### ArrayManager.generateArrayPanels()

**Location**: `utils/ArrayManager.js`

```javascript
generateArrayPanels(array, map) {
  // 1. Calculate panel dimensions
  const panelWidth = parseFloat(this.formData.pv_module_ew_width) * 0.3048;
  const panelLength = parseFloat(this.formData.pv_module_ns_length) * 0.3048;

  // 2. Calculate total rotation
  const totalRotation = this.buildingRotation + array.rotation;

  // 3. Generate grid of panel positions
  // Starting from origin, create rows x cols grid

  // 4. For each panel position:
  //    - Calculate lat/lng using spherical geometry
  //    - Check if inside setback
  //    - Check if intersects obstructions
  //    - Create Google Maps Polygon if valid

  // 5. Store panels in array.panelPolygons

  // 6. Color panels:
  //    - Green if valid
  //    - Red if intersects obstruction
  //    - Hide if outside setback
}
```

---

### **STEP 5c: Add Rows (Horizontal)**

#### Location in Code

- **ArrayCreationTool.js**: Arrow drag handlers

#### How Arrow Dragging Works

```javascript
// In ArrayCreationTool.js

1. Creates 4 draggable arrows (left, right, up, down)
   - Positioned at array edges
   - Draggable along their respective axes

2. On drag, calculates distance from origin
   - Uses spherical geometry to measure distance

3. Converts distance to panel count
   - distance / (panelWidth + spacing) = number of panels

4. Updates array dimensions
   - Left arrow: increases rowsLeft
   - Right arrow: increases rowsRight
   - Total rows = rowsLeft + rowsRight

5. Regenerates panels
   - arrayManager.generateArrayPanels(array, map)
   - Shows full array with new dimensions

6. Calls onArrayUpdated(array)
   - Parent updates currentArrayDraft
```

---

### **STEP 5d: Add Columns (Vertical)**

Same as Step 5c, but for vertical direction:

- Up arrow: increases colsUp
- Down arrow: increases colsDown
- Total cols = colsUp + colsDown

---

### **STEP 5e: Finalize Array**

#### Location in Code

- **Lines 850-880**: `handleArrayWorkflowNext` callback (finalize case)

#### `handleArrayWorkflowNext()` - Finalize Case

```javascript
// Called when user clicks "Save" at finalize step

1. Gets latest array from ArrayManager
   - const latestArray = arrayManager.getArray(currentArrayDraft.id)

2. Checks if editing existing or creating new
   - Searches arrays for matching ID

3. Updates or adds to arrays state
   - If editing: updates existing array in place
   - If new: adds to arrays list

4. Syncs with ArrayManager
   - ArrayManager maintains master copy

5. Resets creation state
   - setCurrentArrayDraft(null)
   - setArrayCreationStep('idle')
   - setIsArrayCreationMode(false)

6. Array becomes permanent
   - Panels stay on map
   - Array appears in dropdown
```

---

## **STEP 6: Create Multiple Arrays**

### Location in Code

- **Lines 1280-1300**: `handleToggleCreationMode` callback
- **ArrayControlPanel.js**: "Create New Array" button

#### `handleToggleCreationMode()` - Lines 1280-1300

```javascript
// Called when user clicks "Create New Array" button

1. Toggles creation mode
   - setIsArrayCreationMode(true)

2. Deselects any selected array
   - setSelectedArrayId(null)

3. Resets creation step
   - setArrayCreationStep('idle')
   - Waits for user to click on map

4. User repeats steps 5a-5e for new array
```

### Components Used

- **ArrayControlPanel**: `src/Components/ArrayControlPanel.js`
  - Shows list of created arrays
  - "Create New Array" button
  - Edit/Delete buttons for each array
  - Props:
    - arrays: Array of created arrays
    - selectedArrayId: Currently selected array
    - onSelectArray: Selection callback
    - onEditArray: Edit callback
    - onDeleteArray: Delete callback
    - onToggleCreationMode: Create new callback
    - isCreationMode: Boolean flag

---

## **STEP 7: Edit or Delete Arrays**

### Location in Code

- **Lines 1150-1280**: `handleEditArray` callback
- **Lines 1130-1150**: `handleDeleteArray` callback
- **Lines 1100-1130**: `handleSelectArray` callback

### Key Functions

#### `handleEditArray(arrayId)` - Lines 1150-1280

```javascript
// Called when user clicks "Edit" on an array

1. Gets array from ArrayManager
   - const array = arrayManager.getArray(arrayId)

2. Hides existing panels during edit
   - array.panelPolygons.forEach(panel => panel.setMap(null))

3. Positions arrows at array extent
   - Calculates current array dimensions
   - Places arrows at edges (not at origin)
   - Uses saved rowsLeft, rowsRight, colsUp, colsDown

4. Sets array as draft
   - setCurrentArrayDraft(array)
   - IMPORTANT: Uses same object reference, not a copy

5. Enters creation mode
   - setIsArrayCreationMode(true)
   - setArrayCreationStep('finalize')
   - User can navigate back through steps

6. Selects the array
   - setSelectedArrayId(arrayId)
```

#### `handleDeleteArray(arrayId)` - Lines 1130-1150

```javascript
// Called when user clicks "Delete" on an array

1. Removes from ArrayManager
   - arrayManager.deleteArray(arrayId)
   - Removes panels from map
   - Removes markers and arrows

2. Updates arrays state
   - setArrays(arrayManager.getAllArrays())

3. Deselects array
   - setSelectedArrayId(null)
```

#### `handleSelectArray(arrayId)` - Lines 1100-1130

```javascript
// Called when user selects array from dropdown

1. Tells ArrayManager to select
   - arrayManager.selectArray(arrayId)
   - Highlights selected array panels

2. Updates state
   - setSelectedArrayId(arrayId)
   - setArrays(arrayManager.getAllArrays())
```

---

## **STEP 8: Submit Layout**

### Location in Code

- **Lines 1900-2100**: `handleSaveLayout` callback

### Key Functions

#### `handleSaveLayout()` - Lines 1900-2100

```javascript
// Called when user clicks "Submit Layout" button

1. Processes each polygon (building)
   - Loops through polygons array

2. Chooses layout generation method

   IF useArrayMode && arrays exist:
     // NEW: Array-based layout
     a. Creates ArrayToGridReconciler
        - new ArrayToGridReconciler(formData, polygon, setback, rotation)

     b. Reconciles arrays to grid
        - reconciler.reconcile(arrayManager.getAllArrays())
        - Converts array positions to 2D grid
        - Returns: { layout, metadata }

     c. Layout is 2D array of booleans
        - true = panel selected
        - false = no panel
        - number = obstruction height
        - 'intersects' = partially blocked

   ELSE:
     // OLD: Click-based layout
     a. Uses getSelectedPanelData()
        - From utils/PolygonProcessing.js
        - Reads panel.state from each panel polygon
        - Generates 2D grid from panel states

3. Handles East-West system rotation
   - If sun_ballast_system === "east-west-system"
   - Rotates layout grid 90 degrees
   - Uses rotateLayoutGrid90Degrees() helper
   - Swaps width and length

4. Builds polygon data object
   {
     polygon_id: index,
     layout: 2D array,
     building_width: feet,
     building_length: feet,
     building_area: sq ft,
     building_rotation: degrees,
     orientation: degrees,
     is_landscape: boolean,
     panel_width: feet,
     panel_length: feet,
     lat: latitude,
     lng: longitude,
     vertices: [{lat, lng}, ...],
     is_clockwise: boolean,
     // East-West specific:
     ridge_gap: feet,
     valley_gap: feet,
     roof_clearance: feet
   }

5. Builds submission data
   {
     ...formData,              // All input parameters
     lat: extracted from latLng,
     lng: extracted from latLng,
     panel_layout: [polygonData, ...],
     panel_width: feet,
     panel_length: feet,
     building_width: feet,
     building_length: feet,
     building_area: sq ft,
     building_rotation: degrees
   }

6. Converts numeric fields
   - Parses all numeric strings to numbers
   - Sets missing fields to 'non value'

7. Sends to API
   - Calls sendLayoutToAPI(submissionData)
   - Shows success/error message (Swal)
```

### Utils Used

#### ArrayToGridReconciler

**Location**: `utils/ArrayToGridReconciler.js`

```javascript
class ArrayToGridReconciler {
  constructor(formData, buildingPolygon, setbackPolygon, buildingRotation) {
    // Stores configuration
  }

  reconcile(arrays) {
    // 1. Generates full panel grid for building
    //    - Uses processPolygon() to create all possible panel positions

    // 2. For each array:
    //    - Gets array panel positions
    //    - Maps to grid coordinates
    //    - Marks corresponding grid cells as selected

    // 3. Handles obstructions
    //    - Marks obstructed panels with height

    // 4. Returns:
    {
      layout: 2D array,           // Grid of panel states
      metadata: {
        rows: number,
        cols: number,
        totalPanels: number,
        selectedPanels: number
      }
    }
  }
}
```

#### getSelectedPanelData()

**Location**: `utils/PolygonProcessing.js`

```javascript
export function getSelectedPanelData(polygon, formData) {
  // 1. Gets panel grid from polygon.panelPolygons.grid

  // 2. Creates grid mapping
  //    - Maps grid indices to layout indices
  //    - Handles sparse grids (gaps in rows/cols)

  // 3. Builds 2D layout array
  //    - Reads panel.state for each panel
  //    - true = selected
  //    - false = not selected
  //    - number = obstruction height
  //    - 'intersects' = boundary intersection

  // 4. Calculates building dimensions
  //    - Uses stored or calculated values

  // 5. Returns:
  {
    layout: 2D array,
    building_width: feet,
    building_length: feet,
    building_area: sq ft
  }
}
```

#### sendLayoutToAPI()

**Location**: SolarSight.js, Lines 1620-1680

```javascript
const sendLayoutToAPI = async (layoutData) => {
  // 1. Gets auth token from localStorage
  // 2. Makes POST request to API
  //    - URL: 'https://api-training.pzse.com/api/internal/ballast/projects'
  //    - Headers: Authorization, Content-Type
  //    - Body: JSON.stringify(layoutData)
  // 3. Handles response
  //    - Success: Shows success message
  //    - Error: Shows error message
  //    - Logs response data
};
```

---

## Key Utility Functions Deep Dive

### processPolygon()

**Location**: `utils/PolygonProcessing.js`

```javascript
export function processPolygon(
  pathArray,           // Building vertices
  setbackPolygon,      // Setback boundary
  mapRef,              // Google Maps instance
  formData,            // Configuration
  gridOffsetX,         // Grid shift X
  gridOffsetY,         // Grid shift Y
  rotationAngle,       // Panel rotation
  isClockwise          // Polygon winding
) {
  // 1. Gets panel dimensions from formData
  const panelWidth = parseFloat(formData.pv_module_ew_width) * 0.3048;
  const panelLength = parseFloat(formData.pv_module_ns_length) * 0.3048;

  // 2. Calculates spacing
  const spacingEW = parseFloat(formData.distance_between_panels_ew) * 0.3048;
  const spacingNS = parseFloat(formData.distance_between_panels_ns) * 0.3048;

  // 3. Determines grid dimensions
  //    - Calculates how many panels fit in building
  //    - Accounts for rotation and spacing

  // 4. Generates grid of panel positions
  //    - Creates 2D array (rows x cols)
  //    - Each cell contains panel polygon or null

  // 5. For each panel position:
  //    a. Calculates corner coordinates
  //       - Uses rotation angle
  //       - Applies grid offsets
  //       - Uses spherical geometry for lat/lng
  //
  //    b. Creates Google Maps Polygon
  //       - 4 corners forming rectangle
  //       - Initial color: blue
  //
  //    c. Checks if inside setback
  //       - Uses Google Maps containsLocation()
  //       - Marks panel.isInsideSetback
  //
  //    d. Checks obstruction intersection
  //       - Tests against obstruction setback polygons
  //       - Marks panel.state = 'obstructed' if intersects
  //
  //    e. Adds click listener
  //       - Toggles panel selection on click
  //       - Changes color (blue ↔ green)
  //
  //    f. Stores in grid
  //       - grid[row][col] = panel
  //       - panel.index = { row, col }

  // 6. Handles East-West system
  //    - If sun_ballast_system === "east-west-system"
  //    - Pairs adjacent panels (east + west)
  //    - Links them with pairIndex
  //    - Colors west panels darker blue

  // 7. Returns:
  {
    panelPolygons: [panel, panel, ...],  // Flat array
    grid: [[panel, null, ...], ...]      // 2D array
  }
}
```

### generateSetbackPolygon()

**Location**: `utils/PolygonProcessing.js`

```javascript
export function generateSetbackPolygon(pathArray, setbackDistance) {
  // 1. Uses Turf.js library for geometric operations

  // 2. Converts path to Turf polygon
  const turfPolygon = turf.polygon([pathArray]);

  // 3. Creates buffer (negative for inset)
  const buffered = turf.buffer(turfPolygon, -setbackDistance, {
    units: "meters",
  });

  // 4. Extracts coordinates
  const coordinates = buffered.geometry.coordinates[0];

  // 5. Converts back to Google Maps format
  return coordinates.map((coord) => ({
    lat: coord[1],
    lng: coord[0],
  }));
}
```

### findLongestEdge()

**Location**: `utils/PolygonProcessing.js`

```javascript
export function findLongestEdge(pathArray) {
  // 1. Loops through all edges
  let maxLength = 0;
  let longestEdgeIndex = 0;

  for (let i = 0; i < pathArray.length; i++) {
    const p1 = pathArray[i];
    const p2 = pathArray[(i + 1) % pathArray.length];

    // 2. Calculates edge length using Haversine formula
    const length = calculateDistance(p1, p2);

    if (length > maxLength) {
      maxLength = length;
      longestEdgeIndex = i;
    }
  }

  // 3. Calculates edge angle
  const p1 = pathArray[longestEdgeIndex];
  const p2 = pathArray[(longestEdgeIndex + 1) % pathArray.length];
  const angle = calculateBearing(p1, p2);

  // 4. Determines if polygon is clockwise
  const isClockwise = isPolygonClockwise(pathArray);

  // 5. Returns:
  return { angle, isClockwise };
}
```

---

## Component Communication Flow

### Parent → Child Props

```
SolarSight (parent)
  ├─→ WorkflowControlPanel
  │     Props: currentStep, onNext, onBack, canGoNext, canGoBack
  │
  ├─→ ArrayWorkflowPanel
  │     Props: currentStep, onNext, onBack, onRotate, canGoNext, canGoBack,
  │            arrayCount, rowCount, colCount, currentRotation
  │
  ├─→ ArrayControlPanel
  │     Props: arrays, selectedArrayId, onSelectArray, onEditArray,
  │            onDeleteArray, onToggleCreationMode, isCreationMode
  │
  ├─→ ObstructionDrawingTool
  │     Props: mapRef, drawingManagerRef, buildingPolygon, setbackPolygon,
  │            isActive, onObstructionComplete, onFinishObstructions
  │
  ├─→ ArrayCreationTool
  │     Props: mapRef, arrayManager, isActive, arrayCreationStep,
  │            currentArrayDraft, onArrayCreated, onArrayUpdated,
  │            buildingRotation
  │
  └─→ SolarSightMap
        Props: isLoaded, mapCenter, zoom, options, drawingManagerOptions,
               onMapLoad, onMapUnmount, onPolygonComplete, setbackPolygon,
               panelPolygons, polygons, selectedPolygonIndex
```

### Child → Parent Callbacks

```
User Action → Component → Callback → Parent State Update

Example 1: Drawing Building
  User draws polygon
    → SolarSightMap detects polygoncomplete
      → calls onPolygonComplete(polygon)
        → SolarSight.handlePolygonComplete()
          → validates polygon
          → setPendingBuildingPolygon()
          → setWorkflowState('building-edit')

Example 2: Creating Array
  User clicks map
    → ArrayCreationTool detects click
      → calls arrayManager.createArray()
        → calls onArrayCreated(array)
          → SolarSight.handleArrayCreated()
            → setCurrentArrayDraft(array)
            → setArrayCreationStep('origin')

Example 3: Workflow Navigation
  User clicks "Next"
    → WorkflowControlPanel button click
      → calls onNext()
        → SolarSight.handleWorkflowNext()
          → processes current step
          → setWorkflowState(nextState)
```

---

## Effect Hooks (useEffect) Overview

### Lines 165-175: Mount & Google Maps Check

```javascript
useEffect(() => {
  console.log("SolarSight mounting with existing layout:", existingLayout);
  setIsGoogleMapsLoaded(true); // Set immediately since wrapped in LoadScript
}, [existingLayout]);
```

### Lines 177-460: Reconstruct Existing Layout

```javascript
useEffect(() => {
  // Only runs if existingLayout prop is provided
  // Rebuilds polygons, panels, and arrays from saved data
  // Used when loading a previously saved layout
}, [existingLayout, mapRef.current, isGoogleMapsLoaded, formData]);
```

### Lines 465-470: Log FormData Changes

```javascript
useEffect(() => {
  console.log("Form data:", formData);
}, [formData]);
```

### Lines 472-500: Initialize Drawing Manager

```javascript
useEffect(() => {
  // Sets up Google Maps DrawingManager options
  // Configures polygon and rectangle drawing modes
}, [isGoogleMapsLoaded]);
```

### Lines 820-870: Drawing Manager Lifecycle

```javascript
useEffect(() => {
  // Creates/recreates DrawingManager when options change
  // Attaches polygon and rectangle complete listeners
  // Cleanup on unmount
}, [
  isMapInitialized,
  drawingManagerOptions,
  handlePolygonComplete,
  handleRectangleComplete,
  workflowState,
]);
```

### Lines 1456-1485: East-West System Auto-Rotation

```javascript
useEffect(() => {
  // Automatically rotates panels 90° when East-West system is selected
  // Only runs once per polygon
}, [formData.sun_ballast_system, polygons.length]);
```

### Lines 2000-2050: Drawing Manager Control

```javascript
useEffect(() => {
  // Controls drawing manager based on workflow state
  // Enables/disables drawing modes
  // Switches between polygon and rectangle modes
}, [isArrayCreationMode, workflowState]);
```

### Lines 2052-2080: Initialize ArrayManager

```javascript
useEffect(() => {
  // Creates ArrayManager when entering 'arrays' workflow state
  // Passes building polygon, setback, and obstructions
}, [selectedPolygonIndex, polygons, formData, workflowState]);
```

---

## Data Flow Summary

```
User Input (formData in App.js)
  ↓
SolarSight Component
  ↓
1. User draws building → handlePolygonComplete
   ↓
   Creates polygon object with:
   - originalPolygon (Google Maps Polygon)
   - setbackPolygon (Google Maps Polygon)
   - dimensions (width, length, area)
   - rotation (angle from longest edge)
   ↓
2. User draws obstructions → handleObstructionComplete
   ↓
   Creates obstruction objects with:
   - path (vertices)
   - height (feet)
   - polygon (Google Maps Polygon)
   - setbackPath (generated)
   ↓
3. User creates arrays → ArrayCreationTool + ArrayManager
   ↓
   Creates array objects with:
   - origin (lat/lng)
   - rotation (degrees)
   - rows, cols (dimensions)
   - panelPolygons (Google Maps Polygons)
   ↓
4. User submits → handleSaveLayout
   ↓
   ArrayToGridReconciler converts arrays to grid
   ↓
   Generates layout data structure
   ↓
   sendLayoutToAPI posts to backend
```

---

## Key Design Patterns

### 1. **Workflow State Machine**

```javascript
workflowState: 'building' → 'building-edit' → 'obstructions' →
               'obstructions-edit' → 'arrays'
```

Each state controls:

- Which components are visible
- Which drawing modes are enabled
- Which buttons are available

### 2. **Manager Pattern (ArrayManager)**

- Centralized array state management
- Encapsulates array creation/editing logic
- Handles panel generation and validation
- Maintains master copy of arrays

### 3. **Callback Props Pattern**

- Parent passes callbacks to children
- Children call callbacks on user actions
- Parent updates state based on callbacks
- Unidirectional data flow

### 4. **Ref Pattern for External APIs**

- mapRef holds Google Maps instance
- drawingManagerRef holds DrawingManager
- Allows direct API calls without re-renders

### 5. **Reconciler Pattern (ArrayToGridReconciler)**

- Converts one data structure to another
- Arrays (position-based) → Grid (index-based)
- Handles coordinate mapping and validation

---

## Performance Considerations

### 1. **Memoization**

```javascript
const mapOptions = React.useMemo(
  () => ({
    mapTypeId: "satellite",
  }),
  []
);
```

Prevents unnecessary re-renders of map

### 2. **useCallback for Handlers**

All event handlers wrapped in useCallback to prevent recreation

### 3. **Lazy Panel Generation**

Panels only generated when needed (not all at once)

### 4. **Invisible Setback Polygons**

Obstruction setbacks are invisible (visible: false) to reduce rendering

---

This architecture allows for:

- ✅ Complex multi-step workflows
- ✅ Real-time visual feedback
- ✅ Flexible array creation
- ✅ Precise geometric calculations
- ✅ Easy state management
- ✅ Extensible design
