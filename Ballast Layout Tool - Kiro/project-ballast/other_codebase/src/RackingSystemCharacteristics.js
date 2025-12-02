/*!
 * --------------------------------------------------------------------------------
 * File: [RackingSystemCharacteristics.js]
 * Project: [Ballast Engineering Tool]
 * Created Date: [D12/29/2023]
 * Author: [James Bish, Arsen Tamamyan ]
 * Organization: PZSE Structural Engineers
 * --------------------------------------------------------------------------------
 * 
 * Copyright (c) [2024] PZSE Structural Engineers
 * 
 * This source code is the proprietary property of PZSE Structural Engineers and is
 * protected by international copyright and trade secret laws and treaties. No part
 * of this source code may be reproduced, copied, distributed, transmitted, broadcast,
 * displayed, sold, licensed, or otherwise exploited for any commercial purpose
 * whatsoever without the express prior written consent of PZSE Structural Engineers.
 * 
 * Use of this source code is governed by the terms of the agreement under which it
 * has been provided, which typically includes restrictions on use, disclosure,
 * modification, and conditions of license. If you have not received this source code
 * under such an agreement, then you have no rights to use it in any manner that
 * infringes the intellectual property rights of PZSE Structural Engineers.
 * 
 * --------------------------------------------------------------------------------
 */
// RackingSystemCharacteristics.js
import React, { useState, useEffect } from "react";
import './styles/style.css'; // Import the CSS file

// Define tilt angle options based on system type
const tiltAngleOptions = {
  "south-face-system": [0, 4, 5, 6, 9, 10, 11],
  "east-west-system": [9, 10, 11]
};

const RackingSystemCharacteristics = ({ formData, setFormData, systemType = "south-face-system" }) => {
  const [errors, setErrors] = useState({});
  
  // Get valid angles based on selected system type
  const validTiltAngles = tiltAngleOptions[systemType] || tiltAngleOptions["south-face-system"];

  // Effect to validate and adjust tilt angle when system type changes
  useEffect(() => {
    if (formData.tilt_angle) {
      // If current tilt angle is not valid for the new system type
      if (!validTiltAngles.includes(parseFloat(formData.tilt_angle))) {
        // Set to default (first valid angle for the system type)
        const defaultAngle = validTiltAngles[0];
        setFormData(prevData => ({
          ...prevData,
          tilt_angle: defaultAngle
        }));
        
        // Clear any existing tilt angle errors
        setErrors(prevErrors => ({
          ...prevErrors,
          tilt_angle: ""
        }));
      }
    }
  }, [systemType, setFormData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'tilt_angle') {
      const numericValue = parseFloat(value);
      if (!validTiltAngles.includes(numericValue)) {
        const errorMessage = systemType === "east-west-system" 
          ? "For East/West System, tilt angle must be 9, 10, or 11 degrees"
          : "Tilt angle must be one of the following values: 0, 4, 5, 6, 9, 10, 11";
          
        setErrors(prevErrors => ({
          ...prevErrors,
          tilt_angle: errorMessage
        }));
        return;
      } else {
        setErrors(prevErrors => ({
          ...prevErrors,
          tilt_angle: ""
        }));
        setFormData({ ...formData, [name]: numericValue });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleCustomStepperChange = (direction) => {
    const currentIndex = validTiltAngles.indexOf(parseFloat(formData.tilt_angle) || validTiltAngles[0]);
    let newIndex = currentIndex;

    if (direction === "up" && currentIndex < validTiltAngles.length - 1) {
      newIndex++;
    } else if (direction === "down" && currentIndex > 0) {
      newIndex--;
    }

    const newValue = validTiltAngles[newIndex];
    setFormData({ ...formData, tilt_angle: newValue });
    setErrors(prevErrors => ({
      ...prevErrors,
      tilt_angle: ""
    }));
  };

  return (
    <div className="w-full">
      <div className="mb-4">
        <label
          htmlFor="tilt_angle"
          className="block text-sm font-medium leading-6 text-gray-900"
        >
          Tilt Angle (Deg°) *
        </label>
        <div className="relative input-container">
          <input
            id="tilt_angle"
            className="block w-full rounded border-0 py-1.5 pl-5 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-900 sm:text-sm sm:leading-6 no-stepper"
            name="tilt_angle"
            type="number"
            placeholder={`Enter tilt angle in degrees ° (${validTiltAngles.join(', ')})`}
            value={formData["tilt_angle"] || ""}
            onChange={handleInputChange}
            min={validTiltAngles[0]}
            max={validTiltAngles[validTiltAngles.length - 1]}
          />
          <div className="absolute inset-y-0 right-0 flex flex-col items-center justify-center pr-2">
            <button
              type="button"
              onClick={() => handleCustomStepperChange("up")}
              disabled={formData.tilt_angle === validTiltAngles[validTiltAngles.length - 1]}
              className="custom-stepper-btn"
              tabIndex="-1"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => handleCustomStepperChange("down")}
              disabled={formData.tilt_angle === validTiltAngles[0]}
              className="custom-stepper-btn"
              tabIndex="-1"
            >
              -
            </button>
          </div>
        </div>
        {errors.tilt_angle && <div style={{ color: 'red' }}>{errors.tilt_angle}</div>}
        <div className="text-xs text-gray-500 mt-1">
          {systemType === "east-west-system" 
            ? "For East/West System, valid tilt angles are: 9°, 10°, or 11°" 
            : "Valid tilt angles are: 0°, 4°, 5°, 6°, 9°, 10°, or 11°"}
        </div>
      </div>

      <div className="mb-4">
        <label
          className="block text-sm font-medium leading-6 text-gray-900"
          htmlFor="pv_module_weight"
        >
          PV Module Weight (Lbs.) *
        </label>
        <input
          id="pv_module_weight"
          className="block w-full rounded border-0 py-1.5 pl-5 pr-5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-900 sm:text-sm sm:leading-6"
          name="pv_module_weight"
          type="number"
          placeholder="Enter module weight"
          value={formData["pv_module_weight"] || ""}
          onChange={handleInputChange}
          min="0"
        />
      </div>
      <div className="mb-4">
        <label
          className="block text-sm font-medium leading-6 text-gray-900"
          htmlFor="ballast_stone"
        >
          Ballast stone *
        </label>
        <select
          id="ballast_stone"
          className="block w-full rounded border-0 py-1.5 pl-5 pr-5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-900 sm:text-sm sm:leading-6"
          name="ballast_stone"
          value={formData["ballast_stone"] || ""}
          onChange={handleInputChange}
        >
          <option value="">Please select</option>
          <option value="4x8x16-nominal-cmu-cap-block">4x8x16 (Nominal) CMU Cap Block</option>
          <option value="2x8x16-nominal-cmu-cap-block">2x8x16 (Nominal) CMU Cap Block</option>
          <option value="sunballast-block">Sunballast Block</option>
          <option value="u-block">U-Block</option>
        </select>
      </div>

      <div className="mb-4">
        <label
          className="block text-sm font-medium leading-6 text-gray-900"
          htmlFor="allowable_pv_dead_load"
        >
          Allowable PV Dead Load (Psf.)
        </label>
        <input
          id="allowable_pv_dead_load"
          className="block w-full rounded border-0 py-1.5 pl-5 pr-5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-900 sm:text-sm sm:leading-6"
          name="allowable_pv_dead_load"
          type="number"
          placeholder="Enter PV Dead Load"
          value={formData["allowable_pv_dead_load"] || ""}
          onChange={handleInputChange}
          min="0"
        />
      </div>
    </div>
  );
};

export default RackingSystemCharacteristics;