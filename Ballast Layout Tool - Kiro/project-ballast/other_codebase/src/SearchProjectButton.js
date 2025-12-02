import React, { useState } from 'react';
import Swal from 'sweetalert2';

const SearchProjectButton = ({ formData, setFormData, selectLayoutMethod, setIsPopulating }) => {
  const [projectID, setProjectID] = useState('');
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    setProjectID(e.target.value);
  };

  const gridCriticalParams = [
    'pv_module_ns_length',
    'pv_module_ew_width',
    'distance_between_panels_ns',
    'distance_between_panels_ew',
    'setback_distance'
  ];

  const handleSearch = async () => {
    const authToken = localStorage.getItem('authToken');

    if (!authToken) {
      setError("You must be logged in to search for a project.");
      return;
    }

    try {
      setIsPopulating(true);

      const response = await fetch(`https://api-training.pzse.com/api/internal/ballast/projects/${projectID}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const projectData = await response.json();
        console.log('Project data retrieved:', projectData);

        // Check if it's a map-based layout
        const isMapBasedLayout = projectData.result.panel_layout?.some(layout => 'polygon_id' in layout);

        console.log('Map layout detection:', {
          isMapBasedLayout,
          hasLayout: Boolean(projectData.result.panel_layout),
          layoutData: projectData.result.panel_layout
        });

        // Store the original grid parameters
        const originalGridParams = {};
        gridCriticalParams.forEach(param => {
          // Only store non-null values
          if (projectData.result[param] !== null && projectData.result[param] !== undefined) {
            originalGridParams[param] = projectData.result[param];
          }
        });

        console.log('Original grid params:', originalGridParams);

        // Create new form data preserving existing structure
        setFormData(prevData => {
          const newData = { ...prevData };
          
          // Function to safely update a field
          const safeUpdate = (key, value) => {
            if (value !== null && value !== undefined) {
              newData[key] = value;
            }
          };

          // Update all fields from project data
          safeUpdate('full_address', projectData.result.full_address);
          safeUpdate('street_address', projectData.result.street_address);
          safeUpdate('city', projectData.result.city);
          safeUpdate('state', projectData.result.state);
          safeUpdate('zip', projectData.result.zip);
          safeUpdate('latLng', {
            lat: projectData.result.lat,
            lng: projectData.result.lng
          });
          safeUpdate('tilt_angle', projectData.result.tilt_angle);
          safeUpdate('pv_module_weight', projectData.result.pv_module_weight);
          safeUpdate('pv_module_ns_length', projectData.result.pv_module_ns_length);
          safeUpdate('pv_module_ew_width', projectData.result.pv_module_ew_width);
          safeUpdate('ballast_stone', projectData.result.ballast_stone);
          safeUpdate('allowable_pv_dead_load', projectData.result.allowable_pv_dead_load);
          safeUpdate('avg_roof_pitch', projectData.result.avg_roof_pitch);
          safeUpdate('roof_height', projectData.result.roof_height);
          safeUpdate('parapet_height', projectData.result.parapet_height);
          safeUpdate('ground_snow_load', projectData.result.ground_snow_load);
          safeUpdate('wind_speed', projectData.result.wind_speed);
          safeUpdate('exposure_category', projectData.result.exposure_category);
          safeUpdate('distance_between_panels_ns', projectData.result.distance_between_panels_ns);
          safeUpdate('distance_between_panels_ew', projectData.result.distance_between_panels_ew);
          safeUpdate('setback_distance', projectData.result.setback_distance);
          safeUpdate('risk_category', projectData.result.risk_category);
          safeUpdate('panel_layout', projectData.result.panel_layout || []);

          // Add map-based flags
          newData._isMapBased = isMapBasedLayout;
          newData._originalGridParams = originalGridParams;

          console.log('Updated form data:', newData);
          return newData;
        });

        selectLayoutMethod(isMapBasedLayout ? "map" : "rectangular");
        setError(null);
        setIsPopulating(false);

      } else {
        setError('Failed to retrieve project. Please check the Project ID and try again.');
        setIsPopulating(false);
      }
    } catch (err) {
      console.error('Error fetching project data:', err);
      setError('An error occurred while retrieving the project. Please try again later.');
      setIsPopulating(false);
    }
  };

  return (
    <div className="address-input-container">
      <div className="label-input-wrapper">
        <label
          className="block text-sm font-medium leading-6 text-gray-900"
          htmlFor="project-id"
        >
          Project ID
        </label>
        <input
          id="project-id"
          className="block w-full rounded border-0 py-1.5 pl-5 pr-5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-900 sm:text-sm sm:leading-6"
          name="project-id"
          type="number"
          placeholder="Enter Project ID"
          value={projectID}
          onChange={handleInputChange}
          min="0"
        />
      </div>
      <button
        className="mt-4 bg-blue-900 text-white py-2 px-4 rounded"
        onClick={handleSearch}
      >
        Search
      </button>

      {error && <div className="text-red-500 mt-2">{error}</div>}
    </div>
  );
};

export default SearchProjectButton;