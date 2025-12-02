# Auto-Detection Feature Integration

## Overview

Successfully integrated the auto-detection feature from the other branch into Step 1 (Building Outline) of the main application. Users now have **two options** for creating building outlines:

1. **Auto-Detection** - Import roof data from Google Solar API
2. **Manual Drawing** - Click points on the map to draw manually

## Changes Made

### 1. New Components Added

- **`src/Components/RoofImportTool.js`** - UI component for address input and auto-detection
- **`src/utils/GoogleSolarAPI.js`** - Utility functions for fetching and processing Google Solar API data

### 2. Modified Files

#### `src/SolarSight.js`

- Added import for `RoofImportTool` component
- Added `handleRoofImported` callback function to process imported roof data
- Added `RoofImportTool` component to the JSX (renders in Step 1 - Building workflow)
- The tool appears above the workflow control panel when in "building" state

#### `src/Components/WorkflowControlPanel.js`

- Updated Step 1 label from "Draw Building Outline" to "Building Outline"
- Updated Step 1 description to "Auto-detect from address or draw manually"
- Added helper tip for building step: "🌞 Use auto-detect above or click on the map to draw manually"

### 3. Dependencies

The following npm packages are required (already installed):

- `geotiff` - For processing GeoTIFF data from Solar API
- `geotiff-geokeys-to-proj4` - For coordinate transformations
- `proj4` - For projection conversions

## How It Works

### User Flow

1. User enters Step 1 (Building Outline)
2. User sees the **RoofImportTool** at the top of the sidebar with:
   - Address input field with Google Places autocomplete
   - Two buttons:
     - 🏢 Auto-Detect Roof (Commercial) - Single polygon, aggressive simplification
     - 🏠 Auto-Detect Roof (Residential) - Traces actual roof geometry from GeoTIFF
3. User can either:
   - **Option A**: Enter an address and click auto-detect
   - **Option B**: Click on the map to draw manually
4. If auto-detect is used:
   - System fetches building data from Google Solar API
   - User chooses between single building or multiple segments
   - Polygon is automatically created and placed on the map
   - User transitions to "building-edit" state to adjust if needed
5. User clicks "Next" to proceed to obstructions

### Technical Details

#### Auto-Detection Process

1. **Geocoding**: Address is converted to lat/lng coordinates
2. **Solar API Query**: Fetches building insights for the location
3. **Polygon Generation**:
   - Commercial: Creates simplified single polygon from roof segments
   - Residential: Traces actual roof geometry using GeoTIFF height data
4. **Polygon Creation**: Google Maps Polygon object is created with the vertices
5. **State Update**: Polygon is stored as `pendingBuildingPolygon` and workflow transitions to "building-edit"

#### Key Functions

- `handleRoofImported(roofData)` - Processes imported roof data and creates polygon
- `geocodeAddress(address, google)` - Converts address to coordinates
- `findClosestBuilding(location, apiKey)` - Fetches building data from Solar API
- `createEdgeDetectedOutline(buildingInsights, apiKey)` - Creates accurate building outline
- `extractRoofSegmentsFromGeoTIFF(buildingInsights, apiKey)` - Extracts roof segments from height data

## Environment Variables

Make sure the following environment variable is set in your `.env` file:

```
REACT_APP_GOOGLE_MAPS_API_KEY=your_api_key_here
```

The API key needs to have the following APIs enabled:

- Google Maps JavaScript API
- Google Places API
- Google Solar API

## Testing

To test the feature:

1. Start the application
2. Navigate to the solar layout tool
3. Enable "Array Mode" (toggle at top of sidebar)
4. You should be in Step 1 (Building Outline)
5. Enter a test address (e.g., "1478 Stone Point Drive, Roseville, CA 95661")
6. Click either auto-detect button
7. Verify the building outline appears on the map
8. Adjust the outline if needed
9. Click "Next" to proceed

## Benefits

- **Faster workflow**: No need to manually trace complex building shapes
- **More accurate**: Uses actual building data from Google's satellite imagery
- **Flexible**: Users can still draw manually if auto-detect doesn't work for their location
- **User-friendly**: Clear options and guidance at each step

## Future Enhancements

- Support for importing multiple building segments as separate polygons
- Ability to merge/split auto-detected segments
- Preview of detected building before importing
- Fallback to manual drawing if API fails
