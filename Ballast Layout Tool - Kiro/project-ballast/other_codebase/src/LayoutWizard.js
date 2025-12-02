import React, { useState, useCallback, memo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import RooftopVisualizer from "./RooftopVisualizer";

const LayoutWizard = memo(({ formData, setFormData, isFormComplete, onAutoSelectLayout, isPopulating, isReturningToHome, resetLayoutWizard }) => {
  useEffect(() => {
    console.log("LayoutWizard props updated:", {
      isReturningToHome,
      isPopulating,
      resetLayoutWizard,
      panelLayoutLength: formData.panel_layout?.length
    });
  }, [isReturningToHome, isPopulating, resetLayoutWizard, formData]);
  const [currentStep, setCurrentStep] = useState(1);
  const navigate = useNavigate();
  const hasAutoSelected = useRef(false);
  const [shouldNavigate, setShouldNavigate] = useState(false);
  const justReturned = useRef(false);
  const [isSearchTriggered, setIsSearchTriggered] = useState(false);

  const goToNextPage = useCallback(() => {
    console.log('Setting shouldNavigate to true');
    setShouldNavigate(true);
  }, []);

  useEffect(() => {
    if (shouldNavigate && !isReturningToHome && !justReturned.current) {
      console.log('Navigating to next page');
      navigate("/rectangular-layout", { state: { formData } });
      setShouldNavigate(false);
      setIsSearchTriggered(false);
    }
  }, [shouldNavigate, isReturningToHome, navigate, formData]);

  useEffect(() => {
    console.log("LayoutWizard effect triggered. isPopulating:", isPopulating, "panelLayoutLength:", formData.panel_layout?.length);
  
    if (!isPopulating && onAutoSelectLayout.current && !hasAutoSelected.current && isSearchTriggered) {
      console.log("Auto-selecting rectangular layout");
      onAutoSelectLayout.current("rectangular");
      hasAutoSelected.current = true;
    }
  
    if (currentStep === 2 && formData.building_width && formData.building_length && isSearchTriggered) {
      console.log("Conditions met for auto-navigation");
      goToNextPage();
    }
  }, [isPopulating, isSearchTriggered, currentStep, formData.building_width, formData.building_length, goToNextPage]);

  const navigateToTool = useCallback((path) => {
    const lat = parseFloat(formData.latLng?.lat) || 0;
    const lng = parseFloat(formData.latLng?.lng) || 0;
    const width = parseFloat(formData.pv_module_ew_width);
    const length = parseFloat(formData.pv_module_ns_length);
    const spacingNS = parseFloat(formData.distance_between_panels_ns);
    const spacingEW = parseFloat(formData.distance_between_panels_ew);
    const setback = parseFloat(formData.setback_distance);

    // Create base navigation state
    const navigationState = {
      mapCenter: { lat, lng },
      zoom: path === "/solar-sight" ? 20 : 20,
      length, 
      width, 
      spacingNS, 
      spacingEW, 
      setback
    };

    // If this is a map-based layout with existing panel data, add it to the state
    if (path === "/solar-sight" && formData.panel_layout?.length > 0) {
      console.log('Navigating with existing panel layout:', formData.panel_layout);
      navigationState.existingLayout = {
        panel_layout: formData.panel_layout,
        _isMapBased: formData._isMapBased,
        _originalGridParams: formData._originalGridParams
      };
    }

    console.log(`Navigating to ${path} with state:`, navigationState);
    
    navigate(path, { state: navigationState });
}, [navigate, formData]);

  const selectLayoutMethod = useCallback((method) => {
    if (isPopulating) {
      console.log("Skipping layout selection due to populating");
      return;
    }
  
    console.log('Layout method selected:', method);
    switch (method) {
      case "rectangular":
        setFormData((prevData) => ({
          ...prevData,
          building_width: prevData.building_width || '',
          building_length: prevData.building_length || '',
        }));
        setCurrentStep(2);
        break;
      case "satellite":
        navigateToTool("/satellite-layout-tool");
        break;
      case "solar-sight":
        navigateToTool("/solar-sight");
        break;
      default:
        console.error("Unknown layout method:", method);
    }
  }, [isPopulating, setFormData, navigateToTool]);

  onAutoSelectLayout.current = (method) => {
    setIsSearchTriggered(true);
    selectLayoutMethod(method);
  };

  onAutoSelectLayout.current = selectLayoutMethod;

  const handleRectangularInputChange = useCallback((event) => {
    const { name, value } = event.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
    console.log('Rectangular input changed:', name, value);
  }, [setFormData]);

  const renderRooftopVisualizer = useCallback(() => {
    if (resetLayoutWizard) {
      console.log("call back for const RenderRooftopVisualizer");
      return null; // Don't render if we're resetting
    }
    const buildingWidth = parseFloat(formData.building_width);
    const buildingLength = parseFloat(formData.building_length);
    const panelNsLength = parseFloat(formData.pv_module_ns_length);
    const panelEwWidth = parseFloat(formData.pv_module_ew_width);
    const panelLayout = formData.panel_layout || []; // Retrieve panel_layout

    if (
      !isNaN(buildingWidth) &&
      !isNaN(buildingLength) &&
      !isNaN(panelNsLength) &&
      !isNaN(panelEwWidth)
    ) {
      return (
        <RooftopVisualizer
          buildingWidth={buildingWidth}
          buildingLength={buildingLength}
          panelNsLength={panelNsLength}
          panelEwWidth={panelEwWidth}
          panelLayout={panelLayout} // Pass panel_layout
        />
      );
    } else {
      console.log("Invalid dimensions for RooftopVisualizer");
      return null;
    }
  }, [formData, resetLayoutWizard]);

  return (
    <div>
      {currentStep === 1 && (
        <div>
          <h2 className="font-semibold text-xl">
            Select Building Layout Method
          </h2>
          <div className="grid grid-cols-3">
            <div>
              <div className="mb-4">
                <button
                  type="button"
                  className="w-full justify-center rounded bg-blue-900 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-yellow-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-900"
                  onClick={() => selectLayoutMethod("rectangular")}
                >
                  Rectangular Building
                  <span className="block italic text-xs">
                    Use this option for simple rectangular buildings
                  </span>
                </button>
              </div>

              <div className="mb-4">
                <button
                  type="button"
                  className="w-full justify-center rounded bg-blue-900 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-yellow-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-900"
                  onClick={() => selectLayoutMethod("solar-sight")}
                >
                  Solar Sight
                  <span className="block italic text-xs">
                    Outline your building to create an interactive solar layout
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <div>
          <h2 className="font-semibold text-xl">Building Dimensions</h2>
          <div className="flex-container">
            <div className="mb-4">
              <label
                className="block text-sm font-medium leading-6 text-gray-900"
                htmlFor="building_width"
              >
                Width (Ft.)
              </label>
              <input
                className="block w-full rounded border-0 py-1.5 pl-5 pr-5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-900 sm:text-sm sm:leading-6"
                id="building_width"
                name="building_width"
                type="number"
                placeholder="Width in feet"
                min="0"
                value={formData.building_width || ""}
                onChange={handleRectangularInputChange}
              />
            </div>
            <div className="form-row">
              <label
                className="block text-sm font-medium leading-6 text-gray-900"
                htmlFor="building_length"
              >
                Length (Ft.)
              </label>
              <input
                className="block w-full rounded border-0 py-1.5 pl-5 pr-5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus-visible:ring-blue-900 sm:text-sm sm:leading-6"
                id="building_length"
                name="building_length"
                type="number"
                placeholder="Length in feet"
                min="0"
                value={formData.building_length || ""}
                onChange={handleRectangularInputChange}
              />
            </div>
          </div>
          <button
            className="my-4 rounded bg-blue-900 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-yellow-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-900"
            onClick={goToNextPage}
          >
            Next
          </button>
        </div>
      )}
      {currentStep === 3 && renderRooftopVisualizer()}
    </div>
  );
});

export default LayoutWizard;
