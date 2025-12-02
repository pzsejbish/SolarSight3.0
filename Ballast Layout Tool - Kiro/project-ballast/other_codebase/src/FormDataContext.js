import React, { createContext, useContext, useState, useCallback } from 'react';

const FormDataContext = createContext();

export const FormDataProvider = ({ children }) => {
  const initialFormData = {
    full_address: "",
    street_address: "",
    city: "",
    state: "",
    zip: "",
    latLng: {},
    lat: "null",
    lng: "null",
    tilt_angle: "",
    pv_module_weight: "",
    pv_module_ns_length: "3",
    pv_module_ew_width: "6",
    ballast_stone: "",
    allowable_pv_dead_load: "",
    avg_roof_pitch: "",
    roof_height: "",
    parapet_height: "",
    ground_snow_load: "",
    wind_speed: "",
    exposure_category: "",
    distance_between_panels_ns: "1",
    distance_between_panels_ew: "0.3",
    roof_clearance: "",
    setback_distance: "3",
    risk_category: "",
    building_rotation: "0",
    panel_layout: [],
    notes: "",
    _isMapBased: false,
    _originalGridParams: null,
    sun_ballast_system: ""
  };

  const [formData, setFormData] = useState(initialFormData);

  // Add a new method for updating specific fields
  const updateFormField = useCallback((fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  }, []);

  // Add a method for batch updating multiple fields
  const updateFormFields = useCallback((updates) => {
    setFormData(prev => ({
      ...prev,
      ...updates
    }));
  }, []);

  const resetFormData = useCallback(() => {
    console.log("Resetting form data in context");
    setFormData({
      ...initialFormData,
      panel_layout: []
    });
  }, []);

  // Provide more specific update methods
  const contextValue = {
    formData,
    setFormData,  // Keep this for backward compatibility
    updateFormField,  // New method for single field updates
    updateFormFields, // New method for multiple field updates
    resetFormData
  };

  return (
    <FormDataContext.Provider value={contextValue}>
      {children}
    </FormDataContext.Provider>
  );
};

export const useFormData = () => {
  const context = useContext(FormDataContext);
  if (!context) {
    throw new Error('useFormData must be used within a FormDataProvider');
  }
  return context;
};