import React, { useState } from 'react';
import { LoadScript } from '@react-google-maps/api';
import SolarSight from './SolarSight';
import './App.css';

/**
 * Simplified App.js for SolarSight 3.0
 * This is a standalone demo that runs SolarSight without authentication or routing
 */

// Google Maps libraries to load
const libraries = ['drawing', 'geometry', 'places'];

function App() {
  console.log('🚀 App component rendering');
  console.log('🔑 API Key:', process.env.REACT_APP_GOOGLE_MAPS_API_KEY ? 'Present' : 'MISSING');
  
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

  console.log('📦 Rendering LoadScript with libraries:', libraries);
  
  return (
    <LoadScript
      googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}
      libraries={libraries}
      loadingElement={
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          fontSize: '24px',
          color: '#666'
        }}>
          <div>
            <div>Loading Google Maps...</div>
            <div style={{ fontSize: '14px', marginTop: '10px' }}>
              Check console for details
            </div>
          </div>
        </div>
      }
      onLoad={() => {
        console.log('✅ LoadScript onLoad - Google Maps API loaded successfully!');
        console.log('🌍 window.google:', window.google ? 'Available' : 'NOT AVAILABLE');
      }}
      onError={(error) => {
        console.error('❌ LoadScript onError:', error);
      }}
    >
      <div className="App">
        {console.log('🎨 Rendering SolarSight component')}
        <SolarSight 
          formData={formData}
          onSave={handleSave}
        />
      </div>
    </LoadScript>
  );
}

export default App;