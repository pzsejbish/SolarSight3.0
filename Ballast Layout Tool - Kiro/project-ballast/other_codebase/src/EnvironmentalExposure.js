import React, { useEffect } from "react";

const EnvironmentalExposure = ({ formData, setFormData }) => {
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Update state while preserving all other values
    setFormData(prev => {
      const updates = { [name]: value };
      
      // Handle MRI Reduction update
      if (name === "risk_category") {
        updates.mri_reduction = value === "II" ? "Yes" : "No";
      }
      
      return {
        ...prev,  // Preserve all previous values
        ...updates  // Apply our new updates
      };
    });
  };

  // Initialize MRI Reduction based on initial Risk Category
  useEffect(() => {
    if (!formData.mri_reduction) {  // Only set if not already set
      setFormData(prev => ({
        ...prev,
        mri_reduction: prev.risk_category === "II" ? "Yes" : "No"
      }));
    }
  }, []); // Run once on mount

  return (
    <div className="flex-container">
      <div className="mb-4">
        <label className="block text-sm font-medium leading-6 text-gray-900" htmlFor="ground-snow-load">
          Ground Snow Load (Psf.) *
        </label>
        <input
          id="ground_snow_load"
          className="block w-full rounded border-0 py-1.5 pl-5 pr-5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-900 sm:text-sm sm:leading-6"
          name="ground_snow_load"
          type="number"
          placeholder="Enter Ground Snow Load"
          value={formData.ground_snow_load || ""}
          onChange={handleInputChange}
          min="0"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium leading-6 text-gray-900" htmlFor="wind-speed">
          Wind Speed (Mph.) *
        </label>
        <input
          id="wind_speed"
          className="block w-full rounded border-0 py-1.5 pl-5 pr-5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-900 sm:text-sm sm:leading-6"
          name="wind_speed"
          min="0"
          type="number"
          placeholder="Enter Wind Speed"
          value={formData.wind_speed || ""}
          onChange={handleInputChange}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium leading-6 text-gray-900" htmlFor="exposure-category">
          Wind Exposure Category *
        </label>
        <select
          id="exposure_category"
          className="block w-full rounded border-0 py-1.5 pl-5 pr-5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-900 sm:text-sm sm:leading-6"
          name="exposure_category"
          value={formData.exposure_category || ""}
          onChange={handleInputChange}
        >
          <option value="">Please select</option>
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="D">D</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium leading-6 text-gray-900" htmlFor="risk-category">
          Risk Category *
        </label>
        <select
          id="risk_category"
          className="block w-full rounded border-0 py-1.5 pl-5 pr-5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-900 sm:text-sm sm:leading-6"
          name="risk_category"
          value={formData.risk_category || ""}
          onChange={handleInputChange}
        >
          <option value="">Please select</option>
          <option value="I">I</option>
          <option value="II">II</option>
          <option value="III">III</option>
          <option value="IV">IV (Seismic anchors will be needed.)</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium leading-6 text-gray-900" htmlFor="mri-reduction">
          MRI Reduction *
        </label>
        <select
          id="mri_reduction"
          className="block w-full rounded border-0 py-1.5 pl-5 pr-5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-900 sm:text-sm sm:leading-6"
          name="mri_reduction"
          value={formData.mri_reduction || "No"}
          onChange={handleInputChange}
        >
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      </div>
    </div>
  );
};

export default EnvironmentalExposure;