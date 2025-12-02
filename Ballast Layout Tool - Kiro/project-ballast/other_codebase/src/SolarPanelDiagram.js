import React, { useState, useEffect } from "react";
import PanelSVG from "./Components/PanelSVG";
import Swal from 'sweetalert2';

const SolarPanelDiagram = ({ formData, setFormData }) => {
  const [errors, setErrors] = useState({
    pv_module_ns_length: "",
    distance_between_panels_ns: "",
    roof_clearance: "",
    ridge_gap: "",
    ratio: ""
  });
  const [tempValues, setTempValues] = useState({});
  const [systemType, setSystemType] = useState(formData.sun_ballast_system || "south-face-system");
  const [eastWestGaps, setEastWestGaps] = useState({
    ridgeGap: formData.ridge_gap ? (parseFloat(formData.ridge_gap) * 12).toString() : "", // Convert from ft to inches
    valleyGap: formData.valley_gap ? (parseFloat(formData.valley_gap) * 12).toString() : "", // Convert from ft to inches
    moduleGap: formData.distance_between_panels_ew ? (parseFloat(formData.distance_between_panels_ew) * 12).toString() : "" // Convert from ft to inches
  });
  const [calculationResults, setCalculationResults] = useState({
    rowSpacing: 0,
    systemHeight: 0,
    ratio: 0
  });

  const gridCriticalParams = [
    'pv_module_ns_length',
    'pv_module_ew_width',
    'distance_between_panels_ns',
    'distance_between_panels_ew',
    'ridge_gap',
    'valley_gap'
  ];

  // Calculate East-West system metrics
  // Update calculateEastWestMetrics to use consistent defaults that match UI
  const calculateEastWestMetrics = (formValues) => {
    if (systemType !== "east-west-system") return null;
    
    // Get values from form (with fallbacks to defaults that match UI)
    const panelChordLength = parseFloat(formValues.pv_module_ns_length || 0) * 12; // Convert ft to inches
    const roofClearance = parseFloat(formValues.roof_clearance || 3.2); // Match UI default
    const ridgeGap = parseFloat(eastWestGaps.ridgeGap || 1.6); // Match UI default
    const valleyGap = parseFloat(eastWestGaps.valleyGap || 5.9); // Use correct value (32 inches = 2.67 ft)
    const tiltAngle = parseFloat(formValues.tilt_angle || 10); // Default to 10 degrees
    
    console.log("Calculation inputs:", {
      panelChordLength,
      roofClearance,
      ridgeGap,
      valleyGap,
      tiltAngle
    });
    
    // Convert tilt angle to radians for Math functions
    const tiltRadians = tiltAngle * Math.PI / 180;
    
    // Calculate row spacing and system height
    const rowSpacing = ridgeGap + (2 * panelChordLength * Math.cos(tiltRadians)) + valleyGap;
    const systemHeight = roofClearance + (panelChordLength * Math.sin(tiltRadians));
    
    // Calculate the ratio
    const ratio = systemHeight > 0 ? rowSpacing / systemHeight : 0;
    
    return {
      rowSpacing,
      systemHeight,
      ratio
    };
  };

  // Update formData when systemType changes
  useEffect(() => {
    if (systemType !== formData.sun_ballast_system) {
      // When switching to east-west system, set system-specific defaults
      if (systemType === "east-west-system") {
        // Define east-west system defaults
        const eastWestDefaults = {
          sun_ballast_system: systemType,
          // If ridge_gap is not already set, default to 1.57/12 feet (converting from inches)
          ridge_gap: formData.ridge_gap || (1.6/12).toString(),
          // If valley_gap not set, default to 32/12 feet (converting from inches)
          valley_gap: formData.valley_gap || (2.67/12).toString(),
          // Set a different default for module gapping - for example 0.5 inches converted to feet
          distance_between_panels_ew: (0.5/12).toString()
        };
        
        setFormData(prevData => ({
          ...prevData,
          ...eastWestDefaults
        }));
        
        // Also update the display values
        setEastWestGaps({
          ridgeGap: formData.ridge_gap ? (parseFloat(formData.ridge_gap) * 12).toString() : "1.6",
          valleyGap: formData.valley_gap ? (parseFloat(formData.valley_gap) * 12).toString() : "5.9",
          moduleGap: "0.5" // Direct default in inches
        });
      } else {
        const southfaceDefaults = {
          distance_between_panels_ew: (0.3).toString()
        };
        // Just update the system type when switching to south face
        setFormData(prevData => ({
          ...prevData,
          ...southfaceDefaults,
          sun_ballast_system: systemType
        }));
      }
  
      // If this is a map-based layout and the system type is changed, warn about layout regeneration
      if (formData._isMapBased) {
        Swal.fire({
          title: 'Warning: System Type Change',
          text: 'Changing the system type will require regenerating the panel layout. Your existing panel positions will be cleared, but the roof outline will be preserved.',
          icon: 'warning',
          confirmButtonText: 'OK'
        });
      }
    }
  }, [systemType, setFormData, formData._isMapBased, formData.ridge_gap, formData.valley_gap]);

  useEffect(() => {
    if (systemType === "east-west-system") {
      setEastWestGaps({
        ridgeGap: formData.ridge_gap ? (parseFloat(formData.ridge_gap) * 12).toString() : "", // Convert from ft to inches
        valleyGap: formData.valley_gap ? (parseFloat(formData.valley_gap) * 12).toString() : "", // Convert from ft to inches
        moduleGap: formData.distance_between_panels_ew ? (parseFloat(formData.distance_between_panels_ew) * 12).toString() : "" // Convert from ft to inches
      });
    }
  }, [formData.ridge_gap, formData.valley_gap, formData.distance_between_panels_ew, systemType]);

  // Calculate East-West system metrics when relevant values change
  useEffect(() => {
    if (systemType === "east-west-system") {
      const results = calculateEastWestMetrics(formData);
      if (results) {
        setCalculationResults(results);
        
        // Validate the ratio against the limitation
        let newErrors = { ...errors };
        
        // Check panel chord length (converted to inches)
        const panelChordLength = parseFloat(formData.pv_module_ns_length || 0) * 12;
        if (panelChordLength > 49.21) {
          newErrors.pv_module_ns_length = "Panel East-West dimension must be ≤ 49.21 inches (4.1 ft)";
        }
        
        // Check row spacing to system height ratio
        if (results.ratio > 8.3) {
          newErrors.ratio = "Row spacing / System height ratio must be ≤ 8.3";
        } else {
          newErrors.ratio = "";
        }
        
        setErrors(newErrors);
      }
    }
  }, [formData.pv_module_ns_length, formData.roof_clearance, eastWestGaps.ridgeGap, 
      eastWestGaps.valleyGap, formData.tilt_angle, systemType]);

  useEffect(() => {
    console.log('SolarPanelDiagram formData updated:', {
      isMapBased: formData._isMapBased,
      originalParams: formData._originalGridParams,
      currentValues: {
        pv_module_ns_length: formData.pv_module_ns_length,
        pv_module_ew_width: formData.pv_module_ew_width,
        distance_between_panels_ns: formData.distance_between_panels_ns,
        distance_between_panels_ew: formData.distance_between_panels_ew,
        ridge_gap: formData.ridge_gap,
        valley_gap: formData.valley_gap,
        sun_ballast_system: formData.sun_ballast_system,
        tilt_angle: formData.tilt_angle,
        roof_clearance: formData.roof_clearance
      }
    });
  }, [formData]);

  const validateRidgeGapAndRoofClearance = (ridgeGap, roofClearance) => {
    // Only validate if both values exist
    if (ridgeGap !== "" && roofClearance !== "") {
      const ridgeGapValue = parseFloat(ridgeGap);
      const roofClearanceValue = parseFloat(roofClearance);
      const minRidgeGap = 0.5 * roofClearanceValue; // Both are in inches now
      
      if (ridgeGapValue < minRidgeGap) {
        // Ridge gap is too small based on roof clearance
        return {
          isValid: false,
          message: `Ridge gap must be at least ${minRidgeGap.toFixed(2)} inches (50% of roof clearance)`
        };
      }
    }
    return { isValid: true, message: "" };
  };

  const handleInputChange = async (e) => {
    const { name, value } = e.target;
    let newErrors = { ...errors }; // Initialize newErrors
  
    if (name === 'pv_module_ns_length') {
      const numericValue = parseFloat(value);
      if (numericValue > 4) {
        newErrors.pv_module_ns_length = "Panel chord length must be 4 ft or less";
        setErrors(newErrors);
        return;
      } else {
        newErrors.pv_module_ns_length = "";
      }
    } else if (name === 'distance_between_panels_ns') {
      const numericValue = parseFloat(value);
      if (numericValue > 4) {
        newErrors.distance_between_panels_ns = "Row gapping must be 4 ft or less";
        setErrors(newErrors);
        return;
      } else {
        newErrors.distance_between_panels_ns = "";
      }
    } else if (name === 'roof_clearance') {
      const numericValue = parseFloat(value);
      if (numericValue > 3.4) {
        newErrors.roof_clearance = "Roof clearance must be under 3.4 inches (87mm) per wind tunnel report";
      } else {
        newErrors.roof_clearance = "";
        
        // Check ridge gap relation when roof clearance changes
        const ridgeGap = eastWestGaps.ridgeGap;
        const validation = validateRidgeGapAndRoofClearance(ridgeGap, value);
        if (!validation.isValid) {
          newErrors.ridge_gap = validation.message;
        } else {
          newErrors.ridge_gap = "";
        }
      }
    }
  
    // Store the value temporarily while user is typing
    setTempValues(prev => ({
      ...prev,
      [name]: value
    }));
  
    // Update errors state
    setErrors(newErrors);
  
    // Update form immediately for non-critical params or non-map-based layouts
    if (!formData._isMapBased || !gridCriticalParams.includes(name)) {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Special handler for East-West gap fields
  const handleEastWestGapChange = (e) => {
    const { name, value } = e.target;
    
    // Update the local state
    setEastWestGaps(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Map to the appropriate form data field names
    let formFieldName;
    if (name === "ridgeGap") {
      formFieldName = "ridge_gap";
    } else if (name === "valleyGap") {
      formFieldName = "valley_gap";
    } else if (name === "moduleGap") {
      formFieldName = "distance_between_panels_ew";
    }
    
    // Store temporary values for blur handling (convert inches to feet)
    setTempValues(prev => ({
      ...prev,
      [formFieldName]: (parseFloat(value) / 12).toString() // Convert inches to feet for API
    }));
    
    if (name === "ridgeGap") {
      const roofClearance = formData.roof_clearance;
      const validation = validateRidgeGapAndRoofClearance(value, roofClearance);
      
      setErrors(prev => ({
        ...prev,
        ridge_gap: validation.message
      }));
    }
    
    // Update form data if not a critical param or not map-based
    if (!formData._isMapBased || !gridCriticalParams.includes(formFieldName)) {
      // Update the form data with the value in feet
      const updates = { 
        [formFieldName]: (parseFloat(value) / 12).toString() // Convert inches to feet for API
      };
      
      // If this is the valley gap, also update distance_between_panels_ns for API compatibility
      if (name === "valleyGap") {
        updates.distance_between_panels_ns = (parseFloat(value) / 12).toString();
      }
      
      setFormData(prev => ({
        ...prev,
        ...updates
      }));
    }
  };

  const handleInputBlur = async (e) => {
    const { name } = e.target;
    const value = tempValues[name];
    
    if (!value) return;

    // Check if this is a grid-critical parameter and if we're in a map-based layout
    if (formData._isMapBased && gridCriticalParams.includes(name)) {
      const originalValue = formData._originalGridParams?.[name];
      
      if (originalValue !== undefined && parseFloat(value) !== parseFloat(originalValue)) {
        console.log('Value different from original, showing warning');
        
        const result = await Swal.fire({
          title: 'Warning: Grid Parameter Change',
          text: 'Changing this parameter will require regenerating the panel layout. Your existing panel positions will be cleared, but the roof outline will be preserved.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Continue',
          cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
          console.log('Change confirmed, updating form data');
          setFormData(prev => ({
            ...prev,
            [name]: value,
            panel_layout: prev.panel_layout.map(layout => ({
              ...layout,
              layout: layout.layout.map(row => 
                row.map(cell => 
                  cell === 'intersects' ? cell : 'non-value'
                )
              )
            }))
          }));
        } else {
          console.log('Change cancelled, reverting value');
          // Revert both temp value and form data
          setTempValues(prev => ({
            ...prev,
            [name]: originalValue
          }));
          setFormData(prev => ({
            ...prev,
            [name]: originalValue
          }));
          
          // Also update east-west gaps if needed
          if (name === "ridge_gap") {
            setEastWestGaps(prev => ({ 
              ...prev, 
              ridgeGap: (parseFloat(originalValue) * 12).toString() // Convert from feet to inches
            }));
          } else if (name === "valley_gap") {
            setEastWestGaps(prev => ({ ...prev, valleyGap: originalValue }));
          }
        }
      }
    }

    // Clear the temp value
    setTempValues(prev => ({
      ...prev,
      [name]: undefined
    }));
  };

  // Special handler for East-West gap field blur
  const handleEastWestGapBlur = async (e) => {
    const { name } = e.target;
    let formFieldName;
    
    if (name === "ridgeGap") {
      formFieldName = "ridge_gap";
    } else if (name === "valleyGap") {
      formFieldName = "valley_gap";
    } else if (name === "moduleGap") {
      formFieldName = "distance_between_panels_ew";
    }
    
    const value = tempValues[formFieldName];
    
    if (!value) return;
    
    // Handle map-based layout warnings
    if (formData._isMapBased && gridCriticalParams.includes(formFieldName)) {
      const originalValue = formData._originalGridParams?.[formFieldName];
      
      if (originalValue !== undefined && parseFloat(value) !== parseFloat(originalValue)) {
        const result = await Swal.fire({
          title: 'Warning: Grid Parameter Change',
          text: 'Changing this parameter will require regenerating the panel layout. Your existing panel positions will be cleared, but the roof outline will be preserved.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Continue',
          cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
          // Update the formData with the specific gap value
          const updates = { [formFieldName]: value };
          
          // If this is the valley gap, also update distance_between_panels_ns for API compatibility
          if (name === "valleyGap") {
            updates.distance_between_panels_ns = value;
          }
          
          setFormData(prev => ({
            ...prev,
            ...updates,
            panel_layout: prev.panel_layout.map(layout => ({
              ...layout,
              layout: layout.layout.map(row => 
                row.map(cell => 
                  cell === 'intersects' ? cell : 'non-value'
                )
              )
            }))
          }));
        } else {
          // Revert the values
          setTempValues(prev => ({
            ...prev,
            [formFieldName]: originalValue
          }));
          
          setEastWestGaps(prev => ({
            ...prev,
            [name]: name === "ridgeGap" ? (parseFloat(originalValue) * 12).toString() : originalValue // Convert feet to inches for ridgeGap
          }));
          
          // Update form data with original value
          const updates = { [formFieldName]: originalValue };
          
          // If valley gap, also revert distance_between_panels_ns
          if (name === "valleyGap" && formData._originalGridParams?.distance_between_panels_ns) {
            updates.distance_between_panels_ns = formData._originalGridParams.distance_between_panels_ns;
          }
          
          setFormData(prev => ({
            ...prev,
            ...updates
          }));
        }
      }
    }

    // Clear the temp value
    setTempValues(prev => ({
      ...prev,
      [formFieldName]: undefined
    }));
  };

  const [visiblePaths, setVisiblePaths] = useState({
    moduleGap: false,
    panelWidth: false,
    panelLength: false,
    rowGap: false,
    ridgeGap: false,
    valleyGap: false,
    roofClearance: false,
    systemHeight: false,
  });

  const handleFocusAndOnMouseOver = (e) => {
    const id = e.target.id;
    setVisiblePaths((prev) => ({ ...prev, [id]: true }));
  };

  const handleMouseOver = (e) => {
    const id = e.target.id;
    setVisiblePaths((prev) => ({ ...prev, [id]: true }));
  };

  const handleMouseOut = (e) => {
    const id = e.target.id;
    setVisiblePaths((prev) => ({ ...prev, [id]: document.activeElement === e.target }));
  };

  // Style for the system type toggle
  const toggleButtonStyle = {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '1.5rem',
    gap: '1rem'
  };

  const buttonStyle = (isActive) => ({
    padding: '0.75rem 1.5rem',
    borderRadius: '0.375rem',
    fontWeight: '500',
    border: '1px solid #d1d5db',
    background: isActive ? '#1e40af' : 'white',
    color: isActive ? 'white' : '#1e40af',
    cursor: 'pointer',
    transition: 'all 0.2s',
    flex: 1,
    maxWidth: '200px',
    textAlign: 'center',
    boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
  });

    // Add this useEffect right after your other useEffects
  useEffect(() => {
    if (systemType === "east-west-system") {
      // Check ridge gap relation with roof clearance on initial load
      const roofClearance = formData.roof_clearance || "3.2";
      const ridgeGap = eastWestGaps.ridgeGap || "1.6";
      const validation = validateRidgeGapAndRoofClearance(ridgeGap, roofClearance);
      
      if (!validation.isValid) {
        setErrors(prev => ({
          ...prev,
          ridge_gap: validation.message
        }));
      }
    }
  }, [systemType, formData.roof_clearance, eastWestGaps.ridgeGap]); // Run when system type or relevant values change

  return (
    <div>
      {/* System Type Selection at the top */}
      <div className="mb-6 mt-2">
        <label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
          SunBallast System Type *
        </label>
        <div style={toggleButtonStyle}>
          <button 
            type="button"
            style={buttonStyle(systemType === "south-face-system")}
            onClick={() => setSystemType("south-face-system")}
          >
            South Face System
          </button>
          <button 
            type="button"
            style={buttonStyle(systemType === "east-west-system")}
            onClick={() => setSystemType("east-west-system")}
          >
            East/West System
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2">
        <div className="diagram-container">
          {/* Panel dimension fields with dynamic labels based on system type */}
          <div className="mb-4">
            <label className="block text-sm font-medium leading-6 text-gray-900">
              {systemType === "south-face-system" 
                ? "Panel Length N-S (Ft.)" 
                : "Panel Length E-W (Ft.)"}
            </label>
            <input
              id="panelLength"
              className="panelLength block w-full rounded border-0 py-1.5 pl-5 pr-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-900 sm:text-sm sm:leading-6"
              type="number"
              min="1"
              max="4"
              step="0.01"
              onFocus={handleFocusAndOnMouseOver}
              onMouseOver={handleMouseOver}
              onMouseLeave={handleMouseOut}
              onBlur={handleInputBlur}
              name="pv_module_ns_length"
              value={(tempValues["pv_module_ns_length"] !== undefined 
                ? tempValues["pv_module_ns_length"] 
                : formData["pv_module_ns_length"]) || ""}
              onChange={handleInputChange}
            />
            {errors.pv_module_ns_length && <div style={{ color: 'red' }}>{errors.pv_module_ns_length}</div>}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium leading-6 text-gray-900">
              {systemType === "south-face-system" 
                ? "Panel Width E-W (Ft.)" 
                : "Panel Width N-S (Ft.)"}
            </label>
            <input
              id="panelWidth"
              className="block w-full rounded border-0 py-1.5 pl-5 pr-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-900 sm:text-sm sm:leading-6"
              type="number"
              min="0.01"
              step="0.01"
              onFocus={handleFocusAndOnMouseOver}
              onMouseOver={handleMouseOver}
              onMouseLeave={handleMouseOut}
              onBlur={handleInputBlur}
              name="pv_module_ew_width"
              value={(tempValues["pv_module_ew_width"] !== undefined 
                ? tempValues["pv_module_ew_width"] 
                : formData["pv_module_ew_width"]) || ""}
              onChange={handleInputChange}
            />
          </div>

          {/* Fields specific to system type */}
          {systemType === "south-face-system" ? (
            // South Face System fields
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium leading-6 text-gray-900">
                  Module gapping (Ft.)
                </label>
                <input
                  id="moduleGap"
                  className="block w-full rounded border-0 py-1.5 pl-5 pr-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-900 sm:text-sm sm:leading-6"
                  type="number"
                  step="0.01"
                  min="0.01"
                  onFocus={handleFocusAndOnMouseOver}
                  onMouseOver={handleMouseOver}
                  onMouseLeave={handleMouseOut}
                  onBlur={handleInputBlur}
                  name="distance_between_panels_ew"
                  value={(tempValues["distance_between_panels_ew"] !== undefined 
                    ? tempValues["distance_between_panels_ew"] 
                    : formData["distance_between_panels_ew"]) || ""}
                  onChange={handleInputChange}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium leading-6 text-gray-900">
                  Row gapping (Ft.)
                </label>
                <input
                  id="rowGap"
                  className="block w-full rounded border-0 py-1.5 pl-5 pr-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-900 sm:text-sm sm:leading-6"
                  type="number"
                  step="0.01"
                  min="0.1"
                  onFocus={handleFocusAndOnMouseOver}
                  onMouseOver={handleMouseOver}
                  onMouseLeave={handleMouseOut}
                  onBlur={handleInputBlur}
                  name="distance_between_panels_ns"
                  value={(tempValues["distance_between_panels_ns"] !== undefined 
                    ? tempValues["distance_between_panels_ns"] 
                    : formData["distance_between_panels_ns"]) || ""}
                  onChange={handleInputChange}
                />
                {errors.distance_between_panels_ns && <div style={{ color: 'red' }}>{errors.distance_between_panels_ns}</div>}
              </div>
            </>
          ) : (
            // East-West System fields
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium leading-6 text-gray-900">
                  Module Gapping (Inches)
                </label>
                <input
                  id="moduleGap"
                  className="block w-full rounded border-0 py-1.5 pl-5 pr-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-900 sm:text-sm sm:leading-6"
                  type="number"
                  step="0.1"
                  min="0.01"
                  onFocus={handleFocusAndOnMouseOver}
                  onMouseOver={handleMouseOver}
                  onMouseLeave={handleMouseOut}
                  onBlur={handleEastWestGapBlur}
                  name="moduleGap"
                  value={eastWestGaps.moduleGap}
                  onChange={handleEastWestGapChange}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium leading-6 text-gray-900">
                  Ridge Gap (Inches)
                </label>
                <input
                  id="ridgeGap"
                  className="block w-full rounded border-0 py-1.5 pl-5 pr-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-900 sm:text-sm sm:leading-6"
                  type="number"
                  step="0.1"
                  min="0.1"
                  onFocus={handleFocusAndOnMouseOver}
                  onMouseOver={handleMouseOver}
                  onMouseLeave={handleMouseOut}
                  onBlur={handleEastWestGapBlur}
                  name="ridgeGap"
                  value={eastWestGaps.ridgeGap || "1.6"}
                  onChange={handleEastWestGapChange}
                  placeholder="1.6"
                />
                {errors.ridge_gap && <div style={{ color: 'red' }}>{errors.ridge_gap}</div>}
                <span className="text-xs text-gray-500 mt-1 block">
                  Must be at least 50% of the roof clearance value (Default: 1.6 Inches")
                </span>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium leading-6 text-gray-900">
                  Valley Gap (Inches)
                </label>
                <input
                  id="valleyGap"
                  className="block w-full rounded border-0 py-1.5 pl-5 pr-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-900 sm:text-sm sm:leading-6"
                  type="number"
                  step="0.1"
                  min="0.1"
                  onFocus={handleFocusAndOnMouseOver}
                  onMouseOver={handleMouseOver}
                  onMouseLeave={handleMouseOut}
                  onBlur={handleEastWestGapBlur}
                  name="valleyGap"
                  value={eastWestGaps.valleyGap || "5.9"}
                  onChange={handleEastWestGapChange}
                  placeholder="5.9"
                />
                <span className="text-xs text-gray-500 mt-1 block">
                  Default: 5.9 Inches
                </span>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium leading-6 text-gray-900">
                  Roof Clearance (Inches) - Max 3.4" (87mm)
                </label>
                <input
                  id="roofClearance"
                  className="block w-full rounded border-0 py-1.5 pl-5 pr-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-900 sm:text-sm sm:leading-6"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="3.4"
                  onFocus={handleFocusAndOnMouseOver}
                  onMouseOver={handleMouseOver}
                  onMouseLeave={handleMouseOut}
                  onBlur={handleInputBlur}
                  name="roof_clearance"
                  value={(tempValues["roof_clearance"] !== undefined 
                    ? tempValues["roof_clearance"] 
                    : formData["roof_clearance"]) || "3.2"}
                  onChange={handleInputChange}
                  placeholder="3.2"
                />
                {errors.roof_clearance && <div style={{ color: 'red' }}>{errors.roof_clearance}</div>}
                <span className="text-xs text-gray-500 mt-1 block">
                  Wind tunnel testing requires clearance under 87mm (3.4 inches). Default: 3.2 Inches"
                </span>
              </div>
              
              {/* Calculations Display Section */}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">SunBallast EOLO WTTR Calculations</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Row Spacing:</div>
                  <div>{calculationResults.rowSpacing.toFixed(2)} inches</div>
                  
                  <div>System Height:</div>
                  <div>{calculationResults.systemHeight.toFixed(2)} inches</div>
                  
                  <div className="font-medium">Row Spacing / System Height Ratio:</div>
                  <div className={calculationResults.ratio > 8.3 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                    {calculationResults.ratio.toFixed(2)} {calculationResults.ratio <= 8.3 ? "✓" : "✗"}
                  </div>
                </div>
                
                {errors.ratio && (
                  <div className="mt-2 text-red-600 text-sm">{errors.ratio}</div>
                )}
                
                <div className="mt-2 text-xs text-gray-600">
                  <p>Calculations based on:</p>
                  <ul className="list-disc list-inside">
                    <li>Row spacing = ridge gap + 2 × panel length × cos(tilt) + valley gap</li>
                    <li>System height = roof clearance + panel length × sin(tilt)</li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
        
        <div>
          {/* Pass systemType to PanelSVG so it can render the appropriate diagram */}
          <PanelSVG 
            className="w-full h-auto" 
            visiblePaths={visiblePaths} 
            systemType={systemType}
          />
        </div>
      </div>
    </div>
  );
};

export default SolarPanelDiagram;