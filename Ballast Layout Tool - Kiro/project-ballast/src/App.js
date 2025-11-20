import React, { useState } from 'react';
import SolarSight from './SolarSight';
import './App.css';

/**
 * Simplified App.js for SolarSight 3.0
 * This is a standalone demo that runs SolarSight without authentication or routing
 */

function App() {
  // Sample form data - customize these values for your project
  const [formData] = useState({
    // Panel dimensions (in feet)
    pv_module_ew_width: "3.28",
    pv_module_ns_length: "5.58",
    distance_between_panels_ew: "0.16",
    distance_between_panels_ns: "0.16",
    
    // Setback distances (in feet)
    setback_distance_north: "3",
    setback_distance_south: "3",
    setback_distance_east: "3",
    setback_distance_west: "3",
    
    // Obstruction setback (in feet)
    obstruction_setback_distance: "5",
  });

  const handleSave = (data) => {
    console.log('SolarSight data saved:', data);
    // TODO: Send this data to your backend
    // Example: fetch('/api/save-layout', { method: 'POST', body: JSON.stringify(data) })
  };

  return (
    <div className="App">
      <SolarSight 
        formData={formData}
        onSave={handleSave}
      />
    </div>
  );
}

export default App;