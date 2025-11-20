# SolarSight Tool - Port Checklist

This document lists all files needed to port the SolarSight tool to a different repository.

## Core Component
- **src/SolarSight.js** - Main component that orchestrates the entire tool

## Sub-Components (src/Components/)
- **ArrayCreationTool.js** - Handles interactive array creation with click-and-drag
- **ArrayControlPanel.js** - UI panel for managing existing arrays (edit, delete, select)
- **ArrayWorkflowPanel.js** - Step-by-step workflow UI for array creation
- **ObstructionDrawingTool.js** - Tool for drawing obstruction polygons
- **WorkflowControlPanel.js** - Main workflow navigation (Building → Obstructions → Arrays)
- **ErrorBoundary.js** - React error boundary for graceful error handling

## Utilities (src/utils/)
- **ArrayManager.js** - Core class managing array data structures and operations
- **ArrayToGridReconciler.js** - Converts discrete arrays into giant grid format for Excel
- **ObstructionSetback.js** - Calculates setback polygons around obstructions
- **PolygonProcessing.js** - Helper functions for polygon operations

## Optional/Nice-to-Have
- **cn.ts** - Utility for merging Tailwind classes (if using Tailwind)

## Dependencies Required

### NPM Packages
```json
{
  "@googlemaps/js-api-loader": "^1.x.x",
  "react": "^18.x.x",
  "react-dom": "^18.x.x"
}
```

### Google Maps API
- Requires Google Maps JavaScript API key
- Must enable: Maps JavaScript API, Places API, Geometry Library

## Integration Requirements

### Props SolarSight Expects
```javascript
<SolarSight
  formData={{
    // Panel dimensions
    pv_module_ew_width: "3.28",        // feet
    pv_module_ns_length: "5.58",       // feet
    distance_between_panels_ew: "0.16", // feet
    distance_between_panels_ns: "0.16", // feet
    
    // Setback distances
    setback_distance_north: "3",        // feet
    setback_distance_south: "3",
    setback_distance_east: "3",
    setback_distance_west: "3",
    
    // Obstruction setbacks
    obstruction_setback_distance: "5",  // feet
    
    // Optional: pre-loaded data
    building_coordinates: [...],        // array of {lat, lng}
    obstruction_coordinates: [...],     // array of obstruction objects
    array_data: [...]                   // array of saved arrays
  }}
  onSave={(data) => {
    // Called when user saves
    // data contains: building, obstructions, arrays
  }}
  googleMapsApiKey="YOUR_API_KEY"
/>
```

### Form Data Structure
Your form must provide these fields (can be named differently, just map them):
- Panel physical dimensions (width, length)
- Panel spacing (EW and NS)
- Setback distances (N, S, E, W)
- Obstruction setback distance

## Environment Variables
Create a `.env` file:
```
REACT_APP_GOOGLE_MAPS_API_KEY=your_api_key_here
```

## Styling Notes
- Components use inline styles primarily
- Some Tailwind classes if you include `cn.ts`
- Minimal external CSS dependencies

## Key Features Included
1. **Building Drawing** - Click to draw building polygon
2. **Automatic Setback** - Calculates setback polygon from building
3. **Obstruction Drawing** - Draw obstruction polygons with automatic setbacks
4. **Array Creation** - Interactive 4-directional array placement
5. **Array Editing** - Edit existing arrays (resize, reposition, rotate)
6. **Array Management** - Select, delete, duplicate arrays
7. **Excel Export** - Converts arrays to giant grid format

## Files NOT Needed (Project-Specific)
- src/App.js
- src/Home.js
- src/FormDataContext.js
- src/BuildingCharacteristics.js
- src/LayoutWizard.js
- Any other form/routing components

## Migration Steps

1. **Copy Core Files**
   - Copy all files listed in "Core Component", "Sub-Components", and "Utilities" sections

2. **Install Dependencies**
   ```bash
   npm install @googlemaps/js-api-loader
   ```

3. **Set Up Environment**
   - Add Google Maps API key to `.env`
   - Enable required Google Maps APIs in console

4. **Create Form Adapter**
   - Map your form fields to the expected `formData` structure
   - Ensure all required fields are provided

5. **Integrate Component**
   ```javascript
   import SolarSight from './SolarSight';
   
   function YourComponent() {
     const [formData, setFormData] = useState({
       pv_module_ew_width: "3.28",
       // ... other fields
     });
     
     const handleSave = (data) => {
       console.log('Saved:', data);
       // Send to your backend
     };
     
     return (
       <SolarSight
         formData={formData}
         onSave={handleSave}
         googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}
       />
     );
   }
   ```

6. **Test Workflow**
   - Building drawing
   - Obstruction drawing
   - Array creation
   - Array editing
   - Save functionality

## Common Issues

### Google Maps Not Loading
- Check API key is valid
- Verify APIs are enabled in Google Cloud Console
- Check browser console for specific errors

### Panels Not Appearing
- Verify formData has correct panel dimensions
- Check setback polygon is valid
- Ensure building polygon is drawn correctly

### Arrays Not Saving Dimensions
- This was just fixed! Make sure you have the latest SolarSight.js
- Arrays now properly save dimensions when finalized

## Support Files (Optional Documentation)
- ARRAY_SYSTEM_ARCHITECTURE.md - Technical architecture overview
- ARRAY_INTEGRATION_GUIDE.md - Integration guide
- OBSTRUCTION_WORKFLOW_GUIDE.md - Obstruction feature guide
- QUICK_START_TESTING.md - Testing guide
