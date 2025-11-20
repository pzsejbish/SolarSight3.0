# Quick Start Testing Guide

## Step-by-Step Integration & Testing

### Phase 1: Basic Setup (15 minutes)

1. **Copy the new files into your project:**
   ```
   src/utils/ArrayManager.js
   src/utils/ArrayToGridReconciler.js
   src/Components/ArrayCreationTool.js
   src/Components/ArrayControlPanel.js
   ```

2. **Add imports to SolarSight.js:**
   - Open `SOLARSIGHT_CHANGES_REFERENCE.js`
   - Copy the imports section (lines 8-11)
   - Paste at the top of your `SolarSight.js`

3. **Add state variables:**
   - Copy the state variables section from `SOLARSIGHT_CHANGES_REFERENCE.js`
   - Paste after your existing `useState` declarations in `SolarSight.js`

4. **Test compilation:**
   ```bash
   npm start
   ```
   - Should compile without errors
   - App should load normally
   - New features not active yet

### Phase 2: Add ArrayManager Initialization (10 minutes)

1. **Add the initialization effect:**
   - Copy the `useEffect` for ArrayManager from `SOLARSIGHT_CHANGES_REFERENCE.js`
   - Paste in your effects section

2. **Add callback handlers:**
   - Copy all the `handleArray*` functions
   - Paste in your callbacks section

3. **Test:**
   - Draw a building polygon
   - Check console for "ArrayManager initialized"
   - Should see no errors

### Phase 3: Update UI (20 minutes)

1. **Replace the left sidebar:**
   - Find your existing sidebar `<div>` in the return statement
   - Replace with the new version from `SOLARSIGHT_CHANGES_REFERENCE.js`

2. **Add ArrayCreationTool to map:**
   - Find your map container
   - Add the `<ArrayCreationTool>` component after `<SolarSightMap>`

3. **Test UI:**
   - Should see "Array Mode (New)" toggle
   - Should see "Create New Array" button
   - Toggle should work
   - Old controls should still appear when toggled off

### Phase 4: Test Array Creation (15 minutes)

1. **Draw a building polygon:**
   - Use the polygon tool
   - Draw a simple rectangle
   - Should see setback polygon

2. **Enable array mode:**
   - Check "Array Mode (New)"
   - Click "Create New Array"
   - Button should turn green

3. **Create your first array:**
   - Click on the map (inside setback)
   - Drag horizontally → see panel count increase
   - Release mouse
   - Drag vertically → see column count
   - Release mouse → array finalizes

4. **Verify:**
   - Should see blue panels on map
   - Should see array in dropdown
   - Console should show "Array created"

### Phase 5: Test Array Manipulation (10 minutes)

1. **Select the array:**
   - Use dropdown to select "Array 1"
   - Panels should highlight with green border

2. **Test rotation:**
   - Enter "45" in rotation input
   - Click "Apply"
   - Array should rotate 45 degrees

3. **Test quick rotate:**
   - Click "+90°" button
   - Array should rotate 90 degrees more

4. **Test deletion:**
   - Click "Delete Array"
   - Confirm dialog
   - Array should disappear

### Phase 6: Test Submission (15 minutes)

1. **Create a simple layout:**
   - Draw polygon
   - Create 2-3 small arrays
   - Different sizes and rotations

2. **Submit:**
   - Click "Submit Layout"
   - Check console for reconciliation output
   - Look for:
     ```
     Reconciled layout: {
       rows: X,
       cols: Y,
       totalPanels: Z,
       selectedPanels: Z
     }
     ```

3. **Verify API payload:**
   - Check `Full submission data` in console
   - Should have `panel_layout` array
   - Each polygon should have `layout` 2D array
   - Should see `true`, `false`, `"non-value"` in grid

### Phase 7: Test Mode Toggle (10 minutes)

1. **Switch to old mode:**
   - Uncheck "Array Mode (New)"
   - Should see old controls (D-pad, etc.)
   - Arrays should disappear

2. **Switch back to new mode:**
   - Check "Array Mode (New)"
   - Arrays should reappear
   - Controls should switch

3. **Test both modes work:**
   - Create layout in old mode
   - Submit → should work
   - Create layout in new mode
   - Submit → should work

## Common Issues & Solutions

### Issue: ArrayManager not initializing

**Symptoms:**
- Console shows "ArrayManager is null"
- "Create New Array" button doesn't work

**Solution:**
```javascript
// Check that polygon has required properties
console.log('Polygon:', polygons[selectedPolygonIndex]);
// Should have: setbackPolygon, originalPolygon, totalRotationAngle
```

