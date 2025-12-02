// BuildingCharacteristics.js
import React, { useState, useEffect, useRef } from "react";
import { useFormData } from './FormDataContext';
import Swal from 'sweetalert2';

const BuildingCharacteristics = () => {
  const { formData, setFormData } = useFormData();
  const [localValues, setLocalValues] = useState({
    avg_roof_pitch: formData.avg_roof_pitch || "",
    roof_height: formData.roof_height || "",
    parapet_height: formData.parapet_height || "",
    setback_distance: formData.setback_distance || "",
  });
  const [errors, setErrors] = useState({});
  const [hasInteracted, setHasInteracted] = useState(false);
  const inputRefs = {
    avg_roof_pitch: useRef(null),
    roof_height: useRef(null),
    parapet_height: useRef(null),
    setback_distance: useRef(null),
  };
  const isMounted = useRef(false);

  const gridCriticalParams = ['setback_distance'];

  const validatePitch = (value) => {
    const numericValue = parseFloat(value);
    if (value !== "" && (isNaN(numericValue) || numericValue > 7 || numericValue < 0)) {
      return "Average Roof Pitch must be between 0 and 7 degrees";
    }
    return "";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLocalValues((prev) => ({ ...prev, [name]: value }));
    if (name === 'avg_roof_pitch' && !hasInteracted) {
      setHasInteracted(true);
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (name === 'avg_roof_pitch') {
      const error = validatePitch(value);
      if (error && hasInteracted) {
        setErrors((prev) => ({ ...prev, [name]: error }));
        setLocalValues((prev) => ({ ...prev, [name]: "" }));
        setFormData((prev) => ({ ...prev, [name]: "" }));
      } else {
        setErrors((prev) => ({ ...prev, [name]: "" }));
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    } else if (gridCriticalParams.includes(name) && formData._isMapBased && formData._originalGridParams) {
      const originalValue = formData._originalGridParams[name];
      if (originalValue !== undefined && parseFloat(value) !== parseFloat(originalValue)) {
        Swal.fire({
          title: 'Warning: Setback Distance Change',
          text: 'Changing the setback distance will require regenerating the panel layout. Your existing panel positions will be cleared, but the roof outline will be preserved.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Continue',
          cancelButtonText: 'Cancel',
        }).then((result) => {
          if (result.isConfirmed) {
            setFormData((prev) => ({
              ...prev,
              [name]: value,
              panel_layout: prev.panel_layout?.map(layout => ({
                ...layout,
                layout: layout.layout.map(row => 
                  row.map(cell => cell === 'intersects' ? cell : 'non-value')
                )
              })) || []
            }));
          } else {
            setLocalValues((prev) => ({ ...prev, [name]: formData[name] || "" }));
          }
        });
      } else {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      console.log(`Tabbing from ${e.target.name}, Shift: ${e.shiftKey}`);
      const fieldOrder = ['avg_roof_pitch', 'roof_height', 'parapet_height', 'setback_distance'];
      const currentIndex = fieldOrder.indexOf(e.target.name);

      if (e.shiftKey) {
        // Backward tabbing
        if (currentIndex === 0) {
          setTimeout(() => {
            const prevField = document.querySelector('input[name="allowable_pv_dead_load"]');
            if (prevField) {
              console.log("Focusing allowable_pv_dead_load");
              prevField.focus();
            } else {
              console.log("No allowable_pv_dead_load found");
            }
          }, 0);
        } else {
          const prevIndex = currentIndex - 1;
          const prevField = fieldOrder[prevIndex];
          setTimeout(() => {
            if (inputRefs[prevField].current) {
              console.log(`Focusing ${prevField}`);
              inputRefs[prevField].current.focus();
            }
          }, 0);
        }
      } else {
        // Forward tabbing
        const isLastField = currentIndex === fieldOrder.length - 1;
        if (isLastField) {
          setTimeout(() => {
            const nextField = document.querySelector('input[name="ground_snow_load"]');
            if (nextField) {
              console.log("Focusing ground_snow_load");
              nextField.focus();
            } else {
              console.log("No ground_snow_load found");
            }
          }, 0);
        } else {
          const nextIndex = currentIndex + 1;
          const nextField = fieldOrder[nextIndex];
          setTimeout(() => {
            if (inputRefs[nextField].current) {
              console.log(`Focusing ${nextField}`);
              inputRefs[nextField].current.focus();
            }
          }, 0);
        }
      }
    }
  };

  useEffect(() => {
    if (!isMounted.current) {
      setLocalValues({
        avg_roof_pitch: formData.avg_roof_pitch || "",
        roof_height: formData.roof_height || "",
        parapet_height: formData.parapet_height || "",
        setback_distance: formData.setback_distance || "",
      });
      const error = validatePitch(formData.avg_roof_pitch || "");
      if (error && formData.avg_roof_pitch !== "") {
        setErrors((prev) => ({ ...prev, avg_roof_pitch: error }));
        setLocalValues((prev) => ({ ...prev, avg_roof_pitch: "" }));
        setFormData((prev) => ({ ...prev, avg_roof_pitch: "" }));
      }
      isMounted.current = true;
    }
  }, [formData]);

  return (
    <div className="flex-container">
      <div className="mb-4">
        <label htmlFor="avg_roof_pitch" className="block text-sm font-medium leading-6 text-gray-900">
          Average Roof Pitch (Deg°) *
        </label>
        <input
          id="avg_roof_pitch"
          name="avg_roof_pitch"
          type="number"
          className="block w-full rounded border-0 py-1.5 pl-5 pr-5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-900 sm:text-sm sm:leading-6"
          placeholder="Enter roof pitch"
          value={localValues.avg_roof_pitch}
          min="0"
          max="7"
          step="0.1"
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          ref={inputRefs.avg_roof_pitch}
        />
        {errors.avg_roof_pitch && (
          <div className="text-red-500 text-sm mt-1">{errors.avg_roof_pitch}</div>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="roof_height" className="block text-sm font-medium leading-6 text-gray-900">
          Roof Height Above Grade (Ft.) *
        </label>
        <input
          id="roof_height"
          name="roof_height"
          type="number"
          className="block w-full rounded border-0 py-1.5 pl-5 pr-5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-900 sm:text-sm sm:leading-6"
          placeholder="Enter Roof Height"
          value={localValues.roof_height}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          ref={inputRefs.roof_height}
          min="0"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="parapet_height" className="block text-sm font-medium leading-6 text-gray-900">
          Parapet Height (Ft.) *
        </label>
        <input
          id="parapet_height"
          name="parapet_height"
          type="number"
          className="block w-full rounded border-0 py-1.5 pl-5 pr-5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-900 sm:text-sm sm:leading-6"
          placeholder="Enter Parapet Height"
          value={localValues.parapet_height}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          ref={inputRefs.parapet_height}
          min="0.0"
          step="0.1"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="setback_distance" className="block text-sm font-medium leading-6 text-gray-900">
          Setback Distance (Ft.) *
        </label>
        <input
          id="setback_distance"
          name="setback_distance"
          type="number"
          className="block w-full rounded border-0 py-1.5 pl-5 pr-5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-900 sm:text-sm sm:leading-6"
          placeholder="Enter Setback Distance"
          value={localValues.setback_distance}
          min="3.3"
          step="0.1"
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          ref={inputRefs.setback_distance}
        />
      </div>
    </div>
  );
};

export default BuildingCharacteristics;