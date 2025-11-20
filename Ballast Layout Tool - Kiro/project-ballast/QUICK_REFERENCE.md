# SolarSight Quick Reference Guide

## File Locations Cheat Sheet

### Main Component

- **SolarSight.js** (2800+ lines) - Main application logic

### Components (src/Components/)

| Component              | Purpose                    | Key Props                          |
| ---------------------- | -------------------------- | ---------------------------------- |
| ArrayCreationTool      | Array creation overlay     | mapRef, arrayManager, isActive     |
| ArrayControlPanel      | Array list & management    | arrays, onSelectArray, onEditArray |
| ArrayWorkflowPanel     | Array workflow controls    | currentStep, onNext, onBack        |
| ObstructionDrawingTool | Obstruction drawing        | mapRef, onObstructionComplete      |
| WorkflowControlPanel   | Building workflow controls | currentStep, onNext, onBack        |
| SolarSightMap          | Google Maps wrapper        | mapCenter, zoom, onMapLoad         |

### Utils (src/utils/)

| Utility                  | Purpose                  | Key Functions                              |
| ------------------------ | ------------------------ | ------------------------------------------ |
| PolygonProcessing.js     | Panel grid generation    | processPolygon(), generateSetbackPolygon() |
| ArrayManager.js          | Array state management   | createArray(), generateArrayPanels()       |
| ArrayToGridReconciler.js | Array to grid conversion | reconcile()                                |
| ObstructionSetback.js    | Obstruction setbacks     | generateObstructionSetbacks()              |

---

## State Variables Quick Reference

```javascript
// Workflow
workflowState: "building" |
  "building-edit" |
  "obstructions" |
  "obstructions-edit" |
  "arrays";
arrayCreationStep: "idle" |
  "origin" |
  "rotate" |
  "rows" |
  "columns" |
  "finalize";

// Building
polygons: []; // Array of building polygons
selectedPolygonIndex: number; // Currently selected building
pendingBuildingPolygon: object; // Polygon being edited

// Obstructions
obstructions: []; // Array of obstruction objects
obstructionSetbackPolygons: []; // Invisible setback polygons

// Arrays
arrayManager: ArrayManager; // Array state manager
arrays: []; // Array of created arrays
selectedArrayId: number; // Currently selected array
currentArrayDraft: object; // Array being created/edited
isArrayCreationMode: boolean; // In creation mode?

// Mode
useArrayMode: boolean; // true = Array Mode, false = Click Mode
```

---

## Key Function Locations

### Workflow Handlers

| Function              | Lines     | Purpose                |
| --------------------- | --------- | ---------------------- |
| handlePolygonComplete | 730-830   | Building polygon drawn |
| handleWorkflowNext    | 2130-2260 | Next button clicked    |
| handleWorkflowBack    | 2280-2320 | Back button clicked    |

### Array Handlers

| Function                | Lines     | Purpose                  |
| ----------------------- | --------- | ------------------------ |
| handleArrayCreated      | 1000-1020 | New array origin placed  |
| handleArrayUpdated      | 1020-1040 | Array dimensions changed |
| handleArrayRotate       | 880-920   | Rotate button clicked    |
| handleArrayWorkflowNext | 850-880   | Array workflow next      |
| handleEditArray         | 1150-1280 | Edit existing array      |
| handleDeleteArray       | 1130-1150 | Delete array             |

### Obstruction Handlers

| Function                  | Lines     | Purpose                  |
| ------------------------- | --------- | ------------------------ |
| handleObstructionComplete | 2360-2380 | Single obstruction drawn |
| handleFinishObstructions  | 2380-2450 | All obstructions done    |

### Save Handler

| Function         | Lines     | Purpose               |
| ---------------- | --------- | --------------------- |
| handleSaveLayout | 1900-2100 | Submit button clicked |
| sendLayoutToAPI  | 1620-1680 | POST to backend       |

---

## Component Rendering Locations

```javascript
// Line 2480-2850: Main render return

// Sidebar (Lines 2480-2800)
├─ Mode Toggle (2490-2520)
├─ WorkflowControlPanel (2525-2540) - Building/Obstructions
├─ ArrayWorkflowPanel (2545-2565) - Array creation
├─ Polygon Selector (2570-2600)
├─ ArrayControlPanel (2605-2620) - Array list
├─ Old Controls (2625-2750) - Click mode
└─ Submit Button (2800-2815)

// Map Area (Lines 2820-2850)
├─ SolarSightMap (2825-2840)
├─ ObstructionDrawingTool (2842-2848) - Conditional
└─ ArrayCreationTool (2850-2865) - Conditional
```

---

## Common Code Patterns

### Adding a New Workflow Step

```javascript
// 1. Add to workflowState enum
setWorkflowState("new-step");

// 2. Add case in handleWorkflowNext
if (workflowState === "new-step") {
  // Process step
  setWorkflowState("next-step");
}

// 3. Add case in handleWorkflowBack
if (workflowState === "new-step") {
  // Undo step
  setWorkflowState("previous-step");
}

// 4. Update drawing manager control
useEffect(() => {
  if (workflowState === "new-step") {
    // Enable/disable drawing
  }
}, [workflowState]);

// 5. Conditionally render UI
{
  workflowState === "new-step" && <YourComponent />;
}
```