### Issue: Panels not appearing

**Symptoms:**
- Click and drag, but no panels show
- Console shows "Array created" but map is empty

**Solution:**
```javascript
// Check formData has panel dimensions
console.log('Panel dims:', {
  width: formData.pv_module_ew_width,
  length: formData.pv_module_ns_length,
  spacingEW: formData.distance_between_panels_ew,
  spacingNS: formData.distance_between_panels_ns
});
```

### Issue: Drag not working

**Symptoms:**
- Click on map, nothing happens
- No preview line appears

**Solution:**
```javascript
// Check creation mode is active
console.log('Creation mode:', isArrayCreationMode);
// Should be true when "Create New Array" is clicked

// Check map ref is valid
console.log('Map ref:', mapRef.current);
// Should be a Google Maps instance
```

### Issue: Rotation not working

**Symptoms:**
- Enter rotation, click Apply, nothing happens
- Console shows errors

**Solution:**
```javascript
// Check array is selected
console.log('Selected array:', selectedArrayId);
// Should be a number (1, 2, 3, etc.)

// Check arrayManager exists
console.log('ArrayManager:', arrayManager);
// Should be an ArrayManager instance
```

### Issue: Submission fails

**Symptoms:**
- Click Submit, console shows errors
- API returns 400/500 error

**Solution:**
```javascript
// Check reconciliation output
const reconciler = new ArrayToGridReconciler(
  formData,
  polygon.originalPolygon,
  polygon.setbackPolygon,
  polygon.totalRotationAngle
);
const result = reconciler.reconcile(arrayManager.getAllArrays());
console.log('Reconciliation result:', result);
// Should have grid and metadata
```

## Debug Console Commands

Open browser console and try these:

```javascript
// Check current state
console.log('Arrays:', arrays);
console.log('Selected:', selectedArrayId);
console.log('Creation mode:', isArrayCreationMode);

// Check ArrayManager
console.log('ArrayManager:', arrayManager);
console.log('All arrays:', arrayManager?.getAllArrays());

// Check specific array
const array = arrayManager?.getArray(1);
console.log('Array 1:', array);
console.log('Panels:', array?.panelPolygons.length);

// Test reconciliation manually
const reconciler = new ArrayToGridReconciler(
  formData,
  polygons[0].originalPolygon,
  polygons[0].setbackPolygon,
  polygons[0].totalRotationAngle
);
const result = reconciler.reconcile(arrayManager.getAllArrays());
console.log('Reconciled:', result);
```

## Performance Testing

### Test with Large Arrays

1. Create array with 50+ panels
2. Rotate it multiple times
3. Check for lag or stuttering
4. Monitor console for warnings

### Test with Multiple Arrays

1. Create 10+ arrays
2. Select different arrays
3. Rotate/move them
4. Check memory usage in DevTools

### Test Submission Performance

1. Create complex layout (5+ arrays)
2. Time the submission process
3. Check reconciliation time in console
4. Verify API response time

## Success Criteria

✅ **Basic Functionality**
- Can create arrays with click-and-drag
- Arrays appear on map correctly
- Can select arrays from dropdown
- Can rotate arrays
- Can delete arrays

✅ **Interaction**
- Preview lines show during drag
- Panel count updates in real-time
- Arrays highlight when selected
- Mode toggle works smoothly

✅ **Submission**
- Reconciliation completes without errors
- Grid format matches expected structure
- API accepts the payload
- Response is successful

✅ **Compatibility**
- Old mode still works
- Can switch between modes
- Existing layouts still load
- No breaking changes to API

## Next Steps After Testing

Once basic testing passes:

1. **Add array movement**
   - Drag origin point to move array
   - Update ArrayManager.moveArray()

2. **Add obstruction support**
   - Click panels to mark obstructions
   - Enter height values
   - Show text overlays

3. **Add array duplication**
   - Copy/paste functionality
   - Mirror arrays

4. **Polish UI**
   - Better visual feedback
   - Loading states
   - Error messages

5. **Add keyboard shortcuts**
   - Delete key for arrays
   - Arrow keys for nudging
   - Escape to cancel creation

## Getting Help

If you run into issues:

1. Check console for errors
2. Review the integration guide
3. Compare your code with reference implementation
4. Test with simple cases first
5. Add console.log statements to debug

Remember: This is a significant architectural change. Take it slow, test incrementally, and don't hesitate to ask questions!
