/**
 * Complete formData structure for SolarSight
 * Fill in the values below and use this in App.js
 */

export const formDataTemplate = {
  // ============================================
  // PANEL DIMENSIONS (in feet)
  // ============================================
  pv_module_ew_width: "3.28", // Panel width (East-West direction) in feet
  pv_module_ns_length: "5.58", // Panel length (North-South direction) in feet
  pv_module_weight: "45", // Panel weight in pounds

  // ============================================
  // PANEL SPACING (in feet)
  // ============================================
  distance_between_panels_ew: "0.16", // Spacing between panels East-West in feet
  distance_between_panels_ns: "0.16", // Spacing between panels North-South in feet

  // ============================================
  // SETBACK DISTANCES (in feet)
  // ============================================
  setback_distance: "3", // General setback distance in feet
  setback_distance_north: "3", // North side setback in feet
  setback_distance_south: "3", // South side setback in feet
  setback_distance_east: "3", // East side setback in feet
  setback_distance_west: "3", // West side setback in feet

  // ============================================
  // OBSTRUCTION SETBACK (in feet)
  // ============================================
  obstruction_setback_distance: "2", // Setback around obstructions in feet

  // ============================================
  // SYSTEM TYPE
  // ============================================
  // Options: "north-south-system" or "east-west-system"
  sun_ballast_system: "north-south-system",

  // ============================================
  // EAST-WEST SYSTEM SPECIFIC (only if sun_ballast_system = "east-west-system")
  // ============================================
  ridge_gap: "0.5", // Gap at ridge in feet (for east-west)
  valley_gap: "0.5", // Gap at valley in feet (for east-west)
  roof_clearance: "3.2", // Roof clearance in inches (for east-west)

  // ============================================
  // TILT AND ORIENTATION
  // ============================================
  tilt_angle: "10", // Panel tilt angle in degrees
  avg_roof_pitch: "0", // Average roof pitch in degrees

  // ============================================
  // STRUCTURAL LOADS
  // ============================================
  allowable_pv_dead_load: "5", // Allowable PV dead load in psf
  ground_snow_load: "25", // Ground snow load in psf
  wind_speed: "115", // Design wind speed in mph

  // ============================================
  // BUILDING DIMENSIONS
  // ============================================
  roof_height: "20", // Roof height in feet
  parapet_height: "3", // Parapet height in feet

  // ============================================
  // MAP LOCATION (REQUIRED)
  // ============================================
  latLng: {
    lat: 40.7128, // Latitude (decimal degrees)
    lng: -74.006, // Longitude (decimal degrees)
  },

  // ============================================
  // PROJECT INFORMATION (Optional)
  // ============================================
  project_name: "Sample Solar Project",
  project_address: "1478 Stone Point Dr, Roseville, CA 95661",

  // ============================================
  // ADDITIONAL FIELDS (Optional - for API submission)
  // ============================================
  // These will be added automatically during save:
  // - lat: extracted from latLng.lat
  // - lng: extracted from latLng.lng
  // - panel_layout: generated from the layout
  // - building_width: calculated from polygon
  // - building_length: calculated from polygon
  // - building_area: calculated from polygon
  // - building_rotation: calculated from polygon
};

/**
 * EXAMPLE CONFIGURATIONS
 */

// Example 1: North-South System (Standard)
export const northSouthExample = {
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
  latLng: { lat: 38.75465, lng: -121.25004 },
  project_name: "North-South Solar Array",
};

// Example 2: East-West System
export const eastWestExample = {
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
  latLng: { lat: 38.75465, lng: -121.25004 },
  project_name: "East-West Solar Array",
};

// Example 3: High Snow Load Area
export const highSnowExample = {
  pv_module_ew_width: "3.28",
  pv_module_ns_length: "5.58",
  pv_module_weight: "45",
  distance_between_panels_ew: "0.25", // Increased spacing for snow
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
  latLng: { lat: 38.75465, lng: -121.25004 },
  project_name: "High Snow Load Array",
};