### Adding a New Array Property

```javascript
// 1. Add to array object in ArrayManager.createArray()
createArray(origin) {
  return {
    // ... existing properties
    newProperty: defaultValue,
  };
}

// 2. Update in generateArrayPanels() if needed
generateArrayPanels(array, map) {
  // Use array.newProperty
}

// 3. Include in handleSaveLayout() if needed
const polygonData = {
  // ... existing data
  new_property: array.newProperty,
};
```

### Adding a New FormData Field

```javascript
// 1. Add to formDataTemplate.js
export const formDataTemplate = {
  // ... existing fields
  new_field: "default_value",
};

// 2. Add to App.js formData
const [formData] = useState({
  // ... existing fields
  new_field: "your_value",
});

// 3. Use in SolarSight.js
const value = formData.new_field;

// 4. Include in submission
const submissionData = {
  ...formData, // Automatically included
};
```

---

## Debugging Tips

### Check Workflow State

```javascript
console.log("Current workflow:", workflowState);
console.log("Array step:", arrayCreationStep);
```

### Check Array State

```javascript
console.log("Arrays:", arrays);
console.log("Current draft:", currentArrayDraft);
console.log("ArrayManager arrays:", arrayManager?.getAllArrays());
```

### Check Polygon State

```javascript
console.log("Polygons:", polygons);
console.log("Selected:", selectedPolygonIndex);
console.log("Pending:", pendingBuildingPolygon);
```

### Check Map State

```javascript
console.log("Map loaded:", isGoogleMapsLoaded);
console.log("Map initialized:", isMapInitialized);
console.log("Map ref:", mapRef.current);
```

### Check Drawing Manager

```javascript
console.log("Drawing manager:", drawingManagerRef.current);
console.log("Drawing mode:", drawingManagerRef.current?.getDrawingMode());
```

---

## Common Issues & Solutions

### Issue: "Loading Google Maps..." never goes away

**Solution**: Check `.env` file has correct API key, restart dev server

### Issue: Polygons not drawing

**Solution**: Check `workflowState` is 'building', check drawing manager is enabled

### Issue: Arrays not appearing

**Solution**: Check `workflowState` is 'arrays', check `isArrayCreationMode` is true

### Issue: Panels not generating

**Solution**: Check setback distance isn't too large, check formData has valid dimensions

### Issue: Submit returns empty layout

**Solution**: Check arrays are finalized (not in draft), check `useArrayMode` is true

---

## Testing Checklist

- [ ] Draw building polygon
- [ ] Edit building polygon vertices
- [ ] Draw obstructions
- [ ] Edit obstruction shapes
- [ ] Create array (origin)
- [ ] Rotate array
- [ ] Add rows (left/right)
- [ ] Add columns (up/down)
- [ ] Finalize array
- [ ] Create second array
- [ ] Edit existing array
- [ ] Delete array
- [ ] Submit layout
- [ ] Check console output
- [ ] Verify API call (if connected)

---

## Performance Optimization Tips

1. **Minimize re-renders**: Use React.memo for expensive components
2. **Lazy load panels**: Don't generate all panels at once
3. **Debounce drag events**: Limit panel regeneration during drag
4. **Use invisible polygons**: Hide setbacks to reduce rendering
5. **Cleanup on unmount**: Remove event listeners and polygons

---

## Extension Points

Want to add new features? Here are the best places:

### New Drawing Tool

- Create component in `src/Components/`
- Add to workflow state machine
- Render conditionally based on `workflowState`

### New Array Property

- Add to `ArrayManager.createArray()`
- Update `generateArrayPanels()` if affects rendering
- Include in `handleSaveLayout()` if needed in output

### New Validation

- Add to `handlePolygonComplete()` for buildings
- Add to `ObstructionDrawingTool` for obstructions
- Add to `ArrayManager.generateArrayPanels()` for arrays

### New Output Format

- Modify `handleSaveLayout()` to transform data
- Update `sendLayoutToAPI()` to match API requirements

---

## Useful Console Commands (Browser DevTools)

```javascript
// Get current state (if you expose it)
window.solarSightState = { workflowState, arrays, polygons };

// Force workflow transition
setWorkflowState("arrays");

// Inspect array manager
console.log(arrayManager.getAllArrays());

// Check Google Maps API
console.log(window.google.maps);

// Get all panels
console.log(polygons[0]?.panelPolygons?.panelPolygons);
```

---

## API Endpoint

**URL**: `https://api-training.pzse.com/api/internal/ballast/projects`  
**Method**: POST  
**Headers**:

- `Authorization: Bearer ${token}`
- `Content-Type: application/json`

**Body**: Full submission data from `handleSaveLayout()`

---

Need more details on any specific part? Check `SOLARSIGHT_CODE_ARCHITECTURE.md` for deep dives!
