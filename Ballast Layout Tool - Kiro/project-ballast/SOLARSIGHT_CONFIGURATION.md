# SolarSight Configuration Guide

## Quick Start

### 1. Set up Google Maps API Key

Create a `.env` file in your project root:

```env
REACT_APP_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

Get your API key from: https://console.cloud.google.com/google/maps-apis

### 2. Configure Your Project

Open `src/App.js` and customize the `formData` object with your project details.

## Complete formData Structure

### Panel Dimensions (in feet)

```javascript
pv_module_ew_width: "3.28",      // Panel width (East-West direction)
pv_module_ns_length: "5.58",     // Panel length (North-South direction)
pv_module_weight: "45",          // Panel weight in pounds
```

### Panel Spacing (in feet)

```javascript
distance_between_panels_ew: "0.16",   // Spacing between panels East-West
distance_between_panels_ns: "0.16",   // Spacing between panels North-South
```

### Setback Distances (in feet)

```javascript
setback_distance: "3",           // General setback distance
setback_distance_north: "3",     // North side setback
setback_distance_south: "3",     // South side setback
setback_distance_east: "3",      // East side setback
setback_distance_west: "3",      // West side setback
```

### Obstruction Setback (in feet)

```javascript
obstruction_setback_distance: "2",    // Setback around obstructions
```

### System Type

```javascript
sun_ballast_system: "north-south-system",  // or "east-west-system"
```

### East-West System Specific (only if sun_ballast_system = "east-west-system")

```javascript
ridge_gap: "0.5",                // Gap at ridge in feet
valley_gap: "0.5",               // Gap at valley in feet
roof_clearance: "3.2",           // Roof clearance in inches
```

### Tilt and Orientation

```javascript
tilt_angle: "10",                // Panel tilt angle in degrees
avg_roof_pitch: "0",             // Average roof pitch in degrees
```

### Structural Loads

```javascript
allowable_pv_dead_load: "5",     // Allowable PV dead load in psf
ground_snow_load: "25",          // Ground snow load in psf
wind_speed: "115",               // Design wind speed in mph
```

### Building Dimensions

```javascript
roof_height: "20",               // Roof height in feet
parapet_height: "3",             // Parapet height in feet
```

### Map Location (REQUIRED)

```javascript
latLng: {
  lat: 40.7128,                  // Latitude (decimal degrees)
  lng: -74.0060                  // Longitude (decimal degrees)
}
```

**How to find coordinates:**

1. Go to Google Maps
2. Right-click on your building location
3. Click on the coordinates to copy them
4. Paste into `latLng`

### Project Information (Optional)

```javascript
project_name: "My Solar Project",
project_address: "123 Main St, City, State",
```

## Example Configurations

### Example 1: Standard North-South System

```javascript
const [formData] = useState({
  pv_module_ew_width: "3.28",
  pv_module_ns_length: "5.58",
  pv_module_weight: "45",
  distance_between_panels_ew: "0.16",
  distance_between_panels_ns: "0.16",
  setback_distance: "3",
  setback_distance_north: "3",
  setback_distance_south: "3",
  setback_distance_east: "3",
  setback_distance_west: "3",
  obstruction_setback_distance: "2",
  sun_ballast_system: "north-south-system",
  tilt_angle: "10",
  avg_roof_pitch: "0",
  allowable_pv_dead_load: "5",
  ground_snow_load: "25",
  wind_speed: "115",
  roof_height: "20",
  parapet_height: "3",
  latLng: { lat: 40.7128, lng: -74.006 },
  project_name: "Standard Solar Array",
});
```

### Example 2: East-West System

```javascript
const [formData] = useState({
  pv_module_ew_width: "3.28",
  pv_module_ns_length: "5.58",
  pv_module_weight: "45",
  distance_between_panels_ew: "0.16",
  distance_between_panels_ns: "0.16",
  setback_distance: "3",
  setback_distance_north: "3",
  setback_distance_south: "3",
  setback_distance_east: "3",
  setback_distance_west: "3",
  obstruction_setback_distance: "2",
  sun_ballast_system: "east-west-system",
  ridge_gap: "0.5",
  valley_gap: "0.5",
  roof_clearance: "3.2",
  tilt_angle: "10",
  avg_roof_pitch: "0",
  allowable_pv_dead_load: "5",
  ground_snow_load: "25",
  wind_speed: "115",
  roof_height: "20",
  parapet_height: "3",
  latLng: { lat: 34.0522, lng: -118.2437 },
  project_name: "East-West Solar Array",
});
```

### Example 3: High Snow Load Area

```javascript
const [formData] = useState({
  pv_module_ew_width: "3.28",
  pv_module_ns_length: "5.58",
  pv_module_weight: "45",
  distance_between_panels_ew: "0.25", // Increased spacing
  distance_between_panels_ns: "0.25",
  setback_distance: "4", // Increased setback
  setback_distance_north: "4",
  setback_distance_south: "4",
  setback_distance_east: "4",
  setback_distance_west: "4",
  obstruction_setback_distance: "3",
  sun_ballast_system: "north-south-system",
  tilt_angle: "15", // Higher tilt for snow shedding
  avg_roof_pitch: "0",
  allowable_pv_dead_load: "5",
  ground_snow_load: "50", // High snow load
  wind_speed: "120",
  roof_height: "20",
  parapet_height: "3",
  latLng: { lat: 44.9778, lng: -93.265 },
  project_name: "High Snow Load Array",
});
```

## Using Pre-configured Examples

You can also use the pre-configured examples from `formDataTemplate.js`:

```javascript
import {
  northSouthExample,
  eastWestExample,
  highSnowExample,
} from "./formDataTemplate";

// Then in your App component:
const [formData] = useState(northSouthExample);
// or
const [formData] = useState(eastWestExample);
// or
const [formData] = useState(highSnowExample);
```

## How to Use SolarSight

1. **Draw Building Outline**: Click on the map to draw the building perimeter
2. **Add Obstructions**: Draw any roof obstructions (HVAC units, skylights, etc.)
3. **Create Panel Arrays**: Click and drag to create panel arrays
4. **Adjust Layout**: Use the controls to rotate, resize, and position arrays
5. **Submit**: Click "Submit Layout" to save your design

## Output Data

When you click "Submit Layout", the `handleSave` function receives:

```javascript
{
  ...formData,                    // All your input parameters
  lat: 40.7128,                   // Extracted from latLng
  lng: -74.0060,                  // Extracted from latLng
  panel_layout: [                 // Array of building polygons
    {
      polygon_id: 0,
      layout: [[true, false, ...]], // 2D grid of panel states
      building_width: 100.5,      // Calculated width in feet
      building_length: 150.2,     // Calculated length in feet
      building_area: 15100.1,     // Calculated area in sq ft
      building_rotation: 45.5,    // Building rotation in degrees
      vertices: [{lat, lng}, ...],// Building outline coordinates
      // ... more metadata
    }
  ]
}
```

## Troubleshooting

### "Loading Google Maps..." never goes away

- Check that your API key is correct in `.env`
- Restart your dev server after adding `.env`
- Check browser console for API errors

### Map doesn't center on my location

- Verify `latLng` coordinates are correct
- Coordinates should be in decimal degrees (not DMS format)

### Panels don't appear

- Check that setback distances aren't too large for your building
- Verify panel dimensions are reasonable
- Check browser console for errors

## Need Help?

Check the browser console (F12) for detailed error messages and logs.
