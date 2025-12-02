import React, { useState } from "react";
import { LoadScript } from "@react-google-maps/api";
import SolarSight from "./SolarSight";
import "./App.css";

// Import the form data templates
import {
  formDataTemplate,
  northSouthExample,
  eastWestExample,
  highSnowExample,
} from "./formDataTemplate";

/**
 * Simplified App.js for SolarSight 3.0
 * This is a standalone demo that runs SolarSight without authentication or routing
 */

// Google Maps libraries to load
const libraries = ["drawing", "geometry"];

// Replace with your actual Google Maps API key
const GOOGLE_MAPS_API_KEY =
  process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "YOUR_API_KEY_HERE";

function App() {
  // ============================================
  // CUSTOMIZE YOUR PROJECT HERE
  // ============================================
  // Option 1: Use one of the example configurations
  // const [formData] = useState(northSouthExample);
  // const [formData] = useState(eastWestExample);
  // const [formData] = useState(highSnowExample);

  // Option 2: Create your own custom configuration
  const [formData] = useState({
    // ============================================
    // PANEL DIMENSIONS (in feet)
    // ============================================
    pv_module_ew_width: "3.28", // Panel width (East-West) in feet
    pv_module_ns_length: "5.58", // Panel length (North-South) in feet
    pv_module_weight: "45", // Panel weight in pounds

    // ============================================
    // PANEL SPACING (in feet)
    // ============================================
    distance_between_panels_ew: "0.16", // Spacing between panels East-West
    distance_between_panels_ns: "0.16", // Spacing between panels North-South

    // ============================================
    // SETBACK DISTANCES (in feet)
    // ============================================
    setback_distance: "3", // General setback distance
    setback_distance_north: "3",
    setback_distance_south: "3",
    setback_distance_east: "3",
    setback_distance_west: "3",

    // ============================================
    // OBSTRUCTION SETBACK (in feet)
    // ============================================
    obstruction_setback_distance: "2",

    // ============================================
    // SYSTEM TYPE
    // ============================================
    // Options: "north-south-system" or "east-west-system"
    sun_ballast_system: "north-south-system",

    // ============================================
    // EAST-WEST SYSTEM SPECIFIC (only needed if sun_ballast_system = "east-west-system")
    // ============================================
    // ridge_gap: "0.5",                  // Uncomment for east-west system
    // valley_gap: "0.5",                 // Uncomment for east-west system
    // roof_clearance: "3.2",             // Uncomment for east-west system

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
    // MAP LOCATION (REQUIRED - Change this to your project location!)
    // ============================================
    latLng: {
      lat: 38.75465, // Latitude - Roseville, CA
      lng: -121.25004, // Longitude - Roseville, CA
    },

    // ============================================
    // PROJECT INFORMATION (Optional)
    // ============================================
    project_name: "Stone Point Solar Project",
    project_address: "1478 Stone Point Dr, Roseville, CA 95661",
  });

  const handleSave = (data) => {
    console.log("SolarSight data saved:", data);
    console.log(
      "Total panels selected:",
      data.panel_layout?.reduce((sum, polygon) => {
        const selected = polygon.layout
          .flat()
          .filter((cell) => cell === true).length;
        return sum + selected;
      }, 0)
    );
    // TODO: Send this data to your backend
    // Example: fetch('/api/save-layout', { method: 'POST', body: JSON.stringify(data) })
  };

  return (
    <div className="App">
      <LoadScript
        googleMapsApiKey={GOOGLE_MAPS_API_KEY}
        libraries={libraries}
        loadingElement={
          <div
            style={{
              height: "100vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              color: "#666",
            }}
          >
            Loading Google Maps...
          </div>
        }
      >
        <SolarSight formData={formData} onSave={handleSave} />
      </LoadScript>
    </div>
  );
}

export default App;
